import { useState, useEffect } from 'react';

import apiClient from 'services/api.client';
import { gradients, statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ═══ Helpers ═══ */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 6) return 'مساء الخير';
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  return 'مساء الخير';
}

function getFormattedDate() {
  const d = new Date();
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  return `${days[d.getDay()]}، ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getFormattedTime() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'مساءً' : 'صباحاً';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

// eslint-disable-next-line no-unused-vars
function getNotificationIcon(type) {
  switch (type) {
    case 'warning':
      return <WarningIcon sx={{ fontSize: 20, color: statusColors.warning }} />;
    case 'success':
      return <CheckCircleIcon sx={{ fontSize: 20, color: statusColors.success }} />;
    case 'error':
      return <ErrorIcon sx={{ fontSize: 20, color: statusColors.error }} />;
    default:
      return <InfoIcon sx={{ fontSize: 20, color: statusColors.info }} />;
  }
}

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

  const getNotificationIcon = type => {
    const iconSx = { fontSize: 20 };
    switch (type) {
      case 'warning':
        return <WarningIcon sx={{ ...iconSx, color: statusColors.warning }} />;
      case 'success':
        return <CheckCircleIcon sx={{ ...iconSx, color: statusColors.success }} />;
      case 'error':
        return <ErrorIcon sx={{ ...iconSx, color: statusColors.error }} />;
      default:
        return <InfoIcon sx={{ ...iconSx, color: statusColors.info }} />;
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
          padding: '24px',
          transition: 'all 0.3s ease',
        }}
      >
        <Container maxWidth="xl">
          {/* Welcome Header — Gradient Banner */}
          <Fade in timeout={600}>
            <Box
              sx={{
                background: gradients.primary,
                borderRadius: '20px',
                p: { xs: 3, md: 4 },
                mb: 4,
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(79,70,229,0.18)',
              }}
            >
              {/* Decorative circles */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -40,
                  left: -40,
                  width: 160,
                  height: 160,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.06)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: -30,
                  right: -20,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.04)',
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 60,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.15)',
                }}
              />

              <Box
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '14px',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        backdropFilter: 'blur(10px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <DashboardIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="h4"
                        sx={{
                          fontWeight: 800,
                          fontSize: { xs: '1.5rem', md: '1.8rem' },
                          lineHeight: 1.2,
                        }}
                      >
                        {getGreeting()}، أحمد 👋
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.5 }}>
                        لوحة التحكم المتقدمة — تحليلات ومؤشرات أداء النظام
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, opacity: 0.85 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarTodayIcon sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {getFormattedDate()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AccessTimeIcon sx={{ fontSize: 18 }} />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {getFormattedTime()}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Fade>

          {/* Summary Cards — Enhanced with trends */}
          <Grid container spacing={3} sx={{ marginBottom: '30px' }}>
            {[
              {
                title: 'إجمالي البرامج',
                value: data.summary.totalPrograms,
                icon: '📊',
                color: statusColors.info,
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                trend: '+12%',
                trendUp: true,
                bgAlpha: 'rgba(102,126,234,0.08)',
              },
              {
                title: 'برامج نشطة',
                value: data.summary.activePrograms,
                icon: '⚡',
                color: statusColors.success,
                gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                trend: '+8%',
                trendUp: true,
                bgAlpha: 'rgba(67,233,123,0.08)',
              },
              {
                title: 'برامج مكتملة',
                value: data.summary.completedPrograms,
                icon: '✅',
                color: statusColors.warning,
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                trend: '+5%',
                trendUp: true,
                bgAlpha: 'rgba(240,147,251,0.08)',
              },
              {
                title: 'معدل النجاح',
                value: `${data.summary.successRate}%`,
                icon: '🎯',
                color: statusColors.purple,
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                trend: '+3.2%',
                trendUp: true,
                bgAlpha: 'rgba(79,172,254,0.08)',
              },
            ].map((card, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Grow in timeout={400 + index * 120}>
                  <Card
                    sx={{
                      backgroundColor: 'white',
                      borderRadius: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid rgba(0,0,0,0.04)',
                      overflow: 'visible',
                      position: 'relative',
                      '&:hover': {
                        boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
                        transform: 'translateY(-6px)',
                      },
                    }}
                  >
                    {/* Top gradient line */}
                    <Box
                      sx={{ height: 3, background: card.gradient, borderRadius: '16px 16px 0 0' }}
                    />
                    <CardContent sx={{ p: '20px !important' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            color="textSecondary"
                            sx={{ fontSize: '13px', mb: 1.5, fontWeight: 500 }}
                          >
                            {card.title}
                          </Typography>
                          <Typography
                            variant="h3"
                            sx={{
                              fontWeight: 800,
                              color: neutralColors.textDark,
                              fontSize: '2rem',
                              lineHeight: 1,
                            }}
                          >
                            {card.value}
                          </Typography>
                          {/* Trend indicator */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5 }}>
                            {card.trendUp ? (
                              <TrendingUpIcon sx={{ fontSize: 16, color: statusColors.success }} />
                            ) : (
                              <TrendingDownIcon sx={{ fontSize: 16, color: statusColors.error }} />
                            )}
                            <Typography
                              sx={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: card.trendUp ? statusColors.success : statusColors.error,
                              }}
                            >
                              {card.trend}
                            </Typography>
                            <Typography sx={{ fontSize: '11px', color: 'text.disabled', mr: 0.5 }}>
                              من الشهر السابق
                            </Typography>
                          </Box>
                        </Box>
                        {/* Icon with gradient background */}
                        <Box
                          sx={{
                            width: 56,
                            height: 56,
                            borderRadius: '16px',
                            background: card.bgAlpha,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            flexShrink: 0,
                            transition: 'transform 0.3s ease',
                            '&:hover': { transform: 'scale(1.1) rotate(-8deg)' },
                          }}
                        >
                          {card.icon}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grow>
              </Grid>
            ))}
          </Grid>

          {/* Charts & Analytics */}
          <Grid container spacing={3} sx={{ marginBottom: '30px' }}>
            {/* Performance Chart */}
            <Grid item xs={12} md={8}>
              <Fade in timeout={700}>
                <Card
                  sx={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s',
                    '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: '24px !important' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            background: 'rgba(102,126,234,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AnalyticsIcon sx={{ fontSize: 22, color: statusColors.info }} />
                        </Box>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                            أداء البرامج
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            مقارنة الأداء الفعلي بالمستهدف
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label="آخر 6 أشهر"
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: '8px', fontWeight: 500 }}
                      />
                    </Box>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={data.performanceMetrics}>
                        <defs>
                          <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={statusColors.info} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={statusColors.info} stopOpacity={0.01} />
                          </linearGradient>
                          <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={statusColors.warning} stopOpacity={0.1} />
                            <stop
                              offset="95%"
                              stopColor={statusColors.warning}
                              stopOpacity={0.01}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#999' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                        <ChartTooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: 'none',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="performance"
                          stroke={statusColors.info}
                          fill="url(#colorPerf)"
                          strokeWidth={2.5}
                          name="الأداء الفعلي"
                          dot={{ r: 4, fill: statusColors.info }}
                          activeDot={{ r: 6 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="target"
                          stroke={statusColors.warning}
                          fill="url(#colorTarget)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name="الهدف"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Top Programs */}
            <Grid item xs={12} md={4}>
              <Fade in timeout={800}>
                <Card
                  sx={{
                    borderRadius: '20px',
                    height: '100%',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s',
                    '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: '24px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '12px',
                          background: 'rgba(251,191,36,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <StarIcon sx={{ fontSize: 22, color: '#F59E0B' }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                        أفضل البرامج
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      {data.topPrograms.map((program, index) => (
                        <Box
                          key={index}
                          sx={{
                            p: 1.5,
                            borderRadius: '14px',
                            bgcolor: 'rgba(0,0,0,0.015)',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.03)' },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box
                                sx={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: '10px',
                                  bgcolor:
                                    index === 0
                                      ? 'rgba(67,233,123,0.1)'
                                      : index === 1
                                        ? 'rgba(102,126,234,0.1)'
                                        : 'rgba(240,147,251,0.1)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '18px',
                                }}
                              >
                                {program.icon}
                              </Box>
                              <Box>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: 600, lineHeight: 1.3 }}
                                >
                                  {program.name}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  {program.beneficiaries} مستفيد
                                </Typography>
                              </Box>
                            </Box>
                            <Chip
                              label={`${program.successRate}%`}
                              size="small"
                              sx={{
                                bgcolor:
                                  program.successRate >= 90
                                    ? 'rgba(16,185,129,0.1)'
                                    : 'rgba(245,158,11,0.1)',
                                color: program.successRate >= 90 ? '#059669' : '#D97706',
                                fontWeight: 700,
                                borderRadius: '8px',
                                height: 26,
                              }}
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={program.successRate}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(0,0,0,0.04)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 3,
                                background:
                                  index === 0
                                    ? 'linear-gradient(90deg, #43e97b, #38f9d7)'
                                    : index === 1
                                      ? 'linear-gradient(90deg, #667eea, #764ba2)'
                                      : 'linear-gradient(90deg, #f093fb, #f5576c)',
                              },
                            }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          </Grid>

          {/* Recent Activity & Notifications */}
          <Grid container spacing={3}>
            {/* Recent Activity */}
            <Grid item xs={12} md={6}>
              <Fade in timeout={900}>
                <Card
                  sx={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s',
                    '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: '24px !important' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '12px',
                            background: 'rgba(59,130,246,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AccessTimeIcon sx={{ fontSize: 22, color: '#3B82F6' }} />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                          آخر الأنشطة
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="text"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 16, mr: -0.5, ml: 0.5 }} />}
                        sx={{ borderRadius: '10px', fontWeight: 600, fontSize: '12px' }}
                      >
                        عرض الكل
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {data.recentActivity.map((activity, idx) => (
                        <Box
                          key={activity.id}
                          sx={{
                            p: '14px 16px',
                            bgcolor: 'rgba(0,0,0,0.015)',
                            borderRadius: '14px',
                            borderRight: `3px solid ${idx % 3 === 0 ? statusColors.info : idx % 3 === 1 ? statusColors.success : statusColors.warning}`,
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.03)',
                              transform: 'translateX(-4px)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, lineHeight: 1.5, fontSize: '13px' }}
                            >
                              {activity.title}
                            </Typography>
                            <Chip
                              label={activity.timestamp}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontSize: '10px',
                                height: 22,
                                borderRadius: '6px',
                                borderColor: 'rgba(0,0,0,0.08)',
                                color: 'text.secondary',
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Box
                              sx={{
                                width: 20,
                                height: 20,
                                borderRadius: '6px',
                                bgcolor: 'rgba(99,102,241,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                              }}
                            >
                              👤
                            </Box>
                            <Typography
                              variant="caption"
                              color="textSecondary"
                              sx={{ fontWeight: 500 }}
                            >
                              {activity.user}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>

            {/* Notifications */}
            <Grid item xs={12} md={6}>
              <Fade in timeout={1000}>
                <Card
                  sx={{
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.04)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.3s',
                    '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.08)' },
                  }}
                >
                  <CardContent sx={{ p: '24px !important' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 3,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Badge
                          badgeContent={data.notifications.length}
                          color="error"
                          sx={{
                            '& .MuiBadge-badge': { fontSize: '10px', height: 18, minWidth: 18 },
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '12px',
                              background: 'rgba(239,68,68,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <NotificationsIcon sx={{ fontSize: 22, color: '#EF4444' }} />
                          </Box>
                        </Badge>
                        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
                          الإشعارات
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="text"
                        sx={{
                          borderRadius: '10px',
                          fontWeight: 600,
                          fontSize: '12px',
                          color: 'text.secondary',
                        }}
                      >
                        تنظيف الكل
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {data.notifications.map(notification => (
                        <Box
                          key={notification.id}
                          sx={{
                            p: '14px 16px',
                            backgroundColor: getNotificationColor(notification.type) + '08',
                            borderRadius: '14px',
                            borderLeft: `3px solid ${getNotificationColor(notification.type)}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 2,
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: getNotificationColor(notification.type) + '12',
                              transform: 'translateX(4px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                            {getNotificationIcon(notification.type)}
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500, fontSize: '13px', lineHeight: 1.5 }}
                            >
                              {notification.message}
                            </Typography>
                          </Box>
                          <IconButton
                            aria-label="إغلاق"
                            size="small"
                            sx={{
                              opacity: 0.4,
                              '&:hover': { opacity: 1, bgcolor: 'rgba(0,0,0,0.04)' },
                            }}
                          >
                            <CloseIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
}

export default AdvancedDashboard;
