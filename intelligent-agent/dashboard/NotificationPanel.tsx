import React, { useEffect, useState } from 'react';

export default function NotificationPanel() {
  const [notifs, setNotifs] = useState<any[]>([]);
  useEffect(() => {
    fetch('/dashboard/notification/list').then(r=>r.json()).then(setNotifs);
  }, []);
  return <div style={{fontFamily:'Tahoma,Arial',maxWidth:600,margin:'auto'}}>
    <h2>الإشعارات المركزية</h2>
    <table style={{width:'100%'}}><thead><tr><th>المستخدم</th><th>العنوان</th><th>الرسالة</th><th>القناة</th><th>التاريخ</th></tr></thead>
      <tbody>
        {notifs.map(n=><tr key={n.id}><td>{n.userId}</td><td>{n.title}</td><td>{n.message}</td><td>{n.channel}</td><td>{n.sentAt}</td></tr>)}
      </tbody>
    </table>
  </div>;
}
