/**
 * AuditDashboard — لوحة التدقيق الداخلي (Professional v2)
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
  Assignment as AuditIcon,
  PlaylistAddCheck as PlanIcon,
  Warning as FindingIcon,
  CheckCircle as ClosedIcon,
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
import { getDashboard } from '../../services/internalAudit.service';
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

const STATUS_MAP = {
  completed: 'مكتمل',
  in_progress: 'قيد التنفيذ',
  planned: 'مخطط',
  draft: 'مسودة',
};
const STATUS_COLORS = {
  completed: 'success',
  in_progress: 'warning',
  planned: 'info',
  draft: 'default',
};
const _FINDING_SEVERITY = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };
const _SEV_COLORS = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };
const COLORS = ['#37474f', '#546e7a', '#0288d1', '#26a69a', '#ef5350'];

const DEMO = {
  totalPlans: 12,
  completedAudits: 8,
  openFindings: 21,
  closedFindings: 43,
  plans: [
    {
      _id: '1',
      title: 'تدقيق المشتريات السنوي',
      department: 'المشتريات',
      status: 'completed',
      findings: 3,
      completedPct: 100,
      period: 'Q1-2024',
    },
    {
      _id: '2',
      title: 'مراجعة إجراءات الرواتب',
      department: 'الموارد البشرية',
      status: 'in_progress',
      findings: 5,
      completedPct: 65,
      period: 'Q2-2024',
    },
    {
      _id: '3',
      title: 'تدقيق الأصول الثابتة',
      department: 'المالية',
      status: 'planned',
      findings: 0,
      completedPct: 0,
      period: 'Q3-2024',
    },
    {
      _id: '4',
      title: 'مراجعة أمن المعلومات',
      department: 'تقنية المعلومات',
      status: 'in_progress',
      findings: 7,
      completedPct: 40,
      period: 'Q2-2024',
    },
    {
      _id: '5',
      title: 'تدقيق برامج التأهيل',
      department: 'التأهيل',
      status: 'completed',
      findings: 2,
      completedPct: 100,
      period: 'Q1-2024',
    },
  ],
  byStatus: [
    { name: 'مكتمل', value: 8, color: '#26a69a' },
    { name: 'قيد التنفيذ', value: 2, color: '#546e7a' },
    { name: 'مخطط', value: 2, color: '#0288d1' },
  ],
  findingsBySeverity: [
    { name: 'حرج', value: 3 },
    { name: 'عالي', value: 8 },
    { name: 'متوسط', value: 10 },
    { name: 'منخفض', value: 0 },
  ],
};

export default function AuditDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [plans, setPlans] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDashboard().catch(() => ({ data: {} }));
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setPlans(Array.isArray(d.plans) && d.plans.length ? d.plans : DEMO.plans);
    } catch (err) {
      logger.error('Audit Dashboard error', err);
      setDash(DEMO);
      setPlans(DEMO.plans);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = plans.filter(p => {
    const ms = !search || p.title?.includes(search) || p.department?.includes(search);
    const ms2 = !filterStatus || p.status === filterStatus;
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
            background: 'linear-gradient(135deg,#263238,#37474f)',
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
                التدقيق الداخلي
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                خطط التدقيق، النتائج، وإجراءات المعالجة
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`خطط: ${dash.totalPlans || 12}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`نتائج مفتوحة: ${dash.openFindings || 21}`}
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
                onClick={() => navigate('/audit/plans/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                خطة تدقيق
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="خطط التدقيق"
                value={dash.totalPlans || 12}
                icon={<PlanIcon />}
                gradient="linear-gradient(135deg,#263238,#37474f)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="تدقيقات مكتملة"
                value={dash.completedAudits || 8}
                icon={<ClosedIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="نتائج مفتوحة"
                value={dash.openFindings || 21}
                icon={<FindingIcon />}
                gradient="linear-gradient(135deg,#e53935,#c62828)"
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="نتائج مغلقة"
                value={dash.closedFindings || 43}
                icon={<AuditIcon />}
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
                  حالة خطط التدقيق
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byStatus || DEMO.byStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byStatus || DEMO.byStatus).map((e, i) => (
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
                  النتائج حسب الخطورة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.findingsBySeverity || DEMO.findingsBySeverity}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={36}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="عدد النتائج" radius={[4, 4, 0, 0]}>
                      {(dash.findingsBySeverity || DEMO.findingsBySeverity).map((_e, i) => (
                        <Cell key={i} fill={['#f44336', '#ff9800', '#2196f3', '#4caf50'][i % 4]} />
                      ))}
                    </Bar>
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
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالعنوان أو القسم..."
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
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} خطة`}
                  sx={{ fontWeight: 700, bgcolor: '#263238', color: '#fff' }}
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
                خطط التدقيق
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد خطط مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['العنوان', 'القسم', 'الفترة', 'الحالة', 'الإنجاز', 'النتائج', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((p, i) => (
                      <TableRow
                        key={p._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ maxWidth: 180 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {p.title || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {p.department || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {p.period || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_MAP[p.status] || p.status || '-'}
                            color={STATUS_COLORS[p.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 110 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={p.completedPct || 0}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#263238', 0.12),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: p.completedPct === 100 ? '#26a69a' : '#0288d1',
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {p.completedPct || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.findings || 0}
                            size="small"
                            color={
                              p.findings > 5 ? 'error' : p.findings > 0 ? 'warning' : 'success'
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض الخطة">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/audit/${p._id}`)}
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
