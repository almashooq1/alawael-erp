import React, { useState } from 'react';

export default function DropboxPanel() {
  const [file, setFile] = useState<any>(null);
  const [accessToken, setAccessToken] = useState('');
  const [dropboxPath, setDropboxPath] = useState('');
  const [result, setResult] = useState('');
  function handleUpload(e:any) {
    e.preventDefault();
    const form = new FormData();
    form.append('file', file);
    form.append('accessToken', accessToken);
    form.append('dropboxPath', dropboxPath);
    fetch('/dashboard/dropbox/upload', { method: 'POST', body: form })
      .then(r=>r.json()).then(r=>setResult(r.id ? 'تم الرفع بنجاح: ' + r.id : r.error));
  }
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <h2>رفع ملف إلى Dropbox</h2>
    <form onSubmit={handleUpload} style={{marginBottom:24}}>
      <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} required />
      <input placeholder="Access Token" value={accessToken} onChange={e=>setAccessToken(e.target.value)} required />
      <input placeholder="Dropbox Path (مثال: /folder/file.pdf)" value={dropboxPath} onChange={e=>setDropboxPath(e.target.value)} required />
      <button type="submit">رفع</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
