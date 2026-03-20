import React, { useState, useEffect } from 'react';

const API = '/api/files/dashboard';

export default function FileStorageDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات تخزين الملفات...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة تخزين الملفات (3710)</div>;

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>📂 تخزين الملفات</h2>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الملفات', value: data.totalFiles || 0, color: '#1976d2', icon: '📄' },
          { label: 'الحجم الكلي', value: formatBytes(data.totalSize), color: '#388e3c', icon: '💾' },
          { label: 'المجلدات', value: data.totalFolders || 0, color: '#f57c00', icon: '📁' },
          { label: 'الملفات المشتركة', value: data.sharedFiles || 0, color: '#7b1fa2', icon: '🔗' },
          { label: 'في سلة المحذوفات', value: data.trashedFiles || 0, color: '#c62828', icon: '🗑️' },
          { label: 'التنزيلات اليوم', value: data.todayDownloads || 0, color: '#00838f', icon: '⬇️' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Files by Category */}
      {data.filesByCategory && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>📊 الملفات حسب التصنيف</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            {Object.entries(data.filesByCategory).map(([cat, count]) => {
              const icons = { documents: '📄', images: '🖼️', videos: '🎬', audio: '🎵', archives: '📦' };
              const labels = { documents: 'مستندات', images: 'صور', videos: 'فيديو', audio: 'صوت', archives: 'أرشيفات' };
              return (
                <div key={cat} style={{ padding: '8px 16px', background: '#e3f2fd', borderRadius: 8, fontSize: 14 }}>
                  {icons[cat] || '📎'} <strong>{labels[cat] || cat}</strong>: {count}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Storage Usage */}
      {data.storageUsage && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>💾 استخدام التخزين</h3>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {data.storageUsage.map((u, i) => (
              <div key={i} style={{ padding: 12, border: '1px solid #e0e0e0', borderRadius: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{u.userId || `مستخدم ${i + 1}`}</div>
                <div style={{ background: '#e0e0e0', borderRadius: 4, overflow: 'hidden', height: 10. }}>
                  <div style={{ width: `${Math.min((u.usedBytes / u.maxBytes) * 100, 100)}%`, background: u.usedBytes / u.maxBytes > 0.9 ? '#f44336' : '#4caf50', height: '100%' }} />
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{formatBytes(u.usedBytes)} / {formatBytes(u.maxBytes)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Uploads */}
      {data.recentUploads?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>📤 آخر الملفات المرفوعة</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: 10, textAlign: 'right' }}>اسم الملف</th>
                <th style={{ padding: 10, textAlign: 'center' }}>التصنيف</th>
                <th style={{ padding: 10, textAlign: 'center' }}>الحجم</th>
                <th style={{ padding: 10, textAlign: 'center' }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUploads.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: 10 }}>{f.originalName}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{f.category}</td>
                  <td style={{ padding: 10, textAlign: 'center' }}>{formatBytes(f.size)}</td>
                  <td style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>{new Date(f.createdAt).toLocaleDateString('ar-SA')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
