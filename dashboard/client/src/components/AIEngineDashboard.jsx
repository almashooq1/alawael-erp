import React, { useState, useEffect } from 'react';

const API = '/api/ai/dashboard';

export default function AIEngineDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const r = await fetch(API);
      setData(await r.json());
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات الذكاء الاصطناعي...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بمحرك الذكاء الاصطناعي (3660)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>🤖 محرك الذكاء الاصطناعي</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'النماذج النشطة', value: data.activeModels || 0, color: '#1976d2', icon: '🧠' },
          { label: 'التنبؤات', value: data.totalPredictions || 0, color: '#388e3c', icon: '🔮' },
          { label: 'الشذوذ المكتشف', value: data.totalAnomalies || 0, color: '#c62828', icon: '⚠️' },
          { label: 'التوصيات', value: data.totalRecommendations || 0, color: '#f57c00', icon: '💡' },
          { label: 'دقة النماذج', value: `${data.avgAccuracy || 0}%`, color: '#7b1fa2', icon: '🎯' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Domain Breakdown */}
      {data.domainBreakdown && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📊 توزيع حسب المجال</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.domainBreakdown).map(([domain, count]) => (
              <div key={domain} style={{ padding: '8px 16px', background: '#f3e5f5', borderRadius: 8, fontSize: 14 }}>
                <strong>{domain}</strong>: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Anomalies */}
      {data.recentAnomalies?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>🚨 آخر الشذوذ المكتشف</h3>
          <div style={{ marginTop: 12 }}>
            {data.recentAnomalies.map((a, i) => (
              <div key={i} style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: a.severity === 'critical' ? '#c62828' : a.severity === 'high' ? '#e65100' : '#f57c00', fontWeight: 'bold' }}>
                    {a.severity === 'critical' ? '🔴' : a.severity === 'high' ? '🟠' : '🟡'} {a.type}
                  </span>
                  <span style={{ margin: '0 8px', color: '#666' }}>— {a.domain}</span>
                </div>
                <span style={{ fontSize: 12, color: '#999' }}>{new Date(a.detectedAt).toLocaleString('ar-SA')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
