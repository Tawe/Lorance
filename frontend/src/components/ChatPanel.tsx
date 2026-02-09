'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, AlertCircle, CheckCircle, Lightbulb, ArrowRight, Ticket as TicketIcon } from 'lucide-react';
import { DocumentIntelService } from '@/services/documentIntelService';
import { StructuredAnswer, SearchResult, Ticket } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: StructuredAnswer;
  ticketCount?: number;
  isLoading?: boolean;
  error?: string;
  timestamp: number;
}

const TICKET_KEYWORDS = ['ticket', 'tickets', 'generate', 'create ticket', 'create tickets', 'stories', 'user stories', 'break down', 'break this down'];

function isTicketRequest(query: string): boolean {
  const lower = query.toLowerCase();
  return TICKET_KEYWORDS.some(kw => lower.includes(kw));
}

function generateTicketTitle(step: string): string {
  const stepLower = step.toLowerCase();

  if (stepLower.startsWith('implement') || stepLower.startsWith('add')) {
    return stepLower.includes('authentication') ? 'Authentication Requirements' :
           stepLower.includes('search') ? 'Search Functionality' :
           stepLower.includes('api') ? 'API Endpoint Development' :
           stepLower.includes('database') ? 'Database Schema Design' :
           stepLower.includes('ui') || stepLower.includes('interface') ? 'UI Component Development' :
           stepLower.includes('test') ? 'Test Coverage Implementation' :
           stepLower.includes('integration') ? 'Integration Development' :
           `Feature: ${step.substring(0, 50)}`;
  }

  if (stepLower.startsWith('fix') || stepLower.startsWith('resolve')) {
    return stepLower.includes('bug') ? 'Bug Fix: Defect Resolution' :
           stepLower.includes('issue') ? 'Issue Resolution' :
           `Fix: ${step.substring(0, 50)}`;
  }

  if (stepLower.startsWith('create') || stepLower.startsWith('build')) {
    return stepLower.includes('document') ? 'Documentation Update' :
           stepLower.includes('report') ? 'Report Generation' :
           `Development: ${step.substring(0, 50)}`;
  }

  if (stepLower.startsWith('update') || stepLower.startsWith('improve')) {
    return stepLower.includes('performance') ? 'Performance Optimization' :
           stepLower.includes('security') ? 'Security Enhancement' :
           `Enhancement: ${step.substring(0, 50)}`;
  }

  if (stepLower.startsWith('design') || stepLower.startsWith('plan')) {
    return stepLower.includes('architecture') ? 'Architecture Design' :
           stepLower.includes('workflow') ? 'Workflow Design' :
           `Planning: ${step.substring(0, 50)}`;
  }

  return step.length > 60 ? step.substring(0, 60) + '...' : step;
}

function detectTicketType(step: string): string {
  const stepLower = step.toLowerCase();
  if (stepLower.match(/fix|bug|defect|issue|error/)) return 'bug';
  if (stepLower.match(/implement|add|create|build|develop/)) return 'feature';
  if (stepLower.match(/test|verify|check|validate/)) return 'qa';
  if (stepLower.match(/design|plan|architecture|spec/)) return 'spike';
  if (stepLower.match(/update|improve|optimize|enhance|refactor/)) return 'improvement';
  if (stepLower.match(/document|docs|write/)) return 'docs';
  return 'task';
}

function detectPriority(step: string): string {
  const stepLower = step.toLowerCase();
  if (stepLower.match(/critical|urgent|asap|security|blocking/)) return 'high';
  if (stepLower.match(/important|must|should|essential/)) return 'medium';
  if (stepLower.match(/nice to have|optional|low priority|eventually/)) return 'low';
  return 'medium';
}

function extractLabels(step: string): string[] {
  const labels: string[] = [];
  const stepLower = step.toLowerCase();

  if (stepLower.match(/auth|login|password|oauth/)) labels.push('security');
  if (stepLower.match(/api|endpoint|rest/)) labels.push('backend');
  if (stepLower.match(/ui|interface|component|design/)) labels.push('frontend');
  if (stepLower.match(/database|sql|query|schema/)) labels.push('database');
  if (stepLower.match(/test|qa|coverage/)) labels.push('testing');
  if (stepLower.match(/performance|speed|optimize/)) labels.push('performance');
  if (stepLower.match(/mobile|ios|android/)) labels.push('mobile');
  if (stepLower.match(/integration|third-party|external/)) labels.push('integration');

  return labels;
}

interface ChatPanelProps {
  onTicketsGenerated: (tickets: any[]) => void;
}

export default function ChatPanel({ onTicketsGenerated }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (query: string) => {
    if (!query.trim() || isProcessing) return;

    setInput('');
    setIsProcessing(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query.trim(),
      timestamp: Date.now(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isLoading: true,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);

    try {
      if (isTicketRequest(query)) {
        // Ticket generation flow - use relevant documents first, then fall back to all
        let searchResults = await DocumentIntelService.search(query, {});
        if (searchResults.document_chunks.length === 0 && searchResults.tickets.length === 0) {
          searchResults = await DocumentIntelService.search('', {});
        }
        
        if (searchResults.document_chunks.length > 0) {
          const response = await DocumentIntelService.getStructuredAnswer(query, searchResults);
          
          // Try to extract nextSteps first, otherwise create tickets from document chunks
          let ticketRecords: any[] = [];
          
          if (response.tickets && response.tickets.length > 0) {
            // Use tickets directly from AI response (canonical schema with validation)
            ticketRecords = response.tickets.map((ticket: any, i: number) => ({
              objectID: ticket.objectID || ticket.id || `ticket_${Date.now()}_${i}`,
              record_type: 'ticket',
              title: ticket.title,
              description: ticket.description || '',
              type: ticket.type || 'task',
              priority: ticket.priority || 'medium',
              assignee: ticket.suggested_assignee || ticket.assignee,
              suggested_assignee: ticket.suggested_assignee,
              labels: ticket.labels || [],
              readiness: ticket.readiness || 'ready',
              dependencies: ticket.dependencies || [],
              confidence: typeof ticket.confidence === 'number' ? ticket.confidence : 0.75,
              citations: (ticket.citations || []).map((c: any) =>
                typeof c === 'object' && c !== null
                  ? { document_id: c.document_id || c.id || `doc_${i}`, chunk_id: c.chunk_id || 'chunk_1' }
                  : { document_id: String(c), chunk_id: 'chunk_1' }
              ),
              workspace_id: '',
              estimated_effort: ticket.estimated_effort,
              acceptance_criteria: ticket.acceptance_criteria || [],
              known_edge_cases: ticket.known_edge_cases || [],
              open_questions: ticket.open_questions || [],
              setup_requirements: ticket.setup_requirements || [],
              // Preserve optional metadata
              stakeholders: ticket.stakeholders,
              suggested_dependencies: ticket.suggested_dependencies,
              is_derived: ticket.is_derived,
              derived_rationale: ticket.derived_rationale,
              readiness_reason: ticket.readiness_reason,
            }));
          } else if (response.keyFindings?.nextSteps && response.keyFindings.nextSteps.length > 0) {
            // Create detailed tickets from nextSteps
            ticketRecords = response.keyFindings.nextSteps.map((step: string, i: number) => {
              const stepLower = step.toLowerCase();
              const title = generateTicketTitle(step);
              const type = detectTicketType(step);
              const priority = detectPriority(step);
              const confidence = 0.6 + (Math.random() * 0.2 - 0.1);

              return {
                objectID: `ticket_${Date.now()}_${i}`,
                record_type: 'ticket',
                title,
                description: step,
                type,
                priority,
                assignee: undefined,
                suggested_assignee: undefined,
                labels: extractLabels(step),
                readiness: 'ready',
                dependencies: [],
                confidence: Math.round(confidence * 100) / 100,
                citations: (response.citations || []).slice(0, 2).map((c: any) =>
                  typeof c === 'object' && c !== null
                    ? { document_id: c.id || c.document_id || `doc_${i}`, chunk_id: c.chunk_id || 'chunk_1' }
                    : { document_id: String(c), chunk_id: 'chunk_1' }
                ),
                workspace_id: '',
                estimated_effort: 'M',
                acceptance_criteria: ['Implement the described functionality', 'Verify behavior meets requirements'],
                known_edge_cases: [],
                open_questions: [],
                setup_requirements: [],
              };
            });
          } else if (response.summary && response.summary.length > 0) {
            // Create tickets from summary points with enhanced details
            ticketRecords = response.summary.map((point: string, i: number) => ({
              objectID: `ticket_${Date.now()}_${i}`,
              record_type: 'ticket',
              title: generateTicketTitle(point),
              description: point,
              type: detectTicketType(point),
              priority: detectPriority(point),
              assignee: undefined,
              suggested_assignee: undefined,
              labels: extractLabels(point),
              readiness: 'ready',
              dependencies: [],
              confidence: 0.65,
              citations: (response.citations || []).slice(0, 2).map((c: any) =>
                typeof c === 'object' && c !== null
                  ? { document_id: c.id || c.document_id || `doc_${i}`, chunk_id: c.chunk_id || 'chunk_1' }
                  : { document_id: String(c), chunk_id: 'chunk_1' }
              ),
              workspace_id: '',
              estimated_effort: 'M',
              acceptance_criteria: ['Complete the described work', 'Verify outcomes'],
              known_edge_cases: [],
              open_questions: [],
              setup_requirements: [],
            }));
          } else {
            // Fallback: create tickets from document chunks with full canonical schema
            ticketRecords = searchResults.document_chunks.slice(0, 5).map((doc: any, i: number) => ({
              objectID: `ticket_${Date.now()}_${i}`,
              record_type: 'ticket',
              title: doc.title || `Task from document: ${doc.content?.substring(0, 40)}...`,
              description: doc.content?.substring(0, 300) || '',
              type: detectTicketType(doc.content || ''),
              priority: doc.action_signal_score && doc.action_signal_score > 0.7 ? 'high' : 'medium',
              assignee: undefined,
              suggested_assignee: undefined,
              labels: extractLabels(doc.content || ''),
              readiness: 'ready',
              dependencies: [],
              confidence: doc.action_signal_score || 0.6,
              citations: [{ document_id: doc.objectID, chunk_id: doc.chunk_id || 'chunk_1' }],
              workspace_id: '',
              estimated_effort: 'M',
              acceptance_criteria: ['Process the document content', 'Verify extracted information is complete'],
              known_edge_cases: [],
              open_questions: [],
              setup_requirements: [],
            }));
          }

          if (ticketRecords.length > 0) {
            onTicketsGenerated(ticketRecords);
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: `Generated ${ticketRecords.length} ticket${ticketRecords.length === 1 ? '' : 's'} from your documents. You can see them in the panel on the right.`,
                    ticketCount: ticketRecords.length,
                    isLoading: false,
                  }
                : msg
            ));
          } else {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: 'No tickets could be generated. Try adding more document content.',
                    isLoading: false,
                  }
                : msg
            ));
          }
          } else {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: 'No documents found. Upload some documents first to generate tickets.',
                    isLoading: false,
                  }
                : msg
            ));
          }
        } else {
          // Question/answer flow - search relevant documents first, then fall back to all
          let searchResults = await DocumentIntelService.search(query, {});
          if (searchResults.document_chunks.length === 0 && searchResults.tickets.length === 0) {
            searchResults = await DocumentIntelService.search('', {});
          }
          
          if (searchResults.document_chunks.length > 0 || searchResults.tickets.length > 0) {
            const answer = await DocumentIntelService.getStructuredAnswer(query, searchResults);

            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: answer.summary?.join(' ') || 'Analysis complete.',
                    answer,
                    isLoading: false,
                  }
                : msg
            ));
          } else {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: 'No documents found. Upload some documents to get started.',
                    isLoading: false,
                  }
                : msg
            ));
          }
        }
    } catch (error) {
      setMessages(prev => prev.map(msg =>
        msg.id === assistantId
          ? {
              ...msg,
              content: 'Something went wrong. Please try again.',
              error: String(error),
              isLoading: false,
            }
          : msg
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-gray-900 mb-2">Hey, I&apos;m Lorance</h2>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Ask me questions about your project documents, or ask me to generate tickets. Upload documents in the panel on the right to get started.
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <UserMessage content={msg.content} />
              ) : (
                <AssistantMessage message={msg} onFollowUp={handleSendMessage} />
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about your documents or generate tickets..."
            disabled={isProcessing}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-sm text-gray-900 bg-white placeholder:text-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="bg-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%] text-sm">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({ message, onFollowUp }: { message: ChatMessage; onFollowUp: (q: string) => void }) {
  if (message.isLoading) {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Working on it...
          </div>
        </div>
      </div>
    );
  }

  if (message.ticketCount) {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%]">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <TicketIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  if (message.error || !message.answer) {
    return (
      <div className="flex justify-start">
        <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm text-gray-700">
          {message.content}
        </div>
      </div>
    );
  }

  const answer = message.answer;
  const answerText =
    typeof (answer as any).answer_to_query === 'string' && (answer as any).answer_to_query.trim().length > 0
      ? (answer as any).answer_to_query
      : answer.summary?.join(' ') || 'Analysis complete.';

  return (
    <div className="flex justify-start">
      <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md max-w-[85%] overflow-hidden">
        <div className="p-4 space-y-4">
          {/* Summary */}
          {answerText && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                Answer
              </h4>
              <div className="text-sm text-gray-700">{answerText}</div>
            </div>
          )}

          {/* Follow-up queries */}
          {answer.recommendations?.followUpQueries && answer.recommendations.followUpQueries.length > 0 && (
            <div className="border-t border-gray-100 pt-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Follow up</h4>
              <div className="flex flex-wrap gap-1.5">
                {answer.recommendations.followUpQueries.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onFollowUp(q)}
                    className="text-xs text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full hover:bg-indigo-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
