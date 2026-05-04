/**
 * OrgDashboard — لوحة الهيكل التنظيمي (Professional v2)
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
  AccountTree as OrgIcon,
  Business as DeptIcon,
  People as PeopleIcon,
  BadgeOutlined as BadgeIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

const PIE_COLORS = ['#01579b', '#0277bd', '#0288d1', '#039be5', '#029fcb', '#4fc3f7'];
const _deptTypeLabels = {
  clinical: 'سريري',
  administrative: 'إداري',
  support: 'دعم',
  technical: 'تقني',
  hr: 'موارد بشرية',
  finance: 'مالية',
};
const positionLevelLabels = {
  director: 'مدير',
  manager: 'رئيس قسم',
  specialist: 'أخصائي',
  coordinator: 'منسق',
  admin: 'موظف إداري',
  technician: 'فني',
};
const positionStatusLabels = { filled: 'مشغول', vacant: 'شاغر', suspended: 'موقوف' };
const positionStatusColors = { filled: 'success', vacant: 'warning', suspended: 'error' };

const DEMO = {
  totalDepts: 18,
  totalPositions: 284,
  vacantPositions: 23,
  totalEmployees: 261,
  byDeptType: [
    { name: 'سريري', value: 8, color: PIE_COLORS[0] },
    { name: 'إداري', value: 4, color: PIE_COLORS[1] },
    { name: 'دعم', value: 3, color: PIE_COLORS[2] },
    { name: 'تقني', value: 2, color: PIE_COLORS[3] },
    { name: 'مالية', value: 1, color: PIE_COLORS[4] },
  ],
  empByDept: [
    { dept: 'التأهيل', count: 52 },
    { dept: 'العلاج الطبيعي', count: 38 },
    { dept: 'الخدمات الاجتماعية', count: 34 },
    { dept: 'الإدارة', count: 28 },
    { dept: 'التعليم', count: 24 },
    { dept: 'الدعم', count: 21 },
  ],
  positions: [
    {
      _id: '1',
      title: 'رئيس قسم التأهيل',
      dept: 'التأهيل',
      level: 'manager',
      status: 'filled',
      headcount: 1,
    },
    {
      _id: '2',
      title: 'أخصائي علاج طبيعي',
      dept: 'العلاج الطبيعي',
      level: 'specialist',
      status: 'filled',
      headcount: 12,
    },
    {
      _id: '3',
      title: 'منسق خدمات اجتماعية',
      dept: 'الخدمات الاجتماعية',
      level: 'coordinator',
      status: 'vacant',
      headcount: 2,
    },
    {
      _id: '4',
      title: 'مدير الموارد البشرية',
      dept: 'الموارد البشرية',
      level: 'manager',
      status: 'filled',
      headcount: 1,
    },
    {
      _id: '5',
      title: 'فني تقنية المعلومات',
      dept: 'تقنية المعلومات',
      level: 'technician',
      status: 'vacant',
      headcount: 3,
    },
  ],
};

export default function OrgDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [dash, setDash] = useState(DEMO);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, posRes] = await Promise.all([
        apiClient.get('/api/organization/departments').catch(() => ({ data: [] })),
        apiClient.get('/api/organization/positions').catch(() => ({ data: [] })),
      ]);
      const depts = deptRes?.data?.data || deptRes?.data || [];
      const pos = posRes?.data?.data || posRes?.data || [];
      if (depts.length || pos.length) {
        setDash({
          ...DEMO,
          totalDepts: depts.length || DEMO.totalDepts,
          totalPositions: pos.length || DEMO.totalPositions,
          positions: pos.slice(0, 20) || DEMO.positions,
        });
      } else {
        setDash(DEMO);
      }
    } catch (err) {
      logger.warn('OrgDashboard:', err.message);
      setDash(DEMO);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = (dash.positions || []).filter(p => {
    const ms =
      !search || [p.title, p.dept].some(s => s?.toLowerCase().includes(search.toLowerCase()));
    const mc = !filterLevel || p.level === filterLevel;
    const ms2 = !filterStatus || p.status === filterStatus;
    return ms && mc && ms2;
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
            background: 'linear-gradient(135deg,#01579b,#0277bd)',
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
                الهيكل التنظيمي
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)', mt: 0.5 }}>
                الإدارات، المناصب، التوزيع الوظيفي، والشواغر
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Chip
                  label={`${dash.totalDepts} إدارة`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 11 }}
                />
                <Chip
                  label={`${dash.vacantPositions} وظيفة شاغرة`}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,200,0,0.3)', color: '#fff', fontSize: 11 }}
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
                onClick={() => navigate('/org-structure/new')}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                إضافة وظيفة
              </Button>
            </Stack>
          </Box>
        </Box>

        <Box sx={{ maxWidth: 'xl', mx: 'auto', px: 3, pt: 5, pb: 4 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الإدارات"
                value={dash.totalDepts}
                icon={<DeptIcon />}
                gradient="linear-gradient(135deg,#01579b,#0277bd)"
                delay={0}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الوظائف"
                value={dash.totalPositions}
                icon={<OrgIcon />}
                gradient={gradients.ocean}
                delay={1}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="الوظائف الشاغرة"
                value={dash.vacantPositions}
                icon={<BadgeIcon />}
                gradient={gradients.warning}
                delay={2}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <KPICard
                label="إجمالي الموظفين"
                value={dash.totalEmployees}
                icon={<PeopleIcon />}
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
                  الإدارات حسب النوع
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={dash.byDeptType || DEMO.byDeptType}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {(dash.byDeptType || DEMO.byDeptType).map((e, i) => (
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
                  توزيع الموظفين على الإدارات
                </Typography>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart
                    data={dash.empByDept || DEMO.empByDept}
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    barSize={28}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? '#444' : '#f0f0f0'}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="dept" tick={{ fontSize: 10 }} width={90} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="عدد الموظفين" fill="#0277bd" radius={[0, 4, 4, 0]} />
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
                  placeholder="بحث بالوظيفة أو الإدارة..."
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
                  label="المستوى"
                  value={filterLevel}
                  onChange={e => setFilterLevel(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {Object.entries(positionLevelLabels).map(([k, v]) => (
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
                  {Object.entries(positionStatusLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item>
                <Chip
                  label={`${filtered.length} وظيفة`}
                  sx={{ fontWeight: 700, bgcolor: '#01579b', color: '#fff' }}
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
                الوظائف والمناصب
              </Typography>
            </Box>
            {filtered.length === 0 ? (
              <EmptyState title="لا توجد وظائف مطابقة" height={150} />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: isDark ? 'background.paper' : '#fafafa' }}>
                      {[
                        'المسمى الوظيفي',
                        'الإدارة',
                        'المستوى',
                        'العدد المعتمد',
                        'الحالة',
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#0277bd' }}>
                              <BadgeIcon sx={{ fontSize: 14 }} />
                            </Avatar>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 12 }}>
                              {p.title || '—'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.dept || '—'}
                            size="small"
                            sx={{ fontSize: 10, bgcolor: '#01579b', color: '#fff' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {positionLevelLabels[p.level] || p.level || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12 }}>
                            {p.headcount ?? 1}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={positionStatusLabels[p.status] || p.status || '—'}
                            color={positionStatusColors[p.status] || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="تفاصيل">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/org-structure/${p._id}`)}
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
