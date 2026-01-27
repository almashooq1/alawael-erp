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
exports.default = SourcesPanel;
// Remove JSX pragma for compatibility with tsconfig.json
const React = __importStar(require("react"));
function SourcesPanel() {
    const [sources, setSources] = React.useState([]);
    const [form, setForm] = React.useState({ type: '', name: '', config: '', schedule: '' });
    React.useEffect(() => {
        fetch('/dashboard/sources/list').then(r => r.json()).then(setSources);
    }, []);
    function handleAdd(e) {
        e.preventDefault();
        fetch('/dashboard/sources/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, config: form.config ? JSON.parse(form.config) : {} })
        }).then(r => r.json()).then(src => setSources(s => [...s, src]));
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 700, margin: 'auto' }}>
    <h2>إدارة مصادر البيانات الذكية</h2>
    <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
      <input placeholder="النوع" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required/>
      <input placeholder="الاسم" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required/>
      <input placeholder="جدولة كرون" value={form.schedule} onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))} required/>
      <input placeholder="إعدادات (JSON)" value={form.config} onChange={e => setForm(f => ({ ...f, config: e.target.value }))}/>
      <button type="submit">إضافة مصدر</button>
    </form>
    <table style={{ width: '100%' }}><thead><tr><th>الاسم</th><th>النوع</th><th>الحالة</th><th>الجدولة</th><th>آخر استيراد</th></tr></thead>
      <tbody>
        {sources.map(s => <tr key={s.id}><td>{s.name}</td><td>{s.type}</td><td>{s.enabled ? '✅' : '❌'}</td><td>{s.schedule}</td><td>{s.lastImport || '-'}</td></tr>)}
      </tbody>
    </table>
  </div>;
}
