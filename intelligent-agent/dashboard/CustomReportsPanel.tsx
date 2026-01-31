import { touchButtonStyle, touchTableStyle } from './touchStyles';
import React, { useState } from 'react';

export default function CustomReportsPanel() {
  const [fields, setFields] = useState('input,output,feedback');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filter, setFilter] = useState('');
  const [data, setData] = useState<any[]>([]);
  function handleGenerate(e:any) {
    e.preventDefault();
    fetch('/dashboard/reports/custom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: fields.split(',').map(f=>f.trim()),
        from: from || undefined,
        to: to || undefined,
        filter: filter ? JSON.parse(filter) : undefined
      })
    }).then(r=>r.json()).then(setData);
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:700,margin:'auto'}}>
    <h2>منشئ التقارير المخصصة</h2>
    <form onSubmit={handleGenerate} style={{marginBottom:24}}>
      <input placeholder="الحقول (input,output,feedback...)" value={fields} onChange={e=>setFields(e.target.value)} />
      <input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
      <input type="date" value={to} onChange={e=>setTo(e.target.value)} />
      <input placeholder="فلتر (JSON)" value={filter} onChange={e=>setFilter(e.target.value)} />
      <button type="submit" style={touchButtonStyle}>توليد التقرير</button>
    </form>
    <table style={{width:'100%',fontSize:13, ...touchTableStyle}}><thead><tr>{fields.split(',').map(f=><th key={f}>{f}</th>)}</tr></thead>
      <tbody>
        {data.map((row,i)=><tr key={i}>{fields.split(',').map(f=><td key={f}>{row[f]}</td>)}</tr>)}
      </tbody>
    </table>
  </div>;
}
