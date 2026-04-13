/**
 * لوحة تحكم التخطيط الاستراتيجي — Strategic Planning Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, CircularProgress, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Flag as GoalIcon,
  Lightbulb as InitiativeIcon,
  Speed as KPIIcon,
  Timeline as ProgressIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api';

const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336'];
const perspectiveLabels = { financial: 'المالية', customer: 'العملاء', internal_processes: 'العمليات الداخلية', learning_growth: 'التعلم والنمو' };
const perspectiveColors = { financial: '#1976d2', customer: '#4caf50', internal_processes: '#ff9800', learning_growth: '#9c27b0' };
const statusLabels = { not_started: 'لم يبدأ', in_progress: 'قيد التنفيذ', completed: 'مكتمل', delayed: 'متأخر', cancelled: 'ملغى' };
const statusColors = { not_started: 'default', in_progress: 'info', completed: 'success', delayed: 'error', cancelled: 'default' };

export default function StrategicDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/strategic-planning/dashboard')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalGoals: 24, totalInitiatives: 38, totalKPIs: 52, overallProgress: 68,
          byPerspective: [
            { perspective: 'financial', count: 6, progress: 72 },
            { perspective: 'customer', count: 7, progress: 65 },
            { perspective: 'internal_processes', count: 6, progress: 70 },
            { perspective: 'learning_growth', count: 5, progress: 60 },
          ],
          initiativesByStatus: [
            { status: 'completed', count: 12 }, { status: 'in_progress', count: 18 },
            { status: 'delayed', count: 5 }, { status: 'not_started', count: 3 },
          ],
          recentInitiatives: [
            { title: 'تطوير الخدمات الرقمية', perspective: 'internal_processes', progress: 85, status: 'in_progress' },
            { title: 'رفع رضا المستفيدين', perspective: 'customer', progress: 60, status: 'in_progress' },
            { title: 'تأهيل الكوادر الوطنية', perspective: 'learning_growth', progress: 45, status: 'in_progress' },
            { title: 'خفض التكاليف التشغيلية', perspective: 'financial', progress: 100, status: 'completed' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'الأهداف الاستراتيجية', value: data.totalGoals, icon: <GoalIcon />, bg: '#e3f2fd' },
    { label: 'المبادرات', value: data.totalInitiatives, icon: <InitiativeIcon />, bg: '#fff3e0' },
    { label: 'مؤشرات الأداء', value: data.totalKPIs, icon: <KPIIcon />, bg: '#e8f5e9' },
    { label: 'التقدم العام', value: `${data.overallProgress}%`, icon: <ProgressIcon />, bg: '#f3e5f5' },
  ];

  const statusData = (data.initiativesByStatus || []).map((s) => ({
    name: statusLabels[s.status] || s.status, value: s.count,
  }));
  const perspectiveData = (data.byPerspective || []).map((p) => ({
    name: perspectiveLabels[p.perspective] || p.perspective, progress: p.progress, goals: p.count,
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة التخطيط الاستراتيجي</Typography>

      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <Card sx={{ bgcolor: k.bg }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {k.icon}
                <Box>
                  <Typography variant="h5" fontWeight="bold">{k.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حالة المبادرات</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>التقدم حسب المنظور (BSC)</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={perspectiveData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="progress" name="التقدم %" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>المبادرات الحالية</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>المبادرة</TableCell>
                  <TableCell>المنظور</TableCell>
                  <TableCell>التقدم</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentInitiatives || []).slice(0, 8).map((ini, i) => (
                  <TableRow key={i}>
                    <TableCell>{ini.title}</TableCell>
                    <TableCell>
                      <Chip size="small" label={perspectiveLabels[ini.perspective] || ini.perspective}
                        sx={{ bgcolor: perspectiveColors[ini.perspective] || '#607d8b', color: '#fff' }} />
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress variant="determinate" value={ini.progress} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
                        <Typography variant="caption">{ini.progress}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><Chip size="small" label={statusLabels[ini.status] || ini.status} color={statusColors[ini.status] || 'default'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
