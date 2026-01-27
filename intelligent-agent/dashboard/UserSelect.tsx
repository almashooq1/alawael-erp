import React, { useEffect, useState } from 'react';

export default function UserSelect({ value, onChange }: { value: string, onChange: (id: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    fetch('/dashboard/auth/users').then(r=>r.json()).then(setUsers);
  }, []);
  return <select value={value} onChange={e=>onChange(e.target.value)}>
    <option value="">اختر المستخدم</option>
    {users.map(u=><option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
  </select>;
}
