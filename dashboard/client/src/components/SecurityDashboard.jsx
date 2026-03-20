import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3600';

/**
 * لوحة التأمين والمصادقة — Security & Auth Dashboard
 */
export default function SecurityDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const token = localStorage.getItem('alawael_token') || '';

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    try {
      const [dashRes, usersRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/api/auth/dashboard`, { headers }),
        fetch(`${API_BASE}/api/auth/users?limit=20`, { headers }),
        fetch(`${API_BASE}/api/auth/audit-logs?limit=20`, { headers })
      ]);
      if (dashRes.ok) setDashboard(await dashRes.json());
      if (usersRes.ok) { const d = await usersRes.json(); setUsers(d.data || []); }
      if (auditRes.ok) { const d = await auditRes.json(); setAuditLogs(d.data || []); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleUserActive = async (userId, currentState) => {
    try {
      await fetch(`${API_BASE}/api/auth/users/${userId}`, {
        method: 'PUT', headers, body: JSON.stringify({ isActive: !currentState })
      });
      fetchData();
    } catch (err) { console.error(err); }
  };

  const resetPassword = async (userId) => {
    if (!window.confirm('هل أنت متأكد من إعادة تعيين كلمة المرور؟')) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/users/${userId}/reset-password`, { method: 'POST', headers });
      const data = await res.json();
      if (data.temporaryPassword) alert(`كلمة المرور المؤقتة: ${data.temporaryPassword}`);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', direction: 'rtl' }}>⏳ جاري التحميل...</div>;

  const roleLabels = { 'super-admin': '👑 مدير عام', admin: '🔧 مدير', principal: '🏫 مدير مركز', teacher: '📚 معلم/ة', staff: '👤 موظف', parent: '👨‍👩‍👧 ولي أمر', student: '🎓 طالب', accountant: '💰 محاسب', nurse: '🏥 ممرض/ة', driver: '🚌 سائق', kitchen: '🍳 مطبخ', security: '🔒 حراسة' };
  const actionLabels = { LOGIN: 'تسجيل دخول', LOGOUT: 'تسجيل خروج', REGISTER: 'تسجيل جديد', CHANGE_PASSWORD: 'تغيير كلمة مرور', RESET_PASSWORD: 'إعادة تعيين كلمة مرور', UPDATE_USER: 'تحديث مستخدم', '2FA_ENABLED': 'تفعيل 2FA', '2FA_DISABLED': 'إلغاء 2FA', CREATE_ROLE: 'إنشاء دور' };

  const tabs = [
    { id: 'overview', label: '📊 نظرة عامة' },
    { id: 'users', label: '👥 المستخدمون' },
    { id: 'audit', label: '📋 سجل التدقيق' },
    { id: 'roles', label: '🔐 الأدوار' }
  ];

  return (
    <div style={{ padding: 24, direction: 'rtl', fontFamily: 'Tajawal, sans-serif' }}>
      <h1 style={{ marginBottom: 24 }}>🔒 التأمين والمصادقة</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '10px 20px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, background: activeTab === tab.id ? '#1976d2' : '#e0e0e0', color: activeTab === tab.id ? '#fff' : '#333', fontWeight: activeTab === tab.id ? 'bold' : 'normal' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && dashboard && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'إجمالي المستخدمين', value: dashboard.totalUsers, color: '#1976d2', icon: '👥' },
              { label: 'مستخدمون نشطون', value: dashboard.activeUsers, color: '#4caf50', icon: '✅' },
              { label: 'حسابات مقفلة', value: dashboard.lockedUsers, color: '#f44336', icon: '🔒' },
              { label: 'تسجيلات اليوم', value: dashboard.todayLogins, color: '#ff9800', icon: '📊' }
            ].map((card, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', borderRight: `4px solid ${card.color}` }}>
                <div style={{ fontSize: 28 }}>{card.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: card.color }}>{card.value ?? 0}</div>
                <div style={{ color: '#666', fontSize: 14 }}>{card.label}</div>
              </div>
            ))}
          </div>

          {/* Roles Distribution */}
          {dashboard.roleCounts?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 24 }}>
              <h3>توزيع الأدوار</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {dashboard.roleCounts.map(r => (
                  <div key={r._id} style={{ background: '#f5f5f5', borderRadius: 8, padding: '10px 16px', minWidth: 120 }}>
                    <div style={{ fontWeight: 'bold' }}>{roleLabels[r._id] || r._id}</div>
                    <div style={{ fontSize: 20, color: '#1976d2' }}>{r.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {dashboard.recentAudit?.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <h3>النشاط الأخير</h3>
              {dashboard.recentAudit.map((log, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <span style={{ fontWeight: 'bold' }}>{log.username || 'غير معروف'}</span>
                    {' — '}{actionLabels[log.action] || log.action}
                    <span style={{ color: log.status === 'success' ? '#4caf50' : '#f44336', marginRight: 8 }}>
                      {log.status === 'success' ? ' ✅' : ' ❌'}
                    </span>
                  </span>
                  <span style={{ color: '#999', fontSize: 12 }}>{new Date(log.timestamp).toLocaleString('ar-SA')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="بحث بالاسم أو البريد..." style={{ flex: 1, padding: '10px 16px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, direction: 'rtl' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ background: '#1976d2', color: '#fff' }}>
                  <th style={{ padding: 12, textAlign: 'right' }}>الاسم</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>المستخدم</th>
                  <th style={{ padding: 12, textAlign: 'right' }}>البريد</th>
                  <th style={{ padding: 12 }}>الدور</th>
                  <th style={{ padding: 12 }}>الحالة</th>
                  <th style={{ padding: 12 }}>آخر دخول</th>
                  <th style={{ padding: 12 }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.filter(u => !searchQuery || u.nameAr?.includes(searchQuery) || u.username?.includes(searchQuery) || u.email?.includes(searchQuery))
                  .map(user => (
                  <tr key={user.userId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 10 }}>{user.nameAr}</td>
                    <td style={{ padding: 10, direction: 'ltr' }}>{user.username}</td>
                    <td style={{ padding: 10, direction: 'ltr', fontSize: 13 }}>{user.email}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}><span style={{ padding: '2px 10px', borderRadius: 12, background: '#e3f2fd', fontSize: 12 }}>{roleLabels[user.role] || user.role}</span></td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <span style={{ color: user.isActive ? '#4caf50' : '#f44336' }}>{user.isActive ? '✅ نشط' : '❌ معطل'}</span>
                      {user.isLocked && <span style={{ color: '#f44336', display: 'block', fontSize: 11 }}>🔒 مقفل</span>}
                    </td>
                    <td style={{ padding: 10, fontSize: 12, color: '#666' }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-SA') : '—'}</td>
                    <td style={{ padding: 10, display: 'flex', gap: 4 }}>
                      <button onClick={() => toggleUserActive(user.userId, user.isActive)} style={{ padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: user.isActive ? '#ffebee' : '#e8f5e9' }}>
                        {user.isActive ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button onClick={() => resetPassword(user.userId)} style={{ padding: '4px 10px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: '#fff3e0' }}>
                        🔑 إعادة كلمة المرور
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div>
          <h2>📋 سجل التدقيق</h2>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            {auditLogs.map((log, i) => (
              <div key={i} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>{log.username || log.userId || '—'}</span>
                  <span style={{ margin: '0 8px', padding: '2px 8px', borderRadius: 4, fontSize: 12, background: log.status === 'success' ? '#e8f5e9' : log.status === 'blocked' ? '#ffebee' : '#fff3e0', color: log.status === 'success' ? '#2e7d32' : '#c62828' }}>
                    {actionLabels[log.action] || log.action}
                  </span>
                  {log.ip && <span style={{ color: '#999', fontSize: 11 }}>IP: {log.ip}</span>}
                </div>
                <div style={{ color: '#999', fontSize: 12 }}>{new Date(log.timestamp).toLocaleString('ar-SA')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <h2>🔐 الأدوار والصلاحيات</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {Object.entries(roleLabels).map(([role, label]) => (
              <div key={role} style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{label}</div>
                <div style={{ color: '#666', fontSize: 13 }}>الكود: {role}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
