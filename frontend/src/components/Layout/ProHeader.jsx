/**
 * ProHeader — الهيدر الاحترافي المحسّن
 *
 * Premium glassmorphism header with:
 * - Refined glassmorphism effect
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
  success: { bg: '#ECFDF5', ring: '#10B981' },
  warning: { bg: '#FFFBEB', ring: '#F59E0B' },
  info:    { bg: '#F0F9FF', ring: '#0EA5E9' },
};

// ─── Icon Button محسّن ────────────────────────────────────────────────────────
function HeaderIconBtn({ children, tooltip, onClick, sx = {}, badgeContent, ...rest }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Tooltip title={tooltip} arrow>
      <IconButton
        size="small"
        onClick={onClick}
        {...rest}
        sx={{
          width: 38,
          height: 38,
          borderRadius: '10px',
          color: isDark ? 'rgba(255,255,255,0.65)' : '#64748B',
          transition: 'all 0.2s ease',
          '&:hover': {
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : alpha('#6366F1', 0.08),
            color: isDark ? '#FFFFFF' : '#6366F1',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
          ...sx,
        }}
      >
        {badgeContent !== undefined ? (
          <Badge
            badgeContent={badgeContent}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.6rem',
                minWidth: 17,
                height: 17,
                top: 1,
                right: 1,
                boxShadow: '0 0 0 2px ' + (isDark ? '#0F172A' : '#FFFFFF'),
              },
            }}
          >
            {children}
          </Badge>
        ) : children}
      </IconButton>
    </Tooltip>
  );
}

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
          ? 'rgba(10, 15, 30, 0.88)'
          : 'rgba(255, 255, 255, 0.88)',
        backdropFilter: 'blur(20px) saturate(200%)',
        WebkitBackdropFilter: 'blur(20px) saturate(200%)',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)'}`,
        boxShadow: isDark
          ? '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)'
          : '0 1px 0 rgba(99,102,241,0.06), 0 4px 24px rgba(99,102,241,0.06)',
        color: isDark ? '#FFFFFF' : 'text.primary',
        transition: theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}
    >
      {/* Accent line at top */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 50%, #0EA5E9 100%)',
          opacity: 0.7,
        }}
      />

      <Toolbar
        sx={{
          height: HEADER_HEIGHT,
          minHeight: `${HEADER_HEIGHT}px !important`,
          px: { xs: 1.5, md: 3 },
          gap: 0.5,
          pt: '2px',
        }}
      >
        {/* ── Mobile menu button ──────────────────────────────────────────── */}
        {isMobile && (
          <HeaderIconBtn tooltip="القائمة" onClick={onToggleSidebar} sx={{ marginInlineEnd: 1 }}>
            <MenuIcon sx={{ fontSize: 20 }} />
          </HeaderIconBtn>
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
            <Tooltip title="الرئيسية" arrow>
              <IconButton
                size="small"
                onClick={() => navigate('/dashboard')}
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: '8px',
                  color: crumbs.length === 0 ? '#6366F1' : (isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8'),
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: alpha('#6366F1', 0.08),
                    color: '#6366F1',
                  },
                }}
              >
                <HomeIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>

            {crumbs.map((crumb) => (
              <Box key={crumb.path} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <NavigateNext
                  sx={{
                    fontSize: 14,
                    color: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
                    transform: 'scaleX(-1)',
                  }}
                />
                <Typography
                  component={crumb.isLast ? 'span' : 'button'}
                  onClick={!crumb.isLast ? () => navigate(crumb.path) : undefined}
                  sx={{
                    fontSize: '0.8125rem',
                    fontWeight: crumb.isLast ? 600 : 400,
                    color: crumb.isLast
                      ? (isDark ? '#F1F5F9' : '#1E293B')
                      : (isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8'),
                    cursor: crumb.isLast ? 'default' : 'pointer',
                    background: 'none',
                    border: 'none',
                    fontFamily: 'inherit',
                    p: 0,
                    px: crumb.isLast ? '6px' : '4px',
                    py: '2px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    '&:hover': !crumb.isLast ? {
                      color: '#6366F1',
                      backgroundColor: alpha('#6366F1', 0.06),
                    } : {},
                    transition: 'all 0.15s',
                    maxWidth: 140,
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
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '8px',
                  backgroundColor: alpha('#6366F1', 0.08),
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    backgroundColor: '#6366F1',
                  }}
                />
                <Typography variant="body2" sx={{ color: '#6366F1', fontWeight: 600, fontSize: '0.8125rem' }}>
                  لوحة القيادة
                </Typography>
              </Box>
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
                backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : alpha('#6366F1', 0.05),
                borderRadius: '12px',
                border: `1.5px solid ${alpha('#6366F1', 0.35)}`,
                px: 1.5,
                gap: 1,
                height: 42,
                boxShadow: `0 0 0 4px ${alpha('#6366F1', 0.08)}`,
                transition: 'all 0.2s',
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: '#6366F1', flexShrink: 0 }} />
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
                  '& input': { padding: 0, color: isDark ? '#F1F5F9' : '#1E293B' },
                }}
              />
              <IconButton
                size="small"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                sx={{
                  p: 0.5,
                  borderRadius: '6px',
                  color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8',
                  '&:hover': { backgroundColor: alpha('#6366F1', 0.1), color: '#6366F1' },
                }}
              >
                <CloseOutlined sx={{ fontSize: 15 }} />
              </IconButton>
            </Box>
          </Fade>
        )}

        <Box sx={{ flexGrow: 1 }} />

        {/* ── Action buttons ───────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>

          {/* Search trigger */}
          {!searchOpen && (
            <Tooltip title="بحث (Ctrl+K)" arrow>
              <Box
                onClick={() => setSearchOpen(true)}
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'pointer',
                  px: 1.25,
                  py: 0.75,
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                  color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8',
                  fontSize: '0.8125rem',
                  transition: 'all 0.2s',
                  height: 36,
                  '&:hover': {
                    backgroundColor: alpha('#6366F1', 0.06),
                    borderColor: alpha('#6366F1', 0.3),
                    color: '#6366F1',
                  },
                }}
              >
                <SearchIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: '0.8rem', color: 'inherit', display: { md: 'block', xs: 'none' } }}>
                  بحث...
                </Typography>
                <Box
                  sx={{
                    display: { lg: 'flex', xs: 'none' },
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.2,
                    borderRadius: '5px',
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
                    fontSize: '0.6rem',
                    fontFamily: 'monospace',
                    color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8',
                    lineHeight: 1.4,
                  }}
                >
                  ⌘K
                </Box>
              </Box>
            </Tooltip>
          )}

          {/* Language toggle */}
          <HeaderIconBtn tooltip="تغيير اللغة" onClick={() => setLang((l) => (l === 'ar' ? 'en' : 'ar'))}>
            <LanguageOutlined sx={{ fontSize: 19 }} />
          </HeaderIconBtn>

          {/* Theme toggle */}
          <HeaderIconBtn
            tooltip={isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            onClick={onToggleTheme}
            sx={isDark ? { '&:hover': { color: '#F59E0B !important' } } : {}}
          >
            {isDark ? (
              <LightModeOutlined sx={{ fontSize: 19, color: '#F59E0B' }} />
            ) : (
              <DarkModeOutlined sx={{ fontSize: 19 }} />
            )}
          </HeaderIconBtn>

          {/* Fullscreen */}
          <HeaderIconBtn
            tooltip={fullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
            onClick={handleToggleFullscreen}
            sx={{ display: { xs: 'none', md: 'flex' } }}
          >
            {fullscreen ? (
              <FullscreenExitOutlined sx={{ fontSize: 19 }} />
            ) : (
              <FullscreenOutlined sx={{ fontSize: 19 }} />
            )}
          </HeaderIconBtn>

          {/* Notifications */}
          <HeaderIconBtn
            tooltip="الإشعارات"
            onClick={(e) => setNotifAnchor(e.currentTarget)}
            badgeContent={unreadCount || undefined}
          >
            <NotificationsOutlined sx={{ fontSize: 19 }} />
          </HeaderIconBtn>

          {/* Divider */}
          <Box
            sx={{
              width: '1px',
              height: 28,
              background: isDark
                ? 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)'
                : 'linear-gradient(180deg, transparent, #E2E8F0, transparent)',
              mx: 0.75,
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
              borderRadius: '12px',
              border: `1px solid transparent`,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : alpha('#6366F1', 0.05),
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : alpha('#6366F1', 0.15),
                '& .user-arrow': { transform: userAnchor ? 'rotate(180deg)' : 'rotate(0deg) translateY(-1px)' },
              },
            }}
          >
            <Avatar
              sx={{
                width: 33,
                height: 33,
                fontSize: '0.875rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                border: '2px solid rgba(255,255,255,0.9)',
              }}
            >
              {avatarLetter}
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right', minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: isDark ? '#F1F5F9' : '#1E293B',
                  maxWidth: 110,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8',
                  lineHeight: 1.2,
                }}
              >
                {displayRole}
              </Typography>
            </Box>
            <KeyboardArrowDown
              className="user-arrow"
              sx={{
                fontSize: 15,
                color: isDark ? 'rgba(255,255,255,0.35)' : '#CBD5E1',
                display: { xs: 'none', md: 'block' },
                transition: 'transform 0.2s ease',
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
        TransitionComponent={Fade}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              width: 370,
              maxHeight: 500,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              mt: 1.5,
              borderRadius: '16px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.1)'}`,
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.5)'
                : '0 20px 60px rgba(99,102,241,0.12), 0 4px 16px rgba(0,0,0,0.06)',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)'}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
              }}
            >
              <NotificationsOutlined sx={{ fontSize: 18, color: '#FFFFFF' }} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                الإشعارات
              </Typography>
              {unreadCount > 0 && (
                <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>
                  {unreadCount} إشعار جديد
                </Typography>
              )}
            </Box>
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              sx={{
                fontSize: '0.75rem',
                px: 1.25,
                py: 0.5,
                borderRadius: '8px',
                color: '#6366F1',
                fontWeight: 600,
                '&:hover': { backgroundColor: alpha('#6366F1', 0.08) },
              }}
            >
              تحديد الكل
            </Button>
          )}
        </Box>

        {/* List */}
        <List sx={{ overflow: 'auto', py: 1, flex: 1 }}>
          {notifs.map((n, idx) => (
            <ListItem
              key={n.id}
              alignItems="flex-start"
              onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, read: true } : x))}
              sx={{
                px: 2.5,
                py: 1.5,
                cursor: 'pointer',
                position: 'relative',
                backgroundColor: !n.read
                  ? isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.03)'
                  : 'transparent',
                borderBottom: idx < notifs.length - 1
                  ? `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}`
                  : 'none',
                transition: 'background-color 0.15s',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC',
                },
              }}
            >
              {/* Unread indicator */}
              {!n.read && (
                <Box
                  sx={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: '#6366F1',
                    boxShadow: '0 0 6px rgba(99,102,241,0.5)',
                  }}
                />
              )}
              <ListItemAvatar sx={{ minWidth: 46 }}>
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    backgroundColor: NOTIF_COLORS[n.type].bg,
                    border: `1.5px solid ${NOTIF_COLORS[n.type].ring}22`,
                  }}
                >
                  {NOTIF_ICONS[n.type]}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={n.read ? 400 : 600} sx={{ lineHeight: 1.4, fontSize: '0.8375rem' }}>
                    {n.title}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, lineHeight: 1.5 }}>
                      {n.body}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 0.5,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.4,
                        color: isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1',
                        fontSize: '0.68rem',
                      }}
                    >
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
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#F1F5F9'}`,
          }}
        >
          <Button
            size="small"
            fullWidth
            variant="outlined"
            onClick={() => { setNotifAnchor(null); navigate('/notifications'); }}
            sx={{
              fontSize: '0.8125rem',
              borderRadius: '10px',
              py: 0.75,
              borderColor: isDark ? 'rgba(99,102,241,0.3)' : alpha('#6366F1', 0.25),
              color: '#6366F1',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#6366F1',
                backgroundColor: alpha('#6366F1', 0.05),
              },
            }}
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
        TransitionComponent={Fade}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              width: 230,
              mt: 1.5,
              borderRadius: '16px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.1)'}`,
              boxShadow: isDark
                ? '0 20px 60px rgba(0,0,0,0.5)'
                : '0 20px 60px rgba(99,102,241,0.12), 0 4px 16px rgba(0,0,0,0.06)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* User info header */}
        <Box
          sx={{
            px: 2.5,
            py: 2,
            mb: 0.5,
            background: isDark
              ? 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 100%)'
              : 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.04) 100%)',
            borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.08)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar
            sx={{
              width: 42,
              height: 42,
              fontSize: '1rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              border: '2px solid rgba(255,255,255,0.9)',
            }}
          >
            {avatarLetter}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{displayName}</Typography>
            <Chip
              label={displayRole}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 600,
                backgroundColor: alpha('#6366F1', 0.1),
                color: '#6366F1',
                border: `1px solid ${alpha('#6366F1', 0.2)}`,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Box>
        </Box>

        <MenuItem
          onClick={() => { setUserAnchor(null); navigate('/profile'); }}
          sx={{ mx: 1, borderRadius: '8px', mb: 0.25, px: 1.5 }}
        >
          <AccountCircleOutlined sx={{ fontSize: 17, marginInlineEnd: 1.5, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }} />
          <Typography variant="body2">الملف الشخصي</Typography>
        </MenuItem>

        <MenuItem
          onClick={() => { setUserAnchor(null); navigate('/settings'); }}
          sx={{ mx: 1, borderRadius: '8px', mb: 0.5, px: 1.5 }}
        >
          <SettingsOutlined sx={{ fontSize: 17, marginInlineEnd: 1.5, color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }} />
          <Typography variant="body2">الإعدادات</Typography>
        </MenuItem>

        <Divider sx={{ mx: 1 }} />

        <MenuItem
          onClick={handleLogout}
          sx={{
            mx: 1,
            mt: 0.5,
            mb: 1,
            borderRadius: '8px',
            px: 1.5,
            color: '#F43F5E',
            '&:hover': { backgroundColor: alpha('#F43F5E', 0.07) },
          }}
        >
          <LogoutOutlined sx={{ fontSize: 17, marginInlineEnd: 1.5 }} />
          <Typography variant="body2" fontWeight={600}>تسجيل الخروج</Typography>
        </MenuItem>
      </Menu>
    </AppBar>
  );
}
