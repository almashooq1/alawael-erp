/**
 * Layout Component with Theme Toggle
 * مكون التخطيط مع زر تبديل الثيم
 */

import React from 'react';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';
import { SkipLink } from '../ui/AccessibleComponents';

const menuItems = [
  { text: 'لوحة التحكم', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'التقارير', icon: <AssessmentIcon />, path: '/student-portal/reports' },
  { text: 'الطلاب', icon: <SchoolIcon />, path: '/students' },
  { text: 'الإعدادات', icon: <SettingsIcon />, path: '/settings' },
];

const LayoutWithTheme = ({ children }) => {
  const theme = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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
            aria-label="menu"
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
