import React, { useState } from 'react';

export default function BoxPanel() {
  const [file, setFile] = useState<any>(null);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [boxFolderId, setBoxFolderId] = useState('');
  const [name, setName] = useState('');
  const [result, setResult] = useState('');
  function handleUpload(e:any) {
    e.preventDefault();
    const form = new FormData();
    form.append('file', file);
    form.append('clientId', clientId);
    form.append('clientSecret', clientSecret);
    form.append('accessToken', accessToken);
    form.append('boxFolderId', boxFolderId);
    form.append('name', name);
    fetch('/dashboard/box/upload', { method: 'POST', body: form })
      .then(r=>r.json()).then(r=>setResult(r.id ? 'تم الرفع بنجاح: ' + r.id : r.error));
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <h2>رفع ملف إلى Box</h2>
    <form onSubmit={handleUpload} style={{marginBottom:24}}>
      <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} required />
      <input placeholder="Client ID" value={clientId} onChange={e=>setClientId(e.target.value)} required />
      <input placeholder="Client Secret" value={clientSecret} onChange={e=>setClientSecret(e.target.value)} required />
      <input placeholder="Access Token" value={accessToken} onChange={e=>setAccessToken(e.target.value)} required />
      <input placeholder="Box Folder ID" value={boxFolderId} onChange={e=>setBoxFolderId(e.target.value)} required />
      <input placeholder="اسم الملف" value={name} onChange={e=>setName(e.target.value)} required />
      <button type="submit">رفع</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
