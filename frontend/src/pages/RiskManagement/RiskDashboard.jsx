/**
 * RiskDashboard — لوحة إدارة المخاطر (Professional v2)
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
  Warning as WarnIcon,
  Shield as ShieldIcon,
  Assessment as AssessIcon,
  GppBad as GppBadIcon,
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
import { getRiskDashboard } from '../../services/riskManagement.service';
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

const PRIORITY_LABELS = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };
const PRIORITY_COLORS = { critical: '#f44336', high: '#ff9800', medium: '#2196f3', low: '#4caf50' };
const PRIORITY_CHIP = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };
const STATUS_LABELS = {
  identified: 'محدد',
  assessing: 'قيد التقييم',
  mitigating: 'قيد المعالجة',
  monitored: 'مراقب',
  closed: 'مغلق',
};
const STATUS_COLORS = {
  identified: 'error',
  assessing: 'warning',
  mitigating: 'info',
  monitored: 'success',
  closed: 'default',
};
const CAT_LABELS = {
  operational: 'تشغيلي',
  financial: 'مالي',
  clinical: 'سريري',
  compliance: 'امتثال',
  security: 'أمني',
  strategic: 'استراتيجي',
  it: 'تقني',
};
const COLORS = ['#f44336', '#ff9800', '#2196f3', '#4caf50', '#9c27b0', '#00897b', '#1565c0'];

const DEMO = {
  summary: { totalRisks: 38, criticalRisks: 6, mitigating: 14, closed: 10 },
  topRisks: [
    {
      _id: '1',
      title: 'انقطاع الكهرباء عن وحدة العلاج',
      category: 'operational',
      priority: 'critical',
      status: 'mitigating',
      likelihood: 4,
      impact: 5,
      owner: 'مدير التشغيل',
    },
    {
      _id: '2',
      title: 'اختراق بيانات المستفيدين',
      category: 'security',
      priority: 'critical',
      status: 'assessing',
      likelihood: 3,
      impact: 5,
      owner: 'مسؤول تقنية المعلومات',
    },
    {
      _id: '3',
      title: 'نقص الكوادر المتخصصة',
      category: 'operational',
      priority: 'high',
      status: 'mitigating',
      likelihood: 4,
      impact: 4,
      owner: 'مدير الموارد البشرية',
    },
    {
      _id: '4',
      title: 'تأخر صرف الميزانية التشغيلية',
      category: 'financial',
      priority: 'high',
      status: 'identified',
      likelihood: 3,
      impact: 4,
      owner: 'المدير المالي',
    },
    {
      _id: '5',
      title: 'مخالفات معايير الاعتماد',
      category: 'compliance',
      priority: 'medium',
      status: 'monitored',
      likelihood: 2,
      impact: 4,
      owner: 'مدير الجودة',
    },
  ],
  risksByCategory: [
    { name: 'تشغيلي', value: 12, color: '#f44336' },
    { name: 'سريري', value: 9, color: '#ff9800' },
    { name: 'مالي', value: 7, color: '#2196f3' },
    { name: 'أمني', value: 5, color: '#9c27b0' },
    { name: 'امتثال', value: 5, color: '#00897b' },
  ],
  risksByPriority: [
    { name: 'حرج', value: 6 },
    { name: 'عالي', value: 14 },
    { name: 'متوسط', value: 13 },
    { name: 'منخفض', value: 5 },
  ],
};

const riskScore = r => (r.likelihood || 1) * (r.impact || 1);

export default function RiskDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [risks, setRisks] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getRiskDashboard().catch(() => ({ data: {} }));
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setRisks(Array.isArray(d.topRisks) && d.topRisks.length ? d.topRisks : DEMO.topRisks);
    } catch (err) {
      logger.error('Risk Dashboard error', err);
      setDash(DEMO);
      setRisks(DEMO.topRisks);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = risks.filter(r => {
    const ms = !search || r.title?.includes(search) || r.owner?.includes(search);
    const mc = !filterCat || r.category === filterCat;
    const mp = !filterPriority || r.priority === filterPriority;
    return ms && mc && mp;
  });

  const summary = dash.summary || DEMO.summary;

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
            background: 'linear-gradient(135deg,#b71c1c,#880e4f)',
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
                إدارة المخاطر
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                رصد المخاطر المؤسسية، تقييمها، والحد من أثرها
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`حرجة: ${summary.criticalRisks || 6}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`قيد المعالجة: ${summary.mitigating || 14}`}
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
                onClick={() => navigate('/risk-management/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                مخاطرة جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المخاطر"
                value={summary.totalRisks || 38}
                icon={<WarnIcon />}
                gradient="linear-gradient(135deg,#b71c1c,#880e4f)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مخاطر حرجة"
                value={summary.criticalRisks || 6}
                icon={<GppBadIcon />}
                gradient="linear-gradient(135deg,#e53935,#c62828)"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="قيد المعالجة"
                value={summary.mitigating || 14}
                icon={<AssessIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مغلقة/محسومة"
                value={summary.closed || 10}
                icon={<ShieldIcon />}
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
                  المخاطر حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.risksByCategory || DEMO.risksByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.risksByCategory || DEMO.risksByCategory).map((e, i) => (
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
                  المخاطر حسب الأولوية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.risksByPriority || DEMO.risksByPriority}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={32}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="عدد المخاطر" radius={[4, 4, 0, 0]}>
                      {(dash.risksByPriority || DEMO.risksByPriority).map((e, i) => (
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
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالعنوان أو المالك..."
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
                  label="الأولوية"
                  value={filterPriority}
                  onChange={e => setFilterPriority(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} مخاطرة`}
                  sx={{ fontWeight: 700, bgcolor: '#b71c1c', color: '#fff' }}
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
                سجل المخاطر
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد مخاطر مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'الخطر',
                        'الفئة',
                        'الأولوية',
                        'الحالة',
                        'درجة الخطر',
                        'المالك',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((r, i) => (
                      <TableRow
                        key={r._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {r.title || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={CAT_LABELS[r.category] || r.category || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={PRIORITY_LABELS[r.priority] || r.priority || '-'}
                            color={PRIORITY_CHIP[r.priority] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_LABELS[r.status] || r.status || '-'}
                            color={STATUS_COLORS[r.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: alpha(
                                riskScore(r) >= 15
                                  ? '#f44336'
                                  : riskScore(r) >= 8
                                    ? '#ff9800'
                                    : '#4caf50',
                                0.15
                              ),
                              color:
                                riskScore(r) >= 15
                                  ? '#f44336'
                                  : riskScore(r) >= 8
                                    ? '#ff9800'
                                    : '#4caf50',
                            }}
                          >
                            <Typography variant="caption" fontWeight={800}>
                              {riskScore(r)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {r.owner || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض المخاطرة">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/risk-management/${r._id}`)}
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
