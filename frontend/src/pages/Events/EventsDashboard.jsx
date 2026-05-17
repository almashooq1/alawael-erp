/**
 * EventsDashboard — لوحة إدارة الفعاليات (Professional v2)
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
} from '@mui/material';
import {
  Event as EventIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Celebration as CelebIcon,
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
import { getEventsDashboard } from '../../services/events.service';
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

const TYPE_LABELS = {
  conference: 'مؤتمر',
  seminar: 'ندوة',
  workshop: 'ورشة عمل',
  ceremony: 'حفل',
  exhibition: 'معرض',
  meeting: 'اجتماع',
  training: 'تدريب',
  social: 'اجتماعي',
  sports: 'رياضي',
  other: 'أخرى',
};
const STATUS_LABELS = {
  draft: 'مسودة',
  planned: 'مخطط',
  ongoing: 'جارٍ',
  completed: 'منتهي',
  cancelled: 'ملغي',
};
const STATUS_COLORS = {
  draft: 'default',
  planned: 'info',
  ongoing: 'success',
  completed: 'primary',
  cancelled: 'error',
};
const COLORS = [
  '#1976d2',
  '#388e3c',
  '#f57c00',
  '#d32f2f',
  '#7b1fa2',
  '#0097a7',
  '#5d4037',
  '#455a64',
  '#c2185b',
  '#00838f',
];

const DEMO = {
  total: 234,
  upcoming: 18,
  ongoing: 5,
  totalAttendees: 8420,
  events: [
    {
      _id: '1',
      title: 'مؤتمر التأهيل الدولي 2025',
      type: 'conference',
      status: 'planned',
      date: new Date(Date.now() + 15 * 86400000),
      location: 'الرياض',
      attendees: 350,
    },
    {
      _id: '2',
      title: 'ورشة عمل: الذكاء الاصطناعي في الرعاية',
      type: 'workshop',
      status: 'ongoing',
      date: new Date(),
      location: 'جدة',
      attendees: 60,
    },
    {
      _id: '3',
      title: 'حفل الخريجين الدفعة 12',
      type: 'ceremony',
      status: 'planned',
      date: new Date(Date.now() + 7 * 86400000),
      location: 'المبنى الرئيسي',
      attendees: 220,
    },
    {
      _id: '4',
      title: 'ندوة الصحة النفسية',
      type: 'seminar',
      status: 'completed',
      date: new Date(Date.now() - 5 * 86400000),
      location: 'أونلاين',
      attendees: 180,
    },
    {
      _id: '5',
      title: 'معرض المعينات التقنية',
      type: 'exhibition',
      status: 'planned',
      date: new Date(Date.now() + 30 * 86400000),
      location: 'مركز المؤتمرات',
      attendees: 500,
    },
  ],
  byType: Object.keys(TYPE_LABELS)
    .slice(0, 7)
    .map((k, i) => ({
      name: TYPE_LABELS[k],
      value: [42, 35, 28, 24, 18, 15, 12][i],
      fill: COLORS[i],
    })),
  byStatus: [
    { name: 'مخطط', value: 85 },
    { name: 'جارٍ', value: 5 },
    { name: 'منتهي', value: 134 },
    { name: 'ملغي', value: 10 },
  ].map((e, i) => ({ ...e, color: COLORS[i] })),
};

export default function EventsDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [events, setEvents] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getEventsDashboard().catch(() => null);
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setEvents(Array.isArray(d.events) && d.events.length ? d.events : DEMO.events);
    } catch (err) {
      logger.error('Events Dashboard error', err);
      setDash(DEMO);
      setEvents(DEMO.events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = events.filter(ev => {
    const ms = !search || ev.title?.includes(search) || ev.location?.includes(search);
    const mt = !filterType || ev.type === filterType;
    const mf = !filterStatus || ev.status === filterStatus;
    return ms && mt && mf;
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
            background: 'linear-gradient(135deg,#7b1fa2,#4a148c)',
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
                إدارة الفعاليات والمناشط
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                جدولة الفعاليات ومتابعة الحضور والتقييمات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`قادمة: ${dash.upcoming || 18}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`جارية: ${dash.ongoing || 5}`}
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
                onClick={() => navigate('/events/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                فعالية جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الفعاليات"
                value={dash.total || 234}
                icon={<EventIcon />}
                gradient="linear-gradient(135deg,#7b1fa2,#4a148c)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="فعاليات قادمة"
                value={dash.upcoming || 18}
                icon={<CalendarIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="فعاليات جارية"
                value={dash.ongoing || 5}
                icon={<CelebIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الحضور"
                value={dash.totalAttendees || 8420}
                icon={<PeopleIcon />}
                gradient={gradients.warning}
                delay={3}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الفعاليات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byType || DEMO.byType}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={18}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#aaa' : '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {(dash.byType || DEMO.byType).map((e, i) => (
                        <Cell key={i} fill={e.fill || COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الفعاليات حسب الحالة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byStatus || DEMO.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byStatus || DEMO.byStatus).map((e, i) => (
                        <Cell key={i} fill={e.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
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
                  placeholder="بحث بالعنوان أو الموقع..."
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
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
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
                  label={`${filtered.length} فعالية`}
                  color="secondary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
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
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                سجل الفعاليات
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد فعاليات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['الفعالية', 'النوع', 'الحالة', 'التاريخ', 'الموقع', 'الحضور', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((ev, i) => (
                      <TableRow
                        key={ev._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: alpha('#7b1fa2', 0.1),
                                color: '#7b1fa2',
                              }}
                            >
                              <EventIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {ev.title || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {TYPE_LABELS[ev.type] || ev.type || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[ev.status] || ev.status || '-'}
                            color={STATUS_COLORS[ev.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {ev.date ? _fmtDate(ev.date) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {ev.location || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ev.attendees || 0}
                            color="info"
                            size="small"
                            icon={<PeopleIcon sx={{ fontSize: '12px !important' }} />}
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض الفعالية">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/events/${ev._id}`)}
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
