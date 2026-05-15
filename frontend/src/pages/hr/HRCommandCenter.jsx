/**
 * HRCommandCenter.jsx — مركز قيادة الموارد البشرية الذكي
 *
 * لوحة تحكم موحدة وذكية تربط جميع وحدات الموارد البشرية:
 *
 *  Tab 0 — نظرة عامة    : KPIs فورية + اتجاهات + تنبيهات ذكية
 *  Tab 1 — القوى العاملة : تركيب الموظفين + مخاطر الدوران + الخريطة
 *  Tab 2 — الامتثال      : GOSI / SCFHS / إقامة / عقود
 *  Tab 3 — الرواتب       : التوزيع + الميزانية + فجوة الجنسين
 *  Tab 4 — الأداء والتدريب: منحنى الجرس + إنجازات التدريب
 *  Tab 5 — التوصيات      : إجراءات ذكية قابلة للتنفيذ مصنّفة بالأولوية
 */
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  Avatar,
  LinearProgress,
  CircularProgress,
  IconButton,
  Tooltip,
  Button,
  Alert,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Card,
  CardContent,
  Skeleton,
  Divider,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
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
  LineChart,
  Line,
} from 'recharts';
import {
  Groups as WorkforceIcon,
  Security as ComplianceIcon,
  AccountBalance as PayrollIcon,
  TrendingUp as PerformanceIcon,
  School as TrainingIcon,
  LightbulbOutlined as RecommendIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as OkIcon,
  Info as InfoIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Dashboard as DashboardIcon,
  OpenInNew as NavigateIcon,
  Notifications as AlertsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import hrSmartAnalyticsService from '../../services/hr/hrSmartAnalyticsService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

// ─── الألوان ─────────────────────────────────────────────────────────────
const DEPT_COLORS = [
  '#1565C0',
  '#00897B',
  '#E65100',
  '#6A1B9A',
  '#2E7D32',
  '#AD1457',
  '#F57F17',
  '#0277BD',
];
const RISK_COLORS = { high: '#d32f2f', medium: '#f57c00', low: '#388e3c' };
const SEVERITY_COLORS = {
  critical: '#d32f2f',
  high: '#f57c00',
  warning: '#fbc02d',
  info: '#1976d2',
};
const PERF_COLORS = ['#d32f2f', '#f57c00', '#1976d2', '#2e7d32', '#7b1fa2'];

// ─── مكون: بطاقة KPI ─────────────────────────────────────────────────────
const KPICard = memo(({ title, value, subtitle, icon, color, trend, loading }) => {
  if (loading) {
    return (
      <Paper sx={{ p: 2.5, borderRadius: 3, height: 130 }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="40%" height={40} sx={{ mt: 1 }} />
        <Skeleton variant="text" width="70%" height={16} />
      </Paper>
    );
  }

  const trendUp = trend > 0;
  const trendNeutral = trend === 0 || trend == null;

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: 6 },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: color || gradients.primary,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1.1 }}>
            {value ?? '—'}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Avatar
          sx={{
            bgcolor: alpha(color || '#1565C0', 0.12),
            color: color || '#1565C0',
            width: 44,
            height: 44,
          }}
        >
          {icon}
        </Avatar>
      </Box>
      {!trendNeutral && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          {trendUp ? (
            <UpIcon sx={{ fontSize: 14, color: '#2e7d32' }} />
          ) : (
            <DownIcon sx={{ fontSize: 14, color: '#d32f2f' }} />
          )}
          <Typography
            variant="caption"
            sx={{ color: trendUp ? '#2e7d32' : '#d32f2f', fontWeight: 600 }}
          >
            {Math.abs(trend)}%
          </Typography>
          <Typography variant="caption" color="text.disabled">
            مقارنة بالشهر السابق
          </Typography>
        </Box>
      )}
    </Paper>
  );
});

// ─── مكون: تنبيه الامتثال ────────────────────────────────────────────────
const ComplianceAlert = memo(({ alert, onAction }) => {
  const severity = alert.severity;
  const icons = {
    critical: <ErrorIcon fontSize="small" />,
    high: <WarningIcon fontSize="small" />,
    warning: <WarningIcon fontSize="small" />,
    info: <InfoIcon fontSize="small" />,
  };
  const muiSeverity =
    severity === 'critical' || severity === 'high'
      ? 'error'
      : severity === 'warning'
        ? 'warning'
        : 'info';

  return (
    <Alert
      severity={muiSeverity}
      icon={icons[severity]}
      sx={{ mb: 1, borderRadius: 2 }}
      action={
        onAction && (
          <Button
            size="small"
            color="inherit"
            endIcon={<NavigateIcon fontSize="small" />}
            onClick={() => onAction(alert)}
          >
            عرض
          </Button>
        )
      }
    >
      <AlertTitle sx={{ fontWeight: 700 }}>{alert.label}</AlertTitle>
      {alert.count !== undefined && `${alert.count} حالة تتطلب اتخاذ إجراء`}
    </Alert>
  );
});

// ─── مكون: بطاقة توصية ──────────────────────────────────────────────────
const RecommendationCard = memo(({ rec, onNavigate }) => {
  const priorityColor = { critical: '#d32f2f', high: '#f57c00', medium: '#1976d2', low: '#388e3c' };
  const priorityLabel = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: 3,
        borderLeft: `5px solid ${priorityColor[rec.priority] || '#1565C0'}`,
        transition: 'box-shadow .2s',
        '&:hover': { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={priorityLabel[rec.priority] || rec.priority}
                size="small"
                sx={{
                  bgcolor: alpha(priorityColor[rec.priority] || '#1565C0', 0.12),
                  color: priorityColor[rec.priority] || '#1565C0',
                  fontWeight: 700,
                  fontSize: 11,
                }}
              />
              <Chip label={rec.category} size="small" variant="outlined" sx={{ fontSize: 11 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {rec.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {rec.description}
            </Typography>
          </Box>
          {rec.count != null && (
            <Avatar
              sx={{
                bgcolor: alpha(priorityColor[rec.priority], 0.15),
                color: priorityColor[rec.priority],
                fontWeight: 800,
                width: 40,
                height: 40,
                ml: 2,
              }}
            >
              {rec.count}
            </Avatar>
          )}
        </Box>
        {rec.action === 'navigate' && rec.target && (
          <Button
            size="small"
            variant="outlined"
            endIcon={<NavigateIcon fontSize="small" />}
            onClick={() => onNavigate(rec.target)}
            sx={{ mt: 0.5 }}
          >
            اتخاذ إجراء
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

// ─── مكون: صف بيانات مخاطر الموظف ───────────────────────────────────────
const RiskRow = memo(({ emp }) => (
  <TableRow hover>
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar
          sx={{
            width: 32,
            height: 32,
            fontSize: 13,
            bgcolor: `${RISK_COLORS[emp.riskLevel]}22`,
            color: RISK_COLORS[emp.riskLevel],
          }}
        >
          {emp.name_ar?.charAt(0)}
        </Avatar>
        <Box>
          <Typography variant="body2" fontWeight={600}>
            {emp.name_ar}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {emp.department}
          </Typography>
        </Box>
      </Box>
    </TableCell>
    <TableCell>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinearProgress
          variant="determinate"
          value={emp.riskScore * 100}
          sx={{
            height: 8,
            borderRadius: 4,
            width: 80,
            bgcolor: `${RISK_COLORS[emp.riskLevel]}22`,
            '& .MuiLinearProgress-bar': { bgcolor: RISK_COLORS[emp.riskLevel] },
          }}
        />
        <Typography variant="body2" fontWeight={700} sx={{ color: RISK_COLORS[emp.riskLevel] }}>
          {Math.round(emp.riskScore * 100)}%
        </Typography>
      </Box>
    </TableCell>
    <TableCell>
      <Chip
        label={
          emp.riskLevel === 'high' ? 'عالية' : emp.riskLevel === 'medium' ? 'متوسطة' : 'منخفضة'
        }
        size="small"
        sx={{
          bgcolor: `${RISK_COLORS[emp.riskLevel]}20`,
          color: RISK_COLORS[emp.riskLevel],
          fontWeight: 700,
        }}
      />
    </TableCell>
    <TableCell>
      <Typography variant="caption" color="text.secondary">
        {emp.factors.tenureMonths != null ? `${emp.factors.tenureMonths} شهر` : '—'}
      </Typography>
    </TableCell>
    <TableCell>
      <Typography variant="caption" color="text.secondary">
        {emp.factors.absenceRate}%
      </Typography>
    </TableCell>
  </TableRow>
));

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────
const HRCommandCenter = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await hrSmartAnalyticsService.getFullDashboard();
      setData(result?.data ?? result);
      setLastUpdated(new Date());
    } catch {
      showSnackbar('تعذر تحميل بيانات HR الذكية', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigate = useCallback(
    path => {
      navigate(path);
    },
    [navigate]
  );

  // ─── KPIs الرئيسية ──────────────────────────────────────────────────
  const kpiCards = useMemo(() => {
    if (!data) return [];
    const w = data.intelligence?.workforce;
    const t = data.intelligence?.turnover;
    const c = data.compliance;
    const p = data.intelligence?.payroll;
    return [
      {
        title: 'إجمالي الموظفين',
        value: w?.total?.toLocaleString('ar-SA') ?? '—',
        subtitle: `+${w?.hiresThisMonth ?? 0} هذا الشهر`,
        icon: <WorkforceIcon />,
        color: '#1565C0',
        trend: null,
      },
      {
        title: 'معدل الاحتفاظ',
        value: t ? `${t.retentionRate}%` : '—',
        subtitle: `دوران ${t?.rate12m ?? 0}% / 12 شهر`,
        icon: <PerformanceIcon />,
        color: t?.retentionRate >= 85 ? '#2e7d32' : '#f57c00',
        trend: null,
      },
      {
        title: 'درجة الامتثال',
        value: c ? `${c.complianceScore}%` : '—',
        subtitle: `${c?.alerts?.length ?? 0} تنبيه نشط`,
        icon: <ComplianceIcon />,
        color:
          c?.complianceScore >= 90 ? '#2e7d32' : c?.complianceScore >= 75 ? '#f57c00' : '#d32f2f',
        trend: null,
      },
      {
        title: 'متوسط الراتب الأساسي',
        value: p?.avgBasicSalary ? `${p.avgBasicSalary.toLocaleString('ar-SA')} ريال` : '—',
        subtitle: `إجمالي العبء: ${p?.totalMonthlyBurden?.toLocaleString('ar-SA') ?? '—'}`,
        icon: <PayrollIcon />,
        color: '#7b1fa2',
        trend: null,
      },
      {
        title: 'إنجاز التدريب',
        value: data.training?.completionRate != null ? `${data.training.completionRate}%` : '—',
        subtitle: `${data.training?.completedTrainings ?? 0} من ${data.training?.totalTrainings ?? 0} برنامج`,
        icon: <TrainingIcon />,
        color: '#00897B',
        trend: null,
      },
      {
        title: 'توصيات ذكية',
        value: data.recommendations?.length ?? 0,
        subtitle: `${data.recommendations?.filter(r => r.priority === 'critical').length ?? 0} حرجة`,
        icon: <RecommendIcon />,
        color: '#E65100',
        trend: null,
      },
    ];
  }, [data]);

  // ─── بيانات الرسوم البيانية ──────────────────────────────────────────
  const deptChartData = useMemo(
    () =>
      (data?.intelligence?.workforce?.departmentBreakdown ?? []).map((d, i) => ({
        name: d._id ?? 'غير محدد',
        value: d.count,
        fill: DEPT_COLORS[i % DEPT_COLORS.length],
      })),
    [data]
  );

  const salaryDeptData = useMemo(
    () =>
      (data?.payroll?.salaryByDepartment ?? []).map(d => ({
        name: d.department ?? 'غير محدد',
        avgSalary: d.avgSalary,
        burden: Math.round(d.totalBurden / 1000),
      })),
    [data]
  );

  const perfDistData = useMemo(
    () =>
      (data?.performance?.distribution ?? []).map((d, i) => ({
        name: d.range,
        value: d.count,
        fill: PERF_COLORS[i % PERF_COLORS.length],
      })),
    [data]
  );

  const trainingTrendData = useMemo(
    () =>
      (data?.training?.monthlyTrend ?? []).map(t => ({
        month: `شهر ${t.month}`,
        total: t.total,
        completed: t.completed,
      })),
    [data]
  );

  // ─── التبويبات ──────────────────────────────────────────────────────
  const TABS = [
    { label: 'نظرة عامة', icon: <DashboardIcon fontSize="small" /> },
    { label: 'القوى العاملة', icon: <WorkforceIcon fontSize="small" /> },
    { label: 'الامتثال', icon: <ComplianceIcon fontSize="small" /> },
    { label: 'الرواتب', icon: <PayrollIcon fontSize="small" /> },
    { label: 'الأداء والتدريب', icon: <PerformanceIcon fontSize="small" /> },
    { label: 'التوصيات', icon: <RecommendIcon fontSize="small" /> },
  ];

  const criticalAlerts = (data?.compliance?.alerts ?? []).filter(
    a => a.severity === 'critical' || a.severity === 'high'
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3, direction: 'rtl' }}>
      {/* ── رأس الصفحة ── */}
      <Box
        sx={{
          background: gradients.primary,
          borderRadius: 3,
          p: 3,
          mb: 3,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52 }}>
            <DashboardIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight={800}>
              مركز قيادة الموارد البشرية
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              تحليلات ذكية شاملة —{' '}
              {new Date().toLocaleDateString('ar-SA', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {criticalAlerts.length > 0 && (
            <Chip
              icon={<AlertsIcon sx={{ fontSize: 16 }} />}
              label={`${criticalAlerts.length} تنبيه حرج`}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 700 }}
              onClick={() => setActiveTab(2)}
            />
          )}
          <Tooltip
            title={lastUpdated ? `آخر تحديث: ${lastUpdated.toLocaleTimeString('ar-SA')}` : 'تحديث'}
          >
            <IconButton
              sx={{
                color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
              }}
              onClick={loadData}
              disabled={loading}
            >
              <RefreshIcon
                sx={{
                  animation: loading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': { '100%': { transform: 'rotate(360deg)' } },
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── شريط التقدم ── */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* ── بطاقات KPI ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {(loading ? Array(6).fill(null) : kpiCards).map((card, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            {loading ? (
              <Skeleton variant="rectangular" height={130} sx={{ borderRadius: 3 }} />
            ) : (
              <KPICard {...card} />
            )}
          </Grid>
        ))}
      </Grid>

      {/* ── التبويبات ── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 60, gap: 0.5 },
          }}
        >
          {TABS.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ══ تبويب 0: نظرة عامة ══ */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* توزيع الأقسام */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  توزيع الموظفين حسب الأقسام
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
                ) : deptChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={deptChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={110}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {deptChartData.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Pie>
                      <RTooltip formatter={v => [`${v} موظف`, 'العدد']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: 280,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography>لا توجد بيانات</Typography>
                  </Box>
                )}
              </Grid>

              {/* أبرز التنبيهات */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  أبرز التنبيهات
                  {(data?.compliance?.alerts?.length ?? 0) > 0 && (
                    <Badge
                      badgeContent={data.compliance.alerts.length}
                      color="error"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                {loading ? (
                  <>
                    {[1, 2, 3].map(i => (
                      <Skeleton
                        key={i}
                        variant="rectangular"
                        height={60}
                        sx={{ mb: 1, borderRadius: 2 }}
                      />
                    ))}
                  </>
                ) : (data?.compliance?.alerts ?? []).length === 0 ? (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    <AlertTitle>ممتاز</AlertTitle>
                    لا توجد تنبيهات امتثال نشطة — النظام في وضع جيد
                  </Alert>
                ) : (
                  data.compliance.alerts
                    .slice(0, 5)
                    .map((alert, i) => (
                      <ComplianceAlert key={i} alert={alert} onAction={() => setActiveTab(2)} />
                    ))
                )}
              </Grid>

              {/* إحصاءات الدوران */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    مؤشرات الدوران (12 شهر)
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={120} />
                  ) : (
                    <Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          معدل الدوران
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={
                            data?.intelligence?.turnover?.rate12m > 15
                              ? 'error.main'
                              : 'success.main'
                          }
                        >
                          {data?.intelligence?.turnover?.rate12m ?? 0}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(data?.intelligence?.turnover?.rate12m ?? 0, 100)}
                        color={data?.intelligence?.turnover?.rate12m > 15 ? 'error' : 'success'}
                        sx={{ height: 8, borderRadius: 4, mb: 2 }}
                      />
                      <Divider sx={{ mb: 2 }} />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          توظيفات جديدة
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="success.main">
                          +{data?.intelligence?.turnover?.hires12m ?? 0}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          مغادرات
                        </Typography>
                        <Typography variant="body2" fontWeight={700} color="error.main">
                          -{data?.intelligence?.turnover?.terminations12m ?? 0}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* إحصاءات أنواع العقود */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    أنواع العقود
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={120} />
                  ) : (
                    <Box>
                      {Object.entries(data?.intelligence?.workforce?.contractTypes ?? {}).map(
                        ([type, count], i) => {
                          const labels = {
                            fixed: 'محدد المدة',
                            indefinite: 'غير محدد',
                            flexible: 'مرن',
                            part_time: 'دوام جزئي',
                          };
                          const total = data?.intelligence?.workforce?.total || 1;
                          return (
                            <Box key={i} sx={{ mb: 1.5 }}>
                              <Box
                                sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
                              >
                                <Typography variant="body2">{labels[type] || type}</Typography>
                                <Typography variant="body2" fontWeight={700}>
                                  {count}
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={Math.round((count / total) * 100)}
                                sx={{
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: `${DEPT_COLORS[i]}22`,
                                  '& .MuiLinearProgress-bar': { bgcolor: DEPT_COLORS[i] },
                                }}
                              />
                            </Box>
                          );
                        }
                      )}
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* نافذة سريعة للتوصيات الحرجة */}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    height: '100%',
                    border: `1px solid ${alpha('#d32f2f', 0.3)}`,
                  }}
                >
                  <Typography
                    variant="subtitle1"
                    fontWeight={700}
                    sx={{ mb: 2, color: 'error.main' }}
                  >
                    إجراءات عاجلة
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={120} />
                  ) : (data?.recommendations ?? []).filter(
                      r => r.priority === 'critical' || r.priority === 'high'
                    ).length === 0 ? (
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}
                    >
                      <OkIcon />
                      <Typography variant="body2">لا توجد إجراءات عاجلة</Typography>
                    </Box>
                  ) : (
                    data.recommendations
                      .filter(r => r.priority === 'critical' || r.priority === 'high')
                      .slice(0, 3)
                      .map((rec, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1,
                            mb: 1.5,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: alpha(
                              SEVERITY_COLORS[rec.priority === 'critical' ? 'critical' : 'high'],
                              0.07
                            ),
                            cursor: 'pointer',
                          }}
                          onClick={() => setActiveTab(5)}
                        >
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: alpha(
                                SEVERITY_COLORS[rec.priority === 'critical' ? 'critical' : 'high'],
                                0.15
                              ),
                              color:
                                SEVERITY_COLORS[rec.priority === 'critical' ? 'critical' : 'high'],
                            }}
                          >
                            <WarningIcon sx={{ fontSize: 16 }} />
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {rec.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {rec.count != null ? `${rec.count} حالة` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      ))
                  )}
                  {!loading && (data?.recommendations?.length ?? 0) > 0 && (
                    <Button size="small" onClick={() => setActiveTab(5)} sx={{ mt: 1 }}>
                      عرض جميع التوصيات ({data.recommendations.length})
                    </Button>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ══ تبويب 1: القوى العاملة ══ */}
          {activeTab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  درجات مخاطرة الموظفين بالمغادرة
                  <Chip
                    label="AI-Powered"
                    size="small"
                    color="primary"
                    sx={{ ml: 1, fontWeight: 700 }}
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  تُحسب الدرجة بناءً على معدل الغياب والتأخر، نتائج تقييم الأداء، سنوات الخبرة،
                  ونهاية العقد
                </Typography>
              </Grid>
              <Grid item xs={12}>
                {loading ? (
                  <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                ) : (
                  <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                          <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>درجة المخاطرة</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>المستوى</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>مدة الخدمة</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>معدل الغياب</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(data?.riskScores ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={5}
                              align="center"
                              sx={{ py: 4, color: 'text.secondary' }}
                            >
                              لا توجد بيانات كافية لحساب درجات المخاطرة
                            </TableCell>
                          </TableRow>
                        ) : (
                          (data.riskScores ?? []).map((emp, i) => <RiskRow key={i} emp={emp} />)
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Grid>

              {/* توزيع الجنس */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    توزيع الجنس
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={200} />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={Object.entries(
                            data?.intelligence?.workforce?.genderBreakdown ?? {}
                          ).map(([k, v]) => ({
                            name: k === 'male' ? 'ذكر' : 'أنثى',
                            value: v,
                            fill: k === 'male' ? '#1565C0' : '#AD1457',
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {Object.entries(data?.intelligence?.workforce?.genderBreakdown ?? {}).map(
                            ([k], i) => (
                              <Cell key={i} fill={k === 'male' ? '#1565C0' : '#AD1457'} />
                            )
                          )}
                        </Pie>
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </Paper>
              </Grid>

              {/* توظيفات مقابل مغادرات */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    دوران الموظفين (12 شهر)
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={200} />
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            توظيفات جديدة
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color="success.main">
                            +{data?.intelligence?.turnover?.hires12m ?? 0}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(
                            ((data?.intelligence?.turnover?.hires12m ?? 0) /
                              (data?.intelligence?.workforce?.total || 1)) *
                              100 *
                              5,
                            100
                          )}
                          color="success"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" color="text.secondary">
                            مغادرات
                          </Typography>
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            -{data?.intelligence?.turnover?.terminations12m ?? 0}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(
                            ((data?.intelligence?.turnover?.terminations12m ?? 0) /
                              (data?.intelligence?.workforce?.total || 1)) *
                              100 *
                              5,
                            100
                          )}
                          color="error"
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Divider />
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-around',
                          textAlign: 'center',
                        }}
                      >
                        <Box>
                          <Typography variant="h5" fontWeight={800} color="success.main">
                            {data?.intelligence?.turnover?.retentionRate ?? 0}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            معدل الاستبقاء
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="h5"
                            fontWeight={800}
                            color={
                              data?.intelligence?.turnover?.rate12m > 15
                                ? 'error.main'
                                : 'warning.main'
                            }
                          >
                            {data?.intelligence?.turnover?.rate12m ?? 0}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            معدل الدوران
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ══ تبويب 2: الامتثال ══ */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              {/* نقاط الامتثال */}
              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    درجة الامتثال
                  </Typography>
                  {loading ? (
                    <Skeleton variant="circular" width={140} height={140} sx={{ mx: 'auto' }} />
                  ) : (
                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                      <CircularProgress
                        variant="determinate"
                        value={data?.compliance?.complianceScore ?? 0}
                        size={140}
                        thickness={8}
                        sx={{
                          color:
                            data?.compliance?.complianceScore >= 90
                              ? '#2e7d32'
                              : data?.compliance?.complianceScore >= 75
                                ? '#f57c00'
                                : '#d32f2f',
                        }}
                      />
                      <Box
                        sx={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight={800}>
                            {data?.compliance?.complianceScore ?? 0}%
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            من 100
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* قائمة التنبيهات */}
              <Grid item xs={12} md={9}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  تنبيهات الامتثال
                  {(data?.compliance?.alerts?.length ?? 0) > 0 && (
                    <Chip
                      label={data.compliance.alerts.length}
                      color="error"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
                {loading ? (
                  [1, 2, 3, 4].map(i => (
                    <Skeleton
                      key={i}
                      variant="rectangular"
                      height={70}
                      sx={{ mb: 1, borderRadius: 2 }}
                    />
                  ))
                ) : (data?.compliance?.alerts ?? []).length === 0 ? (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    <AlertTitle>سجل نظيف</AlertTitle>
                    جميع الموظفين مستوفون لمتطلبات الامتثال — استمر في المراقبة الدورية
                  </Alert>
                ) : (
                  data.compliance.alerts.map((alert, i) => (
                    <ComplianceAlert
                      key={i}
                      alert={alert}
                      onAction={a => {
                        const routes = {
                          gosi: '/hr/employees',
                          scfhs_expired: '/hr/credential-expiry',
                          scfhs_expiring: '/hr/credential-expiry',
                          iqama_expired: '/hr/work-permits',
                          iqama_expiring: '/hr/work-permits',
                          contracts_expiring: '/hr/contracts',
                          contracts_expired: '/hr/contracts',
                          certs_expiring: '/hr/credential-expiry',
                        };
                        if (routes[a.type]) navigate(routes[a.type]);
                      }}
                    />
                  ))
                )}
              </Grid>

              {/* ملخص الامتثال */}
              <Grid item xs={12}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    ملخص الامتثال التفصيلي
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={120} />
                  ) : (
                    <Grid container spacing={2}>
                      {[
                        {
                          label: 'موظفون بدون GOSI',
                          value: data?.compliance?.gosi?.unregistered ?? 0,
                          color: '#d32f2f',
                          target: '/hr/employees',
                        },
                        {
                          label: 'تراخيص SCFHS منتهية',
                          value: data?.compliance?.scfhs?.expired ?? 0,
                          color: '#d32f2f',
                          target: '/hr/credential-expiry',
                        },
                        {
                          label: 'SCFHS تنتهي قريباً',
                          value: data?.compliance?.scfhs?.expiring ?? 0,
                          color: '#f57c00',
                          target: '/hr/credential-expiry',
                        },
                        {
                          label: 'إقامات منتهية',
                          value: data?.compliance?.iqama?.expired ?? 0,
                          color: '#d32f2f',
                          target: '/hr/work-permits',
                        },
                        {
                          label: 'إقامات تنتهي قريباً',
                          value: data?.compliance?.iqama?.expiring ?? 0,
                          color: '#f57c00',
                          target: '/hr/work-permits',
                        },
                        {
                          label: 'عقود تنتهي قريباً',
                          value: data?.compliance?.contracts?.expiring ?? 0,
                          color: '#f57c00',
                          target: '/hr/contracts',
                        },
                      ].map((item, i) => (
                        <Grid item xs={6} sm={4} md={2} key={i}>
                          <Paper
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              textAlign: 'center',
                              cursor: 'pointer',
                              transition: 'box-shadow .2s',
                              '&:hover': { boxShadow: 3 },
                              border: `1px solid ${alpha(item.color, item.value > 0 ? 0.4 : 0.1)}`,
                            }}
                            onClick={() => navigate(item.target)}
                          >
                            <Typography
                              variant="h4"
                              fontWeight={800}
                              sx={{ color: item.value > 0 ? item.color : '#2e7d32' }}
                            >
                              {item.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {item.label}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ══ تبويب 3: الرواتب ══ */}
          {activeTab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                  متوسط الراتب الأساسي حسب الأقسام
                </Typography>
                {loading ? (
                  <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
                ) : salaryDeptData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={salaryDeptData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v.toLocaleString()}`} />
                      <RTooltip
                        formatter={(v, name) => [
                          v.toLocaleString('ar-SA') + ' ريال',
                          name === 'avgSalary' ? 'متوسط الراتب' : 'عبء ألف ريال',
                        ]}
                      />
                      <Legend
                        formatter={v =>
                          v === 'avgSalary' ? 'متوسط الراتب الأساسي' : 'إجمالي العبء (ألف)'
                        }
                      />
                      <Bar dataKey="avgSalary" fill="#1565C0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                    <Typography>لا توجد بيانات رواتب متاحة</Typography>
                  </Box>
                )}
              </Grid>

              {/* فجوة الراتب */}
              {data?.payroll?.genderPayGap && (
                <Grid item xs={12} md={6}>
                  <Paper
                    sx={{ p: 2.5, borderRadius: 3, border: `1px solid ${alpha('#AD1457', 0.3)}` }}
                  >
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      فجوة الراتب بين الجنسين
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={800} color="primary.main">
                          {data.payroll.genderPayGap.male?.avgSalary?.toLocaleString('ar-SA') ??
                            '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          متوسط راتب الذكور
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={800} sx={{ color: '#AD1457' }}>
                          {data.payroll.genderPayGap.female?.avgSalary?.toLocaleString('ar-SA') ??
                            '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          متوسط راتب الإناث
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h4" fontWeight={800} color="warning.main">
                          {data.payroll.genderPayGap.gapPercent ?? 0}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          فجوة الراتب
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              )}

              {/* ملخص الراتب الكلي */}
              <Grid item xs={12} md={data?.payroll?.genderPayGap ? 6 : 12}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    ملخص الرواتب الشهرية
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={120} />
                  ) : (
                    <Grid container spacing={2}>
                      {[
                        {
                          label: 'متوسط الراتب الأساسي',
                          value: `${data?.payroll?.salaryByDepartment?.length > 0 ? '' : ''}${data?.intelligence?.payroll?.avgBasicSalary?.toLocaleString('ar-SA') ?? '—'} ريال`,
                        },
                        {
                          label: 'أعلى راتب أساسي',
                          value: `${data?.intelligence?.payroll?.maxSalary?.toLocaleString('ar-SA') ?? '—'} ريال`,
                        },
                        {
                          label: 'أدنى راتب أساسي',
                          value: `${data?.intelligence?.payroll?.minSalary?.toLocaleString('ar-SA') ?? '—'} ريال`,
                        },
                        {
                          label: 'إجمالي العبء الشهري',
                          value: `${data?.intelligence?.payroll?.totalMonthlyBurden?.toLocaleString('ar-SA') ?? '—'} ريال`,
                        },
                      ].map((item, i) => (
                        <Grid item xs={12} sm={6} key={i}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: alpha(theme.palette.primary.main, 0.05),
                              borderRadius: 2,
                            }}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {item.label}
                            </Typography>
                            <Typography variant="h6" fontWeight={700}>
                              {item.value}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </Paper>
              </Grid>

              {/* فرق الراتب حسب سنوات الخبرة */}
              {(data?.payroll?.tenureBands ?? []).length > 0 && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      متوسط الراتب حسب سنوات الخبرة
                    </Typography>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.payroll.tenureBands}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={v => `${v.toLocaleString()}`} />
                        <RTooltip
                          formatter={v => [`${v.toLocaleString('ar-SA')} ريال`, 'متوسط الراتب']}
                        />
                        <Bar dataKey="avgSalary" fill="#7b1fa2" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}

          {/* ══ تبويب 4: الأداء والتدريب ══ */}
          {activeTab === 4 && (
            <Grid container spacing={3}>
              {/* توزيع الأداء */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    توزيع الأداء (منحنى الجرس)
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={260} />
                  ) : perfDistData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={perfDistData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <RTooltip />
                        <Bar dataKey="value" label={{ position: 'top' }}>
                          {perfDistData.map((d, i) => (
                            <Cell key={i} fill={d.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <Typography>لا توجد بيانات تقييم أداء لهذا العام</Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* اتجاه التدريب */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    اتجاهات إنجاز التدريب الشهري
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={260} />
                  ) : trainingTrendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={trainingTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <RTooltip />
                        <Legend formatter={v => (v === 'total' ? 'إجمالي' : 'مكتمل')} />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#1565C0"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="completed"
                          stroke="#2e7d32"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      <Typography>لا توجد بيانات تدريب لهذا العام</Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>

              {/* إحصاءات الأداء */}
              {data?.performance && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                      أصحاب الأداء المتميز ({data.performance.year})
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700 }}>الموظف</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>القسم</TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>الدرجة</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(data.performance.topPerformers ?? []).length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                align="center"
                                sx={{ py: 3, color: 'text.secondary' }}
                              >
                                لا توجد بيانات
                              </TableCell>
                            </TableRow>
                          ) : (
                            (data.performance.topPerformers ?? []).slice(0, 8).map((p, i) => (
                              <TableRow key={i} hover>
                                <TableCell>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Avatar
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        bgcolor: '#7b1fa2',
                                        fontSize: 12,
                                      }}
                                    >
                                      {i + 1}
                                    </Avatar>
                                    <Typography variant="body2">
                                      {p.employee_id?.name_ar ?? 'غير محدد'}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="caption">
                                    {p.employee_id?.department ?? '—'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={p.overall_score?.toFixed(1) ?? '—'}
                                    size="small"
                                    sx={{ bgcolor: '#7b1fa220', color: '#7b1fa2', fontWeight: 700 }}
                                  />
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Grid>
              )}

              {/* إحصاءات التدريب */}
              <Grid item xs={12} md={data?.performance ? 6 : 12}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                    ملخص فاعلية التدريب
                  </Typography>
                  {loading ? (
                    <Skeleton variant="rectangular" height={200} />
                  ) : (
                    <Box>
                      <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h3" fontWeight={800} color="success.main">
                          {data?.training?.completionRate ?? 0}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          معدل إنجاز البرامج التدريبية
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={data?.training?.completionRate ?? 0}
                          color="success"
                          sx={{ height: 10, borderRadius: 5, mt: 1 }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={800} color="primary.main">
                            {data?.training?.totalTrainings ?? 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            إجمالي البرامج
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={800} color="success.main">
                            {data?.training?.completedTrainings ?? 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            مكتملة
                          </Typography>
                        </Grid>
                        <Grid item xs={4} sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" fontWeight={800} color="warning.main">
                            {(data?.training?.totalTrainings ?? 0) -
                              (data?.training?.completedTrainings ?? 0)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            جارية
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ══ تبويب 5: التوصيات الذكية ══ */}
          {activeTab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <Avatar
                    sx={{
                      bgcolor: alpha('#E65100', 0.12),
                      color: '#E65100',
                      width: 48,
                      height: 48,
                    }}
                  >
                    <RecommendIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      التوصيات الذكية القابلة للتنفيذ
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      مُولَّدة بناءً على تحليل شامل لبيانات الموارد البشرية — تُحدَّث تلقائياً
                    </Typography>
                  </Box>
                  <Chip
                    label={`AI-Powered`}
                    size="small"
                    icon={<RecommendIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      ml: 'auto',
                      bgcolor: alpha('#E65100', 0.1),
                      color: '#E65100',
                      fontWeight: 700,
                    }}
                  />
                </Box>
              </Grid>

              {loading ? (
                [1, 2, 3].map(i => (
                  <Grid item xs={12} key={i}>
                    <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 3, mb: 1 }} />
                  </Grid>
                ))
              ) : (data?.recommendations ?? []).length === 0 ? (
                <Grid item xs={12}>
                  <Alert severity="success" sx={{ borderRadius: 3, p: 3 }}>
                    <AlertTitle sx={{ fontSize: '1.1rem', fontWeight: 800 }}>
                      النظام في وضع ممتاز
                    </AlertTitle>
                    لا توجد توصيات عاجلة — جميع مؤشرات الموارد البشرية ضمن النطاقات المقبولة. استمر
                    في المراقبة الدورية للحفاظ على هذا المستوى.
                  </Alert>
                </Grid>
              ) : (
                <Grid item xs={12}>
                  {data.recommendations.map((rec, i) => (
                    <RecommendationCard key={i} rec={rec} onNavigate={handleNavigate} />
                  ))}
                </Grid>
              )}

              {/* ملاحظة منهجية */}
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    <strong>منهجية الحساب:</strong> تُحسب درجة مخاطر الدوران بناءً على أربعة عوامل:
                    معدل الغياب والتأخر (30%)، نتيجة آخر تقييم أداء (30%)، مدة الخدمة (20%)، وقرب
                    انتهاء العقد (20%). تُولَّد التوصيات تلقائياً عند تجاوز الحدود المرجعية لكل
                    مؤشر.
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default HRCommandCenter;
