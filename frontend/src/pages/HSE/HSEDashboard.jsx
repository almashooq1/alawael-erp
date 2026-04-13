/**
 * لوحة تحكم الصحة والسلامة — HSE Dashboard
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Chip } from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboard } from '../../services/hse.service';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#9c27b0', '#607d8b'];

const severityLabels = { minor: 'بسيط', moderate: 'متوسط', serious: 'خطير', critical: 'حرج', fatal: 'مميت' };
const typeLabels = {
  injury: 'إصابة', near_miss: 'حادثة قريبة', property_damage: 'تلف ممتلكات', environmental: 'بيئية',
  fire: 'حريق', chemical: 'كيميائية', electrical: 'كهربائية', fall: 'سقوط', vehicle: 'مركبات', other: 'أخرى',
};
const statusLabels = { reported: 'مُبلغ', under_investigation: 'تحقيق', corrective_action: 'إجراء تصحيحي', closed: 'مغلق' };

export default function HSEDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await getDashboard();
      setData(r.data || r);
      setLoading(false);
    })();
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
  if (!data) return <Typography color="error" p={3}>تعذر تحميل البيانات</Typography>;

  const kpis = [
    { label: 'إجمالي الحوادث', value: data.totalIncidents, color: '#1976d2' },
    { label: 'حوادث مفتوحة', value: data.openIncidents, color: '#f44336' },
    { label: 'قيد التحقيق', value: data.investigating, color: '#ff9800' },
    { label: 'مغلقة', value: data.closed, color: '#4caf50' },
    { label: 'إجمالي التفتيشات', value: data.totalInspections, color: '#9c27b0' },
    { label: 'تفتيشات مجدولة', value: data.scheduledInspections, color: '#00bcd4' },
  ];

  const severityData = (data.bySeverity || []).map((s) => ({ name: severityLabels[s.severity] || s.severity, value: s.count }));
  const typeData = (data.byType || []).map((t) => ({ name: typeLabels[t.type] || t.type, value: t.count }));

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" mb={2}>لوحة تحكم الصحة والسلامة المهنية</Typography>

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        {kpis.map((k) => (
          <Grid item xs={6} sm={4} md={2} key={k.label}>
            <Paper sx={{ p: 2, textAlign: 'center', borderTop: `4px solid ${k.color}` }}>
              <Typography variant="h4" fontWeight="bold" color={k.color}>{k.value}</Typography>
              <Typography variant="body2" color="text.secondary">{k.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>الحوادث حسب الخطورة</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" outerRadius={100} label>
                  {severityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" mb={1}>الحوادث حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" /><YAxis /><Tooltip />
                <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Incidents */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" mb={1}>آخر الحوادث</Typography>
        {(data.recentIncidents || []).map((inc) => (
          <Box key={inc._id} display="flex" justifyContent="space-between" alignItems="center" py={1} borderBottom="1px solid #eee">
            <Box>
              <Typography fontWeight="bold">{inc.incidentNumber} — {inc.titleAr}</Typography>
              <Typography variant="caption" color="text.secondary">{typeLabels[inc.incidentType] || inc.incidentType} | {new Date(inc.incidentDate).toLocaleDateString('ar-SA')}</Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Chip size="small" label={severityLabels[inc.severity] || inc.severity} color={inc.severity === 'critical' || inc.severity === 'fatal' ? 'error' : inc.severity === 'serious' ? 'warning' : 'default'} />
              <Chip size="small" label={statusLabels[inc.status] || inc.status} variant="outlined" />
            </Box>
          </Box>
        ))}
      </Paper>
    </Box>
  );
}
