/**
 * لوحة التحكم الرئيسية المحسّنة
 * Enhanced Admin Dashboard
 * 
 * Features:
 * - Real-time statistics with animations
 * - Interactive charts and graphs
 * - Quick actions panel
 * - Recent activities feed
 * - System alerts and notifications
 * - Performance metrics
 * - Customizable widgets
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  AvatarGroup,
  IconButton,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Paper,
  Stack,
  Divider,
  Badge,
  Tooltip,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  EventNote,
  AttachMoney,
  Notifications,
  MoreVert,
  Schedule,
  CheckCircle,
  Warning,
  Info,
  CalendarToday,
  Assessment,
  School,
  LocalHospital,
  Assignment,
  ArrowForward,
  Refresh
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import AdvancedChartsComponent from '../../components/AdvancedChartsComponent';
import SmartReportsDashboard from '../../components/SmartReportsDashboard';
import notificationService from '../../services/notificationService';
import exportService from '../../services/exportService';

const EnhancedAdminDashboard = () => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('week');
  const [anchorEl, setAnchorEl] = useState(null);

  // Sample data
  const statistics = {
    beneficiaries: { total: 847, change: +12, trend: 'up' },
    sessions: { total: 1234, change: +8, trend: 'up' },
    revenue: { total: 458900, change: -3, trend: 'down' },
    attendance: { total: 94, change: +2, trend: 'up' }
  };

  const revenueData = [
    { month: 'يناير', revenue: 45000, expenses: 32000 },
    { month: 'فبراير', revenue: 52000, expenses: 35000 },
    { month: 'مارس', revenue: 48000, expenses: 33000 },
    { month: 'أبريل', revenue: 61000, expenses: 38000 },
    { month: 'مايو', revenue: 55000, expenses: 36000 },
    { month: 'يونيو', revenue: 67000, expenses: 40000 }
  ];

  const sessionsByCategory = [
    { name: 'علاج طبيعي', value: 450, color: '#3f51b5' },
    { name: 'علاج وظيفي', value: 320, color: '#2196f3' },
    { name: 'نطق وتخاطب', value: 280, color: '#00bcd4' },
    { name: 'علاج سلوكي', value: 184, color: '#009688' }
  ];

  const weeklyProgress = [
    { day: 'السبت', sessions: 45, completed: 42 },
    { day: 'الأحد', sessions: 52, completed: 50 },
    { day: 'الاثنين', sessions: 48, completed: 45 },
    { day: 'الثلاثاء', sessions: 61, completed: 58 },
    { day: 'الأربعاء', sessions: 55, completed: 53 },
    { day: 'الخميس', sessions: 49, completed: 47 },
    { day: 'الجمعة', sessions: 38, completed: 38 }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'beneficiary',
      title: 'مستفيد جديد',
      description: 'تم إضافة أحمد محمد إلى النظام',
      time: 'منذ 5 دقائق',
      icon: <People />,
      color: '#2196f3'
    },
    {
      id: 2,
      type: 'session',
      title: 'جلسة مكتملة',
      description: 'تم إكمال جلسة علاج طبيعي لفاطمة أحمد',
      time: 'منذ 15 دقيقة',
      icon: <CheckCircle />,
      color: '#4caf50'
    },
    {
      id: 3,
      type: 'payment',
      title: 'دفعة جديدة',
      description: 'تم استلام دفعة بقيمة 3,500 ريال',
      time: 'منذ ساعة',
      icon: <AttachMoney />,
      color: '#ff9800'
    },
    {
      id: 4,
      type: 'alert',
      title: 'تنبيه',
      description: 'جلسة خالد سعيد تحتاج إلى مراجعة',
      time: 'منذ ساعتين',
      icon: <Warning />,
      color: '#f44336'
    },
    {
      id: 5,
      type: 'report',
      title: 'تقرير جديد',
      description: 'تم إنشاء تقرير التقدم الشهري',
      time: 'منذ 3 ساعات',
      icon: <Assessment />,
      color: '#9c27b0'
    }
  ];

  const upcomingAppointments = [
    {
      id: 1,
      beneficiary: 'أحمد محمد علي',
      type: 'علاج طبيعي',
      time: '10:00 صباحاً',
      therapist: 'د. سارة أحمد',
      status: 'confirmed'
    },
    {
      id: 2,
      beneficiary: 'فاطمة حسن',
      type: 'نطق وتخاطب',
      time: '11:30 صباحاً',
      therapist: 'أ. محمد علي',
      status: 'pending'
    },
    {
      id: 3,
      beneficiary: 'خالد سعيد',
      type: 'علاج وظيفي',
      time: '02:00 مساءً',
      therapist: 'د. نورة خالد',
      status: 'confirmed'
    }
  ];

  const quickActions = [
    { title: 'إضافة مستفيد', icon: <People />, color: '#2196f3', path: '/beneficiaries/new' },
    { title: 'جدولة جلسة', icon: <CalendarToday />, color: '#4caf50', path: '/sessions/schedule' },
    { title: 'إنشاء تقرير', icon: <Assessment />, color: '#ff9800', path: '/reports/create' },
    { title: 'إدارة الموظفين', icon: <School />, color: '#9c27b0', path: '/staff' }
  ];

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // تفعيل نظام الإشعارات الفعلي
  // Activate real-time notifications
  useEffect(() => {
    // محاولة الاتصال بخادم WebSocket
    // Try to connect to WebSocket server
    try {
      notificationService.connect('ws://localhost:5000/notifications');
      console.log('Notification service initialized');
    } catch (error) {
      console.warn('Could not connect to notification server:', error);
      // سيحدث fallback إلى polling تلقائياً
      // Will fallback to polling automatically
    }

    // الاستماع للإشعارات الجديدة
    // Listen for new notifications
    notificationService.on('notifications', (notification) => {
      console.log('New notification:', notification);
    });

    return () => {
      // تنظيف الاتصال عند إزالة المكون
      // Cleanup connection when component unmounts
      if (notificationService.isConnected()) {
        notificationService.disconnect?.();
      }
    };
  }, []);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              لوحة التحكم
            </Typography>
            <Typography variant="body2" color="text.secondary">
              مرحباً بك، إليك ملخص عن نشاط المركز اليوم
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <IconButton color="primary">
                <Badge badgeContent={12} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={() => window.location.reload()}
              >
                تحديث
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          {
            title: 'إجمالي المستفيدين',
            value: statistics.beneficiaries.total,
            change: statistics.beneficiaries.change,
            trend: statistics.beneficiaries.trend,
            icon: <People fontSize="large" />,
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          },
          {
            title: 'الجلسات الشهرية',
            value: statistics.sessions.total,
            change: statistics.sessions.change,
            trend: statistics.sessions.trend,
            icon: <EventNote fontSize="large" />,
            color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
          },
          {
            title: 'الإيرادات (ريال)',
            value: statistics.revenue.total.toLocaleString(),
            change: statistics.revenue.change,
            trend: statistics.revenue.trend,
            icon: <AttachMoney fontSize="large" />,
            color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
          },
          {
            title: 'نسبة الحضور',
            value: `${statistics.attendance.total}%`,
            change: statistics.attendance.change,
            trend: statistics.attendance.trend,
            icon: <CheckCircle fontSize="large" />,
            color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
          }
        ].map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: index * 0.1 }}
            >
              <Card
                sx={{
                  background: stat.color,
                  color: 'white',
                  height: '100%',
                  transition: 'transform 0.3s',
                  '&:hover': { transform: 'translateY(-8px)' }
                }}
                elevation={3}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                      <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                        {stat.title}
                      </Typography>
                      <Typography variant="h4" fontWeight="bold">
                        {stat.value}
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                      {stat.icon}
                    </Avatar>
                  </Box>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {stat.trend === 'up' ? (
                      <TrendingUp fontSize="small" />
                    ) : (
                      <TrendingDown fontSize="small" />
                    )}
                    <Typography variant="body2">
                      {stat.change > 0 ? '+' : ''}{stat.change}% من الشهر الماضي
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue Chart */}
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  الإيرادات والمصروفات
                </Typography>
                <Stack direction="row" spacing={1}>
                  {['أسبوع', 'شهر', 'سنة'].map((range) => (
                    <Chip
                      key={range}
                      label={range}
                      onClick={() => setTimeRange(range)}
                      variant={timeRange === range ? 'filled' : 'outlined'}
                      color="primary"
                      size="small"
                    />
                  ))}
                </Stack>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2196f3" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f44336" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2196f3"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    name="الإيرادات"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f44336"
                    fillOpacity={1}
                    fill="url(#colorExpenses)"
                    name="المصروفات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sessions by Category */}
        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                توزيع الجلسات
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sessionsByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {sessionsByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Weekly Progress */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                التقدم الأسبوعي
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="sessions" fill="#2196f3" name="المجدولة" />
                  <Bar dataKey="completed" fill="#4caf50" name="المنجزة" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                إجراءات سريعة
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {quickActions.map((action, index) => (
                  <Grid item xs={6} key={index}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        border: '2px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          borderColor: action.color,
                          transform: 'translateY(-4px)',
                          boxShadow: 3
                        }
                      }}
                      onClick={() => navigate(action.path)}
                    >
                      <Avatar
                        sx={{
                          bgcolor: action.color,
                          width: 56,
                          height: 56,
                          mx: 'auto',
                          mb: 1
                        }}
                      >
                        {action.icon}
                      </Avatar>
                      <Typography variant="body2" fontWeight="medium">
                        {action.title}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  النشاطات الأخيرة
                </Typography>
                <Button size="small" endIcon={<ArrowForward />}>
                  عرض الكل
                </Button>
              </Box>
              <List>
                {recentActivities.map((activity) => (
                  <ListItem
                    key={activity.id}
                    disablePadding
                    sx={{
                      mb: 1,
                      borderRadius: 1,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <ListItemButton>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: activity.color }}>
                          {activity.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.title}
                        secondary={
                          <>
                            <Typography component="span" variant="body2">
                              {activity.description}
                            </Typography>
                            <br />
                            <Typography component="span" variant="caption" color="text.secondary">
                              {activity.time}
                            </Typography>
                          </>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Appointments */}
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  المواعيد القادمة
                </Typography>
                <Chip label="اليوم" color="primary" size="small" />
              </Box>
              <List>
                {upcomingAppointments.map((appointment) => (
                  <ListItem
                    key={appointment.id}
                    sx={{
                      mb: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      '&:hover': { borderColor: 'primary.main' }
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#2196f3' }}>
                        <Schedule />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={appointment.beneficiary}
                      secondary={
                        <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="body2">
                            {appointment.type} • {appointment.time}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {appointment.therapist}
                          </Typography>
                        </Stack>
                      }
                    />
                    <Chip
                      label={appointment.status === 'confirmed' ? 'مؤكد' : 'قيد الانتظار'}
                      color={appointment.status === 'confirmed' ? 'success' : 'warning'}
                      size="small"
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Advanced Charts Section */}
        <Grid item xs={12}>
          <Card elevation={3}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  📊 الرسوم البيانية المتقدمة | Advanced Analytics
                </Typography>
                <Button 
                  size="small" 
                  startIcon={<Assessment />}
                  onClick={() => {
                    const chartData = { revenueData, weeklyProgress, sessionsByCategory };
                    exportService.toExcel(weeklyProgress, 'analytics-report');
                  }}
                >
                  تصدير
                </Button>
              </Box>
              <AdvancedChartsComponent data={weeklyProgress} />
            </CardContent>
          </Card>
        </Grid>

        {/* Smart Reports Dashboard */}
        <Grid item xs={12}>
          <SmartReportsDashboard />
        </Grid>
      </Grid>
    </Container>
  );
};

export default EnhancedAdminDashboard;
