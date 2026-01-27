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
exports.default = CompliancePanel;
const react_1 = __importStar(require("react"));
const statusColors = { fail: '#f5222d', warning: '#faad14', success: '#52c41a' };
function CompliancePanel() {
    const [events, setEvents] = (0, react_1.useState)([]);
    const [alerts, setAlerts] = (0, react_1.useState)([]);
    const [stats, setStats] = (0, react_1.useState)({});
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('all');
    const [filterDate, setFilterDate] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        fetch('/v1/compliance/events').then(r => r.json()).then(setEvents);
        fetch('/v1/compliance/alerts').then(r => r.json()).then(setAlerts);
        fetch('/v1/compliance/stats').then(r => r.json()).then(setStats);
    }, []);
    const filteredEvents = events.filter((e) => (filterStatus === 'all' || e.status === filterStatus) &&
        (!filterDate || new Date(e.timestamp).toISOString().slice(0, 10) === filterDate));
    return (<div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 950, margin: 'auto' }}>
      <h2>مراقبة الامتثال
        <span style={{ float: 'left' }}>
          <a href="/dashboard/analytics" target="_blank" style={{ fontSize: 16, color: '#1890ff', textDecoration: 'underline', marginLeft: 16 }}>لوحة التحليل المتقدم</a>
          <a href="/dashboard/policy" target="_blank" style={{ fontSize: 16, color: '#722ed1', textDecoration: 'underline' }}>إدارة السياسات</a>
        </span>
      </h2>
      <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 24 }}>
        <span><b>إجمالي الأحداث:</b> {stats.total || 0}</span>
        <span><b>حسب الحالة:</b> {stats.byStatus && stats.byStatus.map((s) => `${s._id}: ${s.count}`).join(' | ')}</span>
        <span>
          <label>تصفية الحالة: </label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">الكل</option>
            <option value="fail">فشل</option>
            <option value="warning">تحذير</option>
            <option value="success">نجاح</option>
          </select>
        </span>
        <span>
          <label>تصفية التاريخ: </label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}/>
        </span>
      </div>
      <h3 style={{ marginTop: 24 }}>تنبيهات الامتثال (فشل/تحذير)</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {alerts.map((a) => (<li key={a._id} style={{
                background: a.status === 'fail' ? '#fff1f0' : '#fffbe6',
                color: statusColors[a.status] || '#333',
                border: `1px solid ${statusColors[a.status] || '#d9d9d9'}`,
                borderRadius: 6,
                margin: '8px 0',
                padding: '8px 12px',
                fontWeight: a.status === 'fail' ? 'bold' : 'normal',
                fontSize: 15
            }}>
            <span style={{ fontWeight: 'bold' }}>[{a.status === 'fail' ? 'فشل' : 'تحذير'}]</span> {a.action} على <b>{a.resource}</b> {a.resourceId && <span>({a.resourceId})</span>}<br />
            <span style={{ fontSize: 13 }}>{a.details} - {new Date(a.timestamp).toLocaleString()}</span>
          </li>))}
        {alerts.length === 0 && <li style={{ color: '#888' }}>لا توجد تنبيهات حرجة حالياً.</li>}
      </ul>
      <h3 style={{ marginTop: 32 }}>أحدث أحداث الامتثال</h3>
      <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 15, borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 8px #eee' }}>
        <thead style={{ background: '#fafafa' }}>
          <tr>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>الوقت</th>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>المستخدم</th>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>الإجراء</th>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>المورد</th>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>الحالة</th>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>السياسة</th>
            <th style={{ padding: '8px 4px', borderBottom: '2px solid #eee' }}>تفاصيل</th>
          </tr>
        </thead>
        <tbody>
          {filteredEvents.map((e) => (<tr key={e._id} style={{ background: e.status === 'fail' ? '#fff1f0' : e.status === 'warning' ? '#fffbe6' : '#fff' }}>
              <td style={{ padding: '6px 4px' }}>{new Date(e.timestamp).toLocaleString()}</td>
              <td style={{ padding: '6px 4px' }}>{e.userId || '-'}</td>
              <td style={{ padding: '6px 4px' }}>{e.action}</td>
              <td style={{ padding: '6px 4px' }}>{e.resource} {e.resourceId ? `(${e.resourceId})` : ''}</td>
              <td style={{ padding: '6px 4px', color: statusColors[e.status] || '#333', fontWeight: 'bold' }}>{e.status}</td>
              <td style={{ padding: '6px 4px' }}>{e.policy || '-'}</td>
              <td style={{ padding: '6px 4px' }}>{e.details || '-'}</td>
            </tr>))}
          {filteredEvents.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>لا توجد أحداث مطابقة للفلاتر.</td></tr>}
        </tbody>
      </table>
      </div>
    </div>);
}
