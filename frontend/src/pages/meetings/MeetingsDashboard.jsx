/**
 * MeetingsDashboard — لوحة الاجتماعات (Professional v2)
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
  Groups as MeetingIcon,
  EventAvailable as ScheduledIcon,
  CheckCircle as CompletedIcon,
  Assignment as MinutesIcon,
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

const typeLabels = {
  department: 'إداري',
  board: 'مجلس إدارة',
  general: 'عام',
  emergency: 'طارئ',
  project: 'مشروع',
  training: 'تدريبي',
  review: 'مراجعة',
};
const statusLabels = {
  scheduled: 'مجدول',
  in_progress: 'قيد الانعقاد',
  completed: 'مكتمل',
  cancelled: 'ملغى',
};
const statusColors = {
  scheduled: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'error',
};
const PIE_COLORS = ['#1565c0', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4', '#e91e63'];

const DEMO = {
  total: 84,
  scheduled: 31,
  completed: 46,
  inProgress: 7,
  byType: Object.entries(typeLabels).map(([_k, v], i) => ({
    name: v,
    value: [18, 12, 14, 5, 15, 10, 10][i] || 5,
    color: PIE_COLORS[i],
  })),
  byWeek: [
    { week: 'أ1', count: 14 },
    { week: 'أ2', count: 18 },
    { week: 'أ3', count: 11 },
    { week: 'أ4', count: 16 },
    { week: 'م1', count: 13 },
    { week: 'م2', count: 12 },
  ],
  meetings: [
    {
      _id: '1',
      title: 'اجتماع مجلس الإدارة الشهري',
      type: 'board',
      status: 'completed',
      date: new Date().toISOString(),
      organizer: 'أحمد الزهراني',
      attendees: 12,
    },
    {
      _id: '2',
      title: 'مراجعة الخطة الاستراتيجية',
      type: 'review',
      status: 'scheduled',
      date: new Date().toISOString(),
      organizer: 'سارة العتيبي',
      attendees: 8,
    },
    {
      _id: '3',
      title: 'اجتماع طارئ — الميزانية',
      type: 'emergency',
      status: 'in_progress',
      date: new Date().toISOString(),
      organizer: 'محمد الشمري',
      attendees: 5,
    },
    {
      _id: '4',
      title: 'تدريب الكوادر الإدارية',
      type: 'training',
      status: 'scheduled',
      date: new Date().toISOString(),
      organizer: 'نورة الدوسري',
      attendees: 20,
    },
    {
      _id: '5',
      title: 'اجتماع المشاريع الرقمية',
      type: 'project',
      status: 'completed',
      date: new Date().toISOString(),
      organizer: 'خالد المطيري',
      attendees: 9,
    },
  ],
};

function buildStats(arr) {
  return {
    total: arr.length,
    scheduled: arr.filter(m => m.status === 'scheduled').length,
    completed: arr.filter(m => m.status === 'completed').length,
    inProgress: arr.filter(m => m.status === 'in_progress').length,
    byType: Object.entries(typeLabels)
      .map(([k, v], i) => ({
        name: v,
        value: arr.filter(m => m.type === k).length,
        color: PIE_COLORS[i],
      }))
      .filter(x => x.value > 0),
    byWeek: DEMO.byWeek,
    meetings: arr,
  };
}

export default function MeetingsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/meetings', { params: { limit: 100 } });
      const arr = Array.isArray(res.data) ? res.data : res.data?.data || [];
      if (arr.length) setDash(buildStats(arr));
      else setDash(DEMO);
    } catch (err) {
      logger.warn('MeetingsDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.meetings || []).filter(m => {
    const ms =
      !search || [m.title, m.organizer].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const mt = !filterType || m.type === filterType;
    const ms2 = !filterStatus || m.status === filterStatus;
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
            background: 'linear-gradient(135deg,#1565c0,#0d47a1)',
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
                لوحة الاجتماعات
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                جدولة الاجتماعات، المحاضر، والمتابعة المؤسسية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`مجدولة: ${dash.scheduled}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`مكتملة: ${dash.completed}`}
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
                onClick={() => navigate('/meetings/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                اجتماع جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الاجتماعات"
                value={dash.total}
                icon={<MeetingIcon />}
                gradient="linear-gradient(135deg,#1565c0,#0d47a1)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مجدولة"
                value={dash.scheduled}
                icon={<ScheduledIcon />}
                gradient="linear-gradient(135deg,#0288d1,#0277bd)"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مكتملة"
                value={dash.completed}
                icon={<CompletedIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="قيد الانعقاد"
                value={dash.inProgress}
                icon={<MinutesIcon />}
                gradient={gradients.warning}
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
                  الاجتماعات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byType || DEMO.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byType || DEMO.byType).map((e, i) => (
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
                  الاجتماعات الأسبوعية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byWeek || DEMO.byWeek}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="count"
                      name="عدد الاجتماعات"
                      fill="#1565c0"
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
                  placeholder="بحث بالاجتماع أو المنظّم..."
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
                  label="النوع"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(typeLabels).map(([k, v]) => (
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
                  label={`${filtered.length} اجتماع`}
                  sx={{ fontWeight: 700, bgcolor: '#1565c0', color: '#fff' }}
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
                قائمة الاجتماعات
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد اجتماعات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['الاجتماع', 'النوع', 'الحالة', 'التاريخ', 'المنظّم', 'الحضور', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((m, i) => (
                      <TableRow
                        key={m._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#1565c0' }}>
                              <MeetingIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {m.title || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeLabels[m.type] || m.type || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#1565c0', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[m.status] || m.status || '—'}
                            color={statusColors[m.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {m.date ? new Date(m.date).toLocaleDateString('ar') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {m.organizer || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={m.attendees || 0} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/meetings/${m._id}`)}
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
