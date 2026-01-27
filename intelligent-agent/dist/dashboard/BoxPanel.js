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
exports.default = BoxPanel;
const react_1 = __importStar(require("react"));
function BoxPanel() {
    const [file, setFile] = (0, react_1.useState)(null);
    const [clientId, setClientId] = (0, react_1.useState)('');
    const [clientSecret, setClientSecret] = (0, react_1.useState)('');
    const [accessToken, setAccessToken] = (0, react_1.useState)('');
    const [boxFolderId, setBoxFolderId] = (0, react_1.useState)('');
    const [name, setName] = (0, react_1.useState)('');
    const [result, setResult] = (0, react_1.useState)('');
    function handleUpload(e) {
        e.preventDefault();
        const form = new FormData();
        form.append('file', file);
        form.append('clientId', clientId);
        form.append('clientSecret', clientSecret);
        form.append('accessToken', accessToken);
        form.append('boxFolderId', boxFolderId);
        form.append('name', name);
        fetch('/dashboard/box/upload', { method: 'POST', body: form })
            .then(r => r.json()).then(r => setResult(r.id ? 'تم الرفع بنجاح: ' + r.id : r.error));
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>رفع ملف إلى Box</h2>
    <form onSubmit={handleUpload} style={{ marginBottom: 24 }}>
      <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required/>
      <input placeholder="Client ID" value={clientId} onChange={e => setClientId(e.target.value)} required/>
      <input placeholder="Client Secret" value={clientSecret} onChange={e => setClientSecret(e.target.value)} required/>
      <input placeholder="Access Token" value={accessToken} onChange={e => setAccessToken(e.target.value)} required/>
      <input placeholder="Box Folder ID" value={boxFolderId} onChange={e => setBoxFolderId(e.target.value)} required/>
      <input placeholder="اسم الملف" value={name} onChange={e => setName(e.target.value)} required/>
      <button type="submit">رفع</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
