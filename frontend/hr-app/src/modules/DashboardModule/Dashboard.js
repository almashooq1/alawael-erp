import React from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';
import { AttendancePieChart, LeavesBarChart } from './Charts';
import { useTranslation } from 'react-i18next';
import { useDashboardStats, useDashboardStatistics } from './api';

const StatCard = ({ label, value }) => (
  <Card sx={{ minWidth: 180, mb: 2 }}>
    <CardContent>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        {label}
      </Typography>
      <Typography variant="h4" color="primary">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { t } = useTranslation();
  const { stats, loading, error } = useDashboardStats();
  const { data: statistics, loading: statsLoading, error: statsError } = useDashboardStatistics();

  if (loading || statsLoading) return <div>{t('Loading...')}</div>;
  if (error || statsError) return <div>{t('Error loading dashboard data')}</div>;
  if (!stats) return null;

  // استخراج بيانات الإحصائيات
  const overview = stats.overview || {};
  const attendanceChartData = statistics?.attendance || { present: 0, absent: 0, leave: 0 };
  const leavesChartData = statistics?.leaves || { months: [], leaves: [] };

  return (
    <div>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('Dashboard')}
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard label={t('Total Employees')} value={overview.totalEmployees || 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard label={t('Attendance Today')} value={overview.attendanceToday || 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard label={t('Leaves This Month')} value={overview.leavesThisMonth || 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard label={t('Payrolls This Month')} value={overview.payrollsThisMonth || 0} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <StatCard
            label={t('Pending Performance Reviews')}
            value={overview.performancePending || 0}
          />
        </Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <AttendancePieChart data={attendanceChartData} />
        </Grid>
        <Grid item xs={12} md={6}>
          <LeavesBarChart data={leavesChartData} />
        </Grid>
      </Grid>
    </div>
  );
};

export default Dashboard;
