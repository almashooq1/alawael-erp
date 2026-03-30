/**
 * 🌟 WelcomeHeader v4 — Enhanced Professional Dashboard Header
 * ترويسة ترحيبية احترافية مع جرس إشعارات وزر تصدير وتخصيص شخصي
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
  Divider,
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import { formatCurrency, formatNumber, getGreeting, getArabicDate } from 'services/dashboardService';
import { gradients, statusColors, brandColors } from '../../theme/palette';

/* ── Mini Stat Chip (memo'd to prevent unnecessary re-renders) ─ */
const MiniStat = React.memo(({ icon, label, value, gradient }) => (
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.8,
        borderRadius: 2.5,
        background: `${gradient}12`,
        border: '1px solid',
        borderColor: `${gradient}20`,
        minWidth: 100,
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.5,
          background: gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '& svg': { fontSize: 16, color: 'white' },
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="caption"
          sx={{ fontSize: '0.65rem', color: 'text.secondary', display: 'block', lineHeight: 1.2 }}
        >
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>
          {formatNumber(value)}
        </Typography>
      </Box>
    </Box>
  </motion.div>
));

const WelcomeHeader = ({ finance = {}, alerts = [], lastUpdated, refreshing, onRefresh, kpis = {}, onExport, onMarkAllRead, dataSource = 'api' }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const greeting = getGreeting();
  const dateStr = getArabicDate();
  const unreadAlerts = alerts.filter(a => !a.read).length;
  const userName = currentUser?.name || currentUser?.fullName || '';

  /* ── Notification Bell State ───────────────────────────── */
  const bellRef = useRef(null);
  const [bellOpen, setBellOpen] = useState(false);
  const toggleBell = useCallback(() => setBellOpen(prev => !prev), []);
  const closeBell = useCallback(() => setBellOpen(false), []);

  const SEVERITY_MAP = {
    high: { icon: <ErrorOutlineIcon fontSize="small" />, color: statusColors.error },
    medium: { icon: <WarningAmberIcon fontSize="small" />, color: statusColors.warning },
    low: { icon: <InfoOutlinedIcon fontSize="small" />, color: statusColors.info },
    success: { icon: <CheckCircleOutlineIcon fontSize="small" />, color: statusColors.success },
  };

  /* ── Export handler ────────────────────────────────────── */
  const handleExport = useCallback(() => {
    if (typeof onExport === 'function') {
      onExport();
    } else {
      window.print();
    }
  }, [onExport]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 3 },
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(102,126,234,0.12) 0%, rgba(118,75,162,0.08) 100%)'
            : 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.04) 100%)',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(102,126,234,0.15)' : 'rgba(102,126,234,0.1)',
        }}
      >
        {/* Decorative gradient orb */}
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            left: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: gradients.primary,
            opacity: 0.04,
            pointerEvents: 'none',
          }}
        />

        {/* Top Row: Title + Controls */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2,
          }}
        >
          {/* Left — Title & greeting */}
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 800,
                fontSize: 'clamp(1.3rem, 3vw, 1.85rem)',
                background: gradients.primary,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 0.5,
              }}
            >
              لوحة التحكم الرئيسية
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                {greeting}{userName ? ` ${userName}` : ''}! إليك نظرة شاملة على النظام
              </Typography>
              <Chip
                icon={<CalendarTodayIcon sx={{ fontSize: '14px !important' }} />}
                label={dateStr}
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  borderColor: 'rgba(102,126,234,0.2)',
                  color: 'text.secondary',
                }}
              />
            </Box>
          </Box>

          {/* Right — Indicators */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Live indicator */}
            <Chip
              icon={
                <CircleIcon
                  sx={{
                    fontSize: '10px !important',
                    color: `${statusColors.success} !important`,
                    animation: 'pulse 2s infinite',
                  }}
                />
              }
              label="مباشر"
              size="small"
              variant="outlined"
              sx={{
                fontWeight: 700,
                borderColor: 'rgba(76,175,80,0.3)',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
              }}
            />

            {/* Stale cache indicator */}
            {dataSource === 'cache' && (
              <Chip
                icon={<CachedIcon sx={{ fontSize: '14px !important', color: `${statusColors.warning} !important` }} />}
                label="بيانات مؤقتة"
                size="small"
                variant="outlined"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  borderColor: 'rgba(255,152,0,0.3)',
                  color: statusColors.warning,
                  animation: 'pulse 3s infinite',
                }}
              />
            )}

            {/* Revenue chip with trend */}
            {finance.monthlyRevenue > 0 && (
              <Chip
                icon={
                  finance.revenueTrend >= 0
                    ? <TrendingUpIcon sx={{ fontSize: '16px !important', color: 'white !important' }} />
                    : <TrendingDownIcon sx={{ fontSize: '16px !important', color: 'white !important' }} />
                }
                label={`إيرادات الشهر: ${formatCurrency(finance.monthlyRevenue)}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  background: finance.revenueTrend >= 0
                    ? gradients.success
                    : gradients.warning,
                  color: 'white',
                }}
              />
            )}

            {/* ━━━ Notification Bell ━━━ */}
            <Tooltip title="الإشعارات">
              <IconButton
                ref={bellRef}
                onClick={toggleBell}
                size="small"
                aria-label="إشعارات"
                sx={{
                  background: bellOpen
                    ? 'rgba(102,126,234,0.15)'
                    : 'rgba(102,126,234,0.08)',
                  '&:hover': { background: 'rgba(102,126,234,0.18)' },
                  transition: 'all 0.2s',
                }}
              >
                <Badge
                  badgeContent={unreadAlerts}
                  color="error"
                  max={99}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      minWidth: 18,
                      height: 18,
                      animation: unreadAlerts > 0 ? 'bell-pulse 2s infinite' : 'none',
                      '@keyframes bell-pulse': {
                        '0%, 100%': { transform: 'scale(1) translate(50%, -50%)' },
                        '50%': { transform: 'scale(1.15) translate(50%, -50%)' },
                      },
                    },
                  }}
                >
                  {unreadAlerts > 0
                    ? <NotificationsActiveIcon sx={{ fontSize: 20, color: brandColors.primaryStart }} />
                    : <NotificationsNoneIcon sx={{ fontSize: 20, color: brandColors.primaryStart }} />
                  }
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Notification Dropdown */}
            <Popper
              open={bellOpen}
              anchorEl={bellRef.current}
              placement="bottom-end"
              transition
              disablePortal
              sx={{ zIndex: 1300 }}
            >
              {({ TransitionProps }) => (
                <Grow {...TransitionProps} style={{ transformOrigin: 'right top' }}>
                  <Paper
                    elevation={8}
                    sx={{
                      borderRadius: 3,
                      width: 340,
                      maxHeight: 420,
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.06)',
                      mt: 1,
                    }}
                  >
                    <ClickAwayListener onClickAway={closeBell}>
                      <Box>
                        {/* Header */}
                        <Box
                          sx={{
                            px: 2,
                            py: 1.5,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: theme.palette.mode === 'dark'
                              ? 'rgba(102,126,234,0.08)'
                              : 'rgba(102,126,234,0.04)',
                          }}
                        >
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            الإشعارات {unreadAlerts > 0 && `(${unreadAlerts} جديد)`}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {unreadAlerts > 0 && (
                              <Button
                                size="small"
                                onClick={onMarkAllRead}
                                sx={{ fontSize: '0.65rem', fontWeight: 600, color: 'text.secondary', minWidth: 'auto' }}
                              >
                                قراءة الكل
                              </Button>
                            )}
                            <Button
                              size="small"
                              endIcon={<OpenInNewIcon sx={{ fontSize: '14px !important' }} />}
                              onClick={() => {
                                closeBell();
                                navigate('/notifications');
                              }}
                              sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                            >
                              عرض الكل
                            </Button>
                          </Box>
                        </Box>
                        <Divider />

                        {/* Notification List */}
                        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                          {alerts.length === 0 ? (
                            <Box sx={{ p: 4, textAlign: 'center' }}>
                              <NotificationsNoneIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                لا توجد إشعارات حالياً
                              </Typography>
                            </Box>
                          ) : (
                            <MenuList dense sx={{ py: 0 }} role="menu" aria-label="قائمة الإشعارات">
                              <AnimatePresence>
                                {alerts.slice(0, 8).map((alert, idx) => {
                                  const sev = SEVERITY_MAP[alert.severity] || SEVERITY_MAP.low;
                                  return (
                                    <motion.div
                                      key={alert.id || idx}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.04 }}
                                    >
                                      <MenuItem
                                        sx={{
                                          py: 1.2,
                                          px: 2,
                          borderInlineStart: `3px solid ${sev.color}`,
                                          background: !alert.read
                                            ? theme.palette.mode === 'dark'
                                              ? 'rgba(102,126,234,0.06)'
                                              : 'rgba(102,126,234,0.03)'
                                            : 'transparent',
                                          '&:hover': { background: `${sev.color}08` },
                                        }}
                                      >
                                        <ListItemIcon sx={{ color: sev.color, minWidth: 32 }}>
                                          {sev.icon}
                                        </ListItemIcon>
                                        <ListItemText
                                          primary={
                                            <Typography variant="body2" sx={{
                                              fontWeight: alert.read ? 400 : 700,
                                              fontSize: '0.78rem',
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
                                          <Box
                                            sx={{
                                              width: 7,
                                              height: 7,
                                              borderRadius: '50%',
                                              background: brandColors.primaryStart,
                                              ml: 1,
                                              flexShrink: 0,
                                            }}
                                          />
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

            {/* ━━━ Export Button ━━━ */}
            <Tooltip title="تصدير لوحة التحكم">
              <IconButton
                onClick={handleExport}
                size="small"
                aria-label="تصدير"
                sx={{
                  background: 'rgba(67,206,162,0.08)',
                  '&:hover': { background: 'rgba(67,206,162,0.18)' },
                }}
              >
                <GetAppIcon sx={{ fontSize: 20, color: brandColors.ocean }} />
              </IconButton>
            </Tooltip>

            {/* Last updated */}
            {lastUpdated && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
                آخر تحديث: {lastUpdated.toLocaleTimeString('ar-SA')}
              </Typography>
            )}

            {/* Refresh button */}
            <Tooltip title="تحديث البيانات">
              <IconButton
                onClick={onRefresh}
                size="small"
                aria-label="تحديث"
                sx={{
                  background: 'rgba(102,126,234,0.08)',
                  '&:hover': { background: 'rgba(102,126,234,0.15)' },
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                }}
              >
                <RefreshIcon sx={{ fontSize: 20, color: brandColors.primaryStart }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Bottom Row: Quick Summary Stats */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <MiniStat
            icon={<PeopleIcon />}
            label="المستخدمون"
            value={kpis.users?.total || 0}
            gradient={brandColors.primaryStart}
          />
          <MiniStat
            icon={<AccessibilityNewIcon />}
            label="المستفيدون"
            value={kpis.beneficiaries?.total || 0}
            gradient={brandColors.accentGreen}
          />
          <MiniStat
            icon={<EventNoteIcon />}
            label="جلسات اليوم"
            value={kpis.sessions?.today || 0}
            gradient={brandColors.accentSky}
          />
          <MiniStat
            icon={<AccountBalanceWalletIcon />}
            label="المدفوعات"
            value={kpis.payments?.total || 0}
            gradient={brandColors.accentPink}
          />
        </Box>
      </Paper>
    </motion.div>
  );
};

export default React.memo(WelcomeHeader);
