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
exports.default = WebhookPanel;
const react_1 = __importStar(require("react"));
function WebhookPanel() {
    const [url, setUrl] = (0, react_1.useState)('');
    const [event, setEvent] = (0, react_1.useState)('');
    const [data, setData] = (0, react_1.useState)('');
    const [result, setResult] = (0, react_1.useState)('');
    function handleSend(e) {
        e.preventDefault();
        fetch('/dashboard/webhook/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, event, data: data ? JSON.parse(data) : undefined })
        }).then(r => r.json()).then(r => setResult(r.ok ? 'تم الإرسال بنجاح' : r.error));
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>إرسال Webhook يدوي</h2>
    <form onSubmit={handleSend} style={{ marginBottom: 24 }}>
      <input placeholder="Webhook URL" value={url} onChange={e => setUrl(e.target.value)} required/>
      <input placeholder="اسم الحدث" value={event} onChange={e => setEvent(e.target.value)} required/>
      <input placeholder="بيانات (JSON)" value={data} onChange={e => setData(e.target.value)}/>
      <button type="submit">إرسال</button>
    </form>
    {result && <div>{result}</div>}
  </div>;
}
