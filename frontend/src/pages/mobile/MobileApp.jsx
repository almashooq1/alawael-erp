/**
 * MobileApp.jsx — Al-Awael Mobile PWA Shell
 * تطبيق الجوال المتقدم لأخصائيي التأهيل
 *
 * Layout:
 *   - Bottom navigation bar (5 tabs): الرئيسية | الجلسات | المستفيدين | التنبيهات | المزيد
 *   - Top header: logo + user avatar + notification bell
 *   - Framer-motion page transitions (slide)
 */
import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Home as HomeIcon,
  EventNote as SessionsIcon,
  People as BeneficiariesIcon,
  Notifications as AlertsIcon,
  Menu as MoreIcon,
  NotificationsActive as NotificationBellIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import MobileHomeTab from './MobileHomeTab';
import MobileSessionsTab from './MobileSessionsTab';
import MobileBeneficiariesTab from './MobileBeneficiariesTab';
import MobileAlertsTab from './MobileAlertsTab';
import MobileMoreTab from './MobileMoreTab';
import { mockUser, mockAlerts } from './mockData';

const TAB_LABELS = ['الرئيسية', 'الجلسات', 'المستفيدون', 'التنبيهات', 'المزيد'];
const TAB_ICONS = [HomeIcon, SessionsIcon, BeneficiariesIcon, AlertsIcon, MoreIcon];
const TAB_PATHS = ['home', 'sessions', 'beneficiaries', 'alerts', 'more'];

const swipeVariants = {
  initial: (dir) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  animate: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const swipeTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export default function MobileApp() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [swipeDir, setSwipeDir] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartX = useRef(null);
  const unreadCount = mockAlerts.filter((a) => !a.read).length;

  /* ─── Pull-to-refresh ─────────────────────────────────────────────── */
  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartX.current == null) return;
      const deltaX = e.changedTouches[0].clientX - touchStartX.current;
      const threshold = 80;
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0 && activeTab > 0) {
          setSwipeDir(-1);
          setActiveTab((t) => t - 1);
        } else if (deltaX < 0 && activeTab < TAB_LABELS.length - 1) {
          setSwipeDir(1);
          setActiveTab((t) => t + 1);
        }
      }
      touchStartX.current = null;
    },
    [activeTab]
  );

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  }, []);

  /* ─── Bottom nav change ─────────────────────────────────────────── */
  const handleTabChange = (_e, newValue) => {
    setSwipeDir(newValue > activeTab ? 1 : -1);
    setActiveTab(newValue);
  };

  /* ─── Render tab content ────────────────────────────────────────── */
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <MobileHomeTab onRefresh={handlePullRefresh} refreshing={refreshing} />;
      case 1:
        return <MobileSessionsTab onRefresh={handlePullRefresh} refreshing={refreshing} />;
      case 2:
        return <MobileBeneficiariesTab onRefresh={handlePullRefresh} refreshing={refreshing} />;
      case 3:
        return <MobileAlertsTab onRefresh={handlePullRefresh} refreshing={refreshing} />;
      case 4:
        return <MobileMoreTab onRefresh={handlePullRefresh} refreshing={refreshing} />;
      default:
        return null;
    }
  };

  /* ─── Notification Drawer ───────────────────────────────────────── */
  const toggleDrawer = (open) => () => setDrawerOpen(open);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
      dir="rtl"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ─── Top AppBar ──────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <Toolbar sx={{ minHeight: 56, px: 2, gap: 1.5 }}>
          {/* Logo */}
          <Box
            component="img"
            src="/alawael-logo.svg"
            alt="Al-Awael"
            sx={{ width: 36, height: 36, borderRadius: 1, flexShrink: 0 }}
          />
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ flexGrow: 1, color: 'text.primary', fontFamily: 'Tajawal, Cairo, sans-serif' }}
          >
            الأوائل
          </Typography>

          {/* Notification Bell */}
          <IconButton
            onClick={toggleDrawer(true)}
            sx={{ width: 44, height: 44, minWidth: 44, minHeight: 44 }}
            aria-label="الإشعارات"
          >
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationBellIcon sx={{ color: 'text.primary' }} />
            </Badge>
          </IconButton>

          {/* User Avatar */}
          <Avatar
            sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14, fontWeight: 700 }}
          >
            {mockUser.name.charAt(0)}
          </Avatar>
        </Toolbar>
      </AppBar>

      {/* ─── Main Content ────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          pt: '56px',
          pb: '72px',
          position: 'relative',
        }}
      >
        {/* Pull-to-refresh indicator */}
        {refreshing && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
            }}
          >
            <RefreshIcon sx={{ animation: 'spin 1s linear infinite', color: 'primary.main' }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
          </Box>
        )}

        <AnimatePresence mode="wait" custom={swipeDir}>
          <motion.div
            key={activeTab}
            custom={swipeDir}
            variants={swipeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={swipeTransition}
            style={{ height: '100%' }}
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* ─── Bottom Navigation ───────────────────────────────────── */}
      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.appBar,
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
        }}
        elevation={0}
      >
        <BottomNavigation
          value={activeTab}
          onChange={handleTabChange}
          showLabels
          sx={{
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0,
              py: 0.5,
              px: 0.5,
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.65rem',
              fontFamily: 'Tajawal, Cairo, sans-serif',
            },
            '& .Mui-selected': {
              fontSize: '0.7rem !important',
              fontWeight: 700,
            },
            '& .MuiBottomNavigationAction-icon': {
              fontSize: 24,
            },
          }}
        >
          {TAB_LABELS.map((label, idx) => {
            const Icon = TAB_ICONS[idx];
            return (
              <BottomNavigationAction
                key={label}
                label={label}
                icon={
                  idx === 3 ? (
                    <Badge badgeContent={unreadCount} color="error" max={99} variant="dot">
                      <Icon />
                    </Badge>
                  ) : (
                    <Icon />
                  )
                }
                sx={{
                  minWidth: 0,
                  '& .MuiTouchRipple-root': { color: 'primary.main' },
                }}
              />
            );
          })}
        </BottomNavigation>
      </Paper>

      {/* ─── Notification Drawer ─────────────────────────────────── */}
      <SwipeableDrawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        onOpen={toggleDrawer(true)}
        sx={{
          '& .MuiDrawer-paper': {
            width: '85vw',
            maxWidth: 360,
            borderRadius: '16px 0 0 16px',
          },
        }}
        PaperProps={{ sx: { borderRadius: '16px 0 0 16px' } }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
            الإشعارات
          </Typography>
          <IconButton onClick={toggleDrawer(false)} sx={{ width: 40, height: 40 }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ px: 1 }}>
          {mockAlerts.slice(0, 4).map((alert) => (
            <ListItem key={alert.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                sx={{
                  borderRadius: 2,
                  bgcolor: alert.read ? 'transparent' : 'action.hover',
                  py: 1.5,
                  minHeight: 64,
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <AlertsIcon
                    color={
                      alert.type === 'error'
                        ? 'error'
                        : alert.type === 'warning'
                          ? 'warning'
                          : alert.type === 'success'
                            ? 'success'
                            : 'info'
                    }
                    fontSize="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={alert.title}
                  secondary={alert.message}
                  primaryTypographyProps={{
                    fontWeight: alert.read ? 400 : 700,
                    fontSize: '0.875rem',
                    fontFamily: 'Tajawal, Cairo, sans-serif',
                  }}
                  secondaryTypographyProps={{
                    fontSize: '0.75rem',
                    noWrap: true,
                    fontFamily: 'Tajawal, Cairo, sans-serif',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </SwipeableDrawer>
    </Box>
  );
}
