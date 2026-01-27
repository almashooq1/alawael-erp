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
exports.default = CompliancePolicyPanel;
const react_1 = __importStar(require("react"));
function CompliancePolicyPanel() {
    const [policies, setPolicies] = (0, react_1.useState)([]);
    const [form, setForm] = (0, react_1.useState)({ name: '', description: '', enabled: true });
    const [editId, setEditId] = (0, react_1.useState)(null);
    const [recommend, setRecommend] = (0, react_1.useState)(null);
    const [aiDraft, setAiDraft] = (0, react_1.useState)('');
    const [successMsg, setSuccessMsg] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (recommend && recommend.aiRecommendation)
            setAiDraft(recommend.aiRecommendation);
    }, [recommend]);
    const load = () => fetch('/v1/compliance/policy')
        .then(r => r.json())
        .then((data) => setPolicies(data));
    (0, react_1.useEffect)(() => {
        load();
        fetch('/v1/compliance/policy/recommend').then(r => r.json()).then(setRecommend);
    }, []);
    const save = async (e) => {
        e.preventDefault();
        if (editId) {
            await fetch('/v1/compliance/policy/' + editId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
        }
        else {
            await fetch('/v1/compliance/policy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
        }
        setForm({ name: '', description: '', enabled: true });
        setEditId(null);
        load();
    };
    const del = async (id) => {
        if (window.confirm('حذف السياسة؟')) {
            await fetch('/v1/compliance/policy/' + id, { method: 'DELETE' });
            load();
        }
    };
    const edit = (p) => {
        setForm({ name: p.name, description: p.description, enabled: p.enabled });
        setEditId(p._id || null);
    };
    return (<div style={{ maxWidth: 700, margin: 'auto', fontFamily: 'Tahoma' }}>
      <h2>إدارة سياسات الامتثال</h2>
      {recommend && (<div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <b>السياسات الأكثر تعرضًا للخرق:</b>
          <ul style={{ margin: '8px 0 0 0' }}>
            {recommend.mostViolated.map((v) => (<li key={v.policy}>
                <span style={{ color: '#d4380d', fontWeight: 'bold' }}>{v.policy}</span>
                <span style={{ color: '#888' }}>({v.count} خرق)</span>
              </li>))}
            {recommend.mostViolated.length === 0 && <li style={{ color: '#888' }}>لا توجد خروقات مسجلة.</li>}
          </ul>
          {recommend.aiRecommendation && (<div style={{ marginTop: 12, background: '#fffbe6', padding: 12, borderRadius: 6 }}>
              <b>توصية ذكية:</b><br />
              <textarea value={aiDraft} onChange={e => setAiDraft(e.target.value)} style={{ width: '100%', minHeight: 48, margin: '8px 0', fontFamily: 'inherit', fontSize: 15 }}/>
              <button onClick={async () => {
                    await fetch('/v1/compliance/policy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: 'توصية ذكية', description: aiDraft, enabled: true })
                    });
                    setForm({ name: '', description: '', enabled: true });
                    setEditId(null);
                    load();
                    setSuccessMsg('تم اعتماد التوصية كسياسة بنجاح');
                    setTimeout(() => setSuccessMsg(''), 3000);
                }} style={{ marginTop: 8, background: '#1890ff', color: '#fff', border: 'none', padding: '6px 18px', borderRadius: 4, cursor: 'pointer' }}>اعتماد التوصية كسياسة</button>
            </div>)}
        </div>)}
      {successMsg && <div style={{ background: '#f6ffed', color: '#389e0d', padding: 10, borderRadius: 6, marginBottom: 12, border: '1px solid #b7eb8f', textAlign: 'center' }}>{successMsg}</div>}
      <form onSubmit={save} style={{ marginBottom: 24, background: '#fafafa', padding: 16, borderRadius: 8 }}>
        <input required placeholder="اسم السياسة" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={{ width: '60%', margin: 4 }}/>
        <input placeholder="وصف" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ width: '35%', margin: 4 }}/>
        <label style={{ margin: 8 }}><input type="checkbox" checked={form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}/> مفعلة</label>
        <button type="submit" style={{ margin: 8 }}>{editId ? 'تعديل' : 'إضافة'}</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', description: '', enabled: true }); }}>إلغاء</button>}
      </form>
      <table style={{ width: '100%', background: '#fff', boxShadow: '0 2px 8px #eee', fontSize: 15 }}>
        <thead><tr><th>الاسم</th><th>الوصف</th><th>الحالة</th><th>إجراءات</th></tr></thead>
        <tbody>
          {policies.map((p) => (<tr key={p._id} style={{ background: !p.enabled ? '#f5f5f5' : '#fff' }}>
              <td>{p.name}</td>
              <td>{p.description}</td>
              <td style={{ color: p.enabled ? 'green' : '#888' }}>{p.enabled ? 'مفعلة' : 'معطلة'}</td>
              <td>
                <button onClick={() => edit(p)}>تعديل</button>
                <button onClick={() => p._id && del(p._id)} style={{ color: 'red' }}>حذف</button>
              </td>
            </tr>))}
          {policies.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: '#888' }}>لا توجد سياسات</td></tr>}
        </tbody>
      </table>
    </div>);
}
