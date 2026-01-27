import React, { useEffect, useState } from 'react';

export default function ContractActivityPanel({ contractId }: { contractId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    fetch(`/dashboard/contract-activity/${contractId}`).then(r=>r.json()).then(setLogs);
  }, [contractId]);
  return <div style={{marginTop:16}}>
    <h3>سجل النشاطات</h3>
    <table style={{width:'100%'}}><thead><tr><th>العملية</th><th>المستخدم</th><th>التاريخ</th><th>تفاصيل</th></tr></thead>
      <tbody>
        {logs.map((l,i)=><tr key={i}>
          <td>{l.action}</td>
          <td>{l.userId||'-'}</td>
          <td>{l.timestamp?.slice(0,19).replace('T',' ')}</td>
          <td><pre style={{fontSize:12,whiteSpace:'pre-wrap'}}>{JSON.stringify(l.details||{},null,1)}</pre></td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
