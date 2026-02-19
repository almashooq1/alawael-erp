/**
 * ALAWAEL ERP - PHASE 20: Compliance Tracker Component
 * Track and manage compliance controls and frameworks
 */

import React, { useState } from 'react';
import './ComplianceTracker.css';

const ComplianceTracker = () => {
  const [controls, setControls] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedControl, setSelectedControl] = useState(null);
  const [newControl, setNewControl] = useState({
    name: '',
    framework: 'ISO27001',
    requirement: '',
    owner: ''
  });
  const [evidenceForm, setEvidenceForm] = useState({
    document: '',
    description: ''
  });

  const frameworks = [
    { value: 'ISO27001', label: '🔐 ISO 27001 - Information Security' },
    { value: 'GDPR', label: '📋 GDPR - Data Protection' },
    { value: 'HIPAA', label: '🏥 HIPAA - Healthcare' },
    { value: 'PCI-DSS', label: '💳 PCI-DSS - Payment Security' },
    { value: 'SOX', label: '📊 SOX - Financial Reporting' }
  ];

  const handleCreateControl = async () => {
    if (!newControl.name || !newControl.requirement) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch('/api/v1/risk-management/compliance-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newControl)
      });

      if (response.ok) {
        const created = await response.json();
        setControls([...controls, created.data]);
        setNewControl({
          name: '',
          framework: 'ISO27001',
          requirement: '',
          owner: ''
        });
        setShowForm(false);
        alert('Compliance control created!');
      }
    } catch (error) {
      console.error('Error creating control:', error);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!evidenceForm.document || !selectedControl) {
      alert('Please fill in document information');
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/risk-management/compliance-controls/${selectedControl.id}/evidence`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(evidenceForm)
        }
      );

      if (response.ok) {
        setEvidenceForm({ document: '', description: '' });
        alert('Evidence submitted!');
      }
    } catch (error) {
      console.error('Error submitting evidence:', error);
    }
  };

  const handleUpdateStatus = async (controlId, newStatus) => {
    try {
      const response = await fetch(
        `/api/v1/risk-management/compliance-controls/${controlId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        }
      );

      if (response.ok) {
        const updated = controls.map(c =>
          c.id === controlId ? {...c, status: newStatus} : c
        );
        setControls(updated);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: '#3b82f6',
      implemented: '#f59e0b',
      compliant: '#10b981',
      non_compliant: '#ef4444',
      partial: '#8b5cf6'
    };
    return colors[status] || '#6b7280';
  };

  const getFrameworkLabel = (framework) => {
    return frameworks.find(f => f.value === framework)?.label || framework;
  };

  return (
    <div className="compliance-tracker">
      <div className="header">
        <h1>✅ Compliance Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ New Control'}
        </button>
      </div>

      {showForm && (
        <div className="control-form">
          <h3>Define Compliance Control</h3>
          <div className="form-group">
            <label>Control Name *</label>
            <input
              type="text"
              placeholder="e.g., Data Encryption"
              value={newControl.name}
              onChange={(e) => setNewControl({...newControl, name: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Framework *</label>
              <select
                value={newControl.framework}
                onChange={(e) => setNewControl({...newControl, framework: e.target.value})}
              >
                {frameworks.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Owner</label>
              <input
                type="text"
                placeholder="Department or person"
                value={newControl.owner}
                onChange={(e) => setNewControl({...newControl, owner: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Requirement *</label>
            <textarea
              placeholder="Specific compliance requirement"
              rows="3"
              value={newControl.requirement}
              onChange={(e) => setNewControl({...newControl, requirement: e.target.value})}
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreateControl}>
              ✓ Create Control
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedControl && (
        <div className="evidence-modal">
          <div className="modal-content">
            <h3>Submit Evidence: {selectedControl.name}</h3>
            
            <div className="form-group">
              <label>Document/Evidence *</label>
              <input
                type="text"
                placeholder="Document name or reference"
                value={evidenceForm.document}
                onChange={(e) => setEvidenceForm({...evidenceForm, document: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="How this evidence meets the requirement"
                rows="3"
                value={evidenceForm.description}
                onChange={(e) => setEvidenceForm({...evidenceForm, description: e.target.value})}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-primary" onClick={handleSubmitEvidence}>
                ✓ Submit Evidence
              </button>
              <button className="btn-secondary" onClick={() => setSelectedControl(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="controls-grid">
        <div className="controls-by-framework">
          {frameworks.map(framework => {
            const frameworkControls = controls.filter(c => c.framework === framework.value);
            return (
              <div key={framework.value} className="framework-section">
                <h3>{framework.label}</h3>
                {frameworkControls.length === 0 ? (
                  <p className="empty">No controls yet</p>
                ) : (
                  <div className="controls-list">
                    {frameworkControls.map(control => (
                      <div key={control.id} className="control-card">
                        <div className="control-header">
                          <h4>{control.name}</h4>
                          <div 
                            className="status-badge"
                            style={{ backgroundColor: getStatusColor(control.status) }}
                          >
                            {(control.status || 'planned').replace('_', ' ').toUpperCase()}
                          </div>
                        </div>

                        <p className="requirement">{control.requirement}</p>

                        {control.owner && (
                          <div className="owner">👤 {control.owner}</div>
                        )}

                        <div className="progress-tracker">
                          <label>Evidence Progress</label>
                          <div className="progress-bar">
                            <div 
                              style={{ 
                                width: `${((control.evidenceProvided || 0) / (control.evidenceRequired || 1) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="progress-text">
                            {control.evidenceProvided || 0}/{control.evidenceRequired || 1}
                          </span>
                        </div>

                        <div className="control-actions">
                          <button 
                            className="btn-secondary"
                            onClick={() => setSelectedControl(control)}
                          >
                            📄 Add Evidence
                          </button>

                          <select
                            value={control.status || 'planned'}
                            onChange={(e) => handleUpdateStatus(control.id, e.target.value)}
                            className="status-select"
                          >
                            <option value="planned">Planned</option>
                            <option value="implemented">Implemented</option>
                            <option value="compliant">Compliant</option>
                            <option value="partial">Partial</option>
                            <option value="non_compliant">Non-Compliant</option>
                          </select>

                          <button className="btn-secondary">📋 View Details</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="status-legend">
        <h4>Status Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Planned</span>
          </div>
          <div className="legend-item">
            <div style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Implemented</span>
          </div>
          <div className="legend-item">
            <div style={{ backgroundColor: '#10b981' }}></div>
            <span>Compliant</span>
          </div>
          <div className="legend-item">
            <div style={{ backgroundColor: '#8b5cf6' }}></div>
            <span>Partial</span>
          </div>
          <div className="legend-item">
            <div style={{ backgroundColor: '#ef4444' }}></div>
            <span>Non-Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceTracker;
