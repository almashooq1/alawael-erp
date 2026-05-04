/**
 * HSEDashboard — لوحة الصحة والسلامة والبيئة (Professional v2)
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
  LinearProgress,
} from '@mui/material';
import {
  LocalFireDepartment as FireIcon,
  Warning as WarningIcon,
  CheckCircle as SafeIcon,
  BugReport as IncidentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
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
import { getDashboard } from '../../services/hse.service';
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
    const obs = new IntersectionObserver(([e]) => {
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
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, dur]);
  return [v, ref];
};

const KPICard = ({ label, value, icon, gradient, delay = 0 }) => {
  const [count, ref] = useCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.12 }}
    >
      <Paper
        ref={ref}
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 3,
          background: gradient,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -16,
            right: -16,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1 }}>
              {count.toLocaleString('ar-SA')}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, mt: 0.5, display: 'block' }}>
              {label}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
        </Box>
      </Paper>
    </motion.div>
  );
};

const PIE_COLORS = ['#e65100', '#ef6c00', '#f57c00', '#fb8c00', '#ffa726', '#ffcc80'];
const incidentTypeLabels = {
  slip: 'انزلاق وسقوط',
  fire: 'حريق',
  chemical: 'مواد كيميائية',
  machinery: 'معدات',
  electrical: 'كهرباء',
  ergonomic: 'إجهاد مهني',
  other: 'أخرى',
};
const severityLabels = { critical: 'بالغة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
const severityColors = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };
const incidentStatusLabels = {
  open: 'مفتوحة',
  under_investigation: 'قيد التحقيق',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};
const incidentStatusColors = {
  open: 'error',
  under_investigation: 'warning',
  resolved: 'success',
  closed: 'default',
};

const DEMO = {
  totalIncidents: 47,
  openIncidents: 9,
  lostDays: 24,
  safetyScore: 88,
  byType: [
    { name: 'انزلاق وسقوط', value: 14, color: PIE_COLORS[0] },
    { name: 'حريق', value: 6, color: PIE_COLORS[1] },
    { name: 'مواد كيميائية', value: 8, color: PIE_COLORS[2] },
    { name: 'معدات', value: 10, color: PIE_COLORS[3] },
    { name: 'كهرباء', value: 5, color: PIE_COLORS[4] },
    { name: 'أخرى', value: 4, color: PIE_COLORS[5] },
  ],
  byMonth: [
    { month: 'يناير', incidents: 5 },
    { month: 'فبراير', incidents: 3 },
    { month: 'مارس', incidents: 8 },
    { month: 'أبريل', incidents: 6 },
    { month: 'مايو', incidents: 10 },
    { month: 'يونيو', incidents: 9 },
  ],
  incidents: [
    {
      _id: '1',
      refNo: 'HSE-001',
      type: 'slip',
      location: 'ممر B',
      severity: 'high',
      status: 'under_investigation',
      date: '2024-06-12',
      injuredCount: 1,
    },
    {
      _id: '2',
      refNo: 'HSE-002',
      type: 'fire',
      location: 'مستودع الأدوات',
      severity: 'critical',
      status: 'open',
      date: '2024-06-14',
      injuredCount: 0,
    },
    {
      _id: '3',
      refNo: 'HSE-003',
      type: 'machinery',
      location: 'ورشة التدريب',
      severity: 'medium',
      status: 'resolved',
      date: '2024-06-05',
      injuredCount: 1,
    },
    {
      _id: '4',
      refNo: 'HSE-004',
      type: 'electrical',
      location: 'خادم الشبكة',
      severity: 'high',
      status: 'closed',
      date: '2024-05-28',
      injuredCount: 0,
    },
    {
      _id: '5',
      refNo: 'HSE-005',
      type: 'ergonomic',
      location: 'مكتب الإدارة',
      severity: 'low',
      status: 'resolved',
      date: '2024-06-08',
      injuredCount: 1,
    },
  ],
};

export default function HSEDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDashboard();
      const d = r?.data || r || {};
      if (d.totalIncidents) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('HSEDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.incidents || []).filter(inc => {
    const ms =
      !search ||
      [inc.refNo, inc.type, inc.location].some(s =>
        s?.toLowerCase().includes(search.toLowerCase())
      );
    const mv = !filterSeverity || inc.severity === filterSeverity;
    const mk = !filterStatus || inc.status === filterStatus;
    return ms && mv && mk;
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
            background: 'linear-gradient(135deg,#bf360c,#d84315)',
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
                الصحة والسلامة والبيئة (HSE)
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                متابعة الحوادث، تقييم المخاطر، وتحسين درجة السلامة
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`${dash.openIncidents} حوادث مفتوحة`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`درجة السلامة: ${dash.safetyScore}%`}
                  size="small"
                  sx={{ bgcolor: 'rgba(100,200,100,0.4)', color: '#fff', fontSize: 11 }}
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
                startIcon={<DownloadIcon />}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.15)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                }}
              >
                تقرير PDF
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/hse/incidents/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                بلاغ جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الحوادث"
                value={dash.totalIncidents}
                icon={<IncidentIcon />}
                gradient="linear-gradient(135deg,#bf360c,#d84315)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="حوادث مفتوحة"
                value={dash.openIncidents}
                icon={<WarningIcon />}
                gradient="linear-gradient(135deg,#e53935,#c62828)"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="أيام عمل مفقودة"
                value={dash.lostDays}
                icon={<FireIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="درجة السلامة (%)"
                value={dash.safetyScore}
                icon={<SafeIcon />}
                gradient={gradients.success}
                delay={3}
              />
            </Grid>
          </Grid>

          {/* Safety score bar */}
          <Paper
            elevation={0}
            sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
            >
              <Typography variant="subtitle2" fontWeight={700}>
                مؤشر الأداء الكلي للسلامة
              </Typography>
              <Typography
                variant="h6"
                fontWeight={800}
                color={
                  dash.safetyScore >= 80
                    ? 'success.main'
                    : dash.safetyScore >= 60
                      ? 'warning.main'
                      : 'error.main'
                }
              >
                {dash.safetyScore}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={dash.safetyScore}
              sx={{
                height: 12,
                borderRadius: 6,
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg,#bf360c,#d84315,#f57c00,#ffb300)',
                },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {dash.safetyScore >= 80
                ? 'أداء ممتاز — استمر في المستوى الحالي'
                : dash.safetyScore >= 60
                  ? 'أداء جيد — يُنصح بمراجعة بروتوكولات السلامة'
                  : 'أداء ضعيف — يستوجب إجراء فوري'}
            </Typography>
          </Paper>

          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  الحوادث حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byType || DEMO.byType}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byType || DEMO.byType).map((e, i) => (
                        <Cell key={i} fill={e.color || PIE_COLORS[i % PIE_COLORS.length]} />
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
                  الحوادث الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byMonth || DEMO.byMonth}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="incidents"
                      name="عدد الحوادث"
                      fill="#d84315"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
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
                  placeholder="بحث بالرقم أو الموقع أو النوع..."
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
                  label="الخطورة"
                  value={filterSeverity}
                  onChange={e => setFilterSeverity(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(severityLabels).map(([k, v]) => (
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
                  {Object.entries(incidentStatusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} حادثة`}
                  sx={{ fontWeight: 700, bgcolor: '#bf360c', color: '#fff' }}
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
                سجل الحوادث
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد حوادث مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'الرقم',
                        'النوع',
                        'الموقع',
                        'الخطورة',
                        'المصابون',
                        'الحالة',
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
                    {filtered.slice(0, 15).map((inc, i) => (
                      <TableRow
                        key={inc._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700 }}
                          >
                            {inc.refNo || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={incidentTypeLabels[inc.type] || inc.type || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#bf360c', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {inc.location || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={severityLabels[inc.severity] || inc.severity || '—'}
                            color={severityColors[inc.severity] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              fontSize: 12,
                              color: inc.injuredCount > 0 ? 'error.main' : 'success.main',
                            }}
                          >
                            {inc.injuredCount || 0}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={incidentStatusLabels[inc.status] || inc.status || '—'}
                            color={incidentStatusColors[inc.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 11 }}>
                            {inc.date || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/hse/incidents/${inc._id}`)}
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
