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
exports.default = AdminPanel;
const react_1 = __importStar(require("react"));
function Section({ title, children }) {
    return <div style={{ margin: '24px 0', padding: '16px', border: '1px solid #ccc', borderRadius: 8 }}>
    <h3>{title}</h3>
    {children}
  </div>;
}
function AdminPanel() {
    const [users, setUsers] = (0, react_1.useState)([]);
    const [audit, setAudit] = (0, react_1.useState)([]);
    const [stats, setStats] = (0, react_1.useState)(null); // Initialize stats
    (0, react_1.useEffect)(() => {
        fetch('/dashboard/auth/users').then(r => r.json()).then(setUsers);
        fetch('/dashboard/audit/audit').then(r => r.json()).then(setAudit);
        fetch('/dashboard/api/stats').then(r => r.json()).then(setStats);
    }, []);
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 900, margin: 'auto' }}>
    <h2>لوحة إدارة النظام الذكي</h2>
    <Section title="إحصائيات عامة">
      {stats ? <>
        <div>إجمالي التفاعلات: <b>{stats.total}</b></div>
        <div>تفاعلات الأسبوع: <b>{stats.weekCount}</b></div>
        <div>عدد الأخطاء: <b>{stats.errorCount}</b></div>
      </> : 'تحميل...'}
    </Section>
    <Section title="المستخدمون">
      <table style={{ width: '100%' }}><thead><tr><th>اسم المستخدم</th><th>الدور</th><th>تاريخ الإنشاء</th></tr></thead>
        <tbody>
          {users.map(u => <tr key={u.id}><td>{u.username}</td><td>{u.role}</td><td>{u.createdAt}</td></tr>)}
        </tbody>
      </table>
    </Section>
    <Section title="سجل التدقيق (Audit Trail)">
      <table style={{ width: '100%', fontSize: 13 }}><thead><tr><th>المستخدم</th><th>العملية</th><th>المورد</th><th>التاريخ</th></tr></thead>
        <tbody>
          {audit.map(a => <tr key={a.timestamp + a.userId}><td>{a.userId}</td><td>{a.action}</td><td>{a.resource || '-'}</td><td>{a.timestamp}</td></tr>)}
        </tbody>
      </table>
    </Section>
  </div>;
}
