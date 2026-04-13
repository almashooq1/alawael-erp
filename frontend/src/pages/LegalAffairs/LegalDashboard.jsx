/**
 * Legal Dashboard — لوحة الشؤون القانونية
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, IconButton, Tooltip, Alert, Chip,
  Table, TableHead, TableBody, TableRow, TableCell, useTheme, alpha,
} from '@mui/material';
import { Refresh, Gavel, EventNote, Balance, AttachMoney } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { getLegalDashboard } from '../../services/legalAffairs.service';

const TYPE_LABELS = { litigation: 'تقاضي', arbitration: 'تحكيم', labor: 'عمالية', commercial: 'تجارية', administrative: 'إدارية', regulatory: 'تنظيمية', other: 'أخرى' };
const STATUS_LABELS = { open: 'مفتوحة', in_progress: 'جارية', pending_hearing: 'بانتظار جلسة', pending_judgment: 'بانتظار حكم', appealed: 'مستأنفة', closed: 'مغلقة', settled: 'تسوية', won: 'ربح', lost: 'خسارة' };
const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B', '#E91E63'];

export default function LegalDashboard() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setData(await getLegalDashboard()); } catch { setError('خطأ في تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress size={60} /></Box>;

  const s = data?.summary || {};
  const byType = (data?.casesByType || []).map((c) => ({ name: TYPE_LABELS[c._id] || c._id, value: c.count }));
  const byStatus = (data?.casesByStatus || []).map((c) => ({ name: STATUS_LABELS[c._id] || c._id, value: c.count }));
  const hearings = data?.upcomingHearings || [];

  const cards = [
    { label: 'القضايا المفتوحة', value: s.openCases, icon: <Gavel />, color: '#F44336' },
    { label: 'جلسات قادمة', value: s.pendingHearings, icon: <EventNote />, color: '#FF9800' },
    { label: 'الاستشارات المعلقة', value: s.pendingConsultations, icon: <Balance />, color: '#2196F3' },
    { label: 'إجمالي المطالبات', value: `${(s.totalClaims || 0).toLocaleString('ar-SA')} ر.س`, icon: <AttachMoney />, color: '#4CAF50' },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>الشؤون القانونية</Typography>
          <Typography variant="body2" color="text.secondary">لوحة إدارة القضايا والاستشارات</Typography>
        </Box>
        <Tooltip title="تحديث"><IconButton onClick={fetch} color="primary"><Refresh /></IconButton></Tooltip>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {cards.map((c, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Box sx={{ color: c.color, mb: 1 }}>{c.icon}</Box>
                <Typography variant="h5" fontWeight={700} color={c.color}>{c.value}</Typography>
                <Typography variant="caption" color="text.secondary">{c.label}</Typography>
              </Paper>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>القضايا حسب النوع</Typography>
            {byType.length === 0 ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات</Typography> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart><Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                  {byType.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                </Pie><RTooltip /></PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>القضايا حسب الحالة</Typography>
            {byStatus.length === 0 ? <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>لا توجد بيانات</Typography> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={byStatus}><CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><RTooltip />
                  <Bar dataKey="value" fill="#9C27B0" name="عدد القضايا" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}><Typography variant="h6" fontWeight={600}>الجلسات القادمة</Typography></Box>
            {hearings.length === 0 ? <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>لا توجد جلسات قادمة</Typography> : (
              <Table size="small">
                <TableHead><TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <TableCell sx={{ fontWeight: 700 }}>رقم القضية</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>المحكمة</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {hearings.map((h, i) => (
                    <TableRow key={h._id || i}>
                      <TableCell><Typography fontWeight={600}>{h.caseNumber}</Typography></TableCell>
                      <TableCell>{h.title}</TableCell>
                      <TableCell>{h.nextHearing ? new Date(h.nextHearing).toLocaleDateString('ar-SA') : '—'}</TableCell>
                      <TableCell>{h.court?.name || '—'}</TableCell>
                      <TableCell><Chip label={STATUS_LABELS[h.status] || h.status} size="small" color="warning" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
