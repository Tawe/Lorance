'use client';

import { useState } from 'react';
import { Ticket, TicketType, Priority, EffortSize, Readiness, SetupRequirement, SetupRequirementType } from '@/types';
import {
  ChevronDown,
  ChevronUp,
  CheckSquare,
  AlertTriangle,
  Settings,
  User,
  Tag,
  Clock,
  Zap,
  Bug,
  Lightbulb,
  Server,
  FileText,
  Square,
  CheckSquare2,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  HelpCircle,
  Link2,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// Configuration
// =============================================================================

const TYPE_CONFIG: Record<TicketType, { icon: typeof FileText; label: string; color: string }> = {
  user_story: { icon: FileText, label: 'User Story', color: 'blue' },
  task: { icon: CheckSquare, label: 'Task', color: 'green' },
  bug: { icon: Bug, label: 'Bug', color: 'red' },
  spike: { icon: Lightbulb, label: 'Spike', color: 'purple' },
  infrastructure: { icon: Server, label: 'Infrastructure', color: 'gray' },
  decision: { icon: HelpCircle, label: 'Decision', color: 'amber' },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  critical: { label: 'Critical', color: 'red' },
  high: { label: 'High', color: 'orange' },
  medium: { label: 'Medium', color: 'yellow' },
  low: { label: 'Low', color: 'green' },
};

const EFFORT_CONFIG: Record<EffortSize, { label: string; description: string }> = {
  XS: { label: 'XS', description: '< 2 hours' },
  S: { label: 'S', description: '2-4 hours' },
  M: { label: 'M', description: '1-2 days' },
  L: { label: 'L', description: '3-5 days' },
  XL: { label: 'XL', description: '> 1 week' },
};

const READINESS_CONFIG: Record<Readiness, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'green' },
  partially_blocked: { label: 'Partially Blocked', color: 'yellow' },
  blocked: { label: 'Blocked', color: 'red' },
};

// =============================================================================
// Component
// =============================================================================

interface TicketCardProps {
  ticket: Ticket;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  onUpdate?: (ticket: Ticket) => void;
}

export default function TicketCard({ ticket, selected = false, onToggleSelect, onUpdate }: TicketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTicket, setEditedTicket] = useState<Ticket>(ticket);
  const [newCriterion, setNewCriterion] = useState('');
  const [newKnownEdgeCase, setNewKnownEdgeCase] = useState('');
  const [newOpenQuestion, setNewOpenQuestion] = useState('');
  const [newReqDescription, setNewReqDescription] = useState('');
  const [newReqType, setNewReqType] = useState<SetupRequirementType>('other');
  const [newDependency, setNewDependency] = useState('');
  const [newStakeholder, setNewStakeholder] = useState('');

  const typeConfig = TYPE_CONFIG[isEditing ? editedTicket.type : ticket.type];
  const priorityConfig = PRIORITY_CONFIG[isEditing ? editedTicket.priority : ticket.priority];
  const effortConfig = EFFORT_CONFIG[isEditing ? editedTicket.estimated_effort : ticket.estimated_effort];
  const TypeIcon = typeConfig.icon;

  const displayTicket = isEditing ? editedTicket : ticket;
  const confidencePercent = Math.round(displayTicket.confidence * 100);

  const handleStartEdit = () => {
    setEditedTicket({ ...ticket });
    setIsEditing(true);
    setExpanded(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(editedTicket);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTicket({ ...ticket });
    setIsEditing(false);
  };

  // String array list helpers
  const addStringItem = (
    field: 'acceptance_criteria' | 'known_edge_cases' | 'open_questions' | 'dependencies' | 'stakeholders',
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim()) {
      setEditedTicket((prev) => ({
        ...prev,
        [field]: [...((prev[field] as string[]) || []), value.trim()],
      }));
      setValue('');
    }
  };

  const removeStringItem = (
    field: 'acceptance_criteria' | 'known_edge_cases' | 'open_questions' | 'dependencies' | 'stakeholders',
    index: number
  ) => {
    setEditedTicket((prev) => ({
      ...prev,
      [field]: ((prev[field] as string[]) || []).filter((_, i) => i !== index),
    }));
  };

  // Setup requirement helpers
  const addSetupRequirement = () => {
    if (newReqDescription.trim()) {
      setEditedTicket((prev) => ({
        ...prev,
        setup_requirements: [
          ...prev.setup_requirements,
          { description: newReqDescription.trim(), type: newReqType, resolved: false },
        ],
      }));
      setNewReqDescription('');
      setNewReqType('other');
    }
  };

  const removeSetupRequirement = (index: number) => {
    setEditedTicket((prev) => ({
      ...prev,
      setup_requirements: prev.setup_requirements.filter((_, i) => i !== index),
    }));
  };

  const toggleSetupResolved = (index: number) => {
    setEditedTicket((prev) => ({
      ...prev,
      setup_requirements: prev.setup_requirements.map((req, i) =>
        i === index ? { ...req, resolved: !req.resolved } : req
      ),
    }));
  };

  return (
    <div
      className={`bg-white rounded-xl border-2 transition-all duration-200 overflow-hidden ${
        selected
          ? 'border-indigo-500 shadow-lg shadow-indigo-100'
          : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Selection checkbox */}
          {onToggleSelect && !isEditing && (
            <button
              onClick={() => onToggleSelect(ticket.id)}
              className="mt-1 flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-all duration-200"
            >
              {selected ? (
                <CheckSquare2 className="w-5 h-5 text-indigo-600" />
              ) : (
                <Square className="w-5 h-5 text-gray-300 hover:text-gray-400" />
              )}
            </button>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title and type badge */}
            <div className="flex items-start justify-between gap-3 mb-2">
              {isEditing ? (
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input
                    type="text"
                    value={editedTicket.title}
                    onChange={(e) => setEditedTicket((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full text-lg font-semibold text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  />
                </div>
              ) : (
                <h3 className="text-lg font-semibold text-gray-900 leading-snug">
                  {ticket.title}
                </h3>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isEditing ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                    <select
                      value={editedTicket.type}
                      onChange={(e) => setEditedTicket((prev) => ({ ...prev, type: e.target.value as TicketType }))}
                      className="text-xs font-semibold text-gray-900 bg-white px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                    >
                      {Object.keys(TYPE_CONFIG).map((t) => (
                        <option key={t} value={t}>{TYPE_CONFIG[t as TicketType].label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                      typeConfig.color === 'blue'
                        ? 'bg-blue-100 text-blue-700'
                        : typeConfig.color === 'green'
                        ? 'bg-green-100 text-green-700'
                        : typeConfig.color === 'red'
                        ? 'bg-red-100 text-red-700'
                        : typeConfig.color === 'purple'
                        ? 'bg-purple-100 text-purple-700'
                        : typeConfig.color === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    <TypeIcon className="w-3 h-3" />
                    {typeConfig.label}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {isEditing ? (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  value={editedTicket.description}
                  onChange={(e) => setEditedTicket((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 h-20 resize-y"
                />
              </div>
            ) : (
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{ticket.description}</p>
            )}

            {/* Metadata row */}
            <div className="flex flex-wrap items-end gap-3">
              {/* Priority */}
              {isEditing ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select
                    value={editedTicket.priority}
                    onChange={(e) => setEditedTicket((prev) => ({ ...prev, priority: e.target.value as Priority }))}
                    className="text-xs font-medium text-gray-900 bg-white px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  >
                    {Object.keys(PRIORITY_CONFIG).map((p) => (
                      <option key={p} value={p}>{PRIORITY_CONFIG[p as Priority].label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                    priorityConfig.color === 'red'
                      ? 'bg-red-50 text-red-700'
                      : priorityConfig.color === 'orange'
                      ? 'bg-orange-50 text-orange-700'
                      : priorityConfig.color === 'yellow'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-green-50 text-green-700'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {priorityConfig.label}
                </span>
              )}

              {/* Effort */}
              {isEditing ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Effort</label>
                  <select
                    value={editedTicket.estimated_effort}
                    onChange={(e) => setEditedTicket((prev) => ({ ...prev, estimated_effort: e.target.value as EffortSize }))}
                    className="text-xs font-medium text-gray-900 bg-white px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  >
                    {Object.keys(EFFORT_CONFIG).map((e) => (
                      <option key={e} value={e}>{e} - {EFFORT_CONFIG[e as EffortSize].description}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700"
                  title={effortConfig.description}
                >
                  <Clock className="w-3 h-3" />
                  {effortConfig.label}
                </span>
              )}

              {/* Assignee Role */}
              {isEditing ? (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Assignee Role</label>
                  <input
                    type="text"
                    value={editedTicket.suggested_assignee || ''}
                    onChange={(e) => setEditedTicket((prev) => ({ ...prev, suggested_assignee: e.target.value || '' }))}
                    placeholder="e.g., Backend Engineer"
                    className="text-xs font-medium text-gray-900 bg-white px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 w-36 placeholder:text-gray-400"
                  />
                </div>
              ) : displayTicket.suggested_assignee ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-indigo-50 text-indigo-700">
                  <User className="w-3 h-3" />
                  {displayTicket.suggested_assignee}
                </span>
              ) : null}

              {/* Confidence (not editable) */}
              {!isEditing && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                    confidencePercent >= 80
                      ? 'bg-emerald-50 text-emerald-700'
                      : confidencePercent >= 60
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {confidencePercent}% conf
                </span>
              )}

              {/* Readiness badge with reason tooltip */}
              {!isEditing && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded cursor-help ${
                    (READINESS_CONFIG[displayTicket.readiness || 'ready'].color === 'green'
                      ? 'bg-green-50 text-green-700'
                      : READINESS_CONFIG[displayTicket.readiness || 'ready'].color === 'yellow'
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-700')
                  }`}
                  title={displayTicket.readiness_reason || READINESS_CONFIG[displayTicket.readiness || 'ready'].label}
                >
                  {READINESS_CONFIG[displayTicket.readiness || 'ready'].label}
                </span>
              )}

              {/* Derived indicator with rationale tooltip */}
              {!isEditing && displayTicket.is_derived && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-700 cursor-help"
                  title={displayTicket.derived_rationale || 'Inferred as necessary for production readiness'}
                >
                  <Sparkles className="w-3 h-3" />
                  Derived
                </span>
              )}

              {/* Dependencies count */}
              {!isEditing && displayTicket.dependencies.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">
                  <Link2 className="w-3 h-3" />
                  {displayTicket.dependencies.length} dep{displayTicket.dependencies.length !== 1 ? 's' : ''}
                </span>
              )}

              {/* Action buttons */}
              <div className="ml-auto flex items-center gap-2">
                {isEditing ? (
                  <>
<button
                       onClick={handleCancel}
                       className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-all duration-200 hover:shadow-sm"
                     >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
<button
                       onClick={handleSave}
                       className="inline-flex items-center gap-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded transition-all duration-200 hover:shadow-sm"
                     >
                      <Save className="w-3 h-3" />
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    {onUpdate && (
                      <button
                        onClick={handleStartEdit}
                        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-all duration-200 hover:shadow-sm"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-all duration-200"
                    >
                      {expanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          More
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Labels */}
            {!isEditing && displayTicket.labels.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Tag className="w-3 h-3 text-gray-400" />
                {displayTicket.labels.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600"
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-gray-100">
          <div className="pt-4 space-y-4">
            {/* Acceptance Criteria */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <CheckSquare className="w-4 h-4 text-green-500" />
                Acceptance Criteria
              </h4>
              <ul className="space-y-1.5 pl-6">
                {displayTicket.acceptance_criteria.map((criterion, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                    <span className="flex-1">{criterion}</span>
                    {isEditing && (
                      <button
                        onClick={() => removeStringItem('acceptance_criteria', index)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <div className="flex gap-2 mt-2 pl-6">
                  <input
                    type="text"
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    placeholder="Add criterion..."
                    className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && addStringItem('acceptance_criteria', newCriterion, setNewCriterion)}
                  />
<button
                     onClick={() => addStringItem('acceptance_criteria', newCriterion, setNewCriterion)}
                     className="p-1 text-green-600 hover:bg-green-100 rounded transition-all duration-200 hover:shadow-sm"
                   >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Known Edge Cases */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Known Edge Cases
              </h4>
              <ul className="space-y-1.5 pl-6">
                {displayTicket.known_edge_cases.map((edgeCase, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                    <span className="flex-1">{edgeCase}</span>
                    {isEditing && (
                      <button
                        onClick={() => removeStringItem('known_edge_cases', index)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <div className="flex gap-2 mt-2 pl-6">
                  <input
                    type="text"
                    value={newKnownEdgeCase}
                    onChange={(e) => setNewKnownEdgeCase(e.target.value)}
                    placeholder="Add known edge case..."
                    className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && addStringItem('known_edge_cases', newKnownEdgeCase, setNewKnownEdgeCase)}
                  />
<button
                     onClick={() => addStringItem('known_edge_cases', newKnownEdgeCase, setNewKnownEdgeCase)}
                     className="p-1 text-amber-600 hover:bg-amber-100 rounded transition-all duration-200 hover:shadow-sm"
                   >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Open Questions */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <HelpCircle className="w-4 h-4 text-red-500" />
                Open Questions
              </h4>
              <ul className="space-y-1.5 pl-6">
                {displayTicket.open_questions.map((question, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                    <span className="flex-1">{question}</span>
                    {isEditing && (
                      <button
                        onClick={() => removeStringItem('open_questions', index)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition-all duration-200"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <div className="flex gap-2 mt-2 pl-6">
                  <input
                    type="text"
                    value={newOpenQuestion}
                    onChange={(e) => setNewOpenQuestion(e.target.value)}
                    placeholder="Add open question..."
                    className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && addStringItem('open_questions', newOpenQuestion, setNewOpenQuestion)}
                  />
<button
                     onClick={() => addStringItem('open_questions', newOpenQuestion, setNewOpenQuestion)}
                     className="p-1 text-red-600 hover:bg-red-100 rounded transition-all duration-200 hover:shadow-sm"
                   >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Setup Requirements (structured) */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Settings className="w-4 h-4 text-blue-500" />
                Setup Requirements
              </h4>
              <ul className="space-y-1.5 pl-6">
                {displayTicket.setup_requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    {isEditing ? (
                      <button onClick={() => toggleSetupResolved(index)} className="mt-0.5 flex-shrink-0">
                        {req.resolved ? (
                          <CheckSquare2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-300" />
                        )}
                      </button>
                    ) : (
                      <span className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${req.resolved ? 'bg-green-400' : 'bg-blue-400'}`} />
                    )}
                    <span className="flex-1">
                      <span
                        className={`inline-block px-1.5 py-0 text-xs font-medium rounded mr-1.5 ${
                          req.type === 'external_system' ? 'bg-orange-100 text-orange-700'
                          : req.type === 'prior_ticket' ? 'bg-blue-100 text-blue-700'
                          : req.type === 'decision' ? 'bg-purple-100 text-purple-700'
                          : req.type === 'schema' ? 'bg-cyan-100 text-cyan-700'
                          : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {req.type.replace(/_/g, ' ')}
                      </span>
                      <span className={req.resolved ? 'line-through text-gray-400' : ''}>{req.description}</span>
                    </span>
                    {isEditing && (
<button
                         onClick={() => removeSetupRequirement(index)}
                         className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition-all duration-200"
                       >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {isEditing && (
                <div className="flex gap-2 mt-2 pl-6 items-end">
                  <select
                    value={newReqType}
                    onChange={(e) => setNewReqType(e.target.value as SetupRequirementType)}
                    className="text-xs bg-white px-2 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                  >
                    <option value="external_system">External System</option>
                    <option value="prior_ticket">Prior Ticket</option>
                    <option value="decision">Decision</option>
                    <option value="schema">Schema</option>
                    <option value="other">Other</option>
                  </select>
                  <input
                    type="text"
                    value={newReqDescription}
                    onChange={(e) => setNewReqDescription(e.target.value)}
                    placeholder="Add requirement..."
                    className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                    onKeyDown={(e) => e.key === 'Enter' && addSetupRequirement()}
                  />
<button
                     onClick={addSetupRequirement}
                     className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-all duration-200 hover:shadow-sm"
                   >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Dependencies */}
            {(displayTicket.dependencies.length > 0 || isEditing) && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Link2 className="w-4 h-4 text-indigo-500" />
                  Dependencies
                </h4>
                <ul className="space-y-1.5 pl-6">
                  {displayTicket.dependencies.map((dep, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                      <span className="flex-1">{dep}</span>
                      {isEditing && (
<button
                         onClick={() => removeStringItem('dependencies', index)}
                         className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-100 transition-all duration-200"
                       >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {isEditing && (
                  <div className="flex gap-2 mt-2 pl-6">
                    <input
                      type="text"
                      value={newDependency}
                      onChange={(e) => setNewDependency(e.target.value)}
                      placeholder="Add dependency (ticket title)..."
                      className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                      onKeyDown={(e) => e.key === 'Enter' && addStringItem('dependencies', newDependency, setNewDependency)}
                    />
<button
                       onClick={() => addStringItem('dependencies', newDependency, setNewDependency)}
                       className="p-1 text-indigo-600 hover:bg-indigo-100 rounded transition-all duration-200 hover:shadow-sm"
                     >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Suggested Dependencies (read-only, low confidence) */}
            {displayTicket.suggested_dependencies && displayTicket.suggested_dependencies.length > 0 && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Link2 className="w-4 h-4 text-gray-400" />
                  <span>Suggested Dependencies</span>
                  <span className="text-xs font-normal text-gray-400">(low confidence)</span>
                </h4>
                <ul className="space-y-1.5 pl-6">
                  {displayTicket.suggested_dependencies.map((dep, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-400 italic">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                      <span className="flex-1">{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Stakeholders */}
            {(displayTicket.stakeholders && displayTicket.stakeholders.length > 0 || isEditing) && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 text-teal-500" />
                  Stakeholders
                </h4>
                <div className="flex flex-wrap gap-2 pl-6">
                  {(displayTicket.stakeholders || []).map((s, index) => (
                    <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700">
                      {s}
                      {isEditing && (
                        <button onClick={() => removeStringItem('stakeholders', index)} className="text-red-400 hover:text-red-600 ml-1 p-1 rounded hover:bg-red-100 transition-all duration-200">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {isEditing && (
                  <div className="flex gap-2 mt-2 pl-6">
                    <input
                      type="text"
                      value={newStakeholder}
                      onChange={(e) => setNewStakeholder(e.target.value)}
                      placeholder="Add stakeholder..."
                      className="flex-1 text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                      onKeyDown={(e) => e.key === 'Enter' && addStringItem('stakeholders', newStakeholder, setNewStakeholder)}
                    />
<button
                       onClick={() => addStringItem('stakeholders', newStakeholder, setNewStakeholder)}
                       className="p-1 text-teal-600 hover:bg-teal-100 rounded transition-all duration-200 hover:shadow-sm"
                     >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Labels (editable) */}
            {isEditing && (
              <div>
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Tag className="w-4 h-4 text-gray-500" />
                  Labels
                </h4>
                <input
                  type="text"
                  value={editedTicket.labels.join(', ')}
                  onChange={(e) => setEditedTicket((prev) => ({
                    ...prev,
                    labels: e.target.value.split(',').map((l) => l.trim()).filter(Boolean),
                  }))}
                  placeholder="frontend, api, database (comma-separated)"
                  className="w-full text-sm text-gray-900 bg-white px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 placeholder:text-gray-400"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom accent bar based on priority */}
      <div
        className={`h-1 ${
          priorityConfig.color === 'red'
            ? 'bg-gradient-to-r from-red-500 to-red-400'
            : priorityConfig.color === 'orange'
            ? 'bg-gradient-to-r from-orange-500 to-orange-400'
            : priorityConfig.color === 'yellow'
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
            : 'bg-gradient-to-r from-green-500 to-green-400'
        }`}
      />
    </div>
  );
}
