import React, { useState, useEffect } from 'react';

const API = '/api/report-scheduler/dashboard';

export default function ReportSchedulerDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات التقارير...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة جدولة التقارير (3730)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>📊 جدولة التقارير والتصدير</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي القوالب', value: data.totalTemplates || 0, color: '#1976d2', icon: '📋' },
          { label: 'التقارير المُنشأة', value: data.totalReports || 0, color: '#388e3c', icon: '📄' },
          { label: 'التقارير المكتملة', value: data.completedReports || 0, color: '#4caf50', icon: '✅' },
          { label: 'في قائمة الانتظار', value: data.queuedReports || 0, color: '#f57c00', icon: '⏳' },
          { label: 'الجداول النشطة', value: data.activeSchedules || 0, color: '#7b1fa2', icon: '📅' },
          { label: 'التقارير الفاشلة', value: data.failedReports || 0, color: '#c62828', icon: '❌' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Reports by Format */}
      {data.reportsByFormat && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📑 التقارير حسب التنسيق</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.reportsByFormat).map(([format, count]) => {
              const icons = { pdf: '📕', excel: '📗', csv: '📘', html: '🌐' };
              return (
                <div key={format} style={{ padding: '10px 20px', background: '#fce4ec', borderRadius: 8, fontSize: 14 }}>
                  {icons[format] || '📄'} <strong>{format.toUpperCase()}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports by Category */}
      {data.reportsByCategory && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>🏷️ التقارير حسب الفئة</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.reportsByCategory).map(([cat, count]) => {
              const labels = { students: 'الطلاب', staff: 'الموظفين', finance: 'المالية', attendance: 'الحضور', academic: 'الأكاديمي', health: 'الصحة', transport: 'النقل', inventory: 'المخزون', compliance: 'الامتثال', custom: 'مخصص' };
              return (
                <div key={cat} style={{ padding: '8px 16px', background: '#e8eaf6', borderRadius: 8, fontSize: 14 }}>
                  <strong>{labels[cat] || cat}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      {data.recentReports?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>📄 أحدث التقارير</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>التقرير</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الحالة</th>
                <th style={{ padding: 10, textAlign: 'center' }}>التنسيق</th>
                <th style={{ padding: 10, textAlign: 'center' }}>وقت التوليد</th>
              </tr>
            </thead>
            <tbody>
              {data.recentReports.map((r, i) => {
                const statusColors = { completed: '#4caf50', generating: '#ff9800', queued: '#2196f3', failed: '#f44336' };
                const statusLabels = { completed: 'مكتمل', generating: 'قيد الإنشاء', queued: 'في الانتظار', failed: 'فشل' };
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{r.reportId}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <span style={{ padding: '4px 10px', borderRadius: 12, background: `${statusColors[r.status] || '#9e9e9e'}22`, color: statusColors[r.status] || '#666', fontSize: 12 }}>
                        {statusLabels[r.status] || r.status}
                      </span>
                    </td>
                    <td style={{ padding: 10, textAlign: 'center' }}>{r.format?.toUpperCase()}</td>
                    <td style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>{r.generationTime ? `${r.generationTime}ms` : '-'}</td>
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
