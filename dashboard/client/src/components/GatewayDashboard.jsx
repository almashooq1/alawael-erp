import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3600';

/**
 * لوحة بوابة API — API Gateway Dashboard
 */
export default function GatewayDashboard() {
  const [routes, setRoutes] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [routesRes, metricsRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/api/gateway/routes`),
        fetch(`${API_BASE}/api/gateway/metrics`),
        fetch(`${API_BASE}/api/gateway/status`)
      ]);
      setRoutes(await routesRes.json());
      setMetrics(await metricsRes.json());
      setStatus(await statusRes.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 30000); return () => clearInterval(iv); }, [fetchData]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', direction: 'rtl' }}>⏳ جاري التحميل...</div>;

  return (
    <div style={{ padding: 24, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>🚀 بوابة API الموحدة</h1>

      {/* Metrics */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'إجمالي الطلبات', value: metrics.totalRequests?.toLocaleString(), color: '#1976d2', icon: '📨' },
            { label: 'الأخطاء', value: metrics.totalErrors?.toLocaleString(), color: '#d32f2f', icon: '❌' },
            { label: 'نسبة الخطأ', value: metrics.errorRate, color: '#ff9800', icon: '📉' },
            { label: 'وقت التشغيل', value: `${Math.floor((metrics.uptime || 0) / 3600)}h ${Math.floor(((metrics.uptime || 0) % 3600) / 60)}m`, color: '#4caf50', icon: '⏱️' },
            { label: 'طلبات/ثانية', value: metrics.requestsPerSecond, color: '#7b1fa2', icon: '⚡' }
          ].map((card, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRight: `4px solid ${card.color}` }}>
              <div style={{ fontSize: 28 }}>{card.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value ?? '—'}</div>
              <div style={{ color: '#666', fontSize: 14 }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Service Status */}
      {status && (
        <div style={{ marginBottom: 24 }}>
          <h2>🏥 حالة الخدمات ({status.healthy}/{status.total} سليمة)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {(status.services || []).map(svc => (
              <div key={svc.name} style={{
                background: '#fff', borderRadius: 8, padding: 12,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                borderLeft: `3px solid ${svc.status === 'healthy' ? '#4caf50' : svc.status === 'unhealthy' ? '#ff9800' : '#f44336'}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: 13 }}>{svc.name}</div>
                <span style={{
                  padding: '2px 10px', borderRadius: 12, fontSize: 11,
                  background: svc.status === 'healthy' ? '#e8f5e9' : svc.status === 'unhealthy' ? '#fff3e0' : '#ffebee',
                  color: svc.status === 'healthy' ? '#2e7d32' : svc.status === 'unhealthy' ? '#e65100' : '#c62828'
                }}>
                  {svc.status === 'healthy' ? '✅' : svc.status === 'down' ? '❌' : '⚠️'} :{svc.port}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-Service Metrics */}
      {metrics?.services && Object.keys(metrics.services).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2>📊 إحصائيات الخدمات</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <thead><tr style={{ background: '#1976d2', color: '#fff' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>الخدمة</th>
                <th style={{ padding: 10 }}>الطلبات</th>
                <th style={{ padding: 10 }}>الأخطاء</th>
                <th style={{ padding: 10 }}>متوسط الاستجابة</th>
              </tr></thead>
              <tbody>
                {Object.entries(metrics.services).map(([name, stats]) => (
                  <tr key={name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 10, fontWeight: 'bold' }}>{name}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{stats.requests}</td>
                    <td style={{ padding: 10, textAlign: 'center', color: stats.errors > 0 ? '#d32f2f' : '#4caf50' }}>{stats.errors}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{stats.avgResponseTime}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Routes */}
      <h2>🛤️ المسارات المسجلة ({routes.length})</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
        {routes.map((route, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <div style={{ fontWeight: 'bold', color: '#1976d2' }}>{route.name}</div>
            <div style={{ fontSize: 13, color: '#666', direction: 'ltr', fontFamily: 'monospace' }}>
              {route.prefix} → {route.target}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
