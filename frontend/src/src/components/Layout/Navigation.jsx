/**
 * Navigation.jsx - Top Navigation Bar Component
 * مكون شريط التنقل العلوي
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Navigation.css';

const Navigation = ({ 
  onToggleSidebar, 
  onToggleDarkMode, 
  isDarkMode, 
  language,
  onChangeLanguage 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(3);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <div className="nav-left">
        <button className="menu-toggle" onClick={onToggleSidebar} title="قائمة التبديل">
          ☰
        </button>
        <div className="nav-logo">
          <h1>نظام إدارة الموارد البشرية</h1>
          <span className="logo-subtitle">HRIS System</span>
        </div>
      </div>

      <div className="nav-center">
        <div className="search-bar">
          <input 
            type="text" 
            placeholder={language === 'ar' ? 'البحث...' : 'Search...'} 
            className="search-input"
          />
          <button className="search-button">🔍</button>
        </div>
      </div>

      <div className="nav-right">
        {/* Notifications */}
        <div className="nav-item notifications">
          <button 
            className="notification-bell"
            onClick={() => setShowNotifications(!showNotifications)}
            title="إشعارات"
          >
            🔔
            {unreadNotifications > 0 && (
              <span className="notification-badge">{unreadNotifications}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>{language === 'ar' ? 'الإشعارات' : 'Notifications'}</h3>
                <button className="close-btn" onClick={() => setShowNotifications(false)}>✕</button>
              </div>
              <div className="notification-list">
                <div className="notification-item">
                  <span className="notification-icon">💼</span>
                  <div className="notification-content">
                    <p>تم تحديث بيانات الراتب</p>
                    <small>منذ 10 دقائق</small>
                  </div>
                </div>
                <div className="notification-item">
                  <span className="notification-icon">📋</span>
                  <div className="notification-content">
                    <p>طلب إجازة قيد الانتظار</p>
                    <small>منذ ساعة</small>
                  </div>
                </div>
                <div className="notification-item">
                  <span className="notification-icon">📢</span>
                  <div className="notification-content">
                    <p>إعلان جديد من الإدارة</p>
                    <small>منذ 3 ساعات</small>
                  </div>
                </div>
              </div>
              <div className="notification-footer">
                <a href="/notifications">{language === 'ar' ? 'عرض الكل' : 'View All'}</a>
              </div>
            </div>
          )}
        </div>

        {/* Language Toggle */}
        <div className="nav-item language-toggle">
          <div className="language-selector">
            <button
              className={`lang-btn ${language === 'ar' ? 'active' : ''}`}
              onClick={() => onChangeLanguage('ar')}
              title="العربية"
            >
              العربية
            </button>
            <span className="divider">|</span>
            <button
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => onChangeLanguage('en')}
              title="English"
            >
              EN
            </button>
          </div>
        </div>

        {/* Dark Mode Toggle */}
        <div className="nav-item dark-mode-toggle">
          <button
            className="dark-mode-btn"
            onClick={onToggleDarkMode}
            title={isDarkMode ? 'الوضع الفاتح' : 'الوضع الداكن'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* User Menu */}
        <div className="nav-item user-menu">
          <button
            className="user-button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            title="القائمة الشخصية"
          >
            👤
            <span className="user-name">أحمد محمد</span>
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <div className="user-info">
                <div className="user-avatar">👤</div>
                <div className="user-details">
                  <p className="user-name">أحمد محمد أحمد</p>
                  <p className="user-role">مدير الموارد البشرية</p>
                </div>
              </div>
              <div className="user-menu-items">
                <a href="/profile">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</a>
                <a href="/settings">{language === 'ar' ? 'الإعدادات' : 'Settings'}</a>
                <a href="/help">{language === 'ar' ? 'المساعدة' : 'Help'}</a>
                <button className="logout-btn" onClick={handleLogout}>
                  {language === 'ar' ? 'تسجيل الخروج' : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
