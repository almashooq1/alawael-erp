import React, { useState } from 'react';
import apiClient from '../utils/api';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/auth/login', form);
      console.log('Login successful:', res.data);
      localStorage.setItem('token', res.data.token);
      if (onLogin) onLogin(res.data.user);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || err.message || 'فشل تسجيل الدخول');
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 320,
        margin: '60px auto',
        padding: 24,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <h2>تسجيل الدخول</h2>
      <input
        name="username"
        placeholder="اسم المستخدم"
        value={form.username}
        onChange={handleChange}
        required
        style={{ width: '100%', marginBottom: 12 }}
      />
      <input
        name="password"
        type="password"
        placeholder="كلمة المرور"
        value={form.password}
        onChange={handleChange}
        required
        style={{ width: '100%', marginBottom: 12 }}
      />
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      <button type="submit" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'جاري الدخول...' : 'دخول'}
      </button>
    </form>
  );
}
