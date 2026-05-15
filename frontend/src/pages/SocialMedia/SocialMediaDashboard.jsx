/**
 * SocialMediaDashboard — لوحة إدارة منصات التواصل الاجتماعي (Professional)
 *
 * Tabs:
 *  1. نظرة عامة   — Overview KPIs, engagement trend, platform breakdown
 *  2. المنشورات   — Post queue, scheduler, filter by status/platform
 *  3. التحليلات   — Follower growth, best times, hashtag performance
 *  4. الجمهور     — Audience insights: age, gender, city, device
 *  5. الحملات     — Campaign tracking and ROI
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Tab,
  Tabs,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Avatar,
  Button,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  LinearProgress,
  Divider,
  Badge,
  useTheme,
  alpha,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp as _TrendingUpIcon,
  TrendingDown as _TrendingDownIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  FilterList as _FilterIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as _ErrorIcon,
  HourglassBottom as _PendingIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  People as PeopleIcon,
  ThumbUp as LikeIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  Tag as HashtagIcon,
  Campaign as CampaignIcon,
  BarChart as AnalyticsIcon,
  Speed as SpeedIcon,
  Notifications as _NotifIcon,
  CalendarMonth as CalendarIcon,
  Download as DownloadIcon,
  Timeline as _TimelineIcon,
  Smartphone as MobileIcon,
  Public as ReachIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getOverview,
  getEngagementTrend,
  getFollowerGrowth,
  getPosts,
  getCampaigns,
  getHashtagPerformance,
  getAudienceInsights,
  getBestPostingTimes,
  getTeamActivity,
  PLATFORMS,
  POST_STATUSES,
} from '../../services/socialMediaService';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import logger from '../../utils/logger';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = n => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('ar-SA');
};

const _fmtPct = v => (v >= 0 ? '+' : '') + v + '%';

const getPlatformMeta = id =>
  PLATFORMS.find(p => p.id === id) || { label: id, color: '#888', icon: '?' };

// ─── Animated Counter ─────────────────────────────────────────────────────────
const useCounter = (end, dur = 1200) => {
  const [v, setV] = useState(0);
  const ran = useRef(false);
  const ref = useRef(null);
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

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon, gradient, delay = 0 }) => {
  const numVal =
    typeof value === 'number' ? value : parseInt(String(value).replace(/[^0-9]/g, '')) || 0;
  const { v, ref } = useCounter(numVal);
  const _theme = useTheme();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08, duration: 0.4 }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
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
          cursor: 'default',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -30,
            right: -30,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.12)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -20,
            left: -10,
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500 }}>
              {label}
            </Typography>
            <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, lineHeight: 1.2 }}>
              {fmt(v)}
            </Typography>
            {sub && (
              <Chip
                label={sub}
                size="small"
                sx={{
                  mt: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                }}
              />
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', width: 48, height: 48 }}>{icon}</Avatar>
        </Stack>
      </Paper>
    </motion.div>
  );
};

// ─── Platform Badge ───────────────────────────────────────────────────────────
const _PlatformBadge = ({ platform }) => {
  const meta = getPlatformMeta(platform);
  return (
    <Chip
      label={meta.label}
      size="small"
      sx={{
        bgcolor: meta.color,
        color: platform === 'snapchat' ? '#000' : '#fff',
        fontWeight: 700,
        fontSize: '0.7rem',
      }}
    />
  );
};

// ─── Post Status Chip ─────────────────────────────────────────────────────────
const StatusChip = ({ status }) => {
  const meta = POST_STATUSES[status] || { label: status, color: 'default' };
  return <Chip label={meta.label} color={meta.color} size="small" sx={{ fontWeight: 600 }} />;
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, action }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
    <Typography variant="h6" fontWeight={700}>
      {title}
    </Typography>
    {action}
  </Stack>
);

// ─── Tab Panel ────────────────────────────────────────────────────────────────
const TabPanel = ({ children, value, index }) =>
  value === index ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Box pt={3}>{children}</Box>
      </motion.div>
    </AnimatePresence>
  ) : null;

// ─── Tooltip Custom ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.5, borderRadius: 2, boxShadow: 4, minWidth: 140 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">
        {label}
      </Typography>
      {payload.map((p, i) => (
        <Box key={i} display="flex" alignItems="center" gap={0.5} mt={0.4}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography variant="caption">
            {p.name}: <b>{fmt(p.value)}</b>
          </Typography>
        </Box>
      ))}
    </Paper>
  );
};

// ─── Loading Spinner ─────────────────────────────────────────────────────────
const Loading = () => (
  <Box display="flex" justifyContent="center" py={6}>
    <CircularProgress />
  </Box>
);

// ═══════════════════════════════════════════════════════════════════════════════
//  Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export default function SocialMediaDashboard() {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));
  const isDark = theme.palette.mode === 'dark';

  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState(null);
  const [engagementTrend, setEngagementTrend] = useState([]);
  const [followerGrowth, setFollowerGrowth] = useState([]);
  const [posts, setPosts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [hashtags, setHashtags] = useState([]);
  const [audience, setAudience] = useState(null);
  const [bestTimes, setBestTimes] = useState([]);
  const [teamActivity, setTeamActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postFilter, setPostFilter] = useState({ status: '', platform: '' });
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [refreshing, setRefreshing] = useState(false);

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  ];

  const platformColors = {
    instagram: '#E1306C',
    twitter: '#000000',
    facebook: '#1877F2',
    linkedin: '#0A66C2',
    tiktok: '#010101',
    youtube: '#FF0000',
    snapchat: '#FFFC00',
    threads: '#101010',
    telegram: '#2CA5E0',
    pinterest: '#E60023',
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, et, fg, ps, ca, ht, au, bt, ta] = await Promise.all([
        getOverview(),
        getEngagementTrend(30),
        getFollowerGrowth(),
        getPosts(),
        getCampaigns(),
        getHashtagPerformance(),
        getAudienceInsights(),
        getBestPostingTimes(selectedPlatform),
        getTeamActivity(),
      ]);
      setOverview(ov);
      setEngagementTrend(et);
      setFollowerGrowth(fg);
      setPosts(ps);
      setCampaigns(ca);
      setHashtags(ht);
      setAudience(au);
      setBestTimes(bt);
      setTeamActivity(ta);
    } catch (err) {
      logger.error('SocialMediaDashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPlatform]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const filteredPosts = posts.filter(
    p =>
      (!postFilter.status || p.status === postFilter.status) &&
      (!postFilter.platform || p.platform === postFilter.platform)
  );

  const paperSx = {
    p: 3,
    borderRadius: 3,
    border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
    bgcolor: isDark ? alpha('#fff', 0.03) : '#fff',
    boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.06)',
  };

  // ─── Tab: Overview ───────────────────────────────────────────────────────────
  const renderOverview = () => {
    if (!overview) return <Loading />;
    const kpis = [
      {
        label: 'إجمالي المتابعين',
        value: overview.totalFollowers,
        sub: overview.followerGrowth,
        icon: <PeopleIcon />,
        gradient: gradients[0],
      },
      {
        label: 'التفاعل الكلي',
        value: overview.totalEngagements,
        sub: overview.engagementRate,
        icon: <LikeIcon />,
        gradient: gradients[1],
      },
      {
        label: 'الوصول الكلي',
        value: overview.totalReach,
        sub: overview.reachGrowth,
        icon: <ReachIcon />,
        gradient: gradients[2],
      },
      {
        label: 'منشورات هذا الشهر',
        value: overview.publishedThisMonth,
        icon: <CheckCircleIcon />,
        gradient: gradients[3],
      },
      {
        label: 'منشورات مجدولة',
        value: overview.scheduledPosts,
        icon: <ScheduleIcon />,
        gradient: gradients[4],
      },
    ];

    return (
      <Grid container spacing={3}>
        {/* KPI Cards */}
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={isSmall ? 6 : 2.4} key={k.label}>
            <KPICard {...k} delay={i} />
          </Grid>
        ))}

        {/* Engagement Trend Chart */}
        <Grid item xs={12} lg={8}>
          <Paper sx={paperSx}>
            <SectionHeader title="تريند التفاعل — آخر 30 يوماً" />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={engagementTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {[
                    'instagram',
                    'twitter',
                    'facebook',
                    'linkedin',
                    'tiktok',
                    'threads',
                    'telegram',
                    'pinterest',
                  ].map(p => (
                    <linearGradient key={p} id={`grad-${p}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={platformColors[p]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={platformColors[p]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                <RTooltip content={<CustomTooltip />} />
                <Legend />
                {[
                  'instagram',
                  'twitter',
                  'facebook',
                  'linkedin',
                  'tiktok',
                  'threads',
                  'telegram',
                  'pinterest',
                ].map(p => (
                  <Area
                    key={p}
                    type="monotone"
                    dataKey={p}
                    name={getPlatformMeta(p).label}
                    stroke={platformColors[p]}
                    fill={`url(#grad-${p})`}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Platform Breakdown */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ ...paperSx, height: '100%' }}>
            <SectionHeader title="أداء المنصات" />
            <Stack spacing={2}>
              {overview.platformBreakdown.map(p => {
                const meta = getPlatformMeta(p.platform);
                return (
                  <Box key={p.platform}>
                    <Stack direction="row" justifyContent="space-between" mb={0.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: meta.color,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          {meta.icon}
                        </Avatar>
                        <Typography variant="body2" fontWeight={600}>
                          {meta.label}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {fmt(p.followers)}
                        </Typography>
                        <Chip
                          label={`${p.engagement}%`}
                          size="small"
                          color="success"
                          sx={{ height: 20, fontSize: '0.68rem' }}
                        />
                      </Stack>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((p.followers / overview.totalFollowers) * 100, 100)}
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: alpha(meta.color, 0.15),
                        '& .MuiLinearProgress-bar': { bgcolor: meta.color, borderRadius: 3 },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        {/* Recent Team Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={paperSx}>
            <SectionHeader title="نشاط الفريق الأخير" />
            <Stack spacing={1.5}>
              {teamActivity.map((a, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: gradients[i % gradients.length],
                        fontSize: '0.8rem',
                      }}
                    >
                      {a.user.charAt(0)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={600}>
                        {a.user}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {a.action}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {a.time}
                    </Typography>
                  </Stack>
                  {i < teamActivity.length - 1 && <Divider sx={{ mt: 1.5 }} />}
                </motion.div>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Top Hashtags */}
        <Grid item xs={12} md={6}>
          <Paper sx={paperSx}>
            <SectionHeader title="أبرز الهاشتاقات" action={<HashtagIcon color="primary" />} />
            <Stack spacing={1}>
              {hashtags.map((h, i) => (
                <Stack key={h.tag} direction="row" alignItems="center" spacing={1.5}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ width: 20, textAlign: 'center' }}
                  >
                    {i + 1}
                  </Typography>
                  <Box flex={1}>
                    <Stack direction="row" justifyContent="space-between" mb={0.3}>
                      <Typography variant="body2" fontWeight={700} color="primary">
                        {h.tag}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <Typography variant="caption" color="text.secondary">
                          {fmt(h.count)}
                        </Typography>
                        <Chip
                          label={h.growth}
                          size="small"
                          color="success"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(h.count / hashtags[0].count) * 100}
                      sx={{ height: 4, borderRadius: 3 }}
                    />
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // ─── Tab: Posts ──────────────────────────────────────────────────────────────
  const renderPosts = () => (
    <Grid container spacing={3}>
      {/* Filters */}
      <Grid item xs={12}>
        <Paper sx={paperSx}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Typography variant="h6" fontWeight={700} sx={{ minWidth: 120 }}>
              قائمة المنشورات
            </Typography>
            <TextField
              select
              size="small"
              label="الحالة"
              value={postFilter.status}
              onChange={e => setPostFilter(f => ({ ...f, status: e.target.value }))}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(POST_STATUSES).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="المنصة"
              value={postFilter.platform}
              onChange={e => setPostFilter(f => ({ ...f, platform: e.target.value }))}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">الكل</MenuItem>
              {PLATFORMS.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  {p.label}
                </MenuItem>
              ))}
            </TextField>
            <Box flex={1} />
            <Button variant="contained" startIcon={<AddIcon />} size="small">
              منشور جديد
            </Button>
          </Stack>
        </Paper>
      </Grid>

      {/* Post Cards */}
      {filteredPosts.length === 0 ? (
        <Grid item xs={12}>
          <EmptyState message="لا توجد منشورات تطابق الفلتر المحدد" />
        </Grid>
      ) : (
        filteredPosts.map((post, i) => {
          const meta = getPlatformMeta(post.platform);
          return (
            <Grid item xs={12} md={6} xl={4} key={post.id}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Paper sx={{ ...paperSx, p: 2.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    mb={1.5}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          bgcolor: meta.color,
                          fontSize: '0.7rem',
                          fontWeight: 800,
                        }}
                      >
                        {meta.icon}
                      </Avatar>
                      <Box>
                        <Typography variant="caption" fontWeight={700}>
                          {meta.label}
                        </Typography>
                        {post.scheduledAt && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {new Date(post.scheduledAt).toLocaleString('ar-SA', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                    <StatusChip status={post.status} />
                  </Stack>

                  {post.image && (
                    <Box
                      sx={{
                        height: 120,
                        borderRadius: 2,
                        bgcolor: alpha(meta.color, 0.12),
                        mb: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        🖼️ صورة مرفقة
                      </Typography>
                    </Box>
                  )}

                  <Typography
                    variant="body2"
                    color="text.primary"
                    sx={{
                      mb: 1.5,
                      lineHeight: 1.7,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {post.content}
                  </Typography>

                  {post.status === 'published' && (
                    <Stack direction="row" spacing={2} mb={1.5}>
                      {[
                        { icon: <LikeIcon fontSize="small" />, val: post.likes },
                        { icon: <CommentIcon fontSize="small" />, val: post.comments },
                        { icon: <ShareIcon fontSize="small" />, val: post.shares },
                        { icon: <ReachIcon fontSize="small" />, val: post.reach },
                      ].map((m, idx) => (
                        <Stack key={idx} direction="row" alignItems="center" spacing={0.4}>
                          <Box sx={{ color: 'text.secondary', display: 'flex' }}>{m.icon}</Box>
                          <Typography variant="caption" fontWeight={600}>
                            {fmt(m.val)}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                    <Tooltip title="عرض">
                      <IconButton size="small">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" color="error">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Paper>
              </motion.div>
            </Grid>
          );
        })
      )}
    </Grid>
  );

  // ─── Tab: Analytics ──────────────────────────────────────────────────────────
  const renderAnalytics = () => (
    <Grid container spacing={3}>
      {/* Follower Growth */}
      <Grid item xs={12} lg={8}>
        <Paper sx={paperSx}>
          <SectionHeader title="نمو المتابعين — 12 شهراً" />
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={followerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <RTooltip content={<CustomTooltip />} />
              <Legend />
              {[
                'instagram',
                'twitter',
                'facebook',
                'linkedin',
                'tiktok',
                'threads',
                'telegram',
                'pinterest',
              ].map(p => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  name={getPlatformMeta(p).label}
                  stroke={platformColors[p]}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Best Posting Times */}
      <Grid item xs={12} lg={4}>
        <Paper sx={paperSx}>
          <SectionHeader
            title="أفضل أوقات النشر"
            action={
              <TextField
                select
                size="small"
                value={selectedPlatform}
                onChange={async e => {
                  setSelectedPlatform(e.target.value);
                  const bt = await getBestPostingTimes(e.target.value);
                  setBestTimes(bt);
                }}
                sx={{ minWidth: 120 }}
              >
                {PLATFORMS.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>
            }
          />
          <Stack spacing={2} mt={1}>
            {bestTimes.map((t, i) => (
              <Box key={i}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="primary" />
                    <Typography variant="body2" fontWeight={600}>
                      {t.day}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t.hour}
                    </Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <StarIcon fontSize="small" sx={{ color: '#f59e0b', fontSize: 16 }} />
                    <Typography variant="body2" fontWeight={700}>
                      {t.score}
                    </Typography>
                  </Stack>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={t.score}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: platformColors[selectedPlatform] || theme.palette.primary.main,
                    },
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Grid>

      {/* Hashtag Performance Bar Chart */}
      <Grid item xs={12} md={7}>
        <Paper sx={paperSx}>
          <SectionHeader title="أداء الهاشتاقات" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={hashtags} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={alpha(theme.palette.divider, 0.5)}
              />
              <XAxis type="number" tickFormatter={fmt} tick={{ fontSize: 11 }} />
              <YAxis dataKey="tag" type="category" tick={{ fontSize: 11 }} width={110} />
              <RTooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="عدد الاستخدامات" radius={[0, 6, 6, 0]}>
                {hashtags.map((_, i) => (
                  <Cell
                    key={i}
                    fill={gradients[i % gradients.length].match(/#[0-9a-f]{6}/gi)?.[0] || '#6366f1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Engagement by Platform Radar */}
      <Grid item xs={12} md={5}>
        <Paper sx={paperSx}>
          <SectionHeader title="معدل التفاعل بالمنصة" />
          {overview?.platformBreakdown && (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart
                data={overview.platformBreakdown.map(p => ({
                  platform: getPlatformMeta(p.platform).label,
                  تفاعل: p.engagement,
                }))}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="platform" tick={{ fontSize: 11 }} />
                <Radar
                  name="معدل التفاعل"
                  dataKey="تفاعل"
                  stroke={theme.palette.primary.main}
                  fill={theme.palette.primary.main}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <RTooltip />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Grid>
    </Grid>
  );

  // ─── Tab: Audience ───────────────────────────────────────────────────────────
  const renderAudience = () => {
    if (!audience) return <Loading />;
    const PIE_COLORS = [
      '#6366f1',
      '#f59e0b',
      '#10b981',
      '#ef4444',
      '#3b82f6',
      '#8b5cf6',
      '#ec4899',
    ];
    return (
      <Grid container spacing={3}>
        {/* Age Groups */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={paperSx}>
            <SectionHeader title="الفئات العمرية" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={audience.ageGroups}
                  dataKey="percent"
                  nameKey="group"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ group, percent }) => `${group}: ${percent}%`}
                  labelLine={false}
                >
                  {audience.ageGroups.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <RTooltip formatter={(v, n) => [`${v}%`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gender */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={paperSx}>
            <SectionHeader title="توزيع الجنس" />
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={audience.genderSplit}
                  dataKey="percent"
                  nameKey="gender"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                >
                  {audience.genderSplit.map((_, i) => (
                    <Cell key={i} fill={['#6366f1', '#ec4899'][i]} />
                  ))}
                </Pie>
                <Legend />
                <RTooltip formatter={v => [`${v}%`]} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Cities */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={paperSx}>
            <SectionHeader title="أبرز المدن" />
            <Stack spacing={1.5}>
              {audience.topCities.map((c, i) => (
                <Box key={c.city}>
                  <Stack direction="row" justifyContent="space-between" mb={0.4}>
                    <Typography variant="body2" fontWeight={600}>
                      {c.city}
                    </Typography>
                    <Typography variant="body2" color="primary" fontWeight={700}>
                      {c.percent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={c.percent}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      '& .MuiLinearProgress-bar': { bgcolor: PIE_COLORS[i % PIE_COLORS.length] },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Device Split */}
        <Grid item xs={12} md={6} lg={3}>
          <Paper sx={paperSx}>
            <SectionHeader title="الأجهزة المستخدمة" />
            <Stack spacing={2} mt={1}>
              {audience.deviceSplit.map((d, i) => (
                <Box key={d.device}>
                  <Stack direction="row" justifyContent="space-between" mb={0.5}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <MobileIcon fontSize="small" color="primary" />
                      <Typography variant="body2" fontWeight={600}>
                        {d.device}
                      </Typography>
                    </Stack>
                    <Typography variant="h6" fontWeight={700} color="primary">
                      {d.percent}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={d.percent}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      '& .MuiLinearProgress-bar': { bgcolor: PIE_COLORS[i] },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  // ─── Tab: Campaigns ──────────────────────────────────────────────────────────
  const renderCampaigns = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={paperSx}>
          <SectionHeader
            title="الحملات الإعلانية"
            action={
              <Button variant="contained" startIcon={<AddIcon />} size="small">
                حملة جديدة
              </Button>
            }
          />
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {[
                    'الحملة',
                    'المنصات',
                    'الحالة',
                    'الميزانية',
                    'المنفق',
                    'الظهورات',
                    'النقرات',
                    'CTR',
                    'CPC',
                    'التحويلات',
                  ].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((c, _i) => {
                  const statusMap = {
                    active: { label: 'نشطة', color: 'success' },
                    completed: { label: 'منتهية', color: 'default' },
                    planned: { label: 'مخططة', color: 'info' },
                    paused: { label: 'موقوفة', color: 'warning' },
                  };
                  const sm = statusMap[c.status] || { label: c.status, color: 'default' };
                  const budgetPct = c.budget > 0 ? Math.round((c.spent / c.budget) * 100) : 0;
                  return (
                    <TableRow key={c.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {c.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {c.startDate} → {c.endDate}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap">
                          {c.platforms.map(p => (
                            <Avatar
                              key={p}
                              sx={{
                                width: 22,
                                height: 22,
                                bgcolor: platformColors[p],
                                fontSize: '0.55rem',
                                fontWeight: 800,
                              }}
                            >
                              {getPlatformMeta(p).icon}
                            </Avatar>
                          ))}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip label={sm.label} color={sm.color} size="small" />
                      </TableCell>
                      <TableCell>{fmt(c.budget)} ر.س</TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="caption">
                            {fmt(c.spent)} ر.س ({budgetPct}%)
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={budgetPct}
                            sx={{
                              height: 4,
                              borderRadius: 2,
                              mt: 0.3,
                              '& .MuiLinearProgress-bar': {
                                bgcolor: budgetPct > 90 ? '#ef4444' : '#10b981',
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{fmt(c.impressions)}</TableCell>
                      <TableCell>{fmt(c.clicks)}</TableCell>
                      <TableCell>{c.ctr > 0 ? `${c.ctr}%` : '—'}</TableCell>
                      <TableCell>{c.cpc > 0 ? `${c.cpc} ر.س` : '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={c.conversions || '—'}
                          size="small"
                          sx={{
                            bgcolor: c.conversions > 0 ? alpha('#10b981', 0.15) : undefined,
                            color: c.conversions > 0 ? '#059669' : undefined,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Grid>

      {/* Campaign Budget Chart */}
      {campaigns.filter(c => c.budget > 0).length > 0 && (
        <Grid item xs={12} md={6}>
          <Paper sx={paperSx}>
            <SectionHeader title="الميزانية مقابل المنفق" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={campaigns.filter(c => c.budget > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                <RTooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="budget"
                  name="الميزانية"
                  fill={alpha(theme.palette.primary.main, 0.6)}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="spent"
                  name="المنفق"
                  fill={theme.palette.primary.main}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}

      {/* Campaign Impressions vs Clicks */}
      {campaigns.filter(c => c.impressions > 0).length > 0 && (
        <Grid item xs={12} md={6}>
          <Paper sx={paperSx}>
            <SectionHeader title="الظهورات والنقرات" />
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={campaigns.filter(c => c.impressions > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.5)} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} />
                <RTooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="impressions" name="الظهورات" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="clicks" name="النقرات" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}
    </Grid>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardErrorBoundary>
      <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ md: 'center' }}
          mb={3}
          spacing={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} gutterBottom>
              إدارة منصات التواصل الاجتماعي
            </Typography>
            <Typography variant="body2" color="text.secondary">
              لوحة تحكم موحدة لجميع المنصات — التحليلات والجدولة والحملات وأداء المحتوى
            </Typography>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <Tooltip title="تحديث البيانات">
              <span>
                <IconButton onClick={handleRefresh} disabled={refreshing || loading}>
                  <RefreshIcon
                    sx={{
                      animation: refreshing ? 'spin 1s linear infinite' : 'none',
                      '@keyframes spin': {
                        from: { transform: 'rotate(0deg)' },
                        to: { transform: 'rotate(360deg)' },
                      },
                    }}
                  />
                </IconButton>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<DownloadIcon />} size="small">
              تصدير التقرير
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} size="small">
              منشور جديد
            </Button>
          </Stack>
        </Stack>

        {/* Tabs */}
        <Paper
          sx={{ mb: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant={isSmall ? 'scrollable' : 'fullWidth'}
            scrollButtons="auto"
            TabIndicatorProps={{ style: { height: 3, borderRadius: 3 } }}
            sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: '0.85rem', minHeight: 52 } }}
          >
            <Tab icon={<SpeedIcon />} iconPosition="start" label="نظرة عامة" />
            <Tab
              icon={<EditIcon />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={posts.filter(p => p.status === 'scheduled').length}
                  color="primary"
                  max={99}
                >
                  المنشورات
                </Badge>
              }
            />
            <Tab icon={<AnalyticsIcon />} iconPosition="start" label="التحليلات" />
            <Tab icon={<PeopleIcon />} iconPosition="start" label="الجمهور" />
            <Tab
              icon={<CampaignIcon />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={campaigns.filter(c => c.status === 'active').length}
                  color="success"
                  max={99}
                >
                  الحملات
                </Badge>
              }
            />
          </Tabs>
        </Paper>

        {/* Content */}
        {loading ? (
          <Loading />
        ) : (
          <>
            <TabPanel value={tab} index={0}>
              {renderOverview()}
            </TabPanel>
            <TabPanel value={tab} index={1}>
              {renderPosts()}
            </TabPanel>
            <TabPanel value={tab} index={2}>
              {renderAnalytics()}
            </TabPanel>
            <TabPanel value={tab} index={3}>
              {renderAudience()}
            </TabPanel>
            <TabPanel value={tab} index={4}>
              {renderCampaigns()}
            </TabPanel>
          </>
        )}
      </Box>
    </DashboardErrorBoundary>
  );
}
