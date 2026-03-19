/**
 * Professional Header — AlAwael ERP
 * شريط علوي احترافي مع إشعارات وبحث وقائمة المستخدم
 *
 * Features:
 * - Glassmorphism AppBar
 * - Breadcrumb navigation
 * - Global search bar
 * - Notification dropdown with real-time updates
 * - User avatar menu
 * - Theme toggle (dark/light)
 * - Language toggle (AR/EN)
 * - Responsive design
 */

import { useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
  InputBase,
  Tooltip,
  Chip,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  useTheme,
  useMediaQuery,
  alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Language as LanguageIcon,
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Circle as CircleIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeMode } from '../../contexts/ThemeContext';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED } from './sidebar';

// ─── Breadcrumb Map ──────────────────────────────────────────────────────────
const BREADCRUMB_MAP = {
  dashboard: 'لوحة التحكم',
  beneficiaries: 'المستفيدون',
  hr: 'الموارد البشرية',
  payroll: 'الرواتب',
  incentives: 'الحوافز',
  compensation: 'هيكل التعويضات',
  analytics: 'التحليلات',
  finance: 'المالية',
  rehab: 'إعادة التأهيل',
  sessions: 'الجلسات',
  messages: 'الرسائل',
  documents: 'المستندات',
  reports: 'التقارير',
  settings: 'الإعدادات',
  profile: 'الملف الشخصي',
  'admin-portal': 'لوحة الإدارة',
  users: 'المستخدمون',
  security: 'الأمان',
  monitoring: 'المراقبة',
  projects: 'المشاريع',
  lms: 'التعليم الإلكتروني',
  'student-portal': 'بوابة الطالب',
  'therapist-portal': 'بوابة المعالج',
  'parent-portal': 'بوابة ولي الأمر',
  organization: 'الهيكل التنظيمي',
  'integrated-care': 'الرعاية المتكاملة',
  'assessment-scales': 'مقاييس التقييم',
  'assessment-tests': 'اختبارات التقييم',
  'ai-analytics': 'التحليلات الذكية',
  'smart-documents': 'المستندات الذكية',
  archiving: 'الأرشفة',
  'export-import': 'تصدير واستيراد',
  'communications-system': 'نظام التواصل',
  'audit-logs': 'سجل المراجعة',
  advanced: 'متقدم',
};

// ─── Header Component ────────────────────────────────────────────────────────
const ProHeader = ({ sidebarCollapsed, onToggleSidebar }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser, logout } = useAuth();
  const themeMode = useThemeMode?.() || {};
  const { mode, toggleMode } = themeMode;

  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchRef = useRef(null);

  // Mock notifications – in production these come from NotificationContext
  const notifications = [
    { id: 1, title: 'طلب إجازة جديد', body: 'أحمد محمد قدم طلب إجازة', time: 'منذ 5 دقائق', read: false, type: 'info' },
    { id: 2, title: 'تنبيه مالي', body: 'تم تجاوز الميزانية المحددة', time: 'منذ 30 دقيقة', read: false, type: 'warning' },
    { id: 3, title: 'جلسة قادمة', body: 'جلسة علاج طبيعي الساعة 2:00', time: 'منذ ساعة', read: true, type: 'event' },
  ];
  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── Breadcrumbs ─────────────────────────────────────────────────────────
  const breadcrumbs = (() => {
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length === 0) return [{ label: 'لوحة التحكم', path: '/dashboard' }];
    return parts.map((part, i) => ({
      label: BREADCRUMB_MAP[part] || part,
      path: '/' + parts.slice(0, i + 1).join('/'),
      isLast: i === parts.length - 1,
    }));
  })();

  // ─── Fullscreen Toggle ──────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleLogout = () => {
    setUserMenuAnchor(null);
    logout?.();
    navigate('/login');
  };

  const headerWidth = isMobile
    ? '100%'
    : `calc(100% - ${sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH}px)`;

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: headerWidth,
        left: 0,
        right: 'auto',
        transition: theme.custom?.transition?.medium || 'all 0.3s ease',
        zIndex: theme.zIndex.drawer + 1,
        backdropFilter: 'blur(12px)',
        backgroundColor: alpha(theme.palette.background.paper, 0.85),
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: theme.custom?.header?.height || 64 }}>
        {/* Mobile Menu Toggle */}
        {isMobile && (
          <IconButton onClick={onToggleSidebar} edge="start" color="inherit" aria-label="تبديل القائمة">
            <MenuIcon />
          </IconButton>
        )}

        {/* Breadcrumbs */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon sx={{ fontSize: 16, transform: 'rotate(180deg)' }} />}
            sx={{ '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}
          >
            <MuiLink
              underline="hover"
              color="inherit"
              onClick={() => navigate('/dashboard')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                cursor: 'pointer',
                fontSize: '0.8125rem',
              }}
            >
              <HomeIcon sx={{ fontSize: 16 }} />
              الرئيسية
            </MuiLink>
            {breadcrumbs.map((crumb) =>
              crumb.isLast ? (
                <Typography
                  key={crumb.path}
                  variant="body2"
                  color="text.primary"
                  fontWeight={600}
                  noWrap
                >
                  {crumb.label}
                </Typography>
              ) : (
                <MuiLink
                  key={crumb.path}
                  underline="hover"
                  color="inherit"
                  onClick={() => navigate(crumb.path)}
                  sx={{ cursor: 'pointer', fontSize: '0.8125rem' }}
                >
                  {crumb.label}
                </MuiLink>
              )
            )}
          </Breadcrumbs>
        </Box>

        {/* Search */}
        <Box
          sx={{
            display: { xs: 'none', sm: 'flex' },
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: '10px',
            backgroundColor: searchFocused
              ? alpha(theme.palette.primary.main, 0.06)
              : theme.palette.action.hover,
            border: `1px solid ${searchFocused ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
            transition: 'all 0.2s ease',
            width: searchFocused ? 280 : 200,
          }}
        >
          <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <InputBase
            ref={searchRef}
            placeholder="بحث..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            sx={{ flex: 1, fontSize: '0.8125rem' }}
          />
          <Chip
            label="⌘K"
            size="small"
            variant="outlined"
            sx={{ height: 20, fontSize: '0.65rem', display: searchFocused ? 'none' : 'flex' }}
          />
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Fullscreen */}
          <Tooltip title={isFullscreen ? 'إلغاء ملء الشاشة' : 'ملء الشاشة'}>
            <IconButton size="small" color="inherit" onClick={toggleFullscreen} sx={{ display: { xs: 'none', md: 'flex' } }} aria-label="ملء الشاشة">
              {isFullscreen ? <FullscreenExitIcon sx={{ fontSize: 20 }} /> : <FullscreenIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>

          {/* Theme Toggle */}
          <Tooltip title={mode === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}>
            <IconButton size="small" color="inherit" onClick={toggleMode} aria-label="تبديل الوضع">
              {mode === 'dark' ? <LightModeIcon sx={{ fontSize: 20 }} /> : <DarkModeIcon sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>

          {/* Language */}
          <Tooltip title="تغيير اللغة">
            <IconButton size="small" color="inherit" aria-label="تغيير اللغة">
              <LanguageIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="الإشعارات">
            <IconButton
              size="small"
              color="inherit"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              aria-label="الإشعارات"
            >
              <Badge badgeContent={unreadCount} color="error" variant={unreadCount > 0 ? 'standard' : 'dot'}>
                <NotificationsIcon sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Avatar */}
          <IconButton
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{ p: 0, ml: 0.5 }}
            aria-label="حساب المستخدم"
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                fontSize: '0.8125rem',
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              }}
            >
              {currentUser?.name?.[0] || currentUser?.email?.[0] || 'م'}
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>

      {/* ─── Notification Popover ─────────────────────────────────────────── */}
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        sx={{
          '& .MuiPaper-root': {
            width: 360,
            maxHeight: 460,
            borderRadius: '12px',
            mt: 1,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            الإشعارات
          </Typography>
          <Chip label={`${unreadCount} جديد`} color="primary" size="small" />
        </Box>
        <Divider />
        <List disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
          {notifications.map((notif) => (
            <ListItem
              key={notif.id}
              alignItems="flex-start"
              sx={{
                cursor: 'pointer',
                backgroundColor: notif.read ? 'transparent' : alpha(theme.palette.primary.main, 0.04),
                '&:hover': { backgroundColor: theme.palette.action.hover },
              }}
            >
              <ListItemAvatar>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor:
                      notif.type === 'warning'
                        ? alpha(theme.palette.warning.main, 0.12)
                        : notif.type === 'event'
                        ? alpha(theme.palette.info.main, 0.12)
                        : alpha(theme.palette.primary.main, 0.12),
                    color:
                      notif.type === 'warning'
                        ? theme.palette.warning.main
                        : notif.type === 'event'
                        ? theme.palette.info.main
                        : theme.palette.primary.main,
                  }}
                >
                  <NotificationsIcon sx={{ fontSize: 18 }} />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {!notif.read && <CircleIcon sx={{ fontSize: 6, color: 'primary.main' }} />}
                    <Typography variant="body2" fontWeight={notif.read ? 400 : 600} noWrap>
                      {notif.title}
                    </Typography>
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="caption" color="text.secondary" component="span">
                      {notif.body}
                    </Typography>
                    <br />
                    <Typography variant="caption" color="text.disabled" component="span">
                      {notif.time}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <MuiLink
            onClick={() => { setNotifAnchor(null); navigate('/smart-notifications'); }}
            sx={{ cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}
          >
            عرض جميع الإشعارات
          </MuiLink>
        </Box>
      </Popover>

      {/* ─── User Menu ─────────────────────────────────────────────────────── */}
      <Menu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        transformOrigin={{ horizontal: 'left', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 220, borderRadius: '12px', mt: 1, boxShadow: theme.shadows[8] },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {currentUser?.name || 'المستخدم'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {currentUser?.email || ''}
          </Typography>
        </Box>
        <Divider sx={{ mb: 0.5 }} />
        <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/profile'); }}>
          <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
          <ListItemText>الملف الشخصي</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/profile'); }}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>الإعدادات</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>تسجيل الخروج</ListItemText>
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default ProHeader;
