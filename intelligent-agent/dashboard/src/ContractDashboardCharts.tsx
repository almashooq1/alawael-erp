
import * as React from 'react';
import { useI18n, I18nProvider } from './i18n';

function PieChart({ data, colors, size=180 }: { data: { label: string, value: number }[], colors: string[], size?: number }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let acc = 0;
  const r = size/2-10;
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{
    data.map((d, i) => {
      const start = acc/total*2*Math.PI;
      acc += d.value;
      const end = acc/total*2*Math.PI;
      const x1 = size/2 + r*Math.sin(start), y1 = size/2 - r*Math.cos(start);
      const x2 = size/2 + r*Math.sin(end), y2 = size/2 - r*Math.cos(end);
      const large = end-start > Math.PI ? 1 : 0;
      return <path key={i} d={`M${size/2},${size/2} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`} fill={colors[i%colors.length]}><title>{d.label}: {d.value}</title></path>;
    })
  }</svg>;
}

function ContractDashboardChartsInner() {
  const [report, setReport] = React.useState<any>(null);
  const { t, lang, setLang } = useI18n();
  React.useEffect(() => {
    fetch('/dashboard/contract-reports/summary').then(r=>r.json()).then(setReport);
  }, []);
  if (!report) return <div>{t('loading') || 'Loading...'}</div>;
  const statusData = [
    { label: t('active') || 'نشط', value: report.active },
    { label: t('expired') || 'منتهي', value: report.expired },
    { label: t('terminated') || 'منتهي مبكراً', value: report.terminated },
    { label: t('pending') || 'معلق', value: report.pending }
  ];
  const partyData = Object.entries(report.byParty)
    .map(([label, value]) => ({ label, value: typeof value === 'number' ? value : Number(value) }))
    .slice(0, 6);
  // RTL support: reverse flex row and list order for Arabic
  const isRTL = lang === 'ar';
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:900,margin:'auto'}} dir={isRTL ? 'rtl' : 'ltr'}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
      <h2>{t('contractsDashboardCharts') || 'لوحة تحكم العقود - رسوم بيانية'}</h2>
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
    <div style={{display:'flex',gap:32,flexWrap:'wrap',flexDirection:isRTL?'row-reverse':'row'}}>
      <div>
        <h4>{t('contractsByStatus') || 'توزيع العقود حسب الحالة'}</h4>
        <PieChart data={statusData} colors={['#4caf50','#f44336','#ff9800','#2196f3']} />
        <ul style={{direction:isRTL?'rtl':'ltr'}}>{(isRTL?[...statusData].reverse():statusData).map(d=><li key={d.label}>{d.label}: {d.value}</li>)}</ul>
      </div>
      <div>
        <h4>{t('contractsByParty') || 'توزيع العقود حسب الطرف (أكثر 6)'}</h4>
        <PieChart data={partyData} colors={['#2196f3','#9c27b0','#ffeb3b','#ff9800','#4caf50','#f44336']} />
        <ul style={{direction:isRTL?'rtl':'ltr'}}>{(isRTL?[...partyData].reverse():partyData).map(d=><li key={d.label}>{d.label}: {String(d.value)}</li>)}</ul>
      </div>
      <div>
        <h4>{t('contractsTotals') || 'إجمالي العقود والقيمة'}</h4>
        <div>{t('totalContracts') || 'إجمالي العقود'}: <b>{report.total}</b></div>
        <div>{t('totalValue') || 'إجمالي القيمة'}: <b>{report.totalValue}</b></div>
        <div>{t('avgValue') || 'متوسط القيمة'}: <b>{report.avgValue}</b></div>
        <div>{t('soonToExpire') || 'ستنتهي خلال 30 يوم'}: <b>{report.soonToExpire}</b></div>
      </div>
    </div>
  </div>;
}

export default function ContractDashboardCharts() {
  return (
    <I18nProvider>
      <ContractDashboardChartsInner />
    </I18nProvider>
  );
}

export default ContractDashboardCharts;
