import React, { useState } from 'react';

const initialTranslations = {
  ar: { processDashboard: 'لوحة العمليات', addProcess: 'إضافة عملية' },
  en: { processDashboard: 'Process Dashboard', addProcess: 'Add Process' },
  fr: { processDashboard: 'Tableau des processus', addProcess: 'Ajouter un processus' },
};

export default function DynamicTranslationAdmin() {
  const [translations, setTranslations] = useState(initialTranslations);
  const [lang, setLang] = useState('ar');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');

  const handleAddOrUpdate = () => {
    if (!key) return;
    setTranslations({
      ...translations,
      [lang]: { ...translations[lang], [key]: value }
    });
    setKey('');
    setValue('');
  };

  return (
    <div style={{margin:'32px 0',background:'#f9f9f9',padding:24,borderRadius:8}}>
      <h3>إدارة الترجمة الديناميكية</h3>
      <div style={{display:'flex',gap:12,marginBottom:16}}>
        <select value={lang} onChange={e=>setLang(e.target.value)}>
          <option value="ar">العربية</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
        <input placeholder="مفتاح الترجمة" value={key} onChange={e=>setKey(e.target.value)} />
        <input placeholder="النص المترجم" value={value} onChange={e=>setValue(e.target.value)} />
        <button onClick={handleAddOrUpdate}>حفظ</button>
      </div>
      <table style={{width:'100%',background:'#fff',borderRadius:6,boxShadow:'0 1px 4px #eee',fontSize:15}}>
        <thead>
          <tr>
            <th>المفتاح</th>
            <th>العربية</th>
            <th>English</th>
            <th>Français</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys({...translations.ar,...translations.en,...translations.fr}).map(k => (
            <tr key={k}>
              <td>{k}</td>
              <td>{translations.ar[k] || ''}</td>
              <td>{translations.en[k] || ''}</td>
              <td>{translations.fr[k] || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
