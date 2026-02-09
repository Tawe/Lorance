'use client';

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { FilterOptions } from '@/types';

interface FilterPanelProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  resultCount: number;
}

export default function FilterPanel({ filters, onFilterChange, resultCount }: FilterPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['recordType']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof FilterOptions];
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== 'all';
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="text-sm text-gray-500 mb-4">
        {resultCount} result{resultCount !== 1 ? 's' : ''}
      </div>

      {/* Record Type */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('recordType')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">Record Type</span>
          {expandedSections.has('recordType') ? 
            <ChevronUp className="w-4 h-4 text-gray-400" /> : 
            <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
        
        {expandedSections.has('recordType') && (
          <div className="mt-2 space-y-2">
            {[
              { value: 'all', label: 'All Records' },
              { value: 'doc_chunk', label: 'Documents' },
              { value: 'ticket', label: 'Tickets' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="recordType"
                  value={value}
                  checked={filters.recordType === value || (!filters.recordType && value === 'all')}
                  onChange={(e) => updateFilter('recordType', e.target.value === 'all' ? undefined : e.target.value)}
                  className="text-indigo-600"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Type */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('ticketType')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">Ticket Type</span>
          {expandedSections.has('ticketType') ? 
            <ChevronUp className="w-4 h-4 text-gray-400" /> : 
            <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
        
        {expandedSections.has('ticketType') && (
          <div className="mt-2 space-y-2">
            {[
              'decision', 'task', 'user_story', 'bug', 'spike', 'infrastructure'
            ].map(type => (
              <label key={type} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={type}
                  checked={filters.ticketType?.includes(type) || false}
                  onChange={(e) => {
                    const current = filters.ticketType || [];
                    const updated = e.target.checked
                      ? [...current, type]
                      : current.filter(t => t !== type);
                    updateFilter('ticketType', updated);
                  }}
                  className="text-indigo-600"
                />
                <span className="capitalize">{type.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('status')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">Status</span>
          {expandedSections.has('status') ? 
            <ChevronUp className="w-4 h-4 text-gray-400" /> : 
            <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
        
        {expandedSections.has('status') && (
          <div className="mt-2 space-y-2">
            {[
              { value: 'ready', label: 'Ready' },
              { value: 'partially_blocked', label: 'Partially Blocked' },
              { value: 'blocked', label: 'Blocked' },
            ].map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={value}
                  checked={filters.status?.includes(value) || false}
                  onChange={(e) => {
                    const current = filters.status || [];
                    const updated = e.target.checked
                      ? [...current, value]
                      : current.filter(s => s !== value);
                    updateFilter('status', updated);
                  }}
                  className="text-indigo-600"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Source Type */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('sourceType')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">Source Type</span>
          {expandedSections.has('sourceType') ? 
            <ChevronUp className="w-4 h-4 text-gray-400" /> : 
            <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
        
        {expandedSections.has('sourceType') && (
          <div className="mt-2 space-y-2">
            {[
              'slack', 'email', 'prd', 'meeting', 'other'
            ].map(source => (
              <label key={source} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  value={source}
                  checked={filters.sourceType?.includes(source) || false}
                  onChange={(e) => {
                    const current = filters.sourceType || [];
                    const updated = e.target.checked
                      ? [...current, source]
                      : current.filter(s => s !== source);
                    updateFilter('sourceType', updated);
                  }}
                  className="text-indigo-600"
                />
                <span className="capitalize">{source}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Confidence Range */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection('confidence')}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-sm font-medium text-gray-700">Confidence Range</span>
          {expandedSections.has('confidence') ? 
            <ChevronUp className="w-4 h-4 text-gray-400" /> : 
            <ChevronDown className="w-4 h-4 text-gray-400" />
          }
        </button>
        
        {expandedSections.has('confidence') && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span>Min:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.confidenceRange?.[0] || 0}
                onChange={(e) => {
                  const current = filters.confidenceRange || [0, 100];
                  updateFilter('confidenceRange', [parseInt(e.target.value), current[1]]);
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span>%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Max:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.confidenceRange?.[1] || 100}
                onChange={(e) => {
                  const current = filters.confidenceRange || [0, 100];
                  updateFilter('confidenceRange', [current[0], parseInt(e.target.value)]);
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span>%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}