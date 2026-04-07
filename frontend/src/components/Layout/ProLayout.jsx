/**
 * ProLayout — التخطيط الاحترافي (Enhanced)
 * Premium layout with mesh gradients, noise texture, smooth transitions
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
        <div className="flex flex-col items-center justify-center p-4" style={{ width: this.props.width || 72, height: '100vh', background: '#0A1628' }}>
          <span className="text-white/40 text-xs">⚠️</span>
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
    try { return JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY)) || false; }
    catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleToggleCollapse = () => setSidebarCollapsed((prev) => !prev);
  const handleToggleMobile = () => setMobileOpen((prev) => !prev);
  const handleCloseMobile = () => setMobileOpen(false);

  const currentSidebarWidth = isMobile ? 0 : sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <div id="tailwind-scope" dir="rtl" className="font-cairo">
      <div className="flex flex-row min-h-screen relative" style={{ backgroundColor: isDark ? '#0B1120' : '#F5F7FA' }}>
        {/* Decorative mesh gradients */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-[0.04]" 
            style={{ background: 'radial-gradient(circle, rgba(46,125,50,0.4), transparent 70%)', filter: 'blur(60px)' }} />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-[0.03]"
            style={{ background: 'radial-gradient(circle, rgba(76,175,80,0.3), transparent 70%)', filter: 'blur(60px)' }} />
          {isDark && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.02]"
              style={{ background: 'radial-gradient(circle, #4CAF50, transparent 60%)', filter: 'blur(80px)' }} />
          )}
        </div>
        
        {/* Noise texture */}
        {isDark && <div className="fixed inset-0 bg-noise opacity-30 pointer-events-none z-0" />}

        {/* Watermark */}
        <WatermarkBackground zIndex={0} />

        {/* Sidebar */}
        <SidebarErrorBoundary width={currentSidebarWidth}>
          <ProSidebar open={mobileOpen} onClose={handleCloseMobile} collapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
        </SidebarErrorBoundary>

        {/* Main */}
        <main className="flex-grow flex flex-col min-h-screen relative z-[1] transition-all duration-300" style={{ width: `calc(100% - ${currentSidebarWidth}px)` }}>
          <ProHeader sidebarCollapsed={sidebarCollapsed} onToggleSidebar={handleToggleMobile} themeMode={themeMode} onToggleTheme={toggleTheme} />

          <div 
            className="flex-1 overflow-auto px-4 sm:px-5 md:px-7 pb-10 scrollbar-thin"
            style={{ paddingTop: 84 }}
          >
            <Suspense fallback={<DashboardSkeleton />}>
              <RouteErrorBoundary locationKey={location.key}>
                <div className="w-full animate-fade-in-up" style={{ animationDuration: '0.35s' }}>
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
