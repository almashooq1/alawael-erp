/**
 * Professional Layout — AlAwael ERP (محسّن)
 * تخطيط احترافي يجمع القائمة الجانبية والشريط العلوي ومنطقة المحتوى
 *
 * Features:
 * - Combines ProSidebar + ProHeader + Content area
 * - Sidebar collapse state persisted in localStorage
 * - Responsive: overlay drawer on mobile, pinned on desktop
 * - Smooth cubic-bezier animations on all layout changes
 * - RTL-aware (sidebar on right side)
 * - Subtle content area background
 */

import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, useTheme, useMediaQuery, Fade, Typography } from '@mui/material';
import ProSidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './sidebar';
import ProHeader from './ProHeader';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import RouteErrorBoundary from '../shared/RouteErrorBoundary';
import WatermarkBackground from '../shared/WatermarkBackground';
import { useThemeMode } from '../../contexts/ThemeContext';
import logger from '../../utils/logger';

// Error boundary specifically for sidebar — prevents sidebar crash from taking down the whole app
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
        <Box
          sx={{
            width: this.props.width || 72,
            height: '100vh',
            background: '#0A1628',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
        >
          <Typography
            sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textAlign: 'center' }}
          >
            ⚠️
          </Typography>
        </Box>
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

  const handleToggleCollapse = () => setSidebarCollapsed(prev => !prev);
  const handleToggleMobile = () => setMobileOpen(prev => !prev);
  const handleCloseMobile = () => setMobileOpen(false);

  const currentSidebarWidth = isMobile ? 0 : sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        minHeight: '100vh',
        backgroundColor: isDark ? '#0B1120' : '#F4F6FA',
        position: 'relative',
        // Subtle noise texture via CSS
        '&::before': {
          content: '""',
          position: 'fixed',
          inset: 0,
          backgroundImage: isDark
            ? 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(139,92,246,0.06) 0%, transparent 50%)'
            : 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, rgba(139,92,246,0.03) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0,
        },
      }}
    >
      {/* System Watermark */}
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
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: `calc(100% - ${currentSidebarWidth}px)`,
          transition: 'all 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <ProHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={handleToggleMobile}
          themeMode={themeMode}
          onToggleTheme={toggleTheme}
        />

        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            pt: `${(theme.custom?.header?.height || 64) + 20}px`,
            px: { xs: 2, sm: 3, md: 3.5 },
            pb: 4,
            overflow: 'auto',
            // Subtle scrollbar styling
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 3,
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)',
              '&:hover': { background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.35)' },
            },
          }}
        >
          <Suspense fallback={<DashboardSkeleton />}>
            <RouteErrorBoundary locationKey={location.key}>
              <Fade key={location.pathname} in timeout={280}>
                <Box
                  sx={{
                    width: '100%',
                    animation: 'contentSlideIn 0.3s ease',
                    '@keyframes contentSlideIn': {
                      from: { opacity: 0, transform: 'translateY(8px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                  }}
                >
                  <Outlet />
                </Box>
              </Fade>
            </RouteErrorBoundary>
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
};

export default ProLayout;
