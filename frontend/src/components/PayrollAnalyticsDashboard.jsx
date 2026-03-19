/**
 * Payroll Analytics Dashboard — لوحة تحليلات الرواتب
 * Modern MUI rewrite with Recharts and demo data fallback
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Grid, Paper, Box, Button, TextField, Card, CardContent,
  Chip, Avatar, IconButton, Tooltip, CircularProgress, Divider,
  MenuItem, LinearProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import {
  Refresh as RefreshIcon, Download as DownloadIcon, Print as PrintIcon,
  Groups as GroupsIcon, AttachMoney as MoneyIcon,
  TrendingUp as TrendIcon, TrendingDown as DownIcon,
  Percent as PercentIcon, Assessment as AssessmentIcon,
  EmojiEvents as TrophyIcon, Analytics as AnalyticsIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import apiClient from 'services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';
import { DEPT_COLORS } from '../constants/departmentColors';
import { statusColors, chartColors, neutralColors, surfaceColors, gradients, rankColors } from 'theme/palette';

/* ─── Constants ─── */

const PIE_COLORS = [...chartColors.category.slice(0, 6), chartColors.blueGray, statusColors.tealDark];

/* ─── Demo Data ─── */
const DEMO_ANALYTICS = {
  summary: { totalEmployees: 10, totalPayroll: 137750, averageSalary: 13775, maxSalary: 18000, minSalary: 8500 },
  payrollStats: { approvalRate: 92, processedCount: 10, pendingCount: 0 },
  departmentStats: [
    { name: 'تقنية المعلومات', total: 27500, count: 2, average: 13750 },
    { name: 'الموارد البشرية', total: 14500, count: 1, average: 14500 },
    { name: 'المالية', total: 16200, count: 1, average: 16200 },
    { name: 'التعليم', total: 12500, count: 1, average: 12500 },
    { name: 'العمليات', total: 15750, count: 1, average: 15750 },
    { name: 'الإدارة', total: 21800, count: 1, average: 21800 },
    { name: 'التأهيل', total: 10200, count: 1, average: 10200 },
    { name: 'خدمة العملاء', total: 11000, count: 1, average: 11000 },
  ],
  incentiveStats: { total: 18000, count: 8, average: 2250 },
  deductionStats: {
    total: 15750,
    types: [
      { name: 'GOSI (تأمينات)', percentage: 58, total: 9135, color: chartColors.category[9] },
      { name: 'التأمين الصحي', percentage: 22, total: 3465, color: statusColors.warning },
      { name: 'سلف وقروض', percentage: 12, total: 1890, color: statusColors.info },
      { name: 'أخرى', percentage: 8, total: 1260, color: neutralColors.inactive },
    ],
  },
  trends: [
    { month: '2025-10', totalPayroll: 130500, totalIncentives: 12000, totalDeductions: 14200, employeeCount: 10 },
    { month: '2025-11', totalPayroll: 132000, totalIncentives: 15000, totalDeductions: 14800, employeeCount: 10 },
    { month: '2025-12', totalPayroll: 135000, totalIncentives: 20000, totalDeductions: 15100, employeeCount: 10 },
    { month: '2026-01', totalPayroll: 136200, totalIncentives: 16000, totalDeductions: 15400, employeeCount: 10 },
    { month: '2026-02', totalPayroll: 137750, totalIncentives: 18000, totalDeductions: 15750, employeeCount: 10 },
  ],
  topPerformers: [
    { employeeName: 'أحمد محمد العتيبي', department: 'تقنية المعلومات', totalIncentives: 5000 },
    { employeeName: 'منى القحطاني', department: 'الإدارة', totalIncentives: 4500 },
    { employeeName: 'خالد العلي الشهري', department: 'المالية', totalIncentives: 3500 },
    { employeeName: 'هند الشمري', department: 'خدمة العملاء', totalIncentives: 3000 },
    { employeeName: 'فهد الحربي', department: 'العمليات', totalIncentives: 2000 },
  ],
  salaryDistribution: [
    { range: '3,000 - 8,000', count: 1, percentage: 10 },
    { range: '8,001 - 12,000', count: 4, percentage: 40 },
    { range: '12,001 - 16,000', count: 3, percentage: 30 },
    { range: '16,001 - 20,000', count: 2, percentage: 20 },
  ],
};

const PayrollAnalyticsDashboard = () => {
  const showSnackbar = useSnackbar();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    department: 'all',
  });

  /* ─── Data Loading ─── */
  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters);
      const data = await apiClient.get(`/payroll/analytics?${params.toString()}`);
      setAnalytics(data);
    } catch {
      setAnalytics(DEMO_ANALYTICS);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  /* ─── Computed ─── */
  const { summary = {}, payrollStats = {}, departmentStats = [], incentiveStats = {},
    deductionStats = {}, trends = [], topPerformers = [], salaryDistribution = [],
  } = analytics || {};

  const deptChartData = useMemo(() =>
    departmentStats.map(d => ({ ...d, color: DEPT_COLORS[d.name] || neutralColors.textSecondary })),
    [departmentStats]);

  const pieData = useMemo(() =>
    deductionStats.types?.map(t => ({ name: t.name, value: t.total })) || [],
    [deductionStats]);

  /* ─── Handlers ─── */
  const handleExportCSV = useCallback(() => {
    const headers = ['القسم', 'عدد الموظفين', 'إجمالي الرواتب', 'المتوسط'];
    const rows = departmentStats.map(d => [d.name, d.count, d.total, d.average]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payroll-analytics.csv'; a.click();
    URL.revokeObjectURL(url);
    showSnackbar('تم التصدير بنجاح', 'success');
  }, [departmentStats, showSnackbar]);

  const fmt = (val) => (val || 0).toLocaleString('ar-SA');

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }}>جاري تحميل التحليلات...</Typography>
      </Container>
    );
  }

  /* ─── Render ─── */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Paper sx={{
        p: 3, mb: 3, borderRadius: 3,
        background: gradients.blueDark,
        color: 'white',
      }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <AnalyticsIcon fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>لوحة تحليلات الرواتب والحوافز</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                تحليلات شاملة لبيانات الرواتب والخصومات والحوافز
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="تحديث"><IconButton sx={{ color: 'white' }} onClick={loadAnalytics}><RefreshIcon /></IconButton></Tooltip>
            <Tooltip title="تصدير CSV"><IconButton sx={{ color: 'white' }} onClick={handleExportCSV}><DownloadIcon /></IconButton></Tooltip>
            <Tooltip title="طباعة"><IconButton sx={{ color: 'white' }} onClick={() => window.print()}><PrintIcon /></IconButton></Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <CalendarIcon color="action" />
        <TextField size="small" type="date" label="من" value={filters.startDate}
          onChange={e => setFilters({ ...filters, startDate: e.target.value })}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
        <TextField size="small" type="date" label="إلى" value={filters.endDate}
          onChange={e => setFilters({ ...filters, endDate: e.target.value })}
          InputLabelProps={{ shrink: true }} sx={{ minWidth: 160 }} />
        <TextField size="small" select label="القسم" value={filters.department}
          onChange={e => setFilters({ ...filters, department: e.target.value })} sx={{ minWidth: 160 }}>
          <MenuItem value="all">جميع الأقسام</MenuItem>
          {Object.keys(DEPT_COLORS).map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <Button variant="outlined" size="small" onClick={loadAnalytics} startIcon={<RefreshIcon />}>تطبيق</Button>
      </Paper>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'عدد الموظفين', value: fmt(summary.totalEmployees), sub: 'موظف نشط', icon: <GroupsIcon />, color: statusColors.primaryBlue },
          { label: 'إجمالي الرواتب', value: `${fmt(summary.totalPayroll)} ر.س`, sub: 'الشهر الحالي', icon: <MoneyIcon />, color: chartColors.category[2] },
          { label: 'الحوافز', value: `${fmt(incentiveStats.total)} ر.س`, sub: `${incentiveStats.count || 0} حافز`, icon: <TrophyIcon />, color: statusColors.warning },
          { label: 'الخصومات', value: `${fmt(deductionStats.total)} ر.س`, sub: `${deductionStats.types?.length || 0} نوع`, icon: <DownIcon />, color: chartColors.category[9] },
          { label: 'متوسط الراتب', value: `${fmt(summary.averageSalary)} ر.س`, sub: 'للموظف الواحد', icon: <TrendIcon />, color: chartColors.category[4] },
          { label: 'معدل الموافقة', value: `${payrollStats.approvalRate || 0}%`, sub: 'الرواتب الموافق عليها', icon: <PercentIcon />, color: statusColors.purple },
        ].map((m, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={idx}>
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', height: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1 }}>
                <Avatar sx={{ bgcolor: `${m.color}15`, color: m.color, width: 48, height: 48 }}>{m.icon}</Avatar>
                <Typography variant="body2" color="text.secondary">{m.label}</Typography>
                <Typography variant="h6" fontWeight={700}>{m.value}</Typography>
                <Typography variant="caption" color="text.secondary">{m.sub}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Department Distribution Bar Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>توزيع الرواتب حسب القسم</Typography>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={deptChartData} layout="vertical" margin={{ left: 80, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={v => v.toLocaleString('ar-SA')} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {deptChartData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Deductions Pie Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 400 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>توزيع الخصومات</Typography>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name }) => name}>
                  {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ mt: 1 }}>
              {deductionStats.types?.map((t, idx) => (
                <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" sx={{ py: 0.3 }}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: t.color || PIE_COLORS[idx] }} />
                    <Typography variant="caption">{t.name}</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={600}>{fmt(t.total)} ر.س</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Trends Line Chart */}
      {trends.length > 0 && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>الاتجاهات الشهرية</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends} margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => v.toLocaleString('ar-SA')} />
              <Line type="monotone" dataKey="totalPayroll" stroke={statusColors.primaryBlue} strokeWidth={2} name="الرواتب" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="totalIncentives" stroke={statusColors.success} strokeWidth={2} name="الحوافز" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="totalDeductions" stroke={chartColors.category[9]} strokeWidth={2} name="الخصومات" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <Box display="flex" justifyContent="center" gap={3} mt={1}>
            {[{ label: 'الرواتب', color: statusColors.primaryBlue }, { label: 'الحوافز', color: statusColors.success }, { label: 'الخصومات', color: chartColors.category[9] }].map(l => (
              <Box key={l.label} display="flex" alignItems="center" gap={0.5}>
                <Box sx={{ width: 12, height: 3, bgcolor: l.color, borderRadius: 1 }} />
                <Typography variant="caption">{l.label}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Bottom Row: Salary Distribution + Top Performers */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Salary Distribution */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>توزيع الرواتب</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: surfaceColors.lightGray }}>
                    <TableCell sx={{ fontWeight: 700 }}>نطاق الراتب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>عدد الموظفين</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النسبة</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '30%' }}>التوزيع</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {salaryDistribution.map((range, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{range.range}</TableCell>
                      <TableCell><Chip label={range.count} size="small" color="primary" variant="outlined" /></TableCell>
                      <TableCell>{range.percentage}%</TableCell>
                      <TableCell>
                        <LinearProgress variant="determinate" value={range.percentage}
                          sx={{ height: 8, borderRadius: 4, bgcolor: surfaceColors.infoLight,
                            '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: PIE_COLORS[idx % PIE_COLORS.length] } }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Top Performers */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              <TrophyIcon sx={{ verticalAlign: 'middle', mr: 0.5, color: statusColors.warning }} />
              أفضل الموظفين أداءً
            </Typography>
            {topPerformers.slice(0, 5).map((p, idx) => {
              const deptColor = DEPT_COLORS[p.department] || neutralColors.textSecondary;
              return (
                <Box key={idx} display="flex" alignItems="center" gap={2} sx={{
                  py: 1.5, borderBottom: idx < 4 ? `1px solid ${surfaceColors.softGray}` : 'none',
                }}>
                  <Avatar sx={{
                    bgcolor: idx === 0 ? rankColors.gold : idx === 1 ? rankColors.silver : idx === 2 ? rankColors.bronze : surfaceColors.divider,
                    color: idx < 3 ? 'white' : neutralColors.textSecondary, width: 36, height: 36, fontSize: 14, fontWeight: 700,
                  }}>
                    #{idx + 1}
                  </Avatar>
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>{p.employeeName}</Typography>
                    <Chip label={p.department} size="small"
                      sx={{ bgcolor: `${deptColor}15`, color: deptColor, fontSize: 11, height: 20, mt: 0.3 }} />
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="primary">
                    {fmt(p.totalIncentives)} ر.س
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        </Grid>
      </Grid>

      {/* Summary Stats */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          <AssessmentIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} /> ملخص إحصائي
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {[
            { label: 'أعلى راتب', value: `${fmt(summary.maxSalary)} ر.س`, color: statusColors.success },
            { label: 'أقل راتب', value: `${fmt(summary.minSalary)} ر.س`, color: chartColors.category[7] },
            { label: 'إجمالي الحوافز', value: `${fmt(incentiveStats.total)} ر.س`, color: statusColors.warning },
            { label: 'إجمالي الخصومات', value: `${fmt(deductionStats.total)} ر.س`, color: chartColors.category[9] },
            { label: 'متوسط الحافز', value: `${fmt(incentiveStats.average)} ر.س`, color: statusColors.info },
            { label: 'متوسط الخصم', value: `${fmt(deductionStats.average)} ر.س`, color: statusColors.purple },
          ].map((s, idx) => (
            <Grid item xs={6} sm={4} md={2} key={idx}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', borderRadius: 2,
                borderColor: `${s.color}40`, transition: 'all 0.2s',
                '&:hover': { borderColor: s.color, boxShadow: `0 2px 8px ${s.color}20` } }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="body1" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default PayrollAnalyticsDashboard;
