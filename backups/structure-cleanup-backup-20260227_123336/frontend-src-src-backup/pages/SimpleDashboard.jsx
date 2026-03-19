import React from 'react';
import { useNavigate } from 'react-router-dom';

const SimpleDashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('access_token');

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!token) {
    navigate('/login');
    return null;
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          background: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '30px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, color: '#333' }}>لوحة التحكم</h1>
            <p style={{ color: '#666', marginTop: '10px' }}>
              مرحباً، {user.fullName || user.email}!
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      <div
        style={{
          background: '#e8f5e9',
          padding: '30px',
          borderRadius: '10px',
          border: '2px solid #4caf50',
        }}
      >
        <h2 style={{ color: '#2e7d32', marginTop: 0 }}>✅ تم تسجيل الدخول بنجاح!</h2>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#333' }}>معلومات المستخدم:</h3>
          <pre
            style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '5px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#333' }}>Token:</h3>
          <pre
            style={{
              background: '#fff',
              padding: '15px',
              borderRadius: '5px',
              overflow: 'auto',
              wordBreak: 'break-all',
            }}
          >
            {token}
          </pre>
        </div>

        <div
          style={{ marginTop: '30px', padding: '20px', background: '#fff', borderRadius: '5px' }}
        >
          <h3 style={{ color: '#333', marginTop: 0 }}>الخطوات التالية:</h3>
          <ul style={{ lineHeight: '2' }}>
            <li>✅ تم تسجيل الدخول بنجاح</li>
            <li>✅ تم حفظ Token في localStorage</li>
            <li>✅ تم حفظ بيانات المستخدم</li>
            <li>🎉 النظام يعمل بشكل صحيح!</li>
          </ul>
        </div>
      </div>

      <div
        style={{
          marginTop: '30px',
          padding: '20px',
          background: '#fff3cd',
          borderRadius: '10px',
          border: '2px solid #ffc107',
        }}
      >
        <h3 style={{ marginTop: 0, color: '#856404' }}>📋 ملاحظات:</h3>
        <ul style={{ color: '#856404', lineHeight: '1.8' }}>
          <li>إذا رأيت هذه الصفحة، فهذا يعني أن المصادقة تعمل بشكل صحيح</li>
          <li>يمكنك الآن البدء في استخدام باقي صفحات النظام</li>
          <li>Token صالح لمدة 24 ساعة</li>
        </ul>
      </div>
    </div>
  );
};

export default SimpleDashboard;
