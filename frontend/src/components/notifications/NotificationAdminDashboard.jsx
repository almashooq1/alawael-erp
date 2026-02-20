import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Table, TableHead, TableRow, TableCell, TableBody, Chip, CircularProgress, Stack, Divider } from '@mui/material';
import apiClient from '../services/apiClient';
import NotificationTemplatesAdmin from './NotificationTemplatesAdmin';

export default function NotificationAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await apiClient.get('/notifications/analytics/summary');
        setStats(res.data.data);
      } catch (err) {
        setError('فشل في جلب بيانات الإشعارات');
      }
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;
  if (error) return <Box color="error.main" py={4}>{error}</Box>;

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          لوحة تحكم الإشعارات (إداري)
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={3} mb={3}>
          <Stat label="إجمالي الإشعارات" value={stats?.totalNotifications} color="primary" />
          <Stat label="غير مقروءة" value={stats?.unreadCount} color="error" />
          <Stat label="تم التسليم" value={stats?.deliveredCount} color="success" />
          <Stat label="تم النقر" value={stats?.clickedCount} color="info" />
        </Stack>
        <NotificationTemplatesAdmin />
        <Typography variant="h6" sx={{ mb: 2 }}>تفاصيل الأحداث</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>الحدث</TableCell>
              <TableCell>العدد</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats?.eventCounts && Object.entries(stats.eventCounts).map(([event, count]) => (
              <TableRow key={event}>
                <TableCell>{event}</TableCell>
                <TableCell>{count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color }) {
  return (
    <Box textAlign="center">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Chip label={value || 0} color={color} sx={{ fontSize: '1.1rem', mt: 1 }} />
    </Box>
  );
}
