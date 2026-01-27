import React, { useEffect, useState } from 'react';
import ComplianceRiskEventDetails from './ComplianceRiskEventDetails';
import { useI18n } from './i18n';

export default function ComplianceRiskPanel() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { t } = useI18n();

  useEffect(() => {
    setLoading(true);
    fetch('/v1/ai/compliance-risk-scores')
      .then(r => r.json())
      .then(setScores)
      .catch(e => setError(e.message || t('errorFetching')))
      .finally(() => setLoading(false));
  }, [t]);

  return (
    <div className="compliance-risk-panel">
      <h2>{t('aiComplianceAnalysis') || 'تحليل المخاطر الذكي للامتثال'}</h2>
      {loading && <div>{t('loading') || 'جاري التحميل...'}</div>}
      {error && <div style={{color:'red'}}>{error}</div>}
      {!loading && !error && (
        <table className="risk-table">
          <thead>
            <tr>
              <th>{t('compliancePolicies') || 'السياسة'}</th>
              <th>{t('riskScore') || 'درجة المخاطرة'}</th>
              <th>{t('violations') || 'عدد الانتهاكات'}</th>
              <th>{t('lastViolation') || 'آخر انتهاك'}</th>
              <th>{t('unresolved') || 'غير محلولة'}</th>
              <th>{t('details') || 'تفاصيل'}</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={i} style={{background:s.riskScore>=70?'#ffcccc':s.riskScore>=40?'#fff3cd':'#d4edda'}}>
                <td>{s.policy}</td>
                <td><b>{s.riskScore}</b></td>
                <td>{s.violations}</td>
                <td>{s.lastViolation ? new Date(s.lastViolation).toLocaleString() : '-'}</td>
                <td>{s.unresolved}</td>
                <td>
                  <button style={{padding:'2px 10px',fontSize:13}} onClick={()=>setSelectedEvent(s)}>{t('details') || 'عرض'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ComplianceRiskEventDetails event={selectedEvent} onClose={()=>setSelectedEvent(null)} />
    </div>
  );
}
