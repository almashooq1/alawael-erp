import { touchTableStyle } from './touchStyles';
import React, { useEffect, useState } from 'react';

export default function ContractSmartPanel() {
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    fetch('/dashboard/contract-smart/smart').then(r=>r.json()).then(setData);
  }, []);
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:700,margin:'auto'}}>
    <h2>تحليل وتوصيات العقود الذكية</h2>
    <table style={{width:'100%', ...touchTableStyle}}><thead><tr><th>العقد</th><th>المخاطر</th><th>التوصية</th><th>أيام للانتهاء</th></tr></thead>
      <tbody>
        {data.map(d=><tr key={d.contractId}>
          <td>{d.contractId}</td>
          <td>{d.riskLevel}</td>
          <td>{d.recommendation}</td>
          <td>{d.daysToExpire}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
