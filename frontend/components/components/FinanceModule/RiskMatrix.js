/**
 * RiskMatrix.js - Risk Assessment Matrix & Management
 * Interactive risk visualization with probability/impact matrix
 */

import React, { useState, useEffect } from 'react';
import './RiskMatrix.css';

const RiskMatrix = ({ organizationId }) => {
  const [risks, setRisks] = useState([]);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('matrix');
  const [showAddRisk, setShowAddRisk] = useState(false);

  useEffect(() => {
    fetchRisks();
  }, [organizationId]);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/finance/risks?organizationId=${organizationId}`);
      if (!response.ok) throw new Error('Failed to fetch risks');

      const data = await response.json();
      setRisks(data.data.risks || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRisk = async (riskData) => {
    try {
      const response = await fetch('/api/finance/risks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...riskData
        })
      });

      if (!response.ok) throw new Error('Failed to add risk');

      fetchRisks();
      setShowAddRisk(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateMitigationStatus = async (riskId, progress) => {
    try {
      const response = await fetch(`/api/finance/risks/${riskId}/mitigation`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress })
      });

      if (!response.ok) throw new Error('Failed to update mitigation');

      fetchRisks();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRiskColor = (score) => {
    if (score >= 70) return '#ff4444'; // Critical (red)
    if (score >= 50) return '#ff8800'; // High (orange)
    if (score >= 30) return '#ffbb33'; // Medium (yellow)
    return '#00C851'; // Low (green)
  };

  const getRiskLevel = (probability, impact) => {
    const score = (probability * impact) / 10;
    if (score >= 70) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  };

  if (loading) return <div className="loading">Loading risk data...</div>;

  return (
    <div className="risk-matrix">
      <div className="matrix-header">
        <h2>⚠️ Risk Assessment Matrix</h2>
        <button className="btn-add-risk" onClick={() => setShowAddRisk(!showAddRisk)}>
          + Add Risk
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showAddRisk && (
        <AddRiskForm
          onSubmit={handleAddRisk}
          onCancel={() => setShowAddRisk(false)}
        />
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'matrix' ? 'active' : ''}`}
          onClick={() => setActiveTab('matrix')}
        >
          Matrix View
        </button>
        <button
          className={`tab ${activeTab === 'trends' ? 'active' : ''}`}
          onClick={() => setActiveTab('trends')}
        >
          Trends
        </button>
        <button
          className={`tab ${activeTab === 'strategies' ? 'active' : ''}`}
          onClick={() => setActiveTab('strategies')}
        >
          Mitigation
        </button>
        <button
          className={`tab ${activeTab === 'indicators' ? 'active' : ''}`}
          onClick={() => setActiveTab('indicators')}
        >
          Key Indicators
        </button>
      </div>

      {/* Matrix View */}
      {activeTab === 'matrix' && (
        <div className="matrix-view">
          <h3>Risk-Impact Matrix</h3>
          <div className="risk-matrix-grid">
            <div className="matrix-axes">
              <div className="y-axis-label">Impact</div>
            </div>

            <div className="matrix-container">
              {/* Matrix grid with 10x10 cells */}
              <div className="grid-wrapper">
                {[...Array(100)].map((_, idx) => {
                  const row = Math.floor(idx / 10);
                  const col = idx % 10;
                  const risk = risks.find(r =>
                    Math.round(r.probability) === col + 1 &&
                    Math.round(r.impact) === 10 - row
                  );

                  // Color zones
                  const isRedZone = col >= 6 && row <= 3;
                  const isOrangeZone = (col >= 4 && row <= 5) || (col >= 6 && row <= 5);
                  const isYellowZone = (col >= 2 && row <= 7) && !isRedZone && !isOrangeZone;

                  let zoneColor = 'white';
                  if (isRedZone) zoneColor = 'rgba(255, 68, 68, 0.1)';
                  else if (isOrangeZone) zoneColor = 'rgba(255, 136, 0, 0.1)';
                  else if (isYellowZone) zoneColor = 'rgba(255, 187, 51, 0.1)';

                  return (
                    <div
                      key={idx}
                      className="matrix-cell"
                      style={{ backgroundColor: zoneColor }}
                    >
                      {risk && (
                        <div
                          className="risk-bubble"
                          style={{
                            width: `${20 + risk.importance * 10}px`,
                            height: `${20 + risk.importance * 10}px`,
                            backgroundColor: getRiskColor((risk.probability * risk.impact) / 10)
                          }}
                          onClick={() => setSelectedRisk(risk)}
                          title={risk.name}
                        >
                          <span className="bubble-label">{risk.type.charAt(0)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="x-axis-label">Probability →</div>
            </div>

            {/* Legend */}
            <div className="matrix-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ff4444' }}></div>
                <span>Critical</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ff8800' }}></div>
                <span>High</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ffbb33' }}></div>
                <span>Medium</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#00C851' }}></div>
                <span>Low</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends View */}
      {activeTab === 'trends' && (
        <div className="trends-view">
          <h3>Risk Trends Over Time</h3>
          <div className="trends-container">
            {['CREDIT', 'LIQUIDITY', 'OPERATIONAL', 'MARKET', 'COMPLIANCE', 'REPUTATIONAL', 'STRATEGIC', 'FRAUD'].map((type) => {
              const typeRisks = risks.filter(r => r.type === type);
              const avgScore = typeRisks.reduce((sum, r) => sum + (r.probability * r.impact) / 10, 0) / typeRisks.length || 0;

              return (
                <div key={type} className="trend-card">
                  <h4>{type}</h4>
                  <div className="trend-score">{avgScore.toFixed(1)}/100</div>
                  <div className="trend-bar">
                    <div
                      className="trend-fill"
                      style={{
                        width: `${avgScore}%`,
                        backgroundColor: getRiskColor(avgScore)
                      }}
                    ></div>
                  </div>
                  <p className="trend-count">{typeRisks.length} risks</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mitigation Strategies */}
      {activeTab === 'strategies' && (
        <div className="strategies-view">
          <h3>Mitigation Strategies</h3>
          <div className="strategies-list">
            {risks.map((risk) => (
              <div key={risk._id} className="strategy-card">
                <div className="strategy-header">
                  <h4>{risk.name}</h4>
                  <span className={`level-badge level-${getRiskLevel(risk.probability, risk.impact)}`}>
                    {getRiskLevel(risk.probability, risk.impact)}
                  </span>
                </div>

                {risk.mitigationStrategy && (
                  <>
                    <p className="strategy-text">{risk.mitigationStrategy}</p>

                    <div className="progress-section">
                      <label>Implementation Progress:</label>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${risk.mitigationProgress}%` }}
                        ></div>
                      </div>
                      <span className="progress-text">{risk.mitigationProgress}%</span>

                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={risk.mitigationProgress}
                        onChange={(e) => handleUpdateMitigationStatus(risk._id, parseInt(e.target.value))}
                        className="progress-slider"
                      />
                    </div>

                    {risk.mitigationDeadline && (
                      <p className="deadline">
                        Deadline: {new Date(risk.mitigationDeadline).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Indicators */}
      {activeTab === 'indicators' && (
        <div className="indicators-view">
          <h3>Key Risk Indicators</h3>
          <div className="indicators-grid">
            {['CREDIT', 'LIQUIDITY', 'OPERATIONAL', 'MARKET'].map((type) => {
              const typeRisks = risks.filter(r => r.type === type);
              const maxScore = typeRisks.length > 0
                ? Math.max(...typeRisks.map(r => (r.probability * r.impact) / 10))
                : 0;

              return (
                <div key={type} className="indicator-card">
                  <h4>{type} Risk</h4>
                  <div className="indicator-gauge">
                    <div className="gauge-value" style={{ color: getRiskColor(maxScore) }}>
                      {maxScore.toFixed(1)}
                    </div>
                  </div>
                  <p className="indicator-status">
                    {maxScore >= 70 ? '🔴 Critical' : maxScore >= 50 ? '🟠 High' : maxScore >= 30 ? '🟡 Medium' : '🟢 Low'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Detail Modal */}
      {selectedRisk && (
        <div className="modal-overlay" onClick={() => setSelectedRisk(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedRisk(null)}>✕</button>

            <h2>{selectedRisk.name}</h2>

            <div className="risk-details">
              <div className="detail-row">
                <span className="label">Type:</span>
                <span className="value">{selectedRisk.type}</span>
              </div>
              <div className="detail-row">
                <span className="label">Level:</span>
                <span className="value">{getRiskLevel(selectedRisk.probability, selectedRisk.impact)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Probability:</span>
                <span className="value">{selectedRisk.probability}/10</span>
              </div>
              <div className="detail-row">
                <span className="label">Impact:</span>
                <span className="value">{selectedRisk.impact}/10</span>
              </div>
              <div className="detail-row">
                <span className="label">Description:</span>
                <span className="value">{selectedRisk.description}</span>
              </div>

              {selectedRisk.mitigationStrategy && (
                <div className="detail-row">
                  <span className="label">Mitigation Strategy:</span>
                  <span className="value">{selectedRisk.mitigationStrategy}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function AddRiskForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'CREDIT',
    probability: 5,
    impact: 5,
    description: '',
    mitigationStrategy: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="add-risk-form">
      <h3>Add New Risk</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Risk Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="CREDIT">Credit</option>
              <option value="LIQUIDITY">Liquidity</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="MARKET">Market</option>
              <option value="COMPLIANCE">Compliance</option>
              <option value="REPUTATIONAL">Reputational</option>
              <option value="STRATEGIC">Strategic</option>
              <option value="FRAUD">Fraud</option>
            </select>
          </div>

          <div className="form-group">
            <label>Probability (1-10)</label>
            <input
              type="range"
              min="1"
              max="10"
              value={formData.probability}
              onChange={(e) => setFormData({...formData, probability: parseInt(e.target.value)})}
            />
            <span>{formData.probability}</span>
          </div>
        </div>

        <div className="form-group">
          <label>Impact (1-10)</label>
          <input
            type="range"
            min="1"
            max="10"
            value={formData.impact}
            onChange={(e) => setFormData({...formData, impact: parseInt(e.target.value)})}
          />
          <span>{formData.impact}</span>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Mitigation Strategy</label>
          <textarea
            value={formData.mitigationStrategy}
            onChange={(e) => setFormData({...formData, mitigationStrategy: e.target.value})}
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit">Add Risk</button>
          <button type="button" onClick={onCancel} className="btn-cancel">Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default RiskMatrix;
