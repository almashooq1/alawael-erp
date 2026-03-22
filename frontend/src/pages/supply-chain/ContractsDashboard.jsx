import React, { useState, useEffect, useCallback } from 'react';
import computeStatusCounts from '../../utils/computeStatusCounts';
import {
  Container, Typography, Grid, Paper, Box,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Button,
} from '@mui/material';
import {
  Gavel as ContractsIcon,
  Description as DocIcon,
  EventAvailable as ActiveIcon,
  EventBusy as ExpiredIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors, neutralColors, brandColors } from '../../theme/palette';
import logger from '../../utils/logger';
import contractsService from '../../services/contracts.service';
import { useNavigate } from 'react-router-dom';
import ModuleKPICard from '../../components/dashboard/shared/ModuleKPICard';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  total: 48,
  active: 32,
  expired: 8,
  pending: 5,
  expiringSoon: 6,
  totalValue: 2450000,
  renewalRate: 82,
  avgDuration: 14,
};

const DEMO_BY_TYPE = [
  { name: 'عقود توظيف', value: 18, color: chartColors.category[0] },
  { name: 'عقود توريد', value: 12, color: chartColors.category[1] },
  { name: 'عقود صيانة', value: 8, color: chartColors.category[2] },
  { name: 'عقود خدمات', value: 6, color: chartColors.category[3] },
  { name: 'عقود إيجار', value: 4, color: chartColors.category[4] },
];

const DEMO_STATUS_DIST = [
  { name: 'نشط', value: 32, color: statusColors.success },
  { name: 'قيد المراجعة', value: 5, color: statusColors.warning },
  { name: 'منتهي', value: 8, color: statusColors.error },
  { name: 'معلق', value: 3, color: neutralColors.inactive },
];

const DEMO_MONTHLY_TREND = [
  { month: 'يناير', created: 5, renewed: 3, expired: 1, value: 320000 },
  { month: 'فبراير', created: 3, renewed: 2, expired: 2, value: 180000 },
  { month: 'مارس', created: 6, renewed: 4, expired: 1, value: 450000 },
  { month: 'أبريل', created: 4, renewed: 2, expired: 0, value: 280000 },
  { month: 'مايو', created: 5, renewed: 3, expired: 1, value: 390000 },
  { month: 'يونيو', created: 7, renewed: 5, expired: 2, value: 520000 },
];

const DEMO_VALUE_BY_TYPE = [
  { name: 'توظيف', value: 900000 },
  { name: 'توريد', value: 650000 },
  { name: 'صيانة', value: 400000 },
  { name: 'خدمات', value: 300000 },
  { name: 'إيجار', value: 200000 },
];

const DEMO_RECENT = [
  { id: 1, title: 'عقد توريد أجهزة طبية', party: 'شركة المعدات الطبية المتقدمة', type: 'توريد', value: 185000, startDate: '2026-01-15', endDate: '2027-01-14', status: 'active' },
  { id: 2, title: 'عقد صيانة مبنى المركز', party: 'مؤسسة الإعمار للصيانة', type: 'صيانة', value: 96000, startDate: '2025-06-01', endDate: '2026-05-31', status: 'expiring' },
  { id: 3, title: 'عقد توظيف معالج نطق', party: 'أ. نورة القحطاني', type: 'توظيف', value: 144000, startDate: '2026-02-01', endDate: '2028-01-31', status: 'active' },
  { id: 4, title: 'عقد خدمات تقنية معلومات', party: 'شركة تقنية الحلول', type: 'خدمات', value: 72000, startDate: '2025-03-01', endDate: '2026-02-28', status: 'expired' },
  { id: 5, title: 'عقد إيجار مستودع', party: 'شركة الأملاك العقارية', type: 'إيجار', value: 60000, startDate: '2025-09-01', endDate: '2026-08-31', status: 'active' },
];

const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  expiring: { label: 'ينتهي قريباً', color: 'warning' },
  expired: { label: 'منتهي', color: 'error' },
  pending: { label: 'معلق', color: 'default' },
  review: { label: 'قيد المراجعة', color: 'info' },
};

export default function ContractsDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [byType, setByType] = useState(DEMO_BY_TYPE);
  const [statusDist, setStatusDist] = useState(DEMO_STATUS_DIST);
  const [monthlyTrend, _setMonthlyTrend] = useState(DEMO_MONTHLY_TREND);
  const [valueByType, setValueByType] = useState(DEMO_VALUE_BY_TYPE);
  const [recentContracts, setRecentContracts] = useState(DEMO_RECENT);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [contractsRes, _summaryRes] = await Promise.all([
        contractsService.getAll().catch(err => { logger.warn('Contracts: list fetch', err); return null; }),
        contractsService.getStatsSummary ? contractsService.getStatsSummary().catch(err => { logger.warn('Contracts: summary fetch', err); return null; }) : Promise.resolve(null),
      ]);

      const contracts = contractsRes?.data || contractsRes || [];

      if (Array.isArray(contracts) && contracts.length > 0) {
        const now = new Date();
        const statusCounts = computeStatusCounts(
          contracts, 'status', ['active', 'expired', 'pending', 'review']
        );
        const active = statusCounts.active;
        const expired = statusCounts.expired;
        const pending = statusCounts.pending + statusCounts.review;
        const expiringSoon = contracts.filter(c => {
          if (!c.endDate) return false;
          const diff = (new Date(c.endDate) - now) / (1000 * 60 * 60 * 24);
          return diff <= 30 && diff > 0 && c.status === 'active';
        }).length;
        const totalValue = contracts.reduce((sum, c) => sum + (c.value || c.amount || 0), 0);

        setStats(prev => ({
          ...prev,
          total: contracts.length,
          active,
          expired,
          pending,
          expiringSoon,
          totalValue,
          renewalRate: prev.renewalRate,
        }));

        /* by type */
        const typeMap = {};
        const colors = chartColors.category;
        contracts.forEach(c => {
          const t = c.type || c.contractType || 'أخرى';
          typeMap[t] = (typeMap[t] || 0) + 1;
        });
        const typeArr = Object.entries(typeMap).map(([name, value], i) => ({
          name, value, color: colors[i % colors.length],
        }));
        if (typeArr.length > 0) setByType(typeArr);

        /* status distribution */
        const statusMap = {};
        const localStatusColors = { active: statusColors.success, expired: statusColors.error, pending: neutralColors.inactive, review: statusColors.warning };
        contracts.forEach(c => {
          const s = c.status || 'pending';
          statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const statusArr = Object.entries(statusMap).map(([name, value]) => ({
          name: STATUS_MAP[name]?.label || name,
          value,
          color: localStatusColors[name] || neutralColors.fallback,
        }));
        if (statusArr.length > 0) setStatusDist(statusArr);

        /* value by type */
        const valMap = {};
        contracts.forEach(c => {
          const t = c.type || c.contractType || 'أخرى';
          valMap[t] = (valMap[t] || 0) + (c.value || c.amount || 0);
        });
        const valArr = Object.entries(valMap).map(([name, value]) => ({ name, value }));
        if (valArr.length > 0) setValueByType(valArr);

        /* recent */
        const recent = contracts
          .sort((a, b) => new Date(b.createdAt || b.startDate) - new Date(a.createdAt || a.startDate))
          .slice(0, 5)
          .map((c, i) => ({
            id: c._id || i,
            title: c.title || c.name || 'عقد',
            party: c.party || c.vendor || c.employee || '-',
            type: c.type || c.contractType || '-',
            value: c.value || c.amount || 0,
            startDate: (c.startDate || '').slice(0, 10),
            endDate: (c.endDate || '').slice(0, 10),
            status: c.status || 'active',
          }));
        setRecentContracts(recent);
      }
    } catch (err) {
      logger.warn('ContractsDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات العقود — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.fire, borderRadius: 3, p: 3, mb: 4, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ContractsIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">لوحة تحكم العقود</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>إدارة ومتابعة العقود والاتفاقيات</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="inherit" sx={{ color: '#f12711', fontWeight: 600 }} startIcon={<ArrowForwardIcon />} onClick={() => navigate('/contracts')}>
          إدارة العقود
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="إجمالي العقود" value={stats.total} subtitle="عقد مسجل" icon={<DocIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="عقود نشطة" value={stats.active} subtitle={`${stats.renewalRate}% نسبة التجديد`} icon={<ActiveIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="منتهية" value={stats.expired} subtitle="عقد منتهي" icon={<ExpiredIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="تنتهي قريباً" value={stats.expiringSoon} subtitle="خلال 30 يوم" icon={<WarningIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="قيمة العقود" value={`${(stats.totalValue / 1000000).toFixed(1)}M`} subtitle="ر.س إجمالي" icon={<MoneyIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="متوسط المدة" value={`${stats.avgDuration} شهر`} subtitle="للعقود النشطة" icon={<TrendingUpIcon />} color="secondary" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>النشاط الشهري للعقود</Typography>
            {monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني للنشاط الشهري للعقود">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="created" fill={statusColors.primaryBlue} name="جديدة" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="renewed" fill={statusColors.success} name="مجددة" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="expired" fill={statusColors.error} name="منتهية" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="value" stroke={statusColors.warning} strokeWidth={2} name="القيمة (ر.س)" dot={{ r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حالة العقود</Typography>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لحالة العقود">
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
            <Typography variant="h6" fontWeight={600} gutterBottom>العقود حسب النوع</Typography>
            {byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني للعقود حسب النوع">
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byType.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>قيمة العقود حسب النوع</Typography>
            {valueByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني لقيمة العقود حسب النوع">
                <BarChart data={valueByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RTooltip formatter={v => `${v.toLocaleString()} ر.س`} />
                  <Bar dataKey="value" fill={brandColors.primaryStart} name="القيمة" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Contracts */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>آخر العقود</Typography>
          <Button size="small" onClick={() => navigate('/contracts')}>عرض الكل</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>العقد</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الطرف الآخر</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>القيمة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الانتهاء</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentContracts.map(c => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.title}</TableCell>
                  <TableCell>{c.party}</TableCell>
                  <TableCell>{c.type}</TableCell>
                  <TableCell align="center">{c.value > 0 ? `${c.value.toLocaleString()} ر.س` : '-'}</TableCell>
                  <TableCell>{c.endDate}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_MAP[c.status]?.label || c.status} color={STATUS_MAP[c.status]?.color || 'default'} size="small" />
                  </TableCell>
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
