/**
 * ProjectDashboard — لوحة إدارة المشاريع (Professional v2)
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
  AccountTree as ProjectIcon,
  CheckCircle as DoneIcon,
  Pause as HoldIcon,
  TrendingUp as ActiveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  CalendarToday as CalIcon,
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
import { getDashboard } from '../../services/projectManagement.service';
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

const statusLabels = {
  active: 'نشط',
  completed: 'مكتمل',
  on_hold: 'معلق',
  cancelled: 'ملغي',
  planning: 'تخطيط',
};
const statusColors = {
  active: 'success',
  completed: 'primary',
  on_hold: 'warning',
  cancelled: 'error',
  planning: 'info',
};
const priorityColors = { low: '#4caf50', medium: '#2196f3', high: '#ff9800', critical: '#f44336' };
const priorityLabels = { low: 'منخفضة', medium: 'متوسطة', high: 'عالية', critical: 'حرجة' };
const COLORS = ['#43a047', '#1565c0', '#ff9800', '#e53935', '#1976d2'];

const DEMO = {
  total: 42,
  active: 18,
  completed: 19,
  onHold: 5,
  projects: [
    {
      _id: '1',
      name: 'تطوير نظام التقييم الإلكتروني',
      status: 'active',
      priority: 'high',
      progress: 65,
      team: 6,
      deadline: new Date(Date.now() + 30 * 86400000),
    },
    {
      _id: '2',
      name: 'إنشاء وحدة العلاج بالواقع الافتراضي',
      status: 'active',
      priority: 'critical',
      progress: 40,
      team: 8,
      deadline: new Date(Date.now() + 60 * 86400000),
    },
    {
      _id: '3',
      name: 'برنامج التوعية المجتمعية',
      status: 'completed',
      priority: 'medium',
      progress: 100,
      team: 4,
      deadline: new Date(Date.now() - 5 * 86400000),
    },
    {
      _id: '4',
      name: 'تحديث منظومة السجلات الطبية',
      status: 'on_hold',
      priority: 'high',
      progress: 25,
      team: 5,
      deadline: new Date(Date.now() + 90 * 86400000),
    },
    {
      _id: '5',
      name: 'تطوير التطبيق المحمول',
      status: 'planning',
      priority: 'medium',
      progress: 10,
      team: 7,
      deadline: new Date(Date.now() + 120 * 86400000),
    },
  ],
  byStatus: [
    { name: 'نشط', value: 18, color: '#43a047' },
    { name: 'مكتمل', value: 19, color: '#1565c0' },
    { name: 'معلق', value: 5, color: '#ff9800' },
  ],
  byDept: [
    { name: 'التقنية', value: 14 },
    { name: 'الرعاية الصحية', value: 10 },
    { name: 'التدريب', value: 8 },
    { name: 'الإدارة', value: 6 },
    { name: 'التشغيل', value: 4 },
  ],
};

export default function ProjectDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [projects, setProjects] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDashboard().catch(() => ({ data: {} }));
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setProjects(Array.isArray(d.projects) && d.projects.length ? d.projects : DEMO.projects);
    } catch (err) {
      logger.error('Project Dashboard error', err);
      setDash(DEMO);
      setProjects(DEMO.projects);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = projects.filter(p => {
    const ms = !search || p.name?.includes(search);
    const ms2 = !filterStatus || p.status === filterStatus;
    const mp = !filterPriority || p.priority === filterPriority;
    return ms && ms2 && mp;
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
            background: 'linear-gradient(135deg,#4527a0,#311b92)',
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
                إدارة المشاريع
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                تتبع المشاريع، التقدم، والفرق
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`نشطة: ${dash.active || 18}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`مكتملة: ${dash.completed || 19}`}
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
                onClick={() => navigate('/projects/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                مشروع جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المشاريع"
                value={dash.total || 42}
                icon={<ProjectIcon />}
                gradient="linear-gradient(135deg,#4527a0,#311b92)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مشاريع نشطة"
                value={dash.active || 18}
                icon={<ActiveIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مكتملة"
                value={dash.completed || 19}
                icon={<DoneIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="معلقة"
                value={dash.onHold || 5}
                icon={<HoldIcon />}
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
                  توزيع حسب الحالة
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
                  المشاريع حسب القسم
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.byDept || DEMO.byDept}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={24}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="عدد المشاريع" fill="#4527a0" radius={[4, 4, 0, 0]} />
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
                  placeholder="بحث باسم المشروع..."
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
                  {Object.entries(statusLabels).map(([k, v]) => (
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
                  {Object.entries(priorityLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} مشروع`}
                  sx={{ fontWeight: 700, bgcolor: '#4527a0', color: '#fff' }}
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
                قائمة المشاريع
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد مشاريع مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المشروع',
                        'الحالة',
                        'الأولوية',
                        'التقدم',
                        'الفريق',
                        'الموعد النهائي',
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
                        <TableCell sx={{ maxWidth: 200 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {p.name || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={statusLabels[p.status] || p.status || '-'}
                            color={statusColors[p.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={priorityLabels[p.priority] || p.priority || '-'}
                            size="small"
                            sx={{
                              bgcolor: alpha(priorityColors[p.priority] || '#888', 0.15),
                              color: priorityColors[p.priority] || '#888',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={p.progress || 0}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                bgcolor: alpha('#4527a0', 0.15),
                                '& .MuiLinearProgress-bar': {
                                  bgcolor:
                                    p.progress === 100
                                      ? '#43a047'
                                      : p.progress >= 50
                                        ? '#4527a0'
                                        : '#ff9800',
                                },
                              }}
                            />
                            <Typography variant="caption" fontWeight={700}>
                              {p.progress || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${p.team || 0} أعضاء`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <CalIcon sx={{ fontSize: 13, color: 'action.active' }} />
                            <Typography variant="body2" sx={{ fontSize: 12 }}>
                              {p.deadline ? _fmtDate(p.deadline) : '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="عرض المشروع">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/projects/${p._id}`)}
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
