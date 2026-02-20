import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Grid,
  Card,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Notifications as NotificationsIcon,
  Assignment as ReportsIcon,
} from '@mui/icons-material';
import { fetchDashboard } from '../store/slices/analyticsSlice';

import {
  Tabs,
  Tab,
  Chip,
  Stack,
  LinearProgress,
  Avatar,
  Button,
  Paper,
} from '@mui/material';
import NotificationAnalyticsPanel from '../components/notifications/NotificationAnalyticsPanel';
import NotificationAdminDashboard from '../components/notifications/NotificationAdminDashboard';
import { DASHBOARD_TABS } from '../config/navigationConfig';

const StatCard = ({ title, value, icon, color, change }) => (
  <Card
    sx={{
      p: 3,
      borderLeft: `4px solid ${color}`,
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 3,
      },
    }}
  >
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
          {value || 0}
        </Typography>
        {change && (
          <Chip
            label={change}
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Box>
      <Box
        sx={{
          width: 48,
          height: 48,
          bgcolor: `${color}20`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </Box>
    </Box>
  </Card>
);

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard = () => {
  const dispatch = useDispatch();
  const { dashboard, loading } = useSelector((state) => state.analytics);
  const userEmail = useSelector(state => state.auth.user?.email);
  const userInitial = userEmail?.[0]?.toUpperCase();

  useEffect(() => {
    dispatch(fetchDashboard());
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              fontSize: '1.5rem',
            }}
          >
            {userInitial}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              أهلا بعودتك، {userEmail}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              إليك ما يحدث في نظامك اليوم
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Key Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي المستخدمين"
            value={dashboard?.totalUsers}
            icon={<PeopleIcon sx={{ color: '#667eea', fontSize: '1.5rem' }} />}
            color="#667eea"
            change="+12%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="معدل النمو"
            value={`${dashboard?.growthRate || 0}%`}
            icon={<TrendingUpIcon sx={{ color: '#764ba2', fontSize: '1.5rem' }} />}
            color="#764ba2"
            change="+8%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="التقارير"
            value={dashboard?.totalReports}
            icon={<ReportsIcon sx={{ color: '#4CAF50', fontSize: '1.5rem' }} />}
            color="#4CAF50"
            change="+5%"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الإشعارات"
            value={dashboard?.notifications}
            icon={<NotificationsIcon sx={{ color: '#FF9800', fontSize: '1.5rem' }} />}
            color="#FF9800"
            change="+3%"
          />
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <DashboardTabsSection dashboard={dashboard} />
    </Box>
  );
};

function DashboardTabsSection({ dashboard }) {
  const [activeTab, setActiveTab] = React.useState(0);
  const { language } = useSelector(state => state.settings);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const dashboardTabs = DASHBOARD_TABS.map(tab => ({
    ...tab,
    label: language === 'en' ? tab.labelEn : tab.label,
  }));

  return (
    <Paper elevation={2} sx={{ borderRadius: 2 }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 2,
          borderColor: 'divider',
          bgcolor: 'action.hover',
        }}
      >
        {dashboardTabs.map((tab, index) => (
          <Tab
            key={tab.id}
            label={tab.label}
            id={`dashboard-tab-${index}`}
            aria-controls={`dashboard-tabpanel-${index}`}
            icon={React.createElement(tab.icon)}
            iconPosition="start"
            sx={{
              minHeight: 48,
              fontWeight: activeTab === index ? 'bold' : '500',
            }}
          />
        ))}
      </Tabs>

      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                صحة النظام
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">CPU</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>45%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={45} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">الذاكرة</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>62%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={62} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">القرص الصلب</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>78%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={78} sx={{ height: 6, borderRadius: 3 }} />
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                الإجراءات السريعة
              </Typography>
              <Stack spacing={2}>
                <Button variant="outlined" fullWidth style={touchButtonStyle}>
                  إنشاء مستخدم جديد
                </Button>
                <Button variant="outlined" fullWidth style={touchButtonStyle}>
                  إنشاء تقرير
                </Button>
                <Button variant="outlined" fullWidth style={touchButtonStyle}>
                  إعدادات النظام
                </Button>
              </Stack>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Analytics Tab */}
      <TabPanel value={activeTab} index={1}>
        <NotificationAnalyticsPanel />
        {/* لوحة تحكم الإشعارات للإداريين فقط */}
        {window?.userRole === 'admin' && <NotificationAdminDashboard />}
          {user?.role === 'admin' && <NotificationAdminDashboard />}
      </TabPanel>

      {/* Reports Tab */}
      <TabPanel value={activeTab} index={2}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            التقارير
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            سيتم عرض التقارير والتوثيق التفصيلي هنا.
          </Typography>
        </Card>
      </TabPanel>

      {/* Monitoring Tab */}
      <TabPanel value={activeTab} index={3}>
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            مراقبة النظام
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            سيتم عرض بيانات مراقبة النظام في الوقت الفعلي هنا.
          </Typography>
        </Card>
      </TabPanel>
    </Paper>
  );
}

export default Dashboard;
