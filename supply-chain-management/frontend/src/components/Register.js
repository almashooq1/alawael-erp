import React, { useState } from 'react';
import axios from 'axios';

export default function Register({ onRegister }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await axios.post('/api/auth/register', form);
      setSuccess('تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.');
      if (onRegister) onRegister();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل التسجيل');
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 340,
        margin: '60px auto',
        padding: 24,
        border: '1px solid #ccc',
        borderRadius: 8,
      }}
    >
      <h2>تسجيل مستخدم جديد</h2>
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
      <select
        name="role"
        value={form.role}
        onChange={handleChange}
        style={{ width: '100%', marginBottom: 12 }}
      >
        <option value="user">مستخدم عادي</option>
        <option value="manager">مدير</option>
        <option value="admin">مشرف</option>
      </select>
      {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: 8 }}>{success}</div>}
      <button type="submit" disabled={loading} style={{ width: '100%' }}>
        {loading ? 'جاري التسجيل...' : 'تسجيل'}
      </button>
    </form>
  );
}
