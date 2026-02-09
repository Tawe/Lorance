'use client';

import { useState, useEffect } from 'react';
import { FileText, Plus, X, Upload, Loader2, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { api } from '@/services/api';
import { ProjectDocument, DocType } from '@/types';

const MOCK_DOCUMENTS: { title: string; content: string; doc_type: DocType }[] = [
  {
    title: 'Atlas Rewards v2 – PRD (Draft)',
    doc_type: 'prd',
    content: `### Atlas Rewards v2 – PRD (Draft)
**Author:** Sarah Lin (Product Manager)
**Last Updated:** April 12
**Status:** Draft – Pending Eng Review

## Problem
Our current loyalty system:
- Updates points once per day via batch jobs
- Cannot support promotions without engineering involvement
- Frequently causes customer support tickets due to delayed or missing points

## Goals
- Real-time points accrual
- Configurable promotions without code deploys
- Clear audit trail for customer support

## Non-Goals
- Full gamification (badges, leaderboards)
- Mobile app changes in Phase 1

## Success Metrics
- <1% support tickets related to rewards
- Points reflected within 5 seconds of purchase
- Marketing can launch promotions without engineering support

## Core Features
1. Real-time points calculation
2. Promotion rules engine
3. Admin dashboard for Marketing
4. Customer-facing points history

## Open Questions
- Do refunds immediately deduct points?
- What happens if a promotion rule is changed mid-day?
- Do guest checkouts earn points?`,
  },
  {
    title: 'Atlas Rewards v2 – Technical Design',
    doc_type: 'architecture',
    content: `### Atlas Rewards v2 – Technical Design
**Author:** Miguel Torres (Staff Engineer)
**Last Updated:** April 18

## Overview
Atlas Rewards v2 will be implemented as an event-driven service consuming purchase events from the Order Service.

## Architecture
- **Rewards Service (Node.js)**
- **Kafka topic:** orders.completed
- **Postgres** for ledger storage
- **Redis** for short-lived promotion caching

## Flow
1. Order completes
2. Event published
3. Rewards service calculates points
4. Ledger entry written
5. Customer profile updated

## Promotion Rules
Initial proposal:
- Rules stored as JSON
- Evaluated synchronously during event processing

⚠️ Concern: complex rules may increase processing latency.

## Edge Cases
- Refunds may arrive before rewards calculation completes
- Duplicate events possible
- Marketing may want retroactive promotions

## Open Concerns
- No decision yet on idempotency strategy
- Admin dashboard API not yet defined
- Marketing wants "instant preview" of promotions, unclear how`,
  },
  {
    title: 'Slack Thread – Marketing ↔ Product ↔ Eng',
    doc_type: 'meeting',
    content: `**Channel:** #atlas-rewards

**April 21 – 10:14 AM – Jenna (Marketing):**
> We really need to be able to spin up promos same-day. Ideally no ticket to eng. Even better if we can preview how many points a customer would get before launching.

**10:17 AM – Sarah (PM):**
> Preview sounds great but might be Phase 2. Let's focus on basic config first.

**10:19 AM – Miguel (Eng):**
> Preview would require running rules outside the event flow. That's non-trivial.

**10:22 AM – Jenna:**
> Hmm ok but at least can we turn promos on/off without deploys?

**10:23 AM – Miguel:**
> Yes, that part is doable.

**10:45 AM – Tom (Support):**
> Jumping in—refunds are a nightmare today. If points get deducted days later customers get mad. We need clarity here.

**10:47 AM – Sarah:**
> Good call. I'll add refund behavior to the PRD.

_(No follow-up added yet)_`,
  },
  {
    title: 'Meeting Notes – Weekly Product Sync',
    doc_type: 'meeting',
    content: `**Meeting:** Atlas Rewards Weekly
**Date:** April 23
**Attendees:** Product, Eng, Marketing, Support

## Notes
- Agreement that real-time points is MVP requirement
- Marketing OK deferring preview if promos are editable without deploy
- Support strongly wants immediate refund handling
- Engineering flagged risk of synchronous rules engine slowing order completion

## Decisions
- Refunds **should** deduct points immediately _(tentative)_
- Duplicate events must not create duplicate points

## Action Items
- Sarah to clarify refund behavior in PRD
- Miguel to propose idempotency strategy
- Jenna to list required promo rule types

_(No deadlines assigned)_`,
  },
  {
    title: 'Email Thread – Leadership Pressure',
    doc_type: 'requirements',
    content: `**From:** VP Product
**To:** Sarah, Miguel
**Subject:** Atlas Rewards Timeline

> Hey—sales is pushing hard on rewards as a differentiator.
> We _need_ something demoable for the Q2 board meeting.
> Doesn't need to be perfect, but it needs to look real.

**Reply – Sarah:**
> Understood. We'll prioritize admin config and customer-visible updates.

**Reply – Miguel:**
> FYI rushing rules engine may cause tech debt. We should scope carefully.`,
  },
  {
    title: 'Slack DM – Legal Requirement',
    doc_type: 'requirements',
    content: `**From:** Sarah → Miguel

> Forgot to mention—legal says points are a liability so we need an immutable ledger. Can't just update totals.

_(Not documented anywhere else)_`,
  },
];

const DOC_TYPE_LABELS: Record<DocType, string> = {
  prd: 'PRD',
  meeting: 'Meeting',
  architecture: 'Architecture',
  tech_stack: 'Tech Stack',
  requirements: 'Requirements',
};

const DOC_TYPE_COLORS: Record<DocType, string> = {
  prd: 'bg-purple-100 text-purple-700',
  meeting: 'bg-blue-100 text-blue-700',
  architecture: 'bg-emerald-100 text-emerald-700',
  tech_stack: 'bg-orange-100 text-orange-700',
  requirements: 'bg-indigo-100 text-indigo-700',
};

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState<DocType>('requirements');
  const [uploadContent, setUploadContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoadingMock, setIsLoadingMock] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.getDocuments();
      setDocuments(response.documents);
    } catch (err) {
      setError('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMockData = async () => {
    setIsLoadingMock(true);
    setError(null);

    try {
      const timestamp = new Date().toISOString();
      const newDocs: ProjectDocument[] = [];

      for (const mockDoc of MOCK_DOCUMENTS) {
        const response = await api.indexDocument({
          content: mockDoc.content,
          doc_type: mockDoc.doc_type,
          title: mockDoc.title,
          timestamp,
        });
        newDocs.push(response.document);
      }

      setDocuments(prev => [...newDocs, ...prev]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample data');
    } finally {
      setIsLoadingMock(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadContent.trim()) return;

    setIsUploading(true);
    setError(null);

    try {
      const response = await api.indexDocument({
        content: uploadContent,
        doc_type: uploadDocType,
        title: uploadTitle || undefined,
        timestamp: new Date().toISOString(),
      });

      setDocuments(prev => [response.document, ...prev]);
      setUploadTitle('');
      setUploadDocType('requirements');
      setUploadContent('');
      setShowUploadForm(false);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-600" />
          <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
          <span className="text-xs text-gray-400">{documents.length}</span>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className={`p-1.5 rounded-md transition-colors ${
            showUploadForm
              ? 'bg-gray-200 text-gray-700'
              : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          {showUploadForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Upload success */}
      {uploadSuccess && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-green-700 text-xs bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5" />
          Document uploaded
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload form */}
      {showUploadForm && (
        <form onSubmit={handleUpload} className="p-4 border-b border-gray-200 space-y-3 bg-gray-50">
          <input
            type="text"
            value={uploadTitle}
            onChange={e => setUploadTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          />
          <select
            value={uploadDocType}
            onChange={e => setUploadDocType(e.target.value as DocType)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
          >
            {(Object.keys(DOC_TYPE_LABELS) as DocType[]).map(type => (
              <option key={type} value={type}>{DOC_TYPE_LABELS[type]}</option>
            ))}
          </select>
          <textarea
            value={uploadContent}
            onChange={e => setUploadContent(e.target.value)}
            placeholder="Paste document content..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder:text-gray-400 focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 resize-none"
            required
          />
          <button
            type="submit"
            disabled={isUploading || !uploadContent.trim()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </button>
        </form>
      )}

      {/* Document list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No documents yet</p>
            <p className="text-xs text-gray-400 mb-4">
              Click + to upload or try sample data
            </p>
            <button
              onClick={handleLoadMockData}
              disabled={isLoadingMock}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              {isLoadingMock ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Database className="w-3.5 h-3.5" />
              )}
              {isLoadingMock ? 'Loading...' : 'Use sample data'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {documents.map(doc => {
              const isExpanded = expandedId === doc.objectID;
              return (
                <button
                  key={doc.objectID}
                  onClick={() => setExpandedId(isExpanded ? null : doc.objectID)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${DOC_TYPE_COLORS[doc.doc_type]}`}>
                          {DOC_TYPE_LABELS[doc.doc_type]}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.title || 'Untitled Document'}
                      </p>
                      {doc.timestamp && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(doc.timestamp).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  {!isExpanded && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {doc.content.substring(0, 120)}
                      {doc.content.length > 120 ? '...' : ''}
                    </p>
                  )}
                  {isExpanded && (
                    <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap break-words">
                      {doc.content}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
