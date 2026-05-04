/**
 * RecruitmentDashboard — لوحة التوظيف (Professional v2)
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
  Work as JobIcon,
  PersonAdd as ApplicantIcon,
  EventAvailable as InterviewIcon,
  HowToReg as HiredIcon,
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
import { getDashboard } from '../../services/recruitment.service';
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

const STAGE_LABELS = {
  new: 'جديد',
  screening: 'فرز',
  shortlisted: 'قائمة قصيرة',
  interview: 'مقابلة',
  assessment: 'تقييم',
  offer: 'عرض وظيفي',
  hired: 'مُعيَّن',
  rejected: 'مرفوض',
  withdrawn: 'منسحب',
};
const STAGE_COLORS = {
  new: 'info',
  screening: 'primary',
  shortlisted: 'warning',
  interview: 'secondary',
  assessment: 'info',
  offer: 'success',
  hired: 'success',
  rejected: 'error',
  withdrawn: 'default',
};
const SOURCE_LABELS = {
  website: 'الموقع الإلكتروني',
  linkedin: 'لينكدإن',
  referral: 'توصية',
  job_board: 'بوابة توظيف',
  social_media: 'وسائل التواصل',
  other: 'أخرى',
};
const PIE_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

const DEMO = {
  totalJobs: 38,
  openJobs: 15,
  totalApplicants: 247,
  scheduledInterviews: 12,
  applicants: [
    {
      _id: '1',
      name: 'أحمد عبدالله القحطاني',
      jobTitle: 'أخصائي تأهيل جسدي',
      stage: 'interview',
      source: 'linkedin',
      date: '2025-03-12',
    },
    {
      _id: '2',
      name: 'نورة محمد العتيبي',
      jobTitle: 'معالج وظيفي',
      stage: 'offer',
      source: 'website',
      date: '2025-03-14',
    },
    {
      _id: '3',
      name: 'فهد سعد الدوسري',
      jobTitle: 'أخصائي اجتماعي',
      stage: 'hired',
      source: 'referral',
      date: '2025-03-02',
    },
    {
      _id: '4',
      name: 'رانيا خالد المطيري',
      jobTitle: 'معالج نطق ولغة',
      stage: 'shortlisted',
      source: 'job_board',
      date: '2025-03-18',
    },
    {
      _id: '5',
      name: 'عمر عبدالرحمن السالم',
      jobTitle: 'مساعد تدريسي',
      stage: 'screening',
      source: 'social_media',
      date: '2025-03-20',
    },
  ],
  byStage: [
    { name: 'مقابلة', value: 12, color: '#9c27b0' },
    { name: 'فرز', value: 28, color: '#1976d2' },
    { name: 'قائمة قصيرة', value: 18, color: '#ff9800' },
    { name: 'عرض', value: 5, color: '#4caf50' },
    { name: 'مُعيَّن', value: 8, color: '#2e7d32' },
  ],
  bySource: [
    { name: 'لينكدإن', value: 72 },
    { name: 'الموقع', value: 65 },
    { name: 'توصية', value: 48 },
    { name: 'بوابة', value: 42 },
    { name: 'تواصل', value: 20 },
  ],
};

export default function RecruitmentDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState({});
  const [applicants, setApplicants] = useState([]);
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getDashboard().catch(() => ({ data: {} }));
      const d = r?.data || r || {};
      setDash(Object.keys(d).length ? d : DEMO);
      setApplicants(
        Array.isArray(d.applicants) && d.applicants.length ? d.applicants : DEMO.applicants
      );
    } catch (err) {
      logger.error('Recruitment Dashboard error', err);
      setDash(DEMO);
      setApplicants(DEMO.applicants);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = applicants.filter(a => {
    const ms = !search || a.name?.includes(search) || a.jobTitle?.includes(search);
    const ms2 = !filterStage || a.stage === filterStage;
    const ms3 = !filterSource || a.source === filterSource;
    return ms && ms2 && ms3;
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
                لوحة التوظيف
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الوظائف، المتقدمون، والمقابلات
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`وظائف مفتوحة: ${dash.openJobs || 15}`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`مقابلات مجدولة: ${dash.scheduledInterviews || 12}`}
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
                onClick={() => navigate('/recruitment/jobs/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                وظيفة جديدة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الوظائف"
                value={dash.totalJobs || 38}
                icon={<JobIcon />}
                gradient="linear-gradient(135deg,#0d47a1,#1565c0)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="وظائف مفتوحة"
                value={dash.openJobs || 15}
                icon={<ApplicantIcon />}
                gradient={gradients.warning}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي المتقدمين"
                value={dash.totalApplicants || 247}
                icon={<HiredIcon />}
                gradient={gradients.ocean}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="مقابلات مجدولة"
                value={dash.scheduledInterviews || 12}
                icon={<InterviewIcon />}
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
                  المتقدمون حسب المرحلة
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byStage || DEMO.byStage}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byStage || DEMO.byStage).map((e, i) => (
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
                  المصادر الأكثر تقديماً
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.bySource || DEMO.bySource}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 55, bottom: 5 }}
                    barSize={20}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="عدد المتقدمين" fill="#0d47a1" radius={[0, 4, 4, 0]}>
                      {(dash.bySource || DEMO.bySource).map((_e, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
                  placeholder="بحث بالاسم أو الوظيفة..."
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
                  label="المرحلة"
                  value={filterStage}
                  onChange={e => setFilterStage(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(STAGE_LABELS).map(([k, v]) => (
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
                  label="المصدر"
                  value={filterSource}
                  onChange={e => setFilterSource(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} متقدم`}
                  sx={{ fontWeight: 700, bgcolor: '#0d47a1', color: '#fff' }}
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
                قائمة المتقدمين
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا يوجد متقدمون مطابقون" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المتقدم',
                        'المسمى الوظيفي',
                        'المرحلة',
                        'المصدر',
                        'تاريخ التقديم',
                        'إجراء',
                      ].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>
                          {h}
                        </TableCell>
                      ))}
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#0d47a1' }}
                            >
                              {(a.name || 'م').charAt(0)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600}>
                              {a.name || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {a.jobTitle || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STAGE_LABELS[a.stage] || a.stage || '-'}
                            color={STAGE_COLORS[a.stage] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={SOURCE_LABELS[a.source] || a.source || '-'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {a.date ? new Date(a.date).toLocaleDateString('ar') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="ملف المتقدم">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/recruitment/applicants/${a._id}`)}
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
