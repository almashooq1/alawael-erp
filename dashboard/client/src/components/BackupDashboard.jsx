import React, { useState, useEffect } from 'react';

const API = '/api/backup/dashboard';

export default function BackupDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات النسخ الاحتياطي...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة النسخ الاحتياطي (3650)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>💾 النسخ الاحتياطي والاستعادة</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي النسخ', value: data.totalBackups || 0, color: '#1976d2', icon: '💾' },
          { label: 'النسخ الناجحة', value: data.completedBackups || 0, color: '#388e3c', icon: '✅' },
          { label: 'عمليات الاستعادة', value: data.totalRestores || 0, color: '#f57c00', icon: '🔄' },
          { label: 'حجم التخزين', value: data.totalStorageSize || '0 MB', color: '#7b1fa2', icon: '📦' },
          { label: 'الجداول النشطة', value: data.activeSchedules || 0, color: '#00838f', icon: '📅' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {data.lastBackup && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>🕐 آخر نسخة احتياطية</h3>
          <p style={{ margin: '8px 0' }}><strong>رقم:</strong> {data.lastBackup.backupId}</p>
          <p style={{ margin: '8px 0' }}><strong>النوع:</strong> {data.lastBackup.type}</p>
          <p style={{ margin: '8px 0' }}><strong>الحالة:</strong> {data.lastBackup.status}</p>
          <p style={{ margin: '8px 0' }}><strong>التاريخ:</strong> {new Date(data.lastBackup.createdAt).toLocaleString('ar-SA')}</p>
        </div>
      )}

      {data.integrityStatus && (
        <div style={{ background: data.integrityStatus === 'healthy' ? '#e8f5e9' : '#fff3e0', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3>{data.integrityStatus === 'healthy' ? '✅' : '⚠️'} حالة سلامة البيانات: {data.integrityStatus === 'healthy' ? 'سليمة' : 'تحتاج مراجعة'}</h3>
        </div>
      )}
    </div>
  );
}
