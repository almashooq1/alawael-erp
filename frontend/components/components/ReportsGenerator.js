/**
 * ReportsGenerator.js - Reports Generation and Export Component
 * Generate, schedule, and manage various system reports
 */

import React, { useState, useEffect } from 'react';
import './ReportsGenerator.css';

const ReportsGenerator = ({ userId, isAdmin = false }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(null);
  const [reportConfig, setReportConfig] = useState({
    type: 'beneficiary_overview',
    dateRange: 'month',
    format: 'pdf',
    includeAnalytics: true,
    includeRecommendations: true
  });

  useEffect(() => {
    fetchReports();
  }, [userId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports?userId=${userId}`);

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.data.reports || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (type) => {
    try {
      setGeneratingReport(type);
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          userId,
          ...reportConfig
        })
      });

      if (!response.ok) throw new Error('Failed to generate report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}_report_${new Date().getTime()}.${reportConfig.format}`;
      link.click();

      fetchReports();
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleScheduleReport = async (config) => {
    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          userId
        })
      });

      if (!response.ok) throw new Error('Failed to schedule report');

      setShowCustomReport(false);
      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete report');

      fetchReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await fetch(`/api/reports/${reportId}/download`);

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${reportId}.pdf`;
      link.click();
    } catch (err) {
      setError(err.message);
    }
  };

  const reportTypes = [
    {
      id: 'beneficiary_overview',
      title: 'Beneficiary Overview',
      description: 'Comprehensive profile and status report',
      icon: '👤'
    },
    {
      id: 'academic_performance',
      title: 'Academic Performance',
      description: 'GPA trends, courses, grades analysis',
      icon: '📚'
    },
    {
      id: 'attendance_report',
      title: 'Attendance Report',
      description: 'Attendance rate and absence patterns',
      icon: '📅'
    },
    {
      id: 'financial_summary',
      title: 'Financial Summary',
      description: 'Scholarships, disbursements, balance',
      icon: '💰'
    },
    {
      id: 'support_plan_progress',
      title: 'Support Plan Progress',
      description: 'Goals completion and interventions',
      icon: '📝'
    },
    {
      id: 'risk_assessment',
      title: 'Risk Assessment',
      description: 'Comprehensive risk analysis and predictions',
      icon: '⚠️'
    }
  ];

  if (loading) return <div className="loading">Loading reports...</div>;

  return (
    <div className="reports-generator">
      <div className="generator-header">
        <h2>Reports Center</h2>
        <button
          className="btn-custom-report"
          onClick={() => setShowCustomReport(!showCustomReport)}
        >
          + Create Custom Report
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showCustomReport && (
        <CustomReportForm
          onSubmit={handleScheduleReport}
          onCancel={() => setShowCustomReport(false)}
        />
      )}

      {/* Quick Report Generation */}
      <div className="section">
        <h3>Quick Reports</h3>
        <div className="reports-grid">
          {reportTypes.map((reportType) => (
            <div key={reportType.id} className="report-card">
              <div className="report-icon">{reportType.icon}</div>
              <h4>{reportType.title}</h4>
              <p>{reportType.description}</p>
              <button
                className="btn-generate"
                onClick={() => handleGenerateReport(reportType.id)}
                disabled={generatingReport === reportType.id}
              >
                {generatingReport === reportType.id ? '⏳ Generating...' : 'Generate'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <div className="section">
          <h3>Recent Reports</h3>
          <div className="reports-list">
            {reports.map((report) => (
              <div key={report._id} className="report-item">
                <div className="report-info">
                  <h4>{report.title}</h4>
                  <p className="report-type">{report.type}</p>
                  <div className="report-meta">
                    <span className="generated-date">
                      Generated: {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                    <span className="report-size">
                      {(report.fileSize / 1024).toFixed(2)} KB
                    </span>
                    {report.scheduledRecurrence && (
                      <span className="recurrence">{report.scheduledRecurrence}</span>
                    )}
                  </div>
                </div>
                <div className="report-actions">
                  <button
                    className="btn-download"
                    onClick={() => handleDownloadReport(report._id)}
                  >
                    📥 Download
                  </button>
                  {isAdmin && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteReport(report._id)}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Reports Message */}
      {reports.length === 0 && !showCustomReport && (
        <div className="no-reports">
          <p>📄 No reports generated yet</p>
          <p className="subtitle">Create your first report or generate a quick report using the templates above</p>
        </div>
      )}
    </div>
  );
};

function CustomReportForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'beneficiary_overview',
    dateRange: 'month',
    format: 'pdf',
    includeAnalytics: true,
    includeRecommendations: true,
    scheduleRecurrence: 'none',
    scheduleTime: '09:00'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="custom-report-form">
      <h3>Create Custom Report</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Report Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Monthly Student Progress Report"
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Report Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="beneficiary_overview">Beneficiary Overview</option>
              <option value="academic_performance">Academic Performance</option>
              <option value="attendance_report">Attendance Report</option>
              <option value="financial_summary">Financial Summary</option>
              <option value="support_plan_progress">Support Plan Progress</option>
              <option value="risk_assessment">Risk Assessment</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="form-group">
            <label>Date Range *</label>
            <select
              value={formData.dateRange}
              onChange={(e) => setFormData({...formData, dateRange: e.target.value})}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="semester">This Semester</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Export Format *</label>
            <select
              value={formData.format}
              onChange={(e) => setFormData({...formData, format: e.target.value})}
            >
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="form-group">
            <label>Schedule Recurrence</label>
            <select
              value={formData.scheduleRecurrence}
              onChange={(e) => setFormData({...formData, scheduleRecurrence: e.target.value})}
            >
              <option value="none">No Recurrence</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        <div className="form-checkboxes">
          <label>
            <input
              type="checkbox"
              checked={formData.includeAnalytics}
              onChange={(e) => setFormData({...formData, includeAnalytics: e.target.checked})}
            />
            Include Analytics & Visualizations
          </label>
          <label>
            <input
              type="checkbox"
              checked={formData.includeRecommendations}
              onChange={(e) => setFormData({...formData, includeRecommendations: e.target.checked})}
            />
            Include Recommendations & Insights
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit">Create Report</button>
          <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default ReportsGenerator;
