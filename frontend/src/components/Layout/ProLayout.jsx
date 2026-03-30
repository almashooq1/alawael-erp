/**
 * Professional Layout — AlAwael ERP
 * تخطيط احترافي يجمع القائمة الجانبية والشريط العلوي ومنطقة المحتوى
 *
 * Features:
 * - Combines ProSidebar + ProHeader + Content area
 * - Sidebar collapse state persisted in localStorage
 * - Responsive: overlay drawer on mobile, pinned on desktop
 * - Smooth animations on all layout changes
 * - RTL-aware (sidebar on right side)
 */

import { useState, useEffect, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, useTheme, useMediaQuery, Fade } from '@mui/material';
import ProSidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './sidebar';
import ProHeader from './ProHeader';
import { DashboardSkeleton } from '../ui/LoadingSkeleton';
import RouteErrorBoundary from '../shared/RouteErrorBoundary';
import WatermarkBackground from '../shared/WatermarkBackground';
import { useThemeMode } from '../../contexts/ThemeContext';

const SIDEBAR_STATE_KEY = 'alawael-sidebar-collapsed';

const ProLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { toggleTheme, mode: themeMode } = useThemeMode();

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

  const handleToggleCollapse = () => setSidebarCollapsed((prev) => !prev);
  const handleToggleMobile = () => setMobileOpen((prev) => !prev);
  const handleCloseMobile = () => setMobileOpen(false);

  const currentSidebarWidth = isMobile
    ? 0
    : sidebarCollapsed
    ? SIDEBAR_COLLAPSED
    : SIDEBAR_WIDTH;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row', // RTL: first child (sidebar) naturally goes to the right
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
        position: 'relative',
      }}
    >
      {/* System Watermark */}
      <WatermarkBackground zIndex={0} />

      {/* Sidebar */}
      <ProSidebar
        open={mobileOpen}
        onClose={handleCloseMobile}
        collapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: `calc(100% - ${currentSidebarWidth}px)`,
          transition: theme.custom?.transition?.medium || 'all 0.3s ease',
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
            pt: `${(theme.custom?.header?.height || 64) + 16}px`,
            px: { xs: 2, sm: 3, md: 3.5 },
            pb: 3,
            overflow: 'auto',
          }}
        >
          <Suspense fallback={<DashboardSkeleton />}>
            <RouteErrorBoundary locationKey={location.key}>
              <Fade key={location.pathname} in timeout={300}>
                <Box sx={{ width: '100%' }}>
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
