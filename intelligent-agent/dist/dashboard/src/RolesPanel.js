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
exports.default = RolesPanel;
// Remove JSX pragma for compatibility with tsconfig.json
const React = __importStar(require("react"));
function RolesPanel() {
    const [roles, setRoles] = React.useState([]);
    const [form, setForm] = React.useState({ name: '', permissions: '' });
    React.useEffect(() => {
        fetch('/dashboard/permissions/list').then(r => r.json()).then(setRoles);
    }, []);
    function handleAdd(e) {
        e.preventDefault();
        fetch('/dashboard/permissions/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name, permissions: form.permissions.split(',').map((p) => p.trim()) })
        }).then(r => r.json()).then(role => setRoles(r => [...r, role]));
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 600, margin: 'auto' }}>
    <h2>إدارة الأدوار والصلاحيات</h2>
    <form onSubmit={handleAdd} style={{ marginBottom: 24 }}>
      <input placeholder="اسم الدور" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required/>
      <input placeholder="الصلاحيات (مفصولة بفاصلة)" value={form.permissions} onChange={e => setForm(f => ({ ...f, permissions: e.target.value }))} required/>
      <button type="submit">إضافة دور</button>
    </form>
    <table style={{ width: '100%' }}><thead><tr><th>الدور</th><th>الصلاحيات</th></tr></thead>
      <tbody>
        {roles.map(r => <tr key={r.id}><td>{r.name}</td><td>{r.permissions.join(', ')}</td></tr>)}
      </tbody>
    </table>
  </div>;
}
