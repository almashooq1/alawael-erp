/**
 * Attendance Management Page — نظام الحضور والانصراف الذكي
 * ============================================================
 * Tabs: Dashboard | Check-in/out | Leaves | Reports
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Fade,
  Grow,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  Avatar,
  LinearProgress,
  Tooltip,
  Badge,
  Divider,
  Stack,
  InputAdornment,
} from '@mui/material';
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
  Area,
  AreaChart,
} from 'recharts';
import {
  AccessTime,
  CheckCircle,
  Cancel,
  People,
  TrendingUp,
  TrendingDown,
  Fingerprint,
  WorkHistory,
  BeachAccess,
  BarChart as BarIcon,
  Refresh,
  Download,
  Add,
  Search,
  LocationOn,
  EventAvailable,
  Pending,
  ThumbUp,
  ThumbDown,
  Warning,
  Timer,
  HourglassEmpty,
  Assignment,
  PersonSearch,
  NotificationsActive,
  Close,
  History,
  WorkOutline,
  AccountBalance,
  CalendarViewMonth,
  Speed,
  ErrorOutline,
  WatchLater,
  ManageAccounts,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import apiClient from '../../services/api.client';
import {
  getEmployeePatterns,
  getLeaveBalance,
  submitOvertimeRequest,
  getOvertimeRequests,
} from '../../services/hr/attendanceManagementService';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/attendance-mgmt';
const POLL_INTERVAL = 60_000; // 60 seconds

const STATUS_MAP = {
  present: {
    label: 'حاضر',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.1)',
    icon: <CheckCircle sx={{ fontSize: 14 }} />,
  },
  absent: {
    label: 'غائب',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.1)',
    icon: <Cancel sx={{ fontSize: 14 }} />,
  },
  late: {
    label: 'متأخر',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    icon: <AccessTime sx={{ fontSize: 14 }} />,
  },
  half_day: {
    label: 'نصف يوم',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    icon: <HourglassEmpty sx={{ fontSize: 14 }} />,
  },
  leave: {
    label: 'إجازة',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    icon: <BeachAccess sx={{ fontSize: 14 }} />,
  },
  remote: {
    label: 'عن بُعد',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.1)',
    icon: <WorkHistory sx={{ fontSize: 14 }} />,
  },
  holiday: {
    label: 'عطلة',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.1)',
    icon: <EventAvailable sx={{ fontSize: 14 }} />,
  },
};

const LEAVE_TYPES = [
  { value: 'annual', label: 'إجازة سنوية' },
  { value: 'sick', label: 'إجازة مرضية' },
  { value: 'emergency', label: 'إجازة طارئة' },
  { value: 'maternity', label: 'إجازة أمومة' },
  { value: 'paternity', label: 'إجازة أبوة' },
  { value: 'hajj', label: 'إجازة الحج' },
  { value: 'unpaid', label: 'إجازة بدون راتب' },
];

const DEPT_MAP = {
  administration: 'الإدارة',
  clinical: 'السريري',
  support: 'الدعم',
  finance: 'المالية',
  hr: 'الموارد البشرية',
  transport: 'المواصلات',
  it: 'تقنية المعلومات',
};

const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#06b6d4'];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const Glass = ({ children, sx = {}, ...props }) => (
  <Box
    sx={{
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.4)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      transition: 'all 0.3s ease',
      '&:hover': { boxShadow: '0 12px 40px rgba(0,0,0,0.1)' },
      ...sx,
    }}
    {...props}
  >
    {children}
  </Box>
);

const StatusChip = ({ status }) => {
  const s = STATUS_MAP[status] || {
    label: status,
    color: '#64748b',
    bg: 'rgba(100,116,139,0.1)',
    icon: null,
  };
  return (
    <Chip
      icon={s.icon}
      label={s.label}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        fontWeight: 700,
        fontSize: '11px',
        border: `1px solid ${s.color}30`,
        '& .MuiChip-icon': { color: s.color },
      }}
    />
  );
};

const KpiCard = ({ label, value, icon, gradient, trend, trendUp, subtitle }) => (
  <Grow in timeout={600}>
    <Card
      component={motion.div}
      whileHover={{ y: -4, boxShadow: '0 20px 50px rgba(0,0,0,0.12)' }}
      sx={{
        borderRadius: '20px',
        border: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ height: 4, background: gradient }} />
      <CardContent sx={{ p: '20px 24px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}
            >
              {label}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, mb: 0.5, lineHeight: 1.1 }}>
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                {trendUp ? (
                  <TrendingUp sx={{ fontSize: 14, color: '#10b981' }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 14, color: '#ef4444' }} />
                )}
                <Typography
                  variant="caption"
                  sx={{ color: trendUp ? '#10b981' : '#ef4444', fontWeight: 600 }}
                >
                  {trend}
                </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: '16px',
              background: gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 6px 20px rgba(0,0,0,0.15)`,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  </Grow>
);

// ─────────────────────────────────────────────────────────────────────────────
// API HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch(url, opts = {}) {
  try {
    const res = await apiClient({ url: `${API_BASE}${url}`, ...opts });
    return res.data;
  } catch (err) {
    throw err?.response?.data || err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN ANALYSIS DIALOG
// ─────────────────────────────────────────────────────────────────────────────

const RISK_MAP = {
  high: { label: 'مخاطر عالية', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  medium: { label: 'مخاطر متوسطة', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low: { label: 'طبيعي', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

const SEVERITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

function PatternAnalysisDialog({ open, onClose, employeeId, employeeName }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [months, setMonths] = useState(3);

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setData(null);
    try {
      const res = await getEmployeePatterns(employeeId, months);
      setData(res?.data || res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId, months]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const risk = data?.riskLevel ? RISK_MAP[data.riskLevel] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          background: 'rgba(255,255,255,0.98)',
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonSearch sx={{ color: '#6366f1' }} />
          <Typography fontWeight={800}>تحليل سلوك الحضور — {employeeName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Select
            size="small"
            value={months}
            onChange={e => setMonths(e.target.value)}
            sx={{ minWidth: 120, fontSize: 13 }}
          >
            {[1, 2, 3, 6].map(m => (
              <MenuItem key={m} value={m}>
                {m} أشهر
              </MenuItem>
            ))}
          </Select>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#6366f1' }} />
          </Box>
        ) : !data ? (
          <Alert severity="warning">لا توجد بيانات كافية للتحليل أو تعذّر الاتصال بالخادم.</Alert>
        ) : (
          <Box>
            {/* Summary bar */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
              {[
                { label: 'إجمالي السجلات', value: data.total, color: '#6366f1' },
                { label: 'مرات التأخر', value: data.lateCount, color: '#f59e0b' },
                { label: 'أيام الغياب', value: data.absentCount, color: '#ef4444' },
                { label: 'متوسط ساعات العمل', value: `${data.avgWorkHours}h`, color: '#10b981' },
                { label: 'نسبة التأخر', value: `${data.lateRate}%`, color: '#f59e0b' },
                { label: 'نسبة الغياب', value: `${data.absenceRate}%`, color: '#ef4444' },
              ].map(s => (
                <Box
                  key={s.label}
                  sx={{
                    flex: '1 1 120px',
                    p: 1.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(0,0,0,0.03)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Risk level */}
            {risk && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 2,
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: risk.bg,
                  border: `1px solid ${risk.color}33`,
                }}
              >
                <Warning sx={{ color: risk.color, fontSize: 20 }} />
                <Typography fontWeight={700} sx={{ color: risk.color }}>
                  مستوى المخاطر: {risk.label}
                </Typography>
              </Box>
            )}

            {/* Detected patterns */}
            {data.patterns?.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                  الأنماط المكتشفة
                </Typography>
                <Stack spacing={1}>
                  {data.patterns.map((p, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: `${SEVERITY_COLOR[p.severity]}11`,
                        border: `1px solid ${SEVERITY_COLOR[p.severity]}33`,
                      }}
                    >
                      <NotificationsActive
                        sx={{ color: SEVERITY_COLOR[p.severity], fontSize: 18 }}
                      />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {p.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {p.detail}
                        </Typography>
                      </Box>
                      <Chip
                        label={p.severity === 'high' ? 'عالي' : 'متوسط'}
                        size="small"
                        sx={{
                          ml: 'auto',
                          bgcolor: `${SEVERITY_COLOR[p.severity]}22`,
                          color: SEVERITY_COLOR[p.severity],
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
            {data.patterns?.length === 0 && (
              <Alert severity="success" sx={{ mb: 2 }}>
                لم يُرصد أي نمط سلبي — الأداء في الحضور طبيعي.
              </Alert>
            )}

            {/* Day-of-week pattern chart */}
            {data.dayPattern?.length > 0 && (
              <Box>
                <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                  توزيع التأخر والغياب حسب يوم الأسبوع
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.dayPattern} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <RTooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: 'none',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="late" name="تأخر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="absent" name="غياب" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={load} startIcon={<Refresh />} variant="outlined" sx={{ borderRadius: 3 }}>
          إعادة التحليل
        </Button>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            borderRadius: 3,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            boxShadow: 'none',
          }}
        >
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab() {
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [patternEmployee, setPatternEmployee] = useState(null); // { id, name }
  const pollerRef = useRef(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    try {
      const [statsRes, todayRes] = await Promise.all([
        apiFetch('/dashboard'),
        apiFetch('/today?limit=20'),
      ]);
      setStats(statsRes.data || statsRes);
      setToday(todayRes);
    } catch {
      // Graceful degradation: use mock data
      setStats(MOCK_STATS);
      setToday(MOCK_TODAY);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    pollerRef.current = setInterval(() => fetchData(true), POLL_INTERVAL);
    return () => clearInterval(pollerRef.current);
  }, [fetchData]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return null;

  const attendanceRate = stats.attendanceRate || 0;
  const filteredRecords =
    today?.records?.filter(r => !filterStatus || r.status === filterStatus) || [];

  const kpis = [
    {
      label: 'إجمالي الموظفين',
      value: stats.totalEmployees,
      icon: <People sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    },
    {
      label: 'حاضرون اليوم',
      value: stats.presentToday,
      icon: <CheckCircle sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
      trendUp: true,
      trend: `${attendanceRate}% معدل الحضور`,
    },
    {
      label: 'غائبون اليوم',
      value: stats.absentToday,
      icon: <Cancel sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#f5576c,#f093fb)',
    },
    {
      label: 'متأخرون اليوم',
      value: stats.lateToday,
      icon: <AccessTime sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#f6d365,#fda085)',
    },
    {
      label: 'في إجازة',
      value: stats.onLeave,
      icon: <BeachAccess sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
    },
    {
      label: 'ساعات العمل اليوم',
      value: stats.totalWorkingHours,
      icon: <Timer sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#84fab0,#8fd3f4)',
      subtitle: `${stats.totalOvertimeHours} ساعة إضافية`,
    },
    {
      label: 'طلبات إجازة معلّقة',
      value: stats.pendingLeaves,
      icon: <Pending sx={{ fontSize: 26, color: '#fff' }} />,
      gradient: 'linear-gradient(135deg,#fddb92,#d1fdff)',
    },
    {
      label: 'نسبة الحضور',
      value: `${attendanceRate}%`,
      icon: <BarIcon sx={{ fontSize: 26, color: '#fff' }} />,
      gradient:
        attendanceRate >= 85
          ? 'linear-gradient(135deg,#10b981,#059669)'
          : 'linear-gradient(135deg,#f59e0b,#d97706)',
      trendUp: attendanceRate >= 85,
    },
  ];

  return (
    <Box>
      {/* Header bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(135deg,#10b981,#059669)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            لوحة الحضور في الوقت الفعلي
          </Typography>
          <Typography variant="caption" color="text.secondary">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </Typography>
        </Box>
        <Tooltip title="تحديث البيانات">
          <IconButton onClick={() => fetchData()} disabled={refreshing}>
            <Refresh
              sx={{ transition: '0.5s', transform: refreshing ? 'rotate(360deg)' : 'none' }}
            />
          </IconButton>
        </Tooltip>
      </Box>

      {/* KPI Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {kpis.map(k => (
          <Grid item xs={12} sm={6} md={3} key={k.label}>
            <KpiCard {...k} />
          </Grid>
        ))}
      </Grid>

      {/* Attendance Rate Bar */}
      <Glass sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography fontWeight={700}>معدل الحضور اليوم</Typography>
          <Typography
            fontWeight={800}
            sx={{ color: attendanceRate >= 85 ? '#10b981' : '#f59e0b', fontSize: '1.2rem' }}
          >
            {attendanceRate}%
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={attendanceRate}
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: 'rgba(0,0,0,0.05)',
            '& .MuiLinearProgress-bar': {
              background:
                attendanceRate >= 85
                  ? 'linear-gradient(90deg,#10b981,#059669)'
                  : 'linear-gradient(90deg,#f59e0b,#d97706)',
              borderRadius: 6,
            },
          }}
        />
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
          {(stats.byStatus || []).map(s => (
            <Box key={s.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: STATUS_MAP[s.key]?.color || '#64748b',
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {s.status}: <strong>{s.count}</strong>
              </Typography>
            </Box>
          ))}
        </Box>
      </Glass>

      {/* Absent / Late Alert Panel */}
      {(() => {
        const absentList = today?.records?.filter(r => r.status === 'absent') || [];
        const lateList = today?.records?.filter(r => r.status === 'late') || [];
        if (absentList.length === 0 && lateList.length === 0) return null;
        return (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {absentList.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(239,68,68,0.06)',
                    border: '1.5px solid rgba(239,68,68,0.18)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <ErrorOutline sx={{ color: '#ef4444', fontSize: 20 }} />
                    <Typography fontWeight={800} sx={{ color: '#dc2626' }}>
                      غائبون اليوم ({absentList.length})
                    </Typography>
                  </Box>
                  <Stack spacing={0.75}>
                    {absentList.slice(0, 5).map(r => (
                      <Box
                        key={r._id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          px: 1.5,
                          py: 0.75,
                          bgcolor: 'rgba(239,68,68,0.04)',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="caption" fontWeight={700}>
                          {r.employeeId?.name_ar || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {DEPT_MAP[r.employeeId?.department] || r.employeeId?.department || '—'}
                        </Typography>
                      </Box>
                    ))}
                    {absentList.length > 5 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: 'center' }}
                      >
                        و {absentList.length - 5} آخرين...
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
            )}
            {lateList.length > 0 && (
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: 'rgba(245,158,11,0.06)',
                    border: '1.5px solid rgba(245,158,11,0.18)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <WatchLater sx={{ color: '#f59e0b', fontSize: 20 }} />
                    <Typography fontWeight={800} sx={{ color: '#d97706' }}>
                      متأخرون اليوم ({lateList.length})
                    </Typography>
                  </Box>
                  <Stack spacing={0.75}>
                    {lateList.slice(0, 5).map(r => (
                      <Box
                        key={r._id}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          px: 1.5,
                          py: 0.75,
                          bgcolor: 'rgba(245,158,11,0.04)',
                          borderRadius: 2,
                        }}
                      >
                        <Typography variant="caption" fontWeight={700}>
                          {r.employeeId?.name_ar || '—'}
                        </Typography>
                        <Typography variant="caption" color="warning.main" fontWeight={600}>
                          {r.checkInFormatted || '—'}
                        </Typography>
                      </Box>
                    ))}
                    {lateList.length > 5 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: 'center' }}
                      >
                        و {lateList.length - 5} آخرين...
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Grid>
            )}
          </Grid>
        );
      })()}

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Weekly Trend */}
        <Grid item xs={12} md={8}>
          <Glass sx={{ p: 3 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              الاتجاه الأسبوعي
            </Typography>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.weeklyTrend || []} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <RTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend />
                <Bar dataKey="present" name="حاضر" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="متأخر" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent" name="غائب" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Glass>
        </Grid>

        {/* Status Pie */}
        <Grid item xs={12} md={4}>
          <Glass sx={{ p: 3, height: '100%' }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              توزيع الحالات
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stats.byStatus || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={3}
                >
                  {(stats.byStatus || []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                  }}
                />
                <Legend iconType="circle" iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </Glass>
        </Grid>
      </Grid>

      {/* Department Breakdown */}
      {stats.deptBreakdown?.length > 0 && (
        <Glass sx={{ p: 3, mb: 3 }}>
          <Typography fontWeight={700} sx={{ mb: 2 }}>
            الحضور حسب القسم
          </Typography>
          <Grid container spacing={2}>
            {stats.deptBreakdown.slice(0, 6).map(d => {
              const presentCount = d.statuses?.find(s => s.status === 'present')?.count || 0;
              const rate = d.total ? Math.round((presentCount / d.total) * 100) : 0;
              return (
                <Grid item xs={12} sm={6} md={4} key={d.department}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'rgba(0,0,0,0.02)',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" fontWeight={700}>
                        {DEPT_MAP[d.department] || d.department}
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ color: rate >= 85 ? '#10b981' : '#f59e0b' }}
                      >
                        {rate}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={rate}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          background:
                            rate >= 85
                              ? 'linear-gradient(90deg,#10b981,#059669)'
                              : 'linear-gradient(90deg,#f59e0b,#d97706)',
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      {d.total} سجل
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Glass>
      )}

      {/* Today's List */}
      <Glass sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography fontWeight={700}>سجلات الحضور اليوم</Typography>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>فلترة بالحالة</InputLabel>
            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              label="فلترة بالحالة"
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    fontWeight: 700,
                    fontSize: '12px',
                    color: 'text.secondary',
                    bgcolor: 'rgba(0,0,0,0.02)',
                  },
                }}
              >
                <TableCell>الموظف</TableCell>
                <TableCell>القسم</TableCell>
                <TableCell>الدوام</TableCell>
                <TableCell>الحضور</TableCell>
                <TableCell>الانصراف</TableCell>
                <TableCell>ساعات العمل</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>المصدر</TableCell>
                <TableCell>تحليل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" py={3}>
                      لا توجد سجلات
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map(r => (
                  <TableRow
                    key={r._id}
                    sx={{ '&:hover': { bgcolor: 'rgba(16,185,129,0.04)' }, transition: '0.2s' }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: '#10b981',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {(r.employeeId?.name_ar || '؟')[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="caption" fontWeight={600} display="block">
                            {r.employeeId?.name_ar || 'غير معروف'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.employeeId?.employee_number}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {DEPT_MAP[r.employeeId?.department] || r.department || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {r.shiftId ? `${r.shiftId.startTime} - ${r.shiftId.endTime}` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        sx={{ color: r.checkInFormatted !== '—' ? '#10b981' : '#ef4444' }}
                      >
                        {r.checkInFormatted}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{r.checkOutFormatted}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontWeight={600}>
                        {r.workingHoursFormatted}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={r.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.source || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="تحليل سلوك الحضور">
                        <IconButton
                          size="small"
                          onClick={() =>
                            setPatternEmployee({
                              id: r.employeeId?._id,
                              name: r.employeeId?.name_ar || 'موظف',
                            })
                          }
                          sx={{ color: '#6366f1' }}
                        >
                          <PersonSearch sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Glass>

      {/* Pattern Analysis Dialog */}
      <PatternAnalysisDialog
        open={!!patternEmployee}
        onClose={() => setPatternEmployee(null)}
        employeeId={patternEmployee?.id}
        employeeName={patternEmployee?.name}
      />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: CHECK-IN / CHECK-OUT
// ─────────────────────────────────────────────────────────────────────────────

function CheckInOutTab({ _currentUser }) {
  const [status, setStatus] = useState(null); // 'checked_in' | 'checked_out' | null
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [manualDialog, setManualDialog] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkIn: '',
    checkOut: '',
    notes: '',
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [overtimeDialog, setOvertimeDialog] = useState(false);
  const [overtimeForm, setOvertimeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'عمل إضافي عادي',
    startTime: '',
    endTime: '',
    totalHours: '',
    reason: '',
  });
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [overtimeList, setOvertimeList] = useState([]);
  const [_overtimeListLoading, setOvertimeListLoading] = useState(false);
  const now = new Date();

  const getLocation = () => {
    setLocLoading(true);
    navigator.geolocation?.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
      },
      () => setLocLoading(false)
    );
  };

  const doCheckIn = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await apiFetch('/check-in', {
        method: 'POST',
        data: { location, notes, source: 'mobile' },
      });
      setResult({ type: r.success ? 'success' : 'warning', message: r.message, details: r });
      if (r.success) setStatus('checked_in');
    } catch (e) {
      setResult({ type: 'error', message: e.message || 'حدث خطأ أثناء تسجيل الحضور' });
    } finally {
      setLoading(false);
    }
  };

  const doCheckOut = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await apiFetch('/check-out', { method: 'POST', data: { notes } });
      setResult({ type: r.success ? 'success' : 'warning', message: r.message, details: r });
      if (r.success) setStatus('checked_out');
    } catch (e) {
      setResult({ type: 'error', message: e.message || 'حدث خطأ أثناء تسجيل الانصراف' });
    } finally {
      setLoading(false);
    }
  };

  const doManualRecord = async () => {
    setManualLoading(true);
    try {
      await apiFetch('/manual', { method: 'POST', data: manualForm });
      setManualDialog(false);
      setResult({ type: 'success', message: 'تم حفظ السجل اليدوي بنجاح' });
    } catch (e) {
      setResult({ type: 'error', message: e.message || 'خطأ في الحفظ' });
    } finally {
      setManualLoading(false);
    }
  };

  const doOvertimeRequest = async () => {
    setOvertimeLoading(true);
    try {
      const r = await submitOvertimeRequest(overtimeForm);
      if (r.success) {
        setOvertimeDialog(false);
        setResult({ type: 'success', message: 'تم تقديم طلب العمل الإضافي بنجاح' });
        setOvertimeForm({
          date: new Date().toISOString().split('T')[0],
          type: 'عمل إضافي عادي',
          startTime: '',
          endTime: '',
          totalHours: '',
          reason: '',
        });
        loadOvertimeList();
      }
    } catch (e) {
      setResult({ type: 'error', message: e.message || 'خطأ في تقديم الطلب' });
    } finally {
      setOvertimeLoading(false);
    }
  };

  const loadOvertimeList = useCallback(async () => {
    setOvertimeListLoading(true);
    try {
      const r = await getOvertimeRequests({ limit: 5 });
      setOvertimeList(r.data || []);
    } catch {
      setOvertimeList([]);
    } finally {
      setOvertimeListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOvertimeList();
  }, [loadOvertimeList]);

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Self Check-In/Out Card */}
        <Grid item xs={12} md={6}>
          <Glass sx={{ p: 4, textAlign: 'center' }}>
            <motion.div
              animate={{ scale: status === 'checked_in' ? [1, 1.05, 1] : 1 }}
              transition={{ duration: 0.4 }}
            >
              <Box
                sx={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  mx: 'auto',
                  mb: 3,
                  background:
                    status === 'checked_out'
                      ? 'linear-gradient(135deg,#6b7280,#9ca3af)'
                      : status === 'checked_in'
                        ? 'linear-gradient(135deg,#10b981,#059669)'
                        : 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 16px 48px rgba(16,185,129,0.3)',
                }}
              >
                <Fingerprint sx={{ fontSize: 56, color: '#fff' }} />
              </Box>
            </motion.div>

            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5 }}>
              {now.toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
            <Typography
              variant="h4"
              fontWeight={900}
              sx={{ mb: 3, fontFamily: 'monospace', color: '#1e293b' }}
            >
              <LiveClock />
            </Typography>

            {result && (
              <Alert
                severity={result.type}
                sx={{ mb: 2, borderRadius: 2, textAlign: 'right' }}
                onClose={() => setResult(null)}
              >
                <Box>
                  <strong>{result.message}</strong>
                  {result.details?.workingHours > 0 && (
                    <Typography variant="caption" display="block">
                      ساعات العمل: {result.details.workingHours} | إضافي:{' '}
                      {result.details.overtimeHours}
                    </Typography>
                  )}
                  {result.details?.latenessMinutes > 0 && (
                    <Typography variant="caption" display="block" color="warning.main">
                      تأخير: {result.details.latenessMinutes} دقيقة
                    </Typography>
                  )}
                </Box>
              </Alert>
            )}

            <TextField
              fullWidth
              multiline
              rows={2}
              label="ملاحظات (اختياري)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              sx={{ mb: 2, borderRadius: 2 }}
              size="small"
            />

            {/* GPS */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 3,
                justifyContent: 'center',
              }}
            >
              <Tooltip title="الحصول على الموقع الجغرافي">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={getLocation}
                  disabled={locLoading}
                  startIcon={<LocationOn />}
                  sx={{ borderRadius: 2 }}
                >
                  {locLoading ? 'جاري التحديد...' : location ? 'تم تحديد الموقع ✓' : 'تحديد الموقع'}
                </Button>
              </Tooltip>
              {location && (
                <Typography variant="caption" color="success.main">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </Typography>
              )}
            </Box>

            {/* Check-In Button */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={loading || status === 'checked_in' || status === 'checked_out'}
              onClick={doCheckIn}
              sx={{
                mb: 2,
                height: 52,
                borderRadius: 3,
                fontWeight: 800,
                fontSize: '16px',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                boxShadow: '0 8px 24px rgba(16,185,129,0.35)',
                '&:hover': { boxShadow: '0 12px 32px rgba(16,185,129,0.5)' },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle /> تسجيل الحضور
                </Box>
              )}
            </Button>

            {/* Check-Out Button */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              disabled={loading || status !== 'checked_in'}
              onClick={doCheckOut}
              sx={{
                height: 52,
                borderRadius: 3,
                fontWeight: 800,
                fontSize: '16px',
                borderColor: '#ef4444',
                color: '#ef4444',
                '&:hover': { bgcolor: 'rgba(239,68,68,0.05)', borderColor: '#dc2626' },
              }}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Cancel /> تسجيل الانصراف
                </Box>
              )}
            </Button>
          </Glass>
        </Grid>

        {/* Manual Entry (Admin) */}
        <Grid item xs={12} md={6}>
          <Glass sx={{ p: 4 }}>
            <Typography
              fontWeight={800}
              sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Assignment sx={{ color: '#6366f1' }} /> تسجيل يدوي (المشرف)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              أدخل سجل حضور يدوياً لأي موظف لأي يوم. يستخدمه المشرفون لتصحيح أو إضافة سجلات.
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={() => setManualDialog(true)}
              startIcon={<Add />}
              sx={{
                borderRadius: 3,
                height: 48,
                fontWeight: 700,
                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                boxShadow: '0 8px 24px rgba(99,102,241,0.3)',
              }}
            >
              تسجيل يدوي جديد
            </Button>

            <Divider sx={{ my: 3 }} />

            {/* Overtime request button */}
            <Typography
              fontWeight={700}
              sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <WorkOutline sx={{ color: '#f59e0b' }} /> طلب عمل إضافي
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              قدّم طلب عمل إضافي لساعات خارج الدوام الرسمي.
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              onClick={() => setOvertimeDialog(true)}
              startIcon={<WatchLater />}
              sx={{
                borderRadius: 3,
                height: 48,
                fontWeight: 700,
                borderColor: '#f59e0b',
                color: '#f59e0b',
                '&:hover': { bgcolor: 'rgba(245,158,11,0.05)', borderColor: '#d97706' },
              }}
            >
              تقديم طلب عمل إضافي
            </Button>

            {/* Last overtime requests */}
            {overtimeList.length > 0 && (
              <Box sx={{ mt: 2.5 }}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ mb: 1, display: 'block' }}
                >
                  آخر طلبات العمل الإضافي
                </Typography>
                <Stack spacing={0.75}>
                  {overtimeList.map(ot => (
                    <Box
                      key={ot._id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 1.25,
                        borderRadius: 2,
                        bgcolor: 'rgba(0,0,0,0.02)',
                        border: '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" fontWeight={700}>
                          {ot.type}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {ot.totalHours} ساعة
                        </Typography>
                      </Box>
                      <Chip
                        label={ot.status}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '10px',
                          bgcolor:
                            ot.status === 'معتمد'
                              ? 'rgba(16,185,129,0.1)'
                              : ot.status === 'مرفوض'
                                ? 'rgba(239,68,68,0.1)'
                                : 'rgba(245,158,11,0.1)',
                          color:
                            ot.status === 'معتمد'
                              ? '#059669'
                              : ot.status === 'مرفوض'
                                ? '#dc2626'
                                : '#d97706',
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Glass>
        </Grid>
      </Grid>

      {/* Manual Record Dialog */}
      <Dialog
        open={manualDialog}
        onClose={() => setManualDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          تسجيل حضور يدوي
          <IconButton onClick={() => setManualDialog(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم / معرّف الموظف (Mongo ID)"
                value={manualForm.employeeId}
                onChange={e => setManualForm({ ...manualForm, employeeId: e.target.value })}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={manualForm.date}
                onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={manualForm.status}
                  onChange={e => setManualForm({ ...manualForm, status: e.target.value })}
                  label="الحالة"
                >
                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت الحضور"
                value={manualForm.checkIn}
                onChange={e => setManualForm({ ...manualForm, checkIn: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت الانصراف"
                value={manualForm.checkOut}
                onChange={e => setManualForm({ ...manualForm, checkOut: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={manualForm.notes}
                onChange={e => setManualForm({ ...manualForm, notes: e.target.value })}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setManualDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={doManualRecord}
            disabled={manualLoading}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              fontWeight: 700,
            }}
          >
            {manualLoading ? <CircularProgress size={20} color="inherit" /> : 'حفظ السجل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Overtime Request Dialog */}
      <Dialog
        open={overtimeDialog}
        onClose={() => setOvertimeDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg,rgba(245,158,11,0.08),rgba(251,191,36,0.05))',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WatchLater sx={{ color: '#f59e0b' }} /> طلب عمل إضافي
          </Box>
          <IconButton onClick={() => setOvertimeDialog(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
            تُحتسب ساعات العمل الإضافي بمعدل 1.5× وفق نظام العمل السعودي (المادة 107)
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={overtimeForm.date}
                onChange={e => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع العمل الإضافي</InputLabel>
                <Select
                  value={overtimeForm.type}
                  onChange={e => setOvertimeForm({ ...overtimeForm, type: e.target.value })}
                  label="نوع العمل الإضافي"
                >
                  {['عمل إضافي عادي', 'عمل يوم راحة', 'عمل يوم عطلة رسمية', 'عمل ليلي'].map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="time"
                label="وقت البداية"
                value={overtimeForm.startTime}
                onChange={e => setOvertimeForm({ ...overtimeForm, startTime: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="time"
                label="وقت النهاية"
                value={overtimeForm.endTime}
                onChange={e => setOvertimeForm({ ...overtimeForm, endTime: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="عدد الساعات"
                value={overtimeForm.totalHours}
                onChange={e => setOvertimeForm({ ...overtimeForm, totalHours: e.target.value })}
                size="small"
                inputProps={{ min: 0.5, max: 12, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="سبب العمل الإضافي"
                value={overtimeForm.reason}
                onChange={e => setOvertimeForm({ ...overtimeForm, reason: e.target.value })}
                size="small"
                placeholder="اذكر المهام المنجزة خلال وقت العمل الإضافي..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setOvertimeDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={doOvertimeRequest}
            disabled={
              overtimeLoading ||
              !overtimeForm.startTime ||
              !overtimeForm.endTime ||
              !overtimeForm.reason
            }
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              fontWeight: 700,
            }}
          >
            {overtimeLoading ? <CircularProgress size={20} color="inherit" /> : 'تقديم الطلب'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: LEAVE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function LeavesTab() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestDialog, setRequestDialog] = useState(false);
  const [decisionDialog, setDecisionDialog] = useState({ open: false, leave: null });
  const [form, setForm] = useState({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [balance, setBalance] = useState(null);

  const loadLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiFetch(`/leave/requests${filterStatus ? `?status=${filterStatus}` : ''}`);
      setLeaves(r.leaves || []);
    } catch {
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  useEffect(() => {
    getLeaveBalance()
      .then(r => setBalance(r.data || null))
      .catch(() => {});
  }, []);

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      const r = await apiFetch('/leave/request', { method: 'POST', data: form });
      setAlert({ type: r.success ? 'success' : 'error', message: r.message });
      if (r.success) {
        setRequestDialog(false);
        loadLeaves();
      }
    } catch (e) {
      setAlert({ type: 'error', message: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  const makeDecision = async decision => {
    const { leave } = decisionDialog;
    try {
      await apiFetch(`/leave/${leave._id}/decision`, { method: 'PATCH', data: { decision } });
      setDecisionDialog({ open: false, leave: null });
      setAlert({ type: 'success', message: decision === 'approved' ? 'تمت الموافقة' : 'تم الرفض' });
      loadLeaves();
    } catch (e) {
      setAlert({ type: 'error', message: e.message });
    }
  };

  const LEAVE_STATUS = {
    pending: { label: 'قيد الانتظار', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    approved: { label: 'موافق عليها', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    rejected: { label: 'مرفوضة', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  };

  const pendingCount = leaves.filter(l => l.status === 'pending').length;

  return (
    <Box>
      {alert && (
        <Alert severity={alert.type} sx={{ mb: 2, borderRadius: 2 }} onClose={() => setAlert(null)}>
          {alert.message}
        </Alert>
      )}

      {/* Leave Balance Cards */}
      {balance && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            {
              label: 'الإجازة السنوية',
              entitled: balance.annual_entitled,
              used: balance.annual_used,
              remaining: balance.annual_remaining,
              color: '#10b981',
              bg: 'rgba(16,185,129,0.07)',
              icon: <BeachAccess sx={{ fontSize: 20, color: '#10b981' }} />,
            },
            {
              label: 'الإجازة المرضية',
              entitled: 30,
              used: balance.sick_used,
              remaining: Math.max(0, 30 - balance.sick_used),
              color: '#ef4444',
              bg: 'rgba(239,68,68,0.07)',
              icon: <HourglassEmpty sx={{ fontSize: 20, color: '#ef4444' }} />,
            },
            {
              label: 'التعويضية',
              entitled: balance.compensatory_earned,
              used: balance.compensatory_used,
              remaining: balance.compensatory_remaining,
              color: '#6366f1',
              bg: 'rgba(99,102,241,0.07)',
              icon: <AccountBalance sx={{ fontSize: 20, color: '#6366f1' }} />,
            },
            {
              label: 'إجازة الحج',
              entitled: 15,
              used: balance.hajj_used,
              remaining: Math.max(0, 15 - balance.hajj_used),
              color: '#f59e0b',
              bg: 'rgba(245,158,11,0.07)',
              icon: <EventAvailable sx={{ fontSize: 20, color: '#f59e0b' }} />,
            },
          ].map(b => (
            <Grid item xs={6} sm={3} key={b.label}>
              <Box sx={{ p: 2, borderRadius: 3, bgcolor: b.bg, border: `1px solid ${b.color}25` }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  {b.icon}
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {b.label}
                  </Typography>
                </Box>
                <Typography variant="h5" fontWeight={900} sx={{ color: b.color }}>
                  {b.remaining}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  متبقي من {b.entitled}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={b.entitled > 0 ? Math.min(100, (b.remaining / b.entitled) * 100) : 0}
                  sx={{
                    mt: 1,
                    height: 5,
                    borderRadius: 3,
                    bgcolor: 'rgba(0,0,0,0.06)',
                    '& .MuiLinearProgress-bar': { background: b.color, borderRadius: 3 },
                  }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" fontWeight={800}>
            إدارة الإجازات
          </Typography>
          {pendingCount > 0 && (
            <Badge badgeContent={pendingCount} color="warning">
              <Chip
                label="معلّقة"
                size="small"
                sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#d97706', fontWeight: 700 }}
              />
            </Badge>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              label="الحالة"
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="pending">معلّقة</MenuItem>
              <MenuItem value="approved">موافق عليها</MenuItem>
              <MenuItem value="rejected">مرفوضة</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setRequestDialog(true)}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              fontWeight: 700,
            }}
          >
            طلب إجازة جديد
          </Button>
        </Box>
      </Box>

      <Glass sx={{ p: 2 }}>
        {loading ? (
          <Box textAlign="center" py={4}>
            <CircularProgress sx={{ color: '#10b981' }} />
          </Box>
        ) : leaves.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            لا توجد طلبات إجازة
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    '& th': {
                      fontWeight: 700,
                      fontSize: '12px',
                      color: 'text.secondary',
                      bgcolor: 'rgba(0,0,0,0.02)',
                    },
                  }}
                >
                  <TableCell>الموظف</TableCell>
                  <TableCell>نوع الإجازة</TableCell>
                  <TableCell>من</TableCell>
                  <TableCell>إلى</TableCell>
                  <TableCell>الأيام</TableCell>
                  <TableCell>السبب</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaves.map(l => {
                  const st = LEAVE_STATUS[l.status] || LEAVE_STATUS.pending;
                  const leaveTypeLabel =
                    LEAVE_TYPES.find(t => t.value === l.leaveType)?.label || l.leaveType;
                  return (
                    <TableRow key={l._id} sx={{ '&:hover': { bgcolor: 'rgba(16,185,129,0.03)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              bgcolor: '#6366f1',
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            {(l.employeeId?.name_ar || '?')[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="caption" fontWeight={600} display="block">
                              {l.employeeId?.name_ar || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {DEPT_MAP[l.employeeId?.department] || '—'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{leaveTypeLabel}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(l.startDate).toLocaleDateString('ar-SA')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(l.endDate).toLocaleDateString('ar-SA')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={`${l.days} أيام`} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" noWrap sx={{ maxWidth: 120 }}>
                          {l.reason}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={st.label}
                          size="small"
                          sx={{
                            bgcolor: st.bg,
                            color: st.color,
                            fontWeight: 700,
                            fontSize: '11px',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {l.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="موافقة">
                              <IconButton
                                size="small"
                                sx={{ color: '#10b981' }}
                                onClick={() => setDecisionDialog({ open: true, leave: l })}
                              >
                                <ThumbUp fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                sx={{ color: '#ef4444' }}
                                onClick={() => makeDecision('rejected')}
                              >
                                <ThumbDown fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Glass>

      {/* Request Dialog */}
      <Dialog
        open={requestDialog}
        onClose={() => setRequestDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
          طلب إجازة جديد
          <IconButton onClick={() => setRequestDialog(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الإجازة</InputLabel>
                <Select
                  value={form.leaveType}
                  onChange={e => setForm({ ...form, leaveType: e.target.value })}
                  label="نوع الإجازة"
                >
                  {LEAVE_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="من تاريخ"
                value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="إلى تاريخ"
                value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="سبب الإجازة *"
                value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setRequestDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={submitRequest}
            disabled={submitting || !form.startDate || !form.endDate || !form.reason}
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              fontWeight: 700,
            }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'تقديم الطلب'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decision Dialog */}
      <Dialog
        open={decisionDialog.open}
        onClose={() => setDecisionDialog({ open: false, leave: null })}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle fontWeight={800}>قرار على طلب الإجازة</DialogTitle>
        <DialogContent>
          {decisionDialog.leave && (
            <Box>
              <Typography>
                الموظف: <strong>{decisionDialog.leave.employeeId?.name_ar}</strong>
              </Typography>
              <Typography>
                النوع:{' '}
                <strong>
                  {LEAVE_TYPES.find(t => t.value === decisionDialog.leave.leaveType)?.label}
                </strong>
              </Typography>
              <Typography>
                المدة: <strong>{decisionDialog.leave.days} أيام</strong>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={() => makeDecision('rejected')}
            sx={{ borderRadius: 2, color: '#ef4444', borderColor: '#ef4444' }}
            variant="outlined"
            startIcon={<ThumbDown />}
          >
            رفض
          </Button>
          <Button
            onClick={() => makeDecision('approved')}
            variant="contained"
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg,#10b981,#059669)',
              fontWeight: 700,
            }}
            startIcon={<ThumbUp />}
          >
            موافقة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: REPORTS & ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

function ReportsTab() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [reportParams, setReportParams] = useState({
    month: currentMonth,
    year: currentYear,
    department: '',
  });
  const [monthlyData, setMonthlyData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activeView, setActiveView] = useState('monthly'); // 'monthly' | 'analytics'

  const loadMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: reportParams.month,
        year: reportParams.year,
        ...(reportParams.department && { department: reportParams.department }),
      });
      const r = await apiFetch(`/report/monthly?${params}`);
      setMonthlyData(r);
    } catch {
      setMonthlyData(null);
    } finally {
      setLoading(false);
    }
  }, [reportParams]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const r = await apiFetch('/analytics?period=30');
      setAnalyticsData(r.data);
    } catch {
      setAnalyticsData(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);
  useEffect(() => {
    if (activeView === 'monthly') loadMonthly();
  }, [activeView, loadMonthly]);

  const doExport = async () => {
    try {
      const params = new URLSearchParams({ month: reportParams.month, year: reportParams.year });
      const r = await apiFetch(`/export/monthly?${params}`);
      const rows = r.data || [];
      if (rows.length === 0) return;
      const headers = Object.keys(rows[0]).join(',');
      const csvData = [
        headers,
        ...rows.map(row =>
          Object.values(row)
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ].join('\n');
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${reportParams.month}_${reportParams.year}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const months = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  const statusColor = s => {
    if (s === 'ممتاز') return '#10b981';
    if (s === 'جيد') return '#3b82f6';
    if (s === 'مقبول') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Box>
      {/* View Switcher */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {[
          { id: 'monthly', label: 'التقرير الشهري' },
          { id: 'analytics', label: 'التحليلات الذكية' },
        ].map(v => (
          <Button
            key={v.id}
            variant={activeView === v.id ? 'contained' : 'outlined'}
            onClick={() => setActiveView(v.id)}
            sx={{
              borderRadius: 2,
              fontWeight: 700,
              ...(activeView === v.id
                ? {
                    background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                    boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                  }
                : { borderColor: 'rgba(0,0,0,0.15)' }),
            }}
          >
            {v.label}
          </Button>
        ))}
      </Box>

      {/* Monthly Report */}
      {activeView === 'monthly' && (
        <Box>
          {/* Filters */}
          <Glass sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>الشهر</InputLabel>
                  <Select
                    value={reportParams.month}
                    onChange={e => setReportParams({ ...reportParams, month: e.target.value })}
                    label="الشهر"
                  >
                    {months.map((m, i) => (
                      <MenuItem key={i + 1} value={i + 1}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="السنة"
                  value={reportParams.year}
                  onChange={e =>
                    setReportParams({ ...reportParams, year: parseInt(e.target.value) })
                  }
                  inputProps={{ min: 2020, max: 2030 }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>القسم</InputLabel>
                  <Select
                    value={reportParams.department}
                    onChange={e => setReportParams({ ...reportParams, department: e.target.value })}
                    label="القسم"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {Object.entries(DEPT_MAP).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={loadMonthly}
                    disabled={loading}
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(135deg,#10b981,#059669)',
                      fontWeight: 700,
                    }}
                  >
                    {loading ? <CircularProgress size={18} color="inherit" /> : 'عرض'}
                  </Button>
                  <Tooltip title="تصدير CSV">
                    <IconButton onClick={doExport} sx={{ color: '#6366f1' }}>
                      <Download />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>
            </Grid>
          </Glass>

          {/* Summary Cards */}
          {monthlyData && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Glass sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981' }}>
                      {monthlyData.summary?.avgAttendanceRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      متوسط نسبة الحضور
                    </Typography>
                  </Glass>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Glass sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1' }}>
                      {monthlyData.workingDays}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      أيام عمل في الشهر
                    </Typography>
                  </Glass>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Glass sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#f59e0b' }}>
                      {monthlyData.summary?.totalOvertimeHours}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي الساعات الإضافية
                    </Typography>
                  </Glass>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Glass sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#3b82f6' }}>
                      {monthlyData.pagination?.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي الموظفين
                    </Typography>
                  </Glass>
                </Grid>
              </Grid>

              <Glass sx={{ p: 2 }}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          '& th': {
                            fontWeight: 700,
                            fontSize: '12px',
                            color: 'text.secondary',
                            bgcolor: 'rgba(0,0,0,0.02)',
                          },
                        }}
                      >
                        <TableCell>الموظف</TableCell>
                        <TableCell>القسم</TableCell>
                        <TableCell align="center">أيام الحضور</TableCell>
                        <TableCell align="center">أيام الغياب</TableCell>
                        <TableCell align="center">أيام التأخر</TableCell>
                        <TableCell align="center">ساعات العمل</TableCell>
                        <TableCell align="center">الساعات الإضافية</TableCell>
                        <TableCell align="center">نسبة الحضور</TableCell>
                        <TableCell align="center">التقييم</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(monthlyData.rows || []).map(row => (
                        <TableRow
                          key={row.employee._id}
                          sx={{ '&:hover': { bgcolor: 'rgba(99,102,241,0.03)' } }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: '#6366f1',
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {(row.employee.name_ar || '?')[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="caption" fontWeight={600} display="block">
                                  {row.employee.name_ar}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {row.employee.employee_number}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {DEPT_MAP[row.employee.department] || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{ color: '#10b981' }}
                            >
                              {row.presentDays}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{ color: '#ef4444' }}
                            >
                              {row.absentDays}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{ color: '#f59e0b' }}
                            >
                              {row.lateDays}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="caption">{row.totalHours}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="caption"
                              sx={{ color: row.overtimeHours > 0 ? '#f59e0b' : 'text.secondary' }}
                            >
                              {row.overtimeHours}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                justifyContent: 'center',
                              }}
                            >
                              <LinearProgress
                                variant="determinate"
                                value={row.attendanceRate}
                                sx={{
                                  width: 50,
                                  height: 6,
                                  borderRadius: 3,
                                  '& .MuiLinearProgress-bar': {
                                    background:
                                      row.attendanceRate >= 85
                                        ? '#10b981'
                                        : row.attendanceRate >= 70
                                          ? '#f59e0b'
                                          : '#ef4444',
                                    borderRadius: 3,
                                  },
                                }}
                              />
                              <Typography variant="caption" fontWeight={700}>
                                {row.attendanceRate}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={row.status}
                              size="small"
                              sx={{
                                bgcolor: `${statusColor(row.status)}20`,
                                color: statusColor(row.status),
                                fontWeight: 700,
                                fontSize: '11px',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Glass>
            </>
          )}
        </Box>
      )}

      {/* Analytics */}
      {activeView === 'analytics' && (
        <Box>
          {analyticsLoading ? (
            <LoadingSpinner />
          ) : analyticsData ? (
            <Grid container spacing={3}>
              {/* Daily Trend Line */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography fontWeight={700} sx={{ mb: 2 }}>
                    الاتجاه اليومي (آخر 30 يوم)
                  </Typography>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={analyticsData.dailyTrend || []}>
                      <defs>
                        <linearGradient id="presentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="absentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <RTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: 'none',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="present"
                        name="حاضر"
                        stroke="#10b981"
                        fill="url(#presentGrad)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="absent"
                        name="غائب"
                        stroke="#ef4444"
                        fill="url(#absentGrad)"
                        strokeWidth={2}
                      />
                      <Area
                        type="monotone"
                        dataKey="late"
                        name="متأخر"
                        stroke="#f59e0b"
                        fill="none"
                        strokeWidth={2}
                        strokeDasharray="4 2"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Glass>
              </Grid>

              {/* Check-in Hour Distribution */}
              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Typography fontWeight={700} sx={{ mb: 2 }}>
                    توزيع أوقات الحضور (بالساعة)
                  </Typography>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={(analyticsData.hourDist || []).filter(h => h.count > 0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <RTooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: 'none',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        }}
                      />
                      <Bar
                        dataKey="count"
                        name="عدد الموظفين"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Glass>
              </Grid>

              {/* Summary Stats */}
              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography fontWeight={700} sx={{ mb: 2 }}>
                    ملخص آخر 30 يوم
                  </Typography>
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        bgcolor: 'rgba(16,185,129,0.05)',
                        border: '1px solid rgba(16,185,129,0.1)',
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        متوسط ساعات العمل اليومية
                      </Typography>
                      <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981' }}>
                        {analyticsData.avgWorkingHours} ساعة
                      </Typography>
                    </Box>
                    {Object.entries(analyticsData.statusSummary || {}).map(([status, count]) => {
                      const s = STATUS_MAP[status];
                      if (!s) return null;
                      return (
                        <Box
                          key={status}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: s.bg,
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {s.icon}
                            <Typography variant="caption" fontWeight={600} sx={{ color: s.color }}>
                              {s.label}
                            </Typography>
                          </Box>
                          <Typography variant="caption" fontWeight={800} sx={{ color: s.color }}>
                            {count} سجل
                          </Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Glass>
              </Grid>
            </Grid>
          ) : (
            <Typography color="text.secondary" textAlign="center" py={4}>
              لا توجد بيانات تحليلية
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: EMPLOYEE RECORD (سجل الموظف)
// ─────────────────────────────────────────────────────────────────────────────

const CAL_STATUS_COLOR = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
  half_day: '#8b5cf6',
  leave: '#3b82f6',
  remote: '#06b6d4',
  holiday: '#94a3b8',
};

function EmployeeRecordTab() {
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async () => {
    if (!employeeId.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await apiFetch(
        `/employee/${employeeId.trim()}/history?month=${month}&year=${year}`
      );
      setHistory(r);
    } catch {
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [employeeId, month, year]);

  // Build a calendar grid for the selected month
  const calendarDays = React.useMemo(() => {
    if (!history?.records) return [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const recordMap = {};
    (history.records || []).forEach(r => {
      const d = new Date(r.date || r.checkInTime);
      if (!isNaN(d)) recordMap[d.getDate()] = r.status;
    });
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const cells = [];
    for (let i = 0; i < firstDayOfWeek; i++) cells.push(null); // empty offset
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, status: recordMap[d] || null });
    return cells;
  }, [history, month, year]);

  const summary = history?.summary || {};

  return (
    <Box>
      {/* Search Row */}
      <Glass sx={{ p: 3, mb: 3 }}>
        <Typography
          variant="h6"
          fontWeight={800}
          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <ManageAccounts sx={{ color: '#6366f1' }} /> سجل الموظف
        </Typography>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="معرّف الموظف (ID)"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              size="small"
              placeholder="أدخل Mongo ID للموظف..."
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ fontSize: 18, color: '#94a3b8' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth
              select
              label="الشهر"
              value={month}
              size="small"
              onChange={e => setMonth(Number(e.target.value))}
            >
              {[
                'يناير',
                'فبراير',
                'مارس',
                'أبريل',
                'مايو',
                'يونيو',
                'يوليو',
                'أغسطس',
                'سبتمبر',
                'أكتوبر',
                'نوفمبر',
                'ديسمبر',
              ].map((m, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField
              fullWidth
              select
              label="السنة"
              value={year}
              size="small"
              onChange={e => setYear(Number(e.target.value))}
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant="contained"
              size="medium"
              onClick={doSearch}
              disabled={loading || !employeeId.trim()}
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <History />}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                height: 40,
              }}
            >
              {loading ? 'جاري البحث...' : 'عرض السجل'}
            </Button>
          </Grid>
        </Grid>
      </Glass>

      {!searched && (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <CalendarViewMonth sx={{ fontSize: 64, opacity: 0.15, mb: 2 }} />
          <Typography fontWeight={600} color="text.secondary">
            أدخل معرّف الموظف للاطلاع على سجل حضوره
          </Typography>
        </Box>
      )}

      {searched && loading && <LoadingSpinner />}

      {searched && !loading && !history && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          لم يتم العثور على بيانات. تأكد من صحة معرّف الموظف.
        </Alert>
      )}

      {searched && !loading && history && (
        <>
          {/* Summary Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {[
              {
                label: 'أيام الحضور',
                value:
                  summary.presentDays ??
                  history.records?.filter(r => r.status === 'present').length ??
                  0,
                color: '#10b981',
                icon: <CheckCircle sx={{ fontSize: 24, color: '#fff' }} />,
                gradient: 'linear-gradient(135deg,#43e97b,#38f9d7)',
              },
              {
                label: 'أيام الغياب',
                value:
                  summary.absentDays ??
                  history.records?.filter(r => r.status === 'absent').length ??
                  0,
                color: '#ef4444',
                icon: <Cancel sx={{ fontSize: 24, color: '#fff' }} />,
                gradient: 'linear-gradient(135deg,#f5576c,#f093fb)',
              },
              {
                label: 'أيام التأخير',
                value:
                  summary.lateDays ?? history.records?.filter(r => r.status === 'late').length ?? 0,
                color: '#f59e0b',
                icon: <AccessTime sx={{ fontSize: 24, color: '#fff' }} />,
                gradient: 'linear-gradient(135deg,#f6d365,#fda085)',
              },
              {
                label: 'الإجازات',
                value:
                  summary.leaveDays ??
                  history.records?.filter(r => r.status === 'leave').length ??
                  0,
                color: '#3b82f6',
                icon: <BeachAccess sx={{ fontSize: 24, color: '#fff' }} />,
                gradient: 'linear-gradient(135deg,#a1c4fd,#c2e9fb)',
              },
              {
                label: 'معدل الحضور',
                value: `${summary.attendanceRate ?? Math.round(((summary.presentDays || 0) / Math.max(1, history.records?.length || 1)) * 100)}%`,
                color: '#6366f1',
                icon: <Speed sx={{ fontSize: 24, color: '#fff' }} />,
                gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
              },
              {
                label: 'إجمالي ساعات',
                value: `${summary.totalWorkingHours ?? 0}`,
                color: '#06b6d4',
                icon: <Timer sx={{ fontSize: 24, color: '#fff' }} />,
                gradient: 'linear-gradient(135deg,#84fab0,#8fd3f4)',
              },
            ].map(k => (
              <Grid item xs={6} sm={4} md={2} key={k.label}>
                <Box
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    background: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(0,0,0,0.06)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  <Box
                    sx={{
                      background: k.gradient,
                      p: 1.5,
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    {k.icon}
                  </Box>
                  <Box sx={{ p: 1.5, textAlign: 'center' }}>
                    <Typography variant="h6" fontWeight={900} sx={{ color: k.color }}>
                      {k.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                      {k.label}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          {/* Calendar Heatmap */}
          <Glass sx={{ p: 3, mb: 3 }}>
            <Typography
              fontWeight={700}
              sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <CalendarViewMonth sx={{ color: '#6366f1' }} />
              تقويم الحضور —{' '}
              {
                [
                  'يناير',
                  'فبراير',
                  'مارس',
                  'أبريل',
                  'مايو',
                  'يونيو',
                  'يوليو',
                  'أغسطس',
                  'سبتمبر',
                  'أكتوبر',
                  'نوفمبر',
                  'ديسمبر',
                ][month - 1]
              }{' '}
              {year}
            </Typography>

            {/* Day-of-week header */}
            <Grid container columns={7} sx={{ mb: 0.5 }}>
              {['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'].map(d => (
                <Grid item xs={1} key={d} sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ fontSize: '10px' }}
                  >
                    {d}
                  </Typography>
                </Grid>
              ))}
            </Grid>

            {/* Day cells */}
            <Grid container columns={7} spacing={0.5}>
              {calendarDays.map((cell, i) => (
                <Grid item xs={1} key={i}>
                  {cell === null ? (
                    <Box sx={{ height: 36 }} />
                  ) : (
                    <Tooltip
                      title={
                        cell.status ? STATUS_MAP[cell.status]?.label || cell.status : 'لا يوجد سجل'
                      }
                      placement="top"
                    >
                      <Box
                        sx={{
                          height: 36,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'default',
                          bgcolor: cell.status
                            ? `${CAL_STATUS_COLOR[cell.status]}22`
                            : 'rgba(0,0,0,0.03)',
                          border: `1.5px solid ${cell.status ? CAL_STATUS_COLOR[cell.status] : 'transparent'}30`,
                          transition: 'all 0.15s',
                          '&:hover': { transform: 'scale(1.1)', zIndex: 1 },
                        }}
                      >
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            fontSize: '11px',
                            color: cell.status ? CAL_STATUS_COLOR[cell.status] : '#94a3b8',
                          }}
                        >
                          {cell.day}
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                </Grid>
              ))}
            </Grid>

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              {Object.entries(CAL_STATUS_COLOR).map(
                ([key, color]) =>
                  STATUS_MAP[key] && (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: color }} />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '10px' }}
                      >
                        {STATUS_MAP[key].label}
                      </Typography>
                    </Box>
                  )
              )}
            </Box>
          </Glass>

          {/* History Table */}
          <Glass sx={{ p: 3 }}>
            <Typography fontWeight={700} sx={{ mb: 2 }}>
              تفاصيل السجلات
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      '& th': { fontWeight: 800, bgcolor: 'rgba(0,0,0,0.02)', fontSize: '12px' },
                    }}
                  >
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الحضور</TableCell>
                    <TableCell>الانصراف</TableCell>
                    <TableCell>ساعات العمل</TableCell>
                    <TableCell>التأخير</TableCell>
                    <TableCell>المصدر</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(history.records || []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}
                      >
                        لا توجد سجلات لهذا الشهر
                      </TableCell>
                    </TableRow>
                  ) : (
                    (history.records || []).map(r => (
                      <TableRow
                        key={r._id}
                        hover
                        sx={{ '&:hover': { bgcolor: 'rgba(99,102,241,0.02)' } }}
                      >
                        <TableCell>
                          <Typography variant="caption">
                            {r.dateFormatted ||
                              new Date(r.date || r.checkInTime).toLocaleDateString('ar-SA')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StatusChip status={r.status} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#10b981' }}>
                            {r.checkInFormatted || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#ef4444' }}>
                            {r.checkOutFormatted || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" fontWeight={700}>
                            {r.workingHoursFormatted || r.workingHours || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {r.latenessMinutes > 0 ? (
                            <Chip
                              label={`${r.latenessMinutes} د`}
                              size="small"
                              sx={{
                                bgcolor: 'rgba(245,158,11,0.1)',
                                color: '#d97706',
                                fontWeight: 700,
                                fontSize: '10px',
                              }}
                            />
                          ) : (
                            <Typography variant="caption" color="success.main">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {r.source || '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Glass>
        </>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );
  useEffect(() => {
    const t = setInterval(
      () =>
        setTime(
          new Date().toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        ),
      1000
    );
    return () => clearInterval(t);
  }, []);
  return <>{time}</>;
}

function LoadingSpinner() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
      <CircularProgress sx={{ color: '#10b981' }} size={48} />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MOCK DATA (fallback when backend unavailable)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  totalEmployees: 245,
  presentToday: 212,
  absentToday: 18,
  lateToday: 15,
  onLeave: 8,
  remote: 5,
  checkedIn: 220,
  checkedOut: 180,
  attendanceRate: 87,
  totalWorkingHours: 1240.5,
  totalOvertimeHours: 32.5,
  pendingLeaves: 6,
  byStatus: [
    { status: 'حاضر', key: 'present', count: 212 },
    { status: 'غائب', key: 'absent', count: 18 },
    { status: 'متأخر', key: 'late', count: 15 },
    { status: 'إجازة', key: 'leave', count: 8 },
    { status: 'عن بُعد', key: 'remote', count: 5 },
  ],
  weeklyTrend: [
    { day: 'الأحد', date: '04/27', present: 220, late: 12, absent: 13 },
    { day: 'الاثنين', date: '04/28', present: 215, late: 18, absent: 12 },
    { day: 'الثلاثاء', date: '04/29', present: 218, late: 10, absent: 17 },
    { day: 'الأربعاء', date: '04/30', present: 210, late: 22, absent: 13 },
    { day: 'الخميس', date: '05/01', present: 205, late: 15, absent: 25 },
    { day: 'الجمعة', date: '05/02', present: 30, late: 5, absent: 210 },
    { day: 'السبت', date: '05/03', present: 25, late: 2, absent: 218 },
  ],
  deptBreakdown: [
    { department: 'clinical', statuses: [{ status: 'present', count: 85 }], total: 95 },
    { department: 'administration', statuses: [{ status: 'present', count: 42 }], total: 50 },
    { department: 'support', statuses: [{ status: 'present', count: 38 }], total: 45 },
    { department: 'finance', statuses: [{ status: 'present', count: 28 }], total: 30 },
    { department: 'hr', statuses: [{ status: 'present', count: 12 }], total: 15 },
    { department: 'it', statuses: [{ status: 'present', count: 8 }], total: 10 },
  ],
};

const MOCK_TODAY = {
  records: [
    {
      _id: '1',
      employeeId: {
        name_ar: 'أحمد محمد علي',
        employee_number: 'EMP-2024-001',
        department: 'clinical',
      },
      shiftId: { startTime: '08:00', endTime: '16:00' },
      status: 'present',
      checkInFormatted: '07:52',
      checkOutFormatted: '—',
      workingHoursFormatted: '—',
      source: 'biometric',
    },
    {
      _id: '2',
      employeeId: {
        name_ar: 'سارة عبدالله',
        employee_number: 'EMP-2024-002',
        department: 'administration',
      },
      shiftId: { startTime: '08:00', endTime: '16:00' },
      status: 'late',
      checkInFormatted: '08:35',
      checkOutFormatted: '—',
      workingHoursFormatted: '—',
      source: 'mobile',
    },
    {
      _id: '3',
      employeeId: {
        name_ar: 'خالد العمري',
        employee_number: 'EMP-2024-003',
        department: 'finance',
      },
      shiftId: null,
      status: 'absent',
      checkInFormatted: '—',
      checkOutFormatted: '—',
      workingHoursFormatted: '—',
      source: 'system',
    },
    {
      _id: '4',
      employeeId: { name_ar: 'نورة الحربي', employee_number: 'EMP-2024-004', department: 'hr' },
      shiftId: { startTime: '08:00', endTime: '16:00' },
      status: 'present',
      checkInFormatted: '07:58',
      checkOutFormatted: '16:10',
      workingHoursFormatted: '8:12',
      source: 'biometric',
    },
    {
      _id: '5',
      employeeId: { name_ar: 'محمد الغامدي', employee_number: 'EMP-2024-005', department: 'it' },
      shiftId: { startTime: '09:00', endTime: '17:00' },
      status: 'remote',
      checkInFormatted: '09:05',
      checkOutFormatted: '—',
      workingHoursFormatted: '—',
      source: 'manual',
    },
  ],
  pagination: { page: 1, limit: 20, total: 220, pages: 11 },
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 0, label: 'لوحة المراقبة', icon: <BarIcon /> },
  { id: 1, label: 'تسجيل الحضور', icon: <Fingerprint /> },
  { id: 2, label: 'الإجازات', icon: <BeachAccess /> },
  { id: 3, label: 'التقارير', icon: <Assignment /> },
  { id: 4, label: 'سجل الموظف', icon: <History /> },
];

export default function AttendanceManagement() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #f0f9ff 60%, #faf5ff 100%)',
        direction: 'rtl',
      }}
    >
      {/* Page Header */}
      <Fade in timeout={400}>
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg,#10b981,#059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                }}
              >
                <People sx={{ color: '#fff', fontSize: 26 }} />
              </Box>
              <Box>
                <Typography
                  variant="h5"
                  fontWeight={900}
                  sx={{
                    background: 'linear-gradient(135deg,#10b981,#059669)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  نظام الحضور والانصراف
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  إدارة ذكية وشاملة لحضور الموظفين
                </Typography>
              </Box>
            </Box>
            <Chip
              icon={<NotificationsActive sx={{ fontSize: 14 }} />}
              label={`${new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}`}
              sx={{
                bgcolor: 'rgba(16,185,129,0.08)',
                color: '#059669',
                fontWeight: 700,
                fontSize: '12px',
                height: 34,
                borderRadius: '10px',
                border: '1px solid rgba(16,185,129,0.2)',
              }}
            />
          </Box>
        </Box>
      </Fade>

      {/* Navigation Tabs */}
      <Glass sx={{ mb: 3, p: 0.5 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '13px',
              minHeight: 48,
              borderRadius: '12px',
              mx: 0.5,
              transition: 'all 0.2s',
              '&:hover': { bgcolor: 'rgba(16,185,129,0.06)' },
            },
            '& .Mui-selected': {
              background: 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(5,150,105,0.08))',
              color: '#059669 !important',
            },
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(135deg,#10b981,#059669)',
              height: 3,
              borderRadius: 2,
            },
          }}
        >
          {TABS.map(t => (
            <Tab key={t.id} icon={t.icon} iconPosition="start" label={t.label} />
          ))}
        </Tabs>
      </Glass>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {activeTab === 0 && <DashboardTab />}
          {activeTab === 1 && <CheckInOutTab />}
          {activeTab === 2 && <LeavesTab />}
          {activeTab === 3 && <ReportsTab />}
          {activeTab === 4 && <EmployeeRecordTab />}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
