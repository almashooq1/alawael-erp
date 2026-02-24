/**
 * Main Application Component
 * المكون الرئيسي للتطبيق
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  Box,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  DirectionsBus as BusIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Groups as StaffIcon,
  LocationOn as LocationIcon,
  Psychology as AIIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';

// Pages
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import TransportPage from './pages/TransportPage';
import ReportsPage from './pages/ReportsPage';
import LoginPage from './pages/LoginPage';
import HRPage from './pages/HRPage';

// Theme
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: '"Cairo", "Tajawal", "Roboto", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#8B5CF6',
    },
    success: {
      main: '#10B981',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
    background: {
      default: '#F3F4F6',
      paper: '#FFFFFF',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Drawer Width
const DRAWER_WIDTH = 280;

// Navigation Items
const navigationItems = [
  { id: 'dashboard', label: 'لوحة التحكم', icon: DashboardIcon, path: '/' },
  { id: 'students', label: 'الطلاب', icon: PeopleIcon, path: '/students' },
  { id: 'hr', label: 'الموارد البشرية', icon: StaffIcon, path: '/hr' },
  { id: 'transport', label: 'النقل الذكي', icon: BusIcon, path: '/transport' },
  { id: 'reports', label: 'التقارير', icon: ReportsIcon, path: '/reports' },
  { id: 'ai', label: 'الذكاء الاصطناعي', icon: AIIcon, path: '/ai' },
  { id: 'settings', label: 'الإعدادات', icon: SettingsIcon, path: '/settings' },
];

// Main Layout Component
const MainLayout = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setDrawerOpen(false);
  };

  const notifications = [
    { id: 1, title: 'تأخر الحافلة رقم 5', time: 'منذ 5 دقائق' },
    { id: 2, title: 'غياب 3 طلاب', time: 'منذ 15 دقيقة' },
    { id: 3, title: 'اجتماع فريق العمل', time: 'اليوم 10:00 ص' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          mr: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            نظام إدارة مراكز التأهيل
          </Typography>
          
          {/* Search */}
          <Tooltip title="البحث">
            <IconButton sx={{ ml: 1 }}>
              <SearchIcon />
            </IconButton>
          </Tooltip>
          
          {/* Notifications */}
          <Tooltip title="الإشعارات">
            <IconButton
              sx={{ ml: 1 }}
              onClick={(e) => setNotificationAnchor(e.currentTarget)}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={() => setNotificationAnchor(null)}
            PaperProps={{ sx: { width: 320 } }}
          >
            <Typography sx={{ p: 2, fontWeight: 'bold' }}>الإشعارات</Typography>
            <Divider />
            {notifications.map((notif) => (
              <MenuItem key={notif.id} onClick={() => setNotificationAnchor(null)}>
                <Box>
                  <Typography variant="body2">{notif.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notif.time}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem sx={{ justifyContent: 'center' }}>
              <Typography color="primary">عرض الكل</Typography>
            </MenuItem>
          </Menu>
          
          {/* User Menu */}
          <IconButton
            sx={{ ml: 1 }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              م
            </Avatar>
          </IconButton>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography fontWeight="bold">محمد أحمد</Typography>
              <Typography variant="caption" color="text.secondary">
                مدير النظام
              </Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => setAnchorEl(null)}>
              <ListItemIcon><PersonIcon /></ListItemIcon>
              الملف الشخصي
            </MenuItem>
            <MenuItem onClick={() => setAnchorEl(null)}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              الإعدادات
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/login'); }}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              تسجيل الخروج
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      
      {/* Sidebar */}
      <Drawer
        variant={isMobile ? 'temporary' : 'persistent'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'grey.900',
            color: 'white',
          },
        }}
      >
        {/* Logo */}
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <LocationIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              مراكز التأهيل
            </Typography>
            <Typography variant="caption" color="grey.400">
              النظام الذكي
            </Typography>
          </Box>
        </Box>
        
        <Divider sx={{ borderColor: 'grey.800' }} />
        
        {/* Navigation */}
        <List sx={{ px: 2, py: 1 }}>
          {navigationItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                  '&:hover': { bgcolor: 'grey.800' },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                  <item.icon />
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        
        <Divider sx={{ borderColor: 'grey.800', mt: 'auto' }} />
        
        {/* Center Info */}
        <Box sx={{ p: 2, mt: 'auto' }}>
          <Typography variant="caption" color="grey.400">
            المركز
          </Typography>
          <Typography variant="body2" fontWeight="bold">
            مركز التأهيل الشامل
          </Typography>
          <Typography variant="caption" color="grey.400">
            الرياض - حي النخيل
          </Typography>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: drawerOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%' },
          mr: { md: drawerOpen ? `${DRAWER_WIDTH}px` : 0 },
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

// Placeholder Pages
const AIPage = () => (
  <Box sx={{ p: 3 }} dir="rtl">
    <Typography variant="h4" fontWeight="bold" gutterBottom>
      الذكاء الاصطناعي
    </Typography>
    <Typography color="text.secondary">
      رؤى وتوصيات الذكاء الاصطناعي - قيد التطوير
    </Typography>
  </Box>
);

const SettingsPage = () => (
  <Box sx={{ p: 3 }} dir="rtl">
    <Typography variant="h4" fontWeight="bold" gutterBottom>
      الإعدادات
    </Typography>
    <Typography color="text.secondary">
      إعدادات النظام - قيد التطوير
    </Typography>
  </Box>
);

// Main App Component
const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <MainLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/students" element={<StudentsPage />} />
                  <Route path="/hr" element={<HRPage />} />
                  <Route path="/transport" element={<TransportPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/ai" element={<AIPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </MainLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;