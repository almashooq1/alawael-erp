import DynamicTranslationAdmin from './DynamicTranslationAdmin';
import NotificationChannelsSettings from './NotificationChannelsSettings';
import SmartUXAssistant from './SmartUXAssistant';
import ExternalIntegrationsSettings from './ExternalIntegrationsSettings';
import RBACSettings from './RBACSettings';
import ProcessChangeLog from './ProcessChangeLog';
import BPMNEditor from './BPMNEditor';
import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import RiskDashboard from './RiskDashboard';
// واجهة لوحة العمليات الرئيسية
// تعرض قائمة العمليات، حالتها، وعدد المهام النشطة
import SmartUnifiedDashboard from './SmartUnifiedDashboard';

interface Process {
  _id: string;
  name: string;
  status: string;
  steps: any[];
  createdAt: string;
  updatedAt: string;
}

export default function ProcessDashboard() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useI18n();
  const [showSmartDashboard, setShowSmartDashboard] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showBPMN, setShowBPMN] = useState(false);
  const [bpmnXml, setBpmnXml] = useState<string | undefined>(undefined);
  const [showRiskDashboard, setShowRiskDashboard] = useState(false);
  const theme = (typeof window !== 'undefined' && window.localStorage.getItem('dashboard-theme')) || 'light';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    setTimeout(() => {
      setProcesses([
        { _id: '1', name: t('hiringProcess') || 'عملية توظيف', status: 'active', steps: [], createdAt: '2026-01-01', updatedAt: '2026-01-10' },
        { _id: '2', name: t('onboardingProcess') || 'إعداد موظف جديد', status: 'paused', steps: [], createdAt: '2026-01-05', updatedAt: '2026-01-12' }
      ]);
      setLoading(false);
    }, 500);
  }, [t]);

  const darkModeStyles = theme === 'dark' ? {
    background: '#181a1b',
    color: '#f1f1f1',
    borderColor: '#333',
    transition: 'background 0.2s, color 0.2s'
  } : {};

  return (
    <div style={{maxWidth:900,margin:'auto',padding:24, ...darkModeStyles}} dir={dir}>
      <h2>{t('processDashboard') || 'لوحة العمليات'}</h2>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
        <h2>{t('processDashboard') || 'لوحة العمليات'}</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setShowSmartDashboard(s=>!s)} style={{padding:'6px 16px',borderRadius:6,background:'#1890ff',color:'#fff',border:'none',fontWeight:500}}>
            {t('smartDashboard') || 'لوحة التحكم الذكية'}
          </button>
          <button onClick={()=>setShowChannels(s=>!s)} style={{padding:'6px 16px',borderRadius:6,background:'#52c41a',color:'#fff',border:'none',fontWeight:500}}>
            {t('notificationChannels') || 'قنوات التنبيهات'}
          </button>
          <button onClick={()=>setShowBPMN(s=>!s)} style={{padding:'6px 16px',borderRadius:6,background:'#faad14',color:'#fff',border:'none',fontWeight:500}}>
            BPMN
          </button>
          <button onClick={()=>setShowRiskDashboard(s=>!s)} style={{padding:'6px 16px',borderRadius:6,background:'#e74c3c',color:'#fff',border:'none',fontWeight:500}}>
            {t('riskDashboard') || 'لوحة المخاطر'}
          </button>
        </div>
      </div>
      {showBPMN && (
        <div>
          <BPMNEditor xml={bpmnXml} onChange={xml => setBpmnXml(xml)} />
          <button
            style={{marginTop:16,padding:'8px 24px',background:'#1890ff',color:'#fff',border:'none',borderRadius:6}}
            onClick={() => {
              if (bpmnXml) {
                alert('تم حفظ مخطط BPMN ومزامنته مع العمليات!');
              }
            }}
          >
            {t('saveAndSyncBPMN') || 'حفظ ومزامنة BPMN'}
          </button>
        </div>
      )}
      {showSmartDashboard && <SmartUnifiedDashboard />}
      {showChannels && <NotificationChannelsSettings />}
      {showRiskDashboard && <RiskDashboard />}
      {!showSmartDashboard && !showChannels && !showRiskDashboard && (
        loading ? <div>{t('loading') || 'جاري التحميل...'}</div> : (
          <>
            <table style={{width:'100%',background:'#fff',boxShadow:'0 2px 8px #eee',fontSize:15}}>
              <thead><tr><th>{t('processName') || 'اسم العملية'}</th><th>{t('status') || 'الحالة'}</th><th>{t('createdAt') || 'تاريخ الإنشاء'}</th><th>{t('updatedAt') || 'آخر تحديث'}</th><th>{t('actions') || 'إجراءات'}</th></tr></thead>
              <tbody>
                {processes.map(p => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{t(p.status) || p.status}</td>
                    <td>{p.createdAt}</td>
                    <td>{p.updatedAt}</td>
                    <td>
                      <button style={{marginRight:8}}>{t('view') || 'عرض'}</button>
                      <button>{t('edit') || 'تعديل'}</button>
                    </td>
                  </tr>
                ))}
                {processes.length === 0 && <tr><td colSpan={5} style={{textAlign:'center',color:'#888'}}>{t('noProcesses') || 'لا توجد عمليات'}</td></tr>}
              </tbody>
            </table>
            <ProcessChangeLog />
            <RBACSettings />
            <ExternalIntegrationsSettings />
            <DynamicTranslationAdmin />
          </>
        )
      )}
      <button style={{marginTop:24,padding:'8px 24px',fontSize:16}}>➕ {t('addProcess') || 'إضافة عملية جديدة'}</button>
      <SmartUXAssistant />
    </div>
  );
}
