import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Article as ArticleIcon,
  Notifications as NotificationsIcon,
  Support as SupportIcon,
  Security as SecurityIcon,
  Assessment as ReportsIcon,
  TrendingUp as PredictionsIcon,
  Speed as PerformanceIcon,
  Link as IntegrationsIcon,
  Monitor as MonitoringIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { logout } from '../store/slices/authSlice';
import NotificationBell from '../components/NotificationBell';

const drawerWidth = 240;

const menuItems = [
  { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'مركز الأمان', icon: <SecurityIcon />, path: '/security-center' },
  { text: 'إحصائيات الأمان', icon: <AnalyticsIcon />, path: '/security-dashboard' },
  { text: 'إعدادات التنبيهات', icon: <NotificationsIcon />, path: '/notification-settings' },
  { text: 'المستخدمين', icon: <PeopleIcon />, path: '/users' },
  { text: 'الصلاحيات', icon: <SecurityIcon />, path: '/rbac' },
  { text: 'التحليلات', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'إدارة المحتوى', icon: <ArticleIcon />, path: '/cms' },
  { text: 'التقارير', icon: <ReportsIcon />, path: '/reports' },
  { text: 'التوقعات', icon: <PredictionsIcon />, path: '/predictions' },
  { text: 'الإشعارات', icon: <NotificationsIcon />, path: '/notifications' },
  { text: 'الدعم الفني', icon: <SupportIcon />, path: '/support' },
  { text: 'المراقبة', icon: <MonitoringIcon />, path: '/monitoring' },
  { text: 'الأداء', icon: <PerformanceIcon />, path: '/performance' },
  { text: 'التكاملات', icon: <IntegrationsIcon />, path: '/integrations' },
];

const MainLayout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          نظام ERP
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleMenuClick(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            نظام إدارة الموارد المؤسسية
          </Typography>
          <NotificationBell />
          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <Avatar sx={{ width: 32, height: 32 }}>
              {user?.name?.charAt(0) || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
          >
            <MenuItem onClick={() => navigate('/profile')}>
              <ListItemIcon>
                <AccountCircle fontSize="small" />
              </ListItemIcon>
              الملف الشخصي
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              تسجيل الخروج
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
