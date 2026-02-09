import { AgentStudioService } from '../agent-studio';
import { DocumentChunk, TicketRecord } from '../types/documentIntel';
import { validateAndRepairTickets, ValidationContext } from '../ticketValidator';
import fs from 'fs';
import path from 'path';

// =============================================================================
// Agent Studio Integration for Document Intelligence
// =============================================================================

export class DocumentIntelAgent {
  private agentStudioService: AgentStudioService;

  constructor() {
    this.agentStudioService = new AgentStudioService();
  }

  /**
   * Generate structured answer from search results
   */
  async generateStructuredAnswer(context: {
    query: string;
    workspace_id: string;
    documents: DocumentChunk[];
    tickets: TicketRecord[];
    total_results: number;
  }) {
    const prompt = this.buildStructuredAnswerPrompt(context);

    // Build validation context from the documents available in this run
    const validationCtx: ValidationContext = {
      sourceDocIds: context.documents.map(d => d.objectID),
      hasDocuments: context.documents.length > 0,
    };

    try {
      const response = await this.agentStudioService.generateResponse(prompt);
      const parsed = this.parseStructuredAnswer(response, validationCtx);
      return this.normalizeAnswerForQuery(context.query, parsed);
    } catch (error) {
      console.error('Failed to generate structured answer:', error);
      return this.getDefaultAnswer(context);
    }
  }

  private buildStructuredAnswerPrompt(context: {
    query: string;
    workspace_id: string;
    documents: DocumentChunk[];
    tickets: TicketRecord[];
    total_results: number;
  }): string {
    const { query, documents, tickets } = context;

    const allDocContent = documents.map(d => d.content).join('\n\n---DOCUMENT---\n\n');

    return `You are a Senior Technical Architect reviewing a project's complete documentation scope. Your job is to analyze ALL documents holistically and create a comprehensive implementation plan.

PROJECT DOCUMENTS:
${allDocContent}

EXISTING TICKETS:
${tickets.length > 0 ? tickets.map((t, i) => `${i + 1}. [${t.type}] ${t.title}: ${t.description}`).join('\n') : 'None'}

CURRENT USER REQUEST: "${query}"

RESPONSE FOCUS (CRITICAL):
- The response MUST be tailored to the CURRENT USER REQUEST above.
- Do NOT return a generic project summary unless the user explicitly asked for a summary.
- If the request is about a specific topic, prioritize and limit results to that topic.
- If the documents do not answer the request, say so clearly in summary and add a single open question explaining the gap.

YOUR TASK:
1. ONLY extract tickets for work that is EXPLICITLY mentioned in the documents
2. For each ticket, cite the specific document section that supports it
3. When something is implied but not explicit, create a "decision" ticket with open_questions — do NOT assume implementation details
4. For production-readiness gaps (monitoring, security, testing) that are genuinely missing from the documents, mark them is_derived=true with a specific derived_rationale referencing the gap

STRICT GROUNDING RULES (VIOLATIONS WILL CAUSE TICKETS TO BE REJECTED):
- Do NOT create tickets for "PostgreSQL schema", "REST API endpoints", "JWT authentication", "CI/CD pipeline", etc. UNLESS these are EXPLICITLY mentioned in the documents
- For each ticket, ask: "Is this system, feature, or requirement mentioned BY NAME in the provided documents?"
- If you cannot point to a specific document passage that describes this work, do NOT create the ticket
- Instead, create a "decision" ticket asking: "Should we implement [system]? The documents don't specify this."
- Example of GROUNDED ticket: "Implement user authentication as specified in section 3.2 of the PRD" (with citation to that section)
- Example of GENERIC (rejected) ticket: "Set up PostgreSQL database schema" (no document mentions PostgreSQL)

CITATION REQUIREMENT:
- Every ticket MUST include at least 1 citation: {"document_id": "doc_1", "chunk_id": "chunk_1"}
- The document_id must match one of the provided documents
- If you can't cite a specific document, the ticket will be rejected in validation

CANONICAL TICKET SCHEMA (required on every ticket — use EXACTLY these field names):
{
  "title": "Clear, actionable imperative",
  "description": "What needs to be built or decided, and why it matters",
  "type": "user_story | task | decision | bug | spike | infrastructure",
  "acceptance_criteria": ["Specific testable outcome 1", "Specific testable outcome 2"],
  "known_edge_cases": ["Failure mode or tricky scenario"],
  "open_questions": ["Unresolved decision or ambiguity"],
  "setup_requirements": [{"description": "Prerequisite needed", "type": "external_system | prior_ticket | decision | schema | other", "resolved": false}],
  "dependencies": ["Title of blocking ticket"],
  "estimated_effort": "XS | S | M | L | XL",
  "priority": "critical | high | medium | low",
  "labels": ["backend", "api", "database", "auth", "frontend", "security", "testing", "infrastructure", "observability"],
  "suggested_assignee": "Role or team (e.g., 'Backend Engineer', 'Product Manager')",
  "confidence": 0.85,
  "citations": [{"document_id": "doc_1", "chunk_id": "chunk_1"}]
}

OPTIONAL METADATA (include when relevant):
- stakeholders: string[] — Non-executing influencers
- suggested_dependencies: string[] — Related but non-blocking tickets
- is_derived: boolean — true if surfacing implicit gaps
- derived_rationale: string — Required when is_derived is true
- readiness: "ready" | "partially_blocked" | "blocked"
- readiness_reason: string

SCHEMA ENFORCEMENT:
- Every ticket MUST include ALL canonical fields listed above. Do not omit any field.
- Use empty arrays [] for fields with no known values. NEVER omit an array field.
- Do NOT add extra keys beyond the schemas above.
- Each ticket MUST have at least 2 acceptance_criteria. If you cannot produce 2, the backend will convert it to a decision ticket.
- Citations MUST be objects: {"document_id": "...", "chunk_id": "..."} — never flatten to strings.
- dependencies contain TITLE REFERENCES to other tickets, not IDs.

DEPENDENCIES WIRING - CRITICAL:
- REST API endpoints MUST depend on the pagination/filtering decision ticket
- PostgreSQL schema tickets MUST depend on the indexing/constraints decision ticket
- Auth implementation tickets MUST depend on the JWT policy decision ticket
- Look for logical sequential relationships between tickets and wire them up
- Example: "Build REST endpoints" depends on: ["Decision: Define pagination format"]

CONFIDENCE CALIBRATION:
- Decision tickets: 0.4-0.75 range (use lower end when open_questions > 0)
- Implementation tickets: 0.8-0.95 range
- Derived/inferred tickets: 0.5-0.7 range
- NEVER assign 0.9 to decision tickets with open questions

OUTPUT FORMAT:
Return a JSON object with:
{
  "answer_to_query": "Direct answer to the CURRENT USER REQUEST. If not answerable, say so plainly.",
  "not_found": false,
  "summary": ["2-3 sentences about the project scope and what you're delivering"],
  "keyFindings": {
    "blockers": [],
    "decisions": [],
    "owners": [],
    "openQuestions": [],
    "nextSteps": ["Review generated tickets and prioritize sprint"]
  },
  "tickets": [array of tickets using the CANONICAL schema above],
  "citations": [...],
  "recommendations": {...}
}

If documents are empty or unclear, return an empty tickets array and note the gap in keyFindings.openQuestions. Do NOT invent generic tickets.
`;
  }

  /**
   * Parse and normalize LLM output through the centralized validation pipeline.
   */
  private parseStructuredAnswer(response: string, ctx: ValidationContext): any {
    try {
      const parsed = JSON.parse(this.sanitizeJsonString(response));
      if (parsed.tickets && Array.isArray(parsed.tickets)) {
        console.log(`[DocumentIntelAgent] Raw tickets from AI: ${parsed.tickets.length}`);
        const { tickets, log } = validateAndRepairTickets(parsed.tickets, ctx);

        console.log(`[DocumentIntelAgent] Validated tickets: ${tickets.length}`);
        console.log(`[DocumentIntelAgent] Validation log:`, JSON.stringify(log, null, 2));

        // Check first ticket for canonical fields
        if (tickets.length > 0) {
          const first = tickets[0];
          console.log(`[DocumentIntelAgent] First ticket fields:`, {
            hasAcceptanceCriteria: Array.isArray(first.acceptance_criteria),
            hasKnownEdgeCases: Array.isArray(first.known_edge_cases),
            hasOpenQuestions: Array.isArray(first.open_questions),
            hasSetupRequirements: Array.isArray(first.setup_requirements),
            hasEstimatedEffort: !!first.estimated_effort,
            hasCitations: Array.isArray(first.citations) && first.citations.length > 0,
            acceptanceCriteriaLength: first.acceptance_criteria?.length || 0,
            citationsLength: first.citations?.length || 0,
          });
        }

        parsed.tickets = tickets;
        parsed.keyFindings = parsed.keyFindings || {};
        parsed.keyFindings.nextSteps = tickets.map((t: any) => t.title);

        // Attach validation metadata
        parsed._validation = log;
      }
      return parsed;
    } catch (error) {
      // Try to salvage a JSON object from a noisy response
      try {
        const start = response.indexOf('{');
        const end = response.lastIndexOf('}');
        if (start !== -1 && end !== -1 && end > start) {
          const candidate = response.slice(start, end + 1);
          const parsed = JSON.parse(this.sanitizeJsonString(candidate));
          if (parsed.tickets && Array.isArray(parsed.tickets)) {
            console.log(`[DocumentIntelAgent] Raw tickets from AI (salvaged): ${parsed.tickets.length}`);
            const { tickets, log } = validateAndRepairTickets(parsed.tickets, ctx);
            parsed.tickets = tickets;
            parsed.keyFindings = parsed.keyFindings || {};
            parsed.keyFindings.nextSteps = tickets.map((t: any) => t.title);
            parsed._validation = log;
          }
          return parsed;
        }
      } catch (salvageError) {
        // fall through to default
      }
      console.error('Failed to parse structured answer:', error);
      console.error('[DocumentIntelAgent] Raw response (truncated):', response.slice(0, 1500));
      try {
        const fileName = `document-intel-raw-response-${Date.now()}.txt`;
        const filePath = path.join('/tmp', fileName);
        fs.writeFileSync(filePath, response, 'utf8');
        console.error(`[DocumentIntelAgent] Raw response written to ${filePath}`);
      } catch (writeError) {
        console.error('[DocumentIntelAgent] Failed to write raw response to /tmp:', writeError);
      }
      return {
        summary: ['Analysis completed with limited results'],
        keyFindings: {
          blockers: [],
          decisions: [],
          owners: [],
          openQuestions: ['Unable to parse detailed analysis'],
          nextSteps: ['Review search results manually']
        },
        tickets: [],
        referencedItems: {
          documents: [],
          tickets: []
        },
        citations: [],
        recommendations: {
          filters: [],
          followUpQueries: []
        }
      };
    }
  }

  /**
   * Best-effort JSON sanitization for LLM outputs.
   * - Escapes raw newlines/tabs inside quoted strings
   * - Removes trailing commas before } or ]
   */
  private sanitizeJsonString(raw: string): string {
    let out = '';
    let inString = false;
    let escaping = false;

    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];

      if (inString) {
        if (escaping) {
          out += ch;
          escaping = false;
          continue;
        }
        if (ch === '\\') {
          out += ch;
          escaping = true;
          continue;
        }
        if (ch === '"') {
          inString = false;
          out += ch;
          continue;
        }
        if (ch === '\n') {
          out += '\\n';
          continue;
        }
        if (ch === '\r') {
          out += '\\r';
          continue;
        }
        if (ch === '\t') {
          out += '\\t';
          continue;
        }
        out += ch;
        continue;
      }

      if (ch === '"') {
        inString = true;
      }
      out += ch;
    }

    // Remove trailing commas before closing braces/brackets
    let cleaned = out.replace(/,(\s*[}\]])/g, '$1');
    cleaned = this.fixRecommendationsShape(cleaned);
    return cleaned;
  }

  /**
   * Fixes a common malformed pattern:
   * "recommendations": { "item 1", "item 2" }
   * Converts to:
   * "recommendations": { "notes": ["item 1", "item 2"] }
   */
  private fixRecommendationsShape(raw: string): string {
    const re = /"recommendations"\s*:\s*{\s*([\s\S]*?)\s*}/g;
    return raw.replace(re, (match, inner) => {
      if (inner.includes(':')) {
        return match;
      }
      const itemRe = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
      const items: string[] = [];
      let m: RegExpExecArray | null = null;
      while ((m = itemRe.exec(inner))) {
        items.push(`"${m[1]}"`);
      }
      if (items.length === 0) {
        return match;
      }
      return `"recommendations":{"notes":[${items.join(', ')}]}`;
    });
  }

  /**
   * Heuristic post-processing to align the response with the user's query intent.
   */
  private normalizeAnswerForQuery(query: string, answer: any): any {
    const q = query.toLowerCase();
    const isPeopleQuery = /who|people|person|team|stakeholder|owner|involved|participants/.test(q);
    const isProblemQuery = /problem|issue|risk|challenge|blocker|concern|highlight/.test(q);

    if (!answer || typeof answer !== 'object') return answer;

    if (isPeopleQuery) {
      const owners: string[] = Array.isArray(answer.keyFindings?.owners) ? answer.keyFindings.owners : [];
      const ownersSummary = owners.length > 0 ? owners.join('; ') : 'None explicitly named in documents.';

      answer.summary = [`People involved: ${ownersSummary}`];
      answer.keyFindings = {
        blockers: [],
        decisions: [],
        owners: owners,
        openQuestions: owners.length > 0 ? [] : ['Who are the project owners or stakeholders?'],
        nextSteps: [],
      };
      if (answer.recommendations && typeof answer.recommendations === 'object') {
        answer.recommendations = {
          ...answer.recommendations,
          followUpQueries: [],
        };
      }
    }

    if (isProblemQuery) {
      const blockers: string[] = Array.isArray(answer.keyFindings?.blockers) ? answer.keyFindings.blockers : [];
      const openQuestions: string[] = Array.isArray(answer.keyFindings?.openQuestions) ? answer.keyFindings.openQuestions : [];
      const summaryProblems =
        blockers.length > 0
          ? blockers
          : openQuestions.length > 0
            ? openQuestions
            : ['No explicit problems or blockers were identified in the documents.'];

      answer.summary = summaryProblems.slice(0, 3);
      answer.keyFindings = {
        blockers,
        decisions: [],
        owners: [],
        openQuestions,
        nextSteps: [],
      };

      if (answer.recommendations && typeof answer.recommendations === 'object') {
        answer.recommendations = {
          ...answer.recommendations,
          followUpQueries: [],
        };
      }
    }

    return answer;
  }

  private getDefaultAnswer(context: {
    query: string;
    workspace_id: string;
    documents: DocumentChunk[];
    tickets: TicketRecord[];
    total_results: number;
  }): any {
    const { query, documents, tickets, total_results } = context;

    return {
      summary: [
        `Found ${total_results} results for "${query}"`,
        `${documents.length} documents and ${tickets.length} tickets analyzed`
      ],
      keyFindings: {
        blockers: tickets
          .filter(t => t.readiness === 'blocked')
          .map(t => `${t.title} is blocked`),
        decisions: tickets
          .filter(t => t.type === 'decision')
          .map(t => `Decision: ${t.title}`),
        owners: tickets
          .filter(t => t.assignee)
          .map(t => t.assignee as string),
        openQuestions: [],
        nextSteps: ['Review the search results for more details']
      },
      tickets: [],
      referencedItems: {
        documents: documents.slice(0, 3).map(doc => ({
          id: doc.objectID,
          title: doc.title || 'Untitled',
          source_type: doc.source_type,
          relevance: 'Contains relevant information'
        })),
        tickets: tickets.slice(0, 3).map(ticket => ({
          id: ticket.objectID,
          title: ticket.title,
          type: ticket.type,
          relevance: 'Matches search criteria'
        }))
      },
      citations: [
        ...documents.slice(0, 2).map(doc => ({
          type: 'document' as const,
          id: doc.objectID,
          title: doc.title,
          excerpt: doc.content.substring(0, 100) + '...'
        })),
        ...tickets.slice(0, 2).map(ticket => ({
          type: 'ticket' as const,
          id: ticket.objectID,
          title: ticket.title,
          excerpt: ticket.description.substring(0, 100) + '...'
        }))
      ],
      recommendations: {
        filters: [],
        followUpQueries: [
          'What are the next steps?',
          'Are there any decisions that need to be made?'
        ]
      }
    };
  }
}
