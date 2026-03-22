import React, { useState, useEffect, useCallback } from 'react';
import computeStatusCounts from '../../utils/computeStatusCounts';
import {
  Container, Typography, Grid, Paper, Box,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Button,
} from '@mui/material';
import {
  Accessibility as BenIcon,
  People as PeopleIcon,
  PersonAdd as NewIcon,
  CheckCircle as ActiveIcon,
  HourglassEmpty as PendingIcon,
  TrendingUp as TrendUpIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors, neutralColors, brandColors, progressColors } from '../../theme/palette';
import logger from '../../utils/logger';
import beneficiaryService from '../../services/beneficiaryService';
import { useNavigate } from 'react-router-dom';
import ModuleKPICard from '../../components/dashboard/shared/ModuleKPICard';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';

/* ──────── ثوابت ──────── */
const CATEGORY_LABELS = { physical: 'حركية', mental: 'ذهنية', sensory: 'حسية', multiple: 'متعددة', other: 'أخرى' };
const CATEGORY_COLORS = { physical: statusColors.info, mental: statusColors.pink, sensory: statusColors.warning, multiple: statusColors.purple, other: neutralColors.fallback };
const STATUS_LABELS = { active: 'نشط', pending: 'انتظار', inactive: 'غير نشط' };

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  total: 156,
  active: 118,
  pending: 22,
  inactive: 16,
  newThisMonth: 12,
  avgProgress: 67,
  avgSessions: 8.4,
  completionRate: 76,
};

const DEMO_BY_CATEGORY = [
  { name: 'حركية', value: 42, color: statusColors.info },
  { name: 'ذهنية', value: 38, color: chartColors.category[6] },
  { name: 'حسية', value: 30, color: statusColors.warning },
  { name: 'متعددة', value: 28, color: statusColors.purple },
  { name: 'أخرى', value: 18, color: neutralColors.fallback },
];

const DEMO_MONTHLY_REG = [
  { month: 'يناير', registrations: 14, active: 10 },
  { month: 'فبراير', registrations: 10, active: 12 },
  { month: 'مارس', registrations: 18, active: 16 },
  { month: 'أبريل', registrations: 12, active: 14 },
  { month: 'مايو', registrations: 16, active: 18 },
  { month: 'يونيو', registrations: 12, active: 15 },
];

const DEMO_STATUS_DIST = [
  { name: 'نشط', value: 118, color: statusColors.success },
  { name: 'انتظار', value: 22, color: statusColors.warning },
  { name: 'غير نشط', value: 16, color: statusColors.error },
];

const DEMO_PROGRESS_DIST = [
  { range: '0-20%', count: 12 },
  { range: '21-40%', count: 22 },
  { range: '41-60%', count: 38 },
  { range: '61-80%', count: 48 },
  { range: '81-100%', count: 36 },
];

const DEMO_AGE_DIST = [
  { range: '3-6 سنوات', count: 28 },
  { range: '7-12 سنة', count: 45 },
  { range: '13-18 سنة', count: 38 },
  { range: '19-25 سنة', count: 25 },
  { range: '25+ سنة', count: 20 },
];

const DEMO_RECENT = [
  { id: 1, name: 'أحمد محمد العلي', category: 'physical', status: 'active', progress: 75, sessions: 12, joinDate: '2026-01-08' },
  { id: 2, name: 'سارة عبدالله الحربي', category: 'mental', status: 'active', progress: 60, sessions: 8, joinDate: '2026-01-15' },
  { id: 3, name: 'خالد ناصر القحطاني', category: 'sensory', status: 'pending', progress: 0, sessions: 0, joinDate: '2026-02-01' },
  { id: 4, name: 'ريم فهد السبيعي', category: 'multiple', status: 'active', progress: 85, sessions: 18, joinDate: '2025-10-20' },
  { id: 5, name: 'عمر يوسف الدوسري', category: 'physical', status: 'active', progress: 45, sessions: 6, joinDate: '2026-01-22' },
];

export default function BeneficiariesDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [byCategory, setByCategory] = useState(DEMO_BY_CATEGORY);
  const [statusDist, setStatusDist] = useState(DEMO_STATUS_DIST);
  const [monthlyReg, setMonthlyReg] = useState(DEMO_MONTHLY_REG);
  const [progressDist, setProgressDist] = useState(DEMO_PROGRESS_DIST);
  const [ageDist, setAgeDist] = useState(DEMO_AGE_DIST);
  const [recentList, setRecentList] = useState(DEMO_RECENT);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await beneficiaryService.getAll().catch(err => { logger.warn('Beneficiaries: list fetch', err); return null; });
      const beneficiaries = res?.data || res || [];

      if (Array.isArray(beneficiaries) && beneficiaries.length > 0) {
        const { active, pending, inactive } = computeStatusCounts(
          beneficiaries, 'status', ['active', 'pending', 'inactive']
        );
        const now = new Date();
        const thisMonth = beneficiaries.filter(b => {
          const d = new Date(b.joinDate || b.createdAt);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        const avgProg = Math.round(beneficiaries.reduce((s, b) => s + (b.progress || 0), 0) / beneficiaries.length);
        const avgSess = (beneficiaries.reduce((s, b) => s + (b.sessions || 0), 0) / beneficiaries.length).toFixed(1);

        setStats({
          total: beneficiaries.length,
          active, pending, inactive,
          newThisMonth: thisMonth,
          avgProgress: avgProg,
          avgSessions: parseFloat(avgSess),
          completionRate: Math.round((beneficiaries.filter(b => (b.progress || 0) >= 80).length / beneficiaries.length) * 100),
        });

        /* by category */
        const catMap = {};
        beneficiaries.forEach(b => {
          const c = b.category || 'other';
          catMap[c] = (catMap[c] || 0) + 1;
        });
        const catArr = Object.entries(catMap).map(([k, v]) => ({
          name: CATEGORY_LABELS[k] || k, value: v, color: CATEGORY_COLORS[k] || neutralColors.fallback,
        }));
        if (catArr.length > 0) setByCategory(catArr);

        /* status dist */
        const _sMap = { active, pending, inactive };
        setStatusDist([
          { name: 'نشط', value: active, color: statusColors.success },
          { name: 'انتظار', value: pending, color: statusColors.warning },
          { name: 'غير نشط', value: inactive, color: statusColors.error },
        ]);

        /* monthly registrations */
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const regByMonth = {};
        beneficiaries.forEach(b => {
          const d = new Date(b.joinDate || b.createdAt);
          if (d.getFullYear() === now.getFullYear() || (now.getMonth() < 5 && d.getFullYear() === now.getFullYear() - 1)) {
            const key = months[d.getMonth()];
            regByMonth[key] = (regByMonth[key] || 0) + 1;
          }
        });
        const regArr = Object.entries(regByMonth).slice(-6).map(([month, registrations]) => ({
          month, registrations, active: Math.round(registrations * 0.75),
        }));
        if (regArr.length > 0) setMonthlyReg(regArr);

        /* progress distribution */
        const pBuckets = [0, 0, 0, 0, 0];
        beneficiaries.forEach(b => {
          const p = b.progress || 0;
          if (p <= 20) pBuckets[0]++;
          else if (p <= 40) pBuckets[1]++;
          else if (p <= 60) pBuckets[2]++;
          else if (p <= 80) pBuckets[3]++;
          else pBuckets[4]++;
        });
        setProgressDist([
          { range: '0-20%', count: pBuckets[0] },
          { range: '21-40%', count: pBuckets[1] },
          { range: '41-60%', count: pBuckets[2] },
          { range: '61-80%', count: pBuckets[3] },
          { range: '81-100%', count: pBuckets[4] },
        ]);

        /* age distribution */
        const aBuckets = [0, 0, 0, 0, 0];
        beneficiaries.forEach(b => {
          const a = b.age || 0;
          if (a <= 6) aBuckets[0]++;
          else if (a <= 12) aBuckets[1]++;
          else if (a <= 18) aBuckets[2]++;
          else if (a <= 25) aBuckets[3]++;
          else aBuckets[4]++;
        });
        setAgeDist([
          { range: '3-6 سنوات', count: aBuckets[0] },
          { range: '7-12 سنة', count: aBuckets[1] },
          { range: '13-18 سنة', count: aBuckets[2] },
          { range: '19-25 سنة', count: aBuckets[3] },
          { range: '25+ سنة', count: aBuckets[4] },
        ]);

        /* recent */
        const recent = beneficiaries
          .sort((a, b) => new Date(b.joinDate || b.createdAt) - new Date(a.joinDate || a.createdAt))
          .slice(0, 5)
          .map((b, i) => ({
            id: b._id || b.id || i,
            name: b.name || '-',
            category: b.category || 'other',
            status: b.status || 'active',
            progress: b.progress || 0,
            sessions: b.sessions || 0,
            joinDate: (b.joinDate || b.createdAt || '').toString().slice(0, 10),
          }));
        setRecentList(recent);
      }
    } catch (err) {
      logger.warn('BeneficiariesDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات المستفيدين — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const PROG_COLORS = progressColors;

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.accent, borderRadius: 3, p: 3, mb: 4, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BenIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">لوحة تحكم المستفيدين</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>تحليل وإحصائيات المستفيدين من خدمات المركز</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="inherit" sx={{ color: brandColors.primaryStart, fontWeight: 600 }} startIcon={<ArrowForwardIcon />} onClick={() => navigate('/beneficiaries')}>
          إدارة المستفيدين
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="إجمالي المستفيدين" value={stats.total} subtitle="مستفيد مسجل" icon={<PeopleIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="نشطون" value={stats.active} subtitle={`${Math.round(stats.active / Math.max(stats.total, 1) * 100)}% من الإجمالي`} icon={<ActiveIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="قيد الانتظار" value={stats.pending} subtitle="بحاجة لمتابعة" icon={<PendingIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="تسجيل هذا الشهر" value={stats.newThisMonth} subtitle="تسجيل جديد" icon={<NewIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="متوسط التقدم" value={`${stats.avgProgress}%`} subtitle="للمستفيدين النشطين" icon={<TrendUpIcon />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="نسبة الإنجاز" value={`${stats.completionRate}%`} subtitle="تقدم ≥ 80%" icon={<ActiveIcon />} color="success" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>التسجيل الشهري</Typography>
            {monthlyReg.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني للتسجيل الشهري">
                <AreaChart data={monthlyReg}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Area type="monotone" dataKey="registrations" fill={brandColors.primaryStart} fillOpacity={0.3} stroke={brandColors.primaryStart} strokeWidth={2} name="التسجيلات" />
                  <Area type="monotone" dataKey="active" fill={statusColors.success} fillOpacity={0.2} stroke={statusColors.success} strokeWidth={2} name="نشطون" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حالة المستفيدين</Typography>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لحالة المستفيدين">
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حسب نوع الإعاقة</Typography>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني حسب نوع الإعاقة">
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>توزيع التقدم</Typography>
            {progressDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني لتوزيع التقدم">
                <BarChart data={progressDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <RTooltip />
                  <Bar dataKey="count" name="عدد المستفيدين" radius={[4, 4, 0, 0]}>
                    {progressDist.map((_, i) => <Cell key={i} fill={PROG_COLORS[i]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>الفئات العمرية</Typography>
            {ageDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني للفئات العمرية">
                <BarChart data={ageDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="range" type="category" width={80} />
                  <RTooltip />
                  <Bar dataKey="count" fill={brandColors.primaryStart} name="عدد المستفيدين" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>آخر المستفيدين المسجلين</Typography>
          <Button size="small" onClick={() => navigate('/beneficiaries')}>عرض الكل</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نوع الإعاقة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>الجلسات</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>التقدم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ التسجيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentList.map(b => (
                <TableRow key={b.id} hover>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>
                    <Chip label={CATEGORY_LABELS[b.category] || b.category} size="small"
                      sx={{ bgcolor: CATEGORY_COLORS[b.category] || neutralColors.fallback, color: 'white' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[b.status] || b.status} size="small"
                      color={b.status === 'active' ? 'success' : b.status === 'pending' ? 'warning' : 'error'} />
                  </TableCell>
                  <TableCell align="center">{b.sessions}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate" value={b.progress}
                        sx={{ width: 60, height: 8, borderRadius: 4, bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: b.progress >= 80 ? statusColors.success : b.progress >= 50 ? statusColors.warning : statusColors.error,
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>{b.progress}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{b.joinDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
    </DashboardErrorBoundary>
  );
}
