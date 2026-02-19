/**
 * AppIntegrationFinal.jsx - تطبيق HR متكامل مع جميع المكونات المتصلة بـ API
 * نسخة المرحلة 5 النهائية - كل المكونات مع اتصال Backend حقيقي
 */

import React, { useState, useContext, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Calendar,
  BarChart3,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import HRDashboardIntegrated from './HRDashboardIntegrated';
import EmployeeManagementIntegrated from './EmployeeManagementIntegrated';
import PayrollManagementIntegrated from './PayrollManagementIntegrated';
import LeaveManagementIntegrated from './LeaveManagementIntegrated';
import ReportsAnalyticsIntegrated from './ReportsAnalyticsIntegrated';
import { AuthContext } from '../context/AuthContext';

export default function AppIntegrationFinal() {
  const [activeComponent, setActiveComponent] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user, logout } = useContext(AuthContext) || {};

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isNowMobile = window.innerWidth < 768;
      setIsMobile(isNowMobile);
      if (isNowMobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Menu items
  const menuItems = [
    {
      id: 'dashboard',
      label: 'لوحة التحكم',
      icon: LayoutDashboard,
      role: ['admin', 'manager', 'employee'],
    },
    {
      id: 'employees',
      label: 'الموظفون',
      icon: Users,
      role: ['admin', 'manager'],
    },
    {
      id: 'payroll',
      label: 'الرواتب',
      icon: DollarSign,
      role: ['admin', 'manager', 'finance'],
    },
    {
      id: 'leaves',
      label: 'الإجازات',
      icon: Calendar,
      role: ['admin', 'manager', 'employee'],
    },
    {
      id: 'reports',
      label: 'التقارير',
      icon: BarChart3,
      role: ['admin', 'manager'],
    },
  ];

  // Filter menu by user role
  const userRole = user?.role || 'employee';
  const accessibleMenuItems = menuItems.filter((item) =>
    item.role.includes(userRole)
  );

  // Handle logout
  const handleLogout = () => {
    if (logout) {
      logout();
    }
  };

  // Render active component
  const renderActiveComponent = () => {
    switch (activeComponent) {
      case 'dashboard':
        return <HRDashboardIntegrated />;
      case 'employees':
        return <EmployeeManagementIntegrated />;
      case 'payroll':
        return <PayrollManagementIntegrated />;
      case 'leaves':
        return <LeaveManagementIntegrated />;
      case 'reports':
        return <ReportsAnalyticsIntegrated />;
      default:
        return <HRDashboardIntegrated />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100" dir="rtl">
      {/* Backdrop for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gradient-to-b from-blue-600 to-blue-800 text-white transition-all duration-300 overflow-hidden z-50 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-blue-500">
          <h1 className="text-2xl font-bold flex items-center justify-end gap-2">
            <span>نظام الموارد البشرية</span>
            <span className="text-3xl">🏢</span>
          </h1>
          <p className="text-blue-200 text-sm mt-1 text-right">
            إدارة متقدمة للموارد البشرية
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {accessibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeComponent === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveComponent(item.id);
                  if (isMobile) setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-end gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-white text-blue-600 font-semibold'
                    : 'text-blue-100 hover:bg-blue-500'
                }`}
              >
                <span>{item.label}</span>
                <Icon size={20} />
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-blue-500 p-4 space-y-3">
          {user && (
            <div className="bg-blue-500 rounded-lg p-3">
              <p className="text-sm text-blue-100 text-right">مرحباً بك</p>
              <p className="text-lg font-semibold text-white text-right">
                {user.name || user.email}
              </p>
              <p className="text-xs text-blue-200 text-right mt-1">
                {userRole === 'admin'
                  ? 'مسؤول النظام'
                  : userRole === 'manager'
                  ? 'مدير'
                  : userRole === 'finance'
                  ? 'قسم المالية'
                  : 'موظف'}
              </p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-end gap-3 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg transition font-semibold text-white"
          >
            <span>تسجيل الخروج</span>
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-md border-b-2 border-gray-200">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* Menu Toggle Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {sidebarOpen ? (
                <X size={24} className="text-gray-700" />
              ) : (
                <Menu size={24} className="text-gray-700" />
              )}
            </button>

            {/* Page Title */}
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-800">
                {accessibleMenuItems.find((item) => item.id === activeComponent)
                  ?.label || 'لوحة التحكم'}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('ar-EG', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* System Status Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">النظام نشط</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-7xl mx-auto">
            {renderActiveComponent()}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="text-center text-sm text-gray-600">
            <p>
              نظام إدارة الموارد البشرية - النسخة 2.0 | © 2026 جميع الحقوق محفوظة
            </p>
            <p className="text-xs mt-1">
              آخر تحديث: {new Date().toLocaleString('ar-EG')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
