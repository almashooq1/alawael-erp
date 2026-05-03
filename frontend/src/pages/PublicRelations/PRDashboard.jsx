/**
 * PRDashboard — لوحة العلاقات العامة والإعلام (Professional v2)
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
  Campaign as CampaignIcon,
  Newspaper as NewsIcon,
  Handshake as PartnerIcon,
  ThumbUp as ThumbIcon,
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
import { getPRDashboard } from '../../services/publicRelations.service';
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

const SENTIMENT_LABELS = { positive: 'إيجابي', neutral: 'محايد', negative: 'سلبي' };
const SENTIMENT_COLORS = { positive: '#4caf50', neutral: '#ff9800', negative: '#f44336' };
const TYPE_LABELS = {
  press_release: 'بيان صحفي',
  news_article: 'مقال إخباري',
  tv_coverage: 'تغطية تلفزيونية',
  radio: 'إذاعة',
  social_media: 'وسائل التواصل',
  interview: 'مقابلة',
  report: 'تقرير',
  other: 'أخرى',
};
const STATUS_LABELS = { draft: 'مسودة', published: 'منشور', scheduled: 'مجدول', archived: 'مؤرشف' };
const STATUS_COLORS = {
  draft: 'default',
  published: 'success',
  scheduled: 'info',
  archived: 'warning',
};
const COLORS = [
  '#1976d2',
  '#388e3c',
  '#f57c00',
  '#d32f2f',
  '#7b1fa2',
  '#0097a7',
  '#5d4037',
  '#607d8b',
];

const DEMO = {
  totalMedia: 312,
  publishedMedia: 198,
  partnerships: 24,
  positivePercent: 76,
  media: [
    {
      _id: '1',
      title: 'مبادرة المنصة تحصل على جائزة التميز الخليجي',
      type: 'news_article',
      status: 'published',
      sentiment: 'positive',
      date: new Date(Date.now() - 3 * 86400000),
      source: 'العربية',
    },
    {
      _id: '2',
      title: 'بيان: افتتاح مركز التأهيل الجديد بالرياض',
      type: 'press_release',
      status: 'published',
      sentiment: 'positive',
      date: new Date(Date.now() - 7 * 86400000),
      source: 'واس',
    },
    {
      _id: '3',
      title: 'تغطية مؤتمر الإعاقة الدولي',
      type: 'tv_coverage',
      status: 'published',
      sentiment: 'neutral',
      date: new Date(Date.now() - 14 * 86400000),
      source: 'قناة MBC',
    },
    {
      _id: '4',
      title: 'مقابلة مع المدير التنفيذي حول خدمات العلاج',
      type: 'interview',
      status: 'scheduled',
      sentiment: 'positive',
      date: new Date(Date.now() + 5 * 86400000),
      source: 'أونلاين',
    },
    {
      _id: '5',
      title: 'تقرير أداء القطاع الصحي 2025',
      type: 'report',
      status: 'draft',
      sentiment: 'neutral',
      date: null,
      source: 'داخلي',
    },
  ],
  bySentiment: ['positive', 'neutral', 'negative'].map((k, i) => ({
    name: SENTIMENT_LABELS[k],
    value: [76, 18, 6][i],
    color: SENTIMENT_COLORS[k],
  })),
  byType: Object.keys(TYPE_LABELS)
    .slice(0, 6)
    .map((k, i) => ({ name: TYPE_LABELS[k], value: [48, 42, 38, 28, 20, 15][i] })),
  trend: [...Array(6)].map((_, i) => ({
    month: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'][i],
    positive: [68, 72, 70, 74, 76, 78][i],
    negative: [12, 10, 11, 9, 8, 7][i],
  })),
};

export default function PRDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [media, setMedia] = useState([]);
  const [filterSentiment, setFilterSentiment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getPRDashboard().catch(() => null);
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setMedia(Array.isArray(d.media) && d.media.length ? d.media : DEMO.media);
    } catch (err) {
      logger.error('PR Dashboard error', err);
      setDash(DEMO);
      setMedia(DEMO.media);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = media.filter(m => {
    const ms = !search || m.title?.includes(search) || m.source?.includes(search);
    const mv = !filterSentiment || m.sentiment === filterSentiment;
    const mt = !filterType || m.type === filterType;
    return ms && mv && mt;
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
            background: 'linear-gradient(135deg,#00695c,#004d40)',
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
                العلاقات العامة والإعلام
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                متابعة التغطية الإعلامية والشراكات وتحليل الانطباع
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`منشور: ${dash.publishedMedia || 198}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`إيجابية: ${dash.positivePercent || 76}%`}
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
                onClick={() => navigate('/public-relations/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                إضافة تغطية
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي التغطيات"
                value={dash.totalMedia || 312}
                icon={<NewsIcon />}
                gradient="linear-gradient(135deg,#00695c,#004d40)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="منشورة"
                value={dash.publishedMedia || 198}
                icon={<CampaignIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="شراكات نشطة"
                value={dash.partnerships || 24}
                icon={<PartnerIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="انطباع إيجابي %"
                value={dash.positivePercent || 76}
                icon={<ThumbIcon />}
                gradient={gradients.warning}
                delay={3}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  توزيع الانطباع
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={dash.bySentiment || DEMO.bySentiment}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {(dash.bySentiment || DEMO.bySentiment).map((e, i) => (
                        <Cell key={i} fill={e.color || COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ mt: 1 }}>
                  {(dash.bySentiment || DEMO.bySentiment).map(s => (
                    <Box key={s.name} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                        <Typography variant="caption">{s.name}</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          {s.value}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={s.value}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: alpha(s.color, 0.2),
                          '& .MuiLinearProgress-bar': { bgcolor: s.color },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  التغطيات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={dash.byType || DEMO.byType}
                    margin={{ top: 5, right: 5, left: -25, bottom: 5 }}
                    barSize={16}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: isDark ? '#aaa' : '#555' }}
                      width={75}
                    />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" fill="#00695c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  تطور الانطباع (6 أشهر)
                </Typography>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={dash.trend || DEMO.trend}
                    margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="gpPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4caf50" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4caf50" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gpNeg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f44336" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
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
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="positive"
                      name="إيجابي%"
                      stroke="#4caf50"
                      fill="url(#gpPos)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="negative"
                      name="سلبي%"
                      stroke="#f44336"
                      fill="url(#gpNeg)"
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
                  placeholder="بحث بالعنوان أو المصدر..."
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
                  label="الانطباع"
                  value={filterSentiment}
                  onChange={e => setFilterSentiment(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(SENTIMENT_LABELS).map(([k, v]) => (
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
              <Grid item>
                <Chip
                  label={`${filtered.length} تغطية`}
                  sx={{ fontWeight: 700, bgcolor: '#00695c', color: '#fff' }}
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
                سجل التغطيات الإعلامية
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد تغطيات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['العنوان', 'النوع', 'الانطباع', 'الحالة', 'التاريخ', 'المصدر', 'إجراء'].map(
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
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: alpha('#00695c', 0.1),
                                color: '#00695c',
                              }}
                            >
                              <NewsIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {m.title || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {TYPE_LABELS[m.type] || m.type || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={SENTIMENT_LABELS[m.sentiment] || '-'}
                            size="small"
                            sx={{
                              bgcolor: alpha(SENTIMENT_COLORS[m.sentiment] || '#999', 0.15),
                              color: SENTIMENT_COLORS[m.sentiment] || 'text.primary',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[m.status] || m.status || '-'}
                            color={STATUS_COLORS[m.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {m.date ? new Date(m.date).toLocaleDateString('ar') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {m.source || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض التفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/public-relations/${m._id}`)}
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
