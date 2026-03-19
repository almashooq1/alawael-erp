/**
 * Sidebar.jsx - Sidebar Navigation Component
 * مكون شريط التنقل الجانبي
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState({});

  const toggleMenu = menuId => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const menuItems = [
    {
      id: 'dashboards',
      label: 'لوحات المعلومات',
      icon: '📊',
      submenu: [
        { path: '/dashboard/employee', label: 'لوحتي الشخصية', icon: '👤' },
        {
          path: '/dashboard/hr',
          label: 'لوحة الموارد البشرية',
          icon: '👥',
          roles: ['hr_manager', 'admin'],
        },
        {
          path: '/dashboard/executive',
          label: 'لوحة الإدارة العليا',
          icon: '👔',
          roles: ['admin', 'executive'],
        },
      ],
    },
    {
      id: 'employees',
      label: 'الموظفون',
      icon: '👥',
      submenu: [
        { path: '/employees', label: 'قائمة الموظفين', icon: '📋', roles: ['hr_manager', 'admin'] },
        { path: '/employees/new', label: 'إضافة موظف', icon: '➕', roles: ['hr_manager', 'admin'] },
        {
          path: '/employees/reports',
          label: 'التقارير',
          icon: '📈',
          roles: ['hr_manager', 'admin'],
        },
      ],
    },
    {
      id: 'attendance',
      label: 'الحضور',
      icon: '✓',
      submenu: [
        { path: '/attendance', label: 'سجل الحضور', icon: '📅', roles: ['hr_manager', 'admin'] },
        {
          path: '/attendance/reports',
          label: 'تقارير الحضور',
          icon: '📊',
          roles: ['hr_manager', 'admin'],
        },
      ],
    },
    {
      id: 'leaves',
      label: 'الإجازات',
      icon: '📅',
      submenu: [
        { path: '/leaves', label: 'إدارة الإجازات', icon: '📋' },
        {
          path: '/leaves/requests',
          label: 'الطلبات المعلقة',
          icon: '⏳',
          roles: ['hr_manager', 'admin'],
        },
        { path: '/leaves/balance', label: 'الأرصدة', icon: '💼' },
      ],
    },
    {
      id: 'payroll',
      label: 'الرواتب',
      icon: '💰',
      submenu: [
        { path: '/payroll', label: 'إدارة الرواتب', icon: '💵', roles: ['hr_manager', 'admin'] },
        { path: '/payroll/history', label: 'السجل', icon: '📜' },
        {
          path: '/payroll/deductions',
          label: 'الخصومات',
          icon: '➖',
          roles: ['hr_manager', 'admin'],
        },
      ],
    },
    {
      id: 'documents',
      label: 'المستندات',
      icon: '📄',
      submenu: [
        { path: '/documents', label: 'مستنداتي', icon: '📃' },
        { path: '/documents/upload', label: 'رفع مستند', icon: '⬆️' },
        {
          path: '/documents/archive',
          label: 'الأرشيف',
          icon: '📦',
          roles: ['hr_manager', 'admin'],
        },
      ],
    },
    {
      id: 'gosi',
      label: 'التأمينات',
      icon: '🏛️',
      submenu: [
        { path: '/gosi', label: 'التأمينات الاجتماعية', icon: '📋' },
        { path: '/gosi/benefits', label: 'المزايا', icon: '🎁' },
        { path: '/gosi/certificates', label: 'الشهادات', icon: '🏆' },
      ],
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: '📈',
      submenu: [
        {
          path: '/reports/hr',
          label: 'تقارير الموارد البشرية',
          icon: '👥',
          roles: ['hr_manager', 'admin'],
        },
        { path: '/reports/financial', label: 'التقارير المالية', icon: '💰', roles: ['admin'] },
        {
          path: '/reports/attendance',
          label: 'تقارير الحضور',
          icon: '✓',
          roles: ['hr_manager', 'admin'],
        },
      ],
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      icon: '⚙️',
      submenu: [
        { path: '/settings/profile', label: 'الملف الشخصي', icon: '👤' },
        { path: '/settings/preferences', label: 'التفضيلات', icon: '🎨' },
        { path: '/settings/system', label: 'إعدادات النظام', icon: '🔧', roles: ['admin'] },
      ],
    },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-content">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">📊</div>
          {isOpen && <span className="logo-text">HRIS</span>}
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map(menu => (
            <MenuItem
              key={menu.id}
              menu={menu}
              isOpen={isOpen}
              isExpanded={expandedMenus[menu.id]}
              onToggle={() => toggleMenu(menu.id)}
              location={location}
            />
          ))}
        </nav>

        {/* User Info */}
        {isOpen && (
          <div className="sidebar-user-info">
            <div className="user-avatar-mini">👤</div>
            <div className="user-info-text">
              <p className="user-name-mini">أحمد محمد</p>
              <p className="user-role-mini">مدير HR</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const MenuItem = ({ menu, isOpen, isExpanded, onToggle, location }) => {
  const isActive =
    menu.submenu?.some(item => location.pathname === item.path) || location.pathname === menu.path;

  return (
    <div className={`menu-item ${isActive ? 'active' : ''}`}>
      <div className="menu-header" onClick={onToggle}>
        <span className="menu-icon">{menu.icon}</span>
        {isOpen && (
          <>
            <span className="menu-label">{menu.label}</span>
            {menu.submenu && (
              <span className={`menu-arrow ${isExpanded ? 'expanded' : ''}`}>▾</span>
            )}
          </>
        )}
      </div>

      {menu.submenu && isExpanded && isOpen && (
        <div className="submenu">
          {menu.submenu.map(subitem => (
            <NavLink
              key={subitem.path}
              to={subitem.path}
              className={({ isActive }) => `submenu-item ${isActive ? 'active' : ''}`}
            >
              <span className="submenu-icon">{subitem.icon}</span>
              <span className="submenu-label">{subitem.label}</span>
            </NavLink>
          ))}
        </div>
      )}

      {!menu.submenu && (
        <NavLink
          to={menu.path}
          className={({ isActive }) => `menu-link ${isActive ? 'active' : ''}`}
        />
      )}
    </div>
  );
};

export default Sidebar;
