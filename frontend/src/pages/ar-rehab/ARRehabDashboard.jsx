/**
 * لوحة تحكم التأهيل بالواقع المعزز — AR Rehabilitation Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
} from '@mui/material';
import {
  ViewInAr as ARIcon,
  Sensors as BCIIcon,
  Groups as CollabIcon,
  } from '@mui/icons-material';
import {   getDashboard } from '../../services/arRehabService';

const sessionStatusLabels = { active: 'نشطة', completed: 'مكتملة', paused: 'متوقفة', cancelled: 'ملغاة' };
const sessionStatusColors = { active: 'success', completed: 'info', paused: 'warning', cancelled: 'error' };

export default function ARRehabDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({});
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    Promise.all([
      getDashboard().catch(() => ({ data: {} })),
    ]).then(([dResp]) => {
      const d = dResp.data || dResp || {};
      setDashboard(d);
      setSessions(Array.isArray(d.recentSessions) ? d.recentSessions : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;

  const kpis = [
    { label: 'الجلسات', value: dashboard.totalSessions || sessions.length, icon: <ARIcon />, bg: '#e3f2fd' },
    { label: 'الهولوغرامات', value: dashboard.totalHolograms || 0, icon: <ARIcon />, bg: '#e8f5e9' },
    { label: 'أجهزة BCI', value: dashboard.totalBciDevices || 0, icon: <BCIIcon />, bg: '#fff3e0' },
    { label: 'جلسات تعاونية', value: dashboard.collaborativeSessions || 0, icon: <CollabIcon />, bg: '#f3e5f5' },
  ];

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>التأهيل بالواقع المعزز (AR/XR)</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        جلسات التأهيل بتقنيات الواقع المعزز والموسع — هولوجرام، أجهزة واجهة الدماغ-الحاسوب، تعاون عن بعد
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
        <Typography variant="h6" gutterBottom>آخر الجلسات</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>المستفيد</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>المدة (د)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.slice(0, 10).map((s, i) => (
              <TableRow key={s._id || i}>
                <TableCell>{s.beneficiaryName || s.beneficiary?.name || s.patientName || '-'}</TableCell>
                <TableCell>{s.sessionType || s.type || '-'}</TableCell>
                <TableCell>
                  <Chip label={sessionStatusLabels[s.status] || s.status || '-'} color={sessionStatusColors[s.status] || 'default'} size="small" />
                </TableCell>
                <TableCell>{s.startTime ? new Date(s.startTime).toLocaleDateString('ar') : s.date ? new Date(s.date).toLocaleDateString('ar') : '-'}</TableCell>
                <TableCell>{s.duration || '-'}</TableCell>
              </TableRow>
            ))}
            {sessions.length === 0 && (
              <TableRow><TableCell colSpan={5} align="center">لا توجد جلسات بعد</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
