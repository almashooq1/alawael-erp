import React, { useState, useEffect } from 'react';

const API = '/api/projects/dashboard';

export default function TaskProjectDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات المهام والمشاريع...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة المهام والمشاريع (3700)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>📋 إدارة المهام والمشاريع</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي المشاريع', value: data.totalProjects || 0, color: '#1976d2', icon: '📁' },
          { label: 'المشاريع النشطة', value: data.activeProjects || 0, color: '#388e3c', icon: '🟢' },
          { label: 'إجمالي المهام', value: data.totalTasks || 0, color: '#f57c00', icon: '✅' },
          { label: 'المهام المكتملة', value: data.completedTasks || 0, color: '#7b1fa2', icon: '🏆' },
          { label: 'المهام المتأخرة', value: data.overdueTasks || 0, color: '#c62828', icon: '⚠️' },
          { label: 'السبرنتات النشطة', value: data.activeSprints || 0, color: '#00838f', icon: '🏃' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tasks by Status */}
      {data.tasksByStatus && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📊 المهام حسب الحالة</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.tasksByStatus).map(([status, count]) => {
              const colors = { backlog: '#9e9e9e', todo: '#2196f3', 'in-progress': '#ff9800', 'in-review': '#9c27b0', testing: '#00bcd4', done: '#4caf50', cancelled: '#f44336' };
              return (
                <div key={status} style={{ padding: '8px 16px', background: `${colors[status] || '#e0e0e0'}22`, border: `1px solid ${colors[status] || '#ccc'}`, borderRadius: 8, fontSize: 14 }}>
                  <strong>{status}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks by Priority */}
      {data.tasksByPriority && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>🎯 المهام حسب الأولوية</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.tasksByPriority).map(([priority, count]) => {
              const colors = { critical: '#d32f2f', high: '#f57c00', medium: '#fbc02d', low: '#4caf50' };
              const labels = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };
              return (
                <div key={priority} style={{ padding: '8px 16px', background: `${colors[priority] || '#e0e0e0'}22`, border: `1px solid ${colors[priority] || '#ccc'}`, borderRadius: 8, fontSize: 14 }}>
                  <strong>{labels[priority] || priority}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Projects */}
      {data.recentProjects?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📁 أحدث المشاريع</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>المشروع</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: 10, textAlign: 'center' }}>التقدم</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الأولوية</th>
              </tr>
            </thead>
            <tbody>
              {data.recentProjects.map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{p.nameAr || p.name}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{p.status}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>
                    <div style={{ background: '#e0e0e0', borderRadius: 4, overflow: 'hidden', height: 8 }}>
                      <div style={{ width: `${p.progress || 0}%`, background: '#4caf50', height: '100%' }} />
                    </div>
                    <span style={{ fontSize: 12 }}>{p.progress || 0}%</span>
                  </td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{p.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
