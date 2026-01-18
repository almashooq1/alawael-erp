// Layout الرئيسي - MainLayout

import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  IconButton,
  Badge,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Dashboard,
  People,
  Description,
  EventNote,
  Assessment,
  Settings,
  Logout,
  Menu as MenuIcon,
  Close,
  Notifications,
  TrendingUp
} from '@mui/icons-material';
import { useNavigate, Outlet } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const DRAWER_WIDTH = 280;

const MainLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  const menuItems = [
    {
      label: 'لوحة المعلومات',
      icon: <Dashboard />,
      path: '/dashboard'
    },
    {
      label: 'المستفيدون',
      icon: <People />,
      path: '/beneficiaries'
    },
    {
      label: 'التقارير',
      icon: <Description />,
      path: '/reports'
    },
    {
      label: 'الجلسات',
      icon: <EventNote />,
      path: '/sessions'
    },
    {
      label: 'التقييمات',
      icon: <Assessment />,
      path: '/assessments'
    },
    {
      label: 'البرامج',
      icon: <TrendingUp />,
      path: '/programs'
    }
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (e) => {
    setNotificationAnchor(e.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logout()).unwrap();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    handleProfileMenuClose();
  };

  const drawerContent = (
    <Box>
      {/* Logo Section */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          textAlign: 'center'
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          نظام إدارة التأهيل
        </Typography>
        <Typography variant="caption">
          مراكز تأهيل ذوي الإعاقة
        </Typography>
      </Box>

      <Divider />

      {/* Menu Items */}
      <List>
        {menuItems.map((item) => (
          <ListItem
            key={item.path}
            button
            onClick={() => {
              navigate(item.path);
              if (isMobile) setMobileOpen(false);
            }}
            sx={{
              '&:hover': {
                bgcolor: 'action.hover'
              }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />

      {/* Settings */}
      <List>
        <ListItem
          button
          onClick={() => navigate('/settings')}
        >
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText primary="الإعدادات" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              {mobileOpen ? <Close /> : <MenuIcon />}
            </IconButton>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Notifications */}
          <IconButton
            color="inherit"
            onClick={handleNotificationMenuOpen}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* User Profile */}
          <IconButton
            onClick={handleProfileMenuOpen}
            sx={{ ml: 2 }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                background: 'rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }}
            >
              {user?.first_name?.[0] || user?.username?.[0] || 'U'}
            </Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        anchor="right"
        open={isMobile ? mobileOpen : true}
        onClose={handleDrawerToggle}
        sx={{
          width: DRAWER_WIDTH,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            pt: isMobile ? 0 : 8
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: { xs: 8, md: 0 }
        }}
      >
        <Outlet />
      </Box>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem disabled>
          <Box>
            <Typography variant="subtitle2">
              {user?.first_name} {user?.last_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user?.email}
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => navigate('/profile')}>
          الملف الشخصي
        </MenuItem>
        <MenuItem onClick={() => navigate('/settings')}>
          الإعدادات
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <Logout fontSize="small" sx={{ mr: 1 }} />
          تسجيل الخروج
        </MenuItem>
      </Menu>

      {/* Notification Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <MenuItem>
          <Box>
            <Typography variant="body2">جلسة جديدة مجدولة</Typography>
            <Typography variant="caption" color="text.secondary">
              قبل 5 دقائق
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem>
          <Box>
            <Typography variant="body2">تقرير جديد</Typography>
            <Typography variant="caption" color="text.secondary">
              قبل ساعة
            </Typography>
          </Box>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleNotificationMenuClose}>
          عرض جميع الإخطارات
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default MainLayout;
