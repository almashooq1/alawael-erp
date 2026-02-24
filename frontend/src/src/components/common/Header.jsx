/**
 * Header Component
 * رأس الصفحة الرئيسي مع الملف الشخصي والتنبيهات
 */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar,
  Toolbar,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  IconButton,
  Tooltip,
  Typography,
} from '@material-ui/core';
import {
  Notifications as NotificationsIcon,
  Mail as MailIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  AccountCircle as ProfileIcon,
  Menu as MenuIcon,
} from '@material-ui/icons';
import authService from '../../services/auth.service';
import './Header.css';

const Header = ({ onMenuClick, showMenu = true }) => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector(state => state.auth);
  const { unreadCount } = useSelector(state => state.notifications);

  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    authService.logout();
    dispatch({ type: 'LOGOUT' });
    navigate('/login');
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleMenuClose();
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <AppBar position="sticky" className="header">
      <Toolbar>
        {/* Menu Button */}
        {showMenu && (
          <IconButton
            edge="start"
            color="inherit"
            onClick={onMenuClick}
            className="menu-button"
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Title */}
        <Typography variant="h6" className="header-title">
          {t('app.name')}
        </Typography>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right Section */}
        <Box className="header-actions">
          {/* Notifications */}
          <Tooltip title={t('notifications.title')}>
            <IconButton
              color="inherit"
              onClick={handleNotificationOpen}
              className="notification-button"
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Messages */}
          <Tooltip title={t('messages.title')}>
            <IconButton color="inherit" onClick={() => handleNavigate('/messages')}>
              <Badge badgeContent={4} color="error">
                <MailIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Language Switcher */}
          <Tooltip title={t('language.toggle')}>
            <IconButton color="inherit" onClick={toggleLanguage}>
              <Typography variant="body2">{i18n.language.toUpperCase()}</Typography>
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title={user?.name || 'User'}>
            <IconButton
              onClick={handleMenuOpen}
              className="user-button"
            >
              <Avatar
                alt={user?.name}
                src={user?.avatar}
                className="user-avatar"
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        className="profile-menu"
      >
        <MenuItem disabled>
          <Typography variant="body2">
            {user?.name}
          </Typography>
        </MenuItem>
        <MenuItem divider onClick={() => handleNavigate('/profile')}>
          <ProfileIcon className="menu-icon" />
          {t('profile.title')}
        </MenuItem>
        <MenuItem onClick={() => handleNavigate('/settings')}>
          <SettingsIcon className="menu-icon" />
          {t('settings.title')}
        </MenuItem>
        <MenuItem divider onClick={handleLogout}>
          <LogoutIcon className="menu-icon logout" />
          {t('auth.logout')}
        </MenuItem>
      </Menu>

      {/* Notification Dropdown */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        className="notification-menu"
      >
        <MenuItem onClick={handleNotificationClose}>
          {t('notifications.noNew')}
        </MenuItem>
      </Menu>
    </AppBar>
  );
};

export default Header;
