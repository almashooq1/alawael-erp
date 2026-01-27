
import React, { useEffect, useState } from 'react';
import { exportPoliciesToCSV, exportPoliciesToExcel } from './exportUtils';
import { exportPoliciesToPDF } from './exportPDF';
import { useI18n, I18nProvider } from './i18n';

type Policy = {
  _id?: string;
  name: string;
  description: string;
  enabled: boolean;
};

type Recommendation = {
  mostViolated: { policy: string; count: number }[];
  aiRecommendation?: string;
};

function CompliancePolicyPanelInner() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [form, setForm] = useState<Policy>({ name: '', description: '', enabled: true });
  const [editId, setEditId] = useState<string|null>(null);
  const [recommend, setRecommend] = useState<Recommendation|null>(null);
  const [aiDraft, setAiDraft] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const { t, lang, setLang } = useI18n();
  useEffect(() => {
    if (recommend && recommend.aiRecommendation) setAiDraft(recommend.aiRecommendation);
  }, [recommend]);

  // Smart feature: show proactive recommendation if a policy is violated >3 times
  const mostViolated = recommend?.mostViolated?.[0];
  const showProactiveBanner = mostViolated && mostViolated.count >= 3 && recommend?.aiRecommendation;

  const load = () => fetch('/v1/compliance/policy')
    .then(r=>r.json())
    .then((data: Policy[]) => setPolicies(data));
  useEffect(() => {
    load();
    fetch('/v1/compliance/policy/recommend').then(r=>r.json()).then(setRecommend);
  }, []);

  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editId) {
      await fetch('/v1/compliance/policy/' + editId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } else {
      await fetch('/v1/compliance/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    setForm({ name: '', description: '', enabled: true });
    setEditId(null);
    load();
  };
  const del = async (id: string) => {
    if (window.confirm(t('delete') + '؟')) {
      await fetch('/v1/compliance/policy/' + id, { method: 'DELETE' });
      load();
    }
  };
  const edit = (p: Policy) => {
    setForm({ name: p.name, description: p.description, enabled: p.enabled });
    setEditId(p._id || null);
  };
  const handlePrint = () => {
    window.print();
  };
  return (
    <div style={{maxWidth:700,margin:'auto',fontFamily:'Tahoma'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>{t('compliancePolicies')}</h2>
        <label htmlFor="lang-switcher" style={{marginLeft:8,fontWeight:500}}>
          🌐
        </label>
        <select
          id="lang-switcher"
          aria-label="Language selector"
          value={lang}
          onChange={e=>setLang(e.target.value)}
          style={{padding:'2px 8px',fontSize:14,borderRadius:4,border:'1px solid #ccc',marginLeft:4}}
        >
          <option value="ar">🇸🇦 العربية</option>
          <option value="en">🇬🇧 English</option>
          <option value="fr">🇫🇷 Français</option>
        </select>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>
        <button onClick={()=>exportPoliciesToCSV(policies)} style={{padding:'4px 12px'}}>{t('export')} CSV</button>
        <button onClick={()=>exportPoliciesToExcel(policies)} style={{padding:'4px 12px'}}>{t('export')} Excel</button>
        <button onClick={()=>exportPoliciesToPDF(policies)} style={{padding:'4px 12px'}}>{t('export')} PDF</button>
        <button onClick={handlePrint} style={{padding:'4px 12px'}}>{t('print')}</button>
      </div>
      {/* TODO: i18n for banners and recommendations below */}
      {showProactiveBanner && (
        <div style={{background:'#fffbe6',border:'1px solid #ffe58f',padding:16,borderRadius:8,marginBottom:24,boxShadow:'0 2px 8px #ffe58f'}}>
          <b>{t('smartSuggestion')}</b> {t('repeatedViolationsDetectedForPolicy') || (lang === 'ar' ? 'تم رصد خروقات متكررة لسياسة' : 'Repeated violations detected for policy')} <span style={{color:'#d4380d',fontWeight: 'bold'}}>{mostViolated.policy}</span> (<span style={{color:'#d4380d'}}>{mostViolated.count} {t('violations') || (lang === 'ar' ? 'خرق' : 'violations')}</span>)<br/>
          <span>{t('recommendUpdateOrAddPolicy') || (lang === 'ar' ? 'يوصى بتحديث السياسة أو إضافة سياسة جديدة بناءً على التحليل الذكي.' : 'It is recommended to update the policy or add a new one based on smart analysis.')}</span>
          <div style={{marginTop:10}}>
            <button
              style={{background:'#1890ff',color:'#fff',border:'none',padding:'6px 18px',borderRadius:4,cursor:'pointer'}}
              onClick={() => {
                setForm({ name: t('smartRecommendation') + ' ' + mostViolated.policy, description: recommend.aiRecommendation||'', enabled: true });
                setEditId(null);
                window.scrollTo({top:0,behavior:'smooth'});
              }}
            >{t('adoptRecommendation')}</button>
          </div>
        </div>
      )}
      {recommend && (
        <div style={{background:'#e6f7ff',border:'1px solid #91d5ff',padding:16,borderRadius:8,marginBottom:24}}>
          <b>{t('mostViolatedPolicies')}</b>
          <ul style={{margin:'8px 0 0 0'}}>
            {recommend.mostViolated.map((v) => (
              <li key={v.policy}>
                <span style={{ color: '#d4380d', fontWeight: 'bold' }}>{v.policy}</span>
                <span style={{ color: '#888' }}>({v.count} {t('violations')})</span>
              </li>
            ))}
            {recommend.mostViolated.length === 0 && <li style={{ color: '#888' }}>{t('noViolations')}</li>}
          </ul>
          {recommend.aiRecommendation && (
            <div style={{marginTop:12,background:'#fffbe6',padding:12,borderRadius:6}}>
              <b>{t('smartRecommendation')}</b><br/>
              <textarea value={aiDraft} onChange={e=>setAiDraft(e.target.value)} style={{width:'100%',minHeight:48,margin:'8px 0',fontFamily:'inherit',fontSize:15}} />
              <button onClick={async()=>{
                await fetch('/v1/compliance/policy', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({ name: t('smartRecommendation'), description: aiDraft, enabled: true })
                });
                setForm({ name: '', description: '', enabled: true }); setEditId(null); load();
                setSuccessMsg(t('recommendationAdoptedSuccessfully') || (lang === 'ar' ? 'تم اعتماد التوصية كسياسة بنجاح' : 'Recommendation adopted as policy successfully'));
                setTimeout(()=>setSuccessMsg(''), 3000);
              }} style={{marginTop:8,background:'#1890ff',color:'#fff',border:'none',padding:'6px 18px',borderRadius:4,cursor:'pointer'}}>{t('adoptAsPolicy') || (lang === 'ar' ? 'اعتماد التوصية كسياسة' : 'Adopt as Policy')}</button>
            </div>
          )}
        </div>
      )}
      {successMsg && <div style={{background:'#f6ffed',color:'#389e0d',padding:10,borderRadius:6,marginBottom:12,border:'1px solid #b7eb8f',textAlign:'center'}}>{successMsg}</div>}
      <form onSubmit={save} style={{marginBottom:24,background:'#fafafa',padding:16,borderRadius:8}}>
        <input required placeholder={t('compliancePolicies') + ' ' + t('add')} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={{width:'60%',margin:4}} />
        <input placeholder={t('details')} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{width:'35%',margin:4}} />
        <label style={{margin:8}}><input type="checkbox" checked={form.enabled} onChange={e=>setForm(f=>({...f,enabled:e.target.checked}))}/>{form.enabled ? t('enabled') : t('disabled')}</label>
        <button type="submit" style={{margin:8}}>{editId?t('edit'):t('add')}</button>
        {editId && <button type="button" onClick={()=>{setEditId(null);setForm({name:'',description:'',enabled:true});}}>{t('delete')}</button>}
      </form>
      <table style={{width:'100%',background:'#fff',boxShadow:'0 2px 8px #eee',fontSize:15}}>
        <thead><tr><th>{t('compliancePolicies')}</th><th>{t('details')}</th><th>{t('enabled')}</th><th>{t('edit')}</th></tr></thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p._id} style={{ background: !p.enabled ? '#f5f5f5' : '#fff' }}>
              <td>{p.name}</td>
              <td>{p.description}</td>
              <td style={{ color: p.enabled ? 'green' : '#888' }}>{p.enabled ? t('enabled') : t('disabled')}</td>
              <td>
                <button onClick={() => edit(p)}>{t('edit')}</button>
                <button onClick={() => p._id && del(p._id)} style={{ color: 'red' }}>{t('delete')}</button>
              </td>
            </tr>
          ))}
          {policies.length===0 && <tr><td colSpan={4} style={{textAlign:'center',color:'#888'}}>{lang === 'ar' ? 'لا توجد سياسات' : 'No policies found'}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default function CompliancePolicyPanel() {
  return (
    <I18nProvider>
      <CompliancePolicyPanelInner />
    </I18nProvider>
  );
}
