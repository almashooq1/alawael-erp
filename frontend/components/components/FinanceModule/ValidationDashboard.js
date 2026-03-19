/**
 * ValidationDashboard.js - Financial Validation & Compliance Dashboard
 * Tracks violations, compliance rates, and enforcement actions
 */

import React, { useState, useEffect } from 'react';
import './ValidationDashboard.css';

const ValidationDashboard = ({ organizationId }) => {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedViolation, setSelectedViolation] = useState(null);

  const [filters, setFilters] = useState({
    severity: 'all',
    type: 'all',
    dateRange: 'month',
    status: 'all'
  });

  const [stats, setStats] = useState({
    totalViolations: 0,
    criticalCount: 0,
    complianceRate: 0,
    resolvedCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });

  useEffect(() => {
    fetchViolations();
  }, [organizationId, filters]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        organizationId,
        severity: filters.severity,
        type: filters.type,
        dateRange: filters.dateRange,
        status: filters.status
      });

      const response = await fetch(`/api/finance/validation/violations?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch violations');

      const data = await response.json();
      setViolations(data.data.violations || []);

      // Calculate statistics
      calculateStats(data.data.violations || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (violationList) => {
    const total = violationList.length;
    const critical = violationList.filter(v => v.severity === 'CRITICAL').length;
    const resolved = violationList.filter(v => v.status === 'RESOLVED').length;
    const pending = violationList.filter(v => v.status === 'PENDING').length;
    const overdue = violationList.filter(v => v.isOverdue).length;

    setStats({
      totalViolations: total,
      criticalCount: critical,
      complianceRate: total === 0 ? 100 : Math.round((resolved / total) * 100),
      resolvedCount: resolved,
      pendingCount: pending,
      overdueCount: overdue
    });
  };

  const handleResolveViolation = async (violationId, resolutionNotes) => {
    try {
      const response = await fetch(`/api/finance/validation/violations/${violationId}/resolve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolutionNotes, resolvedAt: new Date() })
      });

      if (!response.ok) throw new Error('Failed to resolve violation');

      fetchViolations();
      setSelectedViolation(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRefreshData = async () => {
    await fetchViolations();
  };

  const filteredViolations = violations.filter(v => {
    if (filters.severity !== 'all' && v.severity !== filters.severity) return false;
    if (filters.type !== 'all' && v.type !== filters.type) return false;
    if (filters.status !== 'all' && v.status !== filters.status) return false;
    return true;
  });

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': '#ff4444',
      'HIGH': '#ff8800',
      'MEDIUM': '#ffbb33',
      'LOW': '#00C851'
    };
    return colors[severity] || '#999';
  };

  if (loading) return <div className="loading">Loading validation data...</div>;

  return (
    <div className="validation-dashboard">
      <div className="dashboard-header">
        <h2>💼 Financial Validation & Compliance</h2>
        <button className="btn-refresh" onClick={handleRefreshData}>
          🔄 Refresh Data
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Statistics Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number" style={{ color: stats.complianceRate > 80 ? '#00C851' : '#ff8800' }}>
            {stats.complianceRate}%
          </div>
          <div className="stat-label">Compliance Rate</div>
          <div className="stat-bar">
            <div className="stat-fill" style={{ width: `${stats.complianceRate}%`, backgroundColor: stats.complianceRate > 80 ? '#00C851' : '#ff8800' }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-number" style={{ color: '#ff4444' }}>
            {stats.totalViolations}
          </div>
          <div className="stat-label">Total Violations</div>
          <div className="stat-detail">{stats.criticalCount} Critical</div>
        </div>

        <div className="stat-card">
          <div className="stat-number" style={{ color: '#00C851' }}>
            {stats.resolvedCount}
          </div>
          <div className="stat-label">Resolved</div>
          <div className="stat-detail">{Math.round((stats.resolvedCount / stats.totalViolations) * 100)}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-number" style={{ color: '#ff8800' }}>
            {stats.overdueCount}
          </div>
          <div className="stat-label">Overdue</div>
          <div className="stat-detail">Requires Action</div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="filter-section">
        <div className="filter-group">
          <label>Severity:</label>
          <select
            value={filters.severity}
            onChange={(e) => setFilters({...filters, severity: e.target.value})}
          >
            <option value="all">All Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Type:</label>
          <select
            value={filters.type}
            onChange={(e) => setFilters({...filters, type: e.target.value})}
          >
            <option value="all">All Types</option>
            <option value="BALANCE_MISMATCH">Balance Mismatch</option>
            <option value="MISSING_DOCUMENTATION">Missing Documentation</option>
            <option value="UNAUTHORIZED_TRANSACTION">Unauthorized Transaction</option>
            <option value="POLICY_VIOLATION">Policy Violation</option>
            <option value="RECONCILIATION_FAILURE">Reconciliation Failure</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Date Range:</label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>

        <button
          className="btn-reset-filters"
          onClick={() => setFilters({
            severity: 'all',
            type: 'all',
            dateRange: 'month',
            status: 'all'
          })}
        >
          Reset Filters
        </button>
      </div>

      {/* Violations Table */}
      <div className="violations-table">
        <h3>Violations List</h3>
        {filteredViolations.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Description</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredViolations.map((violation, idx) => (
                <tr key={violation._id} className={`severity-${violation.severity}`}>
                  <td>{idx + 1}</td>
                  <td>{new Date(violation.detectedAt).toLocaleDateString()}</td>
                  <td>{violation.type}</td>
                  <td>
                    <span
                      className="severity-badge"
                      style={{ backgroundColor: getSeverityColor(violation.severity) }}
                    >
                      {violation.severity}
                    </span>
                  </td>
                  <td>{violation.description}</td>
                  <td>
                    <span className={`status-badge status-${violation.status}`}>
                      {violation.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => setSelectedViolation(violation)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No violations found</p>
        )}
      </div>

      {/* Detail Modal */}
      {selectedViolation && (
        <div className="modal-overlay" onClick={() => setSelectedViolation(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedViolation(null)}>✕</button>

            <h2>Violation Details</h2>

            <div className="violation-details">
              <div className="detail-section">
                <h3>Basic Information</h3>
                <p><strong>Type:</strong> {selectedViolation.type}</p>
                <p><strong>Severity:</strong> <span style={{ color: getSeverityColor(selectedViolation.severity) }}>{selectedViolation.severity}</span></p>
                <p><strong>Detected:</strong> {new Date(selectedViolation.detectedAt).toLocaleString()}</p>
                <p><strong>Description:</strong> {selectedViolation.description}</p>
              </div>

              <div className="detail-section">
                <h3>Details</h3>
                <p><strong>Affected Records:</strong> {selectedViolation.affectedRecords?.length || 0}</p>
                <p><strong>Amount:</strong> ${selectedViolation.amount?.toLocaleString() || 'N/A'}</p>
                {selectedViolation.affectedRecords && (
                  <div className="affected-records">
                    <strong>Records:</strong>
                    <ul>
                      {selectedViolation.affectedRecords.map((record, idx) => (
                        <li key={idx}>{record}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {selectedViolation.status === 'PENDING' && (
                <div className="detail-section">
                  <h3>Resolution</h3>
                  <ResolutionForm
                    onSubmit={(notes) => handleResolveViolation(selectedViolation._id, notes)}
                    onCancel={() => setSelectedViolation(null)}
                  />
                </div>
              )}

              {selectedViolation.resolution && (
                <div className="detail-section">
                  <h3>Resolution History</h3>
                  <p><strong>Status:</strong> {selectedViolation.status}</p>
                  <p><strong>Resolved By:</strong> {selectedViolation.resolution.resolvedBy}</p>
                  <p><strong>Resolved At:</strong> {new Date(selectedViolation.resolution.resolvedAt).toLocaleString()}</p>
                  <p><strong>Notes:</strong> {selectedViolation.resolution.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ResolutionForm({ onSubmit, onCancel }) {
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (notes.trim()) {
      onSubmit(notes);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Resolution Notes *</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe how this violation was resolved..."
          required
          rows="4"
        />
      </div>
      <div className="form-actions">
        <button type="submit" className="btn-submit">Mark as Resolved</button>
        <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
      </div>
    </form>
  );
}

export default ValidationDashboard;
