import { Ticket } from '../types';

interface LinearExportResult {
  success: boolean;
  issue?: {
    id: string;
    identifier: string;
    url: string;
  };
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const LINEAR_API_URL = 'https://api.linear.app/graphql';

const PRIORITY_MAP: Record<Ticket['priority'], number> = {
  critical: 1, // Urgent
  high: 2,
  medium: 3,
  low: 4,
};

const EFFORT_TO_POINTS: Record<Ticket['estimated_effort'], number> = {
  XS: 1,
  S: 2,
  M: 3,
  L: 5,
  XL: 8,
};

// =============================================================================
// GraphQL Mutations
// =============================================================================

const CREATE_ISSUE_MUTATION = `
  mutation CreateIssue($teamId: String!, $title: String!, $description: String, $priority: Int, $estimate: Int, $labelIds: [String!]) {
    issueCreate(input: {
      teamId: $teamId
      title: $title
      description: $description
      priority: $priority
      estimate: $estimate
      labelIds: $labelIds
    }) {
      success
      issue {
        id
        identifier
        url
      }
    }
  }
`;

const GET_TEAM_LABELS_QUERY = `
  query GetTeamLabels($teamId: String!) {
    team(id: $teamId) {
      labels {
        nodes {
          id
          name
        }
      }
    }
  }
`;

// =============================================================================
// Helper Functions
// =============================================================================

function formatTicketDescription(ticket: Ticket): string {
  let description = ticket.description;

  if (ticket.acceptance_criteria.length > 0) {
    description += '\n\n## Acceptance Criteria\n';
    ticket.acceptance_criteria.forEach((criterion) => {
      description += `- [ ] ${criterion}\n`;
    });
  }

  if (ticket.known_edge_cases.length > 0) {
    description += '\n## Known Edge Cases\n';
    ticket.known_edge_cases.forEach((edgeCase) => {
      description += `- ${edgeCase}\n`;
    });
  }

  if (ticket.open_questions.length > 0) {
    description += '\n## Open Questions\n';
    ticket.open_questions.forEach((question) => {
      description += `- ❓ ${question}\n`;
    });
  }

  if (ticket.setup_requirements.length > 0) {
    description += '\n## Setup Requirements\n';
    ticket.setup_requirements.forEach((req) => {
      const status = req.resolved ? '✅' : '🔴';
      description += `- ${status} [${req.type}] ${req.description}\n`;
    });
  }

  if (ticket.dependencies.length > 0) {
    description += '\n## Dependencies\n';
    ticket.dependencies.forEach((dep) => {
      description += `- ${dep}\n`;
    });
  }

  if (ticket.suggested_dependencies && ticket.suggested_dependencies.length > 0) {
    description += '\n## Suggested Dependencies (Low Confidence)\n';
    ticket.suggested_dependencies.forEach((dep) => {
      description += `- ⚡ ${dep}\n`;
    });
  }

  if (ticket.stakeholders && ticket.stakeholders.length > 0) {
    description += `\n**Stakeholders:** ${ticket.stakeholders.join(', ')}\n`;
  }

  if (ticket.suggested_assignee) {
    description += `**Assignee Role:** ${ticket.suggested_assignee}\n`;
  }

  if (ticket.is_derived) {
    description += '\n> 💡 This is a derived ticket — inferred as necessary for production readiness.\n';
    if (ticket.derived_rationale) {
      description += `> _${ticket.derived_rationale}_\n`;
    }
  }

  description += `\n**Readiness:** ${ticket.readiness}`;
  if (ticket.readiness_reason) {
    description += ` — _${ticket.readiness_reason}_`;
  }
  description += '\n';

  return description;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status}`);
  }

  const data = (await response.json()) as GraphQLResponse<T>;

  if (data.errors) {
    throw new Error(`Linear GraphQL error: ${data.errors[0]?.message || 'Unknown error'}`);
  }

  if (!data.data) {
    throw new Error('No data returned from Linear API');
  }

  return data.data;
}

// =============================================================================
// Export Functions
// =============================================================================

interface TeamLabelsResponse {
  team: {
    labels: {
      nodes: Array<{ id: string; name: string }>;
    };
  };
}

interface CreateIssueResponse {
  issueCreate: {
    success: boolean;
    issue?: {
      id: string;
      identifier: string;
      url: string;
    };
  };
}

export async function getTeamLabels(
  apiKey: string,
  teamId: string
): Promise<Map<string, string>> {
  const data = await graphqlRequest<TeamLabelsResponse>(apiKey, GET_TEAM_LABELS_QUERY, { teamId });

  const labelMap = new Map<string, string>();
  data.team.labels.nodes.forEach((label) => {
    labelMap.set(label.name.toLowerCase(), label.id);
  });

  return labelMap;
}

export async function exportTicketToLinear(
  ticket: Ticket,
  apiKey: string,
  teamId: string,
  labelMap?: Map<string, string>
): Promise<LinearExportResult> {
  try {
    // Match ticket labels to Linear label IDs
    const labelIds: string[] = [];
    if (labelMap && ticket.labels.length > 0) {
      ticket.labels.forEach((label) => {
        const labelId = labelMap.get(label.toLowerCase());
        if (labelId) {
          labelIds.push(labelId);
        }
      });
    }

    const variables = {
      teamId,
      title: ticket.title,
      description: formatTicketDescription(ticket),
      priority: PRIORITY_MAP[ticket.priority],
      estimate: EFFORT_TO_POINTS[ticket.estimated_effort],
      labelIds: labelIds.length > 0 ? labelIds : undefined,
    };

    const data = await graphqlRequest<CreateIssueResponse>(apiKey, CREATE_ISSUE_MUTATION, variables);

    if (data.issueCreate.success && data.issueCreate.issue) {
      return {
        success: true,
        issue: data.issueCreate.issue,
      };
    }

    return {
      success: false,
      error: 'Failed to create issue',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportToLinear(
  tickets: Ticket[],
  apiKey: string,
  teamId: string
): Promise<LinearExportResult[]> {
  // Pre-fetch labels for the team
  let labelMap: Map<string, string> | undefined;
  try {
    labelMap = await getTeamLabels(apiKey, teamId);
  } catch {
    console.warn('Could not fetch team labels, proceeding without label mapping');
  }

  const results: LinearExportResult[] = [];

  // Export tickets sequentially to avoid rate limits
  for (const ticket of tickets) {
    const result = await exportTicketToLinear(ticket, apiKey, teamId, labelMap);
    results.push(result);

    // Small delay between requests to be nice to the API
    if (tickets.indexOf(ticket) < tickets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
