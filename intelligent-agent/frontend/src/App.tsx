import React, { useEffect, useState } from 'react';
import AIStreamingDashboard from './components/AIStreamingDashboard';
import AIRecommendations from './components/AIRecommendations';
import AIMetricsDashboard from './components/AIMetricsDashboard';
import AIProcessReports from './components/AIProcessReports';
import AIAdvancedDashboard from './components/AIAdvancedDashboard';
import AIDataVisualizations from './components/AIDataVisualizations';
import UnifiedAccountingAIDashboard from './components/UnifiedAccountingAIDashboard';
import SaudiComplianceDashboard from './components/SaudiComplianceDashboard';
import EmployeeProfileDashboard from './components/EmployeeProfileDashboard';
import AIClient from './services/AIClient';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import LanguageSwitcher from './components/LanguageSwitcher';
import './styles/theme.css';
import './i18n/config';

type PageId =
  | 'main'
  | 'recommendations'
  | 'metrics'
  | 'reports'
  | 'advanced'
  | 'visualizations'
  | 'unified'
  | 'saudi'
  | 'employee-profile';

interface NavItem {
  id: PageId;
  label: string;
  icon: string;
}

const AppContent: React.FC = () => {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState<PageId>('main');
  const [systemStatus, setSystemStatus] = useState<'online' | 'offline' | 'error'>('online');
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        await AIClient.getDashboard();
        setSystemStatus('online');
        setLastUpdate(new Date().toLocaleTimeString('ar-SA'));
      } catch {
        setSystemStatus('error');
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    { id: 'main', label: 'الرئيسية', icon: '🏠' },
    { id: 'unified', label: 'لوحة موحدة', icon: '🧠' },
    { id: 'saudi', label: 'لوحة السعودية', icon: '🇸🇦' },
    { id: 'employee-profile', label: 'ملف الموظف', icon: '🧾' },
    { id: 'recommendations', label: 'التوصيات', icon: '💡' },
    { id: 'metrics', label: 'المقاييس', icon: '📊' },
    { id: 'reports', label: 'التقارير', icon: '📋' },
    { id: 'advanced', label: 'متقدم', icon: '⚙️' },
    { id: 'visualizations', label: 'تصور البيانات', icon: '📈' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'main':
        return <AIStreamingDashboard />;
      case 'unified':
        return <UnifiedAccountingAIDashboard />;
      case 'saudi':
        return <SaudiComplianceDashboard />;
      case 'employee-profile':
        return <EmployeeProfileDashboard />;
      case 'recommendations':
        return <AIRecommendations />;
      case 'metrics':
        return <AIMetricsDashboard />;
      case 'reports':
        return <AIProcessReports />;
      case 'advanced':
        return <AIAdvancedDashboard />;
      case 'visualizations':
        return <AIDataVisualizations />;
      default:
        return <AIStreamingDashboard />;
    }
  };

  return (
    <div
      className="min-h-screen"
      dir="rtl"
      style={{
        backgroundColor: theme.colors.background.default,
        color: theme.colors.text.primary,
        transition: 'background-color 0.3s ease, color 0.3s ease',
      }}
    >
      <header
        className="sticky top-0 z-40"
        style={{
          background: `linear-gradient(to right, ${theme.colors.background.paper}, ${theme.colors.surface.primary})`,
          borderBottom: `1px solid ${theme.colors.border.main}`,
          transition: 'all 0.3s ease',
        }}
      >
        <div className="max-w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: theme.colors.text.primary }}>
                  نظام الذكاء الاصطناعي المتكامل
                </h1>
                <p className="text-sm" style={{ color: theme.colors.text.secondary }}>
                  Smart Process Management System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher compact={true} />
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{
                      backgroundColor:
                        systemStatus === 'online'
                          ? theme.colors.success.main
                          : systemStatus === 'offline'
                            ? theme.colors.error.main
                            : theme.colors.warning.main,
                    }}
                  ></span>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color:
                        systemStatus === 'online'
                          ? theme.colors.success.main
                          : systemStatus === 'offline'
                            ? theme.colors.error.main
                            : theme.colors.warning.main,
                    }}
                  >
                    {systemStatus === 'online'
                      ? 'النظام نشط'
                      : systemStatus === 'offline'
                        ? 'غير متصل'
                        : 'خطأ في الاتصال'}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: theme.colors.text.disabled }}>
                  آخر تحديث: {lastUpdate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-screen">
        <aside
          className="w-64 overflow-y-auto"
          style={{
            background: `linear-gradient(to bottom, ${theme.colors.surface.primary}, ${theme.colors.surface.secondary})`,
            borderLeft: `1px solid ${theme.colors.border.main}`,
          }}
        >
          <nav className="p-4 space-y-2">
            <div className="mb-6 px-4">
              <h2
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: theme.colors.text.secondary }}
              >
                القائمة الرئيسية
              </h2>
            </div>

            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className="w-full text-right px-4 py-3 font-medium transition-all flex items-center gap-3"
                style={{
                  borderRadius: theme.borderRadius.md,
                  background:
                    currentPage === item.id
                      ? `linear-gradient(to right, ${theme.colors.primary[600]}, ${theme.colors.primary[500]})`
                      : 'transparent',
                  color:
                    currentPage === item.id
                      ? theme.colors.primary.contrast
                      : theme.colors.text.secondary,
                  boxShadow: currentPage === item.id ? theme.shadows.md : 'none',
                }}
              >
                <span className="text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          {renderPage()}

          <footer
            className="mt-8"
            style={{
              background: `linear-gradient(to right, ${theme.colors.surface.primary}, ${theme.colors.surface.secondary})`,
              borderTop: `1px solid ${theme.colors.border.main}`,
            }}
          >
            <div className="max-w-7xl mx-auto px-6 py-6 text-right">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: theme.colors.text.primary }}>
                    📊 النظام
                  </h4>
                  <ul className="text-sm space-y-1" style={{ color: theme.colors.text.secondary }}>
                    <li>✓ 8 نماذج ذكاء اصطناعي</li>
                    <li>✓ 30+ واجهة برمجية</li>
                    <li>✓ 6 لوحات تحكم</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: theme.colors.text.primary }}>
                    🔧 التقنيات
                  </h4>
                  <ul className="text-sm space-y-1" style={{ color: theme.colors.text.secondary }}>
                    <li>React + TypeScript</li>
                    <li>Express.js + MongoDB</li>
                    <li>Tailwind CSS</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2" style={{ color: theme.colors.text.primary }}>
                    📈 الأداء
                  </h4>
                  <ul className="text-sm space-y-1" style={{ color: theme.colors.text.secondary }}>
                    <li>تحديث فوري</li>
                    <li>أمان عالي</li>
                    <li>توسع غير محدود</li>
                  </ul>
                </div>
              </div>

              <div
                className="pt-4 text-center text-sm"
                style={{
                  borderTop: `1px solid ${theme.colors.border.main}`,
                  color: theme.colors.text.secondary,
                }}
              >
                <p>© 2025 نظام الذكاء الاصطناعي المتكامل - جميع الحقوق محفوظة</p>
                <p className="mt-1">Version 1.0.0 - Production Ready ✅</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  return (
    <ThemeProvider defaultMode="dark">
      <AppContent />
    </ThemeProvider>
  );
};

export default MainApp;
