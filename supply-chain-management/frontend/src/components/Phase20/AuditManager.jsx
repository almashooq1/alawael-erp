/**
 * ALAWAEL ERP - PHASE 20: Audit Manager Component
 * Plan, execute, and report on internal and external audits
 */

import React, { useState } from 'react';
import './AuditManager.css';

const AuditManager = () => {
  const [audits, setAudits] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [activeTab, setActiveTab] = useState('planned');
  const [newAudit, setNewAudit] = useState({
    name: '',
    scope: '',
    objectives: '',
    auditedBy: '',
    scheduledDate: ''
  });
  const [executionForm, setExecutionForm] = useState({
    notes: '',
    findings: ''
  });
  const [resultForm, setResultForm] = useState({
    rating: 'compliant',
    recommendations: ''
  });

  const auditTypes = [
    'Internal Audit',
    'External Audit',
    'Compliance Audit',
    'Financial Audit',
    'Operational Audit',
    'IT Security Audit'
  ];

  const auditStatuses = ['planned', 'scheduled', 'in-progress', 'completed', 'reported'];

  const handleCreateAudit = async () => {
    if (!newAudit.name || !newAudit.scope || !newAudit.objectives) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch('/api/v1/risk-management/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAudit)
      });

      if (response.ok) {
        const created = await response.json();
        setAudits([...audits, created.data]);
        setNewAudit({
          name: '',
          scope: '',
          objectives: '',
          auditedBy: '',
          scheduledDate: ''
        });
        setShowForm(false);
        alert('Audit plan created!');
      }
    } catch (error) {
      console.error('Error creating audit:', error);
    }
  };

  const handleExecuteAudit = async (auditId) => {
    try {
      const response = await fetch(`/api/v1/risk-management/audits/${auditId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(executionForm)
      });

      if (response.ok) {
        const updated = audits.map(a =>
          a.id === auditId ? {...a, status: 'in-progress'} : a
        );
        setAudits(updated);
        setSelectedAudit(null);
        setExecutionForm({ notes: '', findings: '' });
        alert('Audit executed!');
      }
    } catch (error) {
      console.error('Error executing audit:', error);
    }
  };

  const handleDocumentResult = async (auditId) => {
    try {
      const response = await fetch(`/api/v1/risk-management/audits/${auditId}/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultForm)
      });

      if (response.ok) {
        const updated = audits.map(a =>
          a.id === auditId ? {...a, status: 'completed', rating: resultForm.rating} : a
        );
        setAudits(updated);
        setSelectedAudit(null);
        setResultForm({ rating: 'compliant', recommendations: '' });
        alert('Audit result documented!');
      }
    } catch (error) {
      console.error('Error documenting result:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: '#94a3b8',
      scheduled: '#3b82f6',
      'in-progress': '#f59e0b',
      completed: '#10b981',
      reported: '#6b7280'
    };
    return colors[status] || '#9ca3af';
  };

  const getRatingColor = (rating) => {
    const colors = {
      compliant: '#10b981',
      partial: '#f59e0b',
      'non-compliant': '#ef4444'
    };
    return colors[rating] || '#9ca3af';
  };

  const filteredAudits = audits.filter(a => {
    const statusMap = {
      'planned': ['planned'],
      'scheduled': ['scheduled'],
      'in-progress': ['in-progress'],
      'completed': ['completed', 'reported']
    };
    const statuses = statusMap[activeTab] || ['planned'];
    return statuses.includes(a.status);
  });

  return (
    <div className="audit-manager">
      <div className="header">
        <h1>🔍 Audit Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Plan Audit'}
        </button>
      </div>

      {showForm && (
        <div className="audit-form">
          <h3>Plan New Audit</h3>
          <div className="form-group">
            <label>Audit Name *</label>
            <input
              type="text"
              placeholder="e.g., Q1 Financial Audit"
              value={newAudit.name}
              onChange={(e) => setNewAudit({...newAudit, name: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Audit Type</label>
              <select>
                {auditTypes.map(type => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Scheduled Date</label>
              <input
                type="date"
                value={newAudit.scheduledDate}
                onChange={(e) => setNewAudit({...newAudit, scheduledDate: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Scope *</label>
            <textarea
              placeholder="What areas will be audited?"
              rows="3"
              value={newAudit.scope}
              onChange={(e) => setNewAudit({...newAudit, scope: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Objectives *</label>
            <textarea
              placeholder="What are the main audit objectives?"
              rows="3"
              value={newAudit.objectives}
              onChange={(e) => setNewAudit({...newAudit, objectives: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Auditor/Team</label>
            <input
              type="text"
              placeholder="Who will conduct the audit?"
              value={newAudit.auditedBy}
              onChange={(e) => setNewAudit({...newAudit, auditedBy: e.target.value})}
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreateAudit}>
              ✓ Create Audit Plan
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="tabs">
        {['planned', 'scheduled', 'in-progress', 'completed'].map(tab => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.replace('-', ' ').toUpperCase()}
            <span className="count">({audits.filter(a => a.status?.includes(tab)).length})</span>
          </button>
        ))}
      </div>

      <div className="audits-list">
        {filteredAudits.length === 0 ? (
          <p className="empty-state">No audits in this category</p>
        ) : (
          filteredAudits.map((audit) => (
            <div key={audit.id} className="audit-card">
              <div className="audit-header">
                <div>
                  <h3>{audit.name}</h3>
                  <p className="objectives">{audit.objectives}</p>
                </div>
                <div 
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(audit.status) }}
                >
                  {(audit.status || 'planned').toUpperCase()}
                </div>
              </div>

              <div className="audit-details">
                <div className="detail-item">
                  <label>Scope</label>
                  <p>{audit.scope}</p>
                </div>

                {audit.auditedBy && (
                  <div className="detail-item">
                    <label>Audited By</label>
                    <p>👤 {audit.auditedBy}</p>
                  </div>
                )}

                {audit.scheduledDate && (
                  <div className="detail-item">
                    <label>Scheduled</label>
                    <p>📅 {new Date(audit.scheduledDate).toLocaleDateString()}</p>
                  </div>
                )}

                {audit.rating && (
                  <div className="detail-item">
                    <div 
                      className="rating-badge"
                      style={{ backgroundColor: getRatingColor(audit.rating) }}
                    >
                      {audit.rating.toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="audit-actions">
                {audit.status === 'planned' && (
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedAudit({...audit, action: 'execute'});
                    }}
                  >
                    ▶️ Execute
                  </button>
                )}

                {audit.status === 'in-progress' && (
                  <button 
                    className="btn-secondary"
                    onClick={() => {
                      setSelectedAudit({...audit, action: 'result'});
                    }}
                  >
                    ✓ Document Result
                  </button>
                )}

                {audit.status === 'completed' && (
                  <button className="btn-secondary">
                    📄 View Report
                  </button>
                )}

                <button className="btn-secondary">📋 View Details</button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedAudit && selectedAudit.action === 'execute' && (
        <div className="modal-overlay" onClick={() => setSelectedAudit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Execute Audit: {selectedAudit.name}</h3>

            <div className="form-group">
              <label>Audit Notes</label>
              <textarea
                placeholder="Notes from the audit execution"
                rows="4"
                value={executionForm.notes}
                onChange={(e) => setExecutionForm({...executionForm, notes: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Findings</label>
              <textarea
                placeholder="Findings and observations"
                rows="4"
                value={executionForm.findings}
                onChange={(e) => setExecutionForm({...executionForm, findings: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={() => handleExecuteAudit(selectedAudit.id)}
              >
                ✓ Execute
              </button>
              <button className="btn-secondary" onClick={() => setSelectedAudit(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAudit && selectedAudit.action === 'result' && (
        <div className="modal-overlay" onClick={() => setSelectedAudit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Document Result: {selectedAudit.name}</h3>

            <div className="form-group">
              <label>Audit Rating *</label>
              <select
                value={resultForm.rating}
                onChange={(e) => setResultForm({...resultForm, rating: e.target.value})}
              >
                <option value="compliant">✅ Compliant</option>
                <option value="partial">⚠️ Partial</option>
                <option value="non-compliant">❌ Non-Compliant</option>
              </select>
            </div>

            <div className="form-group">
              <label>Recommendations</label>
              <textarea
                placeholder="Recommendations for improvement"
                rows="4"
                value={resultForm.recommendations}
                onChange={(e) => setResultForm({...resultForm, recommendations: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button 
                className="btn-primary"
                onClick={() => handleDocumentResult(selectedAudit.id)}
              >
                ✓ Document Result
              </button>
              <button className="btn-secondary" onClick={() => setSelectedAudit(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditManager;
