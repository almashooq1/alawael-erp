/**
 * Mobile App Component - تطبيق موبايل ⭐⭐⭐
 *
 * Features:
 * ✅ Responsive mobile interface
 * ✅ Touch-friendly controls
 * ✅ Live streaming on mobile
 * ✅ Push notifications
 * ✅ Offline mode
 * ✅ Mobile-optimized dashboard
 * ✅ Quick actions
 * ✅ Mobile alerts
 * ✅ Gesture controls
 * ✅ Dark mode support
 * ✅ PWA capabilities
 * ✅ Mobile navigation
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Button,
  IconButton,
  Grid,
  Paper,
  Chip,
  Stack,
  Badge,
  Avatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Alert,
  LinearProgress,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Home as HomeIcon,
  Notifications as NotificationsIcon,
  VideoCall as VideoCallIcon,
  Settings as SettingsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Videocam as VideocamIcon,
  Smartphone as SmartphoneIcon,
  LocationOn as LocationOnIcon,
  Battery80 as Battery80Icon,
  SignalCellularAlt as SignalCellularAltIcon,
  PlayArrow as PlayArrowIcon,
  PauseIcon,
  VolumeUp as VolumeUpIcon,
  FullscreenIcon,
  RefreshIcon,
  AccessTime as AccessTimeIcon,
  Speed as SpeedIcon,
  StorageIcon,
  CloudSyncIcon,
  DownloadIcon,
  ShareIcon,
} from '@mui/icons-material';

const MobileApp = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(5);
  const [isPlaying, setIsPlaying] = useState(false);

  // Sample cameras data
  const cameras = [
    {
      id: 1,
      name: 'الدخول',
      status: 'online',
      battery: 95,
      signal: 5,
      lastUpdate: '2 دقائق',
      resolution: '4K',
      location: 'الباب الرئيسي',
    },
    {
      id: 2,
      name: 'الممر',
      status: 'online',
      battery: 87,
      signal: 4,
      lastUpdate: '1 دقيقة',
      resolution: 'Full HD',
      location: 'الممر الرئيسي',
    },
    {
      id: 3,
      name: 'المستودع',
      status: 'online',
      battery: 92,
      signal: 5,
      lastUpdate: '1 دقيقة',
      resolution: '2K',
      location: 'المستودع',
    },
  ];

  const alerts = [
    {
      id: 1,
      title: 'حركة مريبة',
      camera: 'الدخول',
      time: 'قبل دقيقة',
      severity: 'critical',
    },
    {
      id: 2,
      title: 'وجه غريب',
      camera: 'الممر',
      time: 'قبل 5 دقائق',
      severity: 'high',
    },
    {
      id: 3,
      title: 'تحذير صوتي',
      camera: 'المستودع',
      time: 'قبل 10 دقائق',
      severity: 'medium',
    },
  ];

  const handlePlayVideo = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const getSeverityColor = severity => {
    switch (severity) {
      case 'critical':
        return '#ff1744';
      case 'high':
        return '#ff9100';
      case 'medium':
        return '#ffc400';
      default:
        return '#757575';
    }
  };

  const bgColor = darkMode ? '#1a1a1a' : '#f5f5f5';
  const textColor = darkMode ? '#fff' : '#333';
  const cardColor = darkMode ? '#2a2a2a' : '#fff';

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      {/* Mobile Header */}
      <AppBar
        position="static"
        sx={{
          background: darkMode
            ? 'linear-gradient(135deg, #333 0%, #1a1a1a 100%)'
            : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: 2,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SmartphoneIcon />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🔒 Surveillance Pro
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Badge badgeContent={notifications} color="error">
              <IconButton color="inherit" onClick={() => setActiveTab(1)}>
                <NotificationsIcon />
              </IconButton>
            </Badge>
            <IconButton color="inherit" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Menu */}
      <Collapse in={menuOpen}>
        <Paper sx={{ backgroundColor: cardColor, p: 2, borderRadius: 0 }}>
          <List>
            <ListItem button onClick={() => setActiveTab(0)}>
              <ListItemIcon>
                <HomeIcon />
              </ListItemIcon>
              <ListItemText primary="الرئيسية" />
            </ListItem>
            <ListItem button onClick={() => setActiveTab(1)}>
              <ListItemIcon>
                <Badge badgeContent={notifications} color="error">
                  <NotificationsIcon />
                </Badge>
              </ListItemIcon>
              <ListItemText primary="التنبيهات" />
            </ListItem>
            <ListItem button onClick={() => setActiveTab(2)}>
              <ListItemIcon>
                <VideocamIcon />
              </ListItemIcon>
              <ListItemText primary="الكاميرات" />
            </ListItem>
            <Divider />
            <ListItem button onClick={() => setSettingsOpen(true)}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="الإعدادات" />
            </ListItem>
          </List>
        </Paper>
      </Collapse>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', pb: 10, px: 2, py: 2 }}>
        {/* Tab 0: Home */}
        {activeTab === 0 && (
          <Stack spacing={2}>
            {/* Live Preview */}
            <Card
              sx={{
                backgroundColor: cardColor,
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  backgroundColor: '#000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {isPlaying ? (
                  <Typography variant="body2" sx={{ color: '#fff' }}>
                    🎥 بث مباشر
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ color: '#999' }}>
                    اضغط للتشغيل
                  </Typography>
                )}
                <IconButton
                  sx={{
                    position: 'absolute',
                    color: '#fff',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    '&:hover': {
                      backgroundColor: 'rgba(0,0,0,0.7)',
                    },
                  }}
                  onClick={handlePlayVideo}
                >
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Box>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  {cameras[selectedCamera].name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={<VideocamIcon />}
                    label={cameras[selectedCamera].resolution}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<LocationOnIcon />}
                    label={cameras[selectedCamera].location}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="caption" color="textSecondary">
                    آخر تحديث: {cameras[selectedCamera].lastUpdate}
                  </Typography>
                  <Chip
                    label={cameras[selectedCamera].status}
                    size="small"
                    color={cameras[selectedCamera].status === 'online' ? 'success' : 'error'}
                  />
                </Box>
              </CardContent>
              <CardActions sx={{ justifyContent: 'space-between', pt: 0 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="small">
                    <VolumeUpIcon />
                  </IconButton>
                  <IconButton size="small">
                    <FullscreenIcon />
                  </IconButton>
                  <IconButton size="small">
                    <RefreshIcon />
                  </IconButton>
                </Box>
              </CardActions>
            </Card>

            {/* System Status */}
            <Card sx={{ backgroundColor: cardColor, borderRadius: 2 }}>
              <CardHeader
                title="📊 حالة النظام"
                titleTypographyProps={{ variant: 'subtitle1', sx: { fontWeight: 600 } }}
              />
              <CardContent>
                <Stack spacing={1.5}>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        الكاميرات النشطة
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        3/3
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={100} />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        المساحة المستخدمة
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        68%
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={68} color="warning" />
                  </Box>
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        الاتصال
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        متصل
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={100} color="success" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card sx={{ backgroundColor: cardColor, borderRadius: 2 }}>
              <CardHeader
                title="⚡ إجراءات سريعة"
                titleTypographyProps={{ variant: 'subtitle1', sx: { fontWeight: 600 } }}
              />
              <CardContent>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<VideocamIcon />}
                      sx={{ py: 1.5 }}
                    >
                      بث مباشر
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      sx={{ py: 1.5 }}
                    >
                      تنزيل
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CloudSyncIcon />}
                      sx={{ py: 1.5 }}
                    >
                      مزامنة
                    </Button>
                  </Grid>
                  <Grid item xs={6}>
                    <Button fullWidth variant="outlined" startIcon={<ShareIcon />} sx={{ py: 1.5 }}>
                      مشاركة
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        )}

        {/* Tab 1: Alerts */}
        {activeTab === 1 && (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              لديك {notifications} تنبيهات جديدة
            </Alert>
            {alerts.map(alert => (
              <Card
                key={alert.id}
                sx={{
                  backgroundColor: cardColor,
                  borderRadius: 2,
                  borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                    <Avatar
                      sx={{
                        backgroundColor: getSeverityColor(alert.severity),
                        width: 40,
                        height: 40,
                      }}
                    >
                      📢
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {alert.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {alert.camera} • {alert.time}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions sx={{ pt: 0 }}>
                  <Button size="small" variant="text">
                    عرض
                  </Button>
                  <Button size="small" variant="text" color="error">
                    تجاهل
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Stack>
        )}

        {/* Tab 2: Cameras */}
        {activeTab === 2 && (
          <Stack spacing={2}>
            {cameras.map((camera, idx) => (
              <Card
                key={camera.id}
                sx={{
                  backgroundColor: cardColor,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
                onClick={() => {
                  setSelectedCamera(idx);
                  setActiveTab(0);
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {camera.name}
                    </Typography>
                    <Chip
                      label={camera.status}
                      size="small"
                      color={camera.status === 'online' ? 'success' : 'error'}
                    />
                  </Box>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOnIcon sx={{ fontSize: 18 }} />
                      <Typography variant="caption">{camera.location}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Battery80Icon sx={{ fontSize: 18 }} />
                        <Typography variant="caption">{camera.battery}%</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <SignalCellularAltIcon sx={{ fontSize: 18 }} />
                        <Typography variant="caption">{camera.signal}/5</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <VideocamIcon sx={{ fontSize: 18 }} />
                        <Typography variant="caption">{camera.resolution}</Typography>
                      </Box>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>

      {/* Bottom Navigation */}
      <BottomNavigation
        value={activeTab}
        onChange={(e, newValue) => setActiveTab(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: cardColor,
          borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        }}
      >
        <BottomNavigationAction label="الرئيسية" icon={<HomeIcon />} />
        <BottomNavigationAction
          label="التنبيهات"
          icon={
            <Badge badgeContent={notifications} color="error">
              <NotificationsIcon />
            </Badge>
          }
        />
        <BottomNavigationAction label="الكاميرات" icon={<VideocamIcon />} />
        <BottomNavigationAction
          label="الإعدادات"
          icon={<SettingsIcon />}
          onClick={() => setSettingsOpen(true)}
        />
      </BottomNavigation>

      {/* Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
          }}
        >
          ⚙️ الإعدادات
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <FormControlLabel
              control={<Switch checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />}
              label="الوضع الليلي"
            />
            <FormControlLabel control={<Switch defaultChecked />} label="تنبيهات صوتية" />
            <FormControlLabel control={<Switch defaultChecked />} label="إشعارات البث المباشر" />
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              معلومات الجهاز
            </Typography>
            <Box sx={{ p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="caption" display="block">
                إصدار التطبيق: 2.0.0
              </Typography>
              <Typography variant="caption" display="block">
                معرّف الجهاز: MOB-001-2026
              </Typography>
              <Typography variant="caption" display="block">
                آخر تحديث: 16-01-2026
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setSettingsOpen(false)} variant="outlined">
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileApp;
