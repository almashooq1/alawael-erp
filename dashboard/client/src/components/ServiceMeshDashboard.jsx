import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3600';

/**
 * لوحة مراقبة الخدمات المصغرة — Service Mesh Dashboard
 */
export default function ServiceMeshDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, incRes] = await Promise.all([
        fetch(`${API_BASE}/api/mesh/dashboard`),
        fetch(`${API_BASE}/api/mesh/incidents?status=active`)
      ]);
      const [dashData, incData] = await Promise.all([dashRes.json(), incRes.json()]);
      setDashboard(dashData);
      setIncidents(incData.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); const iv = setInterval(fetchDashboard, 30000); return () => clearInterval(iv); }, [fetchDashboard]);

  const runHealthCheck = async () => {
    setChecking(true);
    try {
      await fetch(`${API_BASE}/api/mesh/health-check/run`, { method: 'POST' });
      await fetchDashboard();
    } catch (err) { setError(err.message); }
    finally { setChecking(false); }
  };

  if (loading) return <div className="mesh-loading">⏳ جاري تحميل بيانات المراقبة...</div>;

  const phaseColors = { core: '#1976d2', '5': '#388e3c', '6': '#f57c00', '7': '#7b1fa2' };
  const statusColors = { healthy: '#4caf50', unhealthy: '#ff9800', down: '#f44336', unknown: '#9e9e9e' };

  return (
    <div className="mesh-dashboard" style={{ padding: 24, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>🔍 مراقبة الخدمات المصغرة</h1>
        <button onClick={runHealthCheck} disabled={checking} style={{ padding: '10px 24px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, cursor: checking ? 'wait' : 'pointer', fontSize: 16 }}>
          {checking ? '⏳ جاري الفحص...' : '🔄 فحص صحة الخدمات'}
        </button>
      </div>

      {error && <div style={{ background: '#ffebee', color: '#c62828', padding: 12, borderRadius: 8, marginBottom: 16 }}>⚠️ {error}</div>}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الخدمات', value: dashboard?.totalServices, color: '#1976d2', icon: '📦' },
          { label: 'سليمة', value: dashboard?.healthy, color: '#4caf50', icon: '✅' },
          { label: 'غير سليمة', value: dashboard?.unhealthy, color: '#ff9800', icon: '⚠️' },
          { label: 'متوقفة', value: dashboard?.down, color: '#f44336', icon: '❌' },
          { label: 'نسبة الصحة', value: dashboard?.healthRate, color: '#2e7d32', icon: '📊' },
          { label: 'حوادث نشطة', value: dashboard?.activeIncidents, color: '#d32f2f', icon: '🚨' },
          { label: 'متوسط الاستجابة', value: `${dashboard?.avgResponseTime || 0}ms`, color: '#6a1b9a', icon: '⚡' }
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value ?? '—'}</div>
            <div style={{ color: '#666', fontSize: 14 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* By Phase */}
      {dashboard?.byPhase && (
        <div style={{ marginBottom: 24 }}>
          <h2>📊 حسب المرحلة</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {Object.entries(dashboard.byPhase).map(([phase, data]) => (
              <div key={phase} style={{ background: '#fff', borderRadius: 12, padding: 16, minWidth: 150, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderTop: `3px solid ${phaseColors[phase] || '#999'}` }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>المرحلة {phase === 'core' ? 'الأساسية' : phase}</div>
                <div style={{ color: '#4caf50' }}>سليمة: {data.healthy}/{data.total}</div>
                <div style={{ height: 6, background: '#e0e0e0', borderRadius: 3, marginTop: 8 }}>
                  <div style={{ height: '100%', background: '#4caf50', borderRadius: 3, width: `${(data.healthy / data.total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Services Grid */}
      <h2>📋 جميع الخدمات</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 24 }}>
        {(dashboard?.services || []).map(svc => (
          <div key={svc.name} style={{ background: '#fff', borderRadius: 8, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: `3px solid ${statusColors[svc.status] || '#999'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: 14 }}>{svc.nameAr || svc.name}</div>
              <div style={{ color: '#999', fontSize: 12 }}>:{svc.port} | مرحلة {svc.phase}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 12, background: statusColors[svc.status] + '20', color: statusColors[svc.status], fontWeight: 'bold' }}>
                {svc.status === 'healthy' ? 'سليم' : svc.status === 'unhealthy' ? 'غير سليم' : svc.status === 'down' ? 'متوقف' : 'غير معروف'}
              </span>
              {svc.responseTime && <div style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{svc.responseTime}ms</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Active Incidents */}
      {incidents.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2>🚨 الحوادث النشطة</h2>
          {incidents.map(inc => (
            <div key={inc.incidentId} style={{ background: inc.severity === 'critical' ? '#ffebee' : '#fff3e0', borderRadius: 8, padding: 14, marginBottom: 8, borderRight: `4px solid ${inc.severity === 'critical' ? '#f44336' : '#ff9800'}` }}>
              <strong>{inc.title}</strong>
              <div style={{ color: '#666', fontSize: 13 }}>{inc.description}</div>
              <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                {inc.severity === 'critical' ? '🔴 حرجة' : '🟠 عالية'} | {new Date(inc.startedAt).toLocaleString('ar-SA')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Circuit Breakers */}
      {dashboard?.circuitBreakers?.length > 0 && (
        <div>
          <h2>⚡ قواطع الدائرة المفتوحة</h2>
          {dashboard.circuitBreakers.map(cb => (
            <div key={cb.name} style={{ background: '#fff3e0', borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <strong>{cb.name}</strong> — الحالة: {cb.state} | أخطاء: {cb.failures}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
