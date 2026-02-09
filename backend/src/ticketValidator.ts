import { Ticket, TicketCitation, TicketType, EffortSize, Priority, Readiness, SourceMode, SetupRequirement, SetupRequirementType } from './types';
import crypto from 'crypto';

// =============================================================================
// Ticket Validation & Repair Pipeline
// =============================================================================
// This module is the SINGLE hard gate for ticket quality.
// It is called by both AgentStudioService.parseResponse() and
// DocumentIntelAgent.parseStructuredAnswer() before returning tickets.
//
// CANONICAL TICKET SCHEMA (required on every output ticket):
//   title, description, type, acceptance_criteria, known_edge_cases,
//   open_questions, setup_requirements, dependencies, estimated_effort,
//   priority, labels, suggested_assignee, confidence, citations
//
// Behavior:
//   1. Validate every required field
//   2. Repair missing fields with safe defaults (never drop keys)
//   3. Normalize enums (fuzzy matching + fallback)
//   4. Promote weak tickets to decision tickets when AC < 2
//   5. Enforce grounding: require ≥1 citation when documents exist
//   6. Reduce confidence when fields are inferred
//   7. Log structured counts of generated / repaired / dropped
//   8. Accept both old (depends_on, assignee_role) and canonical names
// =============================================================================

// -- Fuzzy enum maps --------------------------------------------------------

const TYPE_ALIASES: Record<string, TicketType> = {
  feature: 'user_story',
  story: 'user_story',
  user_story: 'user_story',
  task: 'task',
  bug: 'bug',
  fix: 'bug',
  spike: 'spike',
  research: 'spike',
  exploration: 'spike',
  infrastructure: 'infrastructure',
  infra: 'infrastructure',
  devops: 'infrastructure',
  decision: 'decision',
  policy: 'decision',
  // Non-canonical types from ChatPanel fallback
  qa: 'task',
  testing: 'task',
  improvement: 'task',
  enhancement: 'task',
  docs: 'task',
};

const EFFORT_ALIASES: Record<string, EffortSize> = {
  xs: 'XS', xsmall: 'XS', 'x-small': 'XS',
  s: 'S', small: 'S',
  m: 'M', medium: 'M', med: 'M',
  l: 'L', large: 'L',
  xl: 'XL', xlarge: 'XL', 'x-large': 'XL',
};

const PRIORITY_ALIASES: Record<string, Priority> = {
  critical: 'critical', urgent: 'critical', p0: 'critical',
  high: 'high', p1: 'high',
  medium: 'medium', normal: 'medium', p2: 'medium',
  low: 'low', minor: 'low', p3: 'low',
};

// -- Public types -----------------------------------------------------------

export interface ValidationContext {
  /** Document IDs available in this generation run */
  sourceDocIds: string[];
  /** Whether real workspace documents were provided */
  hasDocuments: boolean;
}

export interface ValidationResult {
  tickets: Ticket[];
  log: ValidationLog;
}

export interface ValidationLog {
  total_input: number;
  total_output: number;
  repaired: number;
  dropped: number;
  promoted_to_decision: number;
  citations_injected: number;
  reasons: string[];
}

// -- Main entry point -------------------------------------------------------

export function validateAndRepairTickets(
  raw: unknown[],
  ctx: ValidationContext,
): ValidationResult {
  const log: ValidationLog = {
    total_input: raw.length,
    total_output: 0,
    repaired: 0,
    dropped: 0,
    promoted_to_decision: 0,
    citations_injected: 0,
    reasons: [],
  };

  const tickets: Ticket[] = [];

  for (const item of raw) {
    const result = validateSingleTicket(item as Record<string, unknown>, ctx, log);
    if (result) {
      tickets.push(result);
    }
  }

  log.total_output = tickets.length;

  // Structured logging
  console.log(`[TicketValidator] Input: ${log.total_input} | Output: ${log.total_output} | Repaired: ${log.repaired} | Dropped: ${log.dropped} | Promoted→Decision: ${log.promoted_to_decision} | Citations injected: ${log.citations_injected}`);
  if (log.reasons.length > 0) {
    console.log(`[TicketValidator] Reasons: ${log.reasons.join('; ')}`);
  }

  return { tickets, log };
}

// -- Single ticket validation -----------------------------------------------

function validateSingleTicket(
  raw: Record<string, unknown>,
  ctx: ValidationContext,
  log: ValidationLog,
): Ticket | null {
  // ---- Hard fail: title ----------------------------------------------------
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) {
    log.dropped++;
    log.reasons.push('dropped: missing title');
    return null;
  }

  // ---- Acceptance criteria + decision promotion ----------------------------
  let ac = toStringArray(raw.acceptance_criteria);
  let type = normalizeType(raw.type);
  let wasPromotedToDecision = false;

  if (ac.length < 2) {
    // Instead of dropping: promote to decision ticket with open_questions
    type = 'decision';
    wasPromotedToDecision = true;
    log.promoted_to_decision++;
    log.reasons.push(`promoted→decision: "${title}" had ${ac.length} AC`);

    // Move whatever AC existed into open_questions
    const existingOQ = toStringArray(raw.open_questions);
    const movedAC = ac.length > 0 ? ac : [];
    ac = [
      'Document the decision outcome',
      'Communicate decision to affected stakeholders',
    ];
    // Merge moved AC into open_questions
    raw.open_questions = [...existingOQ, ...movedAC.map(a => `[Needs clarification] ${a}`)];
  }

  // ---- Enum normalization with confidence penalty --------------------------
  let confidencePenalty = 0;
  const { value: normalizedType, wasNormalized: typeNormalized } = normalizeEnum(raw.type, TYPE_ALIASES, 'task');
  if (!wasPromotedToDecision) {
    type = normalizedType;
  }
  if (typeNormalized) {
    confidencePenalty += 0.05;
    log.repaired++;
    log.reasons.push(`enum-repair: type "${raw.type}"→"${type}" for "${title}"`);
  }

  const priority = normalizeEnum(raw.priority, PRIORITY_ALIASES, 'medium');
  if (priority.wasNormalized) {
    confidencePenalty += 0.03;
    log.repaired++;
  }

  const effort = normalizeEnum(raw.estimated_effort, EFFORT_ALIASES, 'M');
  const effortWasInferred = !raw.estimated_effort || effort.wasNormalized;
  if (effortWasInferred) {
    confidencePenalty += 0.1;
  }

  // ---- Confidence (initial calculation) ------------------------------------
  let confidence = typeof raw.confidence === 'number' && raw.confidence >= 0 && raw.confidence <= 1
    ? raw.confidence
    : 0.75;
  if (wasPromotedToDecision) {
    confidence = Math.min(confidence, 0.6);
  }
  confidence = Math.max(0, confidence - confidencePenalty);

  // ---- Citations + grounding -----------------------------------------------
  let citations = parseCitations(raw.citations);
  const source_mode: SourceMode = ctx.hasDocuments ? 'grounded' : 'synthetic';

  if (source_mode === 'grounded' && citations.length === 0 && ctx.sourceDocIds.length > 0) {
    // Inject citation from first available source doc
    citations = [{ document_id: ctx.sourceDocIds[0], chunk_id: 'inferred' }];
    log.citations_injected++;
    log.reasons.push(`citation-injected: "${title}" had 0 citations in grounded mode`);
    // Reduce confidence for missing grounding
    confidence = Math.max(0, confidence - 0.05);
  }

  const citation_keys = citations.map(c => `${c.document_id}:${c.chunk_id}`);

  // ---- Canonical field: suggested_assignee (accept old names) ---------------
  const suggested_assignee = typeof raw.suggested_assignee === 'string' ? raw.suggested_assignee
    : typeof raw.assignee_role === 'string' ? raw.assignee_role
    : typeof raw.assignee === 'string' ? raw.assignee
    : '';

  // ---- Canonical field: dependencies (accept old name depends_on) -----------
  const dependencies = toStringArray(raw.dependencies ?? raw.depends_on);

  // ---- Optional metadata (needed for filledTicket) -------------------------
  const suggested_dependencies = toStringArray(raw.suggested_dependencies);
  const stakeholders = toStringArray(raw.stakeholders);
  const is_derived = typeof raw.is_derived === 'boolean' ? raw.is_derived : undefined;
  const derived_rationale = typeof raw.derived_rationale === 'string' && is_derived ? raw.derived_rationale : undefined;
  const readiness = normalizeReadiness(raw.readiness);
  const readiness_reason = typeof raw.readiness_reason === 'string' ? raw.readiness_reason : undefined;

  // ---- Fill defaults for all remaining fields ------------------------------
  const known_edge_cases = toStringArray(raw.known_edge_cases ?? raw.edge_cases);
  const open_questions = toStringArray(raw.open_questions);

  // Rule 2: known_edge_cases - for decision tickets, require meaningful edge cases or empty array
  // If AI provided a placeholder "Handle basic success case", replace with empty array
  const placeholderEdgeCases = ['handle basic success case', 'handle success case', 'handle basic case', 'handle errors'];
  const hasPlaceholderEdgeCases = known_edge_cases.length === 1 && 
    placeholderEdgeCases.some(p => known_edge_cases[0].toLowerCase().includes(p));

  // For decision tickets, only keep meaningful edge cases
  let finalKnownEdgeCases: string[] = known_edge_cases;
  if (type === 'decision') {
    if (hasPlaceholderEdgeCases || known_edge_cases.length === 0) {
      finalKnownEdgeCases = [];
      if (hasPlaceholderEdgeCases) {
        log.repaired++;
        log.reasons.push('edge-cases-cleared: decision ticket had placeholder, replaced with empty array');
      }
    }
    // If decision has edge cases, they should be substantive - leave as-is
  } else {
    // For non-decision tickets, fill with default if empty
    finalKnownEdgeCases = known_edge_cases.length > 0 ? known_edge_cases : ['Handle basic success case'];
  }

  // ---- Confidence adjustment rules (after variables are declared) ----------
  // Rule 1: Decision tickets with open questions should have lower confidence
  if (type === 'decision' && open_questions.length > 0) {
    confidence = Math.min(confidence, 0.75);
    log.repaired++;
    log.reasons.push(`confidence-capped: decision ticket with ${open_questions.length} open questions capped to 0.75`);
  }

  // Rule 1b: All decision tickets should generally have lower confidence (0.4-0.75 range)
  if (type === 'decision') {
    confidence = Math.min(confidence, 0.75);
    confidence = Math.max(confidence, 0.4); // Ensure minimum of 0.4 for decision tickets
    log.repaired++;
    log.reasons.push('confidence-adjusted: decision ticket range 0.4-0.75');
  }

  // Additional confidence penalty for inferred/derived work
  if (is_derived) {
    confidence = Math.max(0, confidence - 0.1);
    log.repaired++;
    log.reasons.push('confidence-reduced: derived ticket penalty');
  }

  const setup_requirements = parseSetupRequirements(raw.setup_requirements);
  const labels = toStringArray(raw.labels);
  const source_docs = ctx.sourceDocIds;

  // ---- Hard fill: ensure all canonical fields have at least defaults ----
  // This is the "schema authority" step - every ticket MUST have all required fields
  const filledTicket = {
    // Required fields (already validated above)
    title,
    description: typeof raw.description === 'string' ? raw.description : '',
    type,
    acceptance_criteria: ac.length >= 2 ? ac : ['Complete implementation', 'Verify behavior meets requirements'],
    known_edge_cases: finalKnownEdgeCases,
    open_questions: open_questions.length > 0 ? open_questions : [],
    setup_requirements: setup_requirements.length > 0 ? setup_requirements : [],
    dependencies: dependencies.length > 0 ? dependencies : [],
    estimated_effort: effort.value as EffortSize,
    priority: priority.value as Priority,
    labels: labels.length > 0 ? labels : [],
    suggested_assignee: suggested_assignee || 'Unassigned',
    confidence: Math.round(confidence * 100) / 100,
    citations: citations.length > 0 ? citations : (ctx.hasDocuments && ctx.sourceDocIds.length > 0
      ? [{ document_id: ctx.sourceDocIds[0], chunk_id: 'inferred' }]
      : []),

    // Derived
    citation_keys: citations.length > 0 ? citations.map(c => `${c.document_id}:${c.chunk_id}`) : [],

    // Optional metadata
    stakeholders: stakeholders.length > 0 ? stakeholders : undefined,
    suggested_dependencies: suggested_dependencies.length > 0 ? suggested_dependencies : undefined,
    is_derived,
    derived_rationale,
    readiness,
    readiness_reason,
    source_docs: source_docs.length > 0 ? source_docs : undefined,
    source_mode,
    workspace_id: typeof raw.workspace_id === 'string' ? raw.workspace_id : undefined,
    owner_uid: typeof raw.owner_uid === 'string' ? raw.owner_uid : undefined,
  };

  // Log if we had to fill fields
  if (finalKnownEdgeCases.length === 0 && type !== 'decision' || open_questions.length === 0 || setup_requirements.length === 0 || dependencies.length === 0 || labels.length === 0 || !suggested_assignee) {
    log.repaired++;
    log.reasons.push(`filled-missing-fields: "${title}" had empty canonical fields`);
  }

  // Add ID for tracking (preserve original objectID/id)
  const ticketId = typeof raw.objectID === 'string' ? raw.objectID : (typeof raw.id === 'string' ? raw.id : crypto.randomUUID());
  (filledTicket as any).id = ticketId;
  // Keep objectID for Algolia compatibility
  (filledTicket as any).objectID = ticketId;

  return filledTicket as Ticket;
}

// -- Helper functions -------------------------------------------------------

function normalizeEnum<T extends string>(
  raw: unknown,
  aliases: Record<string, T>,
  fallback: T,
): { value: T; wasNormalized: boolean } {
  if (typeof raw !== 'string') return { value: fallback, wasNormalized: true };
  const lower = raw.toLowerCase().trim();
  if (aliases[lower]) return { value: aliases[lower], wasNormalized: lower !== raw };
  // Check if it's already a valid value (case-sensitive match)
  const values = new Set(Object.values(aliases));
  if (values.has(raw as T)) return { value: raw as T, wasNormalized: false };
  return { value: fallback, wasNormalized: true };
}

function normalizeType(raw: unknown): TicketType {
  return normalizeEnum(raw, TYPE_ALIASES, 'task').value;
}

function normalizeReadiness(raw: unknown): Readiness {
  const valid: Readiness[] = ['ready', 'partially_blocked', 'blocked'];
  if (typeof raw === 'string' && valid.includes(raw as Readiness)) return raw as Readiness;
  return 'ready';
}

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function parseCitations(raw: unknown): TicketCitation[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((c: unknown) => {
      if (typeof c === 'object' && c !== null) {
        const obj = c as Record<string, unknown>;
        if (typeof obj.document_id === 'string' && typeof obj.chunk_id === 'string') {
          return {
            document_id: obj.document_id,
            chunk_id: obj.chunk_id,
            ...(typeof obj.line_start === 'number' ? { line_start: obj.line_start } : {}),
            ...(typeof obj.line_end === 'number' ? { line_end: obj.line_end } : {}),
          };
        }
      }
      return null;
    })
    .filter((c): c is TicketCitation => c !== null);
}

function parseSetupRequirements(raw: unknown): SetupRequirement[] {
  if (!Array.isArray(raw)) return [];
  const validTypes: SetupRequirementType[] = ['external_system', 'prior_ticket', 'decision', 'schema', 'other'];
  return raw.map((item) => {
    if (typeof item === 'string') {
      return { description: item, type: 'other' as SetupRequirementType, resolved: false };
    }
    if (typeof item === 'object' && item !== null) {
      const obj = item as Record<string, unknown>;
      const t = typeof obj.type === 'string' && validTypes.includes(obj.type as SetupRequirementType)
        ? obj.type as SetupRequirementType
        : 'other' as SetupRequirementType;
      return {
        description: typeof obj.description === 'string' ? obj.description : String(obj.description || ''),
        type: t,
        resolved: typeof obj.resolved === 'boolean' ? obj.resolved : false,
      };
    }
    return { description: String(item), type: 'other' as SetupRequirementType, resolved: false };
  });
}
