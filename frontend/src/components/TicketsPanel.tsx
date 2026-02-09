'use client';

import { useState, useEffect } from 'react';
import { TicketRecord } from '@/types';
import { Ticket, AlertCircle, CheckCircle, X, Pencil, Trash2, Download, Eye, ChevronDown, Check } from 'lucide-react';
import TicketViewModal from './TicketViewModal';

interface TicketsPanelProps {
  tickets: TicketRecord[];
  onEditTicket: (ticket: TicketRecord) => void;
  onDeleteTicket: (objectID: string) => void;
  onExportTickets?: (tickets: TicketRecord[], format: 'csv' | 'json') => void;
  isLoading: boolean;
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const EFFORT_COLORS: Record<string, string> = {
  XS: 'bg-gray-100 text-gray-600',
  S: 'bg-blue-100 text-blue-600',
  M: 'bg-indigo-100 text-indigo-600',
  L: 'bg-purple-100 text-purple-600',
  XL: 'bg-pink-100 text-pink-600',
};

export default function TicketsPanel({ tickets, onEditTicket, onDeleteTicket, onExportTickets, isLoading }: TicketsPanelProps) {
  const [viewingTicket, setViewingTicket] = useState<TicketRecord | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Update viewing ticket when tickets prop changes (e.g., after edit)
  useEffect(() => {
    setViewingTicket(current => {
      if (!current) return null;
      const updatedTicket = tickets.find(t => t.objectID === current.objectID);
      return updatedTicket || current;
    });
  }, [tickets]);

  const handleViewTicket = (ticket: TicketRecord) => {
    setViewingTicket(ticket);
    setShowViewModal(true);
  };

  const toggleSelectTicket = (objectID: string) => {
    const newSelected = new Set(selectedTickets);
    if (newSelected.has(objectID)) {
      newSelected.delete(objectID);
    } else {
      newSelected.add(objectID);
    }
    setSelectedTickets(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.objectID)));
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    const ticketsToExport = selectedTickets.size > 0
      ? tickets.filter(t => selectedTickets.has(t.objectID))
      : tickets;

    if (format === 'json') {
      const jsonContent = JSON.stringify(ticketsToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = [
        'Title', 'Description', 'Type', 'Priority', 'Readiness', 'Readiness Reason',
        'Effort', 'Assignee', 'Stakeholders', 'Labels',
        'Acceptance Criteria', 'Known Edge Cases', 'Open Questions',
        'Setup Requirements', 'Dependencies', 'Suggested Dependencies',
        'Confidence', 'Is Derived', 'Derived Rationale', 'Citations',
      ];
      const q = (val: string) => `"${val.replace(/"/g, '""')}"`;
      const rows = ticketsToExport.map(t => [
        q(t.title || ''),
        q(t.description || ''),
        q(t.type || ''),
        q(t.priority || ''),
        q(t.readiness || ''),
        q(t.readiness_reason || ''),
        q(t.estimated_effort || ''),
        q(t.suggested_assignee || t.assignee || ''),
        q((t.stakeholders || []).join(' | ')),
        q((t.labels || []).join(' | ')),
        q((t.acceptance_criteria || []).join(' | ')),
        q((t.known_edge_cases || []).join(' | ')),
        q((t.open_questions || []).join(' | ')),
        q((t.setup_requirements || []).map(r => `[${r.type}${r.resolved ? ' DONE' : ''}] ${r.description}`).join(' | ')),
        q((t.dependencies || []).join(' | ')),
        q((t.suggested_dependencies || []).join(' | ')),
        q(t.confidence ? `${Math.round(t.confidence * 100)}%` : ''),
        q(t.is_derived ? 'Yes' : 'No'),
        q(t.derived_rationale || ''),
        q((t.citations || []).map(c => typeof c === 'object' ? `${c.document_id}:${c.chunk_id}` : String(c)).join(' | ')),
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setShowExportMenu(false);
  };

  const clearSelection = () => setSelectedTickets(new Set());

  if (tickets.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-3">
        <div className="text-center py-8">
          <Ticket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tickets yet</p>
          <p className="text-xs text-gray-400">Tickets will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
          <div className="w-8 h-8 border-4 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-3 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedTickets.size === tickets.length && tickets.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs font-medium text-gray-500">
              {selectedTickets.size > 0 ? `${selectedTickets.size} selected` : `${tickets.length} tickets`}
            </span>
            {selectedTickets.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear
              </button>
            )}
          </div>
          {tickets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={selectedTickets.size === 0}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  selectedTickets.size === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">CSV</span>
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">JSON</span>
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <div
              key={ticket.objectID}
              className={`bg-white border rounded-lg p-3 transition-shadow cursor-pointer ${
                selectedTickets.has(ticket.objectID)
                  ? 'border-indigo-300 shadow-sm'
                  : 'border-gray-200 hover:shadow-sm'
              }`}
              onClick={() => toggleSelectTicket(ticket.objectID)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={selectedTickets.has(ticket.objectID)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectTicket(ticket.objectID);
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-900 capitalize">
                      {ticket.type?.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewTicket(ticket)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="View full ticket"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onEditTicket(ticket)}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit ticket"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteTicket(ticket.objectID)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-900 font-medium">
                    {ticket.title}
                  </div>
                  {ticket.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {ticket.description}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[ticket.priority] || 'bg-gray-100 text-gray-700'}`}>
                      {ticket.priority}
                    </span>
                    {ticket.estimated_effort && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${EFFORT_COLORS[ticket.estimated_effort] || 'bg-gray-100 text-gray-700'}`}>
                        {ticket.estimated_effort}
                      </span>
                    )}
                    {ticket.confidence && (
                      <span className="text-xs text-gray-400">
                        {Math.round(ticket.confidence * 100)}% conf
                      </span>
                    )}
                    {ticket.labels && ticket.labels.length > 0 && (
                      <div className="flex gap-1">
                        {ticket.labels.slice(0, 2).map((label, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <TicketViewModal
        ticket={viewingTicket}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingTicket(null);
        }}
      />
    </>
  );
}
