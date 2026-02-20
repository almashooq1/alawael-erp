/**
 * BeneficiaryPortal.jsx
 * بوابة المستفيدين الرئيسية
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  Calendar,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import './BeneficiaryPortal.css';

// Import components
import Schedule from './components/Schedule';
import ProgressReport from './components/ProgressReport';
import Messaging from './components/Messaging';
import Surveys from './components/Surveys';
import Profile from './components/Profile';
import Notifications from './components/Notifications';

export default function BeneficiaryPortal() {
  const { beneficiary, logout, token } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch unread notifications count
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/beneficiary/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutGrid },
    { id: 'schedule', label: 'الجدول الزمني', icon: Calendar },
    { id: 'progress', label: 'تقارير التقدم', icon: TrendingUp },
    { id: 'messaging', label: 'الرسائل', icon: MessageSquare, badge: unreadCount },
    { id: 'surveys', label: 'الاستطلاعات', icon: BarChart3 },
    { id: 'profile', label: 'الملف الشخصي', icon: Settings }
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'schedule':
        return <Schedule />;
      case 'progress':
        return <ProgressReport />;
      case 'messaging':
        return <Messaging />;
      case 'surveys':
        return <Surveys />;
      case 'profile':
        return <Profile />;
      case 'dashboard':
      default:
        return <Dashboard beneficiary={beneficiary} />;
    }
  };

  return (
    <div className="beneficiary-portal">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2 className="logo">نظام المستفيدين</h2>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map(item => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={`menu-item ${activeSection === item.id ? 'active' : ''}`}
                onClick={() => setActiveSection(item.id)}
              >
                <IconComponent size={20} />
                <span>{item.label}</span>
                {item.badge > 0 && (
                  <span className="badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="portal-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu size={24} />
            </button>
            <h1>{menuItems.find(item => item.id === activeSection)?.label}</h1>
          </div>

          <div className="header-right">
            <button className="notification-btn" onClick={() => setActiveSection('dashboard')}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            <div className="user-info">
              <div className="user-avatar">
                {beneficiary?.firstName?.charAt(0)}{beneficiary?.lastName?.charAt(0)}
              </div>
              <div className="user-details">
                <p className="user-name">
                  {beneficiary?.firstName} {beneficiary?.lastName}
                </p>
                <p className="user-email">{beneficiary?.email}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p>جاري التحميل...</p>
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </main>
    </div>
  );
}

// Dashboard Component
function Dashboard({ beneficiary }) {
  const [stats, setStats] = useState({
    enrolledPrograms: 0,
    upcomingSchedule: 0,
    overallProgress: 0,
    newMessages: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    // Fetch dashboard statistics
    try {
      // Implementation would fetch from API
      setStats({
        enrolledPrograms: beneficiary?.enrolledPrograms?.length || 0,
        upcomingSchedule: 0,
        overallProgress: 0,
        newMessages: 0
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        {/* Welcome Card */}
        <div className="welcome-card card">
          <h2>أهلا وسهلا {beneficiary?.firstName}!</h2>
          <p>نحن سعداء برؤيتك اليوم</p>
        </div>

        {/* Quick Stats */}
        <div className="stats-grid">
          <StatCard
            title="البرامج المسجلة"
            value={stats.enrolledPrograms}
            icon={LayoutGrid}
            color="#3498db"
          />
          <StatCard
            title="الجلسات المقبلة"
            value={stats.upcomingSchedule}
            icon={Calendar}
            color="#2ecc71"
          />
          <StatCard
            title="التقدم العام"
            value={`${stats.overallProgress}%`}
            icon={TrendingUp}
            color="#f39c12"
          />
          <StatCard
            title="الرسائل الجديدة"
            value={stats.newMessages}
            icon={MessageSquare}
            color="#e74c3c"
          />
        </div>

        {/* Recent Activity */}
        <div className="recent-activity card">
          <h3>النشاط الأخير</h3>
          <ul className="activity-list">
            <li className="activity-item">
              <span className="activity-date">اليوم</span>
              <span className="activity-text">تم تحديث تقريرك الشهري</span>
            </li>
            <li className="activity-item">
              <span className="activity-date">أمس</span>
              <span className="activity-text">حضرت جلسة جديدة</span>
            </li>
            <li className="activity-item">
              <span className="activity-date">3 أيام</span>
              <span className="activity-text">اكتملت استطلاع الرضا</span>
            </li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="quick-links card">
          <h3>الوصول السريع</h3>
          <div className="links-grid">
            <a href="#" className="quick-link">
              <Calendar size={24} />
              <span>عرض الجدول</span>
            </a>
            <a href="#" className="quick-link">
              <TrendingUp size={24} />
              <span>تقريري</span>
            </a>
            <a href="#" className="quick-link">
              <MessageSquare size={24} />
              <span>الرسائل</span>
            </a>
            <a href="#" className="quick-link">
              <BarChart3 size={24} />
              <span>الاستطلاعات</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="stat-card card">
      <div className="stat-icon" style={{ backgroundColor: color }}>
        <Icon size={24} color="white" />
      </div>
      <div className="stat-content">
        <p className="stat-title">{title}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}
