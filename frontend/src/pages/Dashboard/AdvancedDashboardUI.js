import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Tooltip,
  Divider,
  LinearProgress,
  Chip,
  TextField,
  AppBar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CssBaseline,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Analytics as AnalyticsIcon,
  Assessment as ReportIcon,
  Upload as UploadIcon,
  Star as StarIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import apiClient from 'services/api.client';
import { gradients, statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

// Sample data (fallback)
const dashboardData = {
  summary: {
    totalPrograms: 156,
    activePrograms: 98,
    completedPrograms: 42,
    successRate: 87.5,
  },
  recentActivity: [
    { id: 1, title: 'برنامج جديد تم إنشاؤه', timestamp: '2026-01-19 10:30', user: 'أحمد محمد' },
    { id: 2, title: 'تقرير تحليلات تم تصديره', timestamp: '2026-01-19 09:15', user: 'فاطمة علي' },
    { id: 3, title: 'جلسة جديدة تم تسجيلها', timestamp: '2026-01-18 14:45', user: 'محمد علي' },
  ],
  performanceMetrics: [
    { month: 'يناير', performance: 85, target: 90 },
    { month: 'فبراير', performance: 88, target: 90 },
    { month: 'مارس', performance: 92, target: 90 },
    { month: 'أبريل', performance: 87, target: 90 },
  ],
  topPrograms: [
    { name: 'العلاج الطبيعي', successRate: 95, beneficiaries: 45, icon: '🏥' },
    { name: 'الدعم النفسي', successRate: 92, beneficiaries: 38, icon: '🧠' },
    { name: 'التعليم الخاص', successRate: 88, beneficiaries: 52, icon: '📚' },
    { name: 'التأهيل المهني', successRate: 85, beneficiaries: 31, icon: '💼' },
  ],
  notifications: [
    { id: 1, message: 'تنبيه: 3 برامج تقترب من نهاية الفترة الزمنية', type: 'warning' },
    { id: 2, message: 'إنجاز: تم تحقيق هدف شهري 105%', type: 'success' },
    { id: 3, message: 'معلومة: نسخة احتياطية جديدة تم إنشاؤها بنجاح', type: 'info' },
  ],
};

function AdvancedDashboard() {
  const showSnackbar = useSnackbar();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [data, setData] = useState(dashboardData);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await apiClient.get('/admin/overview');
        const d = res?.data || res;
        if (d && typeof d === 'object') {
          setData(prev => ({
            summary: {
              totalPrograms: d.totalUsers || d.totalPrograms || prev.summary.totalPrograms,
              activePrograms: d.activeUsers || d.activePrograms || prev.summary.activePrograms,
              completedPrograms: d.completedPrograms || prev.summary.completedPrograms,
              successRate: d.successRate || prev.summary.successRate,
            },
            recentActivity: d.recentActivity || prev.recentActivity,
            performanceMetrics: d.performanceMetrics || prev.performanceMetrics,
            topPrograms: d.topPrograms || prev.topPrograms,
            notifications: d.notifications || prev.notifications,
          }));
        }
      } catch {
        // Keep static fallback
        showSnackbar('تعذر تحميل بيانات لوحة التحكم، يتم استخدام البيانات الافتراضية', 'warning');
      }
    };
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserMenuOpen = event => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const menuItems = [
    { icon: <DashboardIcon />, text: 'لوحة التحكم', path: '/dashboard' },
    { icon: <AnalyticsIcon />, text: 'التحليلات المتقدمة', path: '/analytics' },
    { icon: <ReportIcon />, text: 'التقارير', path: '/analytics/advanced' },
    { icon: <UploadIcon />, text: 'إدارة البيانات', path: '/export-import' },
    { icon: <SettingsIcon />, text: 'الإعدادات', path: '/settings' },
    { icon: <HelpIcon />, text: 'المساعدة', path: '/help' },
  ];

  const getNotificationColor = type => {
    switch (type) {
      case 'warning':
        return statusColors.warning;
      case 'success':
        return statusColors.success;
      case 'error':
        return statusColors.error;
      default:
        return statusColors.info;
    }
  };

  return (
    <Box
      sx={{ display: 'flex', backgroundColor: surfaceColors.pageBackground, minHeight: '100vh' }}
    >
      <CssBaseline />

      {/* Top AppBar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: 'white',
          color: neutralColors.textDark,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 1201,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
          }}
        >
          {/* Left: Menu + Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton
              aria-label="القائمة"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              sx={{ color: neutralColors.textDark }}
            >
              {sidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
            <Typography
              variant="h6"
              sx={{ fontWeight: 'bold', color: statusColors.primaryBlue, fontSize: '20px' }}
            >
              🏥 نظام إعادة التأهيل
            </Typography>
          </Box>

          {/* Center: Search */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: surfaceColors.lightGray,
              borderRadius: '20px',
              padding: '8px 16px',
              width: '300px',
            }}
          >
            <SearchIcon sx={{ color: neutralColors.textMuted, marginRight: 1 }} />
            <TextField
              placeholder="بحث سريع..."
              variant="standard"
              InputProps={{ disableUnderline: true }}
              sx={{ width: '100%' }}
            />
          </Box>

          {/* Right: Notifications + User */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="الإشعارات">
              <IconButton aria-label="إجراء" sx={{ color: neutralColors.textDark }}>
                <Badge badgeContent={3} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" sx={{ height: 30, margin: '0 8px' }} />

            <Tooltip title="حسابي">
              <IconButton
                aria-label="إجراء"
                onClick={handleUserMenuOpen}
                sx={{ color: neutralColors.textDark }}
              >
                <Badge
                  overlap="circular"
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  variant="dot"
                  sx={{
                    '& .MuiBadge-badge': {
                      backgroundColor: statusColors.success,
                      boxShadow: '0 0 0 2px white',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      backgroundColor: statusColors.primaryBlue,
                      cursor: 'pointer',
                    }}
                  >
                    أ
                  </Avatar>
                </Badge>
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={handleUserMenuClose}
            >
              <MenuItem>الملف الشخصي</MenuItem>
              <MenuItem>الإعدادات</MenuItem>
              <Divider />
              <MenuItem sx={{ color: 'error.main' }}>تسجيل الخروج</MenuItem>
            </Menu>
          </Box>
        </Box>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? 280 : 0,
          flexShrink: 0,
          transition: 'width 0.3s',
          '& .MuiDrawer-paper': {
            width: sidebarOpen ? 280 : 0,
            marginTop: '64px',
            backgroundColor: neutralColors.navyDark,
            color: 'white',
            transition: 'width 0.3s',
            overflowX: 'hidden',
          },
        }}
      >
        <List>
          {menuItems.map((item, index) => (
            <ListItem
              button
              key={index}
              sx={{
                padding: '12px 16px',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ color: statusColors.blueLight, minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              {sidebarOpen && <ListItemText primary={item.text} />}
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main Content */}
      <Box
        sx={{
          flex: 1,
          marginTop: '64px',
          padding: '20px',
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DashboardIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  لوحة التحكم المتقدمة
                </Typography>
                <Typography variant="body2">تحليلات ومؤشرات أداء النظام</Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ marginBottom: '30px' }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', marginBottom: '10px' }}>
              مرحباً بعودتك، أحمد 👋
            </Typography>
            <Typography variant="body2" color="textSecondary">
              الأحد، 19 يناير 2026 | 10:45 صباحاً
            </Typography>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ marginBottom: '30px' }}>
            {[
              {
                title: 'إجمالي البرامج',
                value: data.summary.totalPrograms,
                icon: '📊',
                color: statusColors.info,
              },
              {
                title: 'برامج نشطة',
                value: data.summary.activePrograms,
                icon: '⚡',
                color: statusColors.success,
              },
              {
                title: 'برامج مكتملة',
                value: data.summary.completedPrograms,
                icon: '✅',
                color: statusColors.warning,
              },
              {
                title: 'معدل النجاح',
                value: `${data.summary.successRate}%`,
                icon: '🎯',
                color: statusColors.purple,
              },
            ].map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card
                  sx={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      transform: 'translateY(-4px)',
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography
                          color="textSecondary"
                          sx={{ fontSize: '12px', marginBottom: '8px' }}
                        >
                          {card.title}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: card.color }}>
                          {card.value}
                        </Typography>
                      </Box>
                      <Box sx={{ fontSize: '36px' }}>{card.icon}</Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Charts & Analytics */}
          <Grid container spacing={3} sx={{ marginBottom: '30px' }}>
            {/* Performance Chart */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: '12px' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ marginBottom: '16px', fontWeight: 'bold' }}>
                    📈 أداء البرامج
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.performanceMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="performance"
                        stroke={statusColors.info}
                        name="الأداء الفعلي"
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke={statusColors.warning}
                        name="الهدف"
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Top Programs */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: '12px', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ marginBottom: '16px', fontWeight: 'bold' }}>
                    🏆 أفضل البرامج
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.topPrograms.map((program, index) => (
                      <Box key={index}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography sx={{ fontSize: '20px' }}>{program.icon}</Typography>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {program.name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {program.beneficiaries} مستفيد
                              </Typography>
                            </Box>
                          </Box>
                          <Chip
                            label={`${program.successRate}%`}
                            color={program.successRate >= 90 ? 'success' : 'warning'}
                            size="small"
                            icon={<StarIcon />}
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={program.successRate}
                          sx={{ height: '6px', borderRadius: '3px' }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Activity & Notifications */}
          <Grid container spacing={3}>
            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '12px' }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      📋 آخر الأنشطة
                    </Typography>
                    <Button size="small" variant="text">
                      عرض الكل
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.recentActivity.map(activity => (
                      <Box
                        key={activity.id}
                        sx={{
                          padding: '12px',
                          backgroundColor: surfaceColors.lightGray,
                          borderRadius: '8px',
                          borderRight: `3px solid ${statusColors.info}`,
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" sx={{ fontWeight: '500' }}>
                            {activity.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {activity.timestamp}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary">
                          بواسطة: {activity.user}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Notifications */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '12px' }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      🔔 الإشعارات
                    </Typography>
                    <Button size="small" variant="text">
                      تنظيف الكل
                    </Button>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.notifications.map(notification => (
                      <Box
                        key={notification.id}
                        sx={{
                          padding: '12px',
                          backgroundColor: getNotificationColor(notification.type) + '15',
                          borderRadius: '8px',
                          borderLeft: `3px solid ${getNotificationColor(notification.type)}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography variant="body2">{notification.message}</Typography>
                        <IconButton aria-label="إغلاق" size="small">
                          <CloseIcon sx={{ fontSize: '18px' }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default AdvancedDashboard;
