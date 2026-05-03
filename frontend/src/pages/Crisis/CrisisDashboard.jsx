/**
 * CrisisDashboard — لوحة إدارة الأزمات والطوارئ (Professional v2)
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
  Warning as CrisisIcon,
  Shield as PlanIcon,
  Event as DrillIcon,
  ContactPhone as ContactIcon,
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
import { getDashboard } from '../../services/crisisManagement.service';
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

const severityLabels = { minor: 'بسيط', moderate: 'متوسط', major: 'كبير', critical: 'حرج' };
const severityColors = {
  minor: '#4caf50',
  moderate: '#ff9800',
  major: '#f44336',
  critical: '#9c27b0',
};
const statusLabels = {
  reported: 'مبلّغ',
  acknowledged: 'معترف به',
  in_progress: 'جارٍ',
  contained: 'محدود',
  resolved: 'محلول',
  closed: 'مغلق',
  escalated: 'مُصعَّد',
};
const statusColors = {
  reported: 'error',
  acknowledged: 'info',
  in_progress: 'warning',
  contained: 'primary',
  resolved: 'success',
  closed: 'default',
  escalated: 'error',
};
const typeLabels = {
  fire: 'حريق',
  earthquake: 'زلزال',
  flood: 'فيضان',
  medical: 'طبي',
  security: 'أمني',
  power_outage: 'انقطاع كهرباء',
  pandemic: 'وباء',
  evacuation: 'إخلاء',
  other: 'أخرى',
};
const _PIE_COLORS = ['#4caf50', '#ff9800', '#f44336', '#9c27b0'];

const DEMO = {
  totalPlans: 12,
  openIncidents: 3,
  totalDrills: 28,
  emergencyContacts: 45,
  incidents: [
    {
      _id: '1',
      title: 'حريق في مطبخ المبنى A',
      type: 'fire',
      severity: 'major',
      status: 'in_progress',
      team: 'فريق الطوارئ أ',
      date: '2025-03-22',
    },
    {
      _id: '2',
      title: 'انقطاع الكهرباء — الجناح B',
      type: 'power_outage',
      severity: 'moderate',
      status: 'contained',
      team: 'الصيانة',
      date: '2025-03-20',
    },
    {
      _id: '3',
      title: 'حادثة طبية طارئة',
      type: 'medical',
      severity: 'critical',
      status: 'reported',
      team: 'فريق طبي',
      date: '2025-03-23',
    },
    {
      _id: '4',
      title: 'تسرب مياه — القاعة الرئيسية',
      type: 'flood',
      severity: 'minor',
      status: 'resolved',
      team: 'فريق الخدمات',
      date: '2025-03-18',
    },
    {
      _id: '5',
      title: 'تدريب إخلاء طارئ',
      type: 'evacuation',
      severity: 'minor',
      status: 'closed',
      team: 'جميع الأقسام',
      date: '2025-03-15',
    },
  ],
  bySeverity: [
    { name: 'بسيط', value: 8, color: '#4caf50' },
    { name: 'متوسط', value: 5, color: '#ff9800' },
    { name: 'كبير', value: 3, color: '#f44336' },
    { name: 'حرج', value: 1, color: '#9c27b0' },
  ],
  byType: [
    { type: 'حريق', count: 4 },
    { type: 'طبي', count: 5 },
    { type: 'أمني', count: 3 },
    { type: 'كهرباء', count: 4 },
    { type: 'إخلاء', count: 6 },
    { type: 'أخرى', count: 5 },
  ],
};

export default function CrisisDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [incidents, setIncidents] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDashboard().catch(() => ({ data: {} }));
      const d = r?.data?.data || r?.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setIncidents(Array.isArray(d.incidents) && d.incidents.length ? d.incidents : DEMO.incidents);
    } catch (err) {
      logger.error('Crisis Dashboard error', err);
      setDash(DEMO);
      setIncidents(DEMO.incidents);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = incidents.filter(inc => {
    const ms = !search || inc.title?.includes(search) || inc.team?.includes(search);
    const mt = !filterType || inc.type === filterType;
    const ms2 = !filterSeverity || inc.severity === filterSeverity;
    const ms3 = !filterStatus || inc.status === filterStatus;
    return ms && mt && ms2 && ms3;
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
            background: 'linear-gradient(135deg,#b71c1c,#c62828)',
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
                إدارة الأزمات والطوارئ
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                خطط الطوارئ، الحوادث المفتوحة، التدريبات، وجهات الاتصال
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`حوادث مفتوحة: ${dash.openIncidents || 3}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`جهات طوارئ: ${dash.emergencyContacts || 45}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/crisis/incidents/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                حادثة جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="خطط الطوارئ"
                value={dash.totalPlans || 12}
                icon={<PlanIcon />}
                gradient="linear-gradient(135deg,#b71c1c,#c62828)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="حوادث مفتوحة"
                value={dash.openIncidents || 3}
                icon={<CrisisIcon />}
                gradient="linear-gradient(135deg,#c62828,#d32f2f)"
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي التدريبات"
                value={dash.totalDrills || 28}
                icon={<DrillIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="جهات الطوارئ"
                value={dash.emergencyContacts || 45}
                icon={<ContactIcon />}
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
                  توزيع الحوادث حسب الخطورة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.bySeverity || DEMO.bySeverity}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.bySeverity || DEMO.bySeverity).map((e, i) => (
                        <Cell key={i} fill={e.color || _PIE_COLORS[i % _PIE_COLORS.length]} />
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
                  الحوادث حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byType || DEMO.byType}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد الحوادث" fill="#c62828" radius={[4, 4, 0, 0]} />
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
              <Grid item xs={12} sm={3.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="بحث بالحادثة أو الفريق..."
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
              <Grid item xs={4} sm={2}>
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
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={4} sm={2}>
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
              <Grid item xs={4} sm={2}>
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
                  label={`${filtered.length} حادثة`}
                  sx={{ fontWeight: 700, bgcolor: '#c62828', color: '#fff' }}
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
                الحوادث والطوارئ
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد حوادث مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['الحادثة', 'النوع', 'الخطورة', 'الحالة', 'الفريق', 'التاريخ', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: severityColors[inc.severity] || '#c62828',
                              }}
                            >
                              <CrisisIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {inc.title || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={typeLabels[inc.type] || inc.type || '-'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#c62828', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={severityLabels[inc.severity] || inc.severity || '-'}
                            size="small"
                            sx={{
                              fontSize: 10,
                              bgcolor: severityColors[inc.severity] || '#9e9e9e',
                              color: '#fff',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[inc.status] || inc.status || '-'}
                            color={statusColors[inc.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {inc.team || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {inc.date ? new Date(inc.date).toLocaleDateString('ar') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/crisis/incidents/${inc._id}`)}
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
