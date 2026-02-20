import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Typography,
  Divider,
  Stack,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import NotificationCenter from '../notifications/NotificationCenter';
import { logout } from '../../store/slices/authSlice';
import { USER_PROFILE_MENU_ITEMS, TOP_NAV_CONFIG } from '../../config/navigationConfig';
import './TopBar.css';

const TopBar = ({ onMenuOpen }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const { language } = useSelector(state => state.settings);
  
  const [anchorElProfile, setAnchorElProfile] = useState(null);
  const [anchorElNotif, setAnchorElNotif] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  // Use notification context for real unread count
  // eslint-disable-next-line
  const { unreadCount } = (() => { try { return require('../../contexts/NotificationContext').useNotifications(); } catch { return { unreadCount: 0 }; } })();

  const handleProfileMenuOpen = (event) => {
    setAnchorElProfile(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorElProfile(null);
  };

  const handleNotifMenuOpen = (event) => {
    setAnchorElNotif(event.currentTarget);
  };

  const handleNotifMenuClose = () => {
    setAnchorElNotif(null);
  };

  const handleProfileAction = (action) => {
    handleProfileMenuClose();
    
    switch (action) {
      case 'profile':
        navigate('/profile');
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'preferences':
        navigate('/preferences');
        break;
      case 'help':
        window.open('https://help.example.com', '_blank');
        break;
      case 'logout':
        dispatch(logout());
        navigate('/login');
        break;
      default:
        break;
    }
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${searchQuery}`);
      setSearchQuery('');
    }
  };

  const profileMenuItems = USER_PROFILE_MENU_ITEMS.map(item => ({
    ...item,
    label: language === 'en' ? item.labelEn : item.label,
  }));

  return (
    <AppBar position="sticky" className="topbar" elevation={2}>
      <Toolbar className="topbar-toolbar">
        {/* Mobile Menu Button */}
        <IconButton
          color="inherit"
          aria-label="open drawer"
          onClick={onMenuOpen}
          edge="start"
          sx={{
            mr: language === 'en' ? 2 : 0,
            ml: language === 'ar' ? 2 : 0,
            display: { sm: 'none' },
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo/Title */}
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: { xs: 'none', sm: 'block' },
          }}
          onClick={() => navigate('/dashboard')}
        >
          {language === 'en' ? TOP_NAV_CONFIG.logoEn : TOP_NAV_CONFIG.logo}
        </Typography>

        {/* Search Bar */}
        <Box className="search-box" sx={{ display: { xs: 'none', md: 'flex' } }}>
          <TextField
            size="small"
            placeholder={language === 'en' ? 'Search...' : 'بحث...'}
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleSearch}
            sx={{
              width: 250,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#fff',
                },
              },
              '& .MuiOutlinedInput-input': {
                color: '#fff',
                '&::placeholder': {
                  color: 'rgba(255, 255, 255, 0.7)',
                  opacity: 1,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Notifications */}
          <IconButton
            color="inherit"
            className="topbar-icon-button"
            onClick={handleNotifMenuOpen}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          {/* Unified Notification Center Dropdown */}
          <Menu
            anchorEl={anchorElNotif}
            open={Boolean(anchorElNotif)}
            onClose={handleNotifMenuClose}
            PaperProps={{ sx: { width: 420, maxWidth: '90vw', p: 0 } }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 0 }}>
              <NotificationCenter />
            </Box>
          </Menu>

          {/* Profile Menu */}
          <IconButton
            onClick={handleProfileMenuOpen}
            className="topbar-icon-button"
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'secondary.main',
                cursor: 'pointer',
              }}
            >
              {user?.email?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          {/* Profile Dropdown Menu */}
          <Menu
            anchorEl={anchorElProfile}
            open={Boolean(anchorElProfile)}
            onClose={handleProfileMenuClose}
            transformOrigin={{ horizontal: language === 'ar' ? 'right' : 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: language === 'ar' ? 'right' : 'left', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                width: 250,
              },
            }}
          >
            {/* User Info Header */}
            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    bgcolor: 'primary.main',
                  }}
                >
                  {user?.email?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {user?.email}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {user?.role}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Menu Items */}
            {profileMenuItems.map((item) => (
              <MenuItem
                key={item.id}
                onClick={() => handleProfileAction(item.action)}
                sx={item.divider ? { borderTop: '1px solid #e0e0e0' } : {}}
              >
                <Typography variant="body2">{item.label}</Typography>
              </MenuItem>
            ))}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;
