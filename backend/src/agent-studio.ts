import { ProjectDocument, Ticket } from './types';
import { validateAndRepairTickets, ValidationContext } from './ticketValidator';

// =============================================================================
// Configuration
// =============================================================================

const AGENT_STUDIO_CONFIG = {
  timeout: 90000, // 90 seconds for LLM responses (ticket generation is more complex)
  maxDocumentChars: 2000, // Max characters per document
  maxTotalPromptChars: 14000, // Max total prompt size (increased for richer prompt)
} as const;

// =============================================================================
// Types
// =============================================================================

interface AgentStudioMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentStudioRequest {
  messages: AgentStudioMessage[];
}

// =============================================================================
// Agent Studio Service
// =============================================================================

export class AgentStudioService {
  private appId: string;
  private apiKey: string;
  private agentId: string;

  constructor() {
    const appId = process.env.ALGOLIA_APP_ID;
    const apiKey = process.env.ALGOLIA_ADMIN_KEY;
    const agentId = process.env.ALGOLIA_AGENT_ID;

    if (!appId || !apiKey) {
      throw new Error('Algolia credentials not configured');
    }

    if (!agentId) {
      throw new Error(
        'ALGOLIA_AGENT_ID not configured. Create an agent in Algolia Dashboard and set the environment variable.'
      );
    }

    this.appId = appId;
    this.apiKey = apiKey;
    this.agentId = agentId;
  }

  /**
   * Check if Agent Studio is configured
   */
  static isConfigured(): boolean {
    return !!(
      process.env.ALGOLIA_APP_ID &&
      process.env.ALGOLIA_ADMIN_KEY &&
      process.env.ALGOLIA_AGENT_ID
    );
  }

  /**
   * Generate tickets from project documents
   */
  async generateTickets(query: string, documents: ProjectDocument[]): Promise<Ticket[]> {
    if (documents.length === 0) {
      return [];
    }

    const prompt = this.buildPrompt(query, documents);
    const response = await this.callAgent(prompt);
    return this.parseResponse(response, documents);
  }

  /**
   * Generate a raw response from Agent Studio given a prompt string.
   * Used by DocumentIntelAgent for structured answer generation.
   */
  async generateResponse(prompt: string): Promise<string> {
    return this.callAgent(prompt);
  }

  /**
   * Build the prompt for ticket generation — uses CANONICAL ticket schema
   */
  private buildPrompt(query: string, documents: ProjectDocument[]): string {
    // Truncate each document to prevent oversized prompts
    const truncatedDocs = documents.map((doc, i) => {
      const content =
        doc.content.length > AGENT_STUDIO_CONFIG.maxDocumentChars
          ? doc.content.slice(0, AGENT_STUDIO_CONFIG.maxDocumentChars) + '...'
          : doc.content;
      const title = doc.title ? ` - ${doc.title}` : '';
      return `[Doc ${i + 1} - ${doc.doc_type}${title}${doc.author ? ` by ${doc.author}` : ''}]\n${content}`;
    });

    // Build docs context, limiting total size
    let docsContext = '';
    for (const doc of truncatedDocs) {
      if (docsContext.length + doc.length > AGENT_STUDIO_CONFIG.maxTotalPromptChars - 3000) {
        docsContext += '\n\n[Additional documents truncated...]';
        break;
      }
      docsContext += (docsContext ? '\n\n' : '') + doc;
    }

    return `You are a senior tech architect analyzing project documents to generate user stories and tickets.

Query: "${query}"

Documents:
${docsContext}

Generate user stories/tickets based on these documents. For each ticket produce a JSON object with EXACTLY these required fields:

CANONICAL TICKET SCHEMA (required on every ticket):
- title: string — Clear, actionable title (imperative mood)
- description: string — What needs to be built and why
- type: "user_story" | "task" | "bug" | "spike" | "infrastructure" | "decision"
  ("decision" tickets have no code — they block other tickets and produce documented outcomes like PRD updates or policy decisions)
- acceptance_criteria: string[] — List of testable criteria (MINIMUM 2 required — tickets with fewer than 2 will be converted to decision tickets)
- known_edge_cases: string[] — Known behaviors and risks with a known handling strategy (can be [])
- open_questions: string[] — Unresolved questions, unknown policies, or ambiguities needing answers before implementation (can be [])
- setup_requirements: Array<{description: string, type: "external_system"|"prior_ticket"|"decision"|"schema"|"other", resolved: boolean}> — Prerequisites (can be [])
- dependencies: string[] — Titles of OTHER tickets in this batch that STRICTLY must complete first. Use ONLY for true sequential blockers. Do NOT add dependencies just because tickets share a domain.
- estimated_effort: "XS" (<2h) | "S" (2–4h) | "M" (1–2d) | "L" (3–5d) | "XL" (>1w)
- priority: "critical" | "high" | "medium" | "low"
- labels: string[] — Technical areas affected (e.g., "frontend", "api", "database", "auth", "observability", "security", "testing", "infrastructure")
- suggested_assignee: string — Role/team responsible for execution (e.g., "Backend Engineer", "Product Manager"), not a person's name
- confidence: number 0.0–1.0 — Calibrate carefully:
  - 0.90–1.0: Well-defined, no open questions, minimal dependencies
  - 0.80–0.89: Clear requirements, some dependencies or minor unknowns
  - 0.70–0.79: Open questions OR cross-team dependencies
  - 0.50–0.69: Derived/inferred tickets, many unknowns, exploratory
  - DO NOT uniformly assign ~0.7. Straightforward work should be 0.85+.
- citations: Array<{document_id: string, chunk_id: string}> — At least 1 citation referencing a source document. Use Doc numbers: {"document_id": "doc_1", "chunk_id": "chunk_1"}

OPTIONAL METADATA (include when relevant, but canonical fields above take priority):
- stakeholders: string[] — Non-executing influencers to inform or consult
- suggested_dependencies: string[] — Titles of related tickets that MAY benefit from being done first but do NOT strictly block
- is_derived: boolean — true if surfacing missing-but-required work not explicitly requested
- derived_rationale: string — REQUIRED if is_derived is true; explain the gap found in source documents
- readiness: "ready" | "partially_blocked" | "blocked" — derive from dependencies and setup_requirements
- readiness_reason: string — Brief explanation of readiness status

GROUNDING RULES (VIOLATIONS CAUSE TICKET REJECTION):
- Do NOT create tickets for "PostgreSQL schema", "REST API endpoints", "JWT authentication", "CI/CD pipeline", etc. UNLESS these are EXPLICITLY mentioned in the documents
- For each ticket, ask: "Is this system, feature, or requirement mentioned BY NAME in the provided documents?"
- If you cannot point to a specific document passage, create a "decision" ticket instead: "Should we implement [system]? The documents don't specify this."
- Example of VALID ticket: "Implement user authentication as specified in section 3.2 of the PRD" (with citation)
- Example of INVALID ticket: "Set up PostgreSQL database schema" (no document mentions PostgreSQL)
- Every non-derived ticket MUST include at least 1 citation referencing a specific source document.
- Ask yourself: "Does this ticket exist because of something in the documents, or because I think it's a good idea?" Only the former belongs here.
- When a topic is ambiguous or policy is unclear, create a "decision" ticket with lower confidence (0.5–0.65) and populate open_questions.

SCHEMA ENFORCEMENT:
- Every ticket MUST include ALL canonical fields listed above. Do not omit any field.
- Use empty arrays [] for fields with no known values. NEVER omit an array field.
- Do NOT add extra keys beyond the schema above.
- Each ticket MUST have at least 2 acceptance_criteria.
- Citations MUST be objects: {"document_id": "...", "chunk_id": "..."} — never flatten to strings.
- dependencies contain TITLE REFERENCES to other tickets, not IDs.

Return ONLY a valid JSON array (no markdown, no explanation):
[{"title":"...","description":"...","type":"...","acceptance_criteria":[...],"known_edge_cases":[...],"open_questions":[...],"setup_requirements":[{"description":"...","type":"...","resolved":false}],"dependencies":[...],"estimated_effort":"...","priority":"...","labels":[...],"suggested_assignee":"...","confidence":0.85,"citations":[{"document_id":"doc_1","chunk_id":"chunk_1"}]}]`;
  }

  /**
   * Call the Algolia Agent Studio API
   */
  private async callAgent(userMessage: string): Promise<string> {
    const url = `https://agent-studio.us.algolia.com/1/agents/${this.agentId}/completions?compatibilityMode=ai-sdk-4`;

    const request: AgentStudioRequest = {
      messages: [{ role: 'user', content: userMessage }],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGENT_STUDIO_CONFIG.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Algolia-API-Key': this.apiKey,
          'X-Algolia-Application-Id': this.appId,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Agent Studio API error (${response.status}): ${errorText}`);
      }

      const text = await response.text();
      return this.parseStreamingResponse(text);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Agent Studio request timed out');
      }

      throw error;
    }
  }

  /**
   * Parse Vercel AI SDK streaming format
   */
  private parseStreamingResponse(streamText: string): string {
    const lines = streamText.split('\n');
    let content = '';

    for (const line of lines) {
      if (line.startsWith('0:')) {
        try {
          const jsonValue = line.slice(2);
          const textPart = JSON.parse(jsonValue);
          if (typeof textPart === 'string') {
            content += textPart;
          }
        } catch {
          // Skip lines that can't be parsed
        }
      }
    }

    return content;
  }

  /**
   * Parse the agent's response into Ticket objects.
   * Delegates to the centralized validateAndRepairTickets() pipeline.
   */
  private parseResponse(response: string, documents: ProjectDocument[]): Ticket[] {
    try {
      // Try to extract JSON array from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn('No JSON array found in agent response:', response);
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        console.warn('Parsed response is not an array');
        return [];
      }

      // Normalize backward-compat fields before validation
      const normalized = parsed.map((item: Record<string, unknown>) => ({
        ...item,
        // Merge edge_cases → known_edge_cases if needed
        known_edge_cases: item.known_edge_cases ?? item.edge_cases ?? [],
      }));

      const docIds = documents.map((d) => d.objectID);
      const ctx: ValidationContext = {
        sourceDocIds: docIds,
        hasDocuments: documents.length > 0,
      };

      const { tickets } = validateAndRepairTickets(normalized, ctx);
      return tickets;
    } catch (error) {
      console.error('Failed to parse agent response:', error);
      console.error('Raw response:', response);
      return [];
    }
  }

}
