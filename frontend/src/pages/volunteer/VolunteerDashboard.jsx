/**
 * VolunteerDashboard — لوحة التطوع (Professional v2)
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
  alpha,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  LinearProgress,
} from '@mui/material';
import {
  VolunteerActivism as VolIcon,
  Event as EventIcon,
  AccessTime as HoursIcon,
  TrendingUp as TrendIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
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

const STATUS_LABELS = { active: 'نشط', inactive: 'غير نشط', suspended: 'موقوف', pending: 'معلق' };
const STATUS_COLORS = {
  active: 'success',
  inactive: 'default',
  suspended: 'error',
  pending: 'warning',
};
const PROGRAM_LABELS = {
  rehabilitation: 'تأهيل',
  education: 'تعليم',
  sports: 'رياضة',
  companion: 'مرافقة',
  community: 'مجتمعي',
  admin: 'إداري',
};
const COLORS = ['#00897b', '#1976d2', '#f57c00', '#7b1fa2', '#c62828'];

const MONTHLY = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map((m, i) => ({
  month: m,
  hours: [158, 175, 210, 195, 242, 260][i],
  shifts: [22, 25, 30, 28, 35, 38][i],
}));

const DEMO = {
  totalVolunteers: 89,
  activePrograms: 7,
  totalHours: 1240,
  shiftsThisWeek: 32,
  volunteers: [
    {
      _id: '1',
      name: 'أحمد السالم',
      program: 'rehabilitation',
      status: 'active',
      hours: 142,
      shifts: 18,
      joinDate: '2024-01-10',
    },
    {
      _id: '2',
      name: 'نورة المطيري',
      program: 'education',
      status: 'active',
      hours: 98,
      shifts: 12,
      joinDate: '2024-02-05',
    },
    {
      _id: '3',
      name: 'فهد الدوسري',
      program: 'sports',
      status: 'active',
      hours: 210,
      shifts: 28,
      joinDate: '2023-11-20',
    },
    {
      _id: '4',
      name: 'رانيا العتيبي',
      program: 'companion',
      status: 'inactive',
      hours: 45,
      shifts: 6,
      joinDate: '2024-01-28',
    },
    {
      _id: '5',
      name: 'عمر القحطاني',
      program: 'community',
      status: 'active',
      hours: 175,
      shifts: 22,
      joinDate: '2023-12-15',
    },
  ],
  byProgram: [
    { name: 'تأهيل', value: 28, color: '#00897b' },
    { name: 'تعليم', value: 24, color: '#1976d2' },
    { name: 'رياضة', value: 18, color: '#f57c00' },
    { name: 'مرافقة', value: 19, color: '#7b1fa2' },
  ],
  monthlyHours: MONTHLY,
};

export default function VolunteerDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [volunteers, setVolunteers] = useState([]);
  const [filterProgram, setFilterProgram] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/volunteers/dashboard/stats').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setVolunteers(
        Array.isArray(d.volunteers) && d.volunteers.length ? d.volunteers : DEMO.volunteers
      );
    } catch (err) {
      logger.error('Volunteer Dashboard error', err);
      setDash(DEMO);
      setVolunteers(DEMO.volunteers);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = volunteers.filter(v => {
    const ms = !search || v.name?.includes(search);
    const mp = !filterProgram || v.program === filterProgram;
    const ms2 = !filterStatus || v.status === filterStatus;
    return ms && mp && ms2;
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
            background: 'linear-gradient(135deg,#004d40,#00695c)',
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
                إدارة المتطوعين
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                برامج التطوع، الساعات، والمناوبات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`متطوعون: ${dash.totalVolunteers || 89}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`برامج نشطة: ${dash.activePrograms || 7}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`ساعات: ${(dash.totalHours || 1240).toLocaleString('ar')}`}
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
                onClick={() => navigate('/volunteers/register')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تسجيل متطوع
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المتطوعين"
                value={dash.totalVolunteers || 89}
                icon={<VolIcon />}
                gradient="linear-gradient(135deg,#004d40,#00695c)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="برامج نشطة"
                value={dash.activePrograms || 7}
                icon={<EventIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الساعات"
                value={dash.totalHours || 1240}
                icon={<HoursIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مناوبات هذا الأسبوع"
                value={dash.shiftsThisWeek || 32}
                icon={<TrendIcon />}
                gradient={gradients.success}
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
                  المتطوعون حسب البرنامج
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byProgram || DEMO.byProgram}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byProgram || DEMO.byProgram).map((e, i) => (
                        <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />
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
                  ساعات التطوع الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={dash.monthlyHours || DEMO.monthlyHours}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="volGH" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00897b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00897b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="volGS" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="hours"
                      name="ساعات"
                      stroke="#00897b"
                      fill="url(#volGH)"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="shifts"
                      name="مناوبات"
                      stroke="#1976d2"
                      fill="url(#volGS)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </AreaChart>
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
                  placeholder="بحث باسم المتطوع..."
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
                  label="البرنامج"
                  value={filterProgram}
                  onChange={e => setFilterProgram(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(PROGRAM_LABELS).map(([k, v]) => (
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
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} متطوع`}
                  sx={{ fontWeight: 700, bgcolor: '#004d40', color: '#fff' }}
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
                سجل المتطوعين
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا يوجد متطوعون مطابقون" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المتطوع',
                        'البرنامج',
                        'الحالة',
                        'الساعات',
                        'المناوبات',
                        'تاريخ الانضمام',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((vol, i) => (
                      <TableRow
                        key={vol._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#00695c' }}
                            >
                              {(vol.name || 'م').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {vol.name || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PROGRAM_LABELS[vol.program] || vol.program || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[vol.status] || vol.status || '-'}
                            color={STATUS_COLORS[vol.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(((vol.hours || 0) / 300) * 100, 100)}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#00897b', 0.15),
                                '& .MuiLinearProgress-bar': { bgcolor: '#00897b' },
                              }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {vol.hours || 0}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={vol.shifts || 0}
                            size="small"
                            color={
                              (vol.shifts || 0) >= 20
                                ? 'success'
                                : (vol.shifts || 0) >= 10
                                  ? 'warning'
                                  : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {vol.joinDate ? _fmtDate(vol.joinDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="ملف المتطوع">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/volunteers/${vol._id}`)}
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
