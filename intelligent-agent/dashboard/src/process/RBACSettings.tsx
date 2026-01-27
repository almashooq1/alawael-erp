import React, { useState } from 'react';

const roles = [
  { key: 'admin', label: 'مدير النظام', permissions: ['إدارة المستخدمين', 'تعديل العمليات', 'عرض التقارير', 'إدارة الصلاحيات'] },
  { key: 'manager', label: 'مدير عمليات', permissions: ['تعديل العمليات', 'عرض التقارير'] },
  { key: 'auditor', label: 'مدقق', permissions: ['عرض التقارير'] },
  { key: 'user', label: 'مستخدم عادي', permissions: ['عرض العمليات'] },
];

const users = [
  { id: 1, name: 'أحمد', role: 'admin' },
  { id: 2, name: 'فاطمة', role: 'manager' },
  { id: 3, name: 'سارة', role: 'auditor' },
  { id: 4, name: 'محمد', role: 'user' },
];

export default function RBACSettings() {
  const [userRoles, setUserRoles] = useState(users);
  return (
    <div style={{margin:'32px 0',background:'#f9f9f9',padding:24,borderRadius:8}}>
      <h3>إدارة الصلاحيات والأدوار (RBAC)</h3>
      <table style={{width:'100%',background:'#fff',borderRadius:6,boxShadow:'0 1px 4px #eee',fontSize:15}}>
        <thead>
          <tr>
            <th>المستخدم</th>
            <th>الدور الحالي</th>
            <th>تغيير الدور</th>
            <th>الصلاحيات</th>
          </tr>
        </thead>
        <tbody>
          {userRoles.map(u => (
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{roles.find(r=>r.key===u.role)?.label}</td>
              <td>
                <select value={u.role} onChange={e=>setUserRoles(userRoles.map(usr=>usr.id===u.id?{...usr,role:e.target.value}:usr))}>
                  {roles.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                </select>
              </td>
              <td>{roles.find(r=>r.key===u.role)?.permissions.join('، ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
