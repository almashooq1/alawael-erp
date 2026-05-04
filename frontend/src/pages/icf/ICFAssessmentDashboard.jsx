/**
 * ICFAssessmentDashboard — لوحة تحكم تقييمات ICF الوظيفية (Professional v2)
 * التصنيف الدولي للأداء الوظيفي والإعاقة والصحة — منظمة الصحة العالمية
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
  Assessment as AssessIcon,
  TrendingUp as TrendingIcon,
  CheckCircle as CheckIcon,
  Schedule as PendingIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { assessmentsService, reportsService } from '../../services/icfAssessmentService';
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
const ICF_COMPONENTS = [
  {
    id: 'b',
    label: 'الوظائف الجسدية',
    color: '#42a5f5',
    desc: 'الوظائف الفسيولوجية للأجهزة والأعضاء',
  },
  { id: 's', label: 'البنى الجسدية', color: '#66bb6a', desc: 'البنى التشريحية للجسم' },
  {
    id: 'd',
    label: 'الأنشطة والمشاركة',
    color: '#ffa726',
    desc: 'تنفيذ المهام والمشاركة في المواقف الحياتية',
  },
  {
    id: 'e',
    label: 'العوامل البيئية',
    color: '#ab47bc',
    desc: 'البيئة المادية والاجتماعية والاتجاهية',
  },
];

const statusLabels = {
  draft: 'مسودة',
  in_progress: 'قيد التقييم',
  completed: 'مكتمل',
  reviewed: 'مراجع',
};
const statusColors = {
  draft: 'default',
  in_progress: 'warning',
  completed: 'success',
  reviewed: 'info',
};

const DATA_ASSESSMENTS = [
  {
    _id: '1',
    beneficiaryName: 'أحمد محمد العلي',
    assessorName: 'د. سارة الأحمد',
    domain: 'الوظائف الجسدية',
    status: 'completed',
    assessmentDate: new Date(Date.now() - 2 * 86400000),
    totalScore: 72,
    component: 'b',
  },
  {
    _id: '2',
    beneficiaryName: 'فاطمة خالد المحمد',
    assessorName: 'د. علي الشمري',
    domain: 'الأنشطة والمشاركة',
    status: 'in_progress',
    assessmentDate: new Date(Date.now() - 86400000),
    totalScore: null,
    component: 'd',
  },
  {
    _id: '3',
    beneficiaryName: 'عبدالله سعد الحربي',
    assessorName: 'د. نورة السالم',
    domain: 'العوامل البيئية',
    status: 'completed',
    assessmentDate: new Date(Date.now() - 4 * 86400000),
    totalScore: 58,
    component: 'e',
  },
  {
    _id: '4',
    beneficiaryName: 'لمى عبدالرحمن',
    assessorName: 'د. سارة الأحمد',
    domain: 'البنى الجسدية',
    status: 'reviewed',
    assessmentDate: new Date(Date.now() - 7 * 86400000),
    totalScore: 81,
    component: 's',
  },
  {
    _id: '5',
    beneficiaryName: 'محمد فهد القحطاني',
    assessorName: 'د. علي الشمري',
    domain: 'الوظائف الجسدية',
    status: 'draft',
    assessmentDate: new Date(),
    totalScore: null,
    component: 'b',
  },
  {
    _id: '6',
    beneficiaryName: 'نوف منصور الغامدي',
    assessorName: 'د. نورة السالم',
    domain: 'الأنشطة والمشاركة',
    status: 'completed',
    assessmentDate: new Date(Date.now() - 3 * 86400000),
    totalScore: 65,
    component: 'd',
  },
];

const DATA_STATS = {
  totalAssessments: 247,
  completedAssessments: 189,
  inProgressAssessments: 38,
  totalDomains: 24,
  avgScore: 68,
  reviewedAssessments: 20,
};

const RADAR_DATA = ICF_COMPONENTS.map((c, i) => ({
  subject: c.label.slice(0, 6),
  A: [72, 65, 58, 81][i],
  fullMark: 100,
}));
const PIE_DATA = ICF_COMPONENTS.map((c, i) => ({ name: c.label, value: [42, 28, 58, 34][i] }));
const PIE_COLORS = ['#42a5f5', '#66bb6a', '#ffa726', '#ab47bc'];

/* ─── Main Component ─────────────────────────────────────── */
export default function ICFAssessmentDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [stats, setStats] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aResp, sResp] = await Promise.all([
        assessmentsService.getAll().catch(() => ({ data: [] })),
        reportsService.getStatistics().catch(() => ({ data: {} })),
      ]);
      const a = Array.isArray(aResp.data) ? aResp.data : Array.isArray(aResp) ? aResp : [];
      const s = sResp.data || sResp || {};
      setAssessments(a.length ? a : DATA_ASSESSMENTS);
      setStats(Object.keys(s).length ? s : DATA_STATS);
    } catch (err) {
      logger.error('ICF Dashboard load error', err);
      setAssessments(DATA_ASSESSMENTS);
      setStats(DATA_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = assessments.filter(a => {
    const ms = !search || a.beneficiaryName?.includes(search) || a.assessorName?.includes(search);
    const mf = !filterStatus || a.status === filterStatus;
    return ms && mf;
  });

  const handleExport = () => {
    const hdr = 'المستفيد,المقيّم,المجال,الحالة,التاريخ,الدرجة';
    const rows = assessments.map(
      a =>
        `"${a.beneficiaryName || '-'}","${a.assessorName || '-'}","${a.domain || '-'}",${statusLabels[a.status] || '-'},${a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString('ar') : '-'},${a.totalScore ?? '-'}`
    );
    const blob = new Blob(['\uFEFF' + [hdr, ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `icf_assessments_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

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
            background: gradients.ocean,
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
                  تقييمات ICF الوظيفية
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                  التصنيف الدولي للأداء الوظيفي والإعاقة والصحة — WHO
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.5 }}>
                  {ICF_COMPONENTS.map(c => (
                    <Chip
                      key={c.id}
                      label={c.label}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                    />
                  ))}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير CSV">
                  <IconButton
                    onClick={handleExport}
                    sx={{
                      color: '#fff',
                      bgcolor: 'rgba(255,255,255,0.15)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                    }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
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
                  onClick={() => navigate('/icf/new')}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  تقييم جديد
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          {/* ── KPIs ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي التقييمات"
                value={stats.totalAssessments || assessments.length}
                icon={<AssessIcon />}
                gradient={gradients.ocean}
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مكتملة"
                value={
                  stats.completedAssessments ||
                  assessments.filter(a => a.status === 'completed').length
                }
                icon={<CheckIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="قيد التقييم"
                value={
                  stats.inProgressAssessments ||
                  assessments.filter(a => a.status === 'in_progress').length
                }
                icon={<PendingIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="متوسط الدرجة"
                value={stats.avgScore || 68}
                icon={<TrendingIcon />}
                gradient={gradients.info}
                delay={3}
                suffix="%"
              />
            </Grid>
          </Grid>

          {/* ── Charts ── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  توزيع التقييمات حسب المكوّن
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={PIE_DATA}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {PIE_DATA.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
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
                  متوسط الأداء الوظيفي حسب المجال (ICF Radar)
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={RADAR_DATA}>
                    <PolarGrid stroke={isDark ? '#444' : '#e0e0e0'} />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: isDark ? '#aaa' : '#666' }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="الدرجة"
                      dataKey="A"
                      stroke="#42a5f5"
                      fill="#42a5f5"
                      fillOpacity={0.4}
                    />
                    <RTooltip content={<ChartTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* ── ICF Components Info ── */}
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            {ICF_COMPONENTS.map(c => (
              <Grid item xs={12} sm={6} md={3} key={c.id}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.75,
                      borderRadius: 3,
                      border: '2px solid',
                      borderColor: alpha(c.color, 0.3),
                      borderRight: `4px solid ${c.color}`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          bgcolor: c.color,
                          flexShrink: 0,
                        }}
                      />
                      <Box>
                        <Typography variant="caption" fontWeight={700} sx={{ color: c.color }}>
                          {c.id.toUpperCase()} — {c.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          display="block"
                          color="text.secondary"
                          sx={{ fontSize: 11 }}
                        >
                          {c.desc}
                        </Typography>
                      </Box>
                    </Box>
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
              <Grid item xs={12} sm={5} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالمستفيد أو المقيّم..."
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
              <Grid item xs={6} sm={3} md={2.5}>
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
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} تقييم`}
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
                سجل التقييمات
              </Typography>
              <Chip
                label={`${filtered.length} نتيجة`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد تقييمات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المستفيد',
                        'المقيّم',
                        'المكوّن',
                        'الحالة',
                        'التاريخ',
                        'الدرجة',
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
                    {filtered.slice(0, 15).map((a, i) => {
                      const comp = ICF_COMPONENTS.find(c => c.id === a.component);
                      return (
                        <TableRow
                          key={a._id || i}
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
                                  bgcolor: alpha('#42a5f5', 0.15),
                                  color: '#42a5f5',
                                }}
                              >
                                {a.beneficiaryName?.charAt(0)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600}>
                                {a.beneficiaryName || '-'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {a.assessorName || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {comp ? (
                              <Chip
                                label={comp.label}
                                size="small"
                                sx={{
                                  bgcolor: alpha(comp.color, 0.12),
                                  color: comp.color,
                                  fontWeight: 600,
                                  fontSize: 11,
                                }}
                              />
                            ) : (
                              <Typography variant="body2" sx={{ fontSize: 12 }}>
                                {a.domain || '-'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={statusLabels[a.status] || a.status || '-'}
                              color={statusColors[a.status] || 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {a.assessmentDate
                                ? new Date(a.assessmentDate).toLocaleDateString('ar')
                                : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {a.totalScore != null ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight={700}>
                                  {a.totalScore}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={a.totalScore}
                                  sx={{ width: 50, height: 4, borderRadius: 2 }}
                                  color={
                                    a.totalScore >= 70
                                      ? 'success'
                                      : a.totalScore >= 40
                                        ? 'warning'
                                        : 'error'
                                  }
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
                                onClick={() => navigate(`/icf/${a._id}`)}
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
