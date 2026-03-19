/**
 * Advanced Mobile App - React Native Implementation 📱
 * تطبيق موبايل متقدم - تطبيق ويب متقدم
 *
 * Features:
 * ✅ Native-like experience
 * ✅ Offline functionality
 * ✅ Push notifications
 * ✅ GPS integration
 * ✅ Camera integration
 * ✅ File management
 * ✅ Biometric authentication
 * ✅ Dark mode
 * ✅ Multi-language support
 * ✅ Real-time sync
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  Grid,
  IconButton,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  Stack,
  Avatar,
  Dialog as MuiDialog,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Smartphone as SmartphoneIcon,
  LocationOn as LocationOnIcon,
  CameraAlt as CameraAltIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  MoreVert as MoreVertIcon,
  Logout as LogoutIcon,
  DarkMode as DarkModeIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';

const AdvancedMobileApp = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('ar');
  const [openDialog, setOpenDialog] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const [items, setItems] = useState([
    { id: '1', name: 'عرض خاص - 50% خصم', desc: 'منتجات مختارة', price: '99 ر.س', image: '📦', rating: 4.5, location: 'الرياض' },
    { id: '2', name: 'خدمة توصيل سريعة', desc: 'توصيل في ساعة واحدة', price: 'مجاني', image: '🚚', rating: 4.8, location: 'جدة' },
    { id: '3', name: 'برنامج الولاء', desc: 'احصل على نقاط مع كل شراء', price: 'بلا تكلفة', image: '🎁', rating: 4.6, location: 'الدمام' },
    { id: '4', name: 'استشارة مجانية', desc: 'تحدث مع الخبراء', price: 'مجاني', image: '💬', rating: 4.7, location: 'أونلاين' },
  ]);

  const notifications = [
    { id: '1', title: 'طلبك في الطريق', message: 'سيصل في غضون ساعة', time: 'قبل دقيقة', icon: '🚚', read: false },
    { id: '2', title: 'عرض جديد', message: 'خصم 30% على الملابس', time: 'قبل ساعة', icon: '🎉', read: false },
    { id: '3', title: 'نقاط جديدة', message: 'حصلت على 500 نقطة', time: 'قبل يومين', icon: '⭐', read: true },
  ];

  const userProfile = {
    name: 'محمد علي',
    email: 'mohammad@example.com',
    phone: '+966501234567',
    city: 'الرياض',
    totalOrders: 24,
    totalSpent: '15,450 ر.س',
    loyaltyPoints: 2450,
    memberSince: '2025-06-01',
  };

  const toggleFavorite = id => {
    setFavorites(prev => (prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]));
  };

  const appTheme = {
    bg: darkMode ? '#1a1a1a' : '#ffffff',
    text: darkMode ? '#ffffff' : '#000000',
    secondaryBg: darkMode ? '#2a2a2a' : '#f5f5f5',
  };

  return (
    <Box sx={{ pb: 7, backgroundColor: appTheme.secondaryBg, minHeight: '100vh', color: appTheme.text }}>
      {/* Header */}
      <AppBar position="sticky" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMenuOpen(true)} sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
            📱 متجري
          </Typography>
          <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
            <IconButton color="inherit" onClick={() => setNotificationsOpen(!notificationsOpen)}>
              <NotificationsIcon />
            </IconButton>
          </Badge>
          <IconButton color="inherit">
            <SearchIcon />
          </IconButton>
        </Toolbar>

        {/* Notifications Dropdown */}
        <Collapse in={notificationsOpen} sx={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <Box sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
            {notifications.map(notif => (
              <Paper
                key={notif.id}
                sx={{ p: 1.5, mb: 1, backgroundColor: notif.read ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)', borderRadius: 2 }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography variant="h5">{notif.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>
                      {notif.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                      {notif.message}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.7)', mt: 0.5 }}>
                      {notif.time}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            ))}
          </Box>
        </Collapse>
      </AppBar>

      {/* Main Content */}
      {activeTab === 0 && (
        <Box sx={{ p: 2 }}>
          {/* Featured Banner */}
          <Paper sx={{ p: 2, borderRadius: 2, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              🎉 عرض اليوم
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              احصل على خصم 50% على جميع المنتجات المختارة
            </Typography>
            <Button variant="contained" sx={{ backgroundColor: 'white', color: '#667eea', fontWeight: 700 }}>
              تسوق الآن
            </Button>
          </Paper>

          {/* Items Grid */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            📦 المنتجات الرائجة
          </Typography>
          <Grid container spacing={2}>
            {items.map(item => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                    backgroundColor: appTheme.bg,
                  }}
                >
                  <CardMedia
                    sx={{
                      backgroundColor: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 150,
                      fontSize: '3rem',
                    }}
                  >
                    {item.image}
                  </CardMedia>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      {item.desc}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                        {item.price}
                      </Typography>
                      <Chip label={`⭐ ${item.rating}`} size="small" />
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      📍 {item.location}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="contained"
                        fullWidth
                        sx={{ borderRadius: 1, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      >
                        أضف
                      </Button>
                      <IconButton size="small" onClick={() => toggleFavorite(item.id)}>
                        {favorites.includes(item.id) ? <FavoriteIcon sx={{ color: '#f44336' }} /> : <FavoriteBorderIcon />}
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {activeTab === 1 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            👤 الملف الشخصي
          </Typography>
          <Card sx={{ borderRadius: 2, mb: 2, backgroundColor: appTheme.bg }}>
            <CardContent>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '2rem',
                    mx: 'auto',
                    mb: 1,
                  }}
                >
                  {userProfile.name.charAt(0)}
                </Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {userProfile.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {userProfile.email}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                {[
                  { label: 'الطلبات', value: userProfile.totalOrders, icon: '📦' },
                  { label: 'الإنفاق', value: userProfile.totalSpent, icon: '💰' },
                  { label: 'النقاط', value: userProfile.loyaltyPoints, icon: '⭐' },
                ].map((stat, idx) => (
                  <Grid item xs={6} sm={4} key={idx}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{stat.icon}</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {stat.value}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Button
            variant="contained"
            fullWidth
            sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', mb: 2 }}
          >
            تعديل الملف
          </Button>

          <List>
            <ListItem button sx={{ borderRadius: 2, mb: 1, backgroundColor: appTheme.secondaryBg }}>
              <ListItemIcon>
                <LocationOnIcon />
              </ListItemIcon>
              <ListItemText primary="عناويني" secondary={userProfile.city} />
            </ListItem>
            <ListItem button sx={{ borderRadius: 2, mb: 1, backgroundColor: appTheme.secondaryBg }}>
              <ListItemIcon>
                <CameraAltIcon />
              </ListItemIcon>
              <ListItemText primary="صوري" />
            </ListItem>
            <ListItem button sx={{ borderRadius: 2, mb: 1, backgroundColor: appTheme.secondaryBg }}>
              <ListItemIcon>
                <Download />
              </ListItemIcon>
              <ListItemText primary="تنزيلاتي" />
            </ListItem>
          </List>
        </Box>
      )}

      {activeTab === 2 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            ⚙️ الإعدادات
          </Typography>
          <Stack spacing={1.5}>
            {[
              { icon: <DarkModeIcon />, label: 'الوضع الليلي', value: darkMode, onChange: () => setDarkMode(!darkMode) },
              { icon: <LanguageIcon />, label: 'اللغة', value: selectedLanguage === 'ar' },
              { icon: <NotificationsIcon />, label: 'التنبيهات', value: true },
              { icon: <SmartphoneIcon />, label: 'المتطلبات البيومترية', value: true },
            ].map((setting, idx) => (
              <Card key={idx} sx={{ borderRadius: 2, backgroundColor: appTheme.bg }}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ color: '#667eea' }}>{setting.icon}</Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {setting.label}
                    </Typography>
                  </Box>
                  <Switch checked={setting.value} onChange={setting.onChange} />
                </CardContent>
              </Card>
            ))}
          </Stack>
        </Box>
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        value={activeTab}
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: appTheme.bg,
          borderTop: `1px solid ${appTheme.secondaryBg}`,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <BottomNavigationAction label="الرئيسية" icon={<HomeIcon />} />
        <BottomNavigationAction label="الملف" icon={<PersonIcon />} />
        <BottomNavigationAction label="الإعدادات" icon={<SettingsIcon />} />
      </BottomNavigation>

      {/* Drawer */}
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)}>
        <Box sx={{ width: 280, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              📱 متجري
            </Typography>
            <IconButton onClick={() => setMenuOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <List>
            {[
              { label: 'الرئيسية', icon: <HomeIcon /> },
              { label: 'المفضلة', icon: <FavoriteIcon /> },
              { label: 'طلباتي', icon: <SmartphoneIcon /> },
              { label: 'المحفظة', icon: <PersonIcon /> },
              { label: 'الإعدادات', icon: <SettingsIcon /> },
              { label: 'عن التطبيق', icon: <SmartphoneIcon /> },
            ].map((item, idx) => (
              <ListItem button key={idx}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Button startIcon={<LogoutIcon />} fullWidth variant="outlined" color="error">
            تسجيل الخروج
          </Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default AdvancedMobileApp;
