'use client';

import { useState, useEffect } from 'react';
import { Sparkles, User } from 'lucide-react';
import { WorkspaceService } from '@/services/workspaceService';
import { DocumentIntelService } from '@/services/documentIntelService';
import { DocumentChunk, SearchResult, StructuredAnswer, Ticket, TicketRecord } from '@/types';
import DocumentPanel from './DocumentPanel';
import SearchResultsPanel from './SearchResultsPanel';
import AnswerPanel from './AnswerPanel';

import ChatPanel from './ChatPanel';
import TicketsPanel from './TicketsPanel';
import TicketEditModal from './TicketEditModal';
import { authService, AuthState } from '@/services/authService';
import AuthModal from './AuthModal';

export default function DocumentIntel() {
  const [searchResults, setSearchResults] = useState<SearchResult>({
    document_chunks: [],
    tickets: [],
  });
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [structuredAnswer, setStructuredAnswer] = useState<StructuredAnswer | null>(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [isRefreshingDocuments, setIsRefreshingDocuments] = useState(false);
  const [isGeneratingTickets, setIsGeneratingTickets] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [isDeletingTicket, setIsDeletingTicket] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [authState, setAuthState] = useState<AuthState>(authService.getState());
  const [workspaceId, setWorkspaceId] = useState('');


  // Initialize workspace
  useEffect(() => {
    let id = WorkspaceService.getWorkspaceId();
    
    // If user is already signed in with auth, use auth workspace_id
    if (authState.user?.workspace_id) {
      id = authState.user.workspace_id;
      localStorage.setItem('lorance_workspace_id', id);
    }
    
    setWorkspaceId(id);
  }, []);

  // Load documents on mount
  useEffect(() => {
    handleRefreshDocuments();
  }, []);

  // Also refresh when auth state changes
  useEffect(() => {
    handleRefreshDocuments();
  }, [authState.user]);

  // Auth subscription
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Sync workspace when auth state changes
  useEffect(() => {
    if (authState.user?.workspace_id) {
      // Use auth workspace_id when signed in
      localStorage.setItem('lorance_workspace_id', authState.user.workspace_id);
      setWorkspaceId(authState.user.workspace_id);
      // Refresh documents when signing in
      handleRefreshDocuments();
    }
  }, [authState.user]);


  const resultCount = searchResults.document_chunks.length + searchResults.tickets.length;

  const handleTicketsGenerated = async (tickets: any[]) => {
    setIsGeneratingTickets(true); // Set loading state to true
    try {
      const ticketRecords: TicketRecord[] = tickets.map((ticket: any, i: number) => ({
        objectID: ticket.objectID || ticket.id || `ticket_${Date.now()}_${i}`,
        record_type: 'ticket' as const,
        title: ticket.title,
        description: ticket.description || '',
        type: (ticket.type || 'task') as 'decision' | 'task' | 'user_story' | 'bug' | 'spike' | 'infrastructure',
        priority: (ticket.priority || 'medium') as 'critical' | 'high' | 'medium' | 'low',
        assignee: ticket.suggested_assignee || ticket.assignee,
        suggested_assignee: ticket.suggested_assignee,
        labels: ticket.labels || [],
        readiness: (ticket.readiness || 'ready') as 'ready' | 'partially_blocked' | 'blocked',
        dependencies: ticket.dependencies || [],
        confidence: typeof ticket.confidence === 'number' ? ticket.confidence : 0.7,
        citations: (ticket.citations || []).map((c: any) =>
          typeof c === 'object' && c !== null
            ? { document_id: c.document_id || c.id || `doc_${i}`, chunk_id: c.chunk_id || 'chunk_1' }
            : { document_id: String(c), chunk_id: 'chunk_1' }
        ),
        workspace_id: workspaceId,
        stakeholders: ticket.stakeholders,
        // Canonical fields
        estimated_effort: ticket.estimated_effort || 'M',
        acceptance_criteria: ticket.acceptance_criteria || [],
        known_edge_cases: ticket.known_edge_cases || [],
        open_questions: ticket.open_questions || [],
        setup_requirements: ticket.setup_requirements || [],
        // Optional metadata
        suggested_dependencies: ticket.suggested_dependencies,
        is_derived: ticket.is_derived,
        derived_rationale: ticket.derived_rationale,
        readiness_reason: ticket.readiness_reason,
      }));

      // Update local state
      setSearchResults(prev => ({
        ...prev,
        tickets: [...prev.tickets, ...ticketRecords],
      }));

      // Save to Algolia
      try {
        await DocumentIntelService.indexTickets(ticketRecords);
      } catch (err) {
        console.error('[DocumentIntel] Failed to save tickets to Algolia:', err);
      }
    } finally {
      setIsGeneratingTickets(false); // Set loading state to false
    }
  };

  const handleRefreshDocuments = async () => {
    setIsRefreshingDocuments(true); // Set loading state to true
    try {
      const results = await DocumentIntelService.search('');
      setSearchResults(results);
      setRefreshCounter(c => c + 1);
    } catch (err) {
      console.error('[DocumentIntel] Failed to refresh documents:', err);
    } finally {
      setIsRefreshingDocuments(false); // Set loading state to false
    }
  };




  const handleEditTicket = (ticket: TicketRecord) => {
    setEditingTicket(ticket);
    setShowEditModal(true);
  };

  const handleSaveTicket = async (updatedTicket: TicketRecord) => {
    // Close modal first for better UX
    setShowEditModal(false);
    setEditingTicket(null);
    
    // Update local state immediately (optimistic update)
    setSearchResults(prev => ({
      ...prev,
      tickets: prev.tickets.map(t =>
        t.objectID === updatedTicket.objectID ? updatedTicket : t
      ),
    }));
    
    setIsSavingTicket(true); // Set loading state to true
    try {
      // Save to Algolia
      await DocumentIntelService.indexTickets([updatedTicket]);
      // Refresh to ensure we have the latest data
      await handleRefreshDocuments();
    } catch (err) {
      console.error('[DocumentIntel] Failed to update ticket in Algolia:', err);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSavingTicket(false); // Set loading state to false
    }
  };

  const handleDeleteTicket = async (objectID: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;

    setIsDeletingTicket(true); // Set loading state to true
    try {
      await DocumentIntelService.deleteTicket(objectID);
      setSearchResults(prev => ({
        ...prev,
        tickets: prev.tickets.filter(t => t.objectID !== objectID),
      }));
    } catch (err) {
      console.error(`[DocumentIntel] Failed to delete ticket ${objectID}:`, err);
      alert('Failed to delete ticket. Please try again.');
    } finally {
      setIsDeletingTicket(false); // Set loading state to false
    }
  };

  const handleDocumentDeleted = (objectID: string) => {
    setSearchResults(prev => ({
      ...prev,
      document_chunks: prev.document_chunks.filter(d => d.objectID !== objectID),
    }));
  };

  const handleDocumentUpdated = (updatedDoc: DocumentChunk) => {
    setSearchResults(prev => ({
      ...prev,
      document_chunks: prev.document_chunks.map(d =>
        d.objectID === updatedDoc.objectID ? updatedDoc : d
      ),
    }));
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Lorance</h1>
          </div>
          <div className="text-xs text-gray-500 mt-1">
          </div>
          

        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {authState.user ? (
              <>
                <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600">
                    {authState.user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline">{authState.user.email}</span>
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
          {/* Document Panel - Scrolls */}
            <h3 className="text-sm font-semibold text-gray-700 ml-2 mt-4">Documents</h3>
          <div className="flex-1 overflow-hidden flex flex-col">
            <DocumentPanel 
              key={`docs-${refreshCounter}`}
              className="h-full"
              onSearch={() => {}}
              onRefresh={handleRefreshDocuments}
              results={searchResults}
              isLoading={isRefreshingDocuments}
              onDocumentDeleted={handleDocumentDeleted}
              onDocumentUpdated={handleDocumentUpdated} // Pass the new handler
            />
          </div>


        </div>

        {/* Center Panel - Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ChatPanel onTicketsGenerated={handleTicketsGenerated} />
        </div>

        {/* Right Sidebar - Tickets */}
        <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Tickets</h3>
          </div>
          <TicketsPanel
            tickets={searchResults.tickets}
            onEditTicket={handleEditTicket}
            onDeleteTicket={handleDeleteTicket}
            isLoading={isGeneratingTickets || isSavingTicket || isDeletingTicket}
          />
        </div>
      </div>

      {/* Edit Ticket Modal */}
      <TicketEditModal
        ticket={editingTicket}
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingTicket(null);
        }}
        onSave={handleSaveTicket}
      />

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
