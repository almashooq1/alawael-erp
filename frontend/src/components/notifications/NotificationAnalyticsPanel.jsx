import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Divider, Chip, LinearProgress } from '@mui/material';
import notificationAnalyticsService from '../../services/notificationAnalyticsService';

export default function NotificationAnalyticsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    notificationAnalyticsService.getSummary()
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        setError('فشل في جلب تحليلات الإشعارات');
        setLoading(false);
      });
  }, []);

  if (loading) return <Box sx={{ textAlign: 'center', py: 6 }}><CircularProgress /></Box>;
  if (error) return <Box sx={{ color: 'error.main', py: 4 }}>{error}</Box>;
  if (!data) return null;

  return (
    <Paper elevation={3} sx={{ p: 3, minWidth: 340, maxWidth: 500 }}>
      <Typography variant="h6" fontWeight={600} mb={2}>تحليلات الإشعارات</Typography>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
        <Chip label={`الإجمالي: ${data.total}`} color="primary" />
        <Chip label={`المقروءة: ${data.read}`} color="success" />
        <Chip label={`غير المقروءة: ${data.unread}`} color="warning" />
        <Chip label={`التسليم: ${data.delivered}`} color="info" />
        <Chip label={`النقرات: ${data.clicks}`} color="secondary" />
      </Box>
      <Box mb={2}>
        <Typography variant="body2">معدل التفاعل:</Typography>
        <LinearProgress variant="determinate" value={data.engagementRate} sx={{ height: 10, borderRadius: 2, mb: 1 }} />
        <Typography variant="caption">{data.engagementRate.toFixed(1)}%</Typography>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" mb={1}>الاتجاه الأسبوعي (تسليم الإشعارات):</Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {data.usageTrend && data.usageTrend.length > 0 ? data.usageTrend.map(day => (
          <Chip key={day._id} label={`${day._id}: ${day.count}`} size="small" />
        )) : <Typography variant="caption">لا يوجد بيانات</Typography>}
      </Box>
    </Paper>
  );
}
