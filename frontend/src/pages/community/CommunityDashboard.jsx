/**
 * CommunityDashboard — لوحة الاندماج المجتمعي (Professional v2)
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
  Groups as GroupsIcon,
  Handshake as PartnerIcon,
  Campaign as CampaignIcon,
  Assessment as AssessIcon,
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

const ACTIVITY_TYPE = {
  sports: 'رياضية',
  cultural: 'ثقافية',
  educational: 'تعليمية',
  recreational: 'ترفيهية',
  awareness: 'توعوية',
  volunteer: 'تطوعية',
};
const ACTIVITY_STATUS = {
  planned: 'مخطط',
  ongoing: 'جارية',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};
const STATUS_COLORS = {
  planned: 'default',
  ongoing: 'primary',
  completed: 'success',
  cancelled: 'error',
};
const COLORS = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#c62828', '#00695c'];

const DEMO = {
  totalActivities: 84,
  activePartnerships: 12,
  participations: 256,
  awarenessPrograms: 15,
  activities: [
    {
      _id: '1',
      title: 'برنامج الدمج الرياضي',
      type: 'sports',
      status: 'ongoing',
      participants: 45,
      partner: 'نادي الهلال',
      date: '2025-03-20',
    },
    {
      _id: '2',
      title: 'زيارة المتحف الوطني',
      type: 'cultural',
      status: 'completed',
      participants: 28,
      partner: 'وزارة الثقافة',
      date: '2025-03-15',
    },
    {
      _id: '3',
      title: 'ورشة المهارات الحياتية',
      type: 'educational',
      status: 'planned',
      participants: 30,
      partner: 'مدارس الأمل',
      date: '2025-03-28',
    },
    {
      _id: '4',
      title: 'يوم الترفيه الأسبوعي',
      type: 'recreational',
      status: 'ongoing',
      participants: 60,
      partner: 'بلدية الرياض',
      date: '2025-03-21',
    },
    {
      _id: '5',
      title: 'حملة التوعية بالإعاقة',
      type: 'awareness',
      status: 'planned',
      participants: 0,
      partner: 'المنظمة الدولية',
      date: '2025-04-01',
    },
  ],
  activityTypes: [
    { name: 'رياضية', value: 28, color: '#1565c0' },
    { name: 'ثقافية', value: 22, color: '#2e7d32' },
    { name: 'تعليمية', value: 18, color: '#e65100' },
    { name: 'ترفيهية', value: 16, color: '#6a1b9a' },
  ],
  monthlyActivities: [
    { month: 'أكتوبر', activities: 12 },
    { month: 'نوفمبر', activities: 15 },
    { month: 'ديسمبر', activities: 10 },
    { month: 'يناير', activities: 18 },
    { month: 'فبراير', activities: 14 },
    { month: 'مارس', activities: 15 },
  ],
};

export default function CommunityDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [activities, setActivities] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient
        .get('/api/community-integration/dashboard')
        .catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setActivities(
        Array.isArray(d.activities) && d.activities.length ? d.activities : DEMO.activities
      );
    } catch (err) {
      logger.error('Community Dashboard error', err);
      setDash(DEMO);
      setActivities(DEMO.activities);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = activities.filter(a => {
    const ms = !search || a.title?.includes(search) || a.partner?.includes(search);
    const mt = !filterType || a.type === filterType;
    const ms2 = !filterStatus || a.status === filterStatus;
    return ms && mt && ms2;
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
            background: 'linear-gradient(135deg,#0d47a1,#1565c0)',
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
                الاندماج المجتمعي
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الأنشطة، الشراكات، وبرامج التوعية المجتمعية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`أنشطة: ${dash.totalActivities || 84}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`مشاركات: ${dash.participations || 256}`}
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
                onClick={() => navigate('/community/activities/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                نشاط جديد
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الأنشطة"
                value={dash.totalActivities || 84}
                icon={<AssessIcon />}
                gradient="linear-gradient(135deg,#0d47a1,#1565c0)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="شراكات نشطة"
                value={dash.activePartnerships || 12}
                icon={<PartnerIcon />}
                gradient={gradients.success}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المشاركات"
                value={dash.participations || 256}
                icon={<GroupsIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="برامج التوعية"
                value={dash.awarenessPrograms || 15}
                icon={<CampaignIcon />}
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
                  الأنشطة حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.activityTypes || DEMO.activityTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.activityTypes || DEMO.activityTypes).map((e, i) => (
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
                  الأنشطة الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.monthlyActivities || DEMO.monthlyActivities}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar
                      dataKey="activities"
                      name="عدد الأنشطة"
                      fill="#1565c0"
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
                  placeholder="بحث بالنشاط أو الشريك..."
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
                  label="النوع"
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(ACTIVITY_TYPE).map(([k, v]) => (
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
                  {Object.entries(ACTIVITY_STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} نشاط`}
                  sx={{ fontWeight: 700, bgcolor: '#1565c0', color: '#fff' }}
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
                الأنشطة المجتمعية
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد أنشطة مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {['النشاط', 'النوع', 'الحالة', 'المشاركون', 'الشريك', 'التاريخ', 'إجراء'].map(
                        h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                            {h}
                          </TableCell>
                        )
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((a, i) => (
                      <TableRow
                        key={a._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {a.title || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ACTIVITY_TYPE[a.type] || a.type || '-'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#1565c0', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={ACTIVITY_STATUS[a.status] || a.status || '-'}
                            color={STATUS_COLORS[a.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={a.participants || 0}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {a.partner || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {a.date ? _fmtDate(a.date) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/community/activities/${a._id}`)}
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
