/**
 * لوحة تحكم التنسيق متعدد التخصصات — MDT Coordination Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
} from '@mui/material';
import {
  Groups as MeetingIcon,
  ListAlt as PlanIcon,
  SwapHoriz as RefIcon,
  Dashboard as DashIcon,
} from '@mui/icons-material';
import { meetingsService, dashboardService, plansService, referralsService } from '../../services/mdtCoordinationService';

const meetStatusLabels = { scheduled: 'مجدول', in_progress: 'جارٍ', completed: 'مكتمل', cancelled: 'ملغى' };
const meetStatusColors = { scheduled: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error' };

export default function MDTCoordinationDashboard() {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [overview, setOverview] = useState({});

  useEffect(() => {
    Promise.all([
      meetingsService.getAll().catch(() => ({ data: [] })),
      dashboardService.getOverview().catch(() => ({ data: {} })),
    ]).then(([mResp, oResp]) => {
      setMeetings(Array.isArray(mResp.data) ? mResp.data : Array.isArray(mResp) ? mResp : []);
      setOverview(oResp.data || oResp || {});
      setLoading(false);
    });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;

  const kpis = [
    { label: 'الاجتماعات', value: overview.totalMeetings || meetings.length, icon: <MeetingIcon />, bg: '#e3f2fd' },
    { label: 'الخطط العلاجية', value: overview.totalPlans || 0, icon: <PlanIcon />, bg: '#e8f5e9' },
    { label: 'الإحالات', value: overview.totalReferrals || 0, icon: <RefIcon />, bg: '#fff3e0' },
    { label: 'نسبة الإنجاز', value: overview.completionRate ? `${overview.completionRate}%` : '-', icon: <DashIcon />, bg: '#f3e5f5' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>التنسيق متعدد التخصصات (MDT)</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        إدارة اجتماعات الفريق متعدد التخصصات، الخطط العلاجية، والإحالات
      </Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: k.bg }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {k.icon}
                <Box>
                  <Typography variant="h5" fontWeight="bold">{k.value ?? 0}</Typography>
                  <Typography variant="body2">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>آخر الاجتماعات</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>المشاركون</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meetings.slice(0, 10).map((m, i) => (
              <TableRow key={m._id || i}>
                <TableCell>{m.title || m.subject || '-'}</TableCell>
                <TableCell>{m.type || m.meetingType || '-'}</TableCell>
                <TableCell>
                  <Chip label={meetStatusLabels[m.status] || m.status || '-'} color={meetStatusColors[m.status] || 'default'} size="small" />
                </TableCell>
                <TableCell>{m.date ? new Date(m.date).toLocaleDateString('ar') : m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString('ar') : '-'}</TableCell>
                <TableCell>{m.participants?.length ?? m.attendees?.length ?? '-'}</TableCell>
              </TableRow>
            ))}
            {meetings.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">لا توجد اجتماعات بعد</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
