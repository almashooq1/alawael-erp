/**
 * PerformanceDashboard — لوحة تقييم الأداء (Professional v2)
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
  TrendingUp as TrendIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Assessment as AssessIcon,
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
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

const RATING_LABELS = {
  excellent: 'ممتاز',
  good: 'جيد',
  satisfactory: 'مقبول',
  needs_improvement: 'يحتاج تحسين',
  unsatisfactory: 'ضعيف',
};
const RATING_COLORS = {
  excellent: 'success',
  good: 'info',
  satisfactory: 'warning',
  needs_improvement: 'warning',
  unsatisfactory: 'error',
};
const PERIOD_LABELS = {
  annual: 'سنوي',
  semi_annual: 'نصف سنوي',
  quarterly: 'ربع سنوي',
  probation: 'تجربة',
};
const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0'];

const DEMO = {
  totalReviews: 284,
  completed: 218,
  avgScore: 82,
  topPerformers: 34,
  reviews: [
    {
      _id: '1',
      employee: 'أحمد السالم',
      department: 'الرعاية الصحية',
      period: 'annual',
      rating: 'excellent',
      score: 94,
      date: new Date(Date.now() - 10 * 86400000),
    },
    {
      _id: '2',
      employee: 'سارة المطيري',
      department: 'التدريب',
      period: 'semi_annual',
      rating: 'good',
      score: 85,
      date: new Date(Date.now() - 5 * 86400000),
    },
    {
      _id: '3',
      employee: 'محمد العتيبي',
      department: 'الإدارة',
      period: 'quarterly',
      rating: 'satisfactory',
      score: 71,
      date: new Date(Date.now() - 3 * 86400000),
    },
    {
      _id: '4',
      employee: 'فاطمة الزهراني',
      department: 'العلاج الطبيعي',
      period: 'annual',
      rating: 'excellent',
      score: 96,
      date: new Date(Date.now() - 1 * 86400000),
    },
    {
      _id: '5',
      employee: 'عبدالله القحطاني',
      department: 'الخدمات الاجتماعية',
      period: 'annual',
      rating: 'needs_improvement',
      score: 58,
      date: new Date(),
    },
  ],
  byRating: ['excellent', 'good', 'satisfactory', 'needs_improvement', 'unsatisfactory'].map(
    (k, i) => ({ name: RATING_LABELS[k], value: [68, 84, 48, 22, 12][i], color: COLORS[i] })
  ),
  radarData: [
    { subject: 'الكفاءة المهنية', A: 88 },
    { subject: 'التعاون', A: 82 },
    { subject: 'الالتزام', A: 91 },
    { subject: 'التطوير', A: 74 },
    { subject: 'التواصل', A: 85 },
    { subject: 'النتائج', A: 79 },
  ],
};

export default function PerformanceDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [reviews, setReviews] = useState([]);
  const [filterRating, setFilterRating] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/performance/analysis').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setReviews(Array.isArray(d.reviews) && d.reviews.length ? d.reviews : DEMO.reviews);
    } catch (err) {
      logger.error('Performance Dashboard error', err);
      setDash(DEMO);
      setReviews(DEMO.reviews);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = reviews.filter(r => {
    const ms = !search || r.employee?.includes(search) || r.department?.includes(search);
    const mr = !filterRating || r.rating === filterRating;
    const mp = !filterPeriod || r.period === filterPeriod;
    return ms && mr && mp;
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
            background: 'linear-gradient(135deg,#388e3c,#1b5e20)',
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
                تقييم الأداء الوظيفي
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                مراجعات الأداء والتقييمات الدورية للموظفين
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`مكتملة: ${dash.completed || 218}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`متميزون: ${dash.topPerformers || 34}`}
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
                onClick={() => navigate('/performance/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                تقييم جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي التقييمات"
                value={dash.totalReviews || 284}
                icon={<AssessIcon />}
                gradient="linear-gradient(135deg,#388e3c,#1b5e20)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="تقييمات مكتملة"
                value={dash.completed || 218}
                icon={<PeopleIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="متوسط الدرجة %"
                value={dash.avgScore || 82}
                icon={<TrendIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="موظفون متميزون"
                value={dash.topPerformers || 34}
                icon={<StarIcon />}
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
                  التقييمات حسب التصنيف
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={dash.byRating || DEMO.byRating}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byRating || DEMO.byRating).map((e, i) => (
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
                  مؤشرات الأداء الرادار
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={dash.radarData || DEMO.radarData}>
                    <PolarGrid stroke={isDark ? '#444' : '#e0e0e0'} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 10, fill: isDark ? '#bbb' : '#555' }}
                    />
                    <Radar
                      name="الفريق"
                      dataKey="A"
                      stroke="#388e3c"
                      fill="#388e3c"
                      fillOpacity={0.35}
                    />
                    <RTooltip content={<ChartTooltip />} />
                  </RadarChart>
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
                  label="التصنيف"
                  value={filterRating}
                  onChange={e => setFilterRating(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(RATING_LABELS).map(([k, v]) => (
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
                  label="الدورة"
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} تقييم`}
                  sx={{ fontWeight: 700, bgcolor: '#388e3c', color: '#fff' }}
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
                سجل التقييمات
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد تقييمات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['الموظف', 'القسم', 'الدورة', 'التصنيف', 'الدرجة', 'التاريخ', 'إجراء'].map(
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
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: alpha('#388e3c', 0.1),
                                color: '#388e3c',
                                fontSize: 12,
                              }}
                            >
                              {(r.employee || 'م')[0]}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {r.employee || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {r.department || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PERIOD_LABELS[r.period] || r.period || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={RATING_LABELS[r.rating] || r.rating || '-'}
                            color={RATING_COLORS[r.rating] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 90 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={r.score || 0}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#388e3c', 0.15),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor:
                                    r.score >= 80
                                      ? '#4caf50'
                                      : r.score >= 60
                                        ? '#ff9800'
                                        : '#f44336',
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {r.score || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {r.date ? new Date(r.date).toLocaleDateString('ar') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض التقييم">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/performance/${r._id}`)}
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
