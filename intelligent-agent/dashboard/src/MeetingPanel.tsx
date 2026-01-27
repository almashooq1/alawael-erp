// Remove JSX pragma for compatibility with tsconfig.json
import * as React from 'react';
import { useI18n, I18nProvider } from './i18n';

function MeetingPanelInner() {
  const [meetings, setMeetings] = React.useState<any[]>([]);
  const [form, setForm] = React.useState({
    title: '', date: '', time: '', location: '', participants: '', agenda: '', notes: '', createdBy: ''
  });
  const [editing, setEditing] = React.useState<string|null>(null);
  const { t, lang, setLang } = useI18n();

  function fetchMeetings() {
    fetch('/v1/meetings').then(r=>r.json()).then(setMeetings);
  }
  React.useEffect(fetchMeetings, []); // ...existing code...

  function handleAdd(e:any) {
    e.preventDefault();
    fetch('/v1/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, participants: form.participants.split(',').map((p:string)=>p.trim()) })
    }).then(()=>{ fetchMeetings(); setForm({ title: '', date: '', time: '', location: '', participants: '', agenda: '', notes: '', createdBy: '' }); });
  }

  function handleUpdate(id:string) {
    fetch('/v1/meetings/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, participants: form.participants.split(',').map((p:string)=>p.trim()) })
    }).then(()=>{ fetchMeetings(); setEditing(null); });
  }

  function handleDelete(id:string) {
    if (!window.confirm(t('confirmDeleteMeeting') || 'تأكيد حذف الاجتماع؟')) return;
    fetch('/v1/meetings/' + id, { method: 'DELETE' }).then(fetchMeetings);
  }

  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:900,margin:'auto'}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h2>{t('meetingsManagement') || 'إدارة الاجتماعات'}</h2>
      <label htmlFor="lang-switcher" style={{marginLeft:8,fontWeight:500}}>
        🌐
      </label>
      <select
        id="lang-switcher"
        aria-label="Language selector"
        value={lang}
        onChange={e=>setLang(e.target.value as 'ar'|'en'|'fr')}
        style={{padding:'2px 8px',fontSize:14,borderRadius:4,border:'1px solid #ccc',marginLeft:4}}
      >
        <option value="ar">🇸🇦 العربية</option>
        <option value="en">🇬🇧 English</option>
        <option value="fr">🇫🇷 Français</option>
      </select>
    </div>
    <form onSubmit={editing ? e=>{e.preventDefault();handleUpdate(editing);} : handleAdd} style={{marginBottom:24}}>
      <input placeholder={t('meetingTitle')||'عنوان الاجتماع'} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
      <input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required />
      <input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} required />
      <input placeholder={t('location')||'المكان'} value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} />
      <input placeholder={t('participantsComma')||'المشاركون (مفصولة بفاصلة)'} value={form.participants} onChange={e=>setForm(f=>({...f,participants:e.target.value}))} required />
      <input placeholder={t('agenda')||'جدول الأعمال'} value={form.agenda} onChange={e=>setForm(f=>({...f,agenda:e.target.value}))} required />
      <input placeholder={t('notes')||'ملاحظات'} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
      <input placeholder={t('createdBy')||'أنشئ بواسطة'} value={form.createdBy} onChange={e=>setForm(f=>({...f,createdBy:e.target.value}))} required />
      <button type="submit">{editing ? t('update')||'تحديث' : t('addMeeting')||'إضافة اجتماع'}</button>
      {editing && <button type="button" onClick={()=>{setEditing(null);setForm({ title: '', date: '', time: '', location: '', participants: '', agenda: '', notes: '', createdBy: '' });}}>{t('cancel')||'إلغاء'}</button>}
    </form>
    <table style={{width:'100%'}}><thead><tr>
      <th>{t('title')||'العنوان'}</th>
      <th>{t('date')||'التاريخ'}</th>
      <th>{t('time')||'الوقت'}</th>
      <th>{t('location')||'المكان'}</th>
      <th>{t('participants')||'المشاركون'}</th>
      <th>{t('agenda')||'جدول الأعمال'}</th>
      <th>{t('notes')||'ملاحظات'}</th>
      <th>{t('status')||'الحالة'}</th>
      <th>{t('createdBy')||'أنشئ بواسطة'}</th>
      <th>{t('actions')||'إجراءات'}</th>
    </tr></thead>
      <tbody>
        {meetings.map(m=><tr key={m.id}>
          <td>{m.title}</td>
          <td>{m.date}</td>
          <td>{m.time}</td>
          <td>{m.location}</td>
          <td>{(m.participants||[]).join(', ')}</td>
          <td>{m.agenda}</td>
          <td>{m.notes}</td>
          <td>{m.status}</td>
          <td>{m.createdBy}</td>
          <td>
            <button onClick={()=>{setEditing(m.id);setForm({...m,participants:(m.participants||[]).join(', ')});}}>{t('edit')||'تعديل'}</button>
            <button onClick={()=>handleDelete(m.id)}>{t('delete')||'حذف'}</button>
          </td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}

export default function MeetingPanel() {
  return (
    <I18nProvider>
      <MeetingPanelInner />
    </I18nProvider>
  );
}
// ...existing code...
