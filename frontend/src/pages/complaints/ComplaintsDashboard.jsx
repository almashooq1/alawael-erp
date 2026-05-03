/**
 * ComplaintsDashboard — لوحة الشكاوى والمقترحات (Professional v2)
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
  Report as ReportIcon,
  CheckCircle as CheckIcon,
  HourglassTop as PendingIcon,
  Escalator as EscalateIcon,
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

const KPICard = ({ label, value, icon, gradient, delay = 0 }) => {
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

const PIE_COLORS = ['#b71c1c', '#c62828', '#d32f2f', '#e53935', '#ef5350', '#ef9a9a'];
const statusLabels = {
  new: 'جديدة',
  under_review: 'قيد المراجعة',
  resolved: 'تم الحل',
  closed: 'مغلقة',
  escalated: 'مُصعَّدة',
  rejected: 'مرفوضة',
};
const statusColors = {
  new: 'info',
  under_review: 'warning',
  resolved: 'success',
  closed: 'default',
  escalated: 'error',
  rejected: 'error',
};
const categoryLabels = {
  service: 'خدمة',
  employee: 'موظف',
  facility: 'مرافق',
  billing: 'مالية',
  medical: 'طبية',
  suggestion: 'مقترح',
  other: 'أخرى',
};
const priorityLabels = { low: 'منخفضة', medium: 'متوسطة', high: 'مرتفعة', critical: 'حرجة' };
const priorityColors = { low: 'default', medium: 'info', high: 'warning', critical: 'error' };

const DEMO = {
  total: 312,
  pending: 74,
  resolved: 198,
  escalated: 18,
  byCategory: [
    { name: 'خدمة', value: 98, color: PIE_COLORS[0] },
    { name: 'موظف', value: 72, color: PIE_COLORS[1] },
    { name: 'مرافق', value: 54, color: PIE_COLORS[2] },
    { name: 'مالية', value: 38, color: PIE_COLORS[3] },
    { name: 'مقترح', value: 30, color: PIE_COLORS[4] },
    { name: 'أخرى', value: 20, color: PIE_COLORS[5] },
  ],
  byMonth: [
    { month: 'يناير', count: 42 },
    { month: 'فبراير', count: 38 },
    { month: 'مارس', count: 55 },
    { month: 'أبريل', count: 48 },
    { month: 'مايو', count: 62 },
    { month: 'يونيو', count: 67 },
  ],
  complaints: [
    {
      _id: '1',
      refNo: 'CMP-001',
      subject: 'تأخر في تقديم خدمة التأهيل',
      category: 'service',
      priority: 'high',
      status: 'under_review',
      submittedAt: '2024-06-10',
      assignedTo: 'فريق الجودة',
    },
    {
      _id: '2',
      refNo: 'CMP-002',
      subject: 'مقترح: توفير موقف إضافي',
      category: 'suggestion',
      priority: 'low',
      status: 'new',
      submittedAt: '2024-06-12',
      assignedTo: null,
    },
    {
      _id: '3',
      refNo: 'CMP-003',
      subject: 'سلوك أحد الموظفين',
      category: 'employee',
      priority: 'medium',
      status: 'resolved',
      submittedAt: '2024-06-05',
      assignedTo: 'الموارد البشرية',
    },
    {
      _id: '4',
      refNo: 'CMP-004',
      subject: 'عطل في المصعد',
      category: 'facility',
      priority: 'critical',
      status: 'escalated',
      submittedAt: '2024-06-14',
      assignedTo: 'الصيانة',
    },
    {
      _id: '5',
      refNo: 'CMP-005',
      subject: 'خطأ في الفاتورة',
      category: 'billing',
      priority: 'medium',
      status: 'closed',
      submittedAt: '2024-06-01',
      assignedTo: 'المالية',
    },
  ],
};

export default function ComplaintsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/complaints/stats').catch(() => ({ data: {} }));
      const d = r?.data?.data || r?.data || {};
      if (d.total) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('ComplaintsDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.complaints || []).filter(c => {
    const ms =
      !search ||
      [c.refNo, c.subject, c.category].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const ms2 = !filterStatus || c.status === filterStatus;
    const mp = !filterPriority || c.priority === filterPriority;
    return ms && ms2 && mp;
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
            background: 'linear-gradient(135deg,#b71c1c,#c62828)',
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
                الشكاوى والمقترحات
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                استقبال، متابعة، وحل الشكاوى وتقييم المقترحات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`${dash.pending} معلقة`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`${dash.escalated} مُصعَّدة`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,80,80,0.4)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/complaints/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                شكوى جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الشكاوى"
                value={dash.total}
                icon={<ReportIcon />}
                gradient="linear-gradient(135deg,#b71c1c,#c62828)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="قيد المعالجة"
                value={dash.pending}
                icon={<PendingIcon />}
                gradient={gradients.warning}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="تم الحل"
                value={dash.resolved}
                icon={<CheckIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مُصعَّدة"
                value={dash.escalated}
                icon={<EscalateIcon />}
                gradient="linear-gradient(135deg,#e53935,#d32f2f)"
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
                  الشكاوى حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byCategory || DEMO.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byCategory || DEMO.byCategory).map((e, i) => (
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
                  الشكاوى الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byMonth || DEMO.byMonth}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد الشكاوى" fill="#c62828" radius={[4, 4, 0, 0]} />
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
                  placeholder="بحث بالرقم أو الموضوع..."
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
              <Grid item xs={6} sm={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الأولوية"
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} شكوى`}
                  sx={{ fontWeight: 700, bgcolor: '#b71c1c', color: '#fff' }}
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
                سجل الشكاوى
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد شكاوى مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['الرقم', 'الموضوع', 'الفئة', 'الأولوية', 'الحالة', 'المسؤول', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((c, i) => (
                      <TableRow
                        key={c._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}
                          >
                            {c.refNo || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12, maxWidth: 200 }} noWrap>
                            {c.subject || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={categoryLabels[c.category] || c.category || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#b71c1c', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={priorityLabels[c.priority] || c.priority || '—'}
                            color={priorityColors[c.priority] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[c.status] || c.status || '—'}
                            color={statusColors[c.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {c.assignedTo || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/complaints/${c._id}`)}
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
