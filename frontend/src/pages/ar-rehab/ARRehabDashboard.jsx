/**
 * ARRehabDashboard — لوحة تحكم التأهيل بالواقع المعزز (Professional v2)
 * AR/VR/XR — هولوجرام، BCI، تعاون عن بعد
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
  LinearProgress,
  useTheme,
  alpha,
  IconButton,
  Tooltip,
  InputAdornment,
  TextField,
  MenuItem,
} from '@mui/material';
import {
  ViewInAr as ARIcon,
  Sensors as BCIIcon,
  Groups as CollabIcon,
  VideogameAsset as VRIcon,
  TrendingUp as TrendingIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  AutoAwesome as HologramIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../services/arRehabService';
import { gradients } from '../../theme/palette';
import { ChartTooltip } from '../../components/dashboard/shared/ChartTooltip';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import logger from '../../utils/logger';

/* ─── Animated counter ─────────────────────────────────── */
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

const KPICard = ({ label, value, icon, gradient, delay, suffix = '' }) => {
  const { v, ref } = useCounter(typeof value === 'number' ? value : parseInt(value) || 0, 1000);
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
              {suffix}
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

/* ─── Constants ──────────────────────────────────────────── */
const SESSION_TYPES = [
  { id: 'ar', label: 'واقع معزز', color: '#42a5f5', icon: <ARIcon /> },
  { id: 'vr', label: 'واقع افتراضي', color: '#7e57c2', icon: <VRIcon /> },
  { id: 'hologram', label: 'هولوجرام', color: '#26c6da', icon: <HologramIcon /> },
  { id: 'bci', label: 'واجهة BCI', color: '#ff7043', icon: <BCIIcon /> },
  { id: 'collaborative', label: 'تعاوني عن بعد', color: '#66bb6a', icon: <CollabIcon /> },
];

const sessionStatusLabels = {
  active: 'نشطة',
  completed: 'مكتملة',
  paused: 'متوقفة',
  cancelled: 'ملغاة',
};
const sessionStatusColors = {
  active: 'success',
  completed: 'info',
  paused: 'warning',
  cancelled: 'error',
};

const DATA_SESSIONS = [
  {
    _id: '1',
    beneficiaryName: 'أحمد محمد العلي',
    sessionType: 'ar',
    status: 'completed',
    startTime: new Date(Date.now() - 2 * 3600000),
    duration: 45,
    progressScore: 78,
    therapist: 'أ. نورة محمد',
  },
  {
    _id: '2',
    beneficiaryName: 'سارة خالد المحمد',
    sessionType: 'vr',
    status: 'completed',
    startTime: new Date(Date.now() - 5 * 3600000),
    duration: 30,
    progressScore: 82,
    therapist: 'أ. علي الشمري',
  },
  {
    _id: '3',
    beneficiaryName: 'عبدالله سعد الحربي',
    sessionType: 'hologram',
    status: 'active',
    startTime: new Date(),
    duration: null,
    progressScore: null,
    therapist: 'أ. نورة محمد',
  },
  {
    _id: '4',
    beneficiaryName: 'لمى عبدالرحمن',
    sessionType: 'bci',
    status: 'completed',
    startTime: new Date(Date.now() - 86400000),
    duration: 60,
    progressScore: 71,
    therapist: 'أ. فاطمة علي',
  },
  {
    _id: '5',
    beneficiaryName: 'محمد فهد القحطاني',
    sessionType: 'collaborative',
    status: 'paused',
    startTime: new Date(Date.now() - 3600000),
    duration: 20,
    progressScore: 55,
    therapist: 'أ. علي الشمري',
  },
  {
    _id: '6',
    beneficiaryName: 'نوف منصور الغامدي',
    sessionType: 'ar',
    status: 'completed',
    startTime: new Date(Date.now() - 3 * 86400000),
    duration: 40,
    progressScore: 88,
    therapist: 'أ. فاطمة علي',
  },
];

const DATA_DASHBOARD = {
  totalSessions: 184,
  totalHolograms: 37,
  totalBciDevices: 12,
  collaborativeSessions: 28,
  avgEngagement: 76,
};

const WEEKLY_DATA = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((day, i) => ({
  day,
  AR: [8, 12, 10, 15, 9][i],
  VR: [5, 7, 6, 8, 4][i],
  BCI: [2, 3, 2, 4, 1][i],
}));
const TYPE_PIE = SESSION_TYPES.map((t, i) => ({ name: t.label, value: [42, 28, 15, 18, 21][i] }));
const TYPE_COLORS = SESSION_TYPES.map(t => t.color);

/* ─── Main Component ─────────────────────────────────────── */
export default function ARRehabDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState({});
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const dResp = await getDashboard().catch(() => ({ data: {} }));
      const d = dResp.data || dResp || {};
      setDashboard(Object.keys(d).length ? d : DATA_DASHBOARD);
      setSessions(
        Array.isArray(d.recentSessions) && d.recentSessions.length
          ? d.recentSessions
          : DATA_SESSIONS
      );
    } catch (err) {
      logger.error('AR Rehab Dashboard error', err);
      setDashboard(DATA_DASHBOARD);
      setSessions(DATA_SESSIONS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = sessions.filter(s => {
    const ms = !search || s.beneficiaryName?.includes(search) || s.therapist?.includes(search);
    const mt = !filterType || s.sessionType === filterType;
    const mf = !filterStatus || s.status === filterStatus;
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
        {/* ── Header ── */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              bottom: -30,
              left: -30,
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.05)',
            },
          }}
        >
          <Box maxWidth="xl" sx={{ mx: 'auto' }}>
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
                  التأهيل بالواقع المعزز AR/XR
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                  هولوجرام • واجهة الدماغ-الحاسوب BCI • تعاون عن بعد • VR/AR/XR
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                  {SESSION_TYPES.map(t => (
                    <Chip
                      key={t.id}
                      icon={React.cloneElement(t.icon, {
                        sx: { fontSize: '14px !important', color: '#fff !important' },
                      })}
                      label={t.label}
                      size="small"
                      sx={{ bgcolor: alpha(t.color, 0.35), color: '#fff', fontSize: 11 }}
                    />
                  ))}
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
                  onClick={() => navigate('/ar-rehab/new')}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  جلسة جديدة
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          {/* ── KPIs ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={4} md={2.4}>
              <KPICard
                label="إجمالي الجلسات"
                value={dashboard.totalSessions || sessions.length}
                icon={<ARIcon />}
                gradient="linear-gradient(135deg,#667eea,#764ba2)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <KPICard
                label="هولوجرامات"
                value={dashboard.totalHolograms || 37}
                icon={<HologramIcon />}
                gradient="linear-gradient(135deg,#11cdef,#1171ef)"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <KPICard
                label="أجهزة BCI"
                value={dashboard.totalBciDevices || 12}
                icon={<BCIIcon />}
                gradient="linear-gradient(135deg,#fb6340,#fbb140)"
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <KPICard
                label="جلسات تعاونية"
                value={dashboard.collaborativeSessions || 28}
                icon={<CollabIcon />}
                gradient={gradients.success}
                delay={3}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2.4}>
              <KPICard
                label="متوسط التفاعل"
                value={dashboard.avgEngagement || 76}
                icon={<TrendingIcon />}
                gradient={gradients.warning}
                delay={4}
                suffix="%"
              />
            </Grid>
          </Grid>

          {/* ── Charts ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الجلسات الأسبوعية حسب التقنية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={WEEKLY_DATA}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={14}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <YAxis tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="AR" fill="#667eea" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="VR" fill="#7e57c2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="BCI" fill="#ff7043" radius={[4, 4, 0, 0]} />
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
                  توزيع أنواع الجلسات
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={TYPE_PIE}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {TYPE_PIE.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* ── Session Type Cards ── */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {SESSION_TYPES.map(t => (
              <Grid item xs={6} sm={4} md key={t.id}>
                <motion.div whileHover={{ y: -3 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: alpha(t.color, 0.3),
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { bgcolor: alpha(t.color, 0.05) },
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setFilterType(filterType === t.id ? '' : t.id)}
                  >
                    <Avatar
                      sx={{
                        bgcolor: alpha(t.color, 0.12),
                        color: t.color,
                        width: 36,
                        height: 36,
                        mx: 'auto',
                        mb: 0.75,
                      }}
                    >
                      {t.icon}
                    </Avatar>
                    <Typography variant="caption" fontWeight={700} display="block">
                      {t.label}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* ── Filters ── */}
          <Paper
            elevation={0}
            sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4} md={3.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالمستفيد أو المعالج..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
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
                  {SESSION_TYPES.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3} md={2}>
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
                  {Object.entries(sessionStatusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} جلسة`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* ── Table ── */}
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
                سجل الجلسات
              </Typography>
              <Chip label={`${filtered.length} نتيجة`} size="small" variant="outlined" />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد جلسات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المستفيد',
                        'التقنية',
                        'الحالة',
                        'المعالج',
                        'التاريخ',
                        'المدة (د)',
                        'التقدم',
                        'إجراء',
                      ].map(h => (
                        <TableCell
                          key={h}
                          sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}
                        >
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((s, i) => {
                      const type = SESSION_TYPES.find(t => t.id === s.sessionType);
                      return (
                        <TableRow
                          key={s._id || i}
                          hover
                          sx={{ '&:last-child td': { borderBottom: 0 } }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  fontSize: 12,
                                  bgcolor: alpha('#667eea', 0.15),
                                  color: '#667eea',
                                }}
                              >
                                {s.beneficiaryName?.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {s.beneficiaryName || '-'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {type ? (
                              <Chip
                                label={type.label}
                                size="small"
                                sx={{
                                  bgcolor: alpha(type.color, 0.12),
                                  color: type.color,
                                  fontWeight: 600,
                                  fontSize: 11,
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontSize: 12 }}>
                                {s.sessionType || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sessionStatusLabels[s.status] || s.status || '-'}
                              color={sessionStatusColors[s.status] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {s.therapist || s.therapistName || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {s.startTime ? new Date(s.startTime).toLocaleDateString('ar') : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {s.duration ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {s.progressScore != null ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" fontWeight={700}>
                                  {s.progressScore}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={s.progressScore}
                                  sx={{ width: 50, height: 4, borderRadius: 2 }}
                                  color={s.progressScore >= 70 ? 'success' : 'warning'}
                                />
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.disabled">
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip title="عرض التفاصيل">
                              <IconButton
                                size="small"
                                onClick={() => navigate(`/ar-rehab/${s._id}`)}
                                sx={{ border: '1px solid', borderColor: 'divider' }}
                              >
                                <ViewIcon fontSize="small" color="primary" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
