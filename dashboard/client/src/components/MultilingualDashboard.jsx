import React, { useState, useEffect } from 'react';

const API = '/api/i18n/dashboard';

export default function MultilingualDashboard() {
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>⏳ جاري تحميل بيانات اللغات...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: 40, color: '#c62828' }}>❌ تعذر الاتصال بخدمة اللغات (3680)</div>;

  return (
    <div style={{ padding: 20, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h2 style={{ marginBottom: 20 }}>🌐 التعدد اللغوي والتوطين</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'مفاتيح الترجمة', value: data.totalKeys || 0, color: '#1976d2', icon: '🔑' },
          { label: 'مترجم بالكامل', value: data.fullyTranslated || 0, color: '#388e3c', icon: '✅' },
          { label: 'اكتمال عام', value: `${data.overallCompleteness || 0}%`, color: '#f57c00', icon: '📊' },
          { label: 'اللغات المدعومة', value: data.supportedLanguages || 0, color: '#7b1fa2', icon: '🗣️' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', borderRight: `4px solid ${card.color}` }}>
            <div style={{ fontSize: 28 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 13, color: '#666' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Per-Language Stats */}
      {data.languages && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)', marginBottom: 20 }}>
          <h3>🗺️ حالة اللغات</h3>
          <div style={{ marginTop: 12 }}>
            {Object.entries(data.languages).map(([code, lang]) => (
              <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ fontWeight: 'bold', minWidth: 80 }}>{lang.name}</span>
                <div style={{ flex: 1, background: '#e0e0e0', borderRadius: 8, height: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ width: `${lang.completeness}%`, height: '100%', background: lang.completeness >= 80 ? '#4caf50' : lang.completeness >= 50 ? '#ff9800' : '#f44336', borderRadius: 8, transition: 'width 0.3s' }} />
                </div>
                <span style={{ minWidth: 60, textAlign: 'left', fontWeight: 'bold', color: lang.completeness >= 80 ? '#388e3c' : '#f57c00' }}>
                  {lang.completeness}%
                </span>
                <span style={{ fontSize: 12, color: '#999' }}>{lang.translated}/{lang.total}</span>
                <span style={{ fontSize: 11, color: '#aaa', direction: 'ltr' }}>{lang.direction}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Namespace Stats */}
      {data.namespaces?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
          <h3>📦 فضاءات الأسماء</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 12 }}>
            {data.namespaces.map((ns, i) => (
              <div key={i} style={{ padding: 12, background: '#f5f5f5', borderRadius: 8 }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{ns.name}</div>
                <div style={{ fontSize: 13, color: '#666' }}>{ns.translatedKeys}/{ns.totalKeys} مفتاح</div>
                <div style={{ fontSize: 13, color: ns.completeness >= 80 ? '#388e3c' : '#f57c00' }}>{ns.completeness}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
