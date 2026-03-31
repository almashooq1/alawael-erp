/**
 * PR Dashboard — لوحة العلاقات العامة والإعلام
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, CircularProgress, IconButton, Tooltip, Alert, Chip, Grid, useTheme, alpha,
  Table, TableHead, TableBody, TableRow, TableCell,
} from '@mui/material';
import { Refresh, Campaign, Newspaper, Handshake, ThumbUp } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import { getPRDashboard } from '../../services/publicRelations.service';

const SENTIMENT_LABELS = { positive: 'إيجابي', neutral: 'محايد', negative: 'سلبي' };
const SENTIMENT_COLORS = { positive: '#4caf50', neutral: '#ff9800', negative: '#f44336' };
const TYPE_LABELS = { press_release: 'بيان صحفي', news_article: 'مقال إخباري', tv_coverage: 'تغطية تلفزيونية', radio: 'إذاعة', social_media: 'وسائل التواصل', interview: 'مقابلة', report: 'تقرير', other: 'أخرى' };
const _COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2', '#0097a7', '#5d4037', '#607d8b'];

export default function PRDashboard() {
  const theme = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try { setData(await getPRDashboard()); } catch { setError('خطأ في التحميل'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress size={64} /></Box>;
  if (!data) return <Alert severity="error">لا توجد بيانات</Alert>;

  const { summary, mediaBySentiment, mediaByType, recentMedia } = data;
  const kpis = [
    { label: 'التغطيات الإعلامية', value: summary.totalMedia, icon: <Newspaper />, color: '#1976d2' },
    { label: 'حملات نشطة', value: summary.activeCampaigns, icon: <Campaign />, color: '#388e3c' },
    { label: 'شراكات فعالة', value: summary.activePartners, icon: <Handshake />, color: '#f57c00' },
    { label: 'تغطيات إيجابية', value: summary.positiveMedia, icon: <ThumbUp />, color: '#4caf50' },
  ];

  const sentimentData = mediaBySentiment.map((s) => ({ name: SENTIMENT_LABELS[s.sentiment] || s.sentiment, value: s.count, color: SENTIMENT_COLORS[s.sentiment] || '#999' }));
  const typeData = mediaByType.map((t) => ({ name: TYPE_LABELS[t.type] || t.type, value: t.count }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box><Typography variant="h4" fontWeight={700}>لوحة العلاقات العامة</Typography><Typography variant="body2" color="text.secondary">التغطية الإعلامية والحملات والشراكات</Typography></Box>
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
            <Typography variant="h6" fontWeight={600} mb={2}>توزيع المشاعر الإعلامية</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart><Pie data={sentimentData} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {sentimentData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie><RTooltip /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>التغطيات حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeData} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="name" />
                <RTooltip /><Bar dataKey="value" fill="#1976d2" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} mb={2}>آخر التغطيات الإعلامية</Typography>
            {recentMedia.length === 0 ? <Typography color="text.secondary">لا توجد تغطيات حديثة</Typography> : (
              <Table size="small">
                <TableHead><TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>الرمز</TableCell><TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell><TableCell sx={{ fontWeight: 700 }}>التوجه</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                </TableRow></TableHead>
                <TableBody>{recentMedia.map((m, i) => (
                  <TableRow key={i}>
                    <TableCell>{m.coverageCode}</TableCell><TableCell>{m.titleAr}</TableCell>
                    <TableCell><Chip label={TYPE_LABELS[m.type] || m.type} size="small" variant="outlined" /></TableCell>
                    <TableCell><Chip label={SENTIMENT_LABELS[m.sentiment] || m.sentiment} size="small" sx={{ bgcolor: alpha(SENTIMENT_COLORS[m.sentiment] || '#999', 0.1), color: SENTIMENT_COLORS[m.sentiment] }} /></TableCell>
                    <TableCell>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
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
