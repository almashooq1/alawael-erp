// Remove JSX pragma for compatibility with tsconfig.json
import * as React from 'react';
import { useI18n, I18nProvider } from './i18n';

function RolesPanelInner() {
  const [roles, setRoles] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({ name: '', permissions: '' });
  const { t, lang, setLang } = useI18n();
  React.useEffect(() => {
    fetch('/dashboard/permissions/list').then(r=>r.json()).then(setRoles);
  }, []);
  function handleAdd(e:any) {
    e.preventDefault();
    fetch('/dashboard/permissions/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, permissions: form.permissions.split(',').map((p:string)=>p.trim()) })
    }).then(r=>r.json()).then(role=>setRoles(r=>[...r,role]));
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h2>{t('rolesManagement') || 'إدارة الأدوار والصلاحيات'}</h2>
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
      <input placeholder={t('roleName')||'اسم الدور'} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
      <input placeholder={t('permissionsComma')||'الصلاحيات (مفصولة بفاصلة)'} value={form.permissions} onChange={e=>setForm(f=>({...f,permissions:e.target.value}))} required />
      <button type="submit">{t('addRole')||'إضافة دور'}</button>
    </form>
    <table style={{width:'100%'}}><thead><tr>
      <th>{t('role')||'الدور'}</th>
      <th>{t('permissions')||'الصلاحيات'}</th>
    </tr></thead>
      <tbody>
        {roles.map(r=><tr key={r.id}><td>{r.name}</td><td>{r.permissions.join(', ')}</td></tr>)}
      </tbody>
    </table>
  </div>;
}

export default function RolesPanel() {
  return (
    <I18nProvider>
      <RolesPanelInner />
    </I18nProvider>
  );
}
