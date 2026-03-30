/**
 * ProHeader — الهيدر الاحترافي
 *
 * Premium glassmorphism header with:
 * - Breadcrumb navigation
 * - Global search (Cmd+K)
 * - Live notifications panel
 * - Language & theme toggles
 * - User avatar menu
 * - Mobile hamburger
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, IconButton, Avatar, Badge, Tooltip,
  Menu, MenuItem, Divider, Typography, InputBase, Popover,
  List, ListItem, ListItemAvatar, ListItemText, Chip, Button,
  useTheme, useMediaQuery, Fade, alpha,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  NotificationsOutlined,
  DarkModeOutlined,
  LightModeOutlined,
  LanguageOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  KeyboardArrowDown,
  AccountCircleOutlined,
  SettingsOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  WarningAmberOutlined,
  InfoOutlined,
  NavigateNext,
  Home as HomeIcon,
  CloseOutlined,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';

// ─── Static breadcrumb map ────────────────────────────────────────────────────
const routeLabels = {
  '/':              'الرئيسية',
  '/dashboard':     'لوحة القيادة',
  '/beneficiaries': 'المستفيدون',
  '/hr':            'الموارد البشرية',
  '/finance':       'المالية',
  '/rehab':         'التأهيل',
  '/documents':     'الوثائق',
  '/reports':       'التقارير',
  '/settings':      'الإعدادات',
  '/admin':         'إدارة النظام',
};

const getLabel = (seg) =>
  routeLabels[`/${seg}`] || seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Mock notifications ───────────────────────────────────────────────────────
const MOCK_NOTIFS = [
  {
    id: 1,
    type: 'success',
    title: 'تم قبول المستفيد',
    body: 'تم قبول طلب تسجيل أحمد المطيري بنجاح',
    time: 'منذ 5 دقائق',
    read: false,
  },
  {
    id: 2,
    type: 'warning',
    title: 'موعد قريب',
    body: 'جلسة تأهيل السيد خالد العمري بعد ساعة',
    time: 'منذ 20 دقيقة',
    read: false,
  },
  {
    id: 3,
    type: 'info',
    title: 'تقرير شهري جاهز',
    body: 'تم إنشاء تقرير إحصاءات مارس 2026',
    time: 'منذ ساعة',
    read: true,
  },
  {
    id: 4,
    type: 'success',
    title: 'راتب شهر مارس',
    body: 'تمت معالجة مسير الرواتب لـ 48 موظف',
    time: 'منذ 3 ساعات',
    read: true,
  },
];

const NOTIF_ICONS = {
  success: <CheckCircleOutlined sx={{ fontSize: 18, color: '#10B981' }} />,
  warning: <WarningAmberOutlined sx={{ fontSize: 18, color: '#F59E0B' }} />,
  info:    <InfoOutlined sx={{ fontSize: 18, color: '#0EA5E9' }} />,
};

const NOTIF_COLORS = {
  success: '#ECFDF5',
  warning: '#FFFBEB',
  info:    '#F0F9FF',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ProHeader({ onToggleSidebar, sidebarCollapsed, themeMode: _themeMode, onToggleTheme }) {
  const theme   = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth() || {};

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  // Notifications
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);
  const unreadCount = notifs.filter((n) => !n.read).length;

  // User menu
  const [userAnchor, setUserAnchor] = useState(null);

  // Fullscreen
  const [fullscreen, setFullscreen] = useState(false);

  // Language (demo)
  const [_lang, setLang] = useState('ar');

  // ── Breadcrumbs ─────────────────────────────────────────────────────────────
  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg, idx, arr) => ({
      label: getLabel(seg),
      path: '/' + arr.slice(0, idx + 1).join('/'),
      isLast: idx === arr.length - 1,
    }));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleMarkAllRead = useCallback(() => {
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setUserAnchor(null);
    try { await logout?.(); } catch (_) {}
    navigate('/login');
  }, [logout, navigate]);

  const displayName = currentUser?.name || currentUser?.username || 'مدير النظام';
  const displayRole = currentUser?.role || 'مدير';
  const avatarLetter = displayName.charAt(0) || 'م';

  const collapsed = sidebarCollapsed;
  const isDark = theme.palette.mode === 'dark';
  const sb = theme.custom?.sidebar || {};
  const HEADER_HEIGHT = theme.custom?.header?.height || 64;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${collapsed ? (sb.collapsedWidth || 72) : (sb.width || 280)}px)` },
        height: HEADER_HEIGHT,
        zIndex: theme.zIndex.appBar || 1100,
        background: isDark
          ? 'rgba(15, 23, 42, 0.85)'
          : 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        color: isDark ? '#FFFFFF' : 'text.primary',
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      <Toolbar
        sx={{
          height: HEADER_HEIGHT,
          minHeight: `${HEADER_HEIGHT}px !important`,
          px: { xs: 1.5, md: 3 },
          gap: 1,
        }}
      >
        {/* ── Mobile menu button ──────────────────────────────────────────── */}
        {isMobile && (
          <IconButton
            onClick={onToggleSidebar}
            size="small"
            sx={{
              color: isDark ? 'rgba(255,255,255,0.75)' : 'text.secondary',
            marginInlineEnd: 4,
          }}
        >
          <MenuIcon />
          </IconButton>
        )}

        {/* ── Breadcrumbs ─────────────────────────────────────────────────── */}
        {!searchOpen && (
          <Box
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              gap: 0.5,
              flex: 1,
              minWidth: 0,
            }}
          >
            {/* Home icon */}
            <Tooltip title="الرئيسية">
              <IconButton
                size="small"
                onClick={() => navigate('/dashboard')}
                sx={{
                  color: crumbs.length === 0 ? 'primary.main' : 'text.secondary',
                  p: 0.75,
                  '&:hover': { color: 'primary.main' },
                }}
              >
                <HomeIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {crumbs.map((crumb) => (
              <Box key={crumb.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <NavigateNext
                  sx={{
                    fontSize: 16,
                    color: 'text.disabled',
                    transform: 'scaleX(-1)', // RTL flip
                  }}
                />
                <Typography
                  component={crumb.isLast ? 'span' : 'button'}
                  onClick={!crumb.isLast ? () => navigate(crumb.path) : undefined}
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: crumb.isLast ? 600 : 400,
                    color: crumb.isLast ? 'text.primary' : 'text.secondary',
                    cursor: crumb.isLast ? 'default' : 'pointer',
                    background: 'none',
                    border: 'none',
                    fontFamily: 'inherit',
                    p: 0,
                    textDecoration: 'none',
                    '&:hover': !crumb.isLast ? { color: 'primary.main' } : {},
                    transition: 'color 0.15s',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {crumb.label}
                </Typography>
              </Box>
            ))}

            {crumbs.length === 0 && (
              <Typography variant="body2" color="text.primary" fontWeight={600}>
                لوحة القيادة
              </Typography>
            )}
          </Box>
        )}

        {/* ── Search bar (expanded) ────────────────────────────────────────── */}
        {searchOpen && (
          <Fade in={searchOpen}>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : alpha('#6366F1', 0.06),
                borderRadius: 2,
                border: `1.5px solid ${alpha('#6366F1', 0.4)}`,
                px: 1.5,
                gap: 1,
                height: 40,
                boxShadow: `0 0 0 3px ${alpha('#6366F1', 0.12)}`,
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <InputBase
                autoFocus
                ref={searchRef}
                placeholder="ابحث في النظام... (اضغط ESC للإغلاق)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
                sx={{
                  flex: 1,
                  fontSize: '0.875rem',
                  '& input': { padding: 0 },
                }}
              />
              <IconButton size="small" onClick={() => { setSearchOpen(false); setSearchQuery(''); }} sx={{ p: 0.5 }}>
                <CloseOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Fade>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>

          {/* Search trigger */}
          {!searchOpen && (
            <Tooltip title="بحث (Ctrl+K)">
              <IconButton
                size="small"
                onClick={() => setSearchOpen(true)}
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  color: 'text.secondary',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.5,
                  gap: 0.75,
                  height: 34,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  '&:hover': { color: 'primary.main', borderColor: 'primary.light' },
                }}
              >
                <SearchIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontSize: '0.75rem', color: 'inherit', display: { md: 'block', xs: 'none' } }}>
                  بحث...
                </Typography>
                <Chip
                  label="⌘K"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    fontFamily: 'mono',
                    display: { lg: 'flex', xs: 'none' },
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    color: 'text.secondary',
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          {/* Language toggle */}
          <Tooltip title="تغيير اللغة">
            <IconButton
              size="small"
              onClick={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
                width: 36,
                height: 36,
              }}
            >
              <LanguageOutlined sx={{ fontSize: 20 }} />
            </IconButton>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}>
            <IconButton
              size="small"
              onClick={onToggleTheme}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: isDark ? '#F59E0B' : 'primary.main' },
                width: 36,
                height: 36,
              }}
            >
              {isDark ? (
                <LightModeOutlined sx={{ fontSize: 20, color: '#F59E0B' }} />
              ) : (
                <DarkModeOutlined sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Fullscreen */}
          <Tooltip title={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}>
            <IconButton
              size="small"
              onClick={handleToggleFullscreen}
              sx={{
                display: { xs: 'none', md: 'flex' },
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
                width: 36,
                height: 36,
              }}
            >
              {fullscreen ? (
                <FullscreenExitOutlined sx={{ fontSize: 20 }} />
              ) : (
                <FullscreenOutlined sx={{ fontSize: 20 }} />
              )}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="الإشعارات">
            <IconButton
              size="small"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
                width: 36,
                height: 36,
              }}
            >
              <Badge
                badgeContent={unreadCount}
                color="error"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16,
                    top: 2,
                    right: 2,
                  },
                }}
              >
                <NotificationsOutlined sx={{ fontSize: 20 }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Divider */}
          <Box
            sx={{
              width: '1px',
              height: 24,
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              mx: 0.5,
            }}
          />

          {/* User menu trigger */}
          <Box
            onClick={(e) => setUserAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              px: 1,
              py: 0.5,
              borderRadius: 2,
              border: `1px solid transparent`,
              transition: 'all 0.15s',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : alpha('#6366F1', 0.06),
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.875rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              }}
            >
              {avatarLetter}
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right' }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2, color: 'text.primary' }}>
                {displayName}
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', lineHeight: 1.2 }}>
                {displayRole}
              </Typography>
            </Box>
            <KeyboardArrowDown
              sx={{
                fontSize: 16,
                color: 'text.secondary',
                display: { xs: 'none', md: 'block' },
                transition: 'transform 0.2s',
                transform: userAnchor ? 'rotate(180deg)' : 'none',
              }}
            />
          </Box>
        </Box>
      </Toolbar>

      {/* ── Notifications Popover ──────────────────────────────────────────── */}
      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: 360,
              maxHeight: 480,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              mt: 1,
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              الإشعارات
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount}
                size="small"
                color="error"
                sx={{ height: 18, fontSize: '0.65rem', minWidth: 24 }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              sx={{ fontSize: '0.75rem', p: 0.5, minWidth: 'auto' }}
            >
              تحديد الكل كمقروء
            </Button>
          )}
        </Box>

        {/* List */}
        <List sx={{ overflow: 'auto', py: 0.5, flex: 1 }}>
          {notifs.map((n) => (
            <ListItem
              key={n.id}
              alignItems="flex-start"
              onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
              sx={{
                px: 2,
                py: 1.25,
                cursor: 'pointer',
                backgroundColor: !n.read
                  ? isDark ? 'rgba(99,102,241,0.07)' : alpha('#6366F1', 0.04)
                  : 'transparent',
              borderInlineStart: !n.read ? `3px solid #6366F1` : '3px solid transparent',
                transition: 'background-color 0.15s',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
                },
              }}
            >
              <ListItemAvatar sx={{ minWidth: 40 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : NOTIF_COLORS[n.type],
                  }}
                >
                  {NOTIF_ICONS[n.type]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={n.read ? 400 : 600} sx={{ lineHeight: 1.4 }}>
                    {n.title}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {n.body}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
                      {n.time}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        {/* Footer */}
        <Box
          sx={{
            px: 2,
            py: 1.25,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9'}`,
            textAlign: 'center',
          }}
        >
          <Button
            size="small"
            fullWidth
            onClick={() => { setNotifAnchor(null); navigate('/notifications'); }}
            sx={{ fontSize: '0.8125rem', color: 'primary.main' }}
          >
            عرض كل الإشعارات
          </Button>
        </Box>
      </Popover>

      {/* ── User Menu ─────────────────────────────────────────────────────── */}
      <Menu
        anchorEl={userAnchor}
        open={Boolean(userAnchor)}
        onClose={() => setUserAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 220, mt: 1 } } }}
      >
        {/* User info */}
        <Box sx={{ px: 2, py: 1.5, mb: 0.5 }}>
          <Typography variant="subtitle2" fontWeight={700}>{displayName}</Typography>
          <Typography variant="caption" color="text.secondary">{displayRole}</Typography>
        </Box>

        <Divider sx={{ mb: 0.5 }} />

        <MenuItem onClick={() => { setUserAnchor(null); navigate('/profile'); }}>
          <AccountCircleOutlined sx={{ fontSize: 18, marginInlineEnd: 12, color: 'text.secondary' }} />
          <Typography variant="body2">الملف الشخصي</Typography>
        </MenuItem>

        <MenuItem onClick={() => { setUserAnchor(null); navigate('/settings'); }}>
          <SettingsOutlined sx={{ fontSize: 18, marginInlineEnd: 12, color: 'text.secondary' }} />
          <Typography variant="body2">الإعدادات</Typography>
        </MenuItem>

        <Divider sx={{ my: 0.5 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{ color: 'error.main', '&:hover': { backgroundColor: alpha('#F43F5E', 0.06) } }}
        >
          <LogoutOutlined sx={{ fontSize: 18, marginInlineEnd: 12 }} />
          <Typography variant="body2" fontWeight={500}>تسجيل الخروج</Typography>
        </MenuItem>
      </Menu>
    </AppBar>
  );
}
