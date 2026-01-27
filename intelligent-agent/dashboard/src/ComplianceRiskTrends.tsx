import React, { useEffect, useState } from 'react';
import { useI18n, formatDate, formatNumber } from './i18n';

function getColor(score: number) {
  if (score >= 70) return '#ff4d4f';
  if (score >= 40) return '#faad14';
  return '#52c41a';
}

function ComplianceRiskTrends() {
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    setLoading(true);
    fetch('/v1/ai/compliance-risk-scores?days=180')
      .then(r => r.json())
      .then(scores => {
        // Group by month, average risk per month
        const byMonth: Record<string, number[]> = {};
        scores.forEach((s: any) => {
          if (s.lastViolation) {
            const d = new Date(s.lastViolation);
            const key = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
            if (!byMonth[key]) byMonth[key] = [];
            byMonth[key].push(s.riskScore);
          }
        });
        const trendArr = Object.entries(byMonth).map(([month, arr]) => ({
          month,
          avg: arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0
        })).sort((a,b)=>a.month.localeCompare(b.month));
        setTrend(trendArr);
      })
      .catch(e => setError(e.message || t('errorFetching')))
      .finally(() => setLoading(false));
  }, [lang, t]);

  return (
    <div className="compliance-risk-trends">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <h3>{t('riskTrends') + ' (6 ' + t('months') + ')'}</h3>
        <label htmlFor="lang-switcher" style={{marginLeft:8,fontWeight:500}}>
          🌐
        </label>
        <select
          id="lang-switcher"
          aria-label={t('languageSelector') || 'Language selector'}
          value={lang}
          onChange={e => setLang(e.target.value as 'ar' | 'en' | 'fr')}
          style={{padding:'2px 8px',fontSize:14,borderRadius:4,border:'1px solid #ccc',marginLeft:4}}
        >
          <option value="ar">🇸🇦 {t('arabic') || 'العربية'}</option>
          <option value="en">🇬🇧 {t('english') || 'English'}</option>
          <option value="fr">🇫🇷 {t('french') || 'Français'}</option>
        </select>
      </div>
      {loading && <div>{t('loading')}</div>}
      {error && <div style={{color:'red'}}>{error}</div>}
      {!loading && !error && trend.length > 0 && (
        <div style={{display:'flex',alignItems:'flex-end',height:180,gap:8,padding:'16px 0'}}>
          {trend.map((t,i) => {
            // t.month is in format YYYY-MM, e.g. 2025-12
            const [year, month] = t.month.split('-');
            const dateLabel = formatDate(new Date(Number(year), Number(month)-1, 1), lang, { month: 'short', year: '2-digit' });
            return (
              <div key={i} style={{flex:1,textAlign:'center'}}>
                <div style={{height:t.avg*1.5+'px',background:getColor(t.avg),transition:'height 0.5s',borderRadius:4}} title={formatNumber(t.avg, lang, { maximumFractionDigits: 1 })}></div>
                <div style={{fontSize:12,marginTop:4}}>{dateLabel}</div>
              </div>
            );
          })}
        </div>
      )}
      {!loading && !error && trend.length === 0 && <div>{t('notEnoughData')}</div>}
    </div>
  );
}


export default ComplianceRiskTrends;
