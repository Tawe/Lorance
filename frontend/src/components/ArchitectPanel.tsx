'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Upload,
  FileText,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  Trash2,
  Filter,
  X,
  TrendingUp,
  Download,
  Edit3,
  Save,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  LogIn,
  Search,
} from 'lucide-react';
import TicketCard from './TicketCard';
import ExportModal from './ExportModal';
import AuthModal from './AuthModal';
import { Ticket, DocType } from '@/types';
import { api } from '@/services/api';
import { authService } from '@/services/authService';
import { DocumentIntelService } from '@/services/documentIntelService';
import { WorkspaceService } from '@/services/workspaceService';

// =============================================================================
// Mock Data
// =============================================================================
const MOCK_DOCUMENTS = [
  {
    title: 'Atlas Rewards v2 – PRD (Draft)',
    content: `### Atlas Rewards v2 – PRD (Draft)
**Author:** Sarah Lin (Product Manager)
**Last Updated:** April 12
**Status:** Draft – Pending Eng Review

## Background
Atlas Rewards v1 was designed for low volume and batch processing. As order volume increased, the delay between purchase and points accrual has become a frequent source of customer frustration and support tickets.

## Problem
Our current loyalty system:
- Updates points once per day via batch jobs
- Does not expose any real-time status to customers
- Cannot support promotions without engineering involvement
- Frequently causes support tickets related to delayed or missing points
- Makes it hard for Support to explain discrepancies

## Goals
- Real-time points accrual visible to customers within seconds
- Configurable promotions that Marketing can manage independently
- Clear, auditable history of all point changes

## Non-Goals
- Full gamification (badges, leaderboards)
- Mobile app changes in Phase 1
- Retroactive recalculation of historical orders (unless required)

## Success Metrics
- <1% of support tickets related to rewards
- Points reflected within 5 seconds of purchase completion
- Marketing can launch or disable promotions without engineering support
- Support can trace point changes without escalating to Engineering

## User Personas
- **Customer:** Wants instant confirmation that points were earned
- **Marketing Manager:** Wants to create, test, and disable promotions quickly
- **Support Agent:** Needs to explain why a customer has a certain points balance

## Core Features (Initial Scope)
1. Real-time points calculation on order completion
2. Promotion rules engine (configurable)
3. Admin dashboard for Marketing
4. Customer-facing points history view

## Out of Scope (for MVP)
- Advanced segmentation (VIP tiers)
- Cross-brand rewards pooling
- Multi-currency point valuation

## Open Questions
- Do refunds immediately deduct points or wait for settlement?
- What happens if a promotion rule changes while orders are in flight?
- Do guest checkouts earn points, and if so how are they tracked?
- Are there legal or accounting constraints we haven’t captured yet?

_(Some of these were discussed verbally but not finalized.)_`,
  },

  {
    title: 'Atlas Rewards v2 – Technical Design (Early Draft)',
    content: `### Atlas Rewards v2 – Technical Design
**Author:** Miguel Torres (Staff Engineer)
**Last Updated:** April 18
**Status:** Working Draft

## Overview
Atlas Rewards v2 is proposed as an event-driven service that consumes purchase-related events and calculates reward points in near real-time.

## Proposed Architecture
- **Rewards Service:** Node.js
- **Event Source:** Kafka topic \`orders.completed\`
- **Primary Storage:** PostgreSQL
- **Caching:** Redis for promotion configuration

## Event Flow (Proposed)
1. Order completes in Order Service
2. \`orders.completed\` event published
3. Rewards Service consumes event
4. Base points + promotional points calculated
5. Ledger entry written
6. Customer profile updated with new balance

## Promotion Rules Engine
Initial proposal:
- Rules defined as JSON
- Evaluated synchronously during event processing
- Cached in Redis to reduce config fetch latency

⚠️ **Concern:** Complex promotion rules could increase processing time and impact order completion SLAs.

## Known Edge Cases
- Refund events arriving before reward calculation completes
- Duplicate order completion events
- Partial refunds vs full refunds
- Promotions that overlap or stack unintentionally

## Open Technical Questions
- Idempotency strategy not yet defined
- How to version promotion rules safely
- Whether retroactive promotions should be supported
- How to preview promotions without impacting production traffic

_(Some of these decisions were deferred pending product input.)_`,
  },

  {
    title: 'Slack Thread – Marketing ↔ Product ↔ Engineering',
    content: `**Channel:** #atlas-rewards
**Date:** April 21

**10:14 AM – Jenna (Marketing):**
> We really need to spin up promos same-day. Ideally no tickets to eng at all.

**10:16 AM – Jenna:**
> Even better if we can preview how many points a customer would get before launch.

**10:17 AM – Sarah (PM):**
> Preview sounds great, but probably Phase 2. Let’s focus on editable rules first.

**10:19 AM – Miguel (Eng):**
> Preview would mean running the rules engine outside the event flow. That’s doable but not trivial.

**10:21 AM – Jenna:**
> Ok but at minimum we need to toggle promos on/off without deploys.

**10:23 AM – Miguel:**
> That part is fine.

**10:45 AM – Tom (Support):**
> Jumping in—refunds are a nightmare today. When points get deducted days later, customers are furious.

**10:46 AM – Tom:**
> We also can’t easily explain *why* points changed.

**10:47 AM – Sarah:**
> Good call. I’ll update the PRD with refund handling expectations.

_(No follow-up added yet)_`,
  },

  {
    title: 'Meeting Notes – Weekly Product Sync',
    content: `**Meeting:** Atlas Rewards Weekly
**Date:** April 23
**Attendees:** Product, Engineering, Marketing, Support

## Discussion Highlights
- Real-time points confirmed as MVP requirement
- Marketing is ok deferring preview as long as promo rules are editable
- Support strongly prefers immediate point deduction on refunds
- Engineering flagged risk of synchronous rule evaluation under load

## Tentative Decisions
- Refunds should deduct points immediately (pending confirmation)
- Duplicate events must not award points twice

## Action Items
- Sarah to clarify refund behavior in PRD
- Miguel to propose idempotency strategy
- Jenna to list required promotion rule types

## Open Issues
- No agreement yet on promotion rule versioning
- No SLA defined for rewards processing latency
- No owner assigned to admin dashboard UX

_(Action items were noted but no deadlines assigned.)_`,
  },

  {
    title: 'Email Thread – Leadership Pressure',
    content: `**From:** VP Product
**To:** Sarah, Miguel
**Subject:** Atlas Rewards Timeline

> Sales is pushing hard on rewards as a differentiator.
> We need something demoable for the Q2 board meeting.
> Doesn’t have to be perfect, but it has to look real and reliable.

**Reply – Sarah:**
> Understood. We’ll prioritize admin config and customer-visible updates.

**Reply – Miguel:**
> Heads up—rushing the rules engine may create tech debt.
> We should be careful about scope and failure modes.`,
  },

  {
    title: 'Slack DM – Legal Requirement (Not in PRD)',
    content: `**From:** Sarah → Miguel

> Quick note from Legal: reward points are considered a liability.
> We need an immutable ledger of point transactions for audit purposes.
> We can’t just update balances in place.

_(This has not been documented elsewhere yet.)_`,
  },
];

// =============================================================================
// Types
// =============================================================================

interface IndexedDoc {
  id: string;
  content: string;
  title: string;
  timestamp: string;
  preview: string;
}

interface FormState {
  isGeneratingTickets: boolean;
  isIndexingDocument: boolean;
  generateError: string | null;
  indexError: string | null;
  indexSuccess: boolean;
}

// =============================================================================
// Component
// =============================================================================

export default function ArchitectPanel() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [documentContent, setDocumentContent] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [showDocumentInput, setShowDocumentInput] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [indexedDocs, setIndexedDocs] = useState<IndexedDoc[]>([]);
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [sourcesCount, setSourcesCount] = useState(0);
  const [selectedType, setSelectedType] = useState<Ticket['type'] | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocContent, setEditDocContent] = useState('');
  const [editDocTitle, setEditDocTitle] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authState, setAuthState] = useState(authService.getState());

  const [formState, setFormState] = useState<FormState>({
    isGeneratingTickets: false,
    isIndexingDocument: false,
    generateError: null,
    indexError: null,
    indexSuccess: false,
  });

  // Initialize auth state listener
  useEffect(() => {
    const unsubscribe = authService.subscribe(setAuthState);
    return unsubscribe;
  }, []);

  // Get unique ticket types for filtering
  const ticketTypes = useMemo(() => {
    const types = new Map<Ticket['type'], number>();
    tickets.forEach((t) => {
      types.set(t.type, (types.get(t.type) || 0) + 1);
    });
    return types;
  }, [tickets]);

  // Filter tickets by type
  const filteredTickets = useMemo(() => {
    if (!selectedType) return tickets;
    return tickets.filter((t) => t.type === selectedType);
  }, [tickets, selectedType]);

  // Get selected ticket objects
  const selectedTicketObjects = useMemo(() => {
    return tickets.filter((t) => selectedTickets.has(t.id));
  }, [tickets, selectedTickets]);

  const handleGenerateTickets = async () => {
    setHasSearched(true);
    setSelectedTickets(new Set());
    setSelectedType(null);
    setFormState((prev) => ({
      ...prev,
      isGeneratingTickets: true,
      generateError: null,
    }));

    try {
      const data = await api.generateTickets('Generate all tickets from the project documents');
      const generatedTickets = data.tickets || [];
      setTickets(generatedTickets);
      setSourcesCount(data.sources?.length || 0);

      // Bridge: also index tickets to Document Intelligence system for search
      if (generatedTickets.length > 0) {
        try {
          const intelTickets = generatedTickets.map((ticket: Ticket) => ({
            objectID: ticket.id,
            record_type: 'ticket' as const,
            title: ticket.title,
            description: ticket.description,
            type: ticket.type,
            priority: ticket.priority,
            estimated_effort: ticket.estimated_effort,
            assignee: ticket.suggested_assignee,
            suggested_assignee: ticket.suggested_assignee,
            labels: ticket.labels,
            readiness: ticket.readiness,
            readiness_reason: ticket.readiness_reason,
            dependencies: ticket.dependencies,
            suggested_dependencies: ticket.suggested_dependencies,
            confidence: ticket.confidence,
            citations: ticket.citations || [],
            citation_keys: ticket.citation_keys || [],
            source_mode: ticket.source_mode,
            acceptance_criteria: ticket.acceptance_criteria,
            known_edge_cases: ticket.known_edge_cases,
            open_questions: ticket.open_questions,
            setup_requirements: ticket.setup_requirements,
            stakeholders: ticket.stakeholders,
            is_derived: ticket.is_derived,
            derived_rationale: ticket.derived_rationale,
            workspace_id: WorkspaceService.getWorkspaceId(),
          }));
          await DocumentIntelService.indexTickets(intelTickets);
        } catch (bridgeErr) {
          console.warn('Failed to bridge tickets to intel system:', bridgeErr);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate tickets';
      setFormState((prev) => ({ ...prev, generateError: message }));
      setTickets([]);
    } finally {
      setFormState((prev) => ({ ...prev, isGeneratingTickets: false }));
    }
  };

  const handleIndexDocument = async () => {
    if (!documentContent.trim()) return;

    setFormState((prev) => ({
      ...prev,
      isIndexingDocument: true,
      indexError: null,
      indexSuccess: false,
    }));

    try {
      const timestamp = new Date().toISOString();
      await api.indexDocument({
        content: documentContent,
        doc_type: 'requirements',
        title: documentTitle || undefined,
        timestamp,
      });

      const newDoc: IndexedDoc = {
        id: `doc-${Date.now()}`,
        content: documentContent,
        title: documentTitle || `Document - ${new Date().toLocaleDateString()}`,
        timestamp,
        preview: documentContent.slice(0, 150) + (documentContent.length > 150 ? '...' : ''),
      };
      setIndexedDocs((prev) => [newDoc, ...prev]);

      setDocumentContent('');
      setDocumentTitle('');
      setFormState((prev) => ({ ...prev, indexSuccess: true }));

      setTimeout(() => {
        setFormState((prev) => ({ ...prev, indexSuccess: false }));
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to index document';
      setFormState((prev) => ({ ...prev, indexError: message }));
    } finally {
      setFormState((prev) => ({ ...prev, isIndexingDocument: false }));
    }
  };

  const handleRemoveDoc = (id: string) => {
    setIndexedDocs((prev) => prev.filter((doc) => doc.id !== id));
    if (expandedDocId === id) setExpandedDocId(null);
    if (editingDocId === id) setEditingDocId(null);
  };

  const handleEditDoc = (doc: IndexedDoc) => {
    setEditingDocId(doc.id);
    setEditDocContent(doc.content);
    setEditDocTitle(doc.title);
    setExpandedDocId(doc.id);
  };

  const handleSaveDoc = (id: string) => {
    setIndexedDocs((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              content: editDocContent,
              title: editDocTitle,
              preview: editDocContent.slice(0, 150) + (editDocContent.length > 150 ? '...' : ''),
            }
          : doc
      )
    );
    setEditingDocId(null);
  };

  const handleUpdateTicket = (updatedTicket: Ticket) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
    );
  };

  const handleExportCSV = () => {
    const ticketsToExport = selectedTicketObjects.length > 0 ? selectedTicketObjects : tickets;

    // CSV headers — full ticket schema
    const headers = [
      'Title',
      'Description',
      'Type',
      'Priority',
      'Effort',
      'Assignee Role',
      'Stakeholders',
      'Labels',
      'Acceptance Criteria',
      'Known Edge Cases',
      'Open Questions',
      'Setup Requirements',
      'Dependencies',
      'Suggested Dependencies',
      'Confidence',
      'Is Derived',
      'Derived Rationale',
      'Readiness',
      'Readiness Reason',
      'Citations',
    ];

    const q = (val: string) => `"${val.replace(/"/g, '""')}"`;

    // Convert tickets to CSV rows — every field quoted
    const rows = ticketsToExport.map((ticket) => [
      q(ticket.title),
      q(ticket.description),
      q(ticket.type),
      q(ticket.priority),
      q(ticket.estimated_effort),
      q(ticket.suggested_assignee || ''),
      q((ticket.stakeholders || []).join(' | ')),
      q((ticket.labels || []).join(' | ')),
      q((ticket.acceptance_criteria || []).join(' | ')),
      q((ticket.known_edge_cases || []).join(' | ')),
      q((ticket.open_questions || []).join(' | ')),
      q((ticket.setup_requirements || []).map((r) => `[${r.type}${r.resolved ? ' DONE' : ''}] ${r.description}`).join(' | ')),
      q((ticket.dependencies || []).join(' | ')),
      q((ticket.suggested_dependencies || []).join(' | ')),
      q(`${Math.round(ticket.confidence * 100)}%`),
      q(ticket.is_derived ? 'Yes' : 'No'),
      q(ticket.derived_rationale || ''),
      q(ticket.readiness || 'ready'),
      q(ticket.readiness_reason || ''),
      q((ticket.citations || []).map((c) => `${c.document_id}:${c.chunk_id}`).join(' | ')),
    ]);

    // Combine headers and rows
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadMockData = async () => {
    setFormState((prev) => ({
      ...prev,
      isIndexingDocument: true,
      indexError: null,
    }));

    try {
      const timestamp = new Date().toISOString();
      const newDocs: IndexedDoc[] = [];

      for (const mockDoc of MOCK_DOCUMENTS) {
        await api.indexDocument({
          content: mockDoc.content,
          doc_type: 'requirements',
          title: mockDoc.title,
          timestamp,
        });

        newDocs.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          content: mockDoc.content,
          title: mockDoc.title,
          timestamp,
          preview: mockDoc.content.slice(0, 150) + '...',
        });
      }

      setIndexedDocs(newDocs);
      setShowDocumentInput(false);
      setFormState((prev) => ({ ...prev, indexSuccess: true }));

      setTimeout(() => {
        setFormState((prev) => ({ ...prev, indexSuccess: false }));
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load mock data';
      setFormState((prev) => ({ ...prev, indexError: message }));
    } finally {
      setFormState((prev) => ({ ...prev, isIndexingDocument: false }));
    }
  };

  const handleToggleTicket = (id: string) => {
    setSelectedTickets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedTickets.size === filteredTickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(filteredTickets.map((t) => t.id)));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-white">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Lorance</h1>
            </div>
            
            <div className="flex items-center gap-3">
            {/* Search & Intelligence Link */}
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all duration-200 text-sm"
            >
              <Search className="w-4 h-4" />
              Search &amp; Intelligence
            </a>

            {/* Auth Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-all duration-200"
            >
              {authState.user ? (
                <>
                  <div className="w-6 h-6 bg-white/30 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold">
                      {authState.user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm">{authState.user.email}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm">Sign In</span>
                </>
              )}
            </button>
            </div>
          </div>
          <p className="text-xl text-blue-100 mb-6 max-w-2xl">
            Turn project docs into dev-ready tickets. AI-powered ticket generation from PRDs, meeting notes, and architecture docs.
          </p>

          {/* How it works */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              <span>Upload project documents</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              <span>Generate tickets with AI</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              <span>Export to Linear, Jira, or GitHub</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Main Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8 -mt-8 relative">
          <div className="absolute -top-3 left-6 bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            AI-Powered Ticket Generation
          </div>

          {/* Generate Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Generate Tickets from Documents
              </h2>
              <p className="text-sm text-gray-500">
                Add your project documents below, then generate detailed tickets with AI.
              </p>
            </div>
            <button
              onClick={handleGenerateTickets}
              disabled={formState.isGeneratingTickets || indexedDocs.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-lg font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 flex items-center gap-2"
            >
              {formState.isGeneratingTickets ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  <span>Generate Tickets</span>
                </>
              )}
            </button>
          </div>

          {formState.generateError && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mb-4">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formState.generateError}</span>
            </div>
          )}

          {/* Generated Tickets Section - appears here after generation */}
          {(formState.isGeneratingTickets || tickets.length > 0) && (
            <div className="mb-6">
              {formState.isGeneratingTickets ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Generating tickets...</h3>
                  <p className="text-sm text-gray-500">AI is analyzing your documents</p>
                </div>
              ) : (
                <>
                  {/* Cross-document insight banner */}
                  {sourcesCount > 1 && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-4 mb-4 flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">Cross-Document Analysis</p>
                        <p className="text-sm text-indigo-700">Generated {tickets.length} tickets from {sourcesCount} documents</p>
                      </div>
                    </div>
                  )}

                  {/* Toolbar */}
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {/* Type Filter */}
                      {ticketTypes.size > 1 && (
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-gray-500" />
                          <div className="flex flex-wrap gap-2">
                            {Array.from(ticketTypes.entries()).map(([type, count]) => (
                              <button
                                key={type}
                                onClick={() => setSelectedType(selectedType === type ? null : type)}
                                className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                  selectedType === type
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                              >
                                {type.replace('_', ' ')} ({count})
                              </button>
                            ))}
                            {selectedType && (
                              <button
                                onClick={() => setSelectedType(null)}
                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-all duration-200"
                              >
                                <X className="w-3 h-3" />
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100 transition-all duration-200"
                      >
                        {selectedTickets.size === filteredTickets.length ? 'Deselect all' : 'Select all'}
                      </button>

                      <button
                        onClick={handleGenerateTickets}
                        disabled={formState.isGeneratingTickets}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${formState.isGeneratingTickets ? 'animate-spin' : ''}`} />
                        Regenerate
                      </button>

                      <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 text-gray-600 hover:text-gray-800 font-medium rounded-lg hover:bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200 flex items-center gap-2"
                        title={selectedTickets.size > 0 ? `Export ${selectedTickets.size} selected as CSV` : 'Export all as CSV'}
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV
                      </button>

                      <button
                        onClick={() => setShowExportModal(true)}
                        disabled={selectedTickets.size === 0}
                        className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-md"
                      >
                        <Download className="w-4 h-4" />
                        Export ({selectedTickets.size})
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                      <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-gray-600">
                        <strong className="text-gray-900">{filteredTickets.length}</strong>
                        {selectedType && ` of ${tickets.length}`} tickets
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                      <Zap className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">
                        <strong className="text-gray-900">{selectedTickets.size}</strong> selected
                      </span>
                    </div>
                  </div>

                  {/* Tickets List */}
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredTickets.map((ticket) => (
                      <TicketCard
                        key={ticket.id}
                        ticket={ticket}
                        selected={selectedTickets.has(ticket.id)}
                        onToggleSelect={handleToggleTicket}
                        onUpdate={handleUpdateTicket}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Add Document Section */}
          <div className={`${tickets.length > 0 || formState.isGeneratingTickets ? 'border-t border-gray-100 pt-6' : ''}`}>
            <div className="flex items-center gap-4">
<button
              onClick={() => setShowDocumentInput(!showDocumentInput)}
              className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-all duration-200 font-medium px-2 py-1 rounded hover:bg-indigo-50"
            >
                {showDocumentInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <Upload className="w-4 h-4" />
                <span>{showDocumentInput ? 'Hide document input' : 'Add project documents'}</span>
              </button>

              {indexedDocs.length === 0 && (
<button
                onClick={handleLoadMockData}
                disabled={formState.isIndexingDocument}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1 rounded-lg hover:bg-indigo-50 transition-all duration-200"
              >
                  {formState.isIndexingDocument ? 'Loading...' : 'Use demo data'}
                </button>
              )}
            </div>

            {showDocumentInput && (
              <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border border-gray-200">
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-gray-700 mb-2">
                    <FileText className="w-5 h-5 text-indigo-500" />
                    <span className="font-semibold">Add Project Document</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Add PRDs, meeting notes, architecture docs, or requirements. The AI will use these to generate detailed tickets.
                  </p>
                </div>

                {/* Title input */}
                <input
                  type="text"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Document title (optional)"
                  className="w-full px-4 py-2.5 mb-3 text-gray-900 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 placeholder:text-gray-400"
                />

                <textarea
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="Paste your document content here..."
                  className="w-full h-48 p-4 text-gray-900 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 resize-none placeholder:text-gray-400"
                />

                {formState.indexError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg mt-3">
                    <AlertCircle className="w-4 h-4" />
                    <span>{formState.indexError}</span>
                  </div>
                )}

                {formState.indexSuccess && (
                  <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg mt-3">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Document indexed successfully! You can now generate tickets.</span>
                  </div>
                )}

                <button
                  onClick={handleIndexDocument}
                  disabled={!documentContent.trim() || formState.isIndexingDocument}
                  className="mt-4 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-200 flex items-center gap-2"
                >
                  {formState.isIndexingDocument ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Indexing...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Add Document</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Indexed Documents List */}
            {indexedDocs.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Project Documents ({indexedDocs.length})
                </h3>
                <div className="space-y-2">
                  {indexedDocs.map((doc) => {
                    const isExpanded = expandedDocId === doc.id;
                    const isEditing = editingDocId === doc.id;

                    return (
                      <div
                        key={doc.id}
                        className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden"
                      >
                        {/* Header */}
                        <div className="flex items-start gap-3 p-3 group">
                          <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editDocTitle}
                                onChange={(e) => setEditDocTitle(e.target.value)}
                                className="w-full text-sm font-medium text-gray-900 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                              />
                            ) : (
                              <>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">{doc.title}</span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(doc.timestamp).toLocaleTimeString()}
                                  </span>
                                </div>
                                {!isExpanded && (
                                  <p className="text-xs text-gray-500 truncate">{doc.preview}</p>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <button
                                onClick={() => handleSaveDoc(doc.id)}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-all duration-200 hover:shadow-sm"
                                title="Save changes"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-all duration-200 hover:shadow-sm"
                                  title={isExpanded ? 'Collapse' : 'View full document'}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
<button
                        onClick={() => setSelectedType(null)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-indigo-50 transition-all duration-200"
                      >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              </>
                            )}
<button
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded transition-all duration-200 hover:shadow-sm"
                              title="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-3 pb-3 pt-0">
                            {isEditing ? (
                              <textarea
                                value={editDocContent}
                                onChange={(e) => setEditDocContent(e.target.value)}
                                className="w-full h-64 p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 resize-y"
                              />
                            ) : (
                              <div className="p-3 bg-white rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                  {doc.content}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-gray-400">
          <p>Powered by Algolia Agent Studio</p>
        </footer>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          tickets={selectedTicketObjects}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
