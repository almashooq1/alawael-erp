import React, { useState, useEffect } from 'react';

const API = '/api/config/dashboard';

export default function SystemConfigDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل إعدادات النظام...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة إعدادات النظام (3740)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>⚙️ إعدادات النظام</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الإعدادات', value: data.totalSettings || 0, color: '#1976d2', icon: '⚙️' },
          { label: 'الأعلام النشطة', value: data.activeFlags || 0, color: '#388e3c', icon: '🚩' },
          { label: 'إجمالي الأعلام', value: data.totalFlags || 0, color: '#f57c00', icon: '🏴' },
          { label: 'الأدوار', value: data.totalRoles || 0, color: '#7b1fa2', icon: '👥' },
          { label: 'القوالب الجمالية', value: data.totalThemes || 0, color: '#00838f', icon: '🎨' },
          { label: 'سجل التغييرات', value: data.totalChangeLogs || 0, color: '#455a64', icon: '📝' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Settings by Category */}
      {data.settingsByCategory && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📂 الإعدادات حسب الفئة</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.settingsByCategory).map(([cat, count]) => {
              const labels = { general: 'عام', appearance: 'المظهر', security: 'الأمان', email: 'البريد', sms: 'الرسائل', notifications: 'الإشعارات', academic: 'الأكاديمي', finance: 'المالية', attendance: 'الحضور', system: 'النظام', integrations: 'التكامل' };
              return (
                <div key={cat} style={{ padding: '8px 16px', background: '#e8f5e9', borderRadius: 8, fontSize: 14 }}>
                  <strong>{labels[cat] || cat}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Feature Flags */}
      {data.flagsByCategory && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>🚩 أعلام الميزات حسب الفئة</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.flagsByCategory).map(([cat, count]) => {
              const labels = { ui: 'واجهة', api: 'API', experiment: 'تجريبي', beta: 'بيتا', deprecated: 'مهمل', maintenance: 'صيانة' };
              return (
                <div key={cat} style={{ padding: '8px 16px', background: '#fff3e0', borderRadius: 8, fontSize: 14 }}>
                  <strong>{labels[cat] || cat}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roles */}
      {data.roles?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>👥 الأدوار والصلاحيات</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>الدور</th>
                <th style={{ padding: 10, textAlign: 'center' }}>نظامي</th>
                <th style={{ padding: 10, textAlign: 'center' }}>نشط</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الصلاحيات</th>
              </tr>
            </thead>
            <tbody>
              {data.roles.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{r.nameAr || r.name}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{r.isSystem ? '✅' : '—'}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{r.isActive ? '🟢' : '🔴'}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{r.permissionCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Changes */}
      {data.recentChanges?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>📝 آخر التغييرات</h3>
          <div style={{ marginTop: 12 }}>
            {data.recentChanges.map((c, i) => (
              <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{c.entity}</strong>: {c.action} — {c.field || c.entityId}
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>{new Date(c.createdAt).toLocaleDateString('ar-SA')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
