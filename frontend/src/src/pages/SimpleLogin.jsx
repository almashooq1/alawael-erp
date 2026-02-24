import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const SimpleLogin = () => {
  const [email, setEmail] = useState('admin@test.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('🔐 Attempting login...');
    console.log('Email:', email);
    console.log('API URL:', '/auth/login');

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password
      });

      console.log('✅ Login response:', response.data);

      const token = response.data?.data?.accessToken || response.data?.accessToken;
      const user = response.data?.data?.user || response.data?.user;

      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('access_token', token);
        localStorage.setItem('auth_token', token); // للتح兼 مع أي كود يستخدم الاسم القديم
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Login successful!');
        alert('تم تسجيل الدخول بنجاح!');
        navigate('/dashboard');
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      console.error('Response:', err.response?.data);
      console.error('Status:', err.response?.status);

      const isNetworkError = err.message === 'Network Error' || !err.response;
      const errorMsg = isNetworkError
        ? 'تعذر الاتصال بالخادم. تأكد أن الـ Backend يعمل على المنفذ الصحيح وأن الاتصال ليس محجوباً.'
        : err.response?.data?.message || err.message || 'فشل تسجيل الدخول';
      setError(errorMsg);
      alert('خطأ: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>
          تسجيل الدخول
        </h2>

        {error && (
          <div style={{
            padding: '10px',
            marginBottom: '20px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '5px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '16px'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              background: loading ? '#999' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
          <p><strong>للاختبار:</strong></p>
          <p>البريد: admin@test.com</p>
          <p>كلمة المرور: Admin@123</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleLogin;
