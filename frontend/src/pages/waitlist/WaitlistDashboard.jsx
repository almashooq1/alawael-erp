/**
 * WaitlistDashboard — لوحة قائمة الانتظار (Professional v2)
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
  FormatListNumbered as ListIcon,
  HourglassEmpty as WaitIcon,
  CheckCircle as ApprovedIcon,
  AccessTime as TimeIcon,
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

const KPICard = ({ label, value, icon, gradient, delay, suffix }) => {
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
              {suffix || ''}
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

const ENTRY_STATUS = {
  pending: 'قيد الانتظار',
  approved: 'معتمد',
  reviewing: 'قيد المراجعة',
  rejected: 'مرفوض',
};
const STATUS_COLORS = {
  pending: 'warning',
  approved: 'success',
  reviewing: 'info',
  rejected: 'error',
};
const PRIORITY = { low: 'منخفضة', normal: 'عادية', high: 'عالية', urgent: 'عاجلة' };
const PRIORITY_COLORS = { low: 'default', normal: 'primary', high: 'warning', urgent: 'error' };
const PIE_COLORS = ['#f57c00', '#2e7d32', '#1565c0', '#c62828'];

const DEMO = {
  totalEntries: 156,
  pending: 89,
  approved: 52,
  avgWaitDays: 14,
  entries: [
    {
      _id: '1',
      name: 'محمد العمري',
      dept: 'التأهيل الجسدي',
      status: 'pending',
      waitDays: 18,
      requestDate: '2025-02-15',
      priority: 'high',
    },
    {
      _id: '2',
      name: 'سارة القرني',
      dept: 'التخاطب',
      status: 'approved',
      waitDays: 7,
      requestDate: '2025-03-01',
      priority: 'normal',
    },
    {
      _id: '3',
      name: 'عبدالعزيز الخالد',
      dept: 'العلاج الوظيفي',
      status: 'reviewing',
      waitDays: 12,
      requestDate: '2025-02-22',
      priority: 'urgent',
    },
    {
      _id: '4',
      name: 'نورة الشمري',
      dept: 'الدعم النفسي',
      status: 'pending',
      waitDays: 25,
      requestDate: '2025-01-30',
      priority: 'high',
    },
    {
      _id: '5',
      name: 'خالد المقرن',
      dept: 'الطب الطبيعي',
      status: 'pending',
      waitDays: 30,
      requestDate: '2025-01-20',
      priority: 'normal',
    },
  ],
  byStatus: [
    { name: 'قيد الانتظار', value: 89, color: '#f57c00' },
    { name: 'معتمد', value: 52, color: '#2e7d32' },
    { name: 'مراجعة', value: 8, color: '#1565c0' },
    { name: 'مرفوض', value: 7, color: '#c62828' },
  ],
  byDepartment: [
    { dept: 'التأهيل', count: 38 },
    { dept: 'التخاطب', count: 27 },
    { dept: 'الوظيفي', count: 22 },
    { dept: 'الدعم النفسي', count: 18 },
    { dept: 'الطبيعي', count: 15 },
    { dept: 'التعليم', count: 10 },
  ],
};

export default function WaitlistDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [entries, setEntries] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/waitlist/stats').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setEntries(Array.isArray(d.entries) && d.entries.length ? d.entries : DEMO.entries);
    } catch (err) {
      logger.error('Waitlist Dashboard error', err);
      setDash(DEMO);
      setEntries(DEMO.entries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = entries.filter(e => {
    const ms = !search || e.name?.includes(search) || e.dept?.includes(search);
    const ms2 = !filterStatus || e.status === filterStatus;
    const mp = !filterPriority || e.priority === filterPriority;
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
            background: 'linear-gradient(135deg,#bf360c,#e65100)',
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
                قائمة الانتظار
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                إدارة طلبات الانتظار، الأولويات، والأقسام
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`إجمالي: ${dash.totalEntries || 156}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`متوسط الانتظار: ${dash.avgWaitDays || 14} يوم`}
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
                onClick={() => navigate('/waitlist/entries/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                إضافة طلب
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي السجلات"
                value={dash.totalEntries || 156}
                icon={<ListIcon />}
                gradient="linear-gradient(135deg,#bf360c,#e65100)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="قيد الانتظار"
                value={dash.pending || 89}
                icon={<WaitIcon />}
                gradient={gradients.warning}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="معتمد"
                value={dash.approved || 52}
                icon={<ApprovedIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="متوسط أيام الانتظار"
                value={dash.avgWaitDays || 14}
                suffix=" يوم"
                icon={<TimeIcon />}
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
                  الحالات
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byStatus || DEMO.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byStatus || DEMO.byStatus).map((e, i) => (
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
                  حسب القسم
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byDepartment || DEMO.byDepartment}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    barSize={18}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="dept" tick={{ fontSize: 10 }} width={68} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد الطلبات" fill="#e65100" radius={[0, 4, 4, 0]} />
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
                  placeholder="بحث بالاسم أو القسم..."
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
                  {Object.entries(ENTRY_STATUS).map(([k, v]) => (
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
                  {Object.entries(PRIORITY).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} سجل`}
                  sx={{ fontWeight: 700, bgcolor: '#e65100', color: '#fff' }}
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
                سجلات الانتظار
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
                        'الاسم',
                        'القسم',
                        'الحالة',
                        'أيام الانتظار',
                        'تاريخ الطلب',
                        'الأولوية',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((e, i) => (
                      <TableRow
                        key={e._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#bf360c' }}
                            >
                              {(e.name || 'م').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {e.name || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={e.dept || '-'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#e65100', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ENTRY_STATUS[e.status] || e.status || '-'}
                            color={STATUS_COLORS[e.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {e.waitDays || 0} يوم
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {e.requestDate ? _fmtDate(e.requestDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PRIORITY[e.priority] || e.priority || '-'}
                            color={PRIORITY_COLORS[e.priority] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/waitlist/entries/${e._id}`)}
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
