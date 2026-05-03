/**
 * PayrollDashboard — لوحة الرواتب والمستحقات (Professional v2)
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Avatar,
  Button,
  Stack,
  useTheme,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  AccountBalance as PayrollIcon,
  TrendingUp as GrossIcon,
  TrendingDown as DeductIcon,
  People as EmployeesIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/api';
import { gradients } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';

const useCounter = (end, dur = 1000) => {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !end) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !ran.current) {
        ran.current = true;
        const t0 = Date.now();
        const step = () => {
          const p = Math.min((Date.now() - t0) / dur, 1);
          setV(Math.floor((1 - Math.pow(2, -10 * p)) * end));
          if (p < 1) requestAnimationFrame(step);
          else setV(end);
        };
        requestAnimationFrame(step);
      }
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return [v, ref];
};

const KPICard = ({ label, value, icon, gradient, delay = 0, suffix = '' }) => {
  const [count, ref] = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.12 }}
    >
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -16,
            right: -16,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
              {count.toLocaleString('ar-SA')}
              {suffix}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5, display: 'block' }}>
              {label}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
      </Paper>
    </motion.div>
  );
};

const statusLabels = {
  draft: 'مسودة',
  submitted: 'مقدم',
  approved: 'معتمد',
  processed: 'مُعالج',
  paid: 'مدفوع',
};
const statusColors = {
  draft: 'default',
  submitted: 'info',
  approved: 'primary',
  processed: 'warning',
  paid: 'success',
};
const deptLabels = {
  hr: 'الموارد البشرية',
  finance: 'المالية',
  it: 'تقنية المعلومات',
  operations: 'العمليات',
  admin: 'الإدارة',
  medical: 'الطبي',
  rehab: 'التأهيل',
};
const PIE_COLORS = ['#006064', '#00838f', '#0097a7', '#00acc1', '#26c6da', '#80deea'];

const DEMO = {
  totalPayroll: 486500,
  grossPay: 540000,
  deductions: 53500,
  employeeCount: 186,
  byDept: [
    { name: 'التأهيل', value: 148, color: PIE_COLORS[0] },
    { name: 'الطبي', value: 42, color: PIE_COLORS[1] },
    { name: 'الإدارة', value: 38, color: PIE_COLORS[2] },
    { name: 'تقنية المعلومات', value: 22, color: PIE_COLORS[3] },
    { name: 'المالية', value: 18, color: PIE_COLORS[4] },
    { name: 'الموارد البشرية', value: 15, color: PIE_COLORS[5] },
  ],
  monthlyTrend: [
    { month: 'يناير', amount: 472000 },
    { month: 'فبراير', amount: 478000 },
    { month: 'مارس', amount: 481000 },
    { month: 'أبريل', amount: 479000 },
    { month: 'مايو', amount: 485000 },
    { month: 'يونيو', amount: 486500 },
  ],
  payrolls: [
    {
      _id: '1',
      employeeName: 'أحمد محمد الزهراني',
      dept: 'it',
      grossPay: 12500,
      deductions: 1250,
      netPay: 11250,
      status: 'paid',
    },
    {
      _id: '2',
      employeeName: 'سارة خالد العتيبي',
      dept: 'rehab',
      grossPay: 9800,
      deductions: 980,
      netPay: 8820,
      status: 'paid',
    },
    {
      _id: '3',
      employeeName: 'محمد سالم الشمري',
      dept: 'medical',
      grossPay: 18000,
      deductions: 2160,
      netPay: 15840,
      status: 'approved',
    },
    {
      _id: '4',
      employeeName: 'هند عبدالرحمن المالكي',
      dept: 'admin',
      grossPay: 7500,
      deductions: 675,
      netPay: 6825,
      status: 'processed',
    },
    {
      _id: '5',
      employeeName: 'علي حسن القحطاني',
      dept: 'finance',
      grossPay: 11200,
      deductions: 1120,
      netPay: 10080,
      status: 'submitted',
    },
  ],
};

export default function PayrollDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const res = await apiClient.get(
        `/api/payroll/stats/${now.getMonth() + 1}/${now.getFullYear()}`
      );
      const d = res.data?.data || res.data || {};
      if (d.totalPayroll) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('PayrollDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.payrolls || []).filter(p => {
    const ms =
      !search || [p.employeeName].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const md = !filterDept || p.dept === filterDept;
    const ms2 = !filterStatus || p.status === filterStatus;
    return ms && md && ms2;
  });

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg,#006064,#00838f)',
            py: 3,
            px: 3,
            mb: -3,
            borderRadius: '0 0 24px 24px',
            position: 'relative',
            overflow: 'hidden',
            '&::after': {
              content: '""',
              position: 'absolute',
              top: -50,
              right: -50,
              width: 180,
              height: 180,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box>
              <Typography variant="h5" fontWeight={800} color="#fff">
                الرواتب والمستحقات
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                مسير الرواتب، الخصومات، المستحقات، وتقارير شهر{' '}
                {new Date().toLocaleString('ar', { month: 'long' })}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`إجمالي: ${dash.totalPayroll?.toLocaleString('ar-SA')} ر.س`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`${dash.employeeCount} موظف`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
              </Stack>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="تحديث">
                <IconButton
                  onClick={loadData}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                  }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/payroll/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                مسير جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الرواتب (ر.س)"
                value={dash.totalPayroll}
                icon={<PayrollIcon />}
                gradient="linear-gradient(135deg,#006064,#00838f)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="الراتب الإجمالي (ر.س)"
                value={dash.grossPay}
                icon={<GrossIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الخصومات (ر.س)"
                value={dash.deductions}
                icon={<DeductIcon />}
                gradient="linear-gradient(135deg,#c62828,#b71c1c)"
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="عدد الموظفين"
                value={dash.employeeCount}
                icon={<EmployeesIcon />}
                gradient={gradients.ocean}
                delay={3}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  توزيع الموظفين بالأقسام
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byDept || DEMO.byDept}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byDept || DEMO.byDept).map((e, i) => (
                        <Cell key={i} fill={e.color || PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  التطور الشهري لمسير الرواتب
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.monthlyTrend || DEMO.monthlyTrend}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                    />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="amount"
                      name="إجمالي الرواتب (ر.س)"
                      fill="#00838f"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث باسم الموظف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex' }}>
                        <SearchIcon fontSize="small" color="action" />
                      </Box>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="القسم"
                  value={filterDept}
                  onChange={e => setFilterDept(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(deptLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} سجل`}
                  sx={{ fontWeight: 700, bgcolor: '#006064', color: '#fff' }}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper
            elevation={0}
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                تفاصيل مسير الرواتب
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد سجلات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'الموظف',
                        'القسم',
                        'الراتب الإجمالي',
                        'الخصومات',
                        'الصافي',
                        'الحالة',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((p, i) => (
                      <TableRow
                        key={p._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, bgcolor: '#006064', fontSize: 12 }}
                            >
                              {(p.employeeName || 'م')[0]}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {p.employeeName || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={deptLabels[p.dept] || p.dept || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#006064', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 12, color: 'success.main', fontWeight: 600 }}
                          >
                            {p.grossPay?.toLocaleString('ar-SA')} ر.س
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12, color: 'error.main' }}>
                            {p.deductions?.toLocaleString('ar-SA')} ر.س
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 700 }}>
                            {p.netPay?.toLocaleString('ar-SA')} ر.س
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[p.status] || p.status || '—'}
                            color={statusColors[p.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/payroll/${p._id}`)}
                              sx={{ border: '1px solid', borderColor: 'divider' }}
                            >
                              <ViewIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>
    </DashboardErrorBoundary>
  );
}
