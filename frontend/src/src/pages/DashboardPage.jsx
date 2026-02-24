/**
 * Rehabilitation Center Dashboard Page
 * صفحة لوحة تحكم مركز التأهيل
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
  IconButton,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  ThemeProvider,
  createTheme,
  rtl,
} from '@mui/material';
import {
  People as PeopleIcon,
  DirectionsBus as BusIcon,
  Assessment as AssessmentIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Groups as GroupsIcon,
  Accessibility as AccessibilityIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

// RTL Arabic Theme
const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: '"Cairo", "Tajawal", "Roboto", "Arial", sans-serif',
  },
  palette: {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
    },
    secondary: {
      main: '#8B5CF6',
    },
    success: {
      main: '#10B981',
    },
    warning: {
      main: '#F59E0B',
    },
    error: {
      main: '#EF4444',
    },
    background: {
      default: '#F3F4F6',
      paper: '#FFFFFF',
    },
  },
});

// API Service
const API_BASE = '/api/rehabilitation-dashboard';

const fetchDashboardData = async (centerId) => {
  try {
    const response = await fetch(`${API_BASE}/center/${centerId}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return null;
  }
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => (
  <Card sx={{ height: '100%', borderRadius: 2, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {trend === 'up' ? (
                <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />
              ) : (
                <TrendingDownIcon sx={{ color: 'error.main', fontSize: 16 }} />
              )}
              <Typography
                variant="caption"
                sx={{ color: trend === 'up' ? 'success.main' : 'error.main', mr: 0.5 }}
              >
                {trendValue}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                من الشهر الماضي
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.light`, width: 56, height: 56 }}>
          <Icon sx={{ color: `${color}.main` }} />
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// KPI Card Component
const KPICard = ({ label, value, target, unit, progress }) => (
  <Card sx={{ borderRadius: 2 }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
        <Typography variant="h5" fontWeight="bold">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {unit}
        </Typography>
        {target && (
          <Typography variant="caption" color="text.secondary">
            / {target}{unit}
          </Typography>
        )}
      </Box>
      {progress !== null && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'grey.200',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: progress >= 90 ? 'success.main' : progress >= 70 ? 'warning.main' : 'error.main',
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            {Math.round(progress)}% من الهدف
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

// Alert Item Component
const AlertItem = ({ alert, onAcknowledge }) => {
  const severityColors = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'success',
  };

  return (
    <ListItem
      sx={{
        bgcolor: 'grey.50',
        borderRadius: 1,
        mb: 1,
        border: '1px solid',
        borderColor: 'grey.200',
      }}
      secondaryAction={
        <IconButton edge="end" onClick={() => onAcknowledge(alert.id)}>
          <CheckCircleIcon color="success" />
        </IconButton>
      }
    >
      <ListItemIcon>
        <WarningIcon color={severityColors[alert.priority] || 'warning'} />
      </ListItemIcon>
      <ListItemText
        primary={alert.title}
        secondary={alert.message}
        primaryTypographyProps={{ fontWeight: 'medium' }}
      />
      <Chip
        label={alert.priority}
        size="small"
        color={severityColors[alert.priority]}
        sx={{ mr: 2 }}
      />
    </ListItem>
  );
};

// Main Dashboard Component
const RehabilitationDashboard = ({ centerId = 'CTR-001' }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await fetchDashboardData(centerId);
      if (data?.success) {
        setDashboardData(data.data);
      }
      setLoading(false);
    };
    loadData();
  }, [centerId, timeRange]);

  // Chart Data
  const attendanceChartData = {
    labels: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'],
    datasets: [
      {
        label: 'الحضور',
        data: [85, 92, 88, 95, 90],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
      },
      {
        label: 'الغياب',
        data: [15, 8, 12, 5, 10],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
    ],
  };

  const beneficiariesByDisabilityData = {
    labels: ['حركية', 'بصرية', 'سمعية', 'ذهنية', 'توحد', 'متعددة'],
    datasets: [
      {
        data: [35, 25, 20, 30, 25, 15],
        backgroundColor: [
          '#6366F1',
          '#8B5CF6',
          '#EC4899',
          '#10B981',
          '#F59E0B',
          '#EF4444',
        ],
      },
    ],
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Box dir="rtl" sx={{ bgcolor: 'background.default', minHeight: '100vh', p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            لوحة تحكم مركز التأهيل
          </Typography>
          <Typography variant="body1" color="text.secondary">
            نظرة شاملة على أداء المركز والعمليات اليومية
          </Typography>
        </Box>

        {/* Stats Grid */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="المستفيدون النشطون"
              value={dashboardData?.overview?.activeBeneficiaries || 128}
              icon={PeopleIcon}
              trend="up"
              trendValue={12}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="الموظفون الحاضرون"
              value={dashboardData?.overview?.presentStaff || 42}
              icon={GroupsIcon}
              trend="up"
              trendValue={5}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="الجلسات اليوم"
              value={dashboardData?.overview?.sessionsToday || 35}
              icon={HospitalIcon}
              color="secondary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="مسارات النقل"
              value={dashboardData?.overview?.activeRoutes || 8}
              icon={BusIcon}
              trend="stable"
              color="info"
            />
          </Grid>
        </Grid>

        {/* KPIs Row */}
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
          مؤشرات الأداء الرئيسية
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <KPICard
              label="نسبة الحضور"
              value={92}
              target={90}
              unit="%"
              progress={102}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <KPICard
              label="نسبة الرضا"
              value={87}
              target={85}
              unit="%"
              progress={102}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <KPICard
              label="كفاءة النقل"
              value={94}
              target={90}
              unit="%"
              progress={104}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  رسم بياني للحضور الأسبوعي
                </Typography>
                <Bar
                  data={attendanceChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'top' },
                    },
                    scales: {
                      y: { beginAtZero: true },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  المستفيدون حسب نوع الإعاقة
                </Typography>
                <Doughnut
                  data={beneficiariesByDisabilityData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: { position: 'bottom' },
                    },
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alerts & Quick Actions */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight="bold">
                    التنبيهات النشطة
                  </Typography>
                  <Chip label="3 تنبيهات" color="warning" size="small" />
                </Box>
                <List>
                  <AlertItem
                    alert={{
                      id: 1,
                      title: 'تأخر الحافلة رقم 5',
                      message: 'الحافلة متأخرة 15 دقيقة عن الموعد',
                      priority: 'high',
                    }}
                  />
                  <AlertItem
                    alert={{
                      id: 2,
                      title: 'غياب غير مبرر',
                      message: '3 مستفيدين غائبون بدون عذر',
                      priority: 'medium',
                    }}
                  />
                  <AlertItem
                    alert={{
                      id: 3,
                      title: 'صيانة مطلوبة',
                      message: 'الحافلة رقم 2 تحتاج صيانة',
                      priority: 'low',
                    }}
                  />
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  أحداث اليوم
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <ScheduleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="اجتماع فريق العمل"
                      secondary="10:00 صباحاً - قاعة الاجتماعات"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <AccessibilityIcon color="secondary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="تقييم شهري للمستفيدين"
                      secondary="12:00 ظهراً"
                    />
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="ورشة تدريب للموظفين"
                      secondary="2:00 مساءً"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default RehabilitationDashboard;