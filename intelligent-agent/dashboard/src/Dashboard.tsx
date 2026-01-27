
import ContractDashboardCharts from './ContractDashboardCharts';
import CrmDashboard from './crm/CrmDashboard';
import { Suspense, useState, useEffect } from 'react';
import TranslationAdminPanel from './TranslationAdminPanel';
import { useI18n } from './i18n';
const CompliancePanel = React.lazy(() => import('./CompliancePanel'));
const KnowledgeArticlePanel = React.lazy(() => import('./KnowledgeArticlePanel'));
const ComplianceRiskPanel = React.lazy(() => import('./ComplianceRiskPanel'));
const ComplianceRiskTrends = React.lazy(() => import('./ComplianceRiskTrends'));

  const [stats, setStats] = useState<any>(null);
  const [showCrm, setShowCrm] = useState(false);
  const { t, lang } = useI18n();
  const [showTranslationAdmin, setShowTranslationAdmin] = useState(false);
  // Dark mode state
  const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('dashboard-theme');
      if (stored === 'dark' || stored === 'light') return stored;
    }
    return 'light';
  };
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme());
  useEffect(() => {
    document.body.setAttribute('data-dashboard-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-theme', theme);
    }
  }, [theme]);
  useEffect(() => {
    fetch('/dashboard/api/stats').then(r => r.json()).then(setStats);
  }, []);
  if (showCrm) return <CrmDashboard />;
  if (!stats) return <div>{t('loading')}</div>;
  // Set direction based on language
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const darkModeStyles = theme === 'dark' ? {
    background: '#181a1b',
    color: '#f1f1f1',
    borderColor: '#333',
    transition: 'background 0.2s, color 0.2s'
  } : {};
  return (
    <div style={{fontFamily:'Tahoma,Arial',maxWidth:900,margin:'auto', ...darkModeStyles}} dir={dir}>
      <div style={{display:'flex',justifyContent:'flex-end',alignItems:'center',marginBottom:8,gap:8}}>
                <button
                  onClick={()=>setShowCrm(true)}
                  style={{padding:'4px 12px',borderRadius:6,border:'1px solid #888',background:'#e6f7ff',color:'#1890ff',cursor:'pointer'}}
                >
                  CRM
                </button>
        <button
          onClick={()=>setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{padding:'4px 12px',borderRadius:6,border:'1px solid #888',background:theme==='dark'?'#222':'#fff',color:theme==='dark'?'#fff':'#222',cursor:'pointer'}}
          aria-label={theme==='dark'?t('switchToLight')||'الوضع الفاتح':t('switchToDark')||'الوضع الليلي'}
        >
          {theme === 'dark' ? '🌙 '+(t('switchToLight')||'وضع فاتح') : '☀️ '+(t('switchToDark')||'وضع ليلي')}
        </button>
        <button
          onClick={()=>setShowTranslationAdmin(true)}
          style={{padding:'4px 12px',borderRadius:6,border:'1px solid #888',background:'#f5f5f5',color:'#333',cursor:'pointer'}}
        >
          📝 إدارة الترجمة
        </button>
      </div>
      {showTranslationAdmin && (
        <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:10,boxShadow:'0 2px 16px #0002',maxHeight:'90vh',overflow:'auto',position:'relative',minWidth:350}}>
            <button onClick={()=>setShowTranslationAdmin(false)} style={{position:'absolute',top:8,right:12,fontSize:22,background:'none',border:'none',cursor:'pointer',color:'#888'}}>×</button>
            <TranslationAdminPanel />
          </div>
        </div>
      )}
      <h2>{t('dashboardTitle') || 'لوحة تحكم الذكاء الذاتي'}</h2>
      <div style={{margin:'10px 0'}}>
        <button onClick={()=>window.open('/dashboard/api/export/pdf','_blank')}>{t('export')} PDF</button>
        <button onClick={()=>window.open('/dashboard/api/export/excel','_blank')} style={{marginRight:8}}>{t('export')} Excel</button>
      </div>
      <div>{t('totalInteractions') || 'إجمالي التفاعلات'}: <b>{stats.total}</b></div>
      <div>{t('weeklyInteractions') || 'تفاعلات هذا الأسبوع'}: <b>{stats.weekCount}</b></div>
      <div>{t('weeklyErrors') || 'عدد الأخطاء هذا الأسبوع'}: <b>{stats.errorCount}</b></div>
      <div>{t('topQuestions') || 'أكثر الأسئلة تكراراً'}:</div>
      <ul>
        {stats.topQuestions.map(([q, c]: [string, number]) => <li key={q}>{q} <b>({c})</b></li>)}
      </ul>
      {stats.feedbackStats && (
        <div>
          <div>{t('maxRating') || 'أعلى تقييم'}: {stats.feedbackStats.max}</div>
          <div>{t('minRating') || 'أقل تقييم'}: {stats.feedbackStats.min}</div>
          <div>{t('allRatings') || 'كل التقييمات'}: {stats.feedbackStats.all.join(', ')}</div>
        </div>
      )}
      <hr style={{margin:'32px 0'}} />
      <ContractDashboardCharts />
      <hr style={{margin:'32px 0'}} />
      <Suspense fallback={<div style={{height:200,background:'#fafafa',textAlign:'center',padding:32}}>{t('loadingCompliancePanel') || 'تحميل لوحة الامتثال...'}</div>}>
        <CompliancePanel />
      </Suspense>
      <hr style={{margin:'32px 0'}} />
      <Suspense fallback={<div style={{height:200,background:'#fafafa',textAlign:'center',padding:32}}>{t('loadingRiskAnalysis') || 'تحميل تحليل المخاطر الذكي...'}</div>}>
        <ComplianceRiskPanel />
      </Suspense>
      <Suspense fallback={<div style={{height:120,background:'#fafafa',textAlign:'center',padding:32}}>{t('loadingRiskTrends') || 'تحميل اتجاهات المخاطر...'}</div>}>
        <ComplianceRiskTrends />
      </Suspense>
      <hr style={{margin:'32px 0'}} />
      <Suspense fallback={<div style={{height:200,background:'#fafafa',textAlign:'center',padding:32}}>{t('loadingKnowledgeArticles') || 'تحميل مقالات المعرفة...'}</div>}>
        <KnowledgeArticlePanel />
      </Suspense>
    </div>
  );
}
