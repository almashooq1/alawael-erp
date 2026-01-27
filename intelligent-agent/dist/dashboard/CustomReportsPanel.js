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
exports.default = CustomReportsPanel;
const react_1 = __importStar(require("react"));
function CustomReportsPanel() {
    const [fields, setFields] = (0, react_1.useState)('input,output,feedback');
    const [from, setFrom] = (0, react_1.useState)('');
    const [to, setTo] = (0, react_1.useState)('');
    const [filter, setFilter] = (0, react_1.useState)('');
    const [data, setData] = (0, react_1.useState)([]);
    function handleGenerate(e) {
        e.preventDefault();
        fetch('/dashboard/reports/custom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fields: fields.split(',').map(f => f.trim()),
                from: from || undefined,
                to: to || undefined,
                filter: filter ? JSON.parse(filter) : undefined
            })
        }).then(r => r.json()).then(setData);
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 700, margin: 'auto' }}>
    <h2>منشئ التقارير المخصصة</h2>
    <form onSubmit={handleGenerate} style={{ marginBottom: 24 }}>
      <input placeholder="الحقول (input,output,feedback...)" value={fields} onChange={e => setFields(e.target.value)}/>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)}/>
      <input type="date" value={to} onChange={e => setTo(e.target.value)}/>
      <input placeholder="فلتر (JSON)" value={filter} onChange={e => setFilter(e.target.value)}/>
      <button type="submit">توليد التقرير</button>
    </form>
    <table style={{ width: '100%', fontSize: 13 }}><thead><tr>{fields.split(',').map(f => <th key={f}>{f}</th>)}</tr></thead>
      <tbody>
        {data.map((row, i) => <tr key={i}>{fields.split(',').map(f => <td key={f}>{row[f]}</td>)}</tr>)}
      </tbody>
    </table>
  </div>;
}
