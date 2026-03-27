import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Dashboard,
  People,
  AccessTime,
  EventBusy,
  Payment,
  Assessment,
  Psychology,
  School,
  Analytics,
  Description,
  Menu as MenuIcon,
} from '@mui/icons-material';

const navItems = [
  { label: 'الرئيسية', path: '/dashboard', icon: <Dashboard fontSize="small" /> },
  { label: 'الموظفين', path: '/employees', icon: <People fontSize="small" /> },
  { label: 'الحضور', path: '/attendance', icon: <AccessTime fontSize="small" /> },
  { label: 'الإجازات', path: '/leaves', icon: <EventBusy fontSize="small" /> },
  { label: 'الرواتب', path: '/payroll', icon: <Payment fontSize="small" /> },
  { label: 'الأداء', path: '/performance', icon: <Assessment fontSize="small" /> },
  { divider: true },
  { label: '🧠 الذكاء', path: '/smart-hr', icon: <Psychology fontSize="small" /> },
  { label: '📋 التهيئة', path: '/smart-hr/onboarding', icon: <School fontSize="small" /> },
  { label: '🔍 تحليل موظف', path: '/smart-hr/insights', icon: <Analytics fontSize="small" /> },
  { label: '📊 التقارير', path: '/smart-hr/analytics', icon: <Description fontSize="small" /> },
];

const Navbar = () => {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:960px)');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = path => location.pathname === path || location.pathname.startsWith(path + '/');

  if (isMobile) {
    return (
      <>
        <AppBar position="static" sx={{ bgcolor: '#1a237e' }}>
          <Toolbar>
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1, mr: 1 }}>
              شؤون الموظفين
            </Typography>
          </Toolbar>
        </AppBar>
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <Box sx={{ width: 260, pt: 2 }} dir="rtl">
            <Typography variant="h6" sx={{ px: 2, mb: 1 }}>
              القائمة
            </Typography>
            <Divider />
            <List>
              {navItems
                .filter(n => !n.divider)
                .map(item => (
                  <ListItem
                    key={item.path}
                    component={Link}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    selected={isActive(item.path)}
                  >
                    <Box sx={{ mr: 1 }}>{item.icon}</Box>
                    <ListItemText primary={item.label} />
                  </ListItem>
                ))}
            </List>
          </Box>
        </Drawer>
      </>
    );
  }

  return (
    <AppBar position="static" sx={{ bgcolor: '#1a237e' }}>
      <Toolbar sx={{ gap: 0.5, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ mr: 2, whiteSpace: 'nowrap' }}>
          شؤون الموظفين
        </Typography>
        {navItems.map((item, i) =>
          item.divider ? (
            <Divider
              key={i}
              orientation="vertical"
              flexItem
              sx={{ mx: 0.5, borderColor: 'rgba(255,255,255,0.3)' }}
            />
          ) : (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              size="small"
              startIcon={item.icon}
              sx={{
                color: 'white',
                textTransform: 'none',
                fontSize: '0.8rem',
                bgcolor: isActive(item.path) ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              {item.label}
            </Button>
          )
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
