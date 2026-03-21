/**
 * Events Dashboard — لوحة إدارة الفعاليات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, CircularProgress, IconButton, Tooltip, Alert, Chip, Grid, useTheme, alpha,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Refresh, Event, People, CalendarMonth, Celebration } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { getEventsDashboard } from '../../services/events.service';

const TYPE_LABELS = { conference: 'مؤتمر', seminar: 'ندوة', workshop: 'ورشة عمل', ceremony: 'حفل', exhibition: 'معرض', meeting: 'اجتماع', training: 'تدريب', social: 'اجتماعي', sports: 'رياضي', other: 'أخرى' };
const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#5d4037', '#455a64', '#c2185b', '#00838f'];

export default function EventsDashboard() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setData(await getEventsDashboard()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={64} /></Box>;
  if (!data) return <Alert severity="error">لا توجد بيانات</Alert>;

  const { summary, eventsByType, upcomingEvents } = data;
  const kpis = [
    { label: 'إجمالي الفعاليات', value: summary.totalEvents, icon: <Event />, color: '#1976d2' },
    { label: 'فعاليات قادمة', value: summary.upcoming, icon: <CalendarMonth />, color: '#388e3c' },
    { label: 'قيد التنفيذ', value: summary.inProgress, icon: <Celebration />, color: '#f57c00' },
    { label: 'إجمالي التسجيلات', value: summary.totalRegistrations, icon: <People />, color: '#7b1fa2' },
  ];

  const typeData = eventsByType.map((e) => ({ name: TYPE_LABELS[e.type] || e.type, value: e.count }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box><Typography variant="h4" fontWeight={700}>لوحة إدارة الفعاليات</Typography><Typography variant="body2" color="text.secondary">نظرة شاملة على الفعاليات والأنشطة</Typography></Box>
        <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(k.color, 0.1), color: k.color, display: 'flex' }}>{k.icon}</Box>
              <Box><Typography variant="h5" fontWeight={700}>{k.value?.toLocaleString('ar-SA')}</Typography><Typography variant="caption" color="text.secondary">{k.label}</Typography></Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>الفعاليات حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={typeData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><RTooltip /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>توزيع الأنواع</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 70 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" />
                <RTooltip /><Bar dataKey="value" fill="#1976d2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>الفعاليات القادمة</Typography>
            {upcomingEvents.length === 0 ? <Typography color="text.secondary">لا توجد فعاليات قادمة</Typography> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell><TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell><TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow></TableHead>
                <TableBody>{upcomingEvents.map((e, i) => (
                  <TableRow key={i}>
                    <TableCell>{e.eventCode}</TableCell><TableCell>{e.titleAr}</TableCell>
                    <TableCell><Chip label={TYPE_LABELS[e.type] || e.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{e.startDate ? new Date(e.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell><Chip label="قادمة" size="small" color="info" /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
