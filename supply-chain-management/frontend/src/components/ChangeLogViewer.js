import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ChangeLogViewer({ entity, entityId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!entity || !entityId) return;
    setLoading(true);
    setError('');
    axios
      .get(`/api/changelog/${entity}/${entityId}`)
      .then(res => setLogs(res.data))
      .catch(() => setError('فشل تحميل سجل التعديلات'))
      .finally(() => setLoading(false));
  }, [entity, entityId]);

  if (!entityId) return null;
  if (loading) return <div>جاري تحميل سجل التعديلات...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!logs.length) return <div>لا يوجد تعديلات مسجلة</div>;

  return (
    <div style={{ marginTop: 24 }}>
      <h4>سجل التعديلات</h4>
      <table border="1" cellPadding="6" style={{ width: '100%', fontSize: 14 }}>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>المستخدم</th>
            <th>الإجراء</th>
            <th>قبل التعديل</th>
            <th>بعد التعديل</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log._id}>
              <td>{new Date(log.date).toLocaleString()}</td>
              <td>{log.user || '-'}</td>
              <td>{log.action === 'update' ? 'تعديل' : 'حذف'}</td>
              <td>
                <pre style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(log.before, null, 2)}
                </pre>
              </td>
              <td>
                <pre style={{ maxWidth: 200, whiteSpace: 'pre-wrap' }}>
                  {log.after ? JSON.stringify(log.after, null, 2) : '-'}
                </pre>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
