/**
 * DDD Platform Layout — تخطيط منصة التأهيل الموحدة
 *
 * يجمع الشريط العلوي + القائمة الجانبية + المحتوى
 * يُستخدم كـ wrapper حول DDDRoutes
 */

import { useState } from 'react';
import { useMediaQuery, useTheme,
} from '@mui/material';




const DRAWER_WIDTH = 260;

export default function DDDPlatformLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      {/* ── Sidebar ── */}
      <DDDSidebar open={sidebarOpen} onToggle={toggleSidebar} />

      {/* ── Main Content ── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(sidebarOpen && !isMobile && {
            marginRight: `${DRAWER_WIDTH}px`,
            transition: theme.transitions.create('margin', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        {/* ── Top AppBar ── */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar variant="dense" sx={{ gap: 1 }}>
            <IconButton edge="start" onClick={toggleSidebar}>
              <MenuIcon />
            </IconButton>

            <DashIcon color="primary" />
            <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
              منصة التأهيل الموحدة
            </Typography>

            <Chip
              size="small"
              label="v2.0 DDD"
              color="primary"
              variant="outlined"
              sx={{ fontSize: 10 }}
            />

            <Tooltip title="بحث"><IconButton size="small"><SearchIcon /></IconButton></Tooltip>
            <Tooltip title="الإشعارات">
              <IconButton size="small">
                <Badge badgeContent={3} color="error"><NotifIcon /></Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="ملء الشاشة">
              <IconButton size="small" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="الإعدادات"><IconButton size="small"><SettingsIcon /></IconButton></Tooltip>
          </Toolbar>
        </AppBar>

        {/* ── Page Content ── */}
        <Box sx={{ flex: 1, bgcolor: 'grey.50', overflow: 'auto' }}>
          {children || <Outlet />}
        </Box>
      </Box>
    </Box>
  );
}
