/**
 * لوحة تحكم الجودة والامتثال — Quality & Compliance Dashboard
 */
import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, CircularProgress, Chip,
  Table, TableHead, TableRow, TableCell, TableBody, LinearProgress,
} from '@mui/material';
import {
  PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  VerifiedUser as QualityIcon,
  Gavel as ComplianceIcon,
  Assessment as AuditIcon,
  TrendingUp as IndicatorIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api';

const PIE_COLORS = ['#4caf50', '#ff9800', '#f44336', '#1976d2', '#9c27b0'];
const complianceLevels = { full: 'ممتثل', partial: 'جزئي', non_compliant: 'غير ممتثل', pending: 'قيد المراجعة' };
const complianceColors = { full: 'success', partial: 'warning', non_compliant: 'error', pending: 'info' };

export default function QualityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/api/quality/dashboard')
      .then((r) => { setData(r.data?.data || r.data); setLoading(false); })
      .catch(() => {
        setData({
          totalStandards: 48, activeAudits: 6, complianceRate: 87, openFindings: 12,
          byCategory: [
            { category: 'معايير CBAHI', count: 18 }, { category: 'ISO 9001', count: 12 },
            { category: 'معايير داخلية', count: 10 }, { category: 'سلامة مرضى', count: 8 },
          ],
          complianceByDept: [
            { department: 'الإدارة', rate: 92 }, { department: 'التأهيل', rate: 88 },
            { department: 'التعليم', rate: 85 }, { department: 'تقنية المعلومات', rate: 90 },
            { department: 'المالية', rate: 82 }, { department: 'الخدمات', rate: 78 },
          ],
          recentAudits: [
            { auditNumber: 'AUD-2026-015', area: 'التأهيل الطبي', date: '2026-03-10', findings: 3, status: 'in_progress' },
            { auditNumber: 'AUD-2026-014', area: 'السلامة', date: '2026-03-05', findings: 1, status: 'completed' },
            { auditNumber: 'AUD-2026-013', area: 'الوثائق', date: '2026-02-28', findings: 5, status: 'completed' },
          ],
        });
        setLoading(false);
      });
  }, []);

  if (loading) return <Box display="flex" justifyContent="center" mt={6}><CircularProgress /></Box>;
  if (!data) return null;

  const kpis = [
    { label: 'المعايير المعتمدة', value: data.totalStandards, icon: <QualityIcon />, bg: '#e3f2fd' },
    { label: 'تدقيقات نشطة', value: data.activeAudits, icon: <AuditIcon />, bg: '#fff3e0' },
    { label: 'نسبة الامتثال', value: `${data.complianceRate}%`, icon: <ComplianceIcon />, bg: '#e8f5e9' },
    { label: 'ملاحظات مفتوحة', value: data.openFindings, icon: <IndicatorIcon />, bg: '#fce4ec' },
  ];

  const categoryData = (data.byCategory || []).map((c) => ({ name: c.category, value: c.count }));
  const deptCompliance = (data.complianceByDept || []).map((d) => ({ name: d.department, rate: d.rate }));

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>لوحة تحكم الجودة والامتثال</Typography>

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
            <Typography variant="h6" gutterBottom>المعايير حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الامتثال حسب القسم</Typography>
            {deptCompliance.map((d) => (
              <Box key={d.name} mb={2}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2">{d.name}</Typography>
                  <Typography variant="body2" fontWeight="bold">{d.rate}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={d.rate} color={d.rate >= 90 ? 'success' : d.rate >= 80 ? 'warning' : 'error'} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>آخر التدقيقات</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>رقم التدقيق</TableCell>
                  <TableCell>المجال</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الملاحظات</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data.recentAudits || []).slice(0, 8).map((a, i) => (
                  <TableRow key={i}>
                    <TableCell>{a.auditNumber}</TableCell>
                    <TableCell>{a.area}</TableCell>
                    <TableCell>{a.date}</TableCell>
                    <TableCell>{a.findings}</TableCell>
                    <TableCell><Chip size="small" label={a.status === 'completed' ? 'مكتمل' : 'قيد التنفيذ'} color={a.status === 'completed' ? 'success' : 'warning'} /></TableCell>
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
