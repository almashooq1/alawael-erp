"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GoogleDrivePanel;
const react_1 = __importStar(require("react"));
function GoogleDrivePanel() {
    const [file, setFile] = (0, react_1.useState)(null);
    const [credentials, setCredentials] = (0, react_1.useState)('');
    const [token, setToken] = (0, react_1.useState)('');
    const [name, setName] = (0, react_1.useState)('');
    const [mimeType, setMimeType] = (0, react_1.useState)('application/pdf');
    const [result, setResult] = (0, react_1.useState)('');
    function handleUpload(e) {
        e.preventDefault();
        const form = new FormData();
        form.append('file', file);
        form.append('credentials', credentials);
        form.append('token', token);
        form.append('name', name);
        form.append('mimeType', mimeType);
        fetch('/dashboard/gdrive/upload', { method: 'POST', body: form })
            .then(r => r.json()).then(r => setResult(r.id ? 'تم الرفع بنجاح: ' + r.id : r.error));
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>رفع ملف إلى Google Drive</h2>
    <form onSubmit={handleUpload} style={{ marginBottom: 24 }}>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required/>
      <input placeholder="credentials (JSON)" value={credentials} onChange={e => setCredentials(e.target.value)} required/>
      <input placeholder="token (JSON)" value={token} onChange={e => setToken(e.target.value)} required/>
      <input placeholder="اسم الملف" value={name} onChange={e => setName(e.target.value)} required/>
      <input placeholder="MIME type" value={mimeType} onChange={e => setMimeType(e.target.value)} required/>
      <button type="submit">رفع</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
