import React, { useState } from 'react';
import { FileText, Download, Calendar, Filter, Columns, Table, BarChart3 } from 'lucide-react';

/**
 * Report Builder Component
 * Interactive report generation interface
 */

interface ReportBuilderProps {
  onGenerate?: (config: ReportConfig) => void;
}

interface ReportConfig {
  title: string;
  format: 'pdf' | 'excel' | 'csv' | 'all';
  dateRange: {
    start: string;
    end: string;
  };
  filters: {
    status?: string[];
    priority?: string[];
    processType?: string[];
  };
  columns: string[];
  groupBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeCharts: boolean;
  includeSummary: boolean;
}

export const ReportBuilder: React.FC<ReportBuilderProps> = ({ onGenerate }) => {
  const [config, setConfig] = useState<ReportConfig>({
    title: '',
    format: 'pdf',
    dateRange: {
      start: '',
      end: '',
    },
    filters: {},
    columns: ['name', 'status', 'duration', 'createdAt'],
    includeCharts: true,
    includeSummary: true,
  });

  const [isGenerating, setIsGenerating] = useState(false);

  // Available columns
  const availableColumns = [
    { id: 'name', label: 'Process Name' },
    { id: 'status', label: 'Status' },
    { id: 'duration', label: 'Duration' },
    { id: 'priority', label: 'Priority' },
    { id: 'createdAt', label: 'Created At' },
    { id: 'updatedAt', label: 'Updated At' },
    { id: 'steps', label: 'Number of Steps' },
    { id: 'assignedTo', label: 'Assigned To' },
  ];

  // Handle column toggle
  const toggleColumn = (columnId: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.includes(columnId)
        ? prev.columns.filter(c => c !== columnId)
        : [...prev.columns, columnId],
    }));
  };

  // Handle generate
  const handleGenerate = async () => {
    if (!config.title.trim()) {
      alert('Please enter a report title');
      return;
    }

    setIsGenerating(true);

    try {
      // Call API or parent handler
      onGenerate?.(config);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      alert('Report generated successfully!');
    } catch (error) {
      console.error('Report generation failed:', error);
      alert('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
        <FileText className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Builder</h2>
          <p className="text-sm text-gray-600">Create custom reports with advanced filtering</p>
        </div>
      </div>

      {/* Report Title */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Report Title</label>
        <input
          type="text"
          value={config.title}
          onChange={e => setConfig({ ...config, title: e.target.value })}
          placeholder="e.g., Monthly Process Summary"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
        <div className="flex gap-3">
          {(['pdf', 'excel', 'csv', 'all'] as const).map(format => (
            <button
              key={format}
              onClick={() => setConfig({ ...config, format })}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                config.format === format
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {format.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Start Date
          </label>
          <input
            type="date"
            value={config.dateRange.start}
            onChange={e => setConfig({ ...config, dateRange: { ...config.dateRange, start: e.target.value } })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            End Date
          </label>
          <input
            type="date"
            value={config.dateRange.end}
            onChange={e => setConfig({ ...config, dateRange: { ...config.dateRange, end: e.target.value } })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Column Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Columns className="w-4 h-4 inline mr-1" />
          Select Columns
        </label>
        <div className="grid grid-cols-2 gap-2">
          {availableColumns.map(column => (
            <label
              key={column.id}
              className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={config.columns.includes(column.id)}
                onChange={() => toggleColumn(column.id)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm text-gray-700">{column.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Filter className="w-4 h-4 inline mr-1" />
          Filters
        </label>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Status</label>
            <select
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setConfig({ ...config, filters: { ...config.filters, status: selected } });
              }}
            >
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Priority</label>
            <select
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
              onChange={e => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setConfig({ ...config, filters: { ...config.filters, priority: selected } });
              }}
            >
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Sort By</label>
            <select
              value={config.sortBy || ''}
              onChange={e => setConfig({ ...config, sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">None</option>
              <option value="name">Name</option>
              <option value="duration">Duration</option>
              <option value="createdAt">Created At</option>
            </select>
          </div>
        </div>
      </div>

      {/* Additional Options */}
      <div className="mb-6 space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.includeCharts}
            onChange={e => setConfig({ ...config, includeCharts: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            <BarChart3 className="w-4 h-4 inline mr-1" />
            Include Charts & Visualizations
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.includeSummary}
            onChange={e => setConfig({ ...config, includeSummary: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            <Table className="w-4 h-4 inline mr-1" />
            Include Summary Statistics
          </span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !config.title.trim()}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Generate Report
            </>
          )}
        </button>
        <button
          onClick={() =>
            setConfig({
              title: '',
              format: 'pdf',
              dateRange: { start: '', end: '' },
              filters: {},
              columns: ['name', 'status', 'duration', 'createdAt'],
              includeCharts: true,
              includeSummary: true,
            })
          }
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Preview */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Report Preview</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p>
            <strong>Title:</strong> {config.title || '(No title)'}
          </p>
          <p>
            <strong>Format:</strong> {config.format.toUpperCase()}
          </p>
          <p>
            <strong>Columns:</strong> {config.columns.length} selected
          </p>
          <p>
            <strong>Date Range:</strong> {config.dateRange.start || 'Not set'} → {config.dateRange.end || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
