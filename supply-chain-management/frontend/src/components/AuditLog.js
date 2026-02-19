import React, { useEffect, useState } from 'react';
import apiClient from '../utils/api';

function AuditLog({ user }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get('/api/audit-logs')
      .then(res => setLogs(res.data.data || res.data || []))
      .catch(err => setError('غير مصرح أو خطأ في جلب السجل'))
      .finally(() => setLoading(false));
  }, []);

  if (user.role !== 'admin' && user.role !== 'manager') {
    return <div style={{ color: 'red' }}>غير مصرح لك بعرض سجل النشاطات</div>;
  }

  if (loading) return <div>جاري التحميل...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div style={{ marginTop: 32 }}>
      <h2>سجل النشاطات</h2>
      <table border="1" cellPadding="8" style={{ width: '100%', fontSize: 15 }}>
        <thead>
          <tr>
            <th>المستخدم</th>
            <th>الدور</th>
            <th>العملية</th>
            <th>الكيان</th>
            <th>التفاصيل</th>
            <th>التاريخ</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log._id}>
              <td>{log.user?.username}</td>
              <td>{log.user?.role}</td>
              <td>{log.action}</td>
              <td>{log.entity}</td>
              <td>
                {log.entityId && (
                  <span>
                    #{log.entityId.slice(-6)}
                    <br />
                  </span>
                )}
                {log.details && (
                  <pre style={{ fontSize: 12, maxWidth: 300, overflowX: 'auto' }}>
                    {JSON.stringify(log.details, null, 1)}
                  </pre>
                )}
              </td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AuditLog;
