import React, { useState, useEffect } from 'react';

const API = '/api/notifications/dashboard';

export default function NotificationsDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات الإشعارات...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة الإشعارات (3640)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>📢 مركز الإشعارات</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الإشعارات', value: data.totalNotifications || 0, color: '#1976d2', icon: '📨' },
          { label: 'إشعارات اليوم', value: data.todayNotifications || 0, color: '#388e3c', icon: '📬' },
          { label: 'معدل التسليم', value: `${data.deliveryRate || 0}%`, color: '#f57c00', icon: '✅' },
          { label: 'القوالب النشطة', value: data.activeTemplates || 0, color: '#7b1fa2', icon: '📋' },
          { label: 'في الانتظار', value: data.pendingCount || 0, color: '#c62828', icon: '⏳' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Channel Breakdown */}
      {data.channelBreakdown && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📊 توزيع القنوات</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.channelBreakdown).map(([ch, count]) => (
              <div key={ch} style={{ padding: '8px 16px', background: '#e3f2fd', borderRadius: 8, fontSize: 14 }}>
                <strong>{ch}</strong>: {count}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
