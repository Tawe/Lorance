'use client';

import { useState } from 'react';
import { DocumentChunk, TicketRecord, SearchResult } from '@/types';
import { FileText, Ticket, Clock, User, AlertTriangle, CheckCircle, X } from 'lucide-react';

interface SearchResultsPanelProps {
  results: SearchResult;
  isLoading: boolean;
  query: string;
}

export default function SearchResultsPanel({ results, isLoading, query }: SearchResultsPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case 'slack': return '💬';
      case 'email': return '📧';
      case 'prd': return '📋';
      case 'meeting': return '👥';
      default: return '📄';
    }
  };

  const getReadinessIcon = (readiness: string) => {
    switch (readiness) {
      case 'ready': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'partially_blocked': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'blocked': return <X className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-600">Searching...</span>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Search your documents and tickets</h3>
        <p className="text-gray-500">Ask questions like "What's blocked right now?" or "What did we decide about refunds?"</p>
      </div>
    );
  }

  const totalResults = results.document_chunks.length + results.tickets.length;

  if (totalResults === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-6 h-6 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
        <p className="text-gray-500">Try adjusting your search terms</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Documents Section */}
      {results.document_chunks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Documents</h3>
              <span className="text-sm text-gray-500">({results.document_chunks.length})</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {results.document_chunks.map((doc) => (
              <div key={doc.objectID} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">
                    {getSourceIcon(doc.source_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {doc.source_type}
                      </span>
                      {doc.title && (
                        <span className="text-sm text-gray-500">• {doc.title}</span>
                      )}
                      <span className="text-xs text-gray-400">
                        • {new Date(doc.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className={`text-sm text-gray-600 ${expandedItems.has(doc.objectID) ? '' : 'line-clamp-2'}`}>
                      {doc.content}
                    </div>
                    
                    {doc.content.length > 200 && (
                      <button
                        onClick={() => toggleExpanded(doc.objectID)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                      >
                        {expandedItems.has(doc.objectID) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tickets Section */}
      {results.tickets.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">Tickets</h3>
              <span className="text-sm text-gray-500">({results.tickets.length})</span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {results.tickets.map((ticket) => (
                <div key={ticket.objectID} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getReadinessIcon(ticket.readiness || 'ready')}
                    </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {ticket.title}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                      <span className="text-xs text-gray-500 capitalize">
                        {ticket.type.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className={`text-sm text-gray-600 mb-2 ${expandedItems.has(ticket.objectID) ? '' : 'line-clamp-2'}`}>
                      {ticket.description}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {ticket.assignee && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{ticket.assignee}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{Math.round(ticket.confidence * 100)}% confidence</span>
                      </div>
                      {ticket.dependencies.length > 0 && (
                        <span>{ticket.dependencies.length} dependencies</span>
                      )}
                    </div>
                    
                    {(ticket.description.length > 200 || ticket.acceptance_criteria || ticket.open_questions) && (
                      <button
                        onClick={() => toggleExpanded(ticket.objectID)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 mt-2"
                      >
                        {expandedItems.has(ticket.objectID) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                    
                    {/* Expanded details */}
                    {expandedItems.has(ticket.objectID) && (
                      <div className="mt-3 space-y-2 text-xs">
                        {ticket.acceptance_criteria && ticket.acceptance_criteria.length > 0 && (
                          <div>
                            <strong>Acceptance Criteria:</strong>
                            <ul className="mt-1 space-y-1">
                              {ticket.acceptance_criteria.map((criteria, i) => (
                                <li key={i} className="text-gray-600">• {criteria}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {ticket.open_questions && ticket.open_questions.length > 0 && (
                          <div>
                            <strong>Open Questions:</strong>
                            <ul className="mt-1 space-y-1">
                              {ticket.open_questions.map((question, i) => (
                                <li key={i} className="text-gray-600">• {question}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {ticket.citations && ticket.citations.length > 0 && (
                          <div>
                            <strong>Citations:</strong>
                            <ul className="mt-1 space-y-1">
                              {ticket.citations.map((citation, i) => (
                                <li key={i} className="text-gray-600">
                                  {typeof citation === 'string' 
                                    ? `• ${citation}`
                                    : `• Document: ${citation.document_id}, Chunk: ${citation.chunk_id}`
                                  }
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
