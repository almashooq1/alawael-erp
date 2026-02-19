import React, { useState, useEffect } from 'react';
import SupplierList from './components/SupplierList';
import ProductList from './components/ProductList';
import InventoryList from './components/InventoryList';
import OrderList from './components/OrderList';
import ShipmentList from './components/ShipmentList';
import Login from './components/Login';
import Register from './components/Register';
import AuditLog from './components/AuditLog';
import Notification from './components/Notification';
import Dashboard from './components/Dashboard';
import BarcodeManager from './components/BarcodeManager';
import apiClient from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [notif, setNotif] = useState({ message: '', type: 'info' });
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'barcode', 'items', 'audit'

  const showNotification = (message, type = 'info') => {
    setNotif({ message, type });
    setTimeout(() => setNotif({ message: '', type: 'info' }), 3500);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiClient
        .get('/api/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: 60 }}>جاري التحميل...</div>;
  if (!user) {
    return (
      <div>
        {showRegister ? (
          <>
            <Register onRegister={() => setShowRegister(false)} />
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setShowRegister(false)} style={{ marginTop: 8 }}>
                لديك حساب؟ تسجيل الدخول
              </button>
            </div>
          </>
        ) : (
          <>
            <Login onLogin={setUser} />
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setShowRegister(true)} style={{ marginTop: 8 }}>
                مستخدم جديد؟ سجل الآن
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Notification
        message={notif.message}
        type={notif.type}
        onClose={() => setNotif({ message: '', type: 'info' })}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Supply Chain Management</h1>
        <div>
          <span style={{ marginInlineEnd: 12 }}>
            مرحباً، {user.username} ({user.role})
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.reload();
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ marginBottom: 24, borderBottom: '2px solid #ddd', display: 'flex', gap: 16 }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'dashboard' ? '#1976d2' : 'transparent',
            color: activeTab === 'dashboard' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'dashboard' ? 'bold' : 'normal',
          }}
        >
          لوحة التحكم
        </button>
        <button
          onClick={() => setActiveTab('barcode')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'barcode' ? '#1976d2' : 'transparent',
            color: activeTab === 'barcode' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'barcode' ? 'bold' : 'normal',
          }}
        >
          🔷 الباركود و QR Code
        </button>
        <button
          onClick={() => setActiveTab('items')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'items' ? '#1976d2' : 'transparent',
            color: activeTab === 'items' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'items' ? 'bold' : 'normal',
          }}
        >
          المخزون و الطلبات
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          style={{
            padding: '12px 24px',
            background: activeTab === 'audit' ? '#1976d2' : 'transparent',
            color: activeTab === 'audit' ? 'white' : '#666',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: activeTab === 'audit' ? 'bold' : 'normal',
          }}
        >
          سجل التدقيق
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' && <Dashboard />}

      {activeTab === 'barcode' && <BarcodeManager />}

      {activeTab === 'items' && (
        <>
          <SupplierList user={user} notify={showNotification} />
          <ProductList user={user} notify={showNotification} />
          <InventoryList user={user} notify={showNotification} />
          <OrderList user={user} notify={showNotification} />
          <ShipmentList user={user} notify={showNotification} />
        </>
      )}

      {activeTab === 'audit' && <AuditLog user={user} />}
    </div>
  );
}

export default App;
