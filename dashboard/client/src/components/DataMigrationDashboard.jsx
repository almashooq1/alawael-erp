import React, { useState, useEffect } from 'react';

const API = '/api/migration/dashboard';

export default function DataMigrationDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات الترحيل...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة ترحيل البيانات (3750)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>🔄 ترحيل البيانات والمزامنة</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي المهام', value: data.overview?.totalJobs || 0, color: '#1976d2', icon: '📦' },
          { label: 'المكتملة', value: data.overview?.completed || 0, color: '#388e3c', icon: '✅' },
          { label: 'الفاشلة', value: data.overview?.failed || 0, color: '#c62828', icon: '❌' },
          { label: 'قيد التشغيل', value: data.overview?.running || 0, color: '#ff9800', icon: '🔄' },
          { label: 'في الانتظار', value: data.overview?.queued || 0, color: '#9c27b0', icon: '⏳' },
          { label: 'نسبة النجاح', value: `${data.overview?.successRate || 0}%`, color: '#00838f', icon: '📈' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Processing Stats */}
      {data.processing && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'السجلات المعالجة', value: data.processing.totalRecordsProcessed || 0, icon: '📊' },
            { label: 'النجاح', value: data.processing.totalSucceeded || 0, icon: '✅' },
            { label: 'الفشل', value: data.processing.totalFailed || 0, icon: '❌' },
            { label: 'متوسط المدة', value: `${Math.round((data.processing.avgDuration || 0) / 1000)}s`, icon: '⏱️' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,.08)', textAlign: 'center' }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 20, fontWeight: 'bold' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Connections & Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>🔌 الاتصالات الخارجية</h3>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1976d2' }}>{data.connections?.total || 0}</div>
            <div style={{ fontSize: 14, color: '#666' }}>إجمالي الاتصالات</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#4caf50', marginTop: 8 }}>{data.connections?.active || 0}</div>
            <div style={{ fontSize: 14, color: '#666' }}>نشطة</div>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>📋 قوالب التعيين</h3>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#7b1fa2' }}>{data.templates?.total || 0}</div>
            <div style={{ fontSize: 14, color: '#666' }}>إجمالي القوالب</div>
          </div>
        </div>
      </div>

      {/* Jobs by Type */}
      {data.jobsByType && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📂 المهام حسب النوع</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.jobsByType).map(([type, count]) => {
              const labels = { import: 'استيراد', export: 'تصدير', sync: 'مزامنة', etl: 'ETL', clone: 'نسخ', archive: 'أرشفة' };
              const icons = { import: '📥', export: '📤', sync: '🔄', etl: '⚡', clone: '📋', archive: '📦' };
              return (
                <div key={type} style={{ padding: '8px 16px', background: '#e3f2fd', borderRadius: 8, fontSize: 14 }}>
                  {icons[type] || '📋'} <strong>{labels[type] || type}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      {data.recentJobs?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>📋 أحدث مهام الترحيل</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>المهمة</th>
                <th style={{ padding: 10, textAlign: 'center' }}>النوع</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: 10, textAlign: 'center' }}>السجلات</th>
                <th style={{ padding: 10, textAlign: 'center' }}>النجاح/الفشل</th>
              </tr>
            </thead>
            <tbody>
              {data.recentJobs.map((j, i) => {
                const statusColors = { completed: '#4caf50', running: '#ff9800', queued: '#2196f3', failed: '#f44336', draft: '#9e9e9e', 'rolled-back': '#ff5722' };
                const statusLabels = { completed: 'مكتمل', running: 'قيد التنفيذ', queued: 'في الانتظار', failed: 'فشل', draft: 'مسودة', 'rolled-back': 'تم التراجع' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{j.nameAr || j.name}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{j.type}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 12, background: `${statusColors[j.status] || '#9e9e9e'}22`, color: statusColors[j.status] || '#666', fontSize: 12 }}>
                        {statusLabels[j.status] || j.status}
                      </span>
                    </td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{j.stats?.totalRecords || 0}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <span style={{ color: '#4caf50' }}>{j.stats?.succeeded || 0}</span> / <span style={{ color: '#f44336' }}>{j.stats?.failed || 0}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
