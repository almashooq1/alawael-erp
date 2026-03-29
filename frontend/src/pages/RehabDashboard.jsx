/**
 * RehabDashboard.jsx — لوحة تحكم خطط التأهيل الذكية
 *
 * واجهة React متكاملة تتصل بـ /api/rehab-plans
 * تشمل: عرض الخطط، أهداف SMART، تقييم AI، تقارير التقدم، جلسات Tele-Rehab
 *
 * @module RehabDashboard
 */

import React, { useState, useEffect, useCallback, Component } from 'react';
import {
  Box, Grid, Card, CardContent, CardHeader, Typography, Button, Chip,
  IconButton, Avatar, LinearProgress, CircularProgress, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Alert,
  Tabs, Tab, Divider, List, ListItem, ListItemText,
  ListItemAvatar, Fab, Snackbar, useTheme, alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  VideoCall as VideoCallIcon,
  Assessment as AssessmentIcon,
  SmartToy as AIIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  FitnessCenter as FitnessIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';

// ─── API Service ──────────────────────────────────────────────────────────────

const API_BASE = '/api/rehab-plans';

const apiCall = async (path, options = {}) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'خطأ في الاتصال بالخادم');
  }
  return res.json();
};

// ─── Color Helpers ────────────────────────────────────────────────────────────

const riskColor = {
  low: 'success',
  moderate: 'warning',
  high: 'error',
  critical: 'error',
};

const statusColor = {
  draft: 'default',
  active: 'primary',
  on_hold: 'warning',
  completed: 'success',
  discharged: 'info',
  cancelled: 'error',
};

const statusLabel = {
  draft: 'مسودة',
  active: 'نشط',
  on_hold: 'متوقف',
  completed: 'مكتمل',
  discharged: 'أُنهي',
  cancelled: 'ملغي',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** بطاقة إحصائية مع أيقونة وقيمة */
const StatCard = ({ title, value, subtitle, icon, color = 'primary', trend }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${theme.palette[color].main} 0%, ${theme.palette[color].dark} 100%)`,
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute', top: -20, right: -20,
          width: 100, height: 100,
          borderRadius: '50%',
          background: alpha('#fff', 0.1),
        }}
      />
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="h3" fontWeight={800}>{value ?? '—'}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>{title}</Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.75 }}>{subtitle}</Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 52, height: 52 }}>
            {icon}
          </Avatar>
        </Box>
        {trend !== null && (
          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TrendingUpIcon sx={{ fontSize: 16, opacity: 0.8 }} />
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {trend > 0 ? `+${trend}%` : `${trend}%`} مقارنة بالشهر الماضي
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/** شريط تقدم مع نسبة ونص */
const ProgressRow = ({ label, value = 0, color = 'primary' }) => (
  <Box sx={{ mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
      <Typography variant="body2" fontWeight={600}>{label}</Typography>
      <Typography variant="body2" color={`${color}.main`} fontWeight={700}>{value}%</Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={value}
      color={color}
      sx={{ height: 8, borderRadius: 4 }}
    />
  </Box>
);

/** بطاقة خطة واحدة في القائمة */
const PlanCard = ({ plan, onView, onEdit }) => {
  const progress = plan.progressMetrics?.overallProgress ?? 0;
  return (
    <Card variant="outlined" sx={{ mb: 1.5, '&:hover': { boxShadow: 3 }, transition: 'box-shadow .2s' }}>
      <CardContent sx={{ pb: '12px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {plan.planCode} — {plan.beneficiaryName || 'مستفيد'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {plan.primaryDiagnosis}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Chip
              size="small"
              label={statusLabel[plan.status] || plan.status}
              color={statusColor[plan.status] || 'default'}
            />
            {plan.latestRiskLevel && (
              <Chip
                size="small"
                label={`خطر: ${plan.latestRiskLevel}`}
                color={riskColor[plan.latestRiskLevel] || 'default'}
                variant="outlined"
              />
            )}
          </Box>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography variant="caption">التقدم الإجمالي</Typography>
            <Typography variant="caption" fontWeight={700}>{progress}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            color={progress >= 75 ? 'success' : progress >= 40 ? 'warning' : 'error'}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {plan.goals?.length ?? 0} هدف · {plan.totalWeeks ?? 12} أسبوع
          </Typography>
          <Box>
            <Tooltip title="عرض التفاصيل">
              <IconButton size="small" onClick={() => onView(plan)}><ViewIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="تعديل">
              <IconButton size="small" onClick={() => onEdit(plan)}><EditIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

// ─── Error Boundary ───────────────────────────────────────────────────────────

class RehabErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('[RehabDashboard] خطأ غير متوقع:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="h6">حدث خطأ غير متوقع في لوحة التأهيل</Typography>
            <Typography variant="body2">{this.state.error?.message}</Typography>
          </Alert>
          <Button variant="contained" onClick={() => this.setState({ hasError: false, error: null })}>
            إعادة المحاولة
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

function RehabDashboardInner() {
  const theme = useTheme();

  // ── State ──
  const [tab, setTab] = useState(0);
  const [plans, setPlans] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'info' });
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [templates, setTemplates] = useState([]);

  // Form states
  const [newPlan, setNewPlan] = useState({
    beneficiary: '',
    primaryDiagnosis: '',
    disabilityCategory: 'physical',
    templateUsed: 'comprehensive',
    startDate: '',
    endDate: '',
    sessionsPerWeek: 3,
  });
  const [newGoal, setNewGoal] = useState({
    domain: 'motorSkills',
    goalText: '',
    measurableTarget: '',
    measurementTool: '',
    targetWeek: 6,
    priority: 'medium',
  });
  const [newSession, setNewSession] = useState({
    date: '',
    sessionType: 'in_person',
    duration: 60,
    clinicalNotes: '',
    painLevelPre: 5,
    painLevelPost: 3,
  });

  // ── Therapist ID (from auth context) ──
  const therapistId = localStorage.getItem('userId') || 'demo-therapist';

  // ── Fetch ──
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, tmplRes] = await Promise.all([
        apiCall(`/dashboard/${therapistId}`),
        apiCall('/templates'),
      ]);
      setDashboard(dashRes.data || dashRes);
      setPlans(dashRes.data?.plans || dashRes.plans || []);
      setTemplates(tmplRes.data || []);
    } catch (e) {
      // Fallback: demo data
      setDashboard(DEMO_DASHBOARD);
      setPlans(DEMO_PLANS);
      setError('وضع العرض التجريبي — الاتصال بالخادم غير متاح');
    } finally {
      setLoading(false);
    }
  }, [therapistId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // ── Handlers ──
  const handleCreatePlan = async () => {
    if (!newPlan.beneficiary?.trim()) {
      setSnack({ open: true, msg: 'رقم/اسم المستفيد مطلوب', severity: 'error' });
      return;
    }
    if (!newPlan.primaryDiagnosis?.trim()) {
      setSnack({ open: true, msg: 'التشخيص الأساسي مطلوب', severity: 'error' });
      return;
    }
    if (!newPlan.startDate) {
      setSnack({ open: true, msg: 'تاريخ البدء مطلوب', severity: 'error' });
      return;
    }
    if (newPlan.endDate && newPlan.startDate && newPlan.endDate <= newPlan.startDate) {
      setSnack({ open: true, msg: 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء', severity: 'error' });
      return;
    }
    try {
      await apiCall('/', { method: 'POST', body: JSON.stringify(newPlan) });
      setSnack({ open: true, msg: 'تم إنشاء الخطة بنجاح وجدولة أول جلسة تلقائيًا', severity: 'success' });
      setNewPlanOpen(false);
      fetchDashboard();
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    }
  };

  const handleAddGoal = async () => {
    if (!selectedPlan) return;
    if (!newGoal.goalText?.trim()) {
      setSnack({ open: true, msg: 'نص الهدف مطلوب', severity: 'error' });
      return;
    }
    try {
      await apiCall(`/${selectedPlan._id}/goals`, { method: 'POST', body: JSON.stringify(newGoal) });
      setSnack({ open: true, msg: 'تمت إضافة الهدف بنجاح', severity: 'success' });
      setGoalDialogOpen(false);
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    }
  };

  const handleRecordSession = async () => {
    if (!selectedPlan || !selectedPlan.services?.[0]) return;
    if (!newSession.date) {
      setSnack({ open: true, msg: 'تاريخ الجلسة مطلوب', severity: 'error' });
      return;
    }
    const serviceId = selectedPlan.services[0]._id;
    try {
      await apiCall(`/${selectedPlan._id}/services/${serviceId}/sessions`, {
        method: 'POST',
        body: JSON.stringify(newSession),
      });
      setSnack({ open: true, msg: 'تم تسجيل الجلسة بنجاح', severity: 'success' });
      setSessionDialogOpen(false);
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    }
  };

  const handleAIAssessment = async (plan) => {
    setAiLoading(true);
    try {
      const res = await apiCall(`/beneficiary/${plan.beneficiary}/ai-assessment`, { method: 'POST' });
      setSnack({ open: true, msg: `تقييم AI مكتمل — مستوى الخطر: ${res.data?.riskLevel || 'moderate'}`, severity: 'info' });
      fetchDashboard();
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownloadReport = async (plan) => {
    try {
      const res = await apiCall(`/${plan._id}/report`);
      setSnack({ open: true, msg: 'تم إنشاء التقرير بنجاح', severity: 'success' });
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    }
  };

  // ── Render ──
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={60} />
        <Typography color="text.secondary">جارٍ تحميل بيانات التأهيل…</Typography>
      </Box>
    );
  }

  const stats = dashboard?.stats || DEMO_DASHBOARD.stats;
  const alerts = dashboard?.alerts || [];
  const upcomingTele = dashboard?.upcomingTeleSessions || [];

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>

      {/* ── Error Banner ── */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary">
            🏥 لوحة التأهيل الذكية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            خطط التأهيل الفردية · 12 أسبوعًا · مدعومة بالذكاء الاصطناعي
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={fetchDashboard} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setNewPlanOpen(true)}
          >
            خطة جديدة
          </Button>
        </Box>
      </Box>

      {/* ── Stats Row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الخطط النشطة"
            value={stats.activePlans}
            subtitle={`من إجمالي ${stats.totalPlans}`}
            icon={<FitnessIcon />}
            color="primary"
            trend={12}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="جلسات هذا الأسبوع"
            value={stats.sessionsThisWeek}
            subtitle={`${stats.attendanceRate ?? 0}% حضور`}
            icon={<ScheduleIcon />}
            color="secondary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="متوسط التقدم"
            value={`${stats.avgProgress ?? 0}%`}
            subtitle="عبر جميع الخطط"
            icon={<TrendingUpIcon />}
            color="success"
            trend={stats.progressTrend ?? 8}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="تنبيهات AI"
            value={stats.aiAlerts ?? alerts.length}
            subtitle="تحتاج متابعة"
            icon={<AIIcon />}
            color={alerts.length > 0 ? 'error' : 'info'}
          />
        </Grid>
      </Grid>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
        variant="scrollable"
        scrollButtons="auto"
      >
        {[
          { label: 'الخطط', icon: <DashboardIcon /> },
          { label: 'التقدم والأهداف', icon: <AssessmentIcon /> },
          { label: 'تقييم AI', icon: <AIIcon /> },
          { label: 'جلسات Tele-Rehab', icon: <VideoCallIcon /> },
          { label: 'التنبيهات', icon: <WarningIcon /> },
        ].map((t, i) => (
          <Tab
            key={i}
            label={t.label}
            icon={t.icon}
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        ))}
      </Tabs>

      {/* ═══════════════════════════════════════════════════
          TAB 0 — الخطط
      ═══════════════════════════════════════════════════ */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {/* Plans List */}
          <Grid item xs={12} md={7}>
            <Card>
              <CardHeader
                title="قائمة خطط التأهيل"
                subheader={`${plans.length} خطة`}
                action={
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setNewPlanOpen(true)}>
                    إضافة
                  </Button>
                }
              />
              <CardContent sx={{ maxHeight: 500, overflowY: 'auto' }}>
                {plans.length === 0 ? (
                  <Typography color="text.secondary" textAlign="center" py={4}>
                    لا توجد خطط بعد. أنشئ خطة جديدة للبدء.
                  </Typography>
                ) : (
                  plans.map(plan => (
                    <PlanCard
                      key={plan._id || plan.planCode}
                      plan={plan}
                      onView={p => { setSelectedPlan(p); setTab(1); }}
                      onEdit={p => setSelectedPlan(p)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Side Panel */}
          <Grid item xs={12} md={5}>
            {/* Upcoming Tele-Sessions */}
            <Card sx={{ mb: 2 }}>
              <CardHeader
                title="جلسات Tele-Rehab القادمة"
                avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}><VideoCallIcon /></Avatar>}
              />
              <CardContent>
                {upcomingTele.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">لا جلسات مجدولة</Typography>
                ) : (
                  <List dense>
                    {upcomingTele.slice(0, 4).map((s, i) => (
                      <ListItem key={i} divider>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.light', width: 36, height: 36 }}>
                            <VideoCallIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={s.beneficiaryName || `جلسة ${i + 1}`}
                          secondary={s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('ar-SA') : 'قيد الجدولة'}
                        />
                        <Chip size="small" label={s.platform || 'Zoom'} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>

            {/* AI Alerts */}
            <Card>
              <CardHeader
                title="تنبيهات الذكاء الاصطناعي"
                avatar={<Avatar sx={{ bgcolor: 'error.main' }}><AIIcon /></Avatar>}
              />
              <CardContent>
                {alerts.length === 0 ? (
                  <Alert severity="success">لا توجد تنبيهات — جميع المرضى في المسار الصحيح</Alert>
                ) : (
                  alerts.slice(0, 5).map((a, i) => (
                    <Alert key={i} severity={a.severity || 'warning'} sx={{ mb: 1 }} variant="outlined">
                      <Typography variant="body2">{a.message || a}</Typography>
                    </Alert>
                  ))
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 1 — التقدم والأهداف
      ═══════════════════════════════════════════════════ */}
      {tab === 1 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="مؤشرات التقدم"
                subheader={selectedPlan ? `الخطة: ${selectedPlan.planCode}` : 'اختر خطة من القائمة'}
              />
              <CardContent>
                {selectedPlan ? (
                  <>
                    <ProgressRow label="🦵 التحرك والمشي" value={selectedPlan.progressMetrics?.mobility ?? 65} />
                    <ProgressRow label="💪 القوة العضلية" value={selectedPlan.progressMetrics?.strength ?? 50} color="secondary" />
                    <ProgressRow label="🎯 نطاق الحركة (ROM)" value={selectedPlan.progressMetrics?.ROM ?? 75} color="success" />
                    <ProgressRow label="😌 انخفاض الألم" value={selectedPlan.progressMetrics?.painReduction ?? 80} color="warning" />
                    <ProgressRow label="🏠 أنشطة يومية (ADL)" value={selectedPlan.progressMetrics?.ADL ?? 55} />
                    <ProgressRow label="🧠 التوازن والتنسيق" value={selectedPlan.progressMetrics?.balance ?? 70} color="success" />
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography fontWeight={700}>التقدم الإجمالي</Typography>
                      <Chip
                        label={`${selectedPlan.progressMetrics?.overallProgress ?? 0}%`}
                        color="primary"
                        sx={{ fontWeight: 800, fontSize: '1rem', px: 1 }}
                      />
                    </Box>
                  </>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={3}>
                    اختر خطة من تبويب "الخطط" لعرض التقدم
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="أهداف SMART"
                action={
                  selectedPlan && (
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setGoalDialogOpen(true)}>
                      هدف جديد
                    </Button>
                  )
                }
              />
              <CardContent>
                {selectedPlan?.goals?.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>الهدف</TableCell>
                          <TableCell>الأسبوع</TableCell>
                          <TableCell>الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedPlan.goals.map((g, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Typography variant="body2">{g.goalText}</Typography>
                              <Typography variant="caption" color="text.secondary">{g.measurableTarget}</Typography>
                            </TableCell>
                            <TableCell>{g.targetWeek}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={g.status === 'achieved' ? 'محقق ✓' : g.status === 'in_progress' ? 'جاري' : 'لم يبدأ'}
                                color={g.status === 'achieved' ? 'success' : g.status === 'in_progress' ? 'primary' : 'default'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography color="text.secondary" textAlign="center" py={3}>
                    {selectedPlan ? 'لا أهداف مُضافة بعد' : 'اختر خطة أولاً'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Sessions */}
          {selectedPlan && (
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="سجل الجلسات"
                  action={
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setSessionDialogOpen(true)}>
                      تسجيل جلسة
                    </Button>
                  }
                />
                <CardContent>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>رقم الجلسة</TableCell>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>النوع</TableCell>
                          <TableCell>الألم (قبل/بعد)</TableCell>
                          <TableCell>الحضور</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(selectedPlan.services || []).flatMap(s => s.sessions || []).slice(-10).map((sess, i) => (
                          <TableRow key={i}>
                            <TableCell>{sess.sessionNumber || i + 1}</TableCell>
                            <TableCell>{sess.date ? new Date(sess.date).toLocaleDateString('ar-SA') : '—'}</TableCell>
                            <TableCell>
                              <Chip size="small" label={sess.sessionType === 'tele' ? 'عن بُعد' : sess.sessionType === 'in_person' ? 'حضوري' : sess.sessionType} />
                            </TableCell>
                            <TableCell>{sess.painLevelPre ?? '—'} / {sess.painLevelPost ?? '—'}</TableCell>
                            <TableCell>
                              {sess.attendanceStatus === 'present'
                                ? <CheckCircleIcon color="success" fontSize="small" />
                                : <WarningIcon color="warning" fontSize="small" />
                              }
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 2 — تقييم AI
      ═══════════════════════════════════════════════════ */}
      {tab === 2 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Card sx={{ background: 'linear-gradient(135deg, #0d1b2a, #1a3a5c)', color: '#e8f4fd' }}>
              <CardContent>
                <Typography variant="h6" sx={{ color: '#5bc8f5', mb: 1 }}>
                  🤖 نظام تقييم الذكاء الاصطناعي — الإصدار 6.0
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, mb: 2 }}>
                  خوارزميات ML لتقييم المخاطر، توقع النتائج، والتوصيات الشخصية
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { title: 'تحليل الحركة', desc: 'كاميرات ثلاثية الأبعاد لتحليل أنماط المشي في الزمن الحقيقي', icon: '📹' },
                    { title: 'تنبؤ بالنتائج', desc: 'توقع الوصول إلى الأهداف بناءً على معدل التحسن الحالي', icon: '🔮' },
                    { title: 'تقييم المخاطر', desc: 'اكتشاف مبكر للمرضى الذين ينحرفون عن المسار', icon: '⚠️' },
                    { title: 'تعلم تكيفي', desc: 'تعديل صعوبة التمارين تلقائيًا بناءً على الأداء الفعلي', icon: '🧠' },
                  ].map((f, i) => (
                    <Grid item xs={12} sm={6} key={i}>
                      <Box sx={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(91,200,245,.2)', borderRadius: 2, p: 1.5 }}>
                        <Typography sx={{ color: '#5bc8f5', fontWeight: 700, mb: 0.5 }}>{f.icon} {f.title}</Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>{f.desc}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {plans.map(plan => (
            <Grid item xs={12} md={6} key={plan._id || plan.planCode}>
              <Card>
                <CardHeader
                  title={plan.planCode}
                  subheader={plan.beneficiaryName || plan.primaryDiagnosis}
                  avatar={
                    <Avatar sx={{ bgcolor: plan.latestRiskLevel === 'high' ? 'error.main' : 'primary.main' }}>
                      <AIIcon />
                    </Avatar>
                  }
                  action={
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={aiLoading ? <CircularProgress size={14} color="inherit" /> : <PsychologyIcon />}
                      onClick={() => handleAIAssessment(plan)}
                      disabled={aiLoading}
                    >
                      تقييم AI
                    </Button>
                  }
                />
                <CardContent>
                  {plan.latestRiskLevel && (
                    <Alert severity={riskColor[plan.latestRiskLevel] || 'info'} sx={{ mb: 1 }}>
                      مستوى الخطر: <strong>{plan.latestRiskLevel}</strong>
                      {plan.latestPredictedOutcome !== null && ` · التحسن المتوقع: ${plan.latestPredictedOutcome}%`}
                    </Alert>
                  )}
                  {plan.aiAssessments?.slice(-1).map((a, i) => (
                    <Box key={i}>
                      {a.recommendations?.map((r, ri) => (
                        <Typography key={ri} variant="body2" sx={{ mb: 0.5, display: 'flex', gap: 0.5 }}>
                          <span style={{ color: theme.palette.primary.main }}>›</span> {r}
                        </Typography>
                      ))}
                    </Box>
                  ))}
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadReport(plan)}
                    sx={{ mt: 1 }}
                  >
                    تنزيل التقرير
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 3 — Tele-Rehab
      ═══════════════════════════════════════════════════ */}
      {tab === 3 && (
        <Card>
          <CardHeader
            title="جلسات التأهيل عن بُعد"
            avatar={<Avatar sx={{ bgcolor: 'secondary.main' }}><VideoCallIcon /></Avatar>}
          />
          <CardContent>
            {upcomingTele.length === 0 ? (
              <Box textAlign="center" py={4}>
                <VideoCallIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">لا توجد جلسات مجدولة</Typography>
                <Button variant="contained" sx={{ mt: 2 }} startIcon={<AddIcon />}>
                  جدولة جلسة جديدة
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>المريض</TableCell>
                      <TableCell>التاريخ والوقت</TableCell>
                      <TableCell>المنصة</TableCell>
                      <TableCell>الحالة</TableCell>
                      <TableCell>الإجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {upcomingTele.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.beneficiaryName || `مريض ${i + 1}`}</TableCell>
                        <TableCell>{s.scheduledAt ? new Date(s.scheduledAt).toLocaleString('ar-SA') : '—'}</TableCell>
                        <TableCell><Chip size="small" label={s.platform || 'Zoom'} /></TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={s.status === 'scheduled' ? 'مجدولة' : s.status}
                            color={s.status === 'scheduled' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<VideoCallIcon />}
                            href={s.meetingLink}
                            target="_blank"
                            disabled={!s.meetingLink}
                          >
                            انضم
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 4 — التنبيهات
      ═══════════════════════════════════════════════════ */}
      {tab === 4 && (
        <Grid container spacing={2}>
          {alerts.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="success" sx={{ py: 2 }}>
                <Typography variant="h6">✅ لا توجد تنبيهات حرجة</Typography>
                <Typography variant="body2">جميع مرضاك في المسار الصحيح للوصول إلى أهدافهم</Typography>
              </Alert>
            </Grid>
          ) : (
            alerts.map((a, i) => (
              <Grid item xs={12} md={6} key={i}>
                <Alert severity={a.severity || 'warning'} variant="outlined">
                  <Typography variant="subtitle2" fontWeight={700}>{a.title || `تنبيه ${i + 1}`}</Typography>
                  <Typography variant="body2">{a.message || a}</Typography>
                  {a.planCode && <Chip size="small" label={a.planCode} sx={{ mt: 0.5 }} />}
                </Alert>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════
          DIALOGS
      ═══════════════════════════════════════════════════ */}

      {/* New Plan Dialog */}
      <Dialog open={newPlanOpen} onClose={() => setNewPlanOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>➕ إنشاء خطة تأهيل جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth label="رقم المستفيد / الاسم" size="small"
                value={newPlan.beneficiary}
                onChange={e => setNewPlan({ ...newPlan, beneficiary: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth label="التشخيص الأساسي *" size="small"
                value={newPlan.primaryDiagnosis}
                onChange={e => setNewPlan({ ...newPlan, primaryDiagnosis: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>فئة الإعاقة</InputLabel>
                <Select
                  value={newPlan.disabilityCategory}
                  label="فئة الإعاقة"
                  onChange={e => setNewPlan({ ...newPlan, disabilityCategory: e.target.value })}
                >
                  {[['physical', 'جسمية'], ['sensory_visual', 'بصرية'], ['sensory_hearing', 'سمعية'], ['intellectual', 'ذهنية'], ['autism', 'توحد'], ['multiple', 'مركبة']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>القالب</InputLabel>
                <Select
                  value={newPlan.templateUsed}
                  label="القالب"
                  onChange={e => setNewPlan({ ...newPlan, templateUsed: e.target.value })}
                >
                  {[['comprehensive', 'شامل'], ['vocational', 'مهني'], ['educational', 'تعليمي'], ['earlyIntervention', 'تدخل مبكر'], ['independentLiving', 'استقلالية']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="تاريخ البدء" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={newPlan.startDate}
                onChange={e => setNewPlan({ ...newPlan, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="تاريخ الانتهاء" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={newPlan.endDate}
                onChange={e => setNewPlan({ ...newPlan, endDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="جلسات أسبوعيًا" type="number" size="small"
                value={newPlan.sessionsPerWeek}
                onChange={e => setNewPlan({ ...newPlan, sessionsPerWeek: +e.target.value })}
                inputProps={{ min: 1, max: 7 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewPlanOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreatePlan}>إنشاء الخطة</Button>
        </DialogActions>
      </Dialog>

      {/* Add Goal Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>🎯 إضافة هدف SMART</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="نص الهدف *" multiline rows={2} size="small"
                value={newGoal.goalText}
                onChange={e => setNewGoal({ ...newGoal, goalText: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="المعيار القابل للقياس" size="small"
                value={newGoal.measurableTarget}
                onChange={e => setNewGoal({ ...newGoal, measurableTarget: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>المجال</InputLabel>
                <Select value={newGoal.domain} label="المجال"
                  onChange={e => setNewGoal({ ...newGoal, domain: e.target.value })}
                >
                  {[['motorSkills', 'حركي'], ['communication', 'تواصل'], ['dailyLiving', 'حياة يومية'], ['cognitive', 'معرفي'], ['pain', 'الألم'], ['vocational', 'مهني']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="أداة القياس" size="small" placeholder="FIM, NRS, Goniometer…"
                value={newGoal.measurementTool}
                onChange={e => setNewGoal({ ...newGoal, measurementTool: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="الأسبوع المستهدف" type="number" size="small"
                value={newGoal.targetWeek}
                onChange={e => setNewGoal({ ...newGoal, targetWeek: +e.target.value })}
                inputProps={{ min: 1, max: 12 }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select value={newGoal.priority} label="الأولوية"
                  onChange={e => setNewGoal({ ...newGoal, priority: e.target.value })}
                >
                  {[['critical', 'حرجة'], ['high', 'عالية'], ['medium', 'متوسطة'], ['low', 'منخفضة']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddGoal}>إضافة الهدف</Button>
        </DialogActions>
      </Dialog>

      {/* Record Session Dialog */}
      <Dialog open={sessionDialogOpen} onClose={() => setSessionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📋 تسجيل جلسة علاجية</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="تاريخ الجلسة *" type="date" size="small" InputLabelProps={{ shrink: true }}
                value={newSession.date}
                onChange={e => setNewSession({ ...newSession, date: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الجلسة</InputLabel>
                <Select value={newSession.sessionType} label="نوع الجلسة"
                  onChange={e => setNewSession({ ...newSession, sessionType: e.target.value })}
                >
                  {[['in_person', 'حضوري'], ['tele', 'عن بُعد'], ['home', 'منزلي'], ['group', 'جماعي']].map(([v, l]) => (
                    <MenuItem key={v} value={v}>{l}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="مدة الجلسة (د)" type="number" size="small"
                value={newSession.duration}
                onChange={e => setNewSession({ ...newSession, duration: +e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="ألم قبل (0-10)" type="number" size="small"
                value={newSession.painLevelPre}
                onChange={e => setNewSession({ ...newSession, painLevelPre: +e.target.value })}
                inputProps={{ min: 0, max: 10 }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth label="ألم بعد (0-10)" type="number" size="small"
                value={newSession.painLevelPost}
                onChange={e => setNewSession({ ...newSession, painLevelPost: +e.target.value })}
                inputProps={{ min: 0, max: 10 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="ملاحظات سريرية" multiline rows={3} size="small"
                value={newSession.clinicalNotes}
                onChange={e => setNewSession({ ...newSession, clinicalNotes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSessionDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRecordSession}>حفظ الجلسة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack({ ...snack, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>

      {/* ── FAB ── */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, left: 24 }}
        onClick={() => setNewPlanOpen(true)}
        title="خطة جديدة"
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}

export default function RehabDashboard() {
  return (
    <RehabErrorBoundary>
      <RehabDashboardInner />
    </RehabErrorBoundary>
  );
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const DEMO_DASHBOARD = {
  stats: {
    activePlans: 8,
    totalPlans: 12,
    sessionsThisWeek: 24,
    attendanceRate: 92,
    avgProgress: 63,
    progressTrend: 8,
    aiAlerts: 2,
  },
  alerts: [
    { severity: 'warning', title: 'احتمال تأخر في تحقيق الهدف', message: 'المريض أحمد عبدالله لم يحضر 3 جلسات متتالية', planCode: 'RHP-2026-00001' },
    { severity: 'info', title: 'توصية AI', message: 'يُنصح بزيادة تكرار تمارين التوازن لمريضة سارة محمد بنسبة 20%', planCode: 'RHP-2026-00003' },
  ],
  upcomingTeleSessions: [
    { beneficiaryName: 'أحمد عبدالله', scheduledAt: new Date(Date.now() + 86400000).toISOString(), platform: 'Zoom', status: 'scheduled', meetingLink: '#' },
    { beneficiaryName: 'سارة محمد', scheduledAt: new Date(Date.now() + 2 * 86400000).toISOString(), platform: 'Teams', status: 'scheduled', meetingLink: '#' },
  ],
};

const DEMO_PLANS = [
  {
    _id: 'plan1', planCode: 'RHP-2026-00001',
    beneficiaryName: 'أحمد عبدالله', primaryDiagnosis: 'إصابة نخاع شوكي T10',
    status: 'active', totalWeeks: 12, latestRiskLevel: 'moderate', latestPredictedOutcome: 72,
    progressMetrics: { mobility: 65, strength: 55, ROM: 70, painReduction: 75, ADL: 60, balance: 68, overallProgress: 64 },
    goals: [
      { goalText: 'المشي 50 مترًا بعصا واحدة', measurableTarget: '50م', targetWeek: 6, status: 'in_progress' },
      { goalText: 'تقليل الألم إلى NRS ≤ 3', measurableTarget: 'NRS ≤ 3', targetWeek: 4, status: 'achieved' },
    ],
    services: [{ _id: 'svc1', sessions: [] }],
    aiAssessments: [{ riskLevel: 'moderate', predictedOutcome: 72, recommendations: ['زيادة تمارين التوازن', 'مراجعة برنامج الألم', 'تحفيز حضور الجلسات'] }],
    beneficiary: 'ben1',
  },
  {
    _id: 'plan2', planCode: 'RHP-2026-00002',
    beneficiaryName: 'يوسف عمر', primaryDiagnosis: 'متلازمة داون — تأخر حركي',
    status: 'active', totalWeeks: 12, latestRiskLevel: 'low', latestPredictedOutcome: 85,
    progressMetrics: { mobility: 75, strength: 60, ROM: 80, painReduction: 90, ADL: 70, balance: 72, overallProgress: 75 },
    goals: [
      { goalText: 'الركض 20 مترًا دون سقوط', measurableTarget: '20م', targetWeek: 4, status: 'achieved' },
      { goalText: 'قطع المقص وتلوين داخل الخطوط', measurableTarget: 'دقة 80%', targetWeek: 6, status: 'in_progress' },
    ],
    services: [{ _id: 'svc2', sessions: [] }],
    aiAssessments: [{ riskLevel: 'low', predictedOutcome: 85, recommendations: ['الاستمرار في برنامج NDT', 'إضافة سباحة أسبوعية'] }],
    beneficiary: 'ben2',
  },
];
