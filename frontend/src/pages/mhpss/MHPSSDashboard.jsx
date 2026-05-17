/**
 * MHPSSDashboard — لوحة الصحة النفسية والدعم الاجتماعي (Professional v2)
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
  Psychology as PsychIcon,
  MedicalServices as SessionIcon,
  Warning as CrisisIcon,
  Group as GroupIcon,
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

const _SESSION_TYPE = { individual: 'فردية', group: 'جماعية', family: 'أسرية', emergency: 'طوارئ' };
const _SESSION_COLORS = {
  individual: 'primary',
  group: 'success',
  family: 'warning',
  emergency: 'error',
};
const CRISIS_SEVERITY = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' };
const SEV_COLORS_MAP = { low: 'success', medium: 'warning', high: 'error', critical: 'error' };
const COLORS = ['#5c6bc0', '#26a69a', '#ef5350', '#ffa726', '#ab47bc'];

const DEMO = {
  totalSessions: 342,
  activePrograms: 8,
  activeCrises: 3,
  groupSessions: 24,
  crises: [
    {
      _id: '1',
      beneficiary: 'أحمد سالم',
      type: 'anxiety',
      severity: 'high',
      status: 'in_progress',
      counselor: 'د. نورا',
      date: '2025-03-20',
    },
    {
      _id: '2',
      beneficiary: 'فاطمة علي',
      type: 'depression',
      severity: 'medium',
      status: 'monitored',
      counselor: 'د. سارة',
      date: '2025-03-19',
    },
    {
      _id: '3',
      beneficiary: 'عمر القحطاني',
      type: 'aggression',
      severity: 'critical',
      status: 'in_progress',
      counselor: 'د. خالد',
      date: '2025-03-21',
    },
    {
      _id: '4',
      beneficiary: 'رانيا المطيري',
      type: 'withdrawal',
      severity: 'low',
      status: 'resolved',
      counselor: 'د. نورا',
      date: '2025-03-15',
    },
    {
      _id: '5',
      beneficiary: 'فهد الدوسري',
      type: 'anxiety',
      severity: 'medium',
      status: 'monitored',
      counselor: 'د. سارة',
      date: '2025-03-18',
    },
  ],
  sessionTypes: [
    { name: 'فردية', value: 210, color: '#5c6bc0' },
    { name: 'جماعية', value: 72, color: '#26a69a' },
    { name: 'أسرية', value: 38, color: '#ffa726' },
    { name: 'طوارئ', value: 22, color: '#ef5350' },
  ],
  monthlySessions: [
    { month: 'أكتوبر', sessions: 48 },
    { month: 'نوفمبر', sessions: 55 },
    { month: 'ديسمبر', sessions: 42 },
    { month: 'يناير', sessions: 62 },
    { month: 'فبراير', sessions: 68 },
    { month: 'مارس', sessions: 67 },
  ],
};

export default function MHPSSDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [crises, setCrises] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/mhpss/dashboard').catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setCrises(Array.isArray(d.crises) && d.crises.length ? d.crises : DEMO.crises);
    } catch (err) {
      logger.error('MHPSS Dashboard error', err);
      setDash(DEMO);
      setCrises(DEMO.crises);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = crises.filter(c => {
    const ms = !search || c.beneficiary?.includes(search) || c.counselor?.includes(search);
    const ms2 = !filterSeverity || c.severity === filterSeverity;
    return ms && ms2;
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
            background: 'linear-gradient(135deg,#3949ab,#5c6bc0)',
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
                الصحة النفسية والدعم الاجتماعي
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الجلسات، الأزمات النفسية، والبرامج الداعمة
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`جلسات: ${dash.totalSessions || 342}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`أزمات نشطة: ${dash.activeCrises || 3}`}
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
                onClick={() => navigate('/mhpss/sessions/new')}
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

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الجلسات"
                value={dash.totalSessions || 342}
                icon={<SessionIcon />}
                gradient="linear-gradient(135deg,#3949ab,#5c6bc0)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="برامج نشطة"
                value={dash.activePrograms || 8}
                icon={<PsychIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="أزمات نشطة"
                value={dash.activeCrises || 3}
                icon={<CrisisIcon />}
                gradient="linear-gradient(135deg,#c62828,#b71c1c)"
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="جلسات جماعية"
                value={dash.groupSessions || 24}
                icon={<GroupIcon />}
                gradient={gradients.ocean}
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
                  الجلسات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.sessionTypes || DEMO.sessionTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.sessionTypes || DEMO.sessionTypes).map((e, i) => (
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
                  الجلسات الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart
                    data={dash.monthlySessions || DEMO.monthlySessions}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="mhG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3949ab" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3949ab" stopOpacity={0} />
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
                      dataKey="sessions"
                      name="عدد الجلسات"
                      stroke="#3949ab"
                      fill="url(#mhG)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#3949ab' }}
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
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالمستفيد أو المعالج..."
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
                  label="درجة الخطورة"
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(CRISIS_SEVERITY).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} حالة`}
                  sx={{ fontWeight: 700, bgcolor: '#3949ab', color: '#fff' }}
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
                الحالات النشطة
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد حالات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المستفيد',
                        'نوع الحالة',
                        'الخطورة',
                        'الحالة',
                        'المعالج',
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
                    {filtered.slice(0, 15).map((c, i) => (
                      <TableRow
                        key={c._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#3949ab' }}
                            >
                              {(c.beneficiary || 'م').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {c.beneficiary || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {c.type || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={CRISIS_SEVERITY[c.severity] || c.severity || '-'}
                            color={SEV_COLORS_MAP[c.severity] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={c.status || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {c.counselor || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {c.date ? _fmtDate(c.date) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض الحالة">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/mhpss/cases/${c._id}`)}
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
