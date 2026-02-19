/**
 * AppIntegration.jsx - النسخة المحسّنة من التطبيق مع تكامل APIs
 * يحتوي على التوجيه والتكامل الكامل مع خدمات الـ Backend
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { Menu, LogOut, Bell, Settings, Home, Users, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import HRDashboard from './components/HRDashboard';
import EmployeeManagement from './components/EmployeeManagement';
import PayrollManagement from './components/PayrollManagement';
import LeaveManagement from './components/LeaveManagement';
import HRAPIService from './services/HRAPIService';

// Auth Context - سياق المصادقة
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = HRAPIService.isAuthenticated();
    if (auth) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(userData);
      setIsAuthenticated(true);
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    HRAPIService.clearToken();
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// تطبيق معزول
export default function AppIntegration() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

// المكون الرئيسي
function MainApp() {
  const { isAuthenticated, user, logout, login } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // تحميل الإشعارات
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // محاكاة جلب الإشعارات
      const sampleNotifications = [
        {
          id: 1,
          type: 'leave',
          message: 'طلب إجازة جديد من أحمد محمد',
          time: '10 دقائق',
          read: false,
        },
        {
          id: 2,
          type: 'payroll',
          message: 'تم معالجة رواتب شهر يناير',
          time: '1 ساعة',
          read: false,
        },
        {
          id: 3,
          type: 'attendance',
          message: 'موظف لم يسجل الحضور',
          time: '2 ساعة',
          read: true,
        },
      ];
      setNotifications(sampleNotifications);
    } catch (err) {
      console.error('خطأ في تحميل الإشعارات:', err);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentPage('dashboard');
  };

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Home },
    { id: 'employees', label: 'الموظفون', icon: Users },
    { id: 'payroll', label: 'الرواتب', icon: DollarSign },
    { id: 'leave', label: 'الإجازات', icon: Calendar },
    { id: 'reports', label: 'التقارير', icon: BarChart3 },
  ];

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white shadow-lg hidden md:flex md:flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-blue-700">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-400 rounded-lg flex items-center justify-center font-bold">
              HR
            </div>
            نظام الموارد البشرية
          </h1>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-blue-700">
          <div className="text-sm">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-blue-200 text-xs">
              {user?.role === 'admin'
                ? 'مدير النظام'
                : user?.role === 'hr'
                ? 'موظف الموارد البشرية'
                : 'موظف'}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  currentPage === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/20 transition"
          >
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-600"
            >
              <Menu size={24} />
            </button>

            {/* Page Title */}
            <h2 className="text-2xl font-bold text-gray-800">
              {menuItems.find((item) => item.id === currentPage)?.label || 'نظام الموارد البشرية'}
            </h2>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <Bell size={24} />
                  {notifications.some((n) => !n.read) && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50">
                    <div className="p-4 border-b">
                      <h3 className="font-semibold text-gray-800">الإشعارات</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-sm text-gray-800">{notification.message}</span>
                              <span className="text-xs text-gray-500">{notification.time}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-gray-500">لا توجد إشعارات</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Button */}
              <button className="p-2 text-gray-600 hover:text-gray-900 transition">
                <Settings size={24} />
              </button>

              {/* User Profile */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.charAt(0)}
              </div>
            </div>
          </div>

          {/* Error Bar */}
          {error && (
            <div className="bg-red-50 border-t border-red-200 text-red-700 px-4 md:px-6 py-3 flex justify-between items-center">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                ✕
              </button>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
          {!loading && (
            <>
              {currentPage === 'dashboard' && <HRDashboard onError={setError} isLoading={loading} />}
              {currentPage === 'employees' && <EmployeeManagement onError={setError} />}
              {currentPage === 'payroll' && <PayrollManagement onError={setError} />}
              {currentPage === 'leave' && <LeaveManagement onError={setError} />}
            </>
          )}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-blue-900 text-white p-4">
            <nav className="space-y-2 mt-6">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPage(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                      currentPage === item.id ? 'bg-blue-600' : 'hover:bg-blue-700'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-900/20 transition mt-6"
            >
              <LogOut size={20} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * صفحة تسجيل الدخول
 */
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password) {
        setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        setLoading(false);
        return;
      }

      // تأخير محاكاة الطلب
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const user = {
        id: Math.random(),
        name: 'أحمد محمد علي',
        email: email,
        role: email.includes('admin') ? 'admin' : email.includes('hr') ? 'hr' : 'employee',
      };

      // تخزين البيانات
      const token = 'mock-token-' + Date.now();
      localStorage.setItem('authToken', token);
      HRAPIService.setToken(token);

      onLogin(user);
    } catch (err) {
      setError(err.message || 'خطأ في تسجيل الدخول، يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center p-4"
      dir="rtl"
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center font-bold text-3xl text-blue-900 mx-auto mb-4">
            HR
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">نظام الموارد البشرية</h1>
          <p className="text-blue-200">مرحبا بك في النظام المتقدم لإدارة الموارد البشرية</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">تسجيل الدخول</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">جرب: admin@company.com</p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
                  جارٍ التسجيل...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>

          {/* Demo Info */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700 text-center font-semibold mb-2">حسابات تجريبية:</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="text-gray-600">
                المدير: <span className="text-blue-600">admin@company.com</span>
              </div>
              <div className="text-gray-600">
                HR: <span className="text-blue-600">hr@company.com</span>
              </div>
              <div className="text-gray-600">
                الموظف: <span className="text-blue-600">employee@company.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
