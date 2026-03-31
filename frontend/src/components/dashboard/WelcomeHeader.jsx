/**
 * 🌟 WelcomeHeader v5 — Premium Professional Dashboard Header
 * ترويسة ترحيبية بريميوم مع glassmorphism + gradient + micro-animations
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  useTheme,
  Badge,
  Popper,
  Grow,
  ClickAwayListener,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircleIcon from '@mui/icons-material/Circle';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import GetAppIcon from '@mui/icons-material/GetApp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CachedIcon from '@mui/icons-material/Cached';
import WbSunnyRoundedIcon from '@mui/icons-material/WbSunnyRounded';
import NightsStayRoundedIcon from '@mui/icons-material/NightsStayRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import { formatCurrency, formatNumber, getGreeting, getArabicDate } from 'services/dashboardService';
import { statusColors } from '../../theme/palette';

/* ─────────────────────────────────────────────────────────── */
/*  Mini Stat Card                                             */
/* ─────────────────────────────────────────────────────────── */
const MINI_STAT_COLORS = [
  { grad: 'linear-gradient(135deg,#667eea,#764ba2)', glow: '#667eea' },
  { grad: 'linear-gradient(135deg,#43cea2,#185a9d)', glow: '#43cea2' },
  { grad: 'linear-gradient(135deg,#f093fb,#f5576c)', glow: '#f093fb' },
  { grad: 'linear-gradient(135deg,#4facfe,#00f2fe)', glow: '#4facfe' },
];

const MiniStat = React.memo(({ icon, label, value, colorIdx = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const c = MINI_STAT_COLORS[colorIdx % MINI_STAT_COLORS.length];

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          px: 1.8,
          py: 1,
          borderRadius: '14px',
          background: isDark
            ? 'rgba(255,255,255,0.04)'
            : 'rgba(255,255,255,0.7)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          boxShadow: isDark
            ? `0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)`
            : `0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)`,
          minWidth: 110,
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0,
            width: '3px',
            height: '100%',
            background: c.grad,
            borderRadius: '0 0 0 14px',
          },
        }}
      >
        {/* Icon */}
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '10px',
            background: c.grad,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${c.glow}40`,
            flexShrink: 0,
            '& svg': { fontSize: 16, color: 'white' },
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography
            variant="caption"
            sx={{ fontSize: '0.62rem', color: 'text.secondary', display: 'block', lineHeight: 1.3 }}
          >
            {label}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 800,
              fontSize: '0.95rem',
              lineHeight: 1.2,
              background: c.grad,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {formatNumber(value)}
          </Typography>
        </Box>
      </Box>
    </motion.div>
  );
});

/* ─────────────────────────────────────────────────────────── */
/*  Control Button                                             */
/* ─────────────────────────────────────────────────────────── */
const CtrlBtn = ({ children, onClick, tooltip, color = '#667eea', active = false, size = 'small', ...rest }) => (
  <Tooltip title={tooltip} arrow>
    <IconButton
      onClick={onClick}
      size={size}
      {...rest}
      sx={{
        width: 36,
        height: 36,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: active ? `${color}40` : 'rgba(128,128,128,0.15)',
        background: active ? `${color}18` : 'rgba(128,128,128,0.06)',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': {
          borderColor: `${color}50`,
          background: `${color}20`,
          transform: 'translateY(-1px)',
          boxShadow: `0 4px 12px ${color}30`,
        },
        '&:active': { transform: 'translateY(0)' },
        ...rest.sx,
      }}
    >
      {children}
    </IconButton>
  </Tooltip>
);

/* ─────────────────────────────────────────────────────────── */
/*  Main Component                                             */
/* ─────────────────────────────────────────────────────────── */
const WelcomeHeader = ({
  finance = {},
  alerts = [],
  lastUpdated,
  refreshing,
  onRefresh,
  kpis = {},
  onExport,
  onMarkAllRead,
  dataSource = 'api',
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const greeting = getGreeting();
  const dateStr = getArabicDate();
  const unreadAlerts = alerts.filter(a => !a.read).length;
  const userName = currentUser?.name || currentUser?.fullName || '';

  const bellRef = useRef(null);
  const [bellOpen, setBellOpen] = useState(false);
  const toggleBell = useCallback(() => setBellOpen(p => !p), []);
  const closeBell = useCallback(() => setBellOpen(false), []);

  const SEVERITY_MAP = {
    high:    { icon: <ErrorOutlineIcon fontSize="small" />,        color: statusColors.error   },
    medium:  { icon: <WarningAmberIcon fontSize="small" />,        color: statusColors.warning },
    low:     { icon: <InfoOutlinedIcon fontSize="small" />,        color: statusColors.info    },
    success: { icon: <CheckCircleOutlineIcon fontSize="small" />,  color: statusColors.success },
  };

  const handleExport = useCallback(() => {
    typeof onExport === 'function' ? onExport() : window.print();
  }, [onExport]);

  /* greeting icon */
  const hour = new Date().getHours();
  const GreetIcon = hour >= 6 && hour < 20 ? WbSunnyRoundedIcon : NightsStayRoundedIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: '20px',
          p: { xs: 2.5, md: 3 },
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          /* background */
          background: isDark
            ? 'linear-gradient(135deg, rgba(20,25,50,0.95) 0%, rgba(30,20,60,0.95) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(248,246,255,0.9) 100%)',
          backdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(102,126,234,0.18)' : 'rgba(102,126,234,0.12)',
          boxShadow: isDark
            ? '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 8px 40px rgba(102,126,234,0.1), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        {/* ── Top accent bar ─────────────────────────── */}
        <Box sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '3px',
          background: 'linear-gradient(90deg,#667eea,#764ba2,#f093fb,#4facfe)',
          backgroundSize: '200% auto',
          animation: 'shimmerBar 4s linear infinite',
          '@keyframes shimmerBar': {
            '0%': { backgroundPosition: '0% center' },
            '100%': { backgroundPosition: '200% center' },
          },
        }} />

        {/* ── Decorative orbs ───────────────────────── */}
        <Box sx={{
          position: 'absolute', top: -80, insetInlineEnd: -60,
          width: 260, height: 260, borderRadius: '50%',
          background: 'linear-gradient(135deg,#667eea,#764ba2)',
          opacity: isDark ? 0.07 : 0.05,
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -60, insetInlineStart: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'linear-gradient(135deg,#43cea2,#4facfe)',
          opacity: isDark ? 0.06 : 0.04,
          pointerEvents: 'none',
          filter: 'blur(40px)',
        }} />

        {/* ══════════════ Top Row ══════════════ */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 2,
          mb: 2.5,
          position: 'relative',
          zIndex: 1,
        }}>

          {/* ── Left: Title & greeting ─────────── */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
            {/* Avatar / greeting icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 15 }}
            >
              <Box sx={{
                width: 52, height: 52,
                borderRadius: '16px',
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(102,126,234,0.4)',
                flexShrink: 0,
              }}>
                <AutoAwesomeIcon sx={{ color: 'white', fontSize: 26 }} />
              </Box>
            </motion.div>

            <Box>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 900,
                    fontSize: 'clamp(1.3rem, 2.8vw, 1.9rem)',
                    background: 'linear-gradient(135deg,#667eea 0%,#764ba2 50%,#f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.3px',
                    mb: 0.4,
                    lineHeight: 1.2,
                  }}
                >
                  لوحة التحكم الرئيسية
                </Typography>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25, duration: 0.5 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  {/* Greeting text */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GreetIcon sx={{ fontSize: 16, color: hour >= 6 && hour < 20 ? '#FFB300' : '#7986cb' }} />
                    <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.82rem' }}>
                      {greeting}{userName ? ` ${userName}` : ''}! إليك نظرة شاملة على النظام
                    </Typography>
                  </Box>

                  {/* Date chip */}
                  <Chip
                    icon={<CalendarTodayIcon sx={{ fontSize: '12px !important' }} />}
                    label={dateStr}
                    size="small"
                    sx={{
                      height: 22,
                      fontWeight: 600,
                      fontSize: '0.67rem',
                      background: isDark ? 'rgba(102,126,234,0.12)' : 'rgba(102,126,234,0.08)',
                      border: '1px solid rgba(102,126,234,0.2)',
                      color: '#667eea',
                      '& .MuiChip-icon': { color: '#667eea' },
                    }}
                  />
                </Box>
              </motion.div>
            </Box>
          </Box>

          {/* ── Right: Controls ───────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>

            {/* Live indicator */}
            <Chip
              icon={<CircleIcon sx={{ fontSize: '9px !important', color: '#4caf50 !important', animation: 'livePulse 2s infinite', '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } } }} />}
              label="مباشر"
              size="small"
              sx={{
                height: 26, fontWeight: 700, fontSize: '0.7rem',
                background: 'rgba(76,175,80,0.1)',
                border: '1px solid rgba(76,175,80,0.3)',
                color: '#4caf50',
              }}
            />

            {/* Cache indicator */}
            {dataSource === 'cache' && (
              <Chip
                icon={<CachedIcon sx={{ fontSize: '13px !important', color: '#ff9800 !important' }} />}
                label="بيانات مؤقتة"
                size="small"
                sx={{
                  height: 26, fontWeight: 700, fontSize: '0.68rem',
                  background: 'rgba(255,152,0,0.1)',
                  border: '1px solid rgba(255,152,0,0.3)',
                  color: '#ff9800',
                }}
              />
            )}

            {/* Revenue chip */}
            {finance.monthlyRevenue > 0 && (
              <Chip
                icon={finance.revenueTrend >= 0
                  ? <TrendingUpIcon sx={{ fontSize: '15px !important', color: 'white !important' }} />
                  : <TrendingDownIcon sx={{ fontSize: '15px !important', color: 'white !important' }} />
                }
                label={`إيرادات الشهر: ${formatCurrency(finance.monthlyRevenue)}`}
                size="small"
                sx={{
                  height: 26,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  background: finance.revenueTrend >= 0
                    ? 'linear-gradient(135deg,#43cea2,#185a9d)'
                    : 'linear-gradient(135deg,#f7971e,#ffd200)',
                  color: 'white',
                  border: 'none',
                  boxShadow: finance.revenueTrend >= 0
                    ? '0 3px 10px rgba(67,206,162,0.35)'
                    : '0 3px 10px rgba(247,151,30,0.35)',
                }}
              />
            )}

            {/* Last updated */}
            {lastUpdated && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.68rem', display: { xs: 'none', sm: 'block' } }}>
                آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}
              </Typography>
            )}

            {/* Notification Bell */}
            <Box ref={bellRef}>
              <CtrlBtn
                tooltip="الإشعارات"
                onClick={toggleBell}
                color="#667eea"
                active={bellOpen}
                aria-label="إشعارات"
              >
                <Badge
                  badgeContent={unreadAlerts}
                  color="error"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.6rem', fontWeight: 800,
                      minWidth: 16, height: 16,
                      animation: unreadAlerts > 0 ? 'badgePop 2s infinite' : 'none',
                      '@keyframes badgePop': {
                        '0%,100%': { transform: 'scale(1) translate(50%,-50%)' },
                        '50%': { transform: 'scale(1.2) translate(50%,-50%)' },
                      },
                    },
                  }}
                >
                  {unreadAlerts > 0
                    ? <NotificationsActiveIcon sx={{ fontSize: 19, color: '#667eea' }} />
                    : <NotificationsNoneIcon sx={{ fontSize: 19, color: '#667eea' }} />
                  }
                </Badge>
              </CtrlBtn>
            </Box>

            {/* Export */}
            <CtrlBtn tooltip="تصدير لوحة التحكم" onClick={handleExport} color="#43cea2" aria-label="تصدير">
              <GetAppIcon sx={{ fontSize: 19, color: '#43cea2' }} />
            </CtrlBtn>

            {/* Refresh */}
            <CtrlBtn
              tooltip="تحديث البيانات"
              onClick={onRefresh}
              color="#667eea"
              aria-label="تحديث"
              sx={{
                animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
                '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
              }}
            >
              <RefreshIcon sx={{ fontSize: 19, color: '#667eea' }} />
            </CtrlBtn>
          </Box>
        </Box>

        {/* ══════════════ Mini Stats Row ══════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Box sx={{
            display: 'flex',
            gap: 1.2,
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}>
            <MiniStat icon={<PeopleIcon />}              label="المستخدمون"  value={kpis.users?.total || 0}         colorIdx={0} />
            <MiniStat icon={<AccessibilityNewIcon />}    label="المستفيدون" value={kpis.beneficiaries?.total || 0} colorIdx={1} />
            <MiniStat icon={<EventNoteIcon />}           label="جلسات اليوم" value={kpis.sessions?.today || 0}      colorIdx={2} />
            <MiniStat icon={<AccountBalanceWalletIcon />} label="المدفوعات"  value={kpis.payments?.total || 0}      colorIdx={3} />
          </Box>
        </motion.div>
      </Paper>

      {/* ══════════════ Notification Popper ══════════════ */}
      <Popper
        open={bellOpen}
        anchorEl={bellRef.current}
        placement="bottom-end"
        transition
        disablePortal
        sx={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Grow {...TransitionProps} style={{ transformOrigin: 'top right' }}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '16px',
                width: 360,
                maxHeight: 460,
                overflow: 'hidden',
                border: '1px solid',
                borderColor: isDark ? 'rgba(102,126,234,0.2)' : 'rgba(102,126,234,0.14)',
                mt: 1,
                background: isDark
                  ? 'rgba(18,22,45,0.96)'
                  : 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: isDark
                  ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(102,126,234,0.1)'
                  : '0 20px 60px rgba(102,126,234,0.15), 0 0 0 1px rgba(102,126,234,0.06)',
              }}
            >
              <ClickAwayListener onClickAway={closeBell}>
                <Box>
                  {/* Popper header */}
                  <Box sx={{
                    px: 2.5, py: 2,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'linear-gradient(135deg,rgba(102,126,234,0.1),rgba(118,75,162,0.06))',
                    borderBottom: '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{
                        width: 28, height: 28, borderRadius: '8px',
                        background: 'linear-gradient(135deg,#667eea,#764ba2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <NotificationsActiveIcon sx={{ fontSize: 16, color: 'white' }} />
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        الإشعارات
                        {unreadAlerts > 0 && (
                          <Box component="span" sx={{
                            ml: 0.8,
                            px: 0.8, py: 0.1,
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg,#667eea,#764ba2)',
                            color: 'white',
                            fontSize: '0.68rem',
                            fontWeight: 800,
                          }}>
                            {unreadAlerts}
                          </Box>
                        )}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {unreadAlerts > 0 && (
                        <Button
                          size="small"
                          onClick={onMarkAllRead}
                          sx={{
                            fontSize: '0.65rem', fontWeight: 600,
                            color: '#667eea',
                            borderRadius: '8px',
                            px: 1,
                            '&:hover': { background: 'rgba(102,126,234,0.1)' },
                          }}
                        >
                          قراءة الكل
                        </Button>
                      )}
                      <Button
                        size="small"
                        endIcon={<OpenInNewIcon sx={{ fontSize: '12px !important' }} />}
                        onClick={() => { closeBell(); navigate('/notifications'); }}
                        sx={{
                          fontSize: '0.7rem', fontWeight: 600,
                          borderRadius: '8px', px: 1,
                          '&:hover': { background: 'rgba(102,126,234,0.1)' },
                        }}
                      >
                        عرض الكل
                      </Button>
                    </Box>
                  </Box>

                  {/* Notification list */}
                  <Box sx={{
                    maxHeight: 360, overflowY: 'auto',
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-track': { background: 'transparent' },
                    '&::-webkit-scrollbar-thumb': {
                      borderRadius: 4,
                      background: 'rgba(102,126,234,0.3)',
                    },
                  }}>
                    {alerts.length === 0 ? (
                      <Box sx={{ p: 5, textAlign: 'center' }}>
                        <Box sx={{
                          width: 56, height: 56, borderRadius: '16px',
                          background: 'rgba(102,126,234,0.08)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mx: 'auto', mb: 1.5,
                        }}>
                          <NotificationsNoneIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
                        </Box>
                        <Typography variant="body2" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                          لا توجد إشعارات حالياً
                        </Typography>
                      </Box>
                    ) : (
                      <MenuList dense sx={{ py: 0.5 }} role="menu" aria-label="قائمة الإشعارات">
                        <AnimatePresence>
                          {alerts.slice(0, 8).map((alert, idx) => {
                            const sev = SEVERITY_MAP[alert.severity] || SEVERITY_MAP.low;
                            return (
                              <motion.div
                                key={alert.id || idx}
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -16 }}
                                transition={{ delay: idx * 0.04, duration: 0.25 }}
                              >
                                <MenuItem
                                  sx={{
                                    py: 1.2, px: 2,
                                    mx: 0.5,
                                    my: 0.3,
                                    borderRadius: '10px',
                                    borderInlineStart: `3px solid ${sev.color}`,
                                    background: !alert.read
                                      ? isDark
                                        ? 'rgba(102,126,234,0.07)'
                                        : 'rgba(102,126,234,0.04)'
                                      : 'transparent',
                                    '&:hover': {
                                      background: `${sev.color}10`,
                                      transform: 'translateX(-2px)',
                                    },
                                    transition: 'all 0.2s',
                                  }}
                                >
                                  <ListItemIcon sx={{
                                    color: sev.color, minWidth: 34,
                                    '& svg': { fontSize: 18 },
                                  }}>
                                    {sev.icon}
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography variant="body2" sx={{
                                        fontWeight: alert.read ? 400 : 700,
                                        fontSize: '0.8rem',
                                        lineHeight: 1.4,
                                      }}>
                                        {alert.message || alert.title || 'إشعار جديد'}
                                      </Typography>
                                    }
                                    secondary={
                                      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                                        {alert.time || 'الآن'}
                                      </Typography>
                                    }
                                  />
                                  {!alert.read && (
                                    <Box sx={{
                                      width: 7, height: 7, borderRadius: '50%',
                                      background: 'linear-gradient(135deg,#667eea,#764ba2)',
                                      flexShrink: 0,
                                      boxShadow: '0 0 6px rgba(102,126,234,0.6)',
                                    }} />
                                  )}
                                </MenuItem>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </MenuList>
                    )}
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </motion.div>
  );
};

export default React.memo(WelcomeHeader);
