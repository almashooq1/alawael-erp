/**
 * ResearchDashboard — لوحة مركز الأبحاث (Professional v2)
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
  Science as ScienceIcon,
  Assessment as StudyIcon,
  Dataset as DataIcon,
  TrendingUp as EffectIcon,
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
  AreaChart,
  Area,
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

const PHASE_LABELS = {
  planning: 'تخطيط',
  data_collection: 'جمع بيانات',
  analysis: 'تحليل',
  publication: 'نشر',
  completed: 'مكتملة',
};
const PHASE_COLORS = {
  planning: 'info',
  data_collection: 'warning',
  analysis: 'secondary',
  publication: 'primary',
  completed: 'success',
};
const DOMAIN_LABELS = {
  rehabilitation: 'تأهيل',
  disability: 'إعاقة',
  mental_health: 'صحة نفسية',
  education: 'تعليم',
  social: 'اجتماعي',
};
const COLORS = ['#7b1fa2', '#1976d2', '#388e3c', '#f57c00', '#d32f2f'];

const MONTHLY = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map((m, i) => ({
  month: m,
  publications: [1, 0, 2, 1, 3, 2][i],
  datasets: [3, 2, 4, 3, 5, 4][i],
}));

const DEMO = {
  totalStudies: 18,
  activeStudies: 7,
  datasets: 34,
  publications: 12,
  studies: [
    {
      _id: '1',
      title: 'فاعلية برنامج التأهيل بالواقع الافتراضي',
      domain: 'rehabilitation',
      phase: 'analysis',
      participants: 42,
      pi: 'د. أحمد السالم',
      progress: 65,
    },
    {
      _id: '2',
      title: 'أثر التدخل المبكر على الأطفال ذوي الإعاقة',
      domain: 'disability',
      phase: 'data_collection',
      participants: 80,
      pi: 'د. سارة المطيري',
      progress: 40,
    },
    {
      _id: '3',
      title: 'قياس جودة حياة المستفيدين',
      domain: 'rehabilitation',
      phase: 'publication',
      participants: 120,
      pi: 'د. محمد القحطاني',
      progress: 90,
    },
    {
      _id: '4',
      title: 'دراسة سلوك القلق لدى ذوي الإعاقة الحركية',
      domain: 'mental_health',
      phase: 'planning',
      participants: 55,
      pi: 'د. نورة العتيبي',
      progress: 15,
    },
    {
      _id: '5',
      title: 'تطوير مقياس الكفاءة الاجتماعية',
      domain: 'social',
      phase: 'completed',
      participants: 200,
      pi: 'د. فهد الدوسري',
      progress: 100,
    },
  ],
  studyPhases: [
    { name: 'تخطيط', value: 4, color: '#0288d1' },
    { name: 'جمع بيانات', value: 5, color: '#f57c00' },
    { name: 'تحليل', value: 3, color: '#9c27b0' },
    { name: 'نشر', value: 6, color: '#7b1fa2' },
  ],
  monthlyOutput: MONTHLY,
};

export default function ResearchDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [studies, setStudies] = useState([]);
  const [filterDomain, setFilterDomain] = useState('');
  const [filterPhase, setFilterPhase] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/research/dashboard').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setStudies(Array.isArray(d.studies) && d.studies.length ? d.studies : DEMO.studies);
    } catch (err) {
      logger.error('Research Dashboard error', err);
      setDash(DEMO);
      setStudies(DEMO.studies);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = studies.filter(s => {
    const ms = !search || s.title?.includes(search) || s.pi?.includes(search);
    const md = !filterDomain || s.domain === filterDomain;
    const mp = !filterPhase || s.phase === filterPhase;
    return ms && md && mp;
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
            background: 'linear-gradient(135deg,#6a1b9a,#4527a0)',
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
                مركز الأبحاث والدراسات
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الدراسات العلمية، مجموعات البيانات، والمنشورات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`دراسات نشطة: ${dash.activeStudies || 7}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`منشورات: ${dash.publications || 12}`}
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
                onClick={() => navigate('/research/studies/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                دراسة جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الدراسات"
                value={dash.totalStudies || 18}
                icon={<ScienceIcon />}
                gradient="linear-gradient(135deg,#6a1b9a,#4527a0)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="دراسات نشطة"
                value={dash.activeStudies || 7}
                icon={<StudyIcon />}
                gradient={gradients.warning}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مجموعات البيانات"
                value={dash.datasets || 34}
                icon={<DataIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="المنشورات"
                value={dash.publications || 12}
                icon={<EffectIcon />}
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
                  الدراسات حسب المرحلة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.studyPhases || DEMO.studyPhases}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.studyPhases || DEMO.studyPhases).map((e, i) => (
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
                  المخرجات الشهرية (منشورات + بيانات)
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={dash.monthlyOutput || DEMO.monthlyOutput}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="rgP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6a1b9a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#6a1b9a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="rgD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0288d1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#0288d1" stopOpacity={0} />
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
                      dataKey="publications"
                      name="منشورات"
                      stroke="#6a1b9a"
                      fill="url(#rgP)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="datasets"
                      name="بيانات"
                      stroke="#0288d1"
                      fill="url(#rgD)"
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
                  placeholder="بحث بعنوان الدراسة أو الباحث..."
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
                  label="المجال"
                  value={filterDomain}
                  onChange={e => setFilterDomain(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
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
                  label="المرحلة"
                  value={filterPhase}
                  onChange={e => setFilterPhase(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(PHASE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} دراسة`}
                  sx={{ fontWeight: 700, bgcolor: '#6a1b9a', color: '#fff' }}
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
                الدراسات والأبحاث
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد دراسات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'عنوان الدراسة',
                        'المجال',
                        'المرحلة',
                        'الباحث الرئيسي',
                        'المشاركون',
                        'التقدم',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((s, i) => (
                      <TableRow
                        key={s._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {s.title || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={DOMAIN_LABELS[s.domain] || s.domain || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PHASE_LABELS[s.phase] || s.phase || '-'}
                            color={PHASE_COLORS[s.phase] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {s.pi || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={s.participants || 0}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 110 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={s.progress || 0}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#6a1b9a', 0.12),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: s.progress === 100 ? '#388e3c' : '#6a1b9a',
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {s.progress || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض الدراسة">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/research/studies/${s._id}`)}
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
