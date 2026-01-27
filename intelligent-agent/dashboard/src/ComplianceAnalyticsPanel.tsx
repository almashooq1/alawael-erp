import React, { useEffect, useState, Suspense } from 'react';
import { Card, Row, Col } from 'antd';
import { Bar as BarBase, Pie as PieBase, Line as LineBase } from 'react-chartjs-2';
import { useI18n, I18nProvider } from './i18n';
const Bar = React.memo(BarBase);
const Pie = React.memo(PieBase);
const Line = React.memo(LineBase);
import 'chart.js/auto';

function ComplianceAnalyticsPanelInner() {
  const [stats, setStats] = useState<any>(null);
  const [ai, setAI] = useState<any>(null);
  const { t, lang, setLang } = useI18n();
  useEffect(() => {
    fetch('/v1/compliance/stats').then(r => r.json()).then(setStats);
    fetch('/v1/compliance/ai-analysis').then(r => r.json()).then(setAI);
  }, []);
  if (!stats || !ai) return <div style={{padding:24}}>
    <div style={{background:'#fafafa',padding:32,borderRadius:8,margin:'32px 0',textAlign:'center',color:'#888',fontSize:18}}>
      <div className="skeleton-loader" style={{height:32,background:'#eee',margin:'12px 0',borderRadius:4}} />
      <div className="skeleton-loader" style={{height:24,background:'#eee',margin:'12px 0',borderRadius:4}} />
      <div className="skeleton-loader" style={{height:180,background:'#f5f5f5',margin:'24px 0',borderRadius:8}} />
      {t('loading')}
    </div>
  </div>;
  // إعداد بيانات الرسوم
  const statusData = {
    labels: stats.byStatus.map((s:any) => s._id),
    datasets: [{ label: t('eventsCount') || 'عدد الأحداث', data: stats.byStatus.map((s:any) => s.count), backgroundColor: ['#f5222d','#faad14','#52c41a'] }]
  };
  const timelineData = {
    labels: stats.timeline.map((t:any) => t._id),
    datasets: [{ label: t('eventsCount') || 'عدد الأحداث', data: stats.timeline.map((t:any) => t.count), fill: false, borderColor: '#1890ff' }]
  };
  const policyData = {
    labels: stats.byPolicy.map((p:any) => p._id||t('undefined')||'غير محدد'),
    datasets: [{ label: t('violationsPerPolicy') || 'خروقات لكل سياسة', data: stats.byPolicy.map((p:any) => p.count), backgroundColor: '#faad14' }]
  };
  const resourceData = {
    labels: stats.byResource.map((r:any) => r._id||t('undefined')||'غير محدد'),
    datasets: [{ label: t('violationsPerResource') || 'خروقات لكل مورد', data: stats.byResource.map((r:any) => r.count), backgroundColor: '#f5222d' }]
  };
  return (
    <div style={{padding:24}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h2>{t('advancedAnalyticsPanel') || 'لوحة التحليل المتقدم للامتثال'}</h2>
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
      <Card style={{marginBottom:24,background:'#f6ffed',border:'1px solid #b7eb8f'}}>
        <h3 style={{color:'#237804'}}>{t('aiComplianceAnalysis') || 'تحليل ذكي للامتثال (AI)'}</h3>
        <div style={{display:'flex',gap:32,flexWrap:'wrap'}}>
          <div><b>{t('totalEvents') || 'إجمالي الأحداث'}:</b> {ai.total}</div>
          <div><b>{t('fail') || 'فشل'}:</b> <span style={{color:'#f5222d'}}>{ai.failCount}</span></div>
          <div><b>{t('warning') || 'تحذير'}:</b> <span style={{color:'#faad14'}}>{ai.warningCount}</span></div>
          <div><b>{t('success') || 'نجاح'}:</b> <span style={{color:'#52c41a'}}>{ai.successCount}</span></div>
          <div><b>{t('escalationRisk') || 'مخاطر التصعيد'}:</b> <span style={{color:ai.escalationRisk==='مرتفع'?'#d4380d':ai.escalationRisk==='متوسط'?'#faad14':'#389e0d',fontWeight:'bold'}}>{ai.escalationRisk}</span></div>
        </div>
        <div style={{marginTop:12}}><b>{t('smartRecommendation') || 'توصية ذكية'}:</b> <span style={{color:'#096dd9'}}>{ai.aiAdvice}</span></div>
        {ai.openaiSummary && <div style={{marginTop:12,background:'#fffbe6',padding:12,borderRadius:6}}><b>{t('advancedAISummary') || 'تحليل AI متقدم'}:</b><br/>{ai.openaiSummary}</div>}
      </Card>
      <Row gutter={24}>
        <Col span={12}><Card title={t('statusDistribution') || 'توزيع الحالات'}>
          <Suspense fallback={<div style={{height:220,background:'#fafafa'}} />}> <Pie data={statusData} /> </Suspense>
        </Card></Col>
        <Col span={12}><Card title={t('timelineDistribution') || 'توزيع زمني (30 يوم)'}>
          <Suspense fallback={<div style={{height:220,background:'#fafafa'}} />}> <Line data={timelineData} /> </Suspense>
        </Card></Col>
      </Row>
      <Row gutter={24} style={{marginTop:24}}>
        <Col span={12}><Card title={t('mostViolatedPolicies') || 'أكثر السياسات اختراقًا'}>
          <Suspense fallback={<div style={{height:220,background:'#fafafa'}} />}> <Bar data={policyData} /> </Suspense>
        </Card></Col>
        <Col span={12}><Card title={t('mostViolatedResources') || 'أكثر الموارد تعرضًا للخرق'}>
          <Suspense fallback={<div style={{height:220,background:'#fafafa'}} />}> <Bar data={resourceData} /> </Suspense>
        </Card></Col>
      </Row>
    </div>
  );
}

export default function ComplianceAnalyticsPanel() {
  return (
    <I18nProvider>
      <ComplianceAnalyticsPanelInner />
    </I18nProvider>
  );
}
