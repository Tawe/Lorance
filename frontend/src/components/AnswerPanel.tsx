'use client';

import { StructuredAnswer } from '@/types';
import { Sparkles, AlertCircle, CheckCircle, Lightbulb, ArrowRight, Filter } from 'lucide-react';

interface AnswerPanelProps {
  answer: StructuredAnswer | null;
  isLoading: boolean;
  query: string;
  resultCount: number;
}

export default function AnswerPanel({ answer, isLoading, query, resultCount }: AnswerPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-gray-600">Analyzing results...</span>
        </div>
      </div>
    );
  }

  if (!query) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Structured Intelligence</h3>
          <p className="text-gray-500 text-sm">Search for documents and tickets to get AI-powered insights</p>
        </div>
      </div>
    );
  }

  if (!answer && resultCount === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Available</h3>
          <p className="text-gray-500 text-sm">No results found to analyze</p>
        </div>
      </div>
    );
  }

  if (!answer) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Results</h3>
          <p className="text-gray-500 text-sm">Analyzing {resultCount} results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
        <Sparkles className="w-5 h-5 text-indigo-600" />
        <h3 className="font-semibold text-gray-900">Structured Analysis</h3>
      </div>

      {/* Summary */}
      {answer.summary && answer.summary.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Key Findings
          </h4>
          <ul className="space-y-2">
            {answer.summary.map((point, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                <span className="w-1 h-1 bg-indigo-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Findings */}
      {(answer.keyFindings.blockers || answer.keyFindings.decisions || answer.keyFindings.owners || answer.keyFindings.openQuestions || answer.keyFindings.nextSteps) && (
        <div className="mb-6 space-y-4">
          {/* Blockers */}
          {answer.keyFindings.blockers && answer.keyFindings.blockers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Blockers ({answer.keyFindings.blockers.length})
              </h4>
              <ul className="space-y-1">
                {answer.keyFindings.blockers.map((blocker, index) => (
                  <li key={index} className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                    {blocker}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions */}
          {answer.keyFindings.decisions && answer.keyFindings.decisions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Decisions ({answer.keyFindings.decisions.length})
              </h4>
              <ul className="space-y-1">
                {answer.keyFindings.decisions.map((decision, index) => (
                  <li key={index} className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                    {decision}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Owners */}
          {answer.keyFindings.owners && answer.keyFindings.owners.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Owners ({answer.keyFindings.owners.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {answer.keyFindings.owners.map((owner, index) => (
                  <span key={index} className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    {owner}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Open Questions */}
          {answer.keyFindings.openQuestions && answer.keyFindings.openQuestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Open Questions ({answer.keyFindings.openQuestions.length})
              </h4>
              <ul className="space-y-1">
                {answer.keyFindings.openQuestions.map((question, index) => (
                  <li key={index} className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    {question}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {answer.keyFindings.nextSteps && answer.keyFindings.nextSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-indigo-700 mb-2 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Next Steps ({answer.keyFindings.nextSteps.length})
              </h4>
              <ul className="space-y-1">
                {answer.keyFindings.nextSteps.map((step, index) => (
                  <li key={index} className="text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Referenced Items */}
      {(answer.referencedItems.documents.length > 0 || answer.referencedItems.tickets.length > 0) && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Referenced Items</h4>
          
          {answer.referencedItems.documents.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-500 mb-1">Documents</h5>
              <div className="space-y-1">
                {answer.referencedItems.documents.map((doc, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded flex items-center justify-between">
                    <span>{doc.title || `Document ${doc.id}`}</span>
                    <span className="text-gray-400">{doc.source_type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {answer.referencedItems.tickets.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-1">Tickets</h5>
              <div className="space-y-1">
                {answer.referencedItems.tickets.map((ticket, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded flex items-center justify-between">
                    <span>{ticket.title}</span>
                    <span className="text-gray-400">{ticket.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Citations */}
      {answer.citations && answer.citations.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Sources</h4>
          <div className="space-y-2">
            {answer.citations.map((citation, index) => (
              <div key={index} className="text-xs text-gray-600 border-l-2 border-indigo-200 pl-2 py-1">
                <div className="font-medium text-gray-700">
                  {citation.type === 'document' ? '📄' : '🎫'} {citation.title || `${citation.type} ${citation.id}`}
                </div>
                <div className="text-gray-500 italic mt-1">
                  "{citation.excerpt.length > 100 ? citation.excerpt.substring(0, 100) + '...' : citation.excerpt}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {answer.recommendations && (answer.recommendations.filters || answer.recommendations.followUpQueries) && (
        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h4>
          
          {answer.recommendations.filters && answer.recommendations.filters.length > 0 && (
            <div className="mb-3">
              <h5 className="text-xs font-medium text-gray-500 mb-1">Try these filters:</h5>
              <div className="flex flex-wrap gap-1">
                {answer.recommendations.filters.map((filter, index) => (
                  <span key={index} className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    {filter}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {answer.recommendations.followUpQueries && answer.recommendations.followUpQueries.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-gray-500 mb-1">Follow-up questions:</h5>
              <div className="space-y-1">
                {answer.recommendations.followUpQueries.map((query, index) => (
                  <div key={index} className="text-xs text-gray-600 cursor-pointer hover:text-indigo-600">
                    → {query}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}