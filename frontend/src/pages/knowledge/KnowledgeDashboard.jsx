/**
 * KnowledgeDashboard — لوحة إدارة المعرفة (Professional v2)
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
  MenuBook as BookIcon,
  Category as CatIcon,
  TrendingUp as TrendIcon,
  Bookmark as BookmarkIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  ThumbUp as LikeIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

const CAT_LABELS = {
  clinical: 'سريري',
  administrative: 'إداري',
  technical: 'تقني',
  training: 'تدريبي',
  policy: 'سياسات',
  research: 'بحثي',
  other: 'أخرى',
};
const TYPE_LABELS = {
  article: 'مقال',
  video: 'فيديو',
  document: 'وثيقة',
  infographic: 'إنفوجرافيك',
  course: 'دورة',
};
const COLORS = ['#0288d1', '#00897b', '#f57f17', '#7b1fa2', '#e53935', '#2e7d32'];

const TREND = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'].map((m, i) => ({
  month: m,
  views: [820, 940, 1100, 1050, 1240, 1380][i],
  docs: [42, 48, 55, 60, 62, 71][i],
}));

const DEMO = {
  totalArticles: 342,
  published: 289,
  totalViews: 18420,
  avgRating: 4,
  articles: [
    {
      _id: '1',
      title: 'دليل التأهيل المهني لذوي الإعاقة',
      category: 'clinical',
      type: 'document',
      views: 892,
      likes: 124,
      date: new Date(Date.now() - 5 * 86400000),
    },
    {
      _id: '2',
      title: 'أسس التدريب الفعال',
      category: 'training',
      type: 'article',
      views: 643,
      likes: 88,
      date: new Date(Date.now() - 10 * 86400000),
    },
    {
      _id: '3',
      title: 'السياسات والإجراءات الإدارية',
      category: 'policy',
      type: 'document',
      views: 421,
      likes: 56,
      date: new Date(Date.now() - 2 * 86400000),
    },
    {
      _id: '4',
      title: 'تقنيات العلاج الطبيعي الحديثة',
      category: 'clinical',
      type: 'video',
      views: 1240,
      likes: 210,
      date: new Date(Date.now() - 1 * 86400000),
    },
    {
      _id: '5',
      title: 'أبحاث التأهيل 2024',
      category: 'research',
      type: 'document',
      views: 318,
      likes: 42,
      date: new Date(),
    },
  ],
  byCategory: Object.entries(CAT_LABELS)
    .slice(0, 5)
    .map(([k, v], i) => ({ name: v, value: [92, 78, 56, 48, 38][i], color: COLORS[i] })),
  trend: TREND,
};

export default function KnowledgeDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [articles, setArticles] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/knowledge-center/stats').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setArticles(Array.isArray(d.articles) && d.articles.length ? d.articles : DEMO.articles);
    } catch (err) {
      logger.error('Knowledge Dashboard error', err);
      setDash(DEMO);
      setArticles(DEMO.articles);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = articles.filter(a => {
    const ms = !search || a.title?.includes(search);
    const mc = !filterCat || a.category === filterCat;
    const mt = !filterType || a.type === filterType;
    return ms && mc && mt;
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
            background: 'linear-gradient(135deg,#0288d1,#01579b)',
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
                إدارة المعرفة والمحتوى
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                المقالات والوثائق والمحتوى التعليمي
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`منشور: ${dash.published || 289}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`مشاهدات: ${(dash.totalViews || 18420).toLocaleString('ar-SA')}`}
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
                onClick={() => navigate('/knowledge/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                محتوى جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المحتوى"
                value={dash.totalArticles || 342}
                icon={<BookIcon />}
                gradient="linear-gradient(135deg,#0288d1,#01579b)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="منشور"
                value={dash.published || 289}
                icon={<CatIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المشاهدات"
                value={dash.totalViews || 18420}
                icon={<TrendIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="متوسط التقييم"
                value={dash.avgRating || 4}
                icon={<BookmarkIcon />}
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
                  المحتوى حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={215}>
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
                  اتجاه المشاهدات والنشر (6 أشهر)
                </Typography>
                <ResponsiveContainer width="100%" height={215}>
                  <AreaChart
                    data={dash.trend || DEMO.trend}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="kgViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0288d1" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#0288d1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="kgDocs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#43a047" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#43a047" stopOpacity={0} />
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
                      dataKey="views"
                      name="مشاهدات"
                      stroke="#0288d1"
                      fill="url(#kgViews)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="docs"
                      name="وثائق جديدة"
                      stroke="#43a047"
                      fill="url(#kgDocs)"
                      strokeWidth={2}
                      dot={false}
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
                  placeholder="بحث في المحتوى..."
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
                  label={`${filtered.length} عنصر`}
                  sx={{ fontWeight: 700, bgcolor: '#0288d1', color: '#fff' }}
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
                المحتوى المعرفي
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا يوجد محتوى مطابق" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'العنوان',
                        'الفئة',
                        'النوع',
                        'المشاهدات',
                        'الإعجابات',
                        'التاريخ',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((a, i) => (
                      <TableRow
                        key={a._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ maxWidth: 220 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {a.title || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={CAT_LABELS[a.category] || a.category || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={TYPE_LABELS[a.type] || a.type || '-'}
                            size="small"
                            color="info"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {(a.views || 0).toLocaleString('ar-SA')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LikeIcon sx={{ fontSize: 14, color: '#43a047' }} />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {a.likes || 0}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {a.date ? new Date(a.date).toLocaleDateString('ar') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض المحتوى">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/knowledge/${a._id}`)}
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
