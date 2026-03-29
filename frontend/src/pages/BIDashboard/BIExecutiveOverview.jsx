/**
 * BI Executive Overview — لوحة النظرة التنفيذية الشاملة
 *
 * Main BI dashboard with KPI cards, health score gauge,
 * real-time metrics, and summary charts.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  People,
  AccountBalance,
  EventNote,
  Accessibility,
  ReportProblem,
  HowToReg,
  Refresh,
  Speed,
  AccessTime,
  Wifi,
  Assignment,
} from '@mui/icons-material';
import {
    AreaChart,
    Area,
    PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { getOverview, getKPIs, getRealtime, getTrends } from '../../services/biDashboard.service';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'أسبوع' },
  { value: 'month', label: 'شهر' },
  { value: 'quarter', label: 'ربع سنوي' },
  { value: 'year', label: 'سنة' },
];

const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];

// ── Animated Counter ──────────────────────────────────────────────
function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const num = parseFloat(value) || 0;
    const duration = 1000;
    const steps = 30;
    const increment = num / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current += increment;
      if (step >= steps) {
        clearInterval(timer);
        current = num;
      }
      setDisplay(current);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span>
      {prefix}
      {Number.isInteger(parseFloat(value))
        ? Math.round(display).toLocaleString('ar-SA')
        : display.toFixed(1)}
      {suffix}
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────
function KPICard({ title, value, unit, trend, trendValue, icon: Icon, color }) {
  const theme = useTheme();

  const trendIcon =
    trend === 'up' ? (
      <TrendingUp fontSize="small" />
    ) : trend === 'down' ? (
      <TrendingDown fontSize="small" />
    ) : (
      <TrendingFlat fontSize="small" />
    );

  const trendColor =
    trend === 'up' ? theme.palette.success.main : trend === 'down' ? theme.palette.error.main : theme.palette.grey[500];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': { boxShadow: theme.shadows[4], transform: 'translateY(-2px)' },
          transition: 'all 0.3s ease',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: alpha(color || theme.palette.primary.main, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {Icon && <Icon sx={{ color: color || theme.palette.primary.main }} />}
            </Box>
          </Box>

          <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
            <AnimatedNumber
              value={value}
              prefix={unit === 'currency' ? '﷼ ' : ''}
              suffix={unit === 'percentage' ? '%' : ''}
            />
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ color: trendColor, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trendIcon}
              <Typography variant="caption" fontWeight={600} sx={{ color: trendColor }}>
                {trendValue > 0 ? '+' : ''}
                {trendValue}%
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              مقارنة بالفترة السابقة
            </Typography>
          </Box>
        </CardContent>

        {/* Accent bar */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 4,
            height: '100%',
            bgcolor: color || theme.palette.primary.main,
          }}
        />
      </Card>
    </motion.div>
  );
}

// ── Health Score Gauge ────────────────────────────────────────────
function HealthScoreGauge({ score }) {
  const theme = useTheme();
  const getScoreColor = (s) => {
    if (s >= 80) return theme.palette.success.main;
    if (s >= 60) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getScoreLabel = (s) => {
    if (s >= 80) return 'ممتاز';
    if (s >= 60) return 'جيد';
    if (s >= 40) return 'يحتاج تحسين';
    return 'حرج';
  };

  return (
    <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        مؤشر صحة المنظمة
      </Typography>

      <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
        <CircularProgress
          variant="determinate"
          value={score}
          size={160}
          thickness={6}
          sx={{ color: getScoreColor(score) }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="h3" fontWeight={700} color={getScoreColor(score)}>
            {score}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            من 100
          </Typography>
        </Box>
      </Box>

      <Chip label={getScoreLabel(score)} sx={{ bgcolor: alpha(getScoreColor(score), 0.1), color: getScoreColor(score), fontWeight: 600 }} />
    </Paper>
  );
}

// ── Real-time Metrics Strip ──────────────────────────────────────
function RealtimeStrip({ data }) {
  const theme = useTheme();
  const items = [
    { icon: <EventNote />, label: 'جلسات اليوم', value: data.todaySessions || 0 },
    { icon: <HowToReg />, label: 'الحضور اليوم', value: data.todayAttendance || 0 },
    { icon: <Wifi />, label: 'مستخدمون نشطون', value: data.onlineUsers || 0 },
    { icon: <Assignment />, label: 'مهام معلقة', value: data.pendingTasks || 0 },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: alpha(theme.palette.primary.main, 0.02),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AccessTime fontSize="small" color="primary" />
        <Typography variant="subtitle2" color="primary" fontWeight={600}>
          مقاييس آنية
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {items.map((item, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ color: COLORS[i] }}>{item.icon}</Box>
              <Box>
                <Typography variant="h6" fontWeight={700}>
                  {item.value.toLocaleString('ar-SA')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.label}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function BIExecutiveOverview() {
  const theme = useTheme();
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [kpis, setKPIs] = useState([]);
  const [realtime, setRealtime] = useState({});
  const [trendData, setTrendData] = useState([]);
  const [error, setError] = useState(null);

  const kpiIcons = {
    BEN_TOTAL: { icon: Accessibility, color: '#2196F3' },
    STAFF_ACTIVE: { icon: People, color: '#4CAF50' },
    REV_MONTH: { icon: AccountBalance, color: '#FF9800' },
    SESSION_MONTH: { icon: EventNote, color: '#9C27B0' },
    COMPLAINT_RESOLUTION: { icon: ReportProblem, color: '#F44336' },
    ATTENDANCE_RATE: { icon: HowToReg, color: '#00BCD4' },
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, kpiData, realtimeData, trends] = await Promise.all([
        getOverview(period),
        getKPIs(),
        getRealtime(),
        getTrends('revenue', 12),
      ]);
      setOverview(overviewData);
      setKPIs(kpiData);
      setRealtime(realtimeData);
      setTrendData(trends.points || []);
    } catch (err) {
      setError('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh realtime every 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await getRealtime();
        setRealtime(data);
      } catch {
        /* ignore */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const summary = overview?.summary || {};
  const summaryPie = [
    { name: 'المستفيدون', value: summary.beneficiaries?.active || 0, color: '#2196F3' },
    { name: 'الموظفون', value: summary.staff?.active || 0, color: '#4CAF50' },
    { name: 'الجلسات', value: summary.sessions?.total || 0, color: '#9C27B0' },
    { name: 'الشكاوى', value: summary.complaints?.total || 0, color: '#F44336' },
  ].filter((d) => d.value > 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            لوحة ذكاء الأعمال
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نظرة شاملة على أداء المنظمة ومؤشراتها الرئيسية
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
            {PERIOD_OPTIONS.map((opt) => (
              <ToggleButton key={opt.value} value={opt.value}>
                {opt.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={fetchData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Real-time Strip */}
      <Box sx={{ mb: 3 }}>
        <RealtimeStrip data={realtime} />
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={kpi.code || idx}>
            <KPICard
              title={kpi.nameAr || kpi.name}
              value={kpi.currentValue}
              unit={kpi.unit}
              trend={kpi.trend}
              trendValue={kpi.trendPercentage}
              icon={kpiIcons[kpi.code]?.icon || Speed}
              color={kpiIcons[kpi.code]?.color || COLORS[idx % COLORS.length]}
            />
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Revenue Trend */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              اتجاه الإيرادات
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip />
                <Area type="monotone" dataKey="value" stroke="#2196F3" fill="url(#revenueGrad)" strokeWidth={2} name="الإيرادات" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Health Score + Summary Pie */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={2} direction="column">
            <Grid item>
              <HealthScoreGauge score={overview?.healthScore || 70} />
            </Grid>
            <Grid item>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  توزيع النشاط
                </Typography>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={summaryPie} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {summaryPie.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartTooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Summary Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              الجلسات هذا الشهر
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {summary.sessions?.total || 0}
                </Typography>
                <Typography variant="caption">إجمالي</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {summary.sessions?.completed || 0}
                </Typography>
                <Typography variant="caption">مكتملة</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="text.secondary">
                  {summary.sessions?.completionRate || 0}%
                </Typography>
                <Typography variant="caption">نسبة الإنجاز</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              الشكاوى
            </Typography>
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {summary.complaints?.open || 0}
                </Typography>
                <Typography variant="caption">مفتوحة</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="success.main">
                  {summary.complaints?.resolved || 0}
                </Typography>
                <Typography variant="caption">محلولة</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700} color="text.secondary">
                  {summary.complaints?.resolutionRate || 0}%
                </Typography>
                <Typography variant="caption">نسبة الحل</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              الحضور
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Box>
                <Typography variant="h4" fontWeight={700} color="info.main">
                  {summary.attendance?.presentRate || 0}%
                </Typography>
                <Typography variant="caption">نسبة الحضور</Typography>
              </Box>
              <Box>
                <Typography variant="h4" fontWeight={700}>
                  {summary.attendance?.totalDays || 0}
                </Typography>
                <Typography variant="caption">إجمالي الأيام</Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
