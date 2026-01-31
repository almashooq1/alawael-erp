import { touchButtonStyle } from './touchStyles';
import React, { useState } from 'react';

export default function WebhookPanel() {
  const [url, setUrl] = useState('');
  const [event, setEvent] = useState('');
  const [data, setData] = useState('');
  const [result, setResult] = useState('');
  function handleSend(e:any) {
    e.preventDefault();
    fetch('/dashboard/webhook/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, event, data: data ? JSON.parse(data) : undefined })
    }).then(r=>r.json()).then(r=>setResult(r.ok ? 'تم الإرسال بنجاح' : r.error));
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <h2>إرسال Webhook يدوي</h2>
    <form onSubmit={handleSend} style={{marginBottom:24}}>
      <input placeholder="Webhook URL" value={url} onChange={e=>setUrl(e.target.value)} required />
      <input placeholder="اسم الحدث" value={event} onChange={e=>setEvent(e.target.value)} required />
      <input placeholder="بيانات (JSON)" value={data} onChange={e=>setData(e.target.value)} />
      <button type="submit" style={touchButtonStyle}>إرسال</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
