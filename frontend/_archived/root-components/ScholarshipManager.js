/**
 * ScholarshipManager.js - Scholarship Application & Management Component
 * Manage scholarship applications and approvals
 */

import React, { useState, useEffect } from 'react';
import './ScholarshipManager.css';

const ScholarshipManager = ({ beneficiaryId, isAdmin = false }) => {
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchScholarships();
  }, [beneficiaryId]);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/scholarships?beneficiaryId=${beneficiaryId}`);

      if (!response.ok) throw new Error('Failed to fetch scholarships');

      const data = await response.json();
      setScholarships(data.data.scholarships || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyForScholarship = async (formData) => {
    try {
      const response = await fetch('/api/scholarships/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to submit application');

      setShowApplicationForm(false);
      fetchScholarships();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApproveScholarship = async (scholarshipId, approvedAmount) => {
    if (!isAdmin) return;

    try {
      const response = await fetch(`/api/scholarships/${scholarshipId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedAmount,
          approvedBy: 'admin'
        })
      });

      if (!response.ok) throw new Error('Failed to approve scholarship');

      fetchScholarships();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredScholarships = scholarships.filter(s =>
    filterStatus === 'all' || s.applicationStatus === filterStatus
  );

  if (loading) {
    return <div className="loading">Loading scholarships...</div>;
  }

  return (
    <div className="scholarship-manager">
      <div className="manager-header">
        <h2>Scholarship Management</h2>
        <div className="header-actions">
          <button
            className="btn-apply"
            onClick={() => setShowApplicationForm(!showApplicationForm)}
          >
            + Apply for Scholarship
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
        </div>
      )}

      {/* Application Form */}
      {showApplicationForm && (
        <ScholarshipApplicationForm
          onSubmit={handleApplyForScholarship}
          onCancel={() => setShowApplicationForm(false)}
        />
      )}

      {/* Filter */}
      <div className="filter-section">
        <label>Filter by Status:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {/* Scholarships List */}
      <div className="scholarships-list">
        {filteredScholarships.length > 0 ? (
          filteredScholarships.map((scholarship) => (
            <div
              key={scholarship._id}
              className={`scholarship-card status-${scholarship.applicationStatus}`}
            >
              <div className="card-header">
                <h3>{scholarship.programName}</h3>
                <span className={`status-badge status-${scholarship.applicationStatus}`}>
                  {scholarship.applicationStatus}
                </span>
              </div>

              <div className="card-body">
                <div className="info-row">
                  <span className="label">Type:</span>
                  <span className="value">{scholarship.scholarshipType.replace(/_/g, ' ')}</span>
                </div>
                <div className="info-row">
                  <span className="label">Requested Amount:</span>
                  <span className="value">${scholarship.requestedAmount.toLocaleString()}</span>
                </div>
                {scholarship.approvedAmount && (
                  <div className="info-row">
                    <span className="label">Approved Amount:</span>
                    <span className="value approved">${scholarship.approvedAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">Academic Year:</span>
                  <span className="value">{scholarship.academicYear}</span>
                </div>
                <div className="info-row">
                  <span className="label">Application Date:</span>
                  <span className="value">{new Date(scholarship.applicationDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Performance Monitoring */}
              {scholarship.performanceMonitoring && scholarship.performanceMonitoring.length > 0 && (
                <div className="card-section">
                  <h4>Performance</h4>
                  {scholarship.performanceMonitoring.map((check, idx) => (
                    <div key={idx} className="performance-item">
                      <span>GPA: {check.currentGPA} | Attendance: {check.attendanceRate}%</span>
                      {check.alert && <span className="alert-flag">⚠️ Alert</span>}
                    </div>
                  ))}
                </div>
              )}

              {/* Disbursements */}
              {scholarship.disbursements && scholarship.disbursements.length > 0 && (
                <div className="card-section">
                  <h4>Disbursements</h4>
                  {scholarship.disbursements.map((disb, idx) => (
                    <div key={idx} className="disbursement-item">
                      <p>${disb.amount} - {disb.method} ({disb.status})</p>
                      <small>{new Date(disb.disbursementDate).toLocaleDateString()}</small>
                    </div>
                  ))}
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && scholarship.applicationStatus === 'PENDING' && (
                <div className="admin-actions">
                  <input
                    type="number"
                    placeholder="Approved Amount"
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleApproveScholarship(scholarship._id, parseInt(e.target.value));
                      }
                    }}
                  />
                  <button
                    className="btn-approve"
                    onClick={() => handleApproveScholarship(scholarship._id, scholarship.requestedAmount)}
                  >
                    ✓ Approve
                  </button>
                </div>
              )}

              <button
                className="btn-view-details"
                onClick={() => setSelectedScholarship(scholarship)}
              >
                View Details →
              </button>
            </div>
          ))
        ) : (
          <p className="no-data">No scholarships found</p>
        )}
      </div>

      {/* Modal for Details */}
      {selectedScholarship && (
        <div className="modal-overlay" onClick={() => setSelectedScholarship(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedScholarship(null)}>✕</button>
            <h2>{selectedScholarship.programName}</h2>
            <div className="modal-body">
              <p><strong>Status:</strong> {selectedScholarship.applicationStatus}</p>
              <p><strong>Amount Requested:</strong> ${selectedScholarship.requestedAmount}</p>
              <p><strong>Amount Approved:</strong> ${selectedScholarship.approvedAmount || 'Pending'}</p>
              <p><strong>Amount Disbursed:</strong> ${selectedScholarship.disbursedAmount || 0}</p>
              <p><strong>Academic Year:</strong> {selectedScholarship.academicYear}</p>
              {selectedScholarship.approvalNotes && (
                <p><strong>Approval Notes:</strong> {selectedScholarship.approvalNotes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function ScholarshipApplicationForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    programName: '',
    scholarshipType: 'partial_tuition',
    requestedAmount: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="scholarship-form">
      <h3>Apply for Scholarship</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Program Name *</label>
          <input
            type="text"
            value={formData.programName}
            onChange={(e) => setFormData({...formData, programName: e.target.value})}
            required
          />
        </div>
        <div className="form-group">
          <label>Scholarship Type *</label>
          <select
            value={formData.scholarshipType}
            onChange={(e) => setFormData({...formData, scholarshipType: e.target.value})}
          >
            <option value="full_tuition">Full Tuition</option>
            <option value="partial_tuition">Partial Tuition</option>
            <option value="living_stipend">Living Stipend</option>
            <option value="book_allowance">Book Allowance</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div className="form-group">
          <label>Requested Amount *</label>
          <input
            type="number"
            value={formData.requestedAmount}
            onChange={(e) => setFormData({...formData, requestedAmount: e.target.value})}
            required
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-submit">Submit Application</button>
          <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default ScholarshipManager;
