/**
 * AnalyticsDashboard.js - Advanced Analytics & Insights Component
 * Comprehensive beneficiary analytics and predictive insights
 */

import React, { useState, useEffect } from 'react';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = ({ beneficiaryId }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDomain, setSelectedDomain] = useState('overall');
  const [dateRange, setDateRange] = useState('semester');
  const [exportFormat, setExportFormat] = useState('pdf');

  useEffect(() => {
    fetchAnalytics();
  }, [beneficiaryId, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/${beneficiaryId}?dateRange=${dateRange}`
      );

      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/analytics/${beneficiaryId}/export?format=${exportFormat}`,
        { method: 'GET' }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_report_${new Date().getTime()}.${exportFormat}`;
      link.click();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading analytics...</div>;
  if (!analytics) return <div className="error">No analytics data available</div>;

  const domains = [
    { id: 'academic', label: 'Academic', icon: '📚' },
    { id: 'attendance', label: 'Attendance', icon: '📅' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'health', label: 'Health', icon: '❤️' },
    { id: 'skills', label: 'Skills', icon: '⭐' }
  ];

  const riskLevel = analytics.overallRiskScore > 70 ? 'HIGH' :
                    analytics.overallRiskScore > 40 ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? '#ff6b6b' :
                    riskLevel === 'MEDIUM' ? '#ffd93d' : '#6bcf7f';

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h2>Analytics & Insights</h2>
        <div className="header-controls">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="date-range-select"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="semester">This Semester</option>
            <option value="year">This Year</option>
          </select>
          <div className="export-controls">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="excel">Excel</option>
            </select>
            <button onClick={handleExport} className="btn-export">
              📥 Export Report
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Overall Risk Assessment */}
      <div className="risk-assessment">
        <div className="risk-card">
          <h3>Overall Risk Assessment</h3>
          <div className="risk-gauge">
            <div className="risk-score" style={{ color: riskColor }}>
              {analytics.overallRiskScore}%
            </div>
            <div className="risk-level" style={{ backgroundColor: riskColor }}>
              {riskLevel} RISK
            </div>
          </div>
          <p className="risk-description">
            {analytics.riskDescription || 'Assessment based on academic, attendance, and financial factors'}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="key-metrics">
          <div className="metric">
            <span className="metric-label">GPA Trend</span>
            <span className="metric-value">{analytics.gpaTrend}%</span>
            <span className={`trend-indicator trend-${analytics.gpaTrend > 0 ? 'up' : 'down'}`}>
              {analytics.gpaTrend > 0 ? '↗' : '↘'}
            </span>
          </div>
          <div className="metric">
            <span className="metric-label">Attendance Rate</span>
            <span className="metric-value">{analytics.attendanceRate}%</span>
          </div>
          <div className="metric">
            <span className="metric-label">Engagement Score</span>
            <span className="metric-value">{analytics.engagementScore}/100</span>
          </div>
          <div className="metric">
            <span className="metric-label">Financial Status</span>
            <span className="metric-value">{analytics.financialStatus}</span>
          </div>
        </div>
      </div>

      {/* Domain Analysis */}
      <div className="domain-analysis">
        <h3>Domain-Specific Analysis</h3>

        {/* Domain Tabs */}
        <div className="domain-tabs">
          <button
            className={`tab ${selectedDomain === 'overall' ? 'active' : ''}`}
            onClick={() => setSelectedDomain('overall')}
          >
            Overall
          </button>
          {domains.map((domain) => (
            <button
              key={domain.id}
              className={`tab ${selectedDomain === domain.id ? 'active' : ''}`}
              onClick={() => setSelectedDomain(domain.id)}
            >
              {domain.icon} {domain.label}
            </button>
          ))}
        </div>

        {/* Domain Content */}
        <div className="domain-content">
          {selectedDomain === 'overall' ? (
            <div className="overall-analysis">
              {domains.map((domain) => {
                const domainData = analytics.domainAnalysis?.[domain.id] || {};
                return (
                  <div key={domain.id} className="domain-card">
                    <h4>{domain.icon} {domain.label}</h4>
                    <div className="domain-metrics">
                      <div className="metric-item">
                        <span>Score:</span>
                        <strong>{domainData.score || 'N/A'}/100</strong>
                      </div>
                      <div className="metric-item">
                        <span>Status:</span>
                        <strong>{domainData.status || 'Unknown'}</strong>
                      </div>
                    </div>
                    <div className="domain-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${domainData.score || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="detailed-analysis">
              {analytics.domainAnalysis?.[selectedDomain] && (
                <>
                  <div className="analysis-section">
                    <h4>Current Status</h4>
                    <p className="analysis-text">
                      {analytics.domainAnalysis[selectedDomain].description || 'No specific analysis available'}
                    </p>
                  </div>

                  {analytics.domainAnalysis[selectedDomain].trends && (
                    <div className="analysis-section">
                      <h4>Trends</h4>
                      {analytics.domainAnalysis[selectedDomain].trends.map((trend, idx) => (
                        <div key={idx} className="trend-item">
                          <p>{trend}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {analytics.domainAnalysis[selectedDomain].recommendations && (
                    <div className="analysis-section recommendations">
                      <h4>Recommendations</h4>
                      <ul>
                        {analytics.domainAnalysis[selectedDomain].recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Predictive Indicators */}
      {analytics.predictions && (
        <div className="predictions-section">
          <h3>🔮 Predictive Indicators</h3>
          <div className="predictions-grid">
            {analytics.predictions.map((pred, idx) => (
              <div key={idx} className="prediction-card">
                <h4>{pred.title}</h4>
                <div className="prediction-probability">
                  <div className="probability-value">{pred.probability}%</div>
                </div>
                <p className="prediction-description">{pred.description}</p>
                {pred.suggestedActions && (
                  <div className="suggested-actions">
                    <strong>Suggested Actions:</strong>
                    <ul>
                      {pred.suggestedActions.map((action, i) => (
                        <li key={i}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intervention Recommendations */}
      {analytics.interventionRecommendations && analytics.interventionRecommendations.length > 0 && (
        <div className="interventions-section">
          <h3>Recommended Interventions</h3>
          <div className="interventions-list">
            {analytics.interventionRecommendations.map((intervention, idx) => (
              <div key={idx} className={`intervention-item priority-${intervention.priority}`}>
                <div className="intervention-header">
                  <h4>{intervention.title}</h4>
                  <span className="priority-badge">{intervention.priority}</span>
                </div>
                <p>{intervention.description}</p>
                <p className="impact">Expected Impact: {intervention.expectedImpact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparative Analysis */}
      {analytics.comparativeMetrics && (
        <div className="comparative-section">
          <h3>Comparative Analysis</h3>
          <div className="comparison-grid">
            <div className="comparison-card">
              <h4>Beneficiary vs Cohort Average</h4>
              <div className="comparison-item">
                <span>GPA:</span>
                <div className="comparison-bars">
                  <div className="bar beneficiary" style={{ height: `${analytics.comparativeMetrics.gpaBeneficiary}%` }}>
                    <span>Your: {analytics.comparativeMetrics.gpaBeneficiary}%</span>
                  </div>
                  <div className="bar cohort" style={{ height: `${analytics.comparativeMetrics.gpaCohort}%` }}>
                    <span>Avg: {analytics.comparativeMetrics.gpaCohort}%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="comparison-card">
              <h4>Completion Rate</h4>
              <div className="comparison-item">
                <span>Completion:</span>
                <div className="comparison-bars">
                  <div className="bar beneficiary" style={{ height: `${analytics.comparativeMetrics.completionBeneficiary}%` }}>
                    <span>Your: {analytics.comparativeMetrics.completionBeneficiary}%</span>
                  </div>
                  <div className="bar cohort" style={{ height: `${analytics.comparativeMetrics.completionCohort}%` }}>
                    <span>Avg: {analytics.comparativeMetrics.completionCohort}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
