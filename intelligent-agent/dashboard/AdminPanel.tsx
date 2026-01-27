import React, { useState, useEffect } from 'react';

function Section({ title, children }: { title: string, children: React.ReactNode }) {
  return <div style={{margin:'24px 0',padding:'16px',border:'1px solid #ccc',borderRadius:8}}>
    <h3>{title}</h3>
    {children}
  </div>;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
    const [stats, setStats] = useState<any>(null); // Initialize stats
  useEffect(() => {
    fetch('/dashboard/auth/users').then(r=>r.json()).then(setUsers);
    fetch('/dashboard/audit/audit').then(r=>r.json()).then(setAudit);
    fetch('/dashboard/api/stats').then(r=>r.json()).then(setStats);
  }, []);
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:900,margin:'auto'}}>
    <h2>لوحة إدارة النظام الذكي</h2>
    <Section title="إحصائيات عامة">
      {stats ? <>
        <div>إجمالي التفاعلات: <b>{stats.total}</b></div>
        <div>تفاعلات الأسبوع: <b>{stats.weekCount}</b></div>
        <div>عدد الأخطاء: <b>{stats.errorCount}</b></div>
      </> : 'تحميل...'}
    </Section>
    <Section title="المستخدمون">
      <table style={{width:'100%'}}><thead><tr><th>اسم المستخدم</th><th>الدور</th><th>تاريخ الإنشاء</th></tr></thead>
        <tbody>
          {users.map(u=><tr key={u.id}><td>{u.username}</td><td>{u.role}</td><td>{u.createdAt}</td></tr>)}
        </tbody>
      </table>
    </Section>
    <Section title="سجل التدقيق (Audit Trail)">
      <table style={{width:'100%',fontSize:13}}><thead><tr><th>المستخدم</th><th>العملية</th><th>المورد</th><th>التاريخ</th></tr></thead>
        <tbody>
          {audit.map(a=><tr key={a.timestamp+a.userId}><td>{a.userId}</td><td>{a.action}</td><td>{a.resource||'-'}</td><td>{a.timestamp}</td></tr>)}
        </tbody>
      </table>
    </Section>
  </div>;
}
