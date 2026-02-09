'use client';

import { TicketRecord } from '@/types';
import { X, CheckCircle, AlertCircle, HelpCircle, Clock, Target, Shield, FileText, Users, Link, Lightbulb } from 'lucide-react';

interface TicketViewModalProps {
  ticket: TicketRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const EFFORT_COLORS: Record<string, string> = {
  XS: 'bg-gray-100 text-gray-700',
  S: 'bg-blue-100 text-blue-700',
  M: 'bg-indigo-100 text-indigo-700',
  L: 'bg-purple-100 text-purple-700',
  XL: 'bg-pink-100 text-pink-700',
};

const TYPE_COLORS: Record<string, string> = {
  user_story: 'bg-blue-100 text-blue-700',
  task: 'bg-gray-100 text-gray-700',
  bug: 'bg-red-100 text-red-700',
  spike: 'bg-purple-100 text-purple-700',
  infrastructure: 'bg-amber-100 text-amber-700',
  decision: 'bg-green-100 text-green-700',
};

const READINESS_ICONS: Record<string, typeof CheckCircle> = {
  ready: CheckCircle,
  partially_blocked: AlertCircle,
  blocked: X,
};

const READINESS_COLORS: Record<string, string> = {
  ready: 'text-green-600',
  partially_blocked: 'text-yellow-600',
  blocked: 'text-red-600',
};

export default function TicketViewModal({ ticket, isOpen, onClose }: TicketViewModalProps) {
  if (!isOpen || !ticket) return null;

  const ReadinessIcon = READINESS_ICONS[ticket.readiness || 'ready'] || CheckCircle;
  const priorityColor = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;
  const typeColor = TYPE_COLORS[ticket.type] || TYPE_COLORS.task;
  const effortColor = EFFORT_COLORS[ticket.estimated_effort || 'M'] || EFFORT_COLORS.M;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColor}`}>
              {ticket.type?.replace('_', ' ')}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${priorityColor}`}>
              {ticket.priority}
            </span>
            {ticket.estimated_effort && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${effortColor}`}>
                {ticket.estimated_effort}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{ticket.title}</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <span className={`${READINESS_COLORS[ticket.readiness || 'ready']}`}>
                  <ReadinessIcon className="w-4 h-4" />
                </span>
                <span className="capitalize">{ticket.readiness?.replace('_', ' ')}</span>
              </div>
              {ticket.confidence != null && (
                <span className="text-sm text-gray-500">
                  {Math.round(ticket.confidence * 100)}% confidence
                </span>
              )}
              {(ticket.suggested_assignee) && (
                <span className="text-sm text-gray-500">
                  Assignee: {ticket.suggested_assignee}
                </span>
              )}
            </div>
            {ticket.readiness_reason && (
              <p className="text-xs text-gray-500 mt-1 italic">{ticket.readiness_reason}</p>
            )}
            {ticket.is_derived && (
              <div className="mt-2">
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Derived</span>
                {ticket.derived_rationale && (
                  <p className="text-xs text-gray-500 mt-1 italic">{ticket.derived_rationale}</p>
                )}
              </div>
            )}
          </div>

          {ticket.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</h3>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                {ticket.description}
              </div>
            </div>
          )}

          {ticket.acceptance_criteria && ticket.acceptance_criteria.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acceptance Criteria</h3>
              </div>
              <ul className="space-y-1">
                {ticket.acceptance_criteria.map((criteria, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{criteria}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ticket.known_edge_cases && ticket.known_edge_cases.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Known Edge Cases</h3>
              </div>
              <ul className="space-y-1">
                {ticket.known_edge_cases.map((edge, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{edge}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ticket.open_questions && ticket.open_questions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Open Questions</h3>
              </div>
              <ul className="space-y-1">
                {ticket.open_questions.map((q, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ticket.setup_requirements && ticket.setup_requirements.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Setup Requirements</h3>
              <ul className="space-y-1">
                {ticket.setup_requirements.map((req, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${req.resolved ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <span>{req.description} ({req.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {ticket.labels && ticket.labels.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Labels</h3>
              <div className="flex flex-wrap gap-2">
                {ticket.labels.map((label, i) => (
                  <span key={i} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ticket.dependencies && ticket.dependencies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-red-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blocking Dependencies</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ticket.dependencies.map((dep, i) => (
                  <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded border border-red-200">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ticket.suggested_dependencies && ticket.suggested_dependencies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link className="w-4 h-4 text-gray-400" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suggested Dependencies</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ticket.suggested_dependencies.map((dep, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ticket.stakeholders && ticket.stakeholders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-indigo-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stakeholders</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {ticket.stakeholders.map((s, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ticket.citations && ticket.citations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Citations</h3>
              </div>
              <div className="space-y-1">
                {ticket.citations.map((citation, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0" />
                    {typeof citation === 'object' && citation !== null
                      ? `${(citation as any).document_id}${(citation as any).chunk_id ? `:${(citation as any).chunk_id}` : ''}`
                      : String(citation)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
