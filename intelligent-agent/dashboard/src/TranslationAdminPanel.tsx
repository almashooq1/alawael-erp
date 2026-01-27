import React, { useState } from 'react';
import { useI18n } from './i18n';
import * as i18nModule from './i18n';

// Helper to get all translation keys
function getAllKeys(translations: any) {
  return Array.from(new Set([
    ...Object.keys(translations.ar),
    ...Object.keys(translations.en),
    ...Object.keys(translations.fr)
  ])).sort();
}

  const { t, lang } = useI18n();
  // Use the actual translations object from i18n.tsx
  const baseTranslations = (i18nModule as any).translations || (i18nModule.default?.translations);
  // Try to load from localStorage if available
  const [translations, setTranslations] = useState(() => {
    const local = window.localStorage.getItem('dashboard-translations');
    if (local) return JSON.parse(local);
    return JSON.parse(JSON.stringify(baseTranslations));
  });
  const [editLang, setEditLang] = useState<'ar'|'en'|'fr'>(lang);
  const [filter, setFilter] = useState('');
  const keys = getAllKeys(translations);
  const filteredKeys = filter ? keys.filter(k => k.toLowerCase().includes(filter.toLowerCase())) : keys;

  const handleChange = (key: string, value: string) => {
    setTranslations((prev: any) => {
      const updated = { ...prev, [editLang]: { ...prev[editLang], [key]: value } };
      // Live preview: update the i18n module translations in memory
      if ((i18nModule as any).translations) {
        (i18nModule as any).translations[editLang][key] = value;
      }
      return updated;
    });
  };

  const handleSave = () => {
    window.localStorage.setItem('dashboard-translations', JSON.stringify(translations));
    alert('تم حفظ التعديلات محلياً! (للتجربة فقط)');
  };

  return (
    <div style={{maxWidth:900,margin:'auto',padding:24}}>
      <h2>📝 إدارة الترجمة (تجريبي)</h2>
      <div style={{marginBottom:16,display:'flex',gap:8,alignItems:'center'}}>
        <label>اللغة:</label>
        <select value={editLang} onChange={e=>setEditLang(e.target.value as 'ar'|'en'|'fr')}>
          <option value="ar">العربية</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
        <input placeholder="بحث عن مفتاح..." value={filter} onChange={e=>setFilter(e.target.value)} style={{marginLeft:16,padding:'4px 8px'}} />
        <button onClick={handleSave} style={{marginLeft:'auto',padding:'4px 16px',borderRadius:6}}>💾 حفظ</button>
      </div>
      <table style={{width:'100%',borderCollapse:'collapse',background:'#fff'}}>
        <thead>
          <tr style={{background:'#f0f0f0'}}>
            <th style={{padding:8,border:'1px solid #ddd'}}>المفتاح</th>
            <th style={{padding:8,border:'1px solid #ddd'}}>النص ({editLang})</th>
          </tr>
        </thead>
        <tbody>
          {filteredKeys.map(key => (
            <tr key={key}>
              <td style={{padding:8,border:'1px solid #eee',fontFamily:'monospace'}}>{key}</td>
              <td style={{padding:8,border:'1px solid #eee'}}>
                <input
                  style={{width:'100%',padding:'4px'}}
                  value={translations[editLang][key] || ''}
                  onChange={e=>handleChange(key, e.target.value)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{marginTop:16,fontSize:13,color:'#888'}}>⚠️ التعديلات تحفظ محلياً فقط (localStorage) وتظهر فوراً في الواجهة (تجريبي). لا تؤثر على الترجمة الفعلية إلا إذا تم ربطها بواجهة API لاحقاً.</div>
    </div>
  );
}
