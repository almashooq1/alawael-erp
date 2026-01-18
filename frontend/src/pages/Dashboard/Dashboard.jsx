import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Avatar,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  People,
  Description,
  EventNote,
  TrendingUp,
  Add
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import api from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalBeneficiaries: 0,
    activeBeneficiaries: 0,
    totalReports: 0,
    totalSessions: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // جلب الإحصائيات
      const statsResponse = await api.get('/beneficiaries/statistics');
      if (statsResponse.data.success) {
        setStats({
          totalBeneficiaries: statsResponse.data.data.total,
          activeBeneficiaries: statsResponse.data.data.active,
          ...stats
        });
      }

      // جلب التقارير الحديثة
      const reportsResponse = await api.get('/reports?per_page=5');
      if (reportsResponse.data.success) {
        setRecentReports(reportsResponse.data.data);
      }

      // جلب الجلسات القادمة
      const sessionsResponse = await api.get('/sessions/upcoming?days=7');
      if (sessionsResponse.data.success) {
        setUpcomingSessions(sessionsResponse.data.data);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setLoading(false);
    }
  }, [stats]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const StatCard = ({ title, value, icon, color, onClick }) => (
    <Card sx={{ height: '100%', cursor: 'pointer' }} onClick={onClick}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 56, height: 56 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          مرحباً، {user?.first_name || user?.username} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          نظرة عامة على نظام إدارة مراكز التأهيل
        </Typography>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي المستفيدين"
            value={stats.totalBeneficiaries}
            icon={<People />}
            color="#667eea"
            onClick={() => navigate('/beneficiaries')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="المستفيدون النشطون"
            value={stats.activeBeneficiaries}
            icon={<TrendingUp />}
            color="#48bb78"
            onClick={() => navigate('/beneficiaries?status=active')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="التقارير"
            value={stats.totalReports}
            icon={<Description />}
            color="#ed8936"
            onClick={() => navigate('/reports')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الجلسات"
            value={stats.totalSessions}
            icon={<EventNote />}
            color="#9f7aea"
            onClick={() => navigate('/sessions')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* التقارير الحديثة */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  التقارير الأخيرة
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => navigate('/reports/new')}
                >
                  إنشاء تقرير
                </Button>
              </Box>

              {recentReports.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  لا توجد تقارير
                </Typography>
              ) : (
                recentReports.map((report) => (
                  <Box
                    key={report.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={2}
                    borderBottom="1px solid #f0f0f0"
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/reports/${report.id}`)}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {report.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.report_number}
                      </Typography>
                    </Box>
                    <Chip
                      label={report.status}
                      size="small"
                      color={
                        report.status === 'published' ? 'success' :
                        report.status === 'draft' ? 'default' : 'warning'
                      }
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* الجلسات القادمة */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  الجلسات القادمة
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() => navigate('/sessions/new')}
                >
                  جدولة جلسة
                </Button>
              </Box>

              {upcomingSessions.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  لا توجد جلسات قادمة
                </Typography>
              ) : (
                upcomingSessions.map((session) => (
                  <Box
                    key={session.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={2}
                    borderBottom="1px solid #f0f0f0"
                  >
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {session.beneficiary?.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {session.session_date} - {session.start_time}
                      </Typography>
                    </Box>
                    <Chip
                      label={session.session_type}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
