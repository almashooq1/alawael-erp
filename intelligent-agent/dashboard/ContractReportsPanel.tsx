import React, { useEffect, useState } from 'react';

export default function ContractReportsPanel() {
  const [report, setReport] = useState<any>(null);
  useEffect(() => {
    fetch('/dashboard/contract-reports/summary').then(r=>r.json()).then(setReport);
  }, []);
  if (!report) return <div>تحميل...</div>;
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <h2>تقرير العقود</h2>
    <div>إجمالي العقود: <b>{report.total}</b></div>
    <div>العقود النشطة: <b>{report.active}</b></div>
    <div>العقود المنتهية: <b>{report.expired}</b></div>
    <div>العقود المنتهية مبكراً: <b>{report.terminated}</b></div>
    <div>العقود المعلقة: <b>{report.pending}</b></div>
    <div>إجمالي القيمة: <b>{report.totalValue}</b></div>
    <div>متوسط القيمة: <b>{report.avgValue}</b></div>
    <div>ستنتهي خلال 30 يوم: <b>{report.soonToExpire}</b></div>
    <div style={{marginTop:16}}>
      <b>توزيع العقود حسب الطرف:</b>
      <ul>
        {Object.entries(report.byParty).map(([p, c]) => <li key={p}>{p}: {c}</li>)}
      </ul>
    </div>
  </div>;
}
