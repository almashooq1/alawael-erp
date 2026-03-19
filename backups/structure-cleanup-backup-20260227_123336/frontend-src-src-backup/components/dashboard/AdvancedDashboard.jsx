/**
 * Advanced Dashboard - لوحة تحكم احترافية
 * تعرض ملخص شامل للنظام بتصميم عصري وتفاعلي
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Stack,
  Chip,
  LinearProgress,
  IconButton,
  Button,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  School,
  People,
  Assignment,
  EventNote,
  MoreVert,
  CheckCircle,
  Warning,
  Info,
  ArrowForward,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// بيانات تجريبية
const statsCards = [
  {
    id: 1,
    title: 'إجمالي الطلاب',
    value: '1,245',
    change: '+12%',
    trend: 'up',
    icon: School,
    color: '#667eea',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  {
    id: 2,
    title: 'المعلمون النشطون',
    value: '89',
    change: '+5%',
    trend: 'up',
    icon: People,
    color: '#43cea2',
    gradient: 'linear-gradient(135deg, #43cea2 0%, #185a9d 100%)',
  },
  {
    id: 3,
    title: 'الحضور اليوم',
    value: '94.5%',
    change: '-2%',
    trend: 'down',
    icon: EventNote,
    color: '#f093fb',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
  {
    id: 4,
    title: 'الواجبات المعلقة',
    value: '234',
    change: '+8%',
    trend: 'up',
    icon: Assignment,
    color: '#ffb347',
    gradient: 'linear-gradient(135deg, #ffb347 0%, #ffcc33 100%)',
  },
];

const attendanceData = [
  { month: 'سبتمبر', rate: 92 },
  { month: 'أكتوبر', rate: 94 },
  { month: 'نوفمبر', rate: 91 },
  { month: 'ديسمبر', rate: 93 },
  { month: 'يناير', rate: 95 },
];

const gradesDistribution = [
  { name: 'ممتاز', value: 35, color: '#4caf50' },
  { name: 'جيد جداً', value: 28, color: '#2196f3' },
  { name: 'جيد', value: 22, color: '#ff9800' },
  { name: 'مقبول', value: 12, color: '#f44336' },
  { name: 'راسب', value: 3, color: '#9e9e9e' },
];

const recentActivities = [
  {
    id: 1,
    type: 'success',
    icon: CheckCircle,
    title: 'تم إضافة 15 طالب جديد',
    time: 'منذ ساعتين',
  },
  {
    id: 2,
    type: 'warning',
    icon: Warning,
    title: 'تحذير: 5 طلاب غائبون اليوم',
    time: 'منذ 3 ساعات',
  },
  {
    id: 3,
    type: 'info',
    icon: Info,
    title: 'تم تحديث جداول الامتحانات',
    time: 'منذ 5 ساعات',
  },
];

const upcomingEvents = [
  {
    id: 1,
    title: 'امتحان الرياضيات - الصف العاشر',
    date: '2026-02-05',
    time: '10:00 ص',
    type: 'exam',
  },
  {
    id: 2,
    title: 'اجتماع أولياء الأمور',
    date: '2026-02-10',
    time: '3:00 م',
    type: 'meeting',
  },
  {
    id: 3,
    title: 'ورشة عمل للمعلمين',
    date: '2026-02-15',
    time: '9:00 ص',
    type: 'workshop',
  },
];

const AdvancedDashboard = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // محاكاة تحميل البيانات
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          📊 لوحة التحكم الرئيسية
        </Typography>
        <Typography variant="body2" color="textSecondary">
          مرحباً بك! إليك نظرة شاملة على النظام
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {statsCards.map(stat => {
          const Icon = stat.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={stat.id}>
              <Card
                sx={{
                  background: stat.gradient,
                  color: 'white',
                  borderRadius: 4,
                  position: 'relative',
                  overflow: 'visible',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.3)',
                        width: 56,
                        height: 56,
                      }}
                    >
                      <Icon sx={{ fontSize: 32 }} />
                    </Avatar>
                    <Chip
                      label={stat.change}
                      size="small"
                      icon={stat.trend === 'up' ? <TrendingUp /> : <TrendingDown />}
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {stat.title}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Attendance Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    📈 معدل الحضور الشهري
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    اتجاه الحضور خلال 5 أشهر
                  </Typography>
                </Box>
                <IconButton size="small">
                  <MoreVert />
                </IconButton>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={attendanceData}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" stroke="#9e9e9e" />
                  <YAxis stroke="#9e9e9e" />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 10,
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#667eea"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Grades Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 4, height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                📚 توزيع الدرجات
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={gradesDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {gradesDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {gradesDistribution.map(grade => (
                  <Box
                    key={grade.name}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: grade.color,
                        }}
                      />
                      <Typography variant="body2">{grade.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {grade.value}%
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Row */}
      <Grid container spacing={3}>
        {/* Recent Activities */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                🔔 الأنشطة الأخيرة
              </Typography>
              <Stack spacing={2}>
                {recentActivities.map(activity => {
                  const Icon = activity.icon;
                  const color =
                    activity.type === 'success'
                      ? '#4caf50'
                      : activity.type === 'warning'
                        ? '#ff9800'
                        : '#2196f3';
                  return (
                    <Paper
                      key={activity.id}
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: '1px solid #e0e0e0',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: '#f5f5f5',
                          transform: 'translateX(-4px)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Avatar sx={{ bgcolor: color, width: 40, height: 40 }}>
                          <Icon />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {activity.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {activity.time}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Stack>
              <Button fullWidth endIcon={<ArrowForward />} sx={{ mt: 2 }} variant="outlined">
                عرض جميع الأنشطة
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                📅 الفعاليات القادمة
              </Typography>
              <Stack spacing={2}>
                {upcomingEvents.map(event => (
                  <Paper
                    key={event.id}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e0e0e0',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                        transform: 'translateX(-4px)',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {event.title}
                      </Typography>
                      <Chip
                        label={event.type}
                        size="small"
                        color={
                          event.type === 'exam'
                            ? 'error'
                            : event.type === 'meeting'
                              ? 'warning'
                              : 'info'
                        }
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      📅 {event.date} • 🕐 {event.time}
                    </Typography>
                  </Paper>
                ))}
              </Stack>
              <Button fullWidth endIcon={<ArrowForward />} sx={{ mt: 2 }} variant="outlined">
                عرض التقويم الكامل
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdvancedDashboard;
