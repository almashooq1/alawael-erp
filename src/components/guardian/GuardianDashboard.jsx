/**
 * GuardianDashboard Component
 * لوحة التحكم الرئيسية لولي الأمر
 * عرض إحصائيات شاملة عن جميع الأطفال
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
  LinearProgress,
} from '@material-ui/core';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import guardianService from '../../services/guardian.service';
import QuickStatsCard from '../common/QuickStatsCard';
import './GuardianDashboard.css';

const GuardianDashboard = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const { dashboard, beneficiaries, loading } = useSelector(state => state.guardian);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      dispatch({ type: 'SET_GUARDIAN_LOADING', payload: true });

      const analyticsData = await guardianService.getAnalyticsDashboard();
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      dispatch({
        type: 'SET_GUARDIAN_ERROR',
        payload: t('errors.loadingData'),
      });
    } finally {
      dispatch({ type: 'SET_GUARDIAN_LOADING', payload: false });
    }
  };

  if (loading) {
    return (
      <Box className="dashboard-loading">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="guardian-dashboard">
      {/* Header */}
      <Box className="dashboard-header">
        <Typography variant="h4" gutterBottom>
          {t('dashboard.welcome')}, {dashboard?.parentName || 'Parent'}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {t('dashboard.guardianSubtitle')}
        </Typography>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={2} className="quick-stats">
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.children')}
            value={beneficiaries?.length || 0}
            icon="👨‍👧‍👦"
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.averageScore')}
            value={dashboard?.averageScore || 0}
            unit="%"
            icon="📈"
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.totalDue')}
            value={dashboard?.financialSummary?.totalDue || 0}
            unit={dashboard?.currency || 'SAR'}
            icon="💰"
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <QuickStatsCard
            title={t('dashboard.paymentsDue')}
            value={dashboard?.paymentsDueSoon || 0}
            trend="قريباً"
            icon="🕐"
            color="info"
          />
        </Grid>
      </Grid>

      {/* Children Overview Cards */}
      <Grid container spacing={3} className="children-section">
        <Grid item xs={12}>
          <Typography variant="h6">{t('dashboard.childrenOverview')}</Typography>
        </Grid>
        {beneficiaries?.map((child, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card className="child-card">
              <CardHeader title={child.name} subtitle={child.grade} />
              <CardContent>
                <Box className="progress-container">
                  <Typography variant="body2">
                    {t('dashboard.academicScore')}: {child.academicScore}%
                  </Typography>
                  <LinearProgress variant="determinate" value={child.academicScore} />
                </Box>
                <Box className="progress-container">
                  <Typography variant="body2">
                    {t('dashboard.attendance')}: {child.attendanceRate}%
                  </Typography>
                  <LinearProgress variant="determinate" value={child.attendanceRate} />
                </Box>
                <Button fullWidth variant="outlined" color="primary" size="small">
                  {t('actions.viewDetails')}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Analytics Section */}
      <Grid container spacing={3} className="analytics-section">
        {/* Performance Trend */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title={t('dashboard.performanceTrend')} />
            <CardContent>
              {analytics?.performanceTrend ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {beneficiaries?.map((child, idx) => (
                      <Line
                        key={idx}
                        type="monotone"
                        dataKey={child.id}
                        stroke={`hsl(${idx * 60}, 70%, 50%)`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Typography>{t('dashboard.noData')}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Financial Summary */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title={t('dashboard.financialSummary')} />
            <CardContent>
              <Box className="financial-summary">
                <Typography variant="body2">
                  {t('dashboard.totalDue')}: {dashboard?.financialSummary?.totalDue}
                </Typography>
                <Typography variant="body2">
                  {t('dashboard.totalPaid')}: {dashboard?.financialSummary?.totalPaid}
                </Typography>
                <Typography variant="body2" color="error">
                  {t('dashboard.overdue')}: {dashboard?.financialSummary?.overdueAmount}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Actions */}
      <Grid container spacing={3} className="actions-section">
        <Grid item xs={12}>
          <Card>
            <CardHeader title={t('dashboard.pendingActions')} />
            <CardContent>
              <Box className="actions-list">
                {dashboard?.pendingActions?.map((action, idx) => (
                  <Box key={idx} className="action-item">
                    <Typography variant="body2">{action.title}</Typography>
                    <Button size="small" variant="outlined" color="primary">
                      {t('actions.review')}
                    </Button>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </div>
  );
};

export default GuardianDashboard;
