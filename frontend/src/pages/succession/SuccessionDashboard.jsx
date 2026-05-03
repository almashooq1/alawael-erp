/**
 * SuccessionDashboard — لوحة تخطيط التعاقب الوظيفي (Professional v2)
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
  SwapHoriz as SwapIcon,
  Person as PersonIcon,
  Warning as WarnIcon,
  TrendingUp as TrendIcon,
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

const PIE_COLORS = ['#1a237e', '#283593', '#303f9f', '#3949ab', '#5c6bc0', '#9fa8da'];
const readinessLabels = {
  ready_now: 'جاهز الآن',
  ready_12m: 'جاهز 12 شهراً',
  ready_24m: 'جاهز 24 شهراً',
  development: 'قيد التطوير',
};
const readinessColors = {
  ready_now: 'success',
  ready_12m: 'info',
  ready_24m: 'primary',
  development: 'warning',
};
const positionRiskLabels = { critical: 'حرجة', high: 'مرتفعة', medium: 'متوسطة', low: 'منخفضة' };
const positionRiskColors = { critical: 'error', high: 'warning', medium: 'info', low: 'default' };

const DEMO = {
  criticalPositions: 14,
  identifiedSuccessors: 38,
  avgReadiness: 68,
  withoutSuccessors: 6,
  byReadiness: [
    { name: 'جاهز الآن', value: 12, color: PIE_COLORS[0] },
    { name: 'جاهز 12 شهراً', value: 16, color: PIE_COLORS[2] },
    { name: 'جاهز 24 شهراً', value: 8, color: PIE_COLORS[3] },
    { name: 'قيد التطوير', value: 2, color: PIE_COLORS[4] },
  ],
  byDept: [
    { dept: 'التأهيل', count: 8 },
    { dept: 'الإدارة', count: 7 },
    { dept: 'التعليم', count: 6 },
    { dept: 'المالية', count: 5 },
    { dept: 'التقنية', count: 5 },
    { dept: 'الدعم', count: 7 },
  ],
  plans: [
    {
      _id: '1',
      position: 'رئيس قسم التأهيل',
      successor: 'سلمى أحمد',
      dept: 'التأهيل',
      readiness: 'ready_now',
      risk: 'critical',
      progress: 92,
    },
    {
      _id: '2',
      position: 'مدير الخدمات الاجتماعية',
      successor: 'كريم عبدالله',
      dept: 'الاجتماعية',
      readiness: 'ready_12m',
      risk: 'high',
      progress: 78,
    },
    {
      _id: '3',
      position: 'رئيس قسم التعليم',
      successor: 'منى سالم',
      dept: 'التعليم',
      readiness: 'ready_24m',
      risk: 'medium',
      progress: 55,
    },
    {
      _id: '4',
      position: 'مدير المالية',
      successor: 'عمر الغامدي',
      dept: 'المالية',
      readiness: 'ready_12m',
      risk: 'high',
      progress: 80,
    },
    {
      _id: '5',
      position: 'مدير الموارد البشرية',
      successor: null,
      dept: 'الموارد',
      readiness: 'development',
      risk: 'critical',
      progress: 30,
    },
  ],
};

export default function SuccessionDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterReadiness, setFilterReadiness] = useState('');
  const [filterRisk, setFilterRisk] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient.get('/api/succession-planning/stats').catch(() => ({ data: {} }));
      const d = r?.data?.data || r?.data || {};
      if (d.criticalPositions) setDash({ ...DEMO, ...d });
      else setDash(DEMO);
    } catch (err) {
      logger.warn('SuccessionDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.plans || []).filter(p => {
    const ms =
      !search ||
      [p.position, p.successor, p.dept].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const mr = !filterReadiness || p.readiness === filterReadiness;
    const mk = !filterRisk || p.risk === filterRisk;
    return ms && mr && mk;
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
            background: 'linear-gradient(135deg,#1a237e,#283593)',
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
                تخطيط التعاقب الوظيفي
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                المناصب الحرجة، المرشحون للتعاقب، مستوى الجاهزية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`${dash.criticalPositions} منصب حرج`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`${dash.withoutSuccessors} بدون خلف`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,80,80,0.35)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/succession/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                خطة تعاقب جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مناصب حرجة"
                value={dash.criticalPositions}
                icon={<WarnIcon />}
                gradient="linear-gradient(135deg,#1a237e,#283593)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مرشحو التعاقب"
                value={dash.identifiedSuccessors}
                icon={<PersonIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="متوسط الجاهزية (%)"
                value={dash.avgReadiness}
                icon={<TrendIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="بلا خلف معتمد"
                value={dash.withoutSuccessors}
                icon={<SwapIcon />}
                gradient="linear-gradient(135deg,#e53935,#d32f2f)"
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
                  الخلفاء حسب مستوى الجاهزية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byReadiness || DEMO.byReadiness}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byReadiness || DEMO.byReadiness).map((e, i) => (
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
                  خطط التعاقب حسب الإدارة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byDept || DEMO.byDept}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="dept" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد الخطط" fill="#283593" radius={[4, 4, 0, 0]} />
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
                  placeholder="بحث بالمنصب أو الخلف..."
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
                  label="الجاهزية"
                  value={filterReadiness}
                  onChange={e => setFilterReadiness(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(readinessLabels).map(([k, v]) => (
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
                  label="المخاطرة"
                  value={filterRisk}
                  onChange={e => setFilterRisk(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(positionRiskLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} خطة`}
                  sx={{ fontWeight: 700, bgcolor: '#1a237e', color: '#fff' }}
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
                خطط التعاقب الوظيفي
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد خطط مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المنصب الحرج',
                        'الإدارة',
                        'الخلف المقترح',
                        'الجاهزية',
                        'مستوى المخاطرة',
                        'تقدم التطوير',
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
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                            {p.position || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.dept || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#1a237e', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: 12,
                              color: p.successor ? 'inherit' : 'error.main',
                              fontStyle: p.successor ? 'normal' : 'italic',
                            }}
                          >
                            {p.successor || 'لا يوجد خلف'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={readinessLabels[p.readiness] || p.readiness || '—'}
                            color={readinessColors[p.readiness] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={positionRiskLabels[p.risk] || p.risk || '—'}
                            color={positionRiskColors[p.risk] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <LinearProgress
                            variant="determinate"
                            value={p.progress || 0}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" sx={{ fontSize: 10 }}>
                            {p.progress || 0}%
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/succession/${p._id}`)}
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
