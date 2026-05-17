/**
 * LeaveDashboard — لوحة إدارة الإجازات (Professional v2)
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
  BeachAccess as LeaveIcon,
  PendingActions as PendingIcon,
  CheckCircle as ApprovedIcon,
  EventBusy as RejectedIcon,
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
import { formatDate as _fmtDate } from 'utils/dateUtils';

const useCounter = (end, dur = 1000) => {
  const [v, setV] = useState(0);
  const ref = useRef(null);
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !end) return;
    const obs = new IntersectionObserver(
      ([e]) => {
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
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return { v, ref };
};

const KPICard = ({ label, value, icon, gradient, delay }) => {
  const { v, ref } = useCounter(typeof value === 'number' ? value : parseInt(value) || 0);
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -20,
            right: -20,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          },
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}
        >
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {v.toLocaleString('ar-SA')}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {label}
            </Typography>
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

const LEAVE_TYPE = {
  annual: 'سنوية',
  sick: 'مرضية',
  emergency: 'طارئة',
  unpaid: 'بدون راتب',
  maternity: 'أمومة',
  study: 'دراسية',
};
const LEAVE_STATUS = {
  pending: 'معلقة',
  approved: 'معتمدة',
  rejected: 'مرفوضة',
  cancelled: 'ملغاة',
};
const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
};
const DEPT_COLORS = ['#2e7d32', '#1565c0', '#e65100', '#6a1b9a', '#c62828', '#00695c'];

const DEMO = [
  {
    _id: '1',
    employee: 'أحمد سالم',
    type: 'annual',
    status: 'approved',
    startDate: '2025-03-25',
    endDate: '2025-04-01',
    days: 7,
    dept: 'التأهيل',
  },
  {
    _id: '2',
    employee: 'نورة العتيبي',
    type: 'sick',
    status: 'pending',
    startDate: '2025-03-22',
    endDate: '2025-03-23',
    days: 2,
    dept: 'التعليم',
  },
  {
    _id: '3',
    employee: 'فهد الدوسري',
    type: 'emergency',
    status: 'approved',
    startDate: '2025-03-20',
    endDate: '2025-03-20',
    days: 1,
    dept: 'الإدارة',
  },
  {
    _id: '4',
    employee: 'رانيا المطيري',
    type: 'annual',
    status: 'rejected',
    startDate: '2025-04-10',
    endDate: '2025-04-15',
    days: 5,
    dept: 'الصحة',
  },
  {
    _id: '5',
    employee: 'عمر القحطاني',
    type: 'unpaid',
    status: 'pending',
    startDate: '2025-04-01',
    endDate: '2025-04-05',
    days: 5,
    dept: 'الخدمات',
  },
];

const buildStats = arr => {
  const approved = arr.filter(r => r.status === 'approved').length;
  const pending = arr.filter(r => r.status === 'pending').length;
  const rejected = arr.filter(r => r.status === 'rejected').length;
  const byTypeMap = arr.reduce((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});
  const byType = Object.entries(byTypeMap).map(([k, v], i) => ({
    name: LEAVE_TYPE[k] || k,
    value: v,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));
  const byDeptMap = arr.reduce((acc, r) => {
    if (r.dept) acc[r.dept] = (acc[r.dept] || 0) + 1;
    return acc;
  }, {});
  const byDept = Object.entries(byDeptMap).map(([k, v], i) => ({
    dept: k,
    count: v,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));
  return { totalRequests: arr.length, approved, pending, rejected, byType, byDept };
};

export default function LeaveDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRequests: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    byType: [],
    byDept: [],
  });
  const [requests, setRequests] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/hr-system/leaves').catch(() => ({ data: [] }));
      const arr = Array.isArray(r.data) ? r.data : Array.isArray(r.data?.data) ? r.data.data : DEMO;
      const computed = arr.length ? buildStats(arr) : buildStats(DEMO);
      setStats(computed);
      setRequests(arr.length ? arr : DEMO);
    } catch (err) {
      logger.error('Leave Dashboard error', err);
      const s = buildStats(DEMO);
      setStats(s);
      setRequests(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = requests.filter(r => {
    const ms = !search || r.employee?.includes(search);
    const mt = !filterType || r.type === filterType;
    const ms2 = !filterStatus || r.status === filterStatus;
    return ms && mt && ms2;
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
            background: 'linear-gradient(135deg,#1b5e20,#2e7d32)',
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
                إدارة الإجازات
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                طلبات الإجازة، الاعتمادات، والسجلات الوظيفية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`إجمالي الطلبات: ${stats.totalRequests}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`معلقة: ${stats.pending}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/leave-management/requests/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                طلب إجازة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الطلبات"
                value={stats.totalRequests}
                icon={<LeaveIcon />}
                gradient="linear-gradient(135deg,#1b5e20,#2e7d32)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="معتمدة"
                value={stats.approved}
                icon={<ApprovedIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="معلقة"
                value={stats.pending}
                icon={<PendingIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مرفوضة"
                value={stats.rejected}
                icon={<RejectedIcon />}
                gradient="linear-gradient(135deg,#c62828,#b71c1c)"
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
                  الإجازات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={stats.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.byType.map((e, i) => (
                        <Cell key={i} fill={e.color || DEPT_COLORS[i % DEPT_COLORS.length]} />
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
                  الإجازات حسب القسم
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={stats.byDept}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    barSize={18}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="dept" tick={{ fontSize: 10 }} width={60} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد الطلبات" fill="#2e7d32" radius={[0, 4, 4, 0]} />
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
                  placeholder="بحث بالموظف..."
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
                  label="نوع الإجازة"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(LEAVE_TYPE).map(([k, v]) => (
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
                  {Object.entries(LEAVE_STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} طلب`}
                  sx={{ fontWeight: 700, bgcolor: '#2e7d32', color: '#fff' }}
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
                طلبات الإجازة
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد طلبات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['الموظف', 'النوع', 'الحالة', 'من', 'إلى', 'الأيام', 'القسم', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((r, i) => (
                      <TableRow
                        key={r._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#1b5e20' }}
                            >
                              {(r.employee || 'م').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {r.employee || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={LEAVE_TYPE[r.type] || r.type || '-'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#2e7d32', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={LEAVE_STATUS[r.status] || r.status || '-'}
                            color={STATUS_COLORS[r.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {r.startDate ? _fmtDate(r.startDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {r.endDate ? _fmtDate(r.endDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${r.days || 0} يوم`}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {r.dept || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/leave-management/requests/${r._id}`)}
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
