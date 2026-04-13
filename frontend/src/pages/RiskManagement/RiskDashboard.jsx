/**
 * Risk Management Dashboard — لوحة إدارة المخاطر
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, CircularProgress, IconButton, Tooltip, Alert, Chip, Grid, useTheme, alpha,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Refresh, Warning, Shield, Assessment, GppBad } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { getRiskDashboard } from '../../services/riskManagement.service';

const CAT_LABELS = { strategic: 'استراتيجي', operational: 'تشغيلي', financial: 'مالي', compliance: 'امتثال', reputational: 'سمعة', technology: 'تقنية', environmental: 'بيئي', safety: 'سلامة', legal: 'قانوني', other: 'أخرى' };
const STATUS_LABELS = { identified: 'محددة', assessed: 'مقيّمة', mitigating: 'قيد التخفيف', monitoring: 'مراقبة', resolved: 'محلولة', accepted: 'مقبولة', closed: 'مغلقة' };
const PRIORITY_LABELS = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
const PRIORITY_COLORS = { critical: '#d32f2f', high: '#f57c00', medium: '#fbc02d', low: '#4caf50' };
const _COLORS = ['#d32f2f', '#f57c00', '#fbc02d', '#4caf50', '#2196f3', '#9c27b0', '#00bcd4', '#795548', '#607d8b', '#e91e63'];

export default function RiskDashboard() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setData(await getRiskDashboard()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={64} /></Box>;
  if (!data) return <Alert severity="error">لا توجد بيانات</Alert>;

  const { summary, risksByCategory, risksByStatus, risksByPriority, topRisks } = data;
  const kpis = [
    { label: 'إجمالي المخاطر', value: summary.totalRisks, icon: <Warning />, color: '#f57c00' },
    { label: 'مخاطر حرجة', value: summary.criticalRisks, icon: <GppBad />, color: '#d32f2f' },
    { label: 'قيد التخفيف', value: summary.mitigating, icon: <Shield />, color: '#2196f3' },
    { label: 'التقييمات', value: summary.totalAssessments, icon: <Assessment />, color: '#4caf50' },
  ];

  const catData = risksByCategory.map((c) => ({ name: CAT_LABELS[c.category] || c.category, value: c.count }));
  const priorityData = risksByPriority.map((p) => ({ name: PRIORITY_LABELS[p.priority] || p.priority, value: p.count, color: PRIORITY_COLORS[p.priority] || '#999' }));
  const statusData = risksByStatus.map((s) => ({ name: STATUS_LABELS[s.status] || s.status, value: s.count }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box><Typography variant="h4" fontWeight={700}>لوحة إدارة المخاطر</Typography><Typography variant="body2" color="text.secondary">سجل المخاطر والتقييمات والتخفيف</Typography></Box>
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
        {/* Priority Pie */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>المخاطر حسب الأولوية</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={priorityData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {priorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie><RTooltip /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        {/* Category Bar */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>المخاطر حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={catData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" />
                <RTooltip /><Bar dataKey="value" fill="#f57c00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        {/* Status Bar */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>المخاطر حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis />
                <RTooltip /><Bar dataKey="value" fill="#2196f3" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        {/* Top Risks */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>أهم المخاطر</Typography>
            {topRisks.length === 0 ? <Typography color="text.secondary">لا توجد مخاطر حرجة</Typography> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell><TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الأولوية</TableCell><TableCell sx={{ fontWeight: 700 }}>النتيجة</TableCell>
                </TableRow></TableHead>
                <TableBody>{topRisks.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.riskCode}</TableCell><TableCell>{r.titleAr}</TableCell>
                    <TableCell><Chip label={PRIORITY_LABELS[r.priority] || r.priority} size="small" sx={{ bgcolor: alpha(PRIORITY_COLORS[r.priority] || '#999', 0.15), color: PRIORITY_COLORS[r.priority], fontWeight: 600 }} /></TableCell>
                    <TableCell><Typography fontWeight={700}>{r.riskScore}</Typography></TableCell>
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
