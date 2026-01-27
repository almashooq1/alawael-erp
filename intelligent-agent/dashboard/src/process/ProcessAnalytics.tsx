import React from 'react';
// لوحة تحكم تحليلات العمليات (رسوم بيانية)

export default function ProcessAnalytics({ stats, delays, recommendations }: { stats: any, delays: any, recommendations: string[] }) {
  return (
    <div style={{maxWidth:900,margin:'auto',padding:24}}>
      <h2>تحليلات العمليات</h2>
      <div style={{display:'flex',gap:32}}>
        <div>
          <h4>إحصائيات عامة</h4>
          <div>إجمالي العمليات: {stats.total}</div>
          <div>المكتملة: {stats.completed}</div>
          <div>متوسط الخطوات: {stats.avgSteps.toFixed(1)}</div>
        </div>
        <div>
          <h4>الخطوات المتأخرة المتكررة</h4>
          <ul>
            {Object.entries(delays).map(([name, c]) => <li key={name}>{name}: {c}</li>)}
          </ul>
        </div>
      </div>
      <div style={{marginTop:32}}>
        <h4>توصيات ذكية</h4>
        <ul>
          {recommendations.map((r,i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </div>
  );
}
