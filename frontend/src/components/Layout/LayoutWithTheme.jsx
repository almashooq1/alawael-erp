/**
 * Layout Component with Theme Toggle
 * مكون التخطيط مع زر تبديل الثيم
 */

import { useState } from 'react';
import {
  useTheme,
} from '@mui/material';

import { Link, useLocation } from 'react-router-dom';
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
  Typography
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SchoolIcon from '@mui/icons-material/School';
import AccessibilityIcon from '@mui/icons-material/Accessibility';
import QuizIcon from '@mui/icons-material/Quiz';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';

const menuItems = [
  { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'التقارير', icon: <AssessmentIcon />, path: '/student-portal/reports' },
  { text: 'الطلاب', icon: <SchoolIcon />, path: '/students' },
  { text: 'مقاييس التقييم', icon: <AccessibilityIcon />, path: '/assessment-scales' },
  { text: 'اختبارات التقييم', icon: <QuizIcon />, path: '/assessment-tests' },
  { text: 'الإعدادات', icon: <SettingsIcon />, path: '/settings' },
];

const LayoutWithTheme = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SkipLink targetId="main-content" />

      {/* Header */}
      <AppBar position="sticky" elevation={2}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="القائمة"
            onClick={toggleDrawer(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            نظام إدارة المدارس
          </Typography>

          <ThemeToggle sx={{ color: 'white' }} />
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer(false)}>
        <Box
          sx={{ width: 250 }}
          role="presentation"
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        id="main-content"
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: theme.palette.mode === 'dark' ? '#0a1929' : '#f5f7fa',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default LayoutWithTheme;
