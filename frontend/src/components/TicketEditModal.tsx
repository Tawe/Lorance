'use client';

import { useState, useEffect } from 'react';
import { TicketRecord } from '@/types';
import { X } from 'lucide-react';

interface TicketEditModalProps {
  ticket: TicketRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: TicketRecord) => void | Promise<void>;
}

const TYPE_OPTIONS = ['task', 'user_story', 'bug', 'spike', 'infrastructure', 'decision'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const READINESS_OPTIONS = ['ready', 'partially_blocked', 'blocked'];
const EFFORT_OPTIONS = ['XS', 'S', 'M', 'L', 'XL'];

export default function TicketEditModal({ ticket, isOpen, onClose, onSave }: TicketEditModalProps) {
  const [formData, setFormData] = useState<Partial<TicketRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (ticket) {
      setFormData({
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        priority: ticket.priority,
        readiness: ticket.readiness,
        suggested_assignee: ticket.suggested_assignee || ticket.assignee,
        labels: ticket.labels,
        estimated_effort: ticket.estimated_effort,
        acceptance_criteria: ticket.acceptance_criteria,
        known_edge_cases: ticket.known_edge_cases,
        open_questions: ticket.open_questions,
        dependencies: ticket.dependencies,
        suggested_dependencies: ticket.suggested_dependencies,
        stakeholders: ticket.stakeholders,
        setup_requirements: ticket.setup_requirements,
      });
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTicket = {
      ...ticket,
      ...formData,
    } as TicketRecord;
    try {
      setIsSaving(true);
      await onSave(updatedTicket);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleArrayInput = (field: keyof TicketRecord, value: string) => {
    setFormData({
      ...formData,
      [field]: value.split('\n').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Edit Ticket</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type || 'task'}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900"
              >
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority || 'medium'}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.readiness || 'ready'}
                onChange={(e) => setFormData({ ...formData, readiness: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900"
              >
                {READINESS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Effort</label>
              <select
                value={formData.estimated_effort || 'M'}
                onChange={(e) => setFormData({ ...formData, estimated_effort: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900"
              >
                {EFFORT_OPTIONS.map((effort) => (
                  <option key={effort} value={effort}>
                    {effort}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Assignee</label>
            <input
              type="text"
              value={formData.suggested_assignee || ''}
              onChange={(e) => setFormData({ ...formData, suggested_assignee: e.target.value })}
              placeholder="Backend Engineer, Product Manager, etc."
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Labels (comma separated)</label>
            <input
              type="text"
              value={formData.labels?.join(', ') || ''}
              onChange={(e) => setFormData({ ...formData, labels: e.target.value.split(',').map(l => l.trim()).filter(Boolean) })}
              placeholder="backend, api, database, auth"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Acceptance Criteria (one per line)</label>
            <textarea
              value={formData.acceptance_criteria?.join('\n') || ''}
              onChange={(e) => handleArrayInput('acceptance_criteria', e.target.value)}
              rows={3}
              placeholder="User can login successfully&#10;Error messages are clear"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Known Edge Cases (one per line)</label>
            <textarea
              value={formData.known_edge_cases?.join('\n') || ''}
              onChange={(e) => handleArrayInput('known_edge_cases', e.target.value)}
              rows={2}
              placeholder="Race conditions in concurrent requests&#10;Network timeout handling"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Open Questions (one per line)</label>
            <textarea
              value={formData.open_questions?.join('\n') || ''}
              onChange={(e) => handleArrayInput('open_questions', e.target.value)}
              rows={2}
              placeholder="Which authentication provider to use?&#10;Do we need offline support?"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Blocking Dependencies (comma separated)</label>
            <input
              type="text"
              value={formData.dependencies?.join(', ') || ''}
              onChange={(e) => setFormData({ ...formData, dependencies: e.target.value.split(',').map(d => d.trim()).filter(Boolean) })}
              placeholder="Build API endpoint, Design database schema"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suggested Dependencies (comma separated)</label>
            <input
              type="text"
              value={formData.suggested_dependencies?.join(', ') || ''}
              onChange={(e) => setFormData({ ...formData, suggested_dependencies: e.target.value.split(',').map(d => d.trim()).filter(Boolean) })}
              placeholder="Related tickets that may benefit from being done first"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stakeholders (comma separated)</label>
            <input
              type="text"
              value={formData.stakeholders?.join(', ') || ''}
              onChange={(e) => setFormData({ ...formData, stakeholders: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="Product, Security, DevOps, QA"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Setup Requirements (one per line, format: description | type | resolved)</label>
            <textarea
              value={formData.setup_requirements?.map(r => `${r.description} | ${r.type} | ${r.resolved ? 'yes' : 'no'}`).join('\n') || ''}
              onChange={(e) => {
                const reqs = e.target.value.split('\n').map(line => {
                  const parts = line.split('|').map(p => p.trim());
                  return {
                    description: parts[0] || '',
                    type: parts[1] || 'other',
                    resolved: parts[2]?.toLowerCase() === 'yes',
                  };
                }).filter(r => r.description);
                setFormData({ ...formData, setup_requirements: reqs });
              }}
              rows={3}
              placeholder="Redis cache available | external_system | no&#10;Auth service running | prior_ticket | yes"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-gray-900 placeholder-gray-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
