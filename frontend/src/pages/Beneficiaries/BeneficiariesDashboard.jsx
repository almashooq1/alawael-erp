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
      /* ── Try server-aggregated statistics first ── */
      const [statsRes, recentRes] = await Promise.allSettled([
        beneficiaryService.getStatistics(),
        beneficiaryService.getRecent(),
      ]);

      const sData = statsRes.status === 'fulfilled' ? (statsRes.value?.data?.data || statsRes.value?.data || null) : null;
      const rData = recentRes.status === 'fulfilled' ? (recentRes.value?.data?.data || recentRes.value?.data || []) : null;

      if (sData) {
        /* Server returned aggregated stats — use them directly */
        setStats({
          total: sData.total ?? DEMO_STATS.total,
          active: sData.byStatus?.active ?? sData.active ?? DEMO_STATS.active,
          pending: sData.byStatus?.pending ?? sData.pending ?? DEMO_STATS.pending,
          inactive: sData.byStatus?.inactive ?? sData.inactive ?? DEMO_STATS.inactive,
          newThisMonth: sData.newThisMonth ?? DEMO_STATS.newThisMonth,
          avgProgress: sData.avgProgress ?? DEMO_STATS.avgProgress,
          avgSessions: sData.avgSessions ?? DEMO_STATS.avgSessions,
          completionRate: sData.completionRate ?? DEMO_STATS.completionRate,
        });

        /* by category */
        if (sData.byCategory && sData.byCategory.length > 0) {
          setByCategory(sData.byCategory.map(c => ({
            name: CATEGORY_LABELS[c._id || c.name] || c._id || c.name || 'أخرى',
            value: c.count || c.value || 0,
            color: CATEGORY_COLORS[c._id || c.name] || neutralColors.fallback,
          })));
        }

        /* status distribution from byStatus */
        if (sData.byStatus) {
          setStatusDist([
            { name: 'نشط', value: sData.byStatus.active || 0, color: statusColors.success },
            { name: 'انتظار', value: sData.byStatus.pending || 0, color: statusColors.warning },
            { name: 'غير نشط', value: sData.byStatus.inactive || 0, color: statusColors.error },
          ]);
        }

        /* monthly registrations */
        if (sData.monthlyRegistrations && sData.monthlyRegistrations.length > 0) {
          const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
          setMonthlyReg(sData.monthlyRegistrations.map(r => ({
            month: months[(r._id?.month || r.month || 1) - 1] || r.month,
            registrations: r.count || r.registrations || 0,
            active: Math.round((r.count || r.registrations || 0) * 0.75),
          })));
        }

        /* progress distribution */
        if (sData.progressDistribution && sData.progressDistribution.length > 0) {
          const labels = ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'];
          setProgressDist(sData.progressDistribution.map((p, i) => ({
            range: labels[i] || p.range || `${p._id?.min || 0}-${p._id?.max || 100}%`,
            count: p.count || 0,
          })));
        }

        /* age distribution */
        if (sData.ageDistribution && sData.ageDistribution.length > 0) {
          const ageLabels = { 0: '0-6 سنوات', 7: '7-12 سنة', 13: '13-18 سنة', 19: '19-25 سنة', 26: '25+ سنة' };
          setAgeDist(sData.ageDistribution.map(a => ({
            range: ageLabels[a._id?.min ?? a.min] || a.range || `${a._id?.min || 0}-${a._id?.max || 99}`,
            count: a.count || 0,
          })));
        }
      } else {
        /* Fallback: compute stats client-side from getAll */
        const res = await beneficiaryService.getAll().catch(err => { logger.warn('Beneficiaries: list fetch', err); return null; });
        const beneficiaries = res?.data?.data || res?.data || res || [];

        if (Array.isArray(beneficiaries) && beneficiaries.length > 0) {
          const { active, pending, inactive } = computeStatusCounts(beneficiaries, 'status', ['active', 'pending', 'inactive']);
          const now = new Date();
          const thisMonth = beneficiaries.filter(b => {
            const d = new Date(b.joinDate || b.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length;
          const avgProg = Math.round(beneficiaries.reduce((s, b) => s + (b.progress || 0), 0) / beneficiaries.length);
          const avgSess = (beneficiaries.reduce((s, b) => s + (b.sessions || 0), 0) / beneficiaries.length).toFixed(1);

          setStats({
            total: beneficiaries.length, active, pending, inactive,
            newThisMonth: thisMonth, avgProgress: avgProg,
            avgSessions: parseFloat(avgSess),
            completionRate: Math.round((beneficiaries.filter(b => (b.progress || 0) >= 80).length / beneficiaries.length) * 100),
          });
        }
      }

      /* Recent beneficiaries from API or fallback */
      if (Array.isArray(rData) && rData.length > 0) {
        setRecentList(rData.map((b, i) => ({
          id: b._id || b.id || i,
          name: b.fullName || b.name || `${b.firstName_ar || b.firstName || ''} ${b.lastName_ar || b.lastName || ''}`.trim() || '—',
          category: b.category || b.disability?.type || 'other',
          status: b.status || 'active',
          progress: b.progress || 0,
          sessions: b.sessions || 0,
          joinDate: (b.registrationDate || b.joinDate || b.createdAt || '').toString().slice(0, 10),
        })));
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
          <Paper sx={{ p: 3, borderRadius: '20px', height: '100%', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendUpIcon sx={{ fontSize: 20, color: '#10b981' }} />
                </Box>
                <Typography variant="h6" fontWeight={700} fontSize="1rem">التسجيل الشهري</Typography>
              </Box>
              <Chip label="آخر 6 أشهر" size="small" variant="outlined" sx={{ borderRadius: '8px', fontWeight: 500 }} />
            </Box>
            {monthlyReg.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني للتسجيل الشهري">
                <AreaChart data={monthlyReg}>
                  <defs>
                    <linearGradient id="benReg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={brandColors.primaryStart} stopOpacity={0.2} /><stop offset="95%" stopColor={brandColors.primaryStart} stopOpacity={0.01} /></linearGradient>
                    <linearGradient id="benActive" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={statusColors.success} stopOpacity={0.15} /><stop offset="95%" stopColor={statusColors.success} stopOpacity={0.01} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="registrations" fill="url(#benReg)" stroke={brandColors.primaryStart} strokeWidth={2.5} name="التسجيلات" dot={{ r: 4, fill: brandColors.primaryStart }} activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="active" fill="url(#benActive)" stroke={statusColors.success} strokeWidth={2} name="نشطون" dot={{ r: 3, fill: statusColors.success }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: '20px', height: '100%', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PeopleIcon sx={{ fontSize: 20, color: '#6366f1' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">حالة المستفيدين</Typography>
            </Box>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لحالة المستفيدين">
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
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
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(236,72,153,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BenIcon sx={{ fontSize: 20, color: '#ec4899' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">حسب نوع الإعاقة</Typography>
            </Box>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني حسب نوع الإعاقة">
                <PieChart>
                  <Pie data={byCategory} cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byCategory.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                  </Pie>
                  <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendUpIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">توزيع التقدم</Typography>
            </Box>
            {progressDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني لتوزيع التقدم">
                <BarChart data={progressDist} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" name="عدد المستفيدين" radius={[8, 8, 0, 0]}>
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
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PeopleIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
              </Box>
              <Typography variant="h6" fontWeight={700} fontSize="1rem">الفئات العمرية</Typography>
            </Box>
            {ageDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني للفئات العمرية">
                <BarChart data={ageDist} layout="vertical" barSize={20}>
                  <defs>
                    <linearGradient id="benAgeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#6366f1" /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#999' }} />
                  <YAxis dataKey="range" type="category" width={80} tick={{ fontSize: 12, fill: '#999' }} />
                  <RTooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" fill="url(#benAgeGrad)" name="عدد المستفيدين" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent */}
      <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', transition: 'all 0.3s', '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <NewIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
            </Box>
            <Typography variant="h6" fontWeight={700} fontSize="1rem">آخر المستفيدين المسجلين</Typography>
          </Box>
          <Button size="small" onClick={() => navigate('/beneficiaries')} sx={{ borderRadius: '10px', fontWeight: 600, fontSize: '12px' }} endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}>عرض الكل</Button>
        </Box>
        <TableContainer>
          <Table sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(0,0,0,0.06)' } }}>
            <TableHead>
              <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary', fontSize: '12px', letterSpacing: 0.5, bgcolor: 'rgba(0,0,0,0.02)' } }}>
                <TableCell>الاسم</TableCell>
                <TableCell>نوع الإعاقة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الجلسات</TableCell>
                <TableCell align="center">التقدم</TableCell>
                <TableCell>تاريخ التسجيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentList.map(b => (
                <TableRow key={b.id} sx={{ cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.015)' } }} onClick={() => navigate(`/beneficiary-portal/${b.id}`)}>
                  <TableCell sx={{ fontWeight: 600 }}>{b.name}</TableCell>
                  <TableCell>
                    <Chip label={CATEGORY_LABELS[b.category] || b.category} size="small"
                      sx={{ bgcolor: CATEGORY_COLORS[b.category] || neutralColors.fallback, color: 'white', fontWeight: 600, borderRadius: '8px' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={STATUS_LABELS[b.status] || b.status} size="small"
                      sx={{
                        fontWeight: 600, borderRadius: '8px',
                        bgcolor: b.status === 'active' ? 'rgba(16,185,129,0.1)' : b.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                        color: b.status === 'active' ? '#059669' : b.status === 'pending' ? '#D97706' : '#DC2626',
                      }} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip label={b.sessions} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#6366f1', fontWeight: 700, borderRadius: '8px' }} />
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate" value={b.progress}
                        sx={{ width: 60, height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.04)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: b.progress >= 80 ? 'linear-gradient(90deg, #10b981, #34d399)' : b.progress >= 50 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #ef4444, #f87171)',
                          },
                        }}
                      />
                      <Chip label={`${b.progress}%`} size="small" sx={{ height: 22, fontSize: '11px', fontWeight: 700, bgcolor: b.progress >= 80 ? 'rgba(16,185,129,0.1)' : b.progress >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', color: b.progress >= 80 ? '#059669' : b.progress >= 50 ? '#D97706' : '#DC2626', borderRadius: '6px' }} />
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: '13px' }}>{b.joinDate}</TableCell>
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
