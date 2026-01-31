import DynamicTranslationAdmin from './DynamicTranslationAdmin';
import NotificationChannelsSettings from './NotificationChannelsSettings';
import SmartUXAssistant from './SmartUXAssistant';
import ExternalIntegrationsSettings from './ExternalIntegrationsSettings';
import RBACSettings from './RBACSettings';
import ProcessChangeLog from './ProcessChangeLog';
import BPMNEditor from './BPMNEditor';
import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import { useI18n } from '../i18n';
import RiskDashboard from './RiskDashboard';
import MLInsightsPanel from './MLInsightsPanel';
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
  // Snackbar/notification helpers
  const showSuccess = (msg: string) => message.success({ content: msg, duration: 3 });
  const showError = (msg: string) => message.error({ content: msg, duration: 4 });
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const { t, lang } = useI18n();
  const [showSmartDashboard, setShowSmartDashboard] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showBPMN, setShowBPMN] = useState(false);
  const [bpmnXml, setBpmnXml] = useState<string | undefined>(undefined);
  const [showRiskDashboard, setShowRiskDashboard] = useState(false);
  const [showMLInsights, setShowMLInsights] = useState(false);
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

  // أنماط خاصة لدعم اللمس
  const touchStyles: React.CSSProperties = {
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    userSelect: 'none',
  };

  // تكبير الأزرار وتسهيل لمسها
  const touchButtonStyle: React.CSSProperties = {
    ...touchStyles,
    minWidth: 56,
    minHeight: 44,
    fontSize: 18,
    borderRadius: 10,
    boxShadow: '0 1px 4px #ccc',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
  };

  // أنماط الجدول لدعم اللمس
  const touchTableStyle: React.CSSProperties = {
    ...touchStyles,
    fontSize: 17,
  };

  return (
    <div style={{maxWidth:900,margin:'auto',padding:24, ...darkModeStyles, ...touchStyles}} dir={dir}>
      <h2>{t('processDashboard') || 'لوحة العمليات'}</h2>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
        <h2>{t('processDashboard') || 'لوحة العمليات'}</h2>
        <div style={{display:'flex',gap:12}}>
          <button onClick={()=>setShowSmartDashboard(s=>!s)} style={{...touchButtonStyle, background:'#1890ff',color:'#fff',border:'none',fontWeight:500}}>
            {t('smartDashboard') || 'لوحة التحكم الذكية'}
          </button>
          <button onClick={()=>setShowChannels(s=>!s)} style={{...touchButtonStyle, background:'#52c41a',color:'#fff',border:'none',fontWeight:500}}>
            {t('notificationChannels') || 'قنوات التنبيهات'}
          </button>
          <button onClick={()=>setShowBPMN(s=>!s)} style={{...touchButtonStyle, background:'#faad14',color:'#fff',border:'none',fontWeight:500}}>
            BPMN
          </button>
          <button onClick={()=>setShowRiskDashboard(s=>!s)} style={{...touchButtonStyle, background:'#e74c3c',color:'#fff',border:'none',fontWeight:500}}>
            {t('riskDashboard') || 'لوحة المخاطر'}
          </button>
          <button onClick={()=>setShowMLInsights(s=>!s)} style={{...touchButtonStyle, background:'#6c5ce7',color:'#fff',border:'none',fontWeight:500}}>
            {t('mlInsights') || 'مؤشرات الذكاء الاصطناعي'}
          </button>
        </div>
      </div>
      {showBPMN && (
        <div>
          <BPMNEditor xml={bpmnXml} onChange={xml => setBpmnXml(xml)} />
          <button
            style={{...touchButtonStyle, marginTop:16, background:'#1890ff'}}
            onClick={() => {
              if (bpmnXml) {
                showSuccess(t('bpmnSaved') || 'تم حفظ مخطط BPMN ومزامنته مع العمليات!');
              } else {
                showError(t('bpmnEmpty') || 'يرجى إدخال مخطط BPMN أولاً.');
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
      {showMLInsights && <MLInsightsPanel />}
      {!showSmartDashboard && !showChannels && !showRiskDashboard && !showMLInsights && (
        loading ? <div>{t('loading') || 'جاري التحميل...'}</div> : (
          <>
            <table style={{width:'100%',background:'#fff',boxShadow:'0 2px 8px #eee',...touchTableStyle}}>
              <thead><tr><th>{t('processName') || 'اسم العملية'}</th><th>{t('status') || 'الحالة'}</th><th>{t('createdAt') || 'تاريخ الإنشاء'}</th><th>{t('updatedAt') || 'آخر تحديث'}</th><th>{t('actions') || 'إجراءات'}</th></tr></thead>
              <tbody>
                {processes.map(p => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>{t(p.status) || p.status}</td>
                    <td>{p.createdAt}</td>
                    <td>{p.updatedAt}</td>
                    <td>
                      <button
                        style={{...touchButtonStyle,marginRight:8}}
                        onClick={() => showSuccess(t('viewProcessSuccess') || `تم عرض العملية: ${p.name}`)}
                      >
                        {t('view') || 'عرض'}
                      </button>
                      <button
                        style={touchButtonStyle}
                        onClick={() => showSuccess(t('editProcessSuccess') || `تم فتح تعديل العملية: ${p.name}`)}
                      >
                        {t('edit') || 'تعديل'}
                      </button>
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
      <button style={{...touchButtonStyle,marginTop:24,fontSize:18}}>➕ {t('addProcess') || 'إضافة عملية جديدة'}</button>
      <SmartUXAssistant />
    </div>
  );
}
