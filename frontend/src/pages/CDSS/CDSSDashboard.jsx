/**
 * CDSSDashboard — لوحة نظام دعم القرار السريري
 *
 * Tabs:
 *  0 — لوحة المراقبة   (Overview KPIs + live alert feed)
 *  1 — التنبيهات        (Alert management with severity filtering)
 *  2 — قواعد القرار    (Clinical rule library)
 *  3 — اقتراحات الذكاء (AI rehab plan suggestions)
 *  4 — مكتبة الأدوية   (Drug library + interaction checker)
 *  5 — سجل القرارات    (Audit decision log)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  Tab,
  Tabs,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Stack,
  Divider as _Divider,
  Badge,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  Avatar,
  Autocomplete,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Psychology as CDSSIcon,
  NotificationsActive as AlertIcon,
  Rule as RuleIcon,
  AutoFixHigh as AIIcon,
  Medication as DrugIcon,
  History as LogIcon,
  WarningAmber as WarnIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as OkIcon,
  Dangerous as CriticalIcon,
  Done as DoneIcon,
  Block as BlockIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Timeline as TrendIcon,
  Assessment as AssessIcon,
  TrendingDown as _RegressionIcon,
  PlayArrow as RunIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart as _BarChart,
  Bar as _Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as ChartTip,
  CartesianGrid,
} from 'recharts';
import {
  getStats,
  getAlerts,
  acknowledgeAlert,
  overrideAlert,
  resolveAlert,
  getRules,
  createRule,
  updateRule,
  getRehabSuggestions,
  acceptRehabSuggestion,
  rejectRehabSuggestion,
  getDrugLibrary,
  checkDrugInteractions,
  getDecisionLog,
  ALERT_SEVERITIES,
  RULE_CATEGORIES,
} from 'services/cdssService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const fmtTime = iso => {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.round(hrs / 24)} يوم`;
};

const SeverityChip = ({ level }) => {
  const cfg = ALERT_SEVERITIES[level] || ALERT_SEVERITIES.info;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: alpha(cfg.hex, 0.15),
        color: cfg.hex,
        fontWeight: 700,
        fontSize: '0.7rem',
        border: `1px solid ${alpha(cfg.hex, 0.4)}`,
      }}
    />
  );
};

const SeverityIcon = ({ level }) => {
  const icons = {
    critical: <CriticalIcon sx={{ color: '#ef4444' }} />,
    high: <ErrorIcon sx={{ color: '#f97316' }} />,
    medium: <WarnIcon sx={{ color: '#f59e0b' }} />,
    low: <InfoIcon sx={{ color: '#3b82f6' }} />,
    info: <InfoIcon sx={{ color: '#6b7280' }} />,
  };
  return icons[level] || icons.info;
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const useCounter = (target, duration = 1000) => {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          setValue(Math.round(ease * target));
          if (p < 1) requestAnimationFrame(tick);
        };
        tick();
      },
      { threshold: 0.3 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target, duration]);
  return [value, ref];
};

const KpiCard = ({ label, value, sub, gradient, icon: Icon }) => {
  const [count, ref] = useCounter(typeof value === 'number' ? value : 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
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
          minHeight: 120,
        }}
      >
        <Box sx={{ position: 'absolute', top: 12, left: 12, opacity: 0.18 }}>
          <Icon sx={{ fontSize: 56 }} />
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="h3" sx={{ fontWeight: 800, mt: 0.5, lineHeight: 1 }}>
          {typeof value === 'number' ? count : value}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            {sub}
          </Typography>
        )}
      </Paper>
    </motion.div>
  );
};

// ─── Tab Panel ────────────────────────────────────────────────────────────────

const TabPanel = ({ children, value, index }) =>
  value === index ? (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  ) : null;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function CDSSDashboard() {
  const _theme = useTheme();
  const [tab, setTab] = useState(0);

  // data
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [rules, setRules] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [drugs, setDrugs] = useState([]);
  const [decisionLog, setDecisionLog] = useState([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [alertSeverityFilter, setAlertSeverityFilter] = useState('all');
  const [alertSearch, setAlertSearch] = useState('');
  const [ruleCategory, setRuleCategory] = useState('all');

  // dialogs
  const [overrideDialog, setOverrideDialog] = useState({ open: false, alert: null, reason: '' });
  const [ruleDialog, setRuleDialog] = useState({ open: false, rule: null });
  const [rejectDialog, setRejectDialog] = useState({ open: false, id: null, reason: '' });
  const [interactionResult, setInteractionResult] = useState(null);
  const [selectedDrugsForCheck, setSelectedDrugsForCheck] = useState([]);
  const [interactionLoading, setInteractionLoading] = useState(false);

  // ─── Fetch All ───────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, r, sg, d, dl] = await Promise.all([
        getStats(),
        getAlerts(),
        getRules(),
        getRehabSuggestions(),
        getDrugLibrary(),
        getDecisionLog(),
      ]);
      setStats(s);
      setAlerts(Array.isArray(a) ? a : []);
      setRules(Array.isArray(r) ? r : []);
      setSuggestions(Array.isArray(sg) ? sg : []);
      setDrugs(Array.isArray(d) ? d : []);
      setDecisionLog(Array.isArray(dl) ? dl : []);
    } catch (err) {
      console.error('CDSS fetch error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ─── Alert actions ───────────────────────────────────────────────────────

  const handleAcknowledge = async id => {
    await acknowledgeAlert(id);
    setAlerts(prev => prev.map(a => (a._id === id ? { ...a, status: 'acknowledged' } : a)));
  };

  const handleResolve = async id => {
    await resolveAlert(id);
    setAlerts(prev => prev.map(a => (a._id === id ? { ...a, status: 'resolved' } : a)));
  };

  const handleOverrideSubmit = async () => {
    const { alert, reason } = overrideDialog;
    await overrideAlert(alert._id, reason);
    setAlerts(prev => prev.map(a => (a._id === alert._id ? { ...a, status: 'overridden' } : a)));
    setOverrideDialog({ open: false, alert: null, reason: '' });
  };

  // ─── Suggestion actions ───────────────────────────────────────────────────

  const handleAcceptSuggestion = async id => {
    await acceptRehabSuggestion(id);
    setSuggestions(prev => prev.map(s => (s._id === id ? { ...s, status: 'accepted' } : s)));
  };

  const handleRejectSubmit = async () => {
    const { id, reason } = rejectDialog;
    await rejectRehabSuggestion(id, reason);
    setSuggestions(prev => prev.map(s => (s._id === id ? { ...s, status: 'rejected' } : s)));
    setRejectDialog({ open: false, id: null, reason: '' });
  };

  // ─── Rule save ───────────────────────────────────────────────────────────

  const handleRuleSave = async () => {
    const { rule } = ruleDialog;
    if (rule._id && !rule._id.startsWith('new')) {
      const updated = await updateRule(rule._id, rule);
      setRules(prev => prev.map(r => (r._id === rule._id ? updated : r)));
    } else {
      const created = await createRule(rule);
      setRules(prev => [...prev, created]);
    }
    setRuleDialog({ open: false, rule: null });
  };

  // ─── Drug interaction check ───────────────────────────────────────────────

  const handleCheckInteractions = async () => {
    if (selectedDrugsForCheck.length < 2) return;
    setInteractionLoading(true);
    const result = await checkDrugInteractions(selectedDrugsForCheck.map(d => d.code || d._id));
    setInteractionResult(result);
    setInteractionLoading(false);
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  const filteredAlerts = alerts.filter(a => {
    const matchSev = alertSeverityFilter === 'all' || a.severity === alertSeverityFilter;
    const matchSearch =
      !alertSearch ||
      a.beneficiaryName?.toLowerCase().includes(alertSearch.toLowerCase()) ||
      a.message?.toLowerCase().includes(alertSearch.toLowerCase());
    return matchSev && matchSearch;
  });

  const filteredRules =
    ruleCategory === 'all' ? rules : rules.filter(r => r.category === ruleCategory);

  const alertCountBySeverity = alerts.reduce((acc, a) => {
    acc[a.severity] = (acc[a.severity] || 0) + 1;
    return acc;
  }, {});

  const trendData = DAYS.map((day, i) => ({
    day,
    تنبيهات: stats?.trend?.alerts?.[i] ?? 0,
    مخاطر: stats?.trend?.riskScores?.[i] ?? 0,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <CDSSIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              نظام دعم القرار السريري
            </Typography>
            <Typography variant="caption" color="text.secondary">
              CDSS — Clinical Decision Support System
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          {stats && (
            <Chip
              icon={<AlertIcon />}
              label={`${stats.criticalAlerts} حرج`}
              color="error"
              size="small"
              sx={{ fontWeight: 700 }}
            />
          )}
          <IconButton onClick={fetchAll} size="small">
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* ─── Active critical banner ─────────────────────────────────────── */}
      {(stats?.criticalAlerts || 0) > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Alert
            severity="error"
            icon={<CriticalIcon />}
            sx={{ mb: 2, fontWeight: 600 }}
            action={
              <Button color="error" size="small" onClick={() => setTab(1)}>
                عرض التنبيهات
              </Button>
            }
          >
            يوجد <strong>{stats.criticalAlerts}</strong> تنبيه حرج يستوجب تدخلاً فورياً
          </Alert>
        </motion.div>
      )}

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { fontWeight: 700, fontSize: '0.8rem', minHeight: 52 },
          }}
        >
          <Tab icon={<TrendIcon />} iconPosition="start" label="لوحة المراقبة" />
          <Tab
            icon={
              <Badge
                badgeContent={alerts.filter(a => a.status === 'active').length}
                color="error"
                max={99}
              >
                <AlertIcon />
              </Badge>
            }
            iconPosition="start"
            label="التنبيهات"
          />
          <Tab icon={<RuleIcon />} iconPosition="start" label="قواعد القرار" />
          <Tab
            icon={
              <Badge
                badgeContent={suggestions.filter(s => s.status === 'pending').length}
                color="primary"
              >
                <AIIcon />
              </Badge>
            }
            iconPosition="start"
            label="اقتراحات الذكاء الاصطناعي"
          />
          <Tab icon={<DrugIcon />} iconPosition="start" label="مكتبة الأدوية" />
          <Tab icon={<LogIcon />} iconPosition="start" label="سجل القرارات" />
        </Tabs>
      </Paper>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 0 — OVERVIEW
      ════════════════════════════════════════════════════════════════════ */}
      <TabPanel value={tab} index={0}>
        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={3}>
            <KpiCard
              label="تنبيهات نشطة"
              value={stats?.activeAlerts ?? 0}
              sub="يستوجب مراجعة"
              gradient="linear-gradient(135deg,#ef4444,#b91c1c)"
              icon={AlertIcon}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard
              label="تنبيهات حرجة"
              value={stats?.criticalAlerts ?? 0}
              sub="تدخل فوري"
              gradient="linear-gradient(135deg,#f97316,#c2410c)"
              icon={CriticalIcon}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard
              label="اقتراحات AI معلقة"
              value={stats?.pendingSuggestions ?? 0}
              sub="بانتظار القرار"
              gradient="linear-gradient(135deg,#8b5cf6,#6d28d9)"
              icon={AIIcon}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <KpiCard
              label="قواعد نشطة"
              value={stats?.rulesActive ?? 0}
              sub={`فعّلت ${stats?.rulesTriggeredToday ?? 0} اليوم`}
              gradient="linear-gradient(135deg,#10b981,#047857)"
              icon={RuleIcon}
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          {/* Trend chart */}
          <Grid item xs={12} md={8}>
            <Paper
              elevation={0}
              sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography
                fontWeight={700}
                mb={2}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <TrendIcon color="primary" fontSize="small" /> مسار التنبيهات والمخاطر — آخر 7 أيام
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gAlert" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTip />
                  <Area
                    type="monotone"
                    dataKey="تنبيهات"
                    stroke="#ef4444"
                    fill="url(#gAlert)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="مخاطر"
                    stroke="#8b5cf6"
                    fill="url(#gRisk)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Severity breakdown */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
              }}
            >
              <Typography
                fontWeight={700}
                mb={2}
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <AssessIcon color="primary" fontSize="small" /> توزيع التنبيهات
              </Typography>
              <Stack spacing={1.5}>
                {Object.entries(ALERT_SEVERITIES).map(([key, cfg]) => {
                  const count = alertCountBySeverity[key] || 0;
                  const total = alerts.length || 1;
                  return (
                    <Box key={key}>
                      <Stack direction="row" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" fontWeight={600}>
                          {cfg.label}
                        </Typography>
                        <Typography variant="caption" fontWeight={700}>
                          {count}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={(count / total) * 100}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(cfg.hex, 0.1),
                          '& .MuiLinearProgress-bar': { bgcolor: cfg.hex, borderRadius: 4 },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          </Grid>

          {/* Recent active alerts feed */}
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Stack direction="row" justifyContent="space-between" mb={2}>
                <Typography fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AlertIcon color="error" fontSize="small" /> آخر التنبيهات النشطة
                </Typography>
                <Button size="small" onClick={() => setTab(1)}>
                  عرض الكل
                </Button>
              </Stack>
              <Stack spacing={1}>
                {alerts
                  .filter(a => a.status === 'active')
                  .slice(0, 5)
                  .map(a => (
                    <Box
                      key={a._id}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: alpha(ALERT_SEVERITIES[a.severity]?.hex || '#999', 0.06),
                        border: `1px solid ${alpha(ALERT_SEVERITIES[a.severity]?.hex || '#999', 0.2)}`,
                      }}
                    >
                      <SeverityIcon level={a.severity} />
                      <Box flex={1}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                          {a.beneficiaryName} — {fmtTime(a.triggeredAt)}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.3 }}>
                          {a.message}
                        </Typography>
                      </Box>
                      <SeverityChip level={a.severity} />
                    </Box>
                  ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 1 — ALERTS
      ════════════════════════════════════════════════════════════════════ */}
      <TabPanel value={tab} index={1}>
        {/* Controls */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems="center">
          <TextField
            size="small"
            placeholder="بحث بالاسم أو الرسالة..."
            value={alertSearch}
            onChange={e => setAlertSearch(e.target.value)}
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            size="small"
            value={alertSeverityFilter}
            exclusive
            onChange={(_, v) => v && setAlertSeverityFilter(v)}
          >
            <ToggleButton value="all">الكل ({alerts.length})</ToggleButton>
            {Object.entries(ALERT_SEVERITIES).map(([key, cfg]) => (
              <ToggleButton key={key} value={key} sx={{ color: cfg.hex }}>
                {cfg.label} ({alertCountBySeverity[key] || 0})
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.default' } }}>
                <TableCell>الخطورة</TableCell>
                <TableCell>الرسالة</TableCell>
                <TableCell>المستفيد</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAlerts.map(alert => (
                <TableRow
                  key={alert._id}
                  sx={{
                    bgcolor:
                      alert.status === 'resolved'
                        ? alpha('#10b981', 0.04)
                        : alert.severity === 'critical'
                          ? alpha('#ef4444', 0.04)
                          : 'inherit',
                  }}
                >
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <SeverityIcon level={alert.severity} />
                      <SeverityChip level={alert.severity} />
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 340 }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.ruleCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {alert.beneficiaryName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.beneficiaryId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{fmtTime(alert.triggeredAt)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        alert.status === 'active'
                          ? 'نشط'
                          : alert.status === 'acknowledged'
                            ? 'مُعترف به'
                            : alert.status === 'overridden'
                              ? 'مُجاز'
                              : 'مُغلق'
                      }
                      size="small"
                      color={
                        alert.status === 'resolved'
                          ? 'success'
                          : alert.status === 'acknowledged'
                            ? 'info'
                            : alert.status === 'overridden'
                              ? 'warning'
                              : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    {alert.status === 'active' && (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="الاعتراف بالتنبيه">
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleAcknowledge(alert._id)}
                          >
                            <DoneIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تجاوز مع سبب">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => setOverrideDialog({ open: true, alert, reason: '' })}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="إغلاق التنبيه">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleResolve(alert._id)}
                          >
                            <OkIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredAlerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    لا توجد تنبيهات مطابقة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 2 — CLINICAL RULES
      ════════════════════════════════════════════════════════════════════ */}
      <TabPanel value={tab} index={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={1}>
            {['all', ...Object.keys(RULE_CATEGORIES)].map(cat => (
              <Chip
                key={cat}
                label={
                  cat === 'all'
                    ? `الكل (${rules.length})`
                    : `${RULE_CATEGORIES[cat].label} (${rules.filter(r => r.category === cat).length})`
                }
                onClick={() => setRuleCategory(cat)}
                variant={ruleCategory === cat ? 'filled' : 'outlined'}
                size="small"
                sx={
                  cat !== 'all' && ruleCategory === cat
                    ? {
                        bgcolor: RULE_CATEGORIES[cat].color,
                        color: '#fff',
                        borderColor: RULE_CATEGORIES[cat].color,
                      }
                    : {}
                }
              />
            ))}
          </Stack>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            size="small"
            onClick={() =>
              setRuleDialog({
                open: true,
                rule: {
                  _id: 'new',
                  name: '',
                  code: '',
                  category: 'safety',
                  severity: 'medium',
                  condition: '',
                  action: '',
                  isActive: true,
                },
              })
            }
          >
            قاعدة جديدة
          </Button>
        </Stack>

        <Grid container spacing={2}>
          {filteredRules.map(rule => (
            <Grid item xs={12} md={6} key={rule._id}>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: rule.isActive
                      ? RULE_CATEGORIES[rule.category]?.color || 'primary.main'
                      : 'divider',
                    opacity: rule.isActive ? 1 : 0.55,
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                        <Chip
                          label={RULE_CATEGORIES[rule.category]?.label || rule.category}
                          size="small"
                          sx={{
                            bgcolor: alpha(
                              RULE_CATEGORIES[rule.category]?.color || '#3b82f6',
                              0.15
                            ),
                            color: RULE_CATEGORIES[rule.category]?.color || '#3b82f6',
                            fontWeight: 700,
                            fontSize: '0.65rem',
                          }}
                        />
                        <SeverityChip level={rule.severity} />
                        <Chip
                          label={`مستوى ${rule.evidenceLevel}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      </Stack>
                      <Typography fontWeight={700} variant="body2">
                        {rule.name}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}
                      >
                        IF: {rule.condition}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="primary"
                        sx={{ display: 'block', mt: 0.3 }}
                      >
                        THEN: {rule.action}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5} sx={{ ml: 1 }}>
                      <Chip
                        label={rule.isActive ? 'مفعّل' : 'معطّل'}
                        size="small"
                        color={rule.isActive ? 'success' : 'default'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        فعّل {rule.triggerCount}×
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => setRuleDialog({ open: true, rule: { ...rule } })}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Paper>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 3 — AI REHAB SUGGESTIONS
      ════════════════════════════════════════════════════════════════════ */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={2}>
          {suggestions.map(s => (
            <Grid item xs={12} md={6} key={s._id}>
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor:
                      s.status === 'accepted'
                        ? 'success.main'
                        : s.status === 'rejected'
                          ? 'error.light'
                          : 'divider',
                  }}
                >
                  {/* Header */}
                  <Stack direction="row" justifyContent="space-between" mb={1.5}>
                    <Box>
                      <Typography fontWeight={700}>{s.beneficiaryName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.beneficiaryId}
                      </Typography>
                    </Box>
                    <Stack alignItems="flex-end" spacing={0.5}>
                      <Chip
                        label={`ثقة ${s.confidenceScore}%`}
                        size="small"
                        sx={{
                          bgcolor:
                            s.confidenceScore >= 85
                              ? alpha('#10b981', 0.15)
                              : alpha('#f59e0b', 0.15),
                          color: s.confidenceScore >= 85 ? '#10b981' : '#f59e0b',
                          fontWeight: 700,
                        }}
                      />
                      <Chip
                        label={
                          s.status === 'pending'
                            ? 'معلق'
                            : s.status === 'accepted'
                              ? 'مقبول'
                              : 'مرفوض'
                        }
                        size="small"
                        color={
                          s.status === 'accepted'
                            ? 'success'
                            : s.status === 'rejected'
                              ? 'error'
                              : 'default'
                        }
                      />
                    </Stack>
                  </Stack>

                  <Typography variant="caption" fontWeight={700} color="primary">
                    التشخيص:
                  </Typography>
                  <Typography variant="body2" mb={1.5}>
                    {s.diagnosis}
                  </Typography>

                  {/* Modalities */}
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    التدخلات المقترحة:
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5} mb={1}>
                    {s.suggestedPlan?.modalities?.map(m => (
                      <Chip
                        key={m}
                        label={m}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                      />
                    ))}
                  </Stack>

                  {/* Goals */}
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    الأهداف:
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2.5, mt: 0.5 }}>
                    {s.suggestedPlan?.goals?.map((g, i) => (
                      <Typography key={i} component="li" variant="caption">
                        {g}
                      </Typography>
                    ))}
                  </Box>

                  {/* Meta */}
                  <Stack direction="row" spacing={2} mt={1.5} mb={1.5}>
                    <Typography variant="caption" color="text.secondary">
                      {s.suggestedPlan?.sessions} جلسات / {s.suggestedPlan?.frequency} | مدة:{' '}
                      {s.suggestedPlan?.duration}
                    </Typography>
                  </Stack>

                  {s.suggestedPlan?.evidenceBased && (
                    <Chip
                      label={`مبني على أدلة: ${s.suggestedPlan.referencedGuideline}`}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ fontSize: '0.65rem', mb: 1.5 }}
                    />
                  )}

                  {/* Actions */}
                  {s.status === 'pending' && (
                    <Stack direction="row" spacing={1} mt={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<OkIcon />}
                        onClick={() => handleAcceptSuggestion(s._id)}
                      >
                        قبول الخطة
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={() => setRejectDialog({ open: true, id: s._id, reason: '' })}
                      >
                        رفض
                      </Button>
                    </Stack>
                  )}
                </Paper>
              </motion.div>
            </Grid>
          ))}
          {suggestions.length === 0 && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <AIIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
                <Typography>لا توجد اقتراحات معلقة</Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 4 — DRUG LIBRARY + INTERACTION CHECKER
      ════════════════════════════════════════════════════════════════════ */}
      <TabPanel value={tab} index={4}>
        {/* Interaction Checker */}
        <Paper
          elevation={0}
          sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}
        >
          <Typography
            fontWeight={700}
            mb={2}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <DrugIcon color="warning" fontSize="small" /> فاحص التفاعلات الدوائية
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
            <Autocomplete
              multiple
              size="small"
              options={drugs}
              getOptionLabel={o => o.name}
              value={selectedDrugsForCheck}
              onChange={(_, v) => {
                setSelectedDrugsForCheck(v);
                setInteractionResult(null);
              }}
              renderInput={params => (
                <TextField {...params} label="اختر دواءين أو أكثر" placeholder="ابحث..." />
              )}
              sx={{ minWidth: 280 }}
              noOptionsText="لا توجد نتائج"
            />
            <Button
              variant="contained"
              color="warning"
              startIcon={
                interactionLoading ? <CircularProgress size={16} color="inherit" /> : <RunIcon />
              }
              onClick={handleCheckInteractions}
              disabled={selectedDrugsForCheck.length < 2 || interactionLoading}
            >
              فحص التفاعلات
            </Button>
          </Stack>

          {interactionResult && (
            <Box mt={2}>
              {interactionResult.safe ? (
                <Alert severity="success" icon={<OkIcon />}>
                  <strong>لا توجد تفاعلات دوائية خطرة</strong> بين الأدوية المحددة
                </Alert>
              ) : (
                <Alert severity="error" icon={<CriticalIcon />}>
                  <strong>تحذير:</strong> يوجد {interactionResult.interactions?.length} تفاعل دوائي
                  محتمل — راجع طبيب الفريق
                </Alert>
              )}
            </Box>
          )}
        </Paper>

        {/* Drug Library Table */}
        <Typography fontWeight={700} mb={1.5}>
          مكتبة الأدوية ({drugs.length})
        </Typography>
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.default' } }}>
                <TableCell>اسم الدواء</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>التفاعلات المعروفة</TableCell>
                <TableCell>موانع الاستخدام</TableCell>
                <TableCell>خطر مرتفع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {drugs.map(drug => (
                <TableRow key={drug._id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>
                      {drug.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{drug.category}</Typography>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" flexWrap="wrap" gap={0.4}>
                      {drug.interactions?.map(i => (
                        <Chip key={i} label={i} size="small" sx={{ fontSize: '0.6rem' }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" flexWrap="wrap" gap={0.4}>
                      {drug.contraindications?.map(c => (
                        <Chip
                          key={c}
                          label={c}
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ fontSize: '0.6rem' }}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {drug.highRisk ? (
                      <Chip label="نعم" size="small" color="error" />
                    ) : (
                      <Chip label="لا" size="small" color="success" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ════════════════════════════════════════════════════════════════════
          TAB 5 — DECISION LOG
      ════════════════════════════════════════════════════════════════════ */}
      <TabPanel value={tab} index={5}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LogIcon color="primary" fontSize="small" />
            سجل القرارات السريرية — {decisionLog.length} قرار
          </Typography>
          <Chip label={`${stats?.decisionLogToday ?? 0} اليوم`} size="small" color="primary" />
        </Stack>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'background.default' } }}>
                <TableCell>الإجراء</TableCell>
                <TableCell>الكود</TableCell>
                <TableCell>الأخصائي</TableCell>
                <TableCell>السبب / الملاحظة</TableCell>
                <TableCell>الوقت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {decisionLog.map(entry => (
                <TableRow key={entry._id}>
                  <TableCell>
                    <Chip
                      label={
                        entry.action === 'accept'
                          ? 'قبول'
                          : entry.action === 'reject'
                            ? 'رفض'
                            : entry.action === 'override'
                              ? 'تجاوز'
                              : entry.action === 'resolve'
                                ? 'إغلاق'
                                : entry.action
                      }
                      size="small"
                      color={
                        entry.action === 'accept'
                          ? 'success'
                          : entry.action === 'reject'
                            ? 'error'
                            : entry.action === 'resolve'
                              ? 'success'
                              : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {entry.alertCode}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {entry.clinician}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{entry.reason}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{fmtTime(entry.timestamp)}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ════════════════════════════════════════════════════════════════════
          DIALOGS
      ════════════════════════════════════════════════════════════════════ */}

      {/* Override Alert Dialog */}
      <Dialog
        open={overrideDialog.open}
        onClose={() => setOverrideDialog({ open: false, alert: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تجاوز التنبيه مع مبرر سريري</DialogTitle>
        <DialogContent>
          {overrideDialog.alert && (
            <Box mb={2} p={1.5} sx={{ bgcolor: alpha('#f97316', 0.08), borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary">
                {overrideDialog.alert.ruleCode}
              </Typography>
              <Typography variant="body2">{overrideDialog.alert.message}</Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب التجاوز السريري"
            value={overrideDialog.reason}
            onChange={e => setOverrideDialog(p => ({ ...p, reason: e.target.value }))}
            placeholder="مثال: المريض في ظروف خاصة، تم التأكيد مع الفريق..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideDialog({ open: false, alert: null, reason: '' })}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="warning"
            disabled={overrideDialog.reason.trim().length < 10}
            onClick={handleOverrideSubmit}
          >
            تجاوز وتسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Suggestion Dialog */}
      <Dialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, id: null, reason: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>رفض اقتراح الذكاء الاصطناعي</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="سبب الرفض"
            value={rejectDialog.reason}
            onChange={e => setRejectDialog(p => ({ ...p, reason: e.target.value }))}
            placeholder="مثال: الخطة لا تتناسب مع الوضع الصحي الحالي للمستفيد..."
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ open: false, id: null, reason: '' })}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!rejectDialog.reason.trim()}
            onClick={handleRejectSubmit}
          >
            رفض الاقتراح
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rule Create/Edit Dialog */}
      <Dialog
        open={ruleDialog.open}
        onClose={() => setRuleDialog({ open: false, rule: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {ruleDialog.rule?._id?.startsWith('new')
            ? 'إنشاء قاعدة سريرية جديدة'
            : 'تعديل القاعدة السريرية'}
        </DialogTitle>
        <DialogContent>
          {ruleDialog.rule && (
            <Stack spacing={2} mt={1}>
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  label="كود القاعدة"
                  value={ruleDialog.rule.code}
                  onChange={e =>
                    setRuleDialog(p => ({ ...p, rule: { ...p.rule, code: e.target.value } }))
                  }
                  sx={{ width: 160 }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="اسم القاعدة"
                  value={ruleDialog.rule.name}
                  onChange={e =>
                    setRuleDialog(p => ({ ...p, rule: { ...p.rule, name: e.target.value } }))
                  }
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>الفئة</InputLabel>
                  <Select
                    value={ruleDialog.rule.category}
                    label="الفئة"
                    onChange={e =>
                      setRuleDialog(p => ({ ...p, rule: { ...p.rule, category: e.target.value } }))
                    }
                  >
                    {Object.entries(RULE_CATEGORIES).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>الخطورة</InputLabel>
                  <Select
                    value={ruleDialog.rule.severity}
                    label="الخطورة"
                    onChange={e =>
                      setRuleDialog(p => ({ ...p, rule: { ...p.rule, severity: e.target.value } }))
                    }
                  >
                    {Object.entries(ALERT_SEVERITIES).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
              <TextField
                size="small"
                label="شرط التفعيل (Condition)"
                value={ruleDialog.rule.condition}
                onChange={e =>
                  setRuleDialog(p => ({ ...p, rule: { ...p.rule, condition: e.target.value } }))
                }
                placeholder="مثال: consecutive_missed_sessions >= 3"
              />
              <TextField
                size="small"
                multiline
                rows={2}
                label="الإجراء عند التفعيل (Action)"
                value={ruleDialog.rule.action}
                onChange={e =>
                  setRuleDialog(p => ({ ...p, rule: { ...p.rule, action: e.target.value } }))
                }
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialog({ open: false, rule: null })}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!ruleDialog.rule?.name?.trim() || !ruleDialog.rule?.condition?.trim()}
            onClick={handleRuleSave}
          >
            حفظ القاعدة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
