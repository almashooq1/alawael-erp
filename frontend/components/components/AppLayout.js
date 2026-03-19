/**
 * AppLayout.js - Main Application Layout Component
 * Wrapper component that provides navigation, header, and sidebar for the entire app
 */

import React, { useState, useEffect } from 'react';
import './AppLayout.css';

const AppLayout = ({ children, currentUser, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Fetch notification count
    if (currentUser?.id) {
      fetchNotificationCount();
      const interval = setInterval(fetchNotificationCount, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const fetchNotificationCount = async () => {
    try {
      const response = await fetch(`/api/notifications/count?userId=${currentUser?.id}`);
      if (response.ok) {
        const data = await response.json();
        setNotificationCount(data.data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch notification count:', err);
    }
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  // Navigation items based on user role
  const navItems = getNavItemsForRole(currentUser?.role || 'user');

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <button
            className="toggle-sidebar-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div className="logo">
            <span className="logo-icon">🎓</span>
            <span className="logo-text">Beneficiary Portal</span>
          </div>
        </div>

        <div className="header-right">
          {/* Search */}
          <div className="header-search">
            <input
              type="text"
              placeholder="Search..."
              className="search-box"
            />
          </div>

          {/* Notifications */}
          <div className="header-notification">
            <button className="notification-btn">
              🔔
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount}</span>
              )}
            </button>
          </div>

          {/* User Menu */}
          <div className="user-menu">
            <button
              className="user-btn"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span className="user-avatar">{currentUser?.name?.charAt(0) || 'U'}</span>
              <span className="user-name">{currentUser?.name || 'User'}</span>
              <span className="dropdown-arrow">▼</span>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <strong>{currentUser?.name}</strong>
                  <p className="user-role">{currentUser?.role}</p>
                </div>
                <div className="dropdown-divider"></div>
                <a href="/profile" className="dropdown-item">👤 My Profile</a>
                <a href="/settings" className="dropdown-item">⚙️ Settings</a>
                <a href="/help" className="dropdown-item">❓ Help</a>
                <div className="dropdown-divider"></div>
                <button
                  className="dropdown-item logout"
                  onClick={handleLogout}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-container">
        {/* Sidebar */}
        <aside className={`app-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            {navItems.map((item, idx) => (
              <div key={idx}>
                {item.section && (
                  <div className="nav-section-title">{item.section}</div>
                )}
                {item.items && item.items.map((navItem, itemIdx) => (
                  <a
                    key={itemIdx}
                    href={navItem.href}
                    className="nav-item"
                    title={navItem.label}
                  >
                    <span className="nav-icon">{navItem.icon}</span>
                    <span className="nav-label">{navItem.label}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-info">
              <p className="info-label">Application Version</p>
              <p className="info-value">v1.0.0</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="app-main">
          {children}
        </main>
      </div>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <p>&copy; 2025 Beneficiary Management System. All rights reserved.</p>
          <div className="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/contact">Contact Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

function getNavItemsForRole(role) {
  const baseItems = [
    {
      section: 'Dashboard',
      items: [
        { icon: '📊', label: 'Dashboard', href: '/dashboard' },
      ]
    }
  ];

  const studentItems = [
    {
      section: 'My Account',
      items: [
        { icon: '👤', label: 'My Profile', href: '/profile' },
        { icon: '📚', label: 'Academics', href: '/academics' },
        { icon: '📅', label: 'Attendance', href: '/attendance' },
      ]
    },
    {
      section: 'Opportunities',
      items: [
        { icon: '🎓', label: 'Scholarships', href: '/scholarships' },
        { icon: '🏆', label: 'Achievements', href: '/achievements' },
        { icon: '💼', label: 'Internships', href: '/internships' },
      ]
    },
    {
      section: 'Support',
      items: [
        { icon: '📝', label: 'Support Plans', href: '/support-plans' },
        { icon: '💬', label: 'Messages', href: '/messages' },
        { icon: '❓', label: 'Help Center', href: '/help' },
      ]
    }
  ];

  const advisorItems = [
    {
      section: 'Management',
      items: [
        { icon: '👥', label: 'My Beneficiaries', href: '/my-beneficiaries' },
        { icon: '📊', label: 'Analytics', href: '/analytics' },
        { icon: '📝', label: 'Support Plans', href: '/support-plans-admin' },
      ]
    },
    {
      section: 'Reporting',
      items: [
        { icon: '📈', label: 'Reports', href: '/reports' },
        { icon: '⚠️', label: 'Alerts', href: '/alerts' },
      ]
    },
    {
      section: 'System',
      items: [
        { icon: '⚙️', label: 'Settings', href: '/settings' },
        { icon: '📋', label: 'Audit Log', href: '/audit-log' },
      ]
    }
  ];

  const adminItems = [
    {
      section: 'Administration',
      items: [
        { icon: '👥', label: 'All Beneficiaries', href: '/beneficiaries' },
        { icon: '👤', label: 'Users Management', href: '/users' },
        { icon: '⚙️', label: 'System Settings', href: '/system-settings' },
      ]
    },
    {
      section: 'Analytics',
      items: [
        { icon: '📊', label: 'System Analytics', href: '/system-analytics' },
        { icon: '📈', label: 'Reports', href: '/system-reports' },
        { icon: '🔍', label: 'Audit Logs', href: '/audit-logs' },
      ]
    },
    {
      section: 'Configuration',
      items: [
        { icon: '📋', label: 'Programs', href: '/programs' },
        { icon: '🎓', label: 'Scholarships', href: '/scholarships-admin' },
        { icon: '⚡', label: 'System Health', href: '/health' },
      ]
    }
  ];

  if (role === 'admin') {
    return baseItems.concat(adminItems);
  } else if (role === 'advisor') {
    return baseItems.concat(advisorItems);
  } else {
    return baseItems.concat(studentItems);
  }
}

export default AppLayout;
