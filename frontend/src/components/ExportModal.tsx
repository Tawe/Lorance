'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  ExportPlatform,
  LinearCredentials,
  JiraCredentials,
  GitHubCredentials,
  ExportResponse,
} from '@/types';
import { api } from '@/services/api';
import {
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';

// =============================================================================
// Storage Keys
// =============================================================================

const STORAGE_KEYS = {
  linear: 'lorance_linear_creds',
  jira: 'lorance_jira_creds',
  github: 'lorance_github_creds',
} as const;

// =============================================================================
// Platform Configurations
// =============================================================================

const PLATFORM_CONFIG: Record<ExportPlatform, { name: string; color: string; icon: string }> = {
  linear: { name: 'Linear', color: 'indigo', icon: '⚡' },
  jira: { name: 'Jira', color: 'blue', icon: '🎯' },
  github: { name: 'GitHub Issues', color: 'gray', icon: '🐙' },
};

// =============================================================================
// Component
// =============================================================================

interface ExportModalProps {
  tickets: Ticket[];
  onClose: () => void;
}

export default function ExportModal({ tickets, onClose }: ExportModalProps) {
  const [platform, setPlatform] = useState<ExportPlatform>('linear');
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Linear credentials
  const [linearCreds, setLinearCreds] = useState<LinearCredentials>({
    apiKey: '',
    teamId: '',
  });

  // Jira credentials
  const [jiraCreds, setJiraCreds] = useState<JiraCredentials>({
    email: '',
    token: '',
    domain: '',
    projectKey: '',
  });

  // GitHub credentials
  const [githubCreds, setGithubCreds] = useState<GitHubCredentials>({
    token: '',
    owner: '',
    repo: '',
  });

  // Load saved credentials from localStorage
  useEffect(() => {
    try {
      const savedLinear = localStorage.getItem(STORAGE_KEYS.linear);
      if (savedLinear) setLinearCreds(JSON.parse(savedLinear));

      const savedJira = localStorage.getItem(STORAGE_KEYS.jira);
      if (savedJira) setJiraCreds(JSON.parse(savedJira));

      const savedGithub = localStorage.getItem(STORAGE_KEYS.github);
      if (savedGithub) setGithubCreds(JSON.parse(savedGithub));
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save credentials to localStorage (excluding sensitive tokens for security)
  const saveCredentials = () => {
    try {
      if (platform === 'linear') {
        localStorage.setItem(
          STORAGE_KEYS.linear,
          JSON.stringify({ ...linearCreds, apiKey: '' })
        );
      } else if (platform === 'jira') {
        localStorage.setItem(
          STORAGE_KEYS.jira,
          JSON.stringify({ ...jiraCreds, token: '' })
        );
      } else if (platform === 'github') {
        localStorage.setItem(
          STORAGE_KEYS.github,
          JSON.stringify({ ...githubCreds, token: '' })
        );
      }
    } catch {
      // Ignore storage errors
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportResult(null);

    try {
      let result: ExportResponse;

      if (platform === 'linear') {
        if (!linearCreds.apiKey || !linearCreds.teamId) {
          throw new Error('Please fill in all Linear credentials');
        }
        result = await api.exportToLinear(tickets, linearCreds);
      } else if (platform === 'jira') {
        if (!jiraCreds.email || !jiraCreds.token || !jiraCreds.domain || !jiraCreds.projectKey) {
          throw new Error('Please fill in all Jira credentials');
        }
        result = await api.exportToJira(tickets, jiraCreds);
      } else {
        if (!githubCreds.token || !githubCreds.owner || !githubCreds.repo) {
          throw new Error('Please fill in all GitHub credentials');
        }
        result = await api.exportToGitHub(tickets, githubCreds);
      }

      saveCredentials();
      setExportResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const platformConfig = PLATFORM_CONFIG[platform];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Export {tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200 hover:shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Platform Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Platform
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(PLATFORM_CONFIG) as ExportPlatform[]).map((p) => {
                const config = PLATFORM_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      platform === p
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{config.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{config.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credentials Form */}
          <div className="space-y-4">
            {platform === 'linear' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={linearCreds.apiKey}
                      onChange={(e) => setLinearCreds({ ...linearCreds, apiKey: e.target.value })}
                      placeholder="lin_api_..."
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-all duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Get your API key from{' '}
                    <a
                      href="https://linear.app/settings/api"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Linear Settings → API
                    </a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Team ID
                  </label>
                  <input
                    type="text"
                    value={linearCreds.teamId}
                    onChange={(e) => setLinearCreds({ ...linearCreds, teamId: e.target.value })}
                    placeholder="e.g., TEAM-123"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                </div>
              </>
            )}

            {platform === 'jira' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={jiraCreds.email}
                    onChange={(e) => setJiraCreds({ ...jiraCreds, email: e.target.value })}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={jiraCreds.token}
                      onChange={(e) => setJiraCreds({ ...jiraCreds, token: e.target.value })}
                      placeholder="API Token"
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-all duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Create an API token at{' '}
                    <a
                      href="https://id.atlassian.com/manage/api-tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      Atlassian Account
                    </a>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain
                    </label>
                    <input
                      type="text"
                      value={jiraCreds.domain}
                      onChange={(e) => setJiraCreds({ ...jiraCreds, domain: e.target.value })}
                      placeholder="yourcompany"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      yourcompany.atlassian.net
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Key
                    </label>
                    <input
                      type="text"
                      value={jiraCreds.projectKey}
                      onChange={(e) => setJiraCreds({ ...jiraCreds, projectKey: e.target.value })}
                      placeholder="PROJ"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </>
            )}

            {platform === 'github' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Personal Access Token
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={githubCreds.token}
                      onChange={(e) => setGithubCreds({ ...githubCreds, token: e.target.value })}
                      placeholder="ghp_..."
                      className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-all duration-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Create a token with repo scope at{' '}
                    <a
                      href="https://github.com/settings/tokens/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      GitHub Settings
                    </a>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Owner
                    </label>
                    <input
                      type="text"
                      value={githubCreds.owner}
                      onChange={(e) => setGithubCreds({ ...githubCreds, owner: e.target.value })}
                      placeholder="username or org"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Repository
                    </label>
                    <input
                      type="text"
                      value={githubCreds.repo}
                      onChange={(e) => setGithubCreds({ ...githubCreds, repo: e.target.value })}
                      placeholder="repo-name"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Export Result */}
          {exportResult && (
            <div className="mt-4 space-y-3">
              <div
                className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                  exportResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {exportResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>
                  {exportResult.summary.successful} of {exportResult.summary.total} tickets
                  exported successfully
                </span>
              </div>

              {/* Show created issue links */}
              {exportResult.results.some((r) => r.success && r.issue) && (
                <div className="space-y-2">
                  {exportResult.results
                    .filter((r) => r.success && r.issue)
                    .slice(0, 5)
                    .map((r, i) => (
                      <a
                        key={i}
                        href={r.issue?.url || r.issue?.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {r.issue?.identifier || r.issue?.key || `#${r.issue?.number}`}
                      </a>
                    ))}
                  {exportResult.results.filter((r) => r.success).length > 5 && (
                    <p className="text-xs text-gray-500">
                      ...and {exportResult.results.filter((r) => r.success).length - 5} more
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-gray-100 transition-all duration-200"
          >
            {exportResult ? 'Close' : 'Cancel'}
          </button>
          {!exportResult && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              className={`px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 flex items-center gap-2`}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Export to {platformConfig.name}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
