import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Grid, Paper, Divider } from '@mui/material';
import axios from 'axios';

const StatBox = ({ label, value }) => (
  <Paper sx={{ p: 2, textAlign: 'center' }} elevation={2}>
    <Typography variant="h5">{value}</Typography>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
  </Paper>
);

const NotificationAnalyticsPanel = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    axios.get('/api/notifications/analytics/summary')
      .then(res => {
        setData(res.data.data || res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('تعذر جلب بيانات التحليلات');
        setLoading(false);
      });
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return null;

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>إحصائيات الإشعارات</Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        <Grid item xs={6} md={3}>
          <StatBox label="إجمالي الإشعارات" value={data.totalNotifications || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatBox label="نسبة القراءة" value={data.readRate ? `${data.readRate}%` : '0%'} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatBox label="بريد إلكتروني مرسل" value={data.emailSent || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatBox label="رسائل SMS مرسلة" value={data.smsSent || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatBox label="إشعارات داخل النظام" value={data.inAppSent || 0} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatBox label="أكثر مستخدم تفاعلاً" value={data.topUser || '-'} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationAnalyticsPanel;
