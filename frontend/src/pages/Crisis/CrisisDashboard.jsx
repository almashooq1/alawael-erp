/**
 * لوحة تحكم الأزمات — Crisis Management Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, CircularProgress,
} from '@mui/material';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Warning as CrisisIcon,
  Shield as PlanIcon,
  Event as DrillIcon,
  ContactPhone as ContactIcon,
} from '@mui/icons-material';
import { getDashboard } from '../../services/crisisManagement.service';

const severityLabels = { minor: 'بسيط', moderate: 'متوسط', major: 'كبير', critical: 'حرج' };
const severityColors = { minor: '#4caf50', moderate: '#ff9800', major: '#f44336', critical: '#9c27b0' };
const statusLabels = { reported: 'مبلغ', acknowledged: 'تم الاستلام', in_progress: 'قيد المعالجة', contained: 'محتوى', resolved: 'محلول', closed: 'مغلق', escalated: 'مصعّد' };
const statusColors = { reported: 'error', acknowledged: 'info', in_progress: 'warning', contained: 'primary', resolved: 'success', closed: 'success', escalated: 'error' };
const typeLabels = { fire: 'حريق', earthquake: 'زلزال', flood: 'فيضان', medical: 'طبي', security: 'أمني', power_outage: 'انقطاع كهرباء', pandemic: 'وباء', evacuation: 'إخلاء', other: 'أخرى' };
const PIE_COLORS = ['#4caf50', '#ff9800', '#f44336', '#9c27b0'];

export default function CrisisDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard().then((r) => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'خطط الطوارئ', value: data.totalPlans, icon: <PlanIcon />, bg: '#e3f2fd' },
    { label: 'حوادث مفتوحة', value: data.openIncidents, icon: <CrisisIcon />, bg: '#fce4ec' },
    { label: 'التدريبات', value: data.totalDrills, icon: <DrillIcon />, bg: '#e8f5e9' },
    { label: 'جهات الطوارئ', value: data.emergencyContacts, icon: <ContactIcon />, bg: '#f3e5f5' },
  ];

  const severityData = (data.bySeverity || []).map((s) => ({
    name: severityLabels[s.severity] || s.severity, value: s.count, color: severityColors[s.severity] || '#607d8b',
  }));

  const typeData = (data.byType || []).map((t) => ({
    type: typeLabels[t.type] || t.type, count: t.count,
  }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم الأزمات والطوارئ</Typography>

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
            <Typography variant="h6" gutterBottom>حسب الخطورة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {severityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب نوع الحادث</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#f44336" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>أحدث الحوادث</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الخطورة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentIncidents || []).map((inc) => (
                  <TableRow key={inc._id}>
                    <TableCell>{inc.incidentNumber}</TableCell>
                    <TableCell>{inc.title}</TableCell>
                    <TableCell>{typeLabels[inc.type] || inc.type}</TableCell>
                    <TableCell>
                      <Chip size="small" label={severityLabels[inc.severity] || inc.severity} sx={{ bgcolor: severityColors[inc.severity], color: '#fff' }} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabels[inc.status] || inc.status} color={statusColors[inc.status] || 'default'} />
                    </TableCell>
                    <TableCell>{inc.reportedAt ? new Date(inc.reportedAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
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
