/**
 * IndependentLivingDashboard — لوحة الحياة المستقلة (Professional v2)
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
  Home as HomeIcon,
  School as TrainIcon,
  TrendingUp as ReadyIcon,
  CheckCircle as HousingIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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

const KPICard = ({ label, value, icon, gradient, delay, suffix }) => {
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
              {suffix || ''}
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

const SKILL_AREA = {
  daily_living: 'منزلية',
  financial: 'مالية',
  social: 'اجتماعية',
  vocational: 'مهنية',
};
const READINESS_STATUS = {
  beginner: 'مبتدئ',
  developing: 'نامٍ',
  proficient: 'متقدم',
  independent: 'مستقل',
};
const STATUS_COLORS = {
  beginner: 'default',
  developing: 'primary',
  proficient: 'warning',
  independent: 'success',
};
const COLORS = ['#00695c', '#1565c0', '#e65100', '#6a1b9a', '#c62828'];

const DEMO = {
  totalBeneficiaries: 45,
  activeTrainingPlans: 32,
  housingPlacements: 8,
  avgReadiness: 67,
  beneficiaries: [
    {
      _id: '1',
      name: 'أحمد سالم',
      primarySkill: 'daily_living',
      readinessLevel: 'proficient',
      progress: 78,
      counselor: 'م. نورا',
      housing: false,
    },
    {
      _id: '2',
      name: 'نورة العتيبي',
      primarySkill: 'social',
      readinessLevel: 'developing',
      progress: 55,
      counselor: 'م. سارة',
      housing: true,
    },
    {
      _id: '3',
      name: 'فهد الدوسري',
      primarySkill: 'vocational',
      readinessLevel: 'independent',
      progress: 92,
      counselor: 'م. خالد',
      housing: true,
    },
    {
      _id: '4',
      name: 'رانيا المطيري',
      primarySkill: 'financial',
      readinessLevel: 'beginner',
      progress: 30,
      counselor: 'م. نورا',
      housing: false,
    },
    {
      _id: '5',
      name: 'عمر القحطاني',
      primarySkill: 'daily_living',
      readinessLevel: 'developing',
      progress: 62,
      counselor: 'م. سارة',
      housing: false,
    },
  ],
  skillAreas: [
    { name: 'منزلية', value: 38, color: '#00695c' },
    { name: 'مالية', value: 28, color: '#1565c0' },
    { name: 'اجتماعية', value: 34, color: '#e65100' },
    { name: 'مهنية', value: 22, color: '#6a1b9a' },
  ],
  monthlyProgress: [
    { month: 'أكتوبر', score: 58 },
    { month: 'نوفمبر', score: 61 },
    { month: 'ديسمبر', score: 60 },
    { month: 'يناير', score: 63 },
    { month: 'فبراير', score: 65 },
    { month: 'مارس', score: 67 },
  ],
};

export default function IndependentLivingDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [filterSkill, setFilterSkill] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiClient
        .get('/api/independent-living/dashboard')
        .catch(() => ({ data: {} }));
      const d = r.data?.data || r.data || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setBeneficiaries(
        Array.isArray(d.beneficiaries) && d.beneficiaries.length
          ? d.beneficiaries
          : DEMO.beneficiaries
      );
    } catch (err) {
      logger.error('IndependentLiving Dashboard error', err);
      setDash(DEMO);
      setBeneficiaries(DEMO.beneficiaries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = beneficiaries.filter(b => {
    const ms = !search || b.name?.includes(search);
    const sk = !filterSkill || b.primarySkill === filterSkill;
    const lv = !filterLevel || b.readinessLevel === filterLevel;
    return ms && sk && lv;
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
            background: 'linear-gradient(135deg,#004d40,#00695c)',
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
                الحياة المستقلة
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                تدريب المهارات الحياتية ودعم الاستقلالية
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`مستفيدون: ${dash.totalBeneficiaries || 45}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`متوسط الجاهزية: ${dash.avgReadiness || 67}%`}
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
                onClick={() => navigate('/independent-living/plans/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                خطة جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المستفيدين"
                value={dash.totalBeneficiaries || 45}
                icon={<HomeIcon />}
                gradient="linear-gradient(135deg,#004d40,#00695c)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="خطط تدريب نشطة"
                value={dash.activeTrainingPlans || 32}
                icon={<TrainIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="توظيف سكني"
                value={dash.housingPlacements || 8}
                icon={<HousingIcon />}
                gradient={gradients.success}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="متوسط الجاهزية%"
                suffix="%"
                value={dash.avgReadiness || 67}
                icon={<ReadyIcon />}
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
                  توزيع مجالات المهارات
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.skillAreas || DEMO.skillAreas}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.skillAreas || DEMO.skillAreas).map((e, i) => (
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
                  تطور مستوى الجاهزية الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart
                    data={dash.monthlyProgress || DEMO.monthlyProgress}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      vertical={false}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} domain={[40, 100]} />
                    <RTooltip content={<ChartTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="متوسط الجاهزية"
                      stroke="#00695c"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#00695c' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
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
                  placeholder="بحث بالاسم..."
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
                  label="مجال المهارة"
                  value={filterSkill}
                  onChange={e => setFilterSkill(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(SKILL_AREA).map(([k, v]) => (
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
                  label="مستوى الجاهزية"
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(READINESS_STATUS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} مستفيد`}
                  sx={{ fontWeight: 700, bgcolor: '#00695c', color: '#fff' }}
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
                المستفيدون — الحياة المستقلة
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد بيانات مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المستفيد',
                        'مجال المهارة',
                        'مستوى الجاهزية',
                        'التقدم',
                        'المشرف',
                        'مسكن',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 15).map((b, i) => (
                      <TableRow
                        key={b._id || i}
                        hover
                        sx={{ '&:last-child td': { borderBottom: 0 } }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#004d40' }}
                            >
                              {(b.name || 'م').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {b.name || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={SKILL_AREA[b.primarySkill] || b.primarySkill || '-'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#00695c', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={READINESS_STATUS[b.readinessLevel] || b.readinessLevel || '-'}
                            color={STATUS_COLORS[b.readinessLevel] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 110 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={b.progress || 0}
                              sx={{
                                flex: 1,
                                height: 6,
                                borderRadius: 3,
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: (b.progress || 0) >= 80 ? '#2e7d32' : '#00695c',
                                },
                              }}
                            />
                            <Typography variant="caption" sx={{ fontSize: 10, minWidth: 28 }}>
                              {b.progress || 0}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {b.counselor || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={b.housing ? 'نعم' : 'لا'}
                            color={b.housing ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/independent-living/beneficiaries/${b._id}`)}
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
