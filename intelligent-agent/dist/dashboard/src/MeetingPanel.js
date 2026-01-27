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
exports.default = MeetingPanel;
// Remove JSX pragma for compatibility with tsconfig.json
const React = __importStar(require("react"));
function MeetingPanel() {
    const [meetings, setMeetings] = React.useState([]);
    const [form, setForm] = React.useState({
        title: '', date: '', time: '', location: '', participants: '', agenda: '', notes: '', createdBy: ''
    });
    const [editing, setEditing] = React.useState(null);
    function fetchMeetings() {
        fetch('/v1/meetings').then(r => r.json()).then(setMeetings);
    }
    React.useEffect(fetchMeetings, []); // ...existing code...
    function handleAdd(e) {
        e.preventDefault();
        fetch('/v1/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, participants: form.participants.split(',').map((p) => p.trim()) })
        }).then(() => { fetchMeetings(); setForm({ title: '', date: '', time: '', location: '', participants: '', agenda: '', notes: '', createdBy: '' }); });
    }
    function handleUpdate(id) {
        fetch('/v1/meetings/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, participants: form.participants.split(',').map((p) => p.trim()) })
        }).then(() => { fetchMeetings(); setEditing(null); });
    }
    function handleDelete(id) {
        if (!window.confirm('تأكيد حذف الاجتماع؟'))
            return;
        fetch('/v1/meetings/' + id, { method: 'DELETE' }).then(fetchMeetings);
    }
    return <div style={{ fontFamily: 'Tahoma,Arial', maxWidth: 900, margin: 'auto' }}>
    <h2>إدارة الاجتماعات</h2>
    <form onSubmit={editing ? e => { e.preventDefault(); handleUpdate(editing); } : handleAdd} style={{ marginBottom: 24 }}>
      <input placeholder="عنوان الاجتماع" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required/>
      <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required/>
      <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} required/>
      <input placeholder="المكان" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}/>
      <input placeholder="المشاركون (مفصولة بفاصلة)" value={form.participants} onChange={e => setForm(f => ({ ...f, participants: e.target.value }))} required/>
      <input placeholder="جدول الأعمال" value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} required/>
      <input placeholder="ملاحظات" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/>
      <input placeholder="أنشئ بواسطة" value={form.createdBy} onChange={e => setForm(f => ({ ...f, createdBy: e.target.value }))} required/>
      <button type="submit">{editing ? 'تحديث' : 'إضافة اجتماع'}</button>
      {editing && <button type="button" onClick={() => { setEditing(null); setForm({ title: '', date: '', time: '', location: '', participants: '', agenda: '', notes: '', createdBy: '' }); }}>إلغاء</button>}
    </form>
    <table style={{ width: '100%' }}><thead><tr><th>العنوان</th><th>التاريخ</th><th>الوقت</th><th>المكان</th><th>المشاركون</th><th>جدول الأعمال</th><th>ملاحظات</th><th>الحالة</th><th>أنشئ بواسطة</th><th>إجراءات</th></tr></thead>
      <tbody>
        {meetings.map(m => <tr key={m.id}>
          <td>{m.title}</td>
          <td>{m.date}</td>
          <td>{m.time}</td>
          <td>{m.location}</td>
          <td>{(m.participants || []).join(', ')}</td>
          <td>{m.agenda}</td>
          <td>{m.notes}</td>
          <td>{m.status}</td>
          <td>{m.createdBy}</td>
          <td>
            <button onClick={() => { setEditing(m.id); setForm({ ...m, participants: (m.participants || []).join(', ') }); }}>تعديل</button>
            <button onClick={() => handleDelete(m.id)}>حذف</button>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
// ...existing code...
