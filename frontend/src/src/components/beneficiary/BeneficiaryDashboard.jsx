/**
 * BeneficiaryDashboard Component
 * لوحة التحكم الرئيسية للمتعلم
 * عرض الإحصائيات السريعة، الرسوم البيانية، الأنشطة الحديثة
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Button,
  CircularProgress,
} from '@material-ui/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import beneficiaryService from '../../services/beneficiary.service';
import QuickStatsCard from '../common/QuickStatsCard';
import './BeneficiaryDashboard.css';

const BeneficiaryDashboard = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { dashboard, loading } = useSelector(state => state.beneficiary);
  const [progressTrend, setProgressTrend] = useState(null);
  const [grades, setGrades] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      // تحميل البيانات المختلفة
      const [progressData, gradesData] = await Promise.all([
        beneficiaryService.getProgressTrend(),
        beneficiaryService.getGradesSummary(),
      ]);

      setProgressTrend(progressData);
      setGrades(gradesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: t('errors.loadingData'),
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  if (loading) {
    return (
      <Box className="dashboard-loading">
        <CircularProgress />
      </Box>
    );
  }

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  return (
    <div className="beneficiary-dashboard">
      {/* Header */}
      <Box className="dashboard-header">
        <Typography variant="h4" gutterBottom>
          {t('dashboard.welcome')}, {dashboard?.studentName || 'Student'}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {t('dashboard.subtitle')}
        </Typography>
      </Box>

      {/* Quick Stats Cards */}
      <Grid container spacing={2} className="quick-stats">
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.academicScore')}
            value={dashboard?.academicScore || 0}
            unit="%"
            trend="+2.5%"
            color="primary"
            icon="📊"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.attendance')}
            value={dashboard?.attendanceRate || 0}
            unit="%"
            trend="+1%"
            color="success"
            icon="📅"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.messages')}
            value={dashboard?.unreadMessages || 0}
            trend="جديد"
            color="info"
            icon="📧"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.tasks')}
            value={dashboard?.pendingTasks || 0}
            trend="مستحقة"
            color="warning"
            icon="✅"
          />
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} className="charts-section">
        {/* Performance Trend */}
        <Grid item xs={12} md={8}>
          <Card className="chart-card">
            <CardHeader title={t('dashboard.performanceTrend')} />
            <CardContent>
              {progressTrend ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#8884d8"
                      dot={{ fill: '#8884d8', r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography>{t('dashboard.noData')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Grade Distribution */}
        <Grid item xs={12} md={4}>
          <Card className="chart-card">
            <CardHeader title={t('dashboard.gradeDistribution')} />
            <CardContent>
              {grades ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={grades}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {grades.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Typography>{t('dashboard.noData')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Activities */}
      <Grid container spacing={3} className="activities-section">
        <Grid item xs={12} md={6}>
          <Card className="activity-card">
            <CardHeader title={t('dashboard.recentActivities')} />
            <CardContent>
              <Box className="activities-list">
                {dashboard?.recentActivities?.map((activity, index) => (
                  <Box key={index} className="activity-item">
                    <Typography variant="body2">{activity.title}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {activity.date}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Card className="activity-card">
            <CardHeader title={t('dashboard.upcomingEvents')} />
            <CardContent>
              <Box className="events-list">
                {dashboard?.upcomingEvents?.map((event, index) => (
                  <Box key={index} className="event-item">
                    <Typography variant="body2">{event.title}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {event.date}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      <Box className="dashboard-actions">
        <Button variant="contained" color="primary">
          {t('actions.viewFullReport')}
        </Button>
        <Button variant="outlined" color="primary">
          {t('actions.contactGuardian')}
        </Button>
      </Box>
    </div>
  );
};

export default BeneficiaryDashboard;
