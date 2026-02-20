import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Container } from '@mui/material';
import TopBar from '../layout/TopBar';
import Sidebar from '../layout/Sidebar';
import './Layout.css';

const Layout = () => {
  const { language } = useSelector(state => state.settings);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box
      className="main-layout"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      sx={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        bgcolor: '#f5f7fa',
      }}
    >
      {/* Sidebar */}
      <Box
        className="layout-sidebar"
        sx={{
          width: { xs: 0, sm: 280 },
          height: '100vh',
          overflow: 'hidden',
          display: { xs: 'none', sm: 'block' },
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderLeft: language === 'ar' ? '1px solid #e0e0e0' : 'none',
          borderRight: language === 'ar' ? 'none' : '1px solid #e0e0e0',
        }}
      >
        <Sidebar open={mobileOpen} onClose={handleDrawerToggle} isMobile={false} />
      </Box>

      {/* Mobile Sidebar Overlay */}
      <Sidebar open={mobileOpen} onClose={handleDrawerToggle} isMobile={true} />

      {/* Main Content */}
      <Box
        className="layout-main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* TopBar */}
        <TopBar onMenuOpen={handleDrawerToggle} />

        {/* Page Content */}
        <Box
          className="layout-content"
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: { xs: 1, sm: 2, md: 3 },
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Container maxWidth="xl" sx={{ flex: 1, py: 2 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
