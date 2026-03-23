/**
 * CEO Executive Dashboard — لوحة تحكم الإدارة التنفيذية
 * Phase 19 — شاشة واحدة شاملة بمؤشرات أداء حية
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardActionArea,
  Chip, LinearProgress, Alert, Snackbar, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Tooltip, Divider, Badge, MenuItem, Select,
  FormControl, InputLabel, CircularProgress, Button, Tab, Tabs,
  List, ListItem, ListItemIcon, ListItemText, Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  People as PeopleIcon,
  Accessibility as BeneficiaryIcon,
  Hotel as OccupancyIcon,
  School as TrainingIcon,
  VerifiedUser as ComplianceIcon,
  SentimentSatisfied as SatisfactionIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Flag as GoalIcon,
  Business as DeptIcon,
  Speed as SpeedIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  Description as ExportIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
  AccountBalance as FinanceIcon,
  LocalHospital as MedicalIcon,
  Analytics as AnalyticsIcon,
  Notifications as AlertIcon,
  Compare as CompareIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import ceoDashboardService from '../../services/ceoDashboardService';

/* ════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════ */
const fmt = (v, f) => {
  if (f === 'currency') return `${(v || 0).toLocaleString('ar-SA')} ر.س`;
  if (f === 'percent') return `${v || 0}%`;
  return (v || 0).toLocaleString('ar-SA');
};

const trendColor = (t) => (t === 'up' ? 'success.main' : 'error.main');
const trendIcon = (t) => (t === 'up' ? <TrendUpIcon fontSize="small" /> : <TrendDownIcon fontSize="small" />);

const severityColor = { critical: 'error', warning: 'warning', info: 'info' };
const severityIcon = { critical: <ErrorIcon />, warning: <WarningIcon />, info: <InfoIcon /> };
const severityLabel = { critical: 'حرج', warning: 'تحذير', info: 'معلومات' };

const goalStatusColor = { on_track: 'success', at_risk: 'warning', behind: 'error', completed: 'info', not_started: 'default' };
const goalStatusLabel = { on_track: 'على المسار', at_risk: 'معرض للخطر', behind: 'متأخر', completed: 'مكتمل', not_started: 'لم يبدأ' };

/* ════════════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════════════ */
export default function CEODashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  /* ── load ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ceoDashboardService.getDashboard();
      setDashboard(res.data?.data || res.data);
    } catch {
      setSnack({ open: true, msg: 'خطأ في تحميل لوحة التحكم التنفيذية', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!dashboard) {
    return <Alert severity="error" sx={{ m: 2 }}>لا توجد بيانات</Alert>;
  }

  const {
    summary, financialKpis, operationalKpis, hrKpis, qualityKpis,
    alerts, alertCounts, goalProgress, topGoals, departmentRanking, lastUpdated,
  } = dashboard;

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ p: { xs: 1, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DashboardIcon sx={{ fontSize: 36, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" fontWeight={700}>لوحة تحكم الإدارة التنفيذية</Typography>
            <Typography variant="body2" color="text.secondary">
              آخر تحديث: {new Date(lastUpdated).toLocaleString('ar-SA')}
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث البيانات">
          <IconButton onClick={load} color="primary"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* ══════════════════════════════════════════════
         TOP KPI CARDS — بطاقات المؤشرات الرئيسية
         ══════════════════════════════════════════════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الإيرادات', value: summary.totalRevenue, format: 'currency', icon: <MoneyIcon />, color: '#1976d2' },
          { label: 'صافي الدخل', value: summary.netIncome, format: 'currency', icon: <FinanceIcon />, color: '#388e3c' },
          { label: 'المستفيدين النشطين', value: summary.activeBeneficiaries, format: 'number', icon: <BeneficiaryIcon />, color: '#f57c00' },
          { label: 'نسبة الإشغال', value: summary.occupancyRate, format: 'percent', icon: <OccupancyIcon />, color: '#7b1fa2' },
          { label: 'عدد الموظفين', value: summary.staffCount, format: 'number', icon: <PeopleIcon />, color: '#0097a7' },
          { label: 'رضا المستفيدين', value: summary.satisfactionScore, format: 'percent', icon: <SatisfactionIcon />, color: '#c2185b' },
          { label: 'التدفق النقدي', value: summary.cashFlow, format: 'currency', icon: <TrendUpIcon />, color: '#5d4037' },
          { label: 'إجمالي المصروفات', value: summary.totalExpenses, format: 'currency', icon: <SpeedIcon />, color: '#d32f2f' },
        ].map((card, idx) => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={idx}>
            <Card sx={{ borderTop: `4px solid ${card.color}`, height: '100%' }}>
              <CardContent sx={{ textAlign: 'center', p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar sx={{ bgcolor: card.color, width: 36, height: 36, mx: 'auto', mb: 0.5 }}>
                  {card.icon}
                </Avatar>
                <Typography variant="h6" fontWeight={700} sx={{ fontSize: { xs: '0.9rem', md: '1.1rem' } }}>
                  {fmt(card.value, card.format)}
                </Typography>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ══════════════════════════════════════════════
         TABS — ألسنة التبويب
         ══════════════════════════════════════════════ */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<AnalyticsIcon />} label="المؤشرات" />
          <Tab icon={<Badge badgeContent={alertCounts.critical} color="error"><AlertIcon /></Badge>} label="التنبيهات" />
          <Tab icon={<GoalIcon />} label="الأهداف" />
          <Tab icon={<DeptIcon />} label="الأقسام" />
        </Tabs>
      </Paper>

      {/* ── Tab 0: KPIs ── */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {/* Financial */}
          <Grid item xs={12} md={6}>
            <KPISection title="المؤشرات المالية" icon={<MoneyIcon />} kpis={financialKpis} color="#1976d2" />
          </Grid>
          {/* Operational */}
          <Grid item xs={12} md={6}>
            <KPISection title="المؤشرات التشغيلية" icon={<SpeedIcon />} kpis={operationalKpis} color="#f57c00" />
          </Grid>
          {/* HR */}
          <Grid item xs={12} md={6}>
            <KPISection title="الموارد البشرية" icon={<PeopleIcon />} kpis={hrKpis} color="#e64a19" />
          </Grid>
          {/* Quality */}
          <Grid item xs={12} md={6}>
            <KPISection title="الجودة والامتثال" icon={<ComplianceIcon />} kpis={qualityKpis} color="#c2185b" />
          </Grid>
        </Grid>
      )}

      {/* ── Tab 1: Alerts ── */}
      {tab === 1 && (
        <Box>
          {/* Alert summary badges */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Chip icon={<ErrorIcon />} label={`حرج: ${alertCounts.critical}`} color="error" variant="outlined" />
            <Chip icon={<WarningIcon />} label={`تحذير: ${alertCounts.warning}`} color="warning" variant="outlined" />
            <Chip icon={<InfoIcon />} label={`معلومات: ${alertCounts.info}`} color="info" variant="outlined" />
          </Box>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.100' }}>
                  <TableCell align="right">الأهمية</TableCell>
                  <TableCell align="right">التنبيه</TableCell>
                  <TableCell align="right">القسم</TableCell>
                  <TableCell align="right">الحالة</TableCell>
                  <TableCell align="right">التاريخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell align="right">
                      <Chip
                        icon={severityIcon[a.severity]}
                        label={severityLabel[a.severity]}
                        color={severityColor[a.severity]}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={a.isRead ? 400 : 700}>{a.titleAr}</Typography>
                      <Typography variant="caption" color="text.secondary">{a.descriptionAr}</Typography>
                    </TableCell>
                    <TableCell align="right">{a.department}</TableCell>
                    <TableCell align="right">
                      {a.isResolved
                        ? <Chip label="تم الحل" color="success" size="small" icon={<CheckIcon />} />
                        : a.actionRequired
                          ? <Chip label="يتطلب إجراء" color="error" size="small" />
                          : <Chip label="مفتوح" size="small" />
                      }
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(a.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                  </TableRow>
                ))}
                {alerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography color="text.secondary">لا توجد تنبيهات نشطة</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Tab 2: Strategic Goals ── */}
      {tab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6">التقدم العام للأهداف الاستراتيجية</Typography>
            <Chip label={`${goalProgress}%`} color="primary" />
          </Box>
          <LinearProgress variant="determinate" value={goalProgress} sx={{ height: 10, borderRadius: 5, mb: 3 }} />
          <Grid container spacing={2}>
            {topGoals.map((g) => (
              <Grid item xs={12} sm={6} md={4} key={g.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight={600}>{g.nameAr}</Typography>
                      <Chip label={goalStatusLabel[g.status]} color={goalStatusColor[g.status]} size="small" />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{g.description}</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption">التقدم</Typography>
                      <Typography variant="caption" fontWeight={600}>{g.progress}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={g.progress} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      {g.currentValue} / {g.targetValue} {g.unit} — المسؤول: {g.owner}
                    </Typography>

                    {g.milestones && g.milestones.length > 0 && (
                      <Box sx={{ mt: 1 }}>
                        <Divider sx={{ mb: 0.5 }} />
                        {g.milestones.map((m, mi) => (
                          <Box key={mi} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {m.done ? <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} /> : <TimerIcon sx={{ fontSize: 14, color: 'text.disabled' }} />}
                            <Typography variant="caption">{m.name}</Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* ── Tab 3: Departments ── */}
      {tab === 3 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.100' }}>
                <TableCell align="right">#</TableCell>
                <TableCell align="right">القسم</TableCell>
                <TableCell align="right">الأداء</TableCell>
                <TableCell align="right">الميزانية</TableCell>
                <TableCell align="right">المستخدم</TableCell>
                <TableCell align="right">الموظفين</TableCell>
                <TableCell align="right">الرضا</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departmentRanking.map((d, idx) => (
                <TableRow key={d.id} hover>
                  <TableCell align="right">{idx + 1}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color || 'grey.500' }} />
                      <Typography variant="body2">{d.nameAr}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={d.performance}
                        sx={{ width: 60, height: 6, borderRadius: 3 }}
                        color={d.performance >= 85 ? 'success' : d.performance >= 70 ? 'warning' : 'error'}
                      />
                      <Typography variant="body2" fontWeight={600}>{d.performance}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{(d.budget || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                  <TableCell align="right">{(d.budgetUsed || 0).toLocaleString('ar-SA')} ر.س</TableCell>
                  <TableCell align="right">{d.staffCount}</TableCell>
                  <TableCell align="right">{d.satisfaction}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={() => setSnack({ ...snack, open: false })} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
   KPI SECTION SUB-COMPONENT
   ════════════════════════════════════════════════════════════════════ */
function KPISection({ title, icon, kpis, color }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Avatar sx={{ bgcolor: color, width: 32, height: 32 }}>{icon}</Avatar>
          <Typography variant="h6" fontWeight={600}>{title}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="right">المؤشر</TableCell>
              <TableCell align="right">الحالي</TableCell>
              <TableCell align="right">الهدف</TableCell>
              <TableCell align="right">التغيير</TableCell>
              <TableCell align="right">التحقق</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(kpis || []).map((k) => {
              const pct = k.target ? ((k.currentValue / k.target) * 100).toFixed(0) : 0;
              const met = k.currentValue >= k.target;
              return (
                <TableRow key={k.id} hover>
                  <TableCell align="right">
                    <Typography variant="body2">{k.nameAr}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>{fmt(k.currentValue, k.format)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">{fmt(k.target, k.format)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: trendColor(k.trend) }}>
                      {trendIcon(k.trend)}
                      <Typography variant="body2">{k.changePercent > 0 ? '+' : ''}{k.changePercent}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {met
                      ? <Chip label={`${pct}%`} color="success" size="small" icon={<CheckIcon />} />
                      : <Chip label={`${pct}%`} color="warning" size="small" />
                    }
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
