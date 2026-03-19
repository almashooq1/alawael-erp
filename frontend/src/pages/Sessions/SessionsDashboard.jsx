import React, { useState, useEffect, useCallback } from 'react';
import computeStatusCounts from '../../utils/computeStatusCounts';
import {
  Container, Typography, Grid, Paper, Box,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Button,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  PersonOff as NoShowIcon,
  TrendingUp as TrendingUpIcon,
  Today as TodayIcon,
  AccessTime as AccessTimeIcon,
  Groups as GroupsIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import therapySessionsService from '../../services/therapySessions.service';
import ModuleKPICard from '../../components/dashboard/shared/ModuleKPICard';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';
import { useNavigate } from 'react-router-dom';
import { STATUS_MAP as CONST_STATUS_MAP, getSessionType } from './constants';

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  totalToday: 24,
  completedToday: 18,
  cancelledToday: 2,
  noShowToday: 1,
  scheduledToday: 3,
  totalWeek: 142,
  completionRate: 85,
  avgDuration: 45,
  totalTherapists: 12,
};

const DEMO_BY_TYPE = [
  { name: 'علاج طبيعي', value: 45, color: chartColors.category[0] },
  { name: 'علاج وظيفي', value: 32, color: chartColors.category[1] },
  { name: 'علاج نطق', value: 28, color: chartColors.category[2] },
  { name: 'علاج سلوكي', value: 18, color: chartColors.category[3] },
  { name: 'تعليم خاص', value: 15, color: chartColors.category[4] },
  { name: 'خدمات مساندة', value: 10, color: chartColors.category[9] },
];

const DEMO_WEEKLY_TREND = [
  { day: 'السبت', completed: 22, cancelled: 3, noShow: 1 },
  { day: 'الأحد', completed: 28, cancelled: 2, noShow: 2 },
  { day: 'الاثنين', completed: 25, cancelled: 4, noShow: 1 },
  { day: 'الثلاثاء', completed: 30, cancelled: 1, noShow: 0 },
  { day: 'الأربعاء', completed: 27, cancelled: 3, noShow: 2 },
  { day: 'الخميس', completed: 18, cancelled: 2, noShow: 1 },
];

const DEMO_HOURLY = [
  { hour: '8:00', sessions: 4 },
  { hour: '9:00', sessions: 8 },
  { hour: '10:00', sessions: 12 },
  { hour: '11:00', sessions: 10 },
  { hour: '12:00', sessions: 6 },
  { hour: '13:00', sessions: 3 },
  { hour: '14:00', sessions: 9 },
  { hour: '15:00', sessions: 11 },
  { hour: '16:00', sessions: 7 },
  { hour: '17:00', sessions: 4 },
];

const DEMO_THERAPIST_LOAD = [
  { name: 'أ. محمد العلي', sessions: 8, completion: 95 },
  { name: 'أ. فاطمة أحمد', sessions: 7, completion: 90 },
  { name: 'أ. سارة الخالد', sessions: 6, completion: 88 },
  { name: 'أ. عبدالله الحربي', sessions: 6, completion: 92 },
  { name: 'أ. نورة السعيد', sessions: 5, completion: 85 },
  { name: 'أ. خالد الراشد', sessions: 5, completion: 91 },
];

const DEMO_RECENT = [
  { id: 1, student: 'يوسف أحمد', therapist: 'أ. محمد العلي', type: 'علاج طبيعي', time: '09:00', status: 'completed' },
  { id: 2, student: 'ليلى خالد', therapist: 'أ. فاطمة أحمد', type: 'علاج نطق', time: '09:30', status: 'completed' },
  { id: 3, student: 'عمر سعيد', therapist: 'أ. سارة الخالد', type: 'علاج وظيفي', time: '10:00', status: 'in-progress' },
  { id: 4, student: 'ريم محمد', therapist: 'أ. عبدالله الحربي', type: 'علاج سلوكي', time: '10:30', status: 'scheduled' },
  { id: 5, student: 'سلمان ناصر', therapist: 'أ. نورة السعيد', type: 'علاج طبيعي', time: '11:00', status: 'cancelled' },
];

const STATUS_MAP = {
  ...CONST_STATUS_MAP,
  'in-progress': { label: 'جارية', color: 'info' },
  'no-show': { label: 'لم يحضر', color: 'default' },
};

/* ──────── Main Component ──────── */
export default function SessionsDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [byType, setByType] = useState(DEMO_BY_TYPE);
  const [weeklyTrend, _setWeeklyTrend] = useState(DEMO_WEEKLY_TREND);
  const [hourlyDist, _setHourlyDist] = useState(DEMO_HOURLY);
  const [therapistLoad, _setTherapistLoad] = useState(DEMO_THERAPIST_LOAD);
  const [recentSessions, setRecentSessions] = useState(DEMO_RECENT);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch stats + recent sessions in parallel
      const [statsRes, sessionsRes] = await Promise.allSettled([
        therapySessionsService.getStats(),
        therapySessionsService.getSessions({ page: 1, limit: 50 }),
      ]);

      // Process stats
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const s = statsRes.value;
        setStats(prev => ({
          ...prev,
          totalToday: s.todayTotal ?? s.total ?? prev.totalToday,
          completedToday: s.todayCompleted ?? s.completed ?? prev.completedToday,
          cancelledToday: s.todayCancelled ?? s.cancelled ?? prev.cancelledToday,
          noShowToday: s.todayNoShow ?? s.noShow ?? prev.noShowToday,
          scheduledToday: s.todayScheduled ?? s.scheduled ?? prev.scheduledToday,
          totalWeek: s.weekTotal ?? s.total ?? prev.totalWeek,
          completionRate: s.completionRate ?? prev.completionRate,
          avgDuration: s.avgDuration ?? prev.avgDuration,
          totalTherapists: s.totalTherapists ?? prev.totalTherapists,
        }));
      }

      // Process sessions list
      if (sessionsRes.status === 'fulfilled') {
        const sessions = sessionsRes.value?.sessions || sessionsRes.value?.data || [];
        if (Array.isArray(sessions) && sessions.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          const todaySessions = sessions.filter(s => (s.date || s.createdAt || '')?.slice(0, 10) === today);

          if (todaySessions.length > 0 && statsRes.status !== 'fulfilled') {
            const { COMPLETED: completed = 0, CANCELLED_BY_PATIENT: cpat = 0, CANCELLED_BY_CENTER: ccen = 0, NO_SHOW: noShow = 0, SCHEDULED: scheduled = 0 } = computeStatusCounts(
              todaySessions, 'status', ['COMPLETED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_CENTER', 'NO_SHOW', 'SCHEDULED']
            );
            setStats(prev => ({
              ...prev,
              totalToday: todaySessions.length,
              completedToday: completed,
              cancelledToday: cpat + ccen,
              noShowToday: noShow,
              scheduledToday: scheduled,
              totalWeek: sessions.length,
              completionRate: todaySessions.length > 0 ? Math.round((completed / todaySessions.length) * 100) : 0,
            }));
          }

          /* group by type */
          const typeMap = {};
          const typeColors = chartColors.category;
          sessions.forEach(s => {
            const t = getSessionType(s);
            typeMap[t] = (typeMap[t] || 0) + 1;
          });
          const typeArr = Object.entries(typeMap).map(([name, value], i) => ({
            name,
            value,
            color: typeColors[i % typeColors.length],
          }));
          if (typeArr.length > 0) setByType(typeArr);

          /* recent */
          const recent = sessions
            .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
            .slice(0, 5)
            .map((s, i) => ({
              id: s._id || i,
              student: s.studentName || s.beneficiary?.name || (s.participants?.[0]?.name) || 'طالب',
              therapist: s.therapistName || s.therapist?.name || s.createdBy?.name || 'معالج',
              type: getSessionType(s),
              time: s.startTime || s.time || '-',
              status: s.status || 'SCHEDULED',
            }));
          if (recent.length > 0) setRecentSessions(recent);
        }
      }
    } catch (err) {
      logger.warn('SessionsDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات لوحة التحكم — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* ──── Header ──── */}
      <Box
        sx={{
          background: gradients.info,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ScheduleIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              لوحة تحكم الجلسات
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              نظرة عامة على الجلسات العلاجية والمواعيد
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="inherit"
          sx={{ color: '#0288d1', fontWeight: 600 }}
          startIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/sessions')}
        >
          إدارة الجلسات
        </Button>
      </Box>

      {/* ──── KPI Cards ──── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <ModuleKPICard title="جلسات اليوم" value={stats.totalToday} subtitle="إجمالي مجدول" icon={<TodayIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <ModuleKPICard title="مكتملة اليوم" value={stats.completedToday} subtitle={`${stats.completionRate}% نسبة الإكمال`} icon={<CheckCircleIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <ModuleKPICard title="ملغاة" value={stats.cancelledToday} subtitle="هذا اليوم" icon={<CancelIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <ModuleKPICard title="لم يحضر" value={stats.noShowToday} subtitle="عدم الحضور" icon={<NoShowIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <ModuleKPICard title="إجمالي الأسبوع" value={stats.totalWeek} subtitle="جلسة" icon={<TrendingUpIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <ModuleKPICard title="متوسط المدة" value={`${stats.avgDuration} د`} subtitle={`${stats.totalTherapists} معالج`} icon={<AccessTimeIcon />} color="secondary" />
        </Grid>
      </Grid>

      {/* ──── Charts Row 1: Weekly Trend + By Type ──── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              اتجاه الجلسات الأسبوعي
            </Typography>
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لاتجاه الجلسات الأسبوعي">
                <BarChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="completed" fill={statusColors.success} name="مكتملة" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" fill={statusColors.error} name="ملغاة" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="noShow" fill={statusColors.warning} name="لم يحضر" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              الجلسات حسب النوع
            </Typography>
            {byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لتوزيع الجلسات حسب النوع">
                <PieChart>
                  <Pie
                    data={byType}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    innerRadius={50}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {byType.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ──── Charts Row 2: Hourly Distribution + Therapist Load ──── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              توزيع الجلسات حسب الساعة
            </Typography>
            {hourlyDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني لتوزيع الجلسات حسب الساعة">
                <LineChart data={hourlyDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <RTooltip />
                  <Line type="monotone" dataKey="sessions" stroke={statusColors.primaryBlue} strokeWidth={3} name="عدد الجلسات" dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              <GroupsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              عبء عمل المعالجين
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>الجلسات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>نسبة الإنجاز</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {therapistLoad.map((t, i) => (
                    <TableRow key={i}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell align="center">
                        <Chip label={t.sessions} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={t.completion}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            color={t.completion >= 90 ? 'success' : t.completion >= 80 ? 'warning' : 'error'}
                          />
                          <Typography variant="caption" fontWeight={600}>
                            {t.completion}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ──── Recent Sessions ──── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            آخر الجلسات
          </Typography>
          <Button size="small" onClick={() => navigate('/sessions')}>
            عرض الكل
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>الطالب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الوقت</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentSessions.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.student}</TableCell>
                  <TableCell>{s.therapist}</TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell>
                    <Chip label={s.time} size="small" variant="outlined" icon={<AccessTimeIcon />} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_MAP[s.status]?.label || s.status}
                      color={STATUS_MAP[s.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
    </DashboardErrorBoundary>
  );
}
