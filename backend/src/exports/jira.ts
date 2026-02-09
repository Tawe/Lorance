import { Ticket } from '../types';

interface JiraExportResult {
  success: boolean;
  issue?: {
    id: string;
    key: string;
    self: string;
  };
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const PRIORITY_MAP: Record<Ticket['priority'], string> = {
  critical: 'Highest',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const TYPE_MAP: Record<Ticket['type'], string> = {
  user_story: 'Story',
  task: 'Task',
  bug: 'Bug',
  spike: 'Task', // Jira doesn't have spike, use Task
  infrastructure: 'Task',
  decision: 'Task', // Jira doesn't have decision, use Task
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatTicketDescription(ticket: Ticket): string {
  // Jira uses wiki markup or ADF, we'll use wiki markup for simplicity
  let description = ticket.description;

  if (ticket.acceptance_criteria.length > 0) {
    description += '\n\nh3. Acceptance Criteria\n';
    ticket.acceptance_criteria.forEach((criterion) => {
      description += `* ${criterion}\n`;
    });
  }

  if (ticket.known_edge_cases.length > 0) {
    description += '\nh3. Known Edge Cases\n';
    ticket.known_edge_cases.forEach((edgeCase) => {
      description += `* ${edgeCase}\n`;
    });
  }

  if (ticket.open_questions.length > 0) {
    description += '\nh3. Open Questions\n';
    ticket.open_questions.forEach((question) => {
      description += `* (?) ${question}\n`;
    });
  }

  if (ticket.setup_requirements.length > 0) {
    description += '\nh3. Setup Requirements\n';
    ticket.setup_requirements.forEach((req) => {
      const status = req.resolved ? '(/)' : '(x)';
      description += `* ${status} [${req.type}] ${req.description}\n`;
    });
  }

  if (ticket.dependencies.length > 0) {
    description += '\nh3. Dependencies\n';
    ticket.dependencies.forEach((dep) => {
      description += `* ${dep}\n`;
    });
  }

  if (ticket.suggested_dependencies && ticket.suggested_dependencies.length > 0) {
    description += '\nh3. Suggested Dependencies (Low Confidence)\n';
    ticket.suggested_dependencies.forEach((dep) => {
      description += `* (?) ${dep}\n`;
    });
  }

  if (ticket.stakeholders && ticket.stakeholders.length > 0) {
    description += `\n*Stakeholders:* ${ticket.stakeholders.join(', ')}\n`;
  }

  if (ticket.suggested_assignee) {
    description += `*Assignee Role:* ${ticket.suggested_assignee}\n`;
  }

  if (ticket.is_derived) {
    description += '\n{info}This is a derived ticket -- inferred as necessary for production readiness.{info}\n';
    if (ticket.derived_rationale) {
      description += `_${ticket.derived_rationale}_\n`;
    }
  }

  description += `\nh3. Estimated Effort\n${ticket.estimated_effort}`;
  description += `\n*Readiness:* ${ticket.readiness}`;
  if (ticket.readiness_reason) {
    description += ` -- _${ticket.readiness_reason}_`;
  }

  return description;
}

function createAuthHeader(email: string, token: string): string {
  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  return `Basic ${credentials}`;
}

// =============================================================================
// Export Functions
// =============================================================================

interface JiraCreateResponse {
  id: string;
  key: string;
  self: string;
}

interface JiraBulkCreateResponse {
  issues: JiraCreateResponse[];
  errors: Array<{
    status: number;
    elementErrors: {
      errors: Record<string, string>;
    };
  }>;
}

export async function exportTicketToJira(
  ticket: Ticket,
  credentials: { email: string; token: string; domain: string },
  projectKey: string
): Promise<JiraExportResult> {
  try {
    const url = `https://${credentials.domain}.atlassian.net/rest/api/3/issue`;

    const body = {
      fields: {
        project: { key: projectKey },
        summary: ticket.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: formatTicketDescription(ticket),
                },
              ],
            },
          ],
        },
        issuetype: { name: TYPE_MAP[ticket.type] },
        priority: { name: PRIORITY_MAP[ticket.priority] },
        labels: ticket.labels,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: createAuthHeader(credentials.email, credentials.token),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as JiraCreateResponse;

    return {
      success: true,
      issue: {
        id: data.id,
        key: data.key,
        self: data.self,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportToJira(
  tickets: Ticket[],
  credentials: { email: string; token: string; domain: string },
  projectKey: string
): Promise<JiraExportResult[]> {
  // Jira bulk create supports up to 50 issues
  // For simplicity, we'll do individual creates with small delays
  const results: JiraExportResult[] = [];

  for (const ticket of tickets) {
    const result = await exportTicketToJira(ticket, credentials, projectKey);
    results.push(result);

    // Small delay between requests
    if (tickets.indexOf(ticket) < tickets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

// Bulk create for better performance (up to 50 issues)
export async function exportToJiraBulk(
  tickets: Ticket[],
  credentials: { email: string; token: string; domain: string },
  projectKey: string
): Promise<JiraExportResult[]> {
  if (tickets.length === 0) return [];
  if (tickets.length > 50) {
    throw new Error('Jira bulk create supports maximum 50 issues');
  }

  try {
    const url = `https://${credentials.domain}.atlassian.net/rest/api/3/issue/bulk`;

    const issueUpdates = tickets.map((ticket) => ({
      fields: {
        project: { key: projectKey },
        summary: ticket.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: formatTicketDescription(ticket),
                },
              ],
            },
          ],
        },
        issuetype: { name: TYPE_MAP[ticket.type] },
        priority: { name: PRIORITY_MAP[ticket.priority] },
        labels: ticket.labels,
      },
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: createAuthHeader(credentials.email, credentials.token),
      },
      body: JSON.stringify({ issueUpdates }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as JiraBulkCreateResponse;

    // Map results back to tickets
    return tickets.map((_, index) => {
      const issue = data.issues[index];
      const error = data.errors[index];

      if (issue) {
        return {
          success: true,
          issue: {
            id: issue.id,
            key: issue.key,
            self: issue.self,
          },
        };
      }

      return {
        success: false,
        error: error
          ? Object.values(error.elementErrors.errors).join(', ')
          : 'Unknown error',
      };
    });
  } catch (error) {
    // Return error for all tickets
    return tickets.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}
