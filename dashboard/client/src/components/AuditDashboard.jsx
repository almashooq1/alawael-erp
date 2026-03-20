import React, { useState, useEffect } from 'react';

const API = '/api/audit/dashboard';

export default function AuditDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات التدقيق...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة التدقيق (3670)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>🔍 التدقيق والامتثال</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي السجلات', value: data.totalEntries || 0, color: '#1976d2', icon: '📋' },
          { label: 'سجلات اليوم', value: data.todayEntries || 0, color: '#388e3c', icon: '📝' },
          { label: 'أحداث حرجة', value: data.criticalEntries || 0, color: '#c62828', icon: '🚨' },
          { label: 'تنبيهات مفتوحة', value: data.openAlerts || 0, color: '#f57c00', icon: '⚠️' },
          { label: 'سياسات نشطة', value: data.activePolices || 0, color: '#7b1fa2', icon: '📐' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Last Compliance Report */}
      {data.lastComplianceReport && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📊 آخر تقرير امتثال</h3>
          <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
            <div><strong>النوع:</strong> {data.lastComplianceReport.type}</div>
            <div><strong>معدل الامتثال:</strong> <span style={{ color: data.lastComplianceReport.complianceRate >= 80 ? '#388e3c' : '#c62828', fontWeight: 'bold', fontSize: 18 }}>{data.lastComplianceReport.complianceRate}%</span></div>
            <div><strong>التاريخ:</strong> {new Date(data.lastComplianceReport.date).toLocaleDateString('ar-SA')}</div>
          </div>
        </div>
      )}

      {/* Severity Breakdown */}
      {data.severityBreakdown && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📈 توزيع الخطورة</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.severityBreakdown).map(([sev, count]) => (
              <div key={sev} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 14, background: sev === 'critical' ? '#ffebee' : sev === 'warning' ? '#fff3e0' : '#e8f5e9' }}>
                {sev === 'critical' ? '🔴' : sev === 'warning' ? '🟡' : '🟢'} <strong>{sev}</strong>: {count}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Security Alerts */}
      {data.recentAlerts?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>🔔 تنبيهات أمان حديثة</h3>
          {data.recentAlerts.map((a, i) => (
            <div key={i} style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <span>{a.severity === 'critical' ? '🔴' : '🟠'} {a.descriptionAr || a.type}</span>
              <span style={{ fontSize: 12, color: '#999' }}>{new Date(a.createdAt).toLocaleString('ar-SA')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
