// Remove JSX pragma for compatibility with tsconfig.json
import * as React from 'react';
import { useI18n, I18nProvider } from './i18n';

function SourcesPanelInner() {
  const [sources, setSources] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({ type: '', name: '', config: '', schedule: '' });
  const { t, lang, setLang } = useI18n();
  React.useEffect(() => {
    fetch('/dashboard/sources/list').then(r=>r.json()).then(setSources);
  }, []);
  function handleAdd(e:any) {
    e.preventDefault();
    fetch('/dashboard/sources/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, config: form.config ? JSON.parse(form.config) : {} })
    }).then(r=>r.json()).then(src=>setSources(s=>[...s,src]));
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:700,margin:'auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h2>{t('smartSourcesManagement') || 'إدارة مصادر البيانات الذكية'}</h2>
      <label htmlFor="lang-switcher" style={{marginLeft:8,fontWeight:500}}>
        🌐
      </label>
      <select
        id="lang-switcher"
        aria-label="Language selector"
        value={lang}
        onChange={e=>setLang(e.target.value as 'ar'|'en'|'fr')}
        style={{padding:'2px 8px',fontSize:14,borderRadius:4,border:'1px solid #ccc',marginLeft:4}}
      >
        <option value="ar">🇸🇦 العربية</option>
        <option value="en">🇬🇧 English</option>
        <option value="fr">🇫🇷 Français</option>
      </select>
    </div>
    <form onSubmit={handleAdd} style={{marginBottom:24}}>
      <input placeholder={t('type')||'النوع'} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} required />
      <input placeholder={t('name')||'الاسم'} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
      <input placeholder={t('cronSchedule')||'جدولة كرون'} value={form.schedule} onChange={e=>setForm(f=>({...f,schedule:e.target.value}))} required />
      <input placeholder={t('configJSON')||'إعدادات (JSON)'} value={form.config} onChange={e=>setForm(f=>({...f,config:e.target.value}))} />
      <button type="submit">{t('addSource')||'إضافة مصدر'}</button>
    </form>
    <table style={{width:'100%'}}><thead><tr>
      <th>{t('name')||'الاسم'}</th>
      <th>{t('type')||'النوع'}</th>
      <th>{t('status')||'الحالة'}</th>
      <th>{t('schedule')||'الجدولة'}</th>
      <th>{t('lastImport')||'آخر استيراد'}</th>
    </tr></thead>
      <tbody>
        {sources.map(s=><tr key={s.id}><td>{s.name}</td><td>{s.type}</td><td>{s.enabled?'✅':'❌'}</td><td>{s.schedule}</td><td>{s.lastImport||'-'}</td></tr>)}
      </tbody>
    </table>
  </div>;
}

export default function SourcesPanel() {
  return (
    <I18nProvider>
      <SourcesPanelInner />
    </I18nProvider>
  );
}
