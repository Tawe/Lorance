'use client';

import { useState } from 'react';
import { Upload, FileText, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { DocumentIntelService } from '@/services/documentIntelService';
import { WorkspaceService } from '@/services/workspaceService';
import { DocumentChunk } from '@/types';

interface DocumentPanelProps {
  onSearch: (query: string) => void;
  onRefresh: () => void;
  results: any;
  isLoading: boolean;
  className?: string;
  onDocumentDeleted: (objectID: string) => void;
  onDocumentUpdated: (updatedDoc: DocumentChunk) => void;
}

export default function DocumentPanel({ onSearch, onRefresh, results, isLoading, className = '', onDocumentDeleted, onDocumentUpdated }: DocumentPanelProps) {

  
  const [showUpload, setShowUpload] = useState(false);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSourceType, setUploadSourceType] = useState<'slack' | 'email' | 'prd' | 'meeting' | 'other'>('prd');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editSourceType, setEditSourceType] = useState<'slack' | 'email' | 'prd' | 'meeting' | 'other'>('prd');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isGeneratingMockData, setIsGeneratingMockData] = useState(false);

  const handleUpload = async () => {
    if (!uploadContent.trim()) {
      setUploadSuccess('Please enter some content');
      return;
    }

    setIsUploading(true);
    setUploadSuccess(null);

    try {
      const workspaceId = WorkspaceService.getWorkspaceId();
      
      // Create document chunk
      const documentChunk: DocumentChunk = {
        objectID: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        record_type: 'doc_chunk',
        content: uploadContent,
        source_type: uploadSourceType,
        document_id: `doc_${Date.now()}`,
        chunk_id: `chunk_1`,
        timestamp: Date.now(),
        workspace_id: workspaceId,
        title: uploadTitle || undefined,
        author: 'User Upload',
      };

      await DocumentIntelService.indexDocumentChunks([documentChunk]);
      
      setUploadSuccess('Document uploaded successfully!');
      setUploadContent('');
      setUploadTitle('');
      setShowUpload(false);
      
      // Refresh list to show the new document
      await onRefresh();
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadSuccess('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    setIsDeleting(doc.objectID);
    try {
      await DocumentIntelService.deleteDocument(doc.objectID);
      onDocumentDeleted(doc.objectID); // Call the new prop
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Failed to delete document. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEditDocument = (doc: any) => {

    setEditingDoc(doc);
    setEditContent(doc.content);
    setEditTitle(doc.title || '');
    setEditSourceType(doc.source_type || 'prd');
  };

  const handleSaveEdit = async () => {
    if (!editingDoc) return;
    
    const updatedDoc = {
      ...editingDoc,
      content: editContent,
      title: editTitle,
      source_type: editSourceType,
    };

    try {
      setIsSavingEdit(true);
      await DocumentIntelService.updateDocument(editingDoc.objectID, {
        content: editContent,
        title: editTitle,
        source_type: editSourceType,
      });
      
      onDocumentUpdated(updatedDoc);
      setEditingDoc(null);
      setEditContent('');
      setEditTitle('');
    } catch (err) {
      console.error('Failed to update document:', err);
      alert('Failed to update document. Please try again.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const documentCount = results.document_chunks?.length || 0;
  
  // Log first doc content when rendering


  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-2 border-b border-gray-200 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{documentCount} document{documentCount !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs border border-dashed border-gray-300 rounded text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add</span>
          </button>
        </div>
        <button
          onClick={async () => {
            setIsGeneratingMockData(true); // Set loading state to true
            const btn = document.activeElement as HTMLButtonElement;
            if (btn) btn.disabled = true;
            
            try { // Added try block
              const workspaceId = localStorage.getItem('lorance_workspace_id') || 'demo-workspace';
              
              try {
                const checkResponse = await fetch(`http://localhost:3001/api/intel/search?q=`, {
                  headers: { 'X-Workspace-ID': workspaceId }
                });
                if (checkResponse.ok) {
                  const data = await checkResponse.json();
                  const docCount = data.document_chunks?.length || 0;
                  if (docCount > 0) {
                    alert(`You already have ${docCount} document${docCount !== 1 ? 's' : ''} in your workspace.`);
                    if (btn) btn.disabled = false;
                    return;
                  }
                }
              } catch (err) {
                console.error('Failed to check for existing documents:', err);
              }
              
              const mockData: Partial<DocumentChunk>[] = [
                {
                  objectID: `mock_1_${Date.now()}`,
                  record_type: 'doc_chunk',
                  content: 'We need to implement user authentication with OAuth 2.0 for Google and GitHub providers. The system should support JWT tokens for session management.',
                  source_type: 'prd',
                  document_id: 'doc_mock_1',
                  chunk_id: 'chunk_1',
                  timestamp: Date.now(),
                  workspace_id: workspaceId,
                  title: 'Authentication Requirements',
                  author: 'Mock Data',
                },
                {
                  objectID: `mock_2_${Date.now()}`,
                  record_type: 'doc_chunk',
                  content: 'The API should be RESTful with endpoints for users, projects, and tasks. All endpoints need pagination and filtering support.',
                  source_type: 'meeting',
                  document_id: 'doc_mock_2',
                  chunk_id: 'chunk_1',
                  timestamp: Date.now() - 86400000,
                  workspace_id: workspaceId,
                  title: 'API Design Meeting',
                  author: 'Mock Data',
                },
                {
                  objectID: `mock_3_${Date.now()}`,
                  record_type: 'doc_chunk',
                  content: 'Database schema needs users, organizations, projects, and tasks tables. Use PostgreSQL with proper indexes for performance.',
                  source_type: 'prd',
                  document_id: 'doc_mock_3',
                  chunk_id: 'chunk_1',
                  timestamp: Date.now() - 172800000,
                  workspace_id: workspaceId,
                  title: 'Database Schema',
                  author: 'Mock Data',
                },
              ];
              await DocumentIntelService.indexDocumentChunks(mockData);
              await onRefresh();
            } finally { // Added finally block
              if (btn) btn.disabled = false;
              setIsGeneratingMockData(false); // Set loading state to false
            }
          }}
          className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
        >
          {isGeneratingMockData ? 'Adding Mock Data...' : 'Use Mock Data'}
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-transparent animate-spin rounded-full"></div>
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
          </div>
        ) : documentCount === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No documents yet</p>
            <p className="text-xs text-gray-400">Add documents to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.document_chunks.map((doc: any) => (
              <div key={doc.objectID} className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 text-2xl">
                    {doc.source_type === 'slack' && '💬'}
                    {doc.source_type === 'email' && '📧'}
                    {doc.source_type === 'prd' && '📋'}
                    {doc.source_type === 'meeting' && '👥'}
                    {doc.source_type === 'other' && '📄'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs font-medium text-gray-900 capitalize">
                          {doc.source_type}
                        </span>
                        {doc.title && (
                          <span className="text-xs text-gray-500 truncate">{doc.title}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleEditDocument(doc)}
                          className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc)}
                          disabled={isDeleting === doc.objectID}
                          className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {isDeleting === doc.objectID ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent animate-spin rounded-full" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-3">
                      {doc.content}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{new Date(doc.timestamp).toLocaleDateString()}</span>
                      {doc.action_signal_score && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                          {Math.round(doc.action_signal_score * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Document Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Add Document</h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Document title (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source Type</label>
                  <select
                    value={uploadSourceType}
                    onChange={(e) => setUploadSourceType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900"
                  >
                    <option value="prd">PRD / Requirements</option>
                    <option value="meeting">Meeting Notes</option>
                    <option value="slack">Slack / Chat</option>
                    <option value="email">Email</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={uploadContent}
                    onChange={(e) => setUploadContent(e.target.value)}
                    placeholder="Paste your document content here..."
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={isUploading || !uploadContent.trim()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Add Document</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowUpload(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
                {uploadSuccess && (
                  <div className={`p-2 rounded-lg text-sm ${
                    uploadSuccess.includes('success')
                      ? 'bg-green-50 text-green-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {uploadSuccess}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Edit Document</h3>
                <button
                  onClick={() => setEditingDoc(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Source Type</label>
                  <select
                    value={editSourceType}
                    onChange={(e) => setEditSourceType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-gray-900"
                  >
                    <option value="prd">PRD / Requirements</option>
                    <option value="meeting">Meeting Notes</option>
                    <option value="slack">Slack / Chat</option>
                    <option value="email">Email</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm resize-none text-gray-900 placeholder:text-gray-400"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingDoc(null)}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSavingEdit && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    )}
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
