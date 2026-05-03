/**
 * TrainingDashboard — لوحة التدريب والتطوير (Professional v2)
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
  School as SchoolIcon,
  Groups as GroupsIcon,
  EventNote as EventNoteIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  TrendingUp as TrendIcon,
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
  AreaChart,
  Area,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getTrainingDashboard } from '../../services/training.service';
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

const CAT_LABELS = {
  technical: 'تقنية',
  leadership: 'قيادة',
  soft_skills: 'مهارات ناعمة',
  compliance: 'امتثال',
  safety: 'سلامة',
  professional: 'مهنية',
  language: 'لغات',
  other: 'أخرى',
};
const MODE_LABELS = { online: 'أونلاين', classroom: 'قاعة', hybrid: 'هجين', field: 'ميداني' };
const STATUS_LABELS = {
  draft: 'مسودة',
  scheduled: 'مجدول',
  ongoing: 'جارٍ',
  completed: 'منتهي',
  cancelled: 'ملغي',
};
const STATUS_COLORS = {
  draft: 'default',
  scheduled: 'info',
  ongoing: 'success',
  completed: 'primary',
  cancelled: 'error',
};
const COLORS = [
  '#2196f3',
  '#4caf50',
  '#ff9800',
  '#e91e63',
  '#9c27b0',
  '#00bcd4',
  '#795548',
  '#607d8b',
];

const DEMO = {
  totalPrograms: 96,
  ongoingPrograms: 8,
  completedPrograms: 74,
  totalParticipants: 1248,
  completionRate: 87,
  programs: [
    {
      _id: '1',
      title: 'قيادة فرق التأهيل المتعددة التخصصات',
      category: 'leadership',
      mode: 'classroom',
      status: 'ongoing',
      participants: 24,
      completionRate: 65,
      startDate: new Date(Date.now() - 15 * 86400000),
    },
    {
      _id: '2',
      title: 'مقدمة في الذكاء الاصطناعي للمعالجين',
      category: 'technical',
      mode: 'online',
      status: 'scheduled',
      participants: 40,
      completionRate: 0,
      startDate: new Date(Date.now() + 7 * 86400000),
    },
    {
      _id: '3',
      title: 'مهارات التواصل الفعّال مع الأسر',
      category: 'soft_skills',
      mode: 'hybrid',
      status: 'completed',
      participants: 36,
      completionRate: 100,
      startDate: new Date(Date.now() - 60 * 86400000),
    },
    {
      _id: '4',
      title: 'امتثال حماية البيانات الطبية',
      category: 'compliance',
      mode: 'online',
      status: 'completed',
      participants: 120,
      completionRate: 95,
      startDate: new Date(Date.now() - 30 * 86400000),
    },
    {
      _id: '5',
      title: 'إسعافات أولية ومعايير السلامة',
      category: 'safety',
      mode: 'classroom',
      status: 'scheduled',
      participants: 50,
      completionRate: 0,
      startDate: new Date(Date.now() + 14 * 86400000),
    },
  ],
  byCategory: Object.keys(CAT_LABELS).map((k, i) => ({
    name: CAT_LABELS[k],
    value: [18, 12, 15, 14, 10, 8, 7, 12][i],
    fill: COLORS[i],
  })),
  trend: [...Array(6)].map((_, i) => ({
    month: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'][i],
    enrolled: [180, 210, 195, 230, 245, 260][i],
    completed: [155, 180, 170, 210, 215, 240][i],
  })),
};

export default function TrainingDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [programs, setPrograms] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [filterMode, setFilterMode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getTrainingDashboard().catch(() => null);
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setPrograms(Array.isArray(d.programs) && d.programs.length ? d.programs : DEMO.programs);
    } catch (err) {
      logger.error('Training Dashboard error', err);
      setDash(DEMO);
      setPrograms(DEMO.programs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = programs.filter(p => {
    const ms = !search || p.title?.includes(search);
    const mc = !filterCat || p.category === filterCat;
    const mm = !filterMode || p.mode === filterMode;
    const mf = !filterStatus || p.status === filterStatus;
    return ms && mc && mm && mf;
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
            background: 'linear-gradient(135deg,#1565c0,#283593)',
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
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: -40,
              left: 60,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
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
                التدريب والتطوير المهني
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                متابعة البرامج التدريبية ومعدلات الإتمام وأداء المشاركين
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`جارية: ${dash.ongoingPrograms || 8}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`معدل الإتمام: ${dash.completionRate || 87}%`}
                  size="small"
                  sx={{ bgcolor: 'rgba(76,175,80,0.3)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/training/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                برنامج جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي البرامج"
                value={dash.totalPrograms || 96}
                icon={<SchoolIcon />}
                gradient="linear-gradient(135deg,#1565c0,#283593)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="برامج جارية"
                value={dash.ongoingPrograms || 8}
                icon={<EventNoteIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="المشاركون"
                value={dash.totalParticipants || 1248}
                icon={<GroupsIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="معدل الإتمام %"
                value={dash.completionRate || 87}
                icon={<TrendIcon />}
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
                  البرامج حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byCategory || DEMO.byCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byCategory || DEMO.byCategory).map((e, i) => (
                        <Cell key={i} fill={e.fill || COLORS[i % COLORS.length]} />
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
                  التسجيل والإتمام (6 أشهر)
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={dash.trend || DEMO.trend}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="tgEnr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="tgCom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="enrolled"
                      name="مسجّل"
                      stroke="#1976d2"
                      fill="url(#tgEnr)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      name="أتمّ"
                      stroke="#4caf50"
                      fill="url(#tgCom)"
                      strokeWidth={2}
                    />
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
                  placeholder="بحث بالعنوان..."
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
              <Grid item xs={4} sm={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الفئة"
                  value={filterCat}
                  onChange={e => setFilterCat(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(CAT_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="الأسلوب"
                  value={filterMode}
                  onChange={e => setFilterMode(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(MODE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={4} sm={2}>
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
                  label={`${filtered.length} برنامج`}
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
                البرامج التدريبية
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد برامج مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'البرنامج',
                        'الفئة',
                        'الأسلوب',
                        'الحالة',
                        'المشاركون',
                        'تاريخ البدء',
                        'نسبة الإتمام',
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
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: alpha('#1565c0', 0.1),
                                color: '#1565c0',
                              }}
                            >
                              <SchoolIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {p.title || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {CAT_LABELS[p.category] || p.category || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={MODE_LABELS[p.mode] || p.mode || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[p.status] || p.status || '-'}
                            color={STATUS_COLORS[p.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.participants || 0}
                            color="info"
                            size="small"
                            icon={<GroupsIcon sx={{ fontSize: '12px !important' }} />}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {p.startDate ? new Date(p.startDate).toLocaleDateString('ar') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={p.completionRate || 0}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#1976d2', 0.15),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor:
                                    p.completionRate >= 80
                                      ? '#4caf50'
                                      : p.completionRate >= 50
                                        ? '#ff9800'
                                        : '#f44336',
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={700} sx={{ minWidth: 28 }}>
                              {p.completionRate || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض البرنامج">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/training/${p._id}`)}
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
