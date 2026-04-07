/**
 * ProLayout — التخطيط الاحترافي (Tailwind)
 * Sidebar + Header + Content area
 * Sidebar collapse persisted in localStorage
 */
import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTheme, useMediaQuery } from '@mui/material';
import ProSidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './sidebar';
import ProHeader from './ProHeader';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import RouteErrorBoundary from '../shared/RouteErrorBoundary';
import WatermarkBackground from '../shared/WatermarkBackground';
import { useThemeMode } from '../../contexts/ThemeContext';
import logger from '../../utils/logger';

/* ─── Sidebar error boundary ────────────────────────────────────────────── */
class SidebarErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    logger.error('[SidebarErrorBoundary]', error, info?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center p-4"
          style={{
            width: this.props.width || 72,
            height: '100vh',
            background: '#0A1628',
          }}
        >
          <span className="text-white/50 text-xs">⚠️</span>
        </div>
      );
    }
    return this.props.children;
  }
}

const SIDEBAR_STATE_KEY = 'alawael-sidebar-collapsed';

const ProLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { toggleTheme, mode: themeMode } = useThemeMode();
  const isDark = theme.palette.mode === 'dark';

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY)) || false;
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleToggleCollapse = () => setSidebarCollapsed((prev) => !prev);
  const handleToggleMobile = () => setMobileOpen((prev) => !prev);
  const handleCloseMobile = () => setMobileOpen(false);

  const currentSidebarWidth = isMobile
    ? 0
    : sidebarCollapsed
    ? SIDEBAR_COLLAPSED
    : SIDEBAR_WIDTH;

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo">
      <div
        className="flex flex-row min-h-screen relative"
        style={{
          backgroundColor: isDark ? '#0B1120' : '#F4F6FA',
        }}
      >
        {/* Subtle radial gradient background */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(ellipse at 0% 0%, rgba(46,125,50,0.06) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(76,175,80,0.04) 0%, transparent 50%)'
              : 'radial-gradient(ellipse at 0% 0%, rgba(46,125,50,0.03) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(76,175,80,0.02) 0%, transparent 50%)',
          }}
        />

        {/* Watermark */}
        <WatermarkBackground zIndex={0} />

        {/* Sidebar */}
        <SidebarErrorBoundary width={currentSidebarWidth}>
          <ProSidebar
            open={mobileOpen}
            onClose={handleCloseMobile}
            collapsed={sidebarCollapsed}
            onToggleCollapse={handleToggleCollapse}
          />
        </SidebarErrorBoundary>

        {/* Main Content */}
        <main
          className="flex-grow flex flex-col min-h-screen relative z-[1] transition-all duration-300"
          style={{ width: `calc(100% - ${currentSidebarWidth}px)` }}
        >
          {/* Header */}
          <ProHeader
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={handleToggleMobile}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
          />

          {/* Content Area */}
          <div
            className="flex-1 overflow-auto px-4 sm:px-6 md:px-7 pb-8"
            style={{
              paddingTop: `${64 + 20}px`,
              scrollbarWidth: 'thin',
              scrollbarColor: isDark
                ? 'rgba(255,255,255,0.1) transparent'
                : 'rgba(46,125,50,0.2) transparent',
            }}
          >
            <Suspense fallback={<DashboardSkeleton />}>
              <RouteErrorBoundary locationKey={location.key}>
                <div
                  className="w-full"
                  style={{
                    animation: 'contentSlideIn 0.3s ease',
                  }}
                >
                  <style>{`
                    @keyframes contentSlideIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                  <Outlet />
                </div>
              </RouteErrorBoundary>
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProLayout;
