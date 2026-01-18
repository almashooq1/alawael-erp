import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Business,
  School,
  Description,
  Assessment,
  Settings,
  Logout,
  AccountCircle,
  Notifications,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useSocket } from '../services/socketService';

const drawerWidth = 280;

const menuItems = [
  { text: 'لوحة التحكم', icon: Dashboard, path: '/dashboard' },
  { text: 'الموارد البشرية', icon: People, path: '/hr' },
  { text: 'إدارة العملاء', icon: Business, path: '/crm' },
  { text: 'التعليم الإلكتروني', icon: School, path: '/elearning' },
  { text: 'المستندات', icon: Description, path: '/documents' },
  { text: 'التقارير', icon: Assessment, path: '/reports' },
  { text: 'الإعدادات', icon: Settings, path: '/settings' },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { connected } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationCount, setNotificationCount] = useState(3);

  useEffect(() => {
    // Listen for new notifications to update badge count
    // This would be enhanced with actual notification tracking
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const drawer = (
    <div>
      <Toolbar
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          نظام الأوائل ERP
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>
                <item.icon />
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
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
            مرحباً، {user?.fullName}
          </Typography>
          <Tooltip title="الإشعارات">
            <IconButton color="inherit" sx={{ mr: 2 }}>
              <Badge badgeContent={notificationCount} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>
          {connected && (
            <Tooltip title="متصل بالخادم">
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: 'success.main',
                  mr: 2,
                  boxShadow: '0 0 8px rgba(76, 175, 80, 0.8)',
                }}
              />
            </Tooltip>
          )}
          <IconButton color="inherit" onClick={handleMenuClick}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={handleMenuClose}>
              <AccountCircle sx={{ mr: 1 }} /> الملف الشخصي
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <Logout sx={{ mr: 1 }} /> تسجيل الخروج
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
          minHeight: '100vh',
          bgcolor: 'grey.50',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
