import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Tooltip,
  Collapse,
  Badge,
  Switch,
  Paper,
  Stack,
  Avatar,
  Chip,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { getMenuItemsByRole } from '../../config/navigationConfig';
import { setLanguage } from '../../store/slices/settingsSlice';
import './Sidebar.css';

const Sidebar = ({ open, onClose, isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { language } = useSelector(state => state.settings);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [hoveredItem, setHoveredItem] = useState(null);

  const menuItems = getMenuItemsByRole(user?.role || 'user', language);

  const handleMenuClick = (path) => {
    navigate(path);
    if (isMobile) {
      onClose();
    }
  };

  const handleMenuToggle = (itemId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const isMenuActive = (path) => {
    return location.pathname === path;
  };

  const drawerContent = (
    <Box className="sidebar-container">
      {/* Logo & Branding */}
      <Box className="sidebar-header">
        <Box className="sidebar-logo">
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 40,
              height: 40,
              fontWeight: 'bold',
              fontSize: '1.2rem',
            }}
          >
            E
          </Avatar>
          <Box sx={{ ml: language === 'en' ? 2 : 0, mr: language === 'ar' ? 2 : 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {language === 'en' ? 'ERP System' : 'نظام ERP'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {language === 'en' ? 'Al-Awael' : 'الأوائل'}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* User Info */}
      {user && (
        <Box className="sidebar-user-info" sx={{ p: 2, mb: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Avatar
              sx={{
                bgcolor: 'primary.main',
                width: 32,
                height: 32,
              }}
            >
              {user.email?.charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {user.email}
              </Typography>
              <Chip
                label={user.role}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}
              />
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 1 }} />

      {/* Language Toggle */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
          {language === 'en' ? 'Language' : 'اللغة'}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="caption">العربية</Typography>
          <Switch
            checked={language === 'en'}
            onChange={(e) => dispatch(setLanguage(e.target.checked ? 'en' : 'ar'))}
            size="small"
          />
          <Typography variant="caption">English</Typography>
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Navigation Menu */}
      <List className="sidebar-menu">
        {/* Home Link */}
        <Tooltip title={language === 'en' ? 'Go to Dashboard' : 'اذهب للوحة التحكم'} placement="right">
          <ListItem disablePadding className="menu-item">
            <ListItemButton
              onClick={() => handleMenuClick('/dashboard')}
              selected={location.pathname === '/dashboard'}
              className={`menu-button ${location.pathname === '/dashboard' ? 'active' : ''}`}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText
                primary={language === 'en' ? 'Home' : 'الرئيسية'}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItemButton>
          </ListItem>
        </Tooltip>

        <Divider sx={{ my: 1 }} />

        {/* Menu Items */}
        {menuItems.map((item) => (
          <div key={item.id} className="menu-item-wrapper">
            <Tooltip
              title={language === 'en' ? item.descriptionEn : item.description}
              placement="right"
            >
              <ListItem
                disablePadding
                className="menu-item"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <ListItemButton
                  onClick={() => handleMenuClick(item.path)}
                  selected={isMenuActive(item.path)}
                  className={`menu-button ${isMenuActive(item.path) ? 'active' : ''}`}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>
                    {React.createElement(item.icon, {
                      sx: {
                        color: isMenuActive(item.path) ? 'primary.main' : 'inherit',
                      },
                    })}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.displayText}
                    primaryTypographyProps={{
                      variant: 'body2',
                      sx: {
                        fontWeight: isMenuActive(item.path) ? 600 : 500,
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Tooltip>
          </div>
        ))}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      {/* Footer Info */}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
          {language === 'en' ? 'Version' : 'الإصدار'} 2.0.0
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
          {language === 'en' ? 'Powered by Al-Awael' : 'بدعم من الأوائل'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? open : true}
      onClose={onClose}
      className="sidebar-drawer"
      PaperProps={{
        sx: {
          width: 280,
          bgcolor: 'background.paper',
          boxShadow: 2,
          borderLeft: language === 'ar' ? 'none' : '1px solid #e0e0e0',
            borderRight: language === 'ar' ? '1px solid #e0e0e0' : 'none',
        },
      }}
      anchor={language === 'ar' ? 'right' : 'left'}
    >
      {drawerContent}
    </Drawer>
  );
};

export default Sidebar;
