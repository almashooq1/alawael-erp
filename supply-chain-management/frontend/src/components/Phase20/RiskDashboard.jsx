/**
 * ALAWAEL ERP - PHASE 20: Risk Dashboard Component
 * Identify, assess, and track enterprise risks
 */

import React, { useState, useEffect } from 'react';
import './RiskDashboard.css';

const RiskDashboard = () => {
  const [risks, setRisks] = useState([]);
  const [report, setReport] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [newRisk, setNewRisk] = useState({
    name: '',
    category: 'operational',
    description: '',
    owner: ''
  });

  const riskCategories = [
    'operational',
    'financial',
    'compliance',
    'strategic',
    'reputational'
  ];

  const riskLevels = [
    { level: 'critical', color: '#dc2626', range: '20+' },
    { level: 'high', color: '#f97316', range: '12-19' },
    { level: 'medium', color: '#eab308', range: '6-11' },
    { level: 'low', color: '#22c55e', range: '3-5' },
    { level: 'minimal', color: '#6b7280', range: '1-2' }
  ];

  useEffect(() => {
    fetchRisks();
    fetchReport();
  }, [filterCategory, filterLevel]);

  const fetchRisks = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.append('category', filterCategory);

      const response = await fetch(`/api/v1/risk-management/risks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setRisks(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching risks:', error);
    }
  };

  const fetchReport = async () => {
    try {
      const response = await fetch('/api/v1/risk-management/reports/risks');
      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  };

  const handleCreateRisk = async () => {
    if (!newRisk.name || !newRisk.description) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const response = await fetch('/api/v1/risk-management/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRisk)
      });

      if (response.ok) {
        setNewRisk({ name: '', category: 'operational', description: '', owner: '' });
        setShowForm(false);
        fetchRisks();
        fetchReport();
        alert('Risk identified successfully!');
      }
    } catch (error) {
      console.error('Error creating risk:', error);
    }
  };

  const handleAssessRisk = async (riskId) => {
    const likelihood = parseInt(prompt('Likelihood (1-5):') || '3');
    const impact = parseInt(prompt('Impact (1-5):') || '3');

    if (isNaN(likelihood) || isNaN(impact)) return;

    try {
      const response = await fetch(`/api/v1/risk-management/risks/${riskId}/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likelihood, impact })
      });

      if (response.ok) {
        fetchRisks();
        fetchReport();
        alert('Risk assessment completed!');
      }
    } catch (error) {
      console.error('Error assessing risk:', error);
    }
  };

  const getRiskLevelColor = (score) => {
    const numScore = parseInt(score) || 0;
    if (numScore >= 20) return '#dc2626';
    if (numScore >= 12) return '#f97316';
    if (numScore >= 6) return '#eab308';
    if (numScore >= 3) return '#22c55e';
    return '#6b7280';
  };

  const getRiskLevelLabel = (score) => {
    const numScore = parseInt(score) || 0;
    if (numScore >= 20) return 'CRITICAL';
    if (numScore >= 12) return 'HIGH';
    if (numScore >= 6) return 'MEDIUM';
    if (numScore >= 3) return 'LOW';
    return 'MINIMAL';
  };

  const filteredRisks = risks.filter(risk => {
    if (filterLevel === 'all') return true;
    const label = getRiskLevelLabel(risk.riskScore);
    return label === filterLevel;
  });

  return (
    <div className="risk-dashboard">
      <div className="header">
        <h1>⚠️ Risk Management</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Cancel' : '+ Identify Risk'}
        </button>
      </div>

      {showForm && (
        <div className="risk-form">
          <h3>Identify New Risk</h3>
          <div className="form-group">
            <label>Risk Name *</label>
            <input
              type="text"
              placeholder="e.g., Data Breach Risk"
              value={newRisk.name}
              onChange={(e) => setNewRisk({...newRisk, name: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                value={newRisk.category}
                onChange={(e) => setNewRisk({...newRisk, category: e.target.value})}
              >
                {riskCategories.map(cat => (
                  <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Risk Owner</label>
              <input
                type="text"
                placeholder="Department or person"
                value={newRisk.owner}
                onChange={(e) => setNewRisk({...newRisk, owner: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description *</label>
            <textarea
              placeholder="Detailed description of the risk"
              rows="4"
              value={newRisk.description}
              onChange={(e) => setNewRisk({...newRisk, description: e.target.value})}
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" onClick={handleCreateRisk}>
              ✓ Identify Risk
            </button>
            <button className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {report && (
        <div className="report-section">
          <h2>📊 Risk Report Summary</h2>
          <div className="report-grid">
            <div className="report-card">
              <h4>Total Risks</h4>
              <div className="value">{report.totalRisks || 0}</div>
            </div>

            <div className="report-card">
              <h4>Average Risk Score</h4>
              <div className="value">{(report.avgRiskScore || 0).toFixed(2)}</div>
            </div>

            <div className="report-card critical">
              <h4>Critical</h4>
              <div className="value">{report.byLevel?.critical || 0}</div>
            </div>

            <div className="report-card high">
              <h4>High</h4>
              <div className="value">{report.byLevel?.high || 0}</div>
            </div>

            <div className="report-card medium">
              <h4>Medium</h4>
              <div className="value">{report.byLevel?.medium || 0}</div>
            </div>

            <div className="report-card low">
              <h4>Low</h4>
              <div className="value">{report.byLevel?.low || 0}</div>
            </div>
          </div>

          {report.byCategory && (
            <div className="by-category">
              <h4>By Category</h4>
              <div className="category-list">
                {Object.entries(report.byCategory).map(([category, count]) => (
                  <div key={category} className="category-item">
                    <span>{category}</span>
                    <span className="count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="filters">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {riskCategories.map(cat => (
            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
        </select>

        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
        >
          <option value="all">All Risk Levels</option>
          <option value="CRITICAL">🔴 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🟡 Medium</option>
          <option value="LOW">🟢 Low</option>
          <option value="MINIMAL">⚪ Minimal</option>
        </select>
      </div>

      <div className="risks-list">
        <h2>Risks ({filteredRisks.length})</h2>
        {filteredRisks.length === 0 ? (
          <p className="empty-state">No risks found in this category/level</p>
        ) : (
          filteredRisks.map((risk) => (
            <div key={risk.id} className="risk-card">
              <div className="risk-header">
                <div>
                  <h3>{risk.name}</h3>
                  <p className="category">{risk.category}</p>
                </div>
                <div 
                  className="risk-score"
                  style={{ backgroundColor: getRiskLevelColor(risk.riskScore) }}
                >
                  <div className="score">{risk.riskScore || '—'}</div>
                  <div className="level">{getRiskLevelLabel(risk.riskScore || 0)}</div>
                </div>
              </div>

              <p className="description">{risk.description}</p>

              <div className="risk-meta">
                {risk.owner && <span>👤 {risk.owner}</span>}
                <span>📊 {risk.status}</span>
                <span>📅 {new Date(risk.identifiedDate).toLocaleDateString()}</span>
              </div>

              <div className="risk-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => handleAssessRisk(risk.id)}
                >
                  📈 Assess Risk
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => setSelectedRisk(risk)}
                >
                  🛡️ Add Mitigation
                </button>
                <button className="btn-secondary">📋 View Details</button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="legend">
        <h4>Risk Level Legend</h4>
        <div className="legend-items">
          {riskLevels.map(item => (
            <div key={item.level} className="legend-item">
              <div style={{ backgroundColor: item.color }}></div>
              <span>{item.level.toUpperCase()} ({item.range})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;
