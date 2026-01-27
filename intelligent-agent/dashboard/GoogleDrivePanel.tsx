import React, { useState } from 'react';

export default function GoogleDrivePanel() {
  const [file, setFile] = useState<any>(null);
  const [credentials, setCredentials] = useState('');
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [mimeType, setMimeType] = useState('application/pdf');
  const [result, setResult] = useState('');
  function handleUpload(e:any) {
    e.preventDefault();
    const form = new FormData();
    form.append('file', file);
    form.append('credentials', credentials);
    form.append('token', token);
    form.append('name', name);
    form.append('mimeType', mimeType);
    fetch('/dashboard/gdrive/upload', { method: 'POST', body: form })
      .then(r=>r.json()).then(r=>setResult(r.id ? 'تم الرفع بنجاح: ' + r.id : r.error));
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <h2>رفع ملف إلى Google Drive</h2>
    <form onSubmit={handleUpload} style={{marginBottom:24}}>
      <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} required />
      <input placeholder="credentials (JSON)" value={credentials} onChange={e=>setCredentials(e.target.value)} required />
      <input placeholder="token (JSON)" value={token} onChange={e=>setToken(e.target.value)} required />
      <input placeholder="اسم الملف" value={name} onChange={e=>setName(e.target.value)} required />
      <input placeholder="MIME type" value={mimeType} onChange={e=>setMimeType(e.target.value)} required />
      <button type="submit">رفع</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
