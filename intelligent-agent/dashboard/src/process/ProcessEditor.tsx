import React, { useState } from 'react';
import { useI18n } from '../i18n';
// محرر سير العمل: إنشاء أو تعديل عملية (خطوات، تسلسل، تعيينات)

interface ProcessStep {
  id: string;
  name: string;
  type: 'manual' | 'automated' | 'approval';
  assignee?: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
}

  const [name, setName] = useState(initial?.name || '');
  const [steps, setSteps] = useState<ProcessStep[]>(initial?.steps || []);
  const [stepName, setStepName] = useState('');
  const [stepType, setStepType] = useState<'manual'|'automated'|'approval'>('manual');
  const { t, lang } = useI18n();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const theme = (typeof window !== 'undefined' && window.localStorage.getItem('dashboard-theme')) || 'light';
  const darkModeStyles = theme === 'dark' ? {
    background: '#181a1b',
    color: '#f1f1f1',
    borderColor: '#333',
    transition: 'background 0.2s, color 0.2s'
  } : {};

  const addStep = () => {
    if (!stepName) return;
    setSteps([...steps, { id: Date.now()+stepName, name: stepName, type: stepType, status: 'pending' }]);
    setStepName('');
  };

  return (
    <div style={{maxWidth:700,margin:'auto',padding:24, ...darkModeStyles}} dir={dir}>
      <h3>{t('processEditor') || 'محرر سير العمل'}</h3>
      <div style={{marginBottom:16}}>
        <label>{t('processName') || 'اسم العملية'}:</label>
        <input value={name} onChange={e=>setName(e.target.value)} style={{margin:8,padding:4}} />
      </div>
      <div style={{marginBottom:16}}>
        <label>{t('addStep') || 'إضافة خطوة'}:</label>
        <input value={stepName} onChange={e=>setStepName(e.target.value)} placeholder={t('stepName') || 'اسم الخطوة'} style={{margin:8,padding:4}} />
        <select value={stepType} onChange={e=>setStepType(e.target.value as any)} style={{margin:8}}>
          <option value="manual">{t('manual') || 'يدوي'}</option>
          <option value="automated">{t('automated') || 'مؤتمت'}</option>
          <option value="approval">{t('approval') || 'موافقة'}</option>
        </select>
        <button onClick={addStep}>{t('add') || 'إضافة'}</button>
      </div>
      <ul>
        {steps.map((s,i) => <li key={s.id}>{s.name} ({t(s.type) || s.type})</li>)}
      </ul>
      <button style={{marginTop:24,padding:'8px 24px',fontSize:16}} onClick={()=>onSave && onSave({ name, steps })}>{t('saveProcess') || 'حفظ العملية'}</button>
    </div>
  );
}
