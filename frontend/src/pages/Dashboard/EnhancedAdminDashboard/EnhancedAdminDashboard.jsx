/**
 * لوحة التحكم الرئيسية المحسّنة
 * Enhanced Admin Dashboard — slim orchestrator
 *
 * Sub-modules: useDashboardData, DashboardHeader, StatisticsCards,
 * RevenueChart, SessionsPieChart, WeeklyProgressChart,
 * QuickActionsPanel, RecentActivities, UpcomingAppointments
 */
import exportService from 'services/exportService';
import useDashboardData from './useDashboardData';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  Typography
} from '@mui/material';
import Assessment from '@mui/icons-material/Assessment';

const EnhancedAdminDashboard = () => {
  const {
    loading,
    dashError,
    timeRange,
    setTimeRange,
    statistics,
    revenueData,
    sessionsByCategory,
    weeklyProgress,
    recentActivities,
    upcomingAppointments,
    fetchDashboard,
  } = useDashboardData();

  return (
    <DashboardErrorBoundary>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <DashboardHeader loading={loading} dashError={dashError} fetchDashboard={fetchDashboard} />

        {/* Statistics Cards */}
        <StatisticsCards loading={loading} statistics={statistics} />

        <Grid container spacing={3}>
          {/* Revenue Chart */}
          <Grid item xs={12} md={8}>
            <RevenueChart revenueData={revenueData} timeRange={timeRange} setTimeRange={setTimeRange} />
          </Grid>

          {/* Sessions by Category */}
          <Grid item xs={12} md={4}>
            <SessionsPieChart sessionsByCategory={sessionsByCategory} />
          </Grid>

          {/* Weekly Progress */}
          <Grid item xs={12} md={6}>
            <WeeklyProgressChart weeklyProgress={weeklyProgress} />
          </Grid>

          {/* Quick Actions */}
          <Grid item xs={12} md={6}>
            <QuickActionsPanel />
          </Grid>

          {/* Recent Activities */}
          <Grid item xs={12} md={6}>
            <RecentActivities recentActivities={recentActivities} />
          </Grid>

          {/* Upcoming Appointments */}
          <Grid item xs={12} md={6}>
            <UpcomingAppointments upcomingAppointments={upcomingAppointments} />
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
    </DashboardErrorBoundary>
  );
};

export default EnhancedAdminDashboard;
