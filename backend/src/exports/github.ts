import { Ticket } from '../types';

interface GitHubExportResult {
  success: boolean;
  issue?: {
    id: number;
    number: number;
    html_url: string;
  };
  error?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const GITHUB_API_URL = 'https://api.github.com';

const TYPE_LABELS: Record<Ticket['type'], string> = {
  user_story: 'enhancement',
  task: 'task',
  bug: 'bug',
  spike: 'research',
  infrastructure: 'infrastructure',
  decision: 'decision',
};

const PRIORITY_LABELS: Record<Ticket['priority'], string> = {
  critical: 'priority: critical',
  high: 'priority: high',
  medium: 'priority: medium',
  low: 'priority: low',
};

const EFFORT_LABELS: Record<Ticket['estimated_effort'], string> = {
  XS: 'effort: XS',
  S: 'effort: S',
  M: 'effort: M',
  L: 'effort: L',
  XL: 'effort: XL',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatTicketBody(ticket: Ticket): string {
  let body = ticket.description;

  if (ticket.acceptance_criteria.length > 0) {
    body += '\n\n## Acceptance Criteria\n';
    ticket.acceptance_criteria.forEach((criterion) => {
      body += `- [ ] ${criterion}\n`;
    });
  }

  if (ticket.known_edge_cases.length > 0) {
    body += '\n## Known Edge Cases\n';
    ticket.known_edge_cases.forEach((edgeCase) => {
      body += `- ${edgeCase}\n`;
    });
  }

  if (ticket.open_questions.length > 0) {
    body += '\n## Open Questions\n';
    ticket.open_questions.forEach((question) => {
      body += `- :question: ${question}\n`;
    });
  }

  if (ticket.setup_requirements.length > 0) {
    body += '\n## Setup Requirements\n';
    ticket.setup_requirements.forEach((req) => {
      const checkbox = req.resolved ? '- [x]' : '- [ ]';
      body += `${checkbox} \`${req.type}\` ${req.description}\n`;
    });
  }

  if (ticket.dependencies.length > 0) {
    body += '\n## Dependencies\n';
    ticket.dependencies.forEach((dep) => {
      body += `- ${dep}\n`;
    });
  }

  if (ticket.suggested_dependencies && ticket.suggested_dependencies.length > 0) {
    body += '\n## Suggested Dependencies (Low Confidence)\n';
    ticket.suggested_dependencies.forEach((dep) => {
      body += `- :zap: ${dep}\n`;
    });
  }

  // Metadata
  body += '\n---\n';
  body += `**Estimated Effort:** ${ticket.estimated_effort}\n`;
  body += `**Priority:** ${ticket.priority}\n`;
  body += `**Readiness:** ${ticket.readiness}`;
  if (ticket.readiness_reason) {
    body += ` — _${ticket.readiness_reason}_`;
  }
  body += '\n';
  if (ticket.suggested_assignee) {
    body += `**Assignee Role:** ${ticket.suggested_assignee}\n`;
  }
  if (ticket.stakeholders && ticket.stakeholders.length > 0) {
    body += `**Stakeholders:** ${ticket.stakeholders.join(', ')}\n`;
  }
  if (ticket.is_derived) {
    body += '\n> **Derived ticket** -- inferred as necessary for production readiness.\n';
    if (ticket.derived_rationale) {
      body += `> _${ticket.derived_rationale}_\n`;
    }
  }

  return body;
}

function buildLabels(ticket: Ticket): string[] {
  const labels: string[] = [];

  // Add type label
  labels.push(TYPE_LABELS[ticket.type]);

  // Add priority label
  labels.push(PRIORITY_LABELS[ticket.priority]);

  // Add effort label
  labels.push(EFFORT_LABELS[ticket.estimated_effort]);

  // Add custom labels from ticket
  ticket.labels.forEach((label) => {
    if (!labels.includes(label)) {
      labels.push(label);
    }
  });

  return labels;
}

// =============================================================================
// Export Functions
// =============================================================================

interface GitHubCreateResponse {
  id: number;
  number: number;
  html_url: string;
}

export async function exportTicketToGitHub(
  ticket: Ticket,
  token: string,
  owner: string,
  repo: string
): Promise<GitHubExportResult> {
  try {
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/issues`;

    const body = {
      title: ticket.title,
      body: formatTicketBody(ticket),
      labels: buildLabels(ticket),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Lorance-DevPlanner',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { message?: string };
      throw new Error(
        `GitHub API error (${response.status}): ${errorData.message || 'Unknown error'}`
      );
    }

    const data = (await response.json()) as GitHubCreateResponse;

    return {
      success: true,
      issue: {
        id: data.id,
        number: data.number,
        html_url: data.html_url,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function exportToGitHub(
  tickets: Ticket[],
  token: string,
  owner: string,
  repo: string
): Promise<GitHubExportResult[]> {
  const results: GitHubExportResult[] = [];

  // GitHub has rate limits, so we process sequentially with delays
  for (const ticket of tickets) {
    const result = await exportTicketToGitHub(ticket, token, owner, repo);
    results.push(result);

    // GitHub allows 5000 requests/hour for authenticated requests
    // Small delay to be nice to the API
    if (tickets.indexOf(ticket) < tickets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

// Verify repository access before exporting
export async function verifyGitHubAccess(
  token: string,
  owner: string,
  repo: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const url = `${GITHUB_API_URL}/repos/${owner}/${repo}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Lorance-DevPlanner',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { valid: false, error: 'Repository not found or no access' };
      }
      if (response.status === 401) {
        return { valid: false, error: 'Invalid or expired token' };
      }
      return { valid: false, error: `GitHub API error: ${response.status}` };
    }

    const data = (await response.json()) as { permissions?: { push?: boolean; admin?: boolean } };

    // Check if we have push access (needed to create issues)
    if (!data.permissions?.push && !data.permissions?.admin) {
      return { valid: false, error: 'No write access to repository' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Ensure labels exist in the repository
export async function ensureLabelsExist(
  token: string,
  owner: string,
  repo: string,
  labels: string[]
): Promise<void> {
  const url = `${GITHUB_API_URL}/repos/${owner}/${repo}/labels`;

  // Get existing labels
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Lorance-DevPlanner',
    },
  });

  if (!response.ok) return;

  const existingLabels = (await response.json()) as Array<{ name: string }>;
  const existingNames = new Set(existingLabels.map((l) => l.name.toLowerCase()));

  // Create missing labels
  for (const label of labels) {
    if (!existingNames.has(label.toLowerCase())) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'Lorance-DevPlanner',
          },
          body: JSON.stringify({
            name: label,
            color: generateLabelColor(label),
          }),
        });
      } catch {
        // Ignore label creation errors
      }
    }
  }
}

function generateLabelColor(label: string): string {
  // Generate consistent colors based on label content
  if (label.includes('priority: critical')) return 'B60205';
  if (label.includes('priority: high')) return 'D93F0B';
  if (label.includes('priority: medium')) return 'FBCA04';
  if (label.includes('priority: low')) return '0E8A16';
  if (label.includes('effort:')) return '1D76DB';
  if (label === 'bug') return 'D73A4A';
  if (label === 'enhancement') return 'A2EEEF';
  if (label === 'infrastructure') return '5319E7';
  if (label === 'research') return 'F9D0C4';
  if (label === 'decision') return 'D4C5F9';

  // Generate a hash-based color for other labels
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.abs(hash).toString(16).substring(0, 6);
  return color.padStart(6, '0');
}
