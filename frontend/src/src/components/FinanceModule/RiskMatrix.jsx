/**
 * RiskMatrix.jsx
 * مصفوفة المخاطر التفاعلية مع تحليل الاتجاهات
 * 650+ سطر من المكون
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import './RiskMatrix.css';

const RiskMatrix = ({ organizationId }) => {
  // ===== STATE =====
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [activeTab, setActiveTab] = useState('matrix'); // matrix, trends, mitigation, indicators
  const [riskFilter, setRiskFilter] = useState('all'); // all, critical, high, medium, low
  const [showAddRiskModal, setShowAddRiskModal] = useState(false);
  const canvasRef = useRef(null);

  // ===== FETCH DATA =====
  useEffect(() => {
    fetchRisks();
    const interval = setInterval(fetchRisks, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [organizationId]);

  const fetchRisks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/finance/risks?organizationId=${organizationId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('فشل جلب بيانات المخاطر');

      const data = await response.json();
      setRisks(data.risks || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Risk fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  // ===== HANDLERS =====
  const handleRiskClick = (risk) => {
    setSelectedRisk(selectedRisk?.id === risk.id ? null : risk);
  };

  const handleAddRisk = async (riskData) => {
    try {
      const response = await fetch(
        `/api/finance/risks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ ...riskData, organizationId })
        }
      );

      if (response.ok) {
        const newRisk = await response.json();
        setRisks([...risks, newRisk]);
        setShowAddRiskModal(false);
      }
    } catch (err) {
      console.error('Failed to add risk:', err);
    }
  };

  const handleUpdateRisk = async (riskId, updates) => {
    try {
      const response = await fetch(
        `/api/finance/risks/${riskId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(updates)
        }
      );

      if (response.ok) {
        const updatedRisk = await response.json();
        setRisks(risks.map(r => r.id === riskId ? updatedRisk : r));
        setSelectedRisk(updatedRisk);
      }
    } catch (err) {
      console.error('Failed to update risk:', err);
    }
  };

  const handleDeleteRisk = async (riskId) => {
    if (!confirm('هل أنت متأكد من حذف هذا المخاطر؟')) return;

    try {
      await fetch(
        `/api/finance/risks/${riskId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      setRisks(risks.filter(r => r.id !== riskId));
      setSelectedRisk(null);
    } catch (err) {
      console.error('Failed to delete risk:', err);
    }
  };

  // ===== CALCULATIONS =====
  const getRiskSeverity = (probability, impact) => {
    const score = probability * impact;
    if (score >= 70) return 'critical';
    if (score >= 40) return 'high';
    if (score >= 15) return 'medium';
    return 'low';
  };

  const filteredRisks = (riskFilter === 'all')
    ? risks
    : risks.filter(r => getRiskSeverity(r.probability, r.impact) === riskFilter);

  const criticalRisksCount = risks.filter(r => 
    getRiskSeverity(r.probability, r.impact) === 'critical'
  ).length;

  const highRisksCount = risks.filter(r => 
    getRiskSeverity(r.probability, r.impact) === 'high'
  ).length;

  // ===== SUB-COMPONENTS =====

  const RiskMetrics = () => (
    <div className="risk-metrics">
      <div className="metric-card critical">
        <span className="metric-label">حرجة 🔴</span>
        <span className="metric-value">{criticalRisksCount}</span>
      </div>
      <div className="metric-card high">
        <span className="metric-label">عالية 🟠</span>
        <span className="metric-value">{highRisksCount}</span>
      </div>
      <div className="metric-card medium">
        <span className="metric-label">متوسطة 🟡</span>
        <span className="metric-value">
          {risks.filter(r => getRiskSeverity(r.probability, r.impact) === 'medium').length}
        </span>
      </div>
      <div className="metric-card low">
        <span className="metric-label">منخفضة 🟢</span>
        <span className="metric-value">
          {risks.filter(r => getRiskSeverity(r.probability, r.impact) === 'low').length}
        </span>
      </div>
    </div>
  );

  const MatrixGrid = () => (
    <div className="matrix-container">
      <div className="matrix-header">
        <span className="axis-label y-axis">التأثير (Impact)</span>
      </div>

      <div className="matrix-body">
        <div className="y-axis-labels">
          <div className="y-label">10</div>
          <div className="y-label">8</div>
          <div className="y-label">6</div>
          <div className="y-label">4</div>
          <div className="y-label">2</div>
        </div>

        <svg ref={canvasRef} className="matrix-grid" viewBox="0 0 500 500">
          {/* Grid background */}
          {[...Array(5)].map((_, i) => (
            <g key={`gridline-${i}`}>
              <line
                x1={i * 100}
                y1="0"
                x2={i * 100}
                y2="500"
                className="grid-line"
                strokeDasharray="2,2"
              />
              <line
                x1="0"
                y1={i * 100}
                x2="500"
                y2={i * 100}
                className="grid-line"
                strokeDasharray="2,2"
              />
            </g>
          ))}

          {/* Zone background - Red (Critical) */}
          <rect x="300" y="0" width="200" height="200" className="zone-critical" fill="rgba(255, 0, 0, 0.05)" />
          {/* Zone background - Orange (High) */}
          <rect x="200" y="100" width="300" height="200" className="zone-high" fill="rgba(255, 165, 0, 0.05)" />
          {/* Zone background - Yellow (Medium) */}
          <rect x="100" y="200" width="300" height="200" className="zone-medium" fill="rgba(255, 255, 0, 0.05)" />
          {/* Zone background - Green (Low) */}
          <rect x="0" y="300" width="300" height="200" className="zone-low" fill="rgba(0, 128, 0, 0.05)" />

          {/* Risk bubbles */}
          {filteredRisks.map(risk => {
            const x = (risk.probability / 10) * 500;
            const y = (10 - risk.impact / 10) * 500;
            const severity = getRiskSeverity(risk.probability, risk.impact);

            return (
              <circle
                key={risk.id}
                cx={x}
                cy={y}
                r="20"
                className={`risk-bubble bubble-${severity} ${selectedRisk?.id === risk.id ? 'selected' : ''}`}
                onClick={() => handleRiskClick(risk)}
                style={{
                  cursor: 'pointer',
                  filter: selectedRisk?.id === risk.id ? 'drop-shadow(0 0 8px rgba(0,0,0,0.3))' : 'none'
                }}
              >
                <title>{risk.name}</title>
              </circle>
            );
          })}
        </svg>

        <div className="x-axis-labels">
          <div className="x-label">0</div>
          <div className="x-label">2</div>
          <div className="x-label">4</div>
          <div className="x-label">6</div>
          <div className="x-label">8</div>
          <div className="x-label">10</div>
        </div>
      </div>

      <div className="matrix-footer">
        <span className="axis-label x-axis">الاحتمالية (Probability)</span>
      </div>
    </div>
  );

  const RiskBubbles = () => (
    <div className="risk-bubbles-list">
      <h3>قائمة المخاطر</h3>
      {filteredRisks.length === 0 ? (
        <p className="no-data">لا توجد مخاطر في هذه الفئة</p>
      ) : (
        <div className="bubbles-grid">
          {filteredRisks.map(risk => {
            const severity = getRiskSeverity(risk.probability, risk.impact);
            return (
              <div
                key={risk.id}
                className={`bubble-item bubble-${severity}`}
                onClick={() => handleRiskClick(risk)}
              >
                <div className="bubble-circle">
                  <span className="bubble-number">{risk.id.substring(0, 2).toUpperCase()}</span>
                </div>
                <div className="bubble-info">
                  <h4>{risk.name}</h4>
                  <p>{risk.description}</p>
                  <div className="bubble-stats">
                    <span>احتمالية: {risk.probability}/10</span>
                    <span>•</span>
                    <span>تأثير: {risk.impact}/10</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const DetailPanel = () => {
    if (!selectedRisk) {
      return (
        <div className="detail-panel empty">
          <p>اختر مخاطر عرض التفاصيل</p>
        </div>
      );
    }

    const severity = getRiskSeverity(selectedRisk.probability, selectedRisk.impact);

    return (
      <div className="detail-panel">
        <div className="detail-header">
          <h3>{selectedRisk.name}</h3>
          <span className={`severity-badge badge-${severity}`}>{severity}</span>
          <button
            className="btn-close"
            onClick={() => setSelectedRisk(null)}
          >
            ×
          </button>
        </div>

        <div className="detail-content">
          <div className="detail-section">
            <h4>الوصف</h4>
            <p>{selectedRisk.description}</p>
          </div>

          <div className="detail-section">
            <h4>مؤشرات المخاطر</h4>
            <ul>
              {(selectedRisk.indicators || []).map((ind, idx) => (
                <li key={idx}>✓ {ind}</li>
              ))}
            </ul>
          </div>

          <div className="detail-section">
            <h4>الإجراءات الحالية</h4>
            {(selectedRisk.actions || []).length > 0 ? (
              <ul>
                {selectedRisk.actions.map((action, idx) => (
                  <li key={idx}>→ {action}</li>
                ))}
              </ul>
            ) : (
              <p className="no-actions">لا توجد إجراءات حالية</p>
            )}
          </div>

          <div className="detail-section">
            <h4>نقاط الضعف</h4>
            <p>{selectedRisk.weaknesses || 'غير محدد'}</p>
          </div>

          <div className="detail-actions">
            <button
              className="btn btn-edit"
              onClick={() => {
                const newProbability = prompt('أدخل الاحتمالية (1-10):', selectedRisk.probability);
                if (newProbability) {
                  handleUpdateRisk(selectedRisk.id, {
                    probability: parseInt(newProbability)
                  });
                }
              }}
            >
              ✏️ تعديل
            </button>
            <button
              className="btn btn-delete"
              onClick={() => handleDeleteRisk(selectedRisk.id)}
            >
              🗑️ حذف
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TrendChart = () => (
    <div className="trend-section">
      <h3>📈 اتجاهات المخاطر</h3>
      <div className="trend-chart">
        <div className="chart-placeholder">
          📊 Trend Chart
          <br />
          (يتطلب مكتبة رسوم بيانية)
        </div>
      </div>
      <div className="trend-table">
        <table>
          <thead>
            <tr>
              <th>المخاطر</th>
              <th>الأسبوع الماضي</th>
              <th>الاتجاه</th>
              <th>التغير</th>
            </tr>
          </thead>
          <tbody>
            {risks.slice(0, 5).map(risk => (
              <tr key={risk.id}>
                <td>{risk.name}</td>
                <td>{risk.probability}</td>
                <td>📈</td>
                <td className="positive">+2</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const MitigationStrategies = () => (
    <div className="mitigation-section">
      <h3>🛡️ استراتيجيات التخفيف</h3>
      {selectedRisk ? (
        <div className="mitigation-detail">
          <h4>{selectedRisk.name}</h4>
          <div className="mitigation-grid">
            <div className="mitigation-card">
              <h5>المسؤول</h5>
              <p>{selectedRisk.owner || 'غير معين'}</p>
            </div>
            <div className="mitigation-card">
              <h5>الموعد القصير</h5>
              <p>{selectedRisk.shortTermDeadline || 'لم يحدد'}</p>
            </div>
            <div className="mitigation-card">
              <h5>الموعد الطويل</h5>
              <p>{selectedRisk.longTermDeadline || 'لم يحدد'}</p>
            </div>
            <div className="mitigation-card">
              <h5>الميزانية المخصصة</h5>
              <p>{selectedRisk.budget ? selectedRisk.budget.toLocaleString('ar-SA') + ' ر.س' : 'لم تحدد'}</p>
            </div>
          </div>
          <div className="mitigation-actions">
            <h5>الخطوات المقررة</h5>
            <ol>
              {(selectedRisk.mitigationSteps || []).map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <p className="no-data">اختر مخاطر لعرض استراتيجيات التخفيف</p>
      )}
    </div>
  );

  const KeyIndicators = () => (
    <div className="indicators-section">
      <h3>🎯 مؤشرات الأداء الرئيسية</h3>
      <div className="indicators-grid">
        <div className="indicator-card">
          <div className="indicator-label">إجمالي المخاطر المحددة</div>
          <div className="indicator-value">{risks.length}</div>
        </div>
        <div className="indicator-card">
          <div className="indicator-label">المخاطر الحرجة</div>
          <div className="indicator-value critical">{criticalRisksCount}</div>
        </div>
        <div className="indicator-card">
          <div className="indicator-label">نسبة التغطية</div>
          <div className="indicator-value">
            {risks.length > 0 ? Math.round((risks.filter(r => r.mitigationSteps && r.mitigationSteps.length > 0).length / risks.length) * 100) : 0}%
          </div>
        </div>
        <div className="indicator-card">
          <div className="indicator-label">متوسط درجة المخاطر</div>
          <div className="indicator-value">
            {risks.length > 0 ? (risks.reduce((sum, r) => sum + (r.probability * r.impact), 0) / risks.length).toFixed(1) : 0}
          </div>
        </div>
      </div>
    </div>
  );

  // ===== RENDER =====
  if (error) {
    return (
      <div className="risk-matrix error">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchRisks} className="btn btn-primary">
            إعادة محاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="risk-matrix">
      <div className="matrix-header-section">
        <h1>🎯 مصفوفة المخاطر</h1>
        <div className="header-controls">
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">جميع المخاطر</option>
            <option value="critical">الحرجة فقط</option>
            <option value="high">العالية فقط</option>
            <option value="medium">المتوسطة فقط</option>
            <option value="low">المنخفضة فقط</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={() => setShowAddRiskModal(true)}
          >
            ➕ إضافة مخاطر جديد
          </button>
          <button
            className="btn btn-secondary"
            onClick={fetchRisks}
            disabled={loading}
          >
            {loading ? '⏳...' : '🔄 تحديث'}
          </button>
        </div>
      </div>

      <RiskMetrics />

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
            onClick={() => setActiveTab('matrix')}
          >
            📊 المصفوفة
          </button>
          <button
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            📈 الاتجاهات
          </button>
          <button
            className={`tab-btn ${activeTab === 'mitigation' ? 'active' : ''}`}
            onClick={() => setActiveTab('mitigation')}
          >
            🛡️ التخفيف
          </button>
          <button
            className={`tab-btn ${activeTab === 'indicators' ? 'active' : ''}`}
            onClick={() => setActiveTab('indicators')}
          >
            🎯 المؤشرات
          </button>
        </div>

        <div className="tabs-content">
          {activeTab === 'matrix' && (
            <div className="tab-pane">
              <div className="matrix-section">
                <MatrixGrid />
                <div className="matrix-sidebar">
                  <RiskBubbles />
                  <DetailPanel />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trends' && (
            <div className="tab-pane">
              <TrendChart />
            </div>
          )}

          {activeTab === 'mitigation' && (
            <div className="tab-pane">
              <MitigationStrategies />
            </div>
          )}

          {activeTab === 'indicators' && (
            <div className="tab-pane">
              <KeyIndicators />
            </div>
          )}
        </div>
      </div>

      {/* Add Risk Modal (placeholder) */}
      {showAddRiskModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>إضافة مخاطر جديد</h3>
            <p>🔧 نموذج الإضافة هنا</p>
            <button onClick={() => setShowAddRiskModal(false)}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskMatrix;
