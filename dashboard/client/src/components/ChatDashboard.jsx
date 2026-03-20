import React, { useState, useEffect } from 'react';

const API = '/api/chat/dashboard';

export default function ChatDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const r = await fetch(API);
      setData(await r.json());
    } catch { setData(null); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 15000); return () => clearInterval(t); }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات الدردشة...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة الدردشة والمراسلة (3720)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>💬 الدردشة والمراسلة</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الغرف', value: data.totalRooms || 0, color: '#1976d2', icon: '🏠' },
          { label: 'الغرف النشطة', value: data.activeRooms || 0, color: '#388e3c', icon: '💬' },
          { label: 'إجمالي الرسائل', value: data.totalMessages || 0, color: '#f57c00', icon: '✉️' },
          { label: 'رسائل اليوم', value: data.todayMessages || 0, color: '#7b1fa2', icon: '📨' },
          { label: 'متصلون الآن', value: data.onlineUsers || 0, color: '#00c853', icon: '🟢' },
          { label: 'اتصالات WebSocket', value: data.wsConnections || 0, color: '#00838f', icon: '🔌' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Rooms by Type */}
      {data.roomsByType && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>🏠 الغرف حسب النوع</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.roomsByType).map(([type, count]) => {
              const icons = { direct: '👤', group: '👥', channel: '📢', announcement: '📣', support: '🎧' };
              const labels = { direct: 'محادثة مباشرة', group: 'مجموعة', channel: 'قناة', announcement: 'إعلانات', support: 'دعم فني' };
              return (
                <div key={type} style={{ padding: '8px 16px', background: '#e8f5e9', borderRadius: 8, fontSize: 14 }}>
                  {icons[type] || '💬'} <strong>{labels[type] || type}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Message Types */}
      {data.messagesByType && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📊 أنواع الرسائل</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.messagesByType).map(([type, count]) => {
              const icons = { text: '💬', image: '🖼️', file: '📎', audio: '🎤', video: '🎬', emoji: '😀', link: '🔗' };
              return (
                <div key={type} style={{ padding: '8px 16px', background: '#fff3e0', borderRadius: 8, fontSize: 14 }}>
                  {icons[type] || '📝'} <strong>{type}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Rooms */}
      {data.topRooms?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>🔥 أنشط الغرف</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>الغرفة</th>
                <th style={{ padding: 10, textAlign: 'center' }}>النوع</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الأعضاء</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الرسائل</th>
              </tr>
            </thead>
            <tbody>
              {data.topRooms.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{r.nameAr || r.name}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{r.type}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{r.memberCount}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{r.messageCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
