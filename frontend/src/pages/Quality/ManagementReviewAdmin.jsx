/**
 * ManagementReviewAdmin.jsx — Phase 13 Commit 10
 *
 * Full-featured management review UI:
 *   • Live dashboard with KPI cards + trend bars
 *   • Reviews list with all lifecycle transitions
 *   • Full detail drawer: agenda · inputs · outputs · decisions
 *     · actions (with status tracking) · minutes · approvals
 *   • Schedule / Start / Close / Cancel / Approve workflows
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Tooltip,
  Chip,
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
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Grid,
  LinearProgress,
  Tabs,
  Tab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Badge,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayCircle as StartIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  EventNote as ReviewIcon,
  Dashboard as DashboardIcon,
  ListAlt as ListIcon,
  Cancel as CancelIcon,
  CheckCircle as CloseReviewIcon,
  Assignment as InputIcon,
  Gavel as DecisionIcon,
  Task as ActionIcon,
  Notes as MinutesIcon,
  VerifiedUser as ApprovalIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

// ── Constants ─────────────────────────────────────────────────────

const PHASE_STEPS = [
  'scheduled',
  'agenda_set',
  'in_progress',
  'decisions_recorded',
  'actions_assigned',
  'closed',
];

const PHASE_LABELS = {
  scheduled: 'مجدولة',
  agenda_set: 'جدول الأعمال',
  in_progress: 'جارية',
  decisions_recorded: 'القرارات',
  actions_assigned: 'الإجراءات',
  closed: 'مغلقة',
  cancelled: 'ملغاة',
};

const EMPTY_FORM = { title: '', scheduledFor: '', type: '', cycleLabel: '' };

// ── Helpers ───────────────────────────────────────────────────────

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(v);
  }
}

function statusColor(s) {
  const map = {
    closed: 'success',
    in_progress: 'warning',
    scheduled: 'info',
    agenda_set: 'secondary',
    decisions_recorded: 'warning',
    actions_assigned: 'warning',
    cancelled: 'default',
  };
  return map[s] || 'default';
}

function actionStatusColor(s) {
  return (
    {
      open: 'warning',
      in_progress: 'info',
      completed: 'success',
      overdue: 'error',
      cancelled: 'default',
    }[s] || 'default'
  );
}

function KpiCard({ label, value, color = 'text.primary' }) {
  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 2,
        flex: 1,
        minWidth: 130,
        textAlign: 'center',
        borderTop: '4px solid',
        borderTopColor: color,
      }}
      elevation={2}
    >
      <Typography variant="h3" fontWeight={700} color={color}>
        {value ?? '—'}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
        {label}
      </Typography>
    </Paper>
  );
}

function TrendBar({ label, scheduled, closed }) {
  const pct = Math.round((closed / Math.max(scheduled, 1)) * 100);
  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" justifyContent="space-between">
        <Typography variant="caption">{label}</Typography>
        <Typography variant="caption" color="text.secondary">
          {closed}/{scheduled}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{ height: 6, borderRadius: 3 }}
        color={pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error'}
        aria-label={`نسبة إغلاق المراجعات: ${Math.round(pct)}٪`}
      />
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────

export default function ManagementReviewAdmin() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [reference, setReference] = useState(null);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [dashLoading, setDashLoading] = useState(false);

  // List
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState(0);

  // Sub-form states
  const [inputForm, setInputForm] = useState({ code: '', summary: '' });
  const [outputForm, setOutputForm] = useState({ code: '', description: '' });
  const [decisionForm, setDecisionForm] = useState({ type: '', title: '', rationale: '' });
  const [actionForm, setActionForm] = useState({
    title: '',
    ownerUserId: '',
    priority: 'medium',
    dueDate: '',
  });
  const [minutesText, setMinutesText] = useState('');
  const [approvalForm, setApprovalForm] = useState({ role: '', notes: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [closureNotes, setClosureNotes] = useState('');
  const [subSaving, setSubSaving] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  // ── Load reference ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    apiClient.get('/management-review/reference').then(({ data }) => {
      if (alive) setReference(data?.data || data);
    });
    return () => {
      alive = false;
    };
  }, []);

  // ── Dashboard ───────────────────────────────────────────────────
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    try {
      const [d, a] = await Promise.all([
        apiClient.get('/management-review/dashboard'),
        apiClient.get('/management-review/analytics', { params: { months: 6 } }),
      ]);
      setDashboard(d.data?.data || d.data);
      setAnalytics(a.data?.data || a.data);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل البيانات', 'error');
    } finally {
      setDashLoading(false);
    }
  }, [showSnackbar]);

  // ── List ────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const { data } = await apiClient.get('/management-review', { params });
      setRows(data?.data || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل المراجعات', 'error');
    } finally {
      setListLoading(false);
    }
  }, [filterStatus, filterType, showSnackbar]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (tab === 1) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same reason: suppress dep-array warning
  }, [tab]);

  // ── Create review ───────────────────────────────────────────────
  const handleSave = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        scheduledFor: new Date(form.scheduledFor).toISOString(),
      };
      if (form.type) payload.type = form.type;
      if (form.cycleLabel) payload.cycleLabel = form.cycleLabel;
      await apiClient.post('/management-review', payload);
      showSnackbar('تم جدولة المراجعة', 'success');
      setCreateOpen(false);
      loadDashboard();
      if (tab === 1) loadList();
    } catch (err) {
      setServerError(err?.response?.data?.error || err?.message || 'خطأ');
    } finally {
      setSaving(false);
    }
  };

  // ── Open detail ─────────────────────────────────────────────────
  const openDetail = async row => {
    setDetail(null);
    setDetailTab(0);
    setDrawerOpen(true);
    setDetailLoading(true);
    try {
      const { data } = await apiClient.get(`/management-review/${row._id}`);
      const d = data?.data || data;
      setDetail(d);
      setMinutesText(d.minutes || '');
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل التفاصيل', 'error');
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!detail?._id) return;
    try {
      const { data } = await apiClient.get(`/management-review/${detail._id}`);
      const d = data?.data || data;
      setDetail(d);
      setMinutesText(d.minutes || '');
    } catch {
      /* non-fatal */
    }
  };

  // ── Transitions ─────────────────────────────────────────────────
  const handleStart = async row => {
    try {
      await apiClient.post(`/management-review/${row._id}/start`);
      showSnackbar('بدأ الاجتماع', 'success');
      if (detail?._id === row._id) refreshDetail();
      if (tab === 1) loadList();
      loadDashboard();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر بدء الاجتماع', 'error');
    }
  };

  const sub =
    (key, fn) =>
    async (...args) => {
      setSubSaving(key);
      try {
        await fn(...args);
      } finally {
        setSubSaving('');
      }
    };

  const handleAddInput = sub('input', async () => {
    if (!inputForm.code || !inputForm.summary) return;
    await apiClient.post(`/management-review/${detail._id}/inputs`, inputForm);
    showSnackbar('تم إضافة المدخل', 'success');
    setInputForm({ code: '', summary: '' });
    refreshDetail();
  });

  const handleAddOutput = sub('output', async () => {
    if (!outputForm.code || !outputForm.description) return;
    await apiClient.post(`/management-review/${detail._id}/outputs`, outputForm);
    showSnackbar('تم إضافة المخرج', 'success');
    setOutputForm({ code: '', description: '' });
    refreshDetail();
  });

  const handleAddDecision = sub('decision', async () => {
    if (!decisionForm.type || !decisionForm.title || !decisionForm.rationale) return;
    await apiClient.post(`/management-review/${detail._id}/decisions`, decisionForm);
    showSnackbar('تم تسجيل القرار', 'success');
    setDecisionForm({ type: '', title: '', rationale: '' });
    refreshDetail();
  });

  const handleAddAction = sub('action', async () => {
    if (!actionForm.title || !actionForm.ownerUserId) return;
    const payload = { ...actionForm };
    if (payload.dueDate) payload.dueDate = new Date(payload.dueDate).toISOString();
    await apiClient.post(`/management-review/${detail._id}/actions`, payload);
    showSnackbar('تم إضافة الإجراء', 'success');
    setActionForm({ title: '', ownerUserId: '', priority: 'medium', dueDate: '' });
    refreshDetail();
  });

  const handleUpdateActionStatus = async (actionId, status) => {
    setSubSaving(`act-${actionId}`);
    try {
      await apiClient.patch(`/management-review/${detail._id}/actions/${actionId}`, { status });
      showSnackbar('تم تحديث الإجراء', 'success');
      refreshDetail();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'خطأ', 'error');
    } finally {
      setSubSaving('');
    }
  };

  const handleSaveMinutes = sub('minutes', async () => {
    await apiClient.patch(`/management-review/${detail._id}/minutes`, { minutes: minutesText });
    showSnackbar('تم حفظ المحضر', 'success');
    refreshDetail();
  });

  const handleApprove = sub('approval', async () => {
    if (!approvalForm.role) return;
    await apiClient.post(`/management-review/${detail._id}/approvals`, approvalForm);
    showSnackbar('تم تسجيل التوقيع', 'success');
    setApprovalForm({ role: '', notes: '' });
    refreshDetail();
  });

  const handleClose = sub('close', async () => {
    await apiClient.post(`/management-review/${detail._id}/close`, { closureNotes });
    showSnackbar('تم إغلاق المراجعة', 'success');
    setCloseOpen(false);
    setClosureNotes('');
    refreshDetail();
    loadDashboard();
    if (tab === 1) loadList();
  });

  const handleCancel = sub('cancel', async () => {
    if (!cancelReason.trim()) return;
    await apiClient.post(`/management-review/${detail._id}/cancel`, { reason: cancelReason });
    showSnackbar('تم إلغاء المراجعة', 'success');
    setCancelOpen(false);
    setCancelReason('');
    setDrawerOpen(false);
    loadDashboard();
    if (tab === 1) loadList();
  });

  // ── Helpers ─────────────────────────────────────────────────────
  const currentStep = detail ? Math.max(PHASE_STEPS.indexOf(detail.status), 0) : 0;
  const formInvalid = !form.title.trim() || !form.scheduledFor;

  // ── Render ──────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ReviewIcon color="primary" fontSize="large" />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              مراجعات الإدارة
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ISO 9001:2015 §9.3 · CBAHI
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton
              onClick={() => {
                loadDashboard();
                if (tab === 1) loadList();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setServerError(null);
              setCreateOpen(true);
            }}
          >
            جدولة مراجعة
          </Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<DashboardIcon />} iconPosition="start" label="لوحة التحكم" />
        <Tab icon={<ListIcon />} iconPosition="start" label="المراجعات" />
      </Tabs>

      {/* ══ TAB 0: DASHBOARD ══════════════════════════════════════ */}
      {tab === 0 && (
        <>
          {dashLoading && <LinearProgress sx={{ mb: 2 }} aria-label="جارٍ تحميل لوحة المراجعات" />}
          {dashboard && (
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
              <KpiCard label="الإجمالي" value={dashboard.total} color="primary.main" />
              <KpiCard label="مفتوحة" value={dashboard.open} color="warning.main" />
              <KpiCard label="مغلقة" value={dashboard.closed} color="success.main" />
              <KpiCard
                label="متأخرة"
                value={dashboard.overdue}
                color={dashboard.overdue > 0 ? 'error.main' : 'text.disabled'}
              />
              <KpiCard
                label="نسبة الإنجاز"
                value={`${dashboard.completionRate ?? 0}%`}
                color={
                  dashboard.completionRate >= 80
                    ? 'success.main'
                    : dashboard.completionRate >= 50
                      ? 'warning.main'
                      : 'error.main'
                }
              />
              <KpiCard
                label="إجراءات مفتوحة"
                value={dashboard.totalOpenActions ?? 0}
                color={dashboard.totalOpenActions > 0 ? 'warning.main' : 'text.disabled'}
              />
              {dashboard.avgCycleTimeDays != null && (
                <KpiCard
                  label="متوسط مدة الإغلاق"
                  value={`${dashboard.avgCycleTimeDays} يوم`}
                  color="info.main"
                />
              )}
            </Stack>
          )}

          <Grid container spacing={2}>
            {/* Latest closed */}
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2, height: '100%' }} elevation={2}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CloseReviewIcon color="success" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    آخر مراجعة مغلقة
                  </Typography>
                </Stack>
                {dashboard?.latestClosed ? (
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>الرقم:</strong> {dashboard.latestClosed.reviewNumber}
                    </Typography>
                    <Typography variant="body2">
                      <strong>تاريخ الإغلاق:</strong> {fmtDate(dashboard.latestClosed.closedAt)}
                    </Typography>
                    {dashboard.latestClosed.nextReviewScheduledFor && (
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <ScheduleIcon fontSize="small" color="info" />
                        <Typography variant="body2" color="info.main">
                          الدورة القادمة: {fmtDate(dashboard.latestClosed.nextReviewScheduledFor)}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    لا توجد مراجعات مغلقة بعد
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Upcoming */}
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2, height: '100%' }} elevation={2}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <ScheduleIcon color="info" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={600}>
                    المراجعات القادمة
                  </Typography>
                </Stack>
                {dashboard?.upcoming?.length > 0 ? (
                  <List dense disablePadding>
                    {dashboard.upcoming.map((r, i) => (
                      <ListItem key={r._id || i} disablePadding divider>
                        <ListItemText
                          primary={r.title}
                          secondary={fmtDate(r.scheduledFor)}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <Chip
                          size="small"
                          label={PHASE_LABELS[r.status] || r.status}
                          color={statusColor(r.status)}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    لا توجد مراجعات مجدولة قادمة
                  </Typography>
                )}
              </Paper>
            </Grid>

            {/* Trend */}
            {analytics?.trend?.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <TrendIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" fontWeight={600}>
                      الاتجاه — آخر {analytics.trend.length} شهور
                    </Typography>
                    {analytics.actionCompletionRate != null && (
                      <Chip
                        label={`نسبة إغلاق الإجراءات: ${analytics.actionCompletionRate}%`}
                        size="small"
                        color={analytics.actionCompletionRate >= 70 ? 'success' : 'warning'}
                        sx={{ mr: 'auto' }}
                      />
                    )}
                  </Stack>
                  {analytics.trend.map(t => (
                    <TrendBar
                      key={t.month}
                      label={t.month}
                      scheduled={t.scheduled}
                      closed={t.closed}
                    />
                  ))}
                  <Typography variant="caption" color="text.secondary">
                    الشريط = نسبة المغلقة من المجدولة
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* ══ TAB 1: LIST ══════════════════════════════════════════ */}
      {tab === 1 && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField
                select
                size="small"
                label="الحالة"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {(reference?.statuses || []).map(s => (
                  <MenuItem key={s} value={s}>
                    {PHASE_LABELS[s] || s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="النوع"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">الكل</MenuItem>
                {(reference?.types || []).map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
              <Box sx={{ flex: 1 }} />
              <Button size="small" onClick={loadList} disabled={listLoading}>
                {listLoading ? <CircularProgress size={16} /> : 'تطبيق'}
              </Button>
            </Stack>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات مفتوحة</TableCell>
                  <TableCell align="left">تحكم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {listLoading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                )}
                {!listLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        لا توجد مراجعات
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map(row => {
                  const open = (row.actions || []).filter(a =>
                    ['open', 'in_progress', 'overdue'].includes(a.status)
                  ).length;
                  return (
                    <TableRow key={row._id} hover>
                      <TableCell>
                        <Typography variant="caption" fontFamily="monospace">
                          {row.reviewNumber || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{row.title}</TableCell>
                      <TableCell>{fmtDate(row.scheduledFor)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={PHASE_LABELS[row.status] || row.status}
                          color={statusColor(row.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {open > 0 ? <Chip size="small" label={open} color="warning" /> : '—'}
                      </TableCell>
                      <TableCell align="left">
                        <Tooltip title="تفاصيل وتحرير">
                          <IconButton size="small" onClick={() => openDetail(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {row.status === 'agenda_set' && (
                          <Tooltip title="بدء الاجتماع">
                            <IconButton size="small" onClick={() => handleStart(row)}>
                              <StartIcon fontSize="small" color="primary" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* ══ SCHEDULE DIALOG ══════════════════════════════════════ */}
      <Dialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>جدولة مراجعة إدارة جديدة</span>
            <IconButton onClick={() => setCreateOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="عنوان المراجعة *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              label="تاريخ الاجتماع *"
              type="datetime-local"
              value={form.scheduledFor}
              onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))}
              required
              InputLabelProps={{ shrink: true }}
              disabled={saving}
            />
            <TextField
              select
              label="نوع المراجعة"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              fullWidth
              disabled={saving}
            >
              <MenuItem value="">— غير محدد —</MenuItem>
              {(reference?.types || []).map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="تسمية الدورة (مثل: Q2-2026)"
              value={form.cycleLabel}
              onChange={e => setForm(f => ({ ...f, cycleLabel: e.target.value }))}
              fullWidth
              disabled={saving}
            />
            {serverError && <Alert severity="error">{serverError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || formInvalid}
          >
            جدولة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ DETAIL DRAWER ════════════════════════════════════════ */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', md: 700 }, p: 0 } }}
      >
        {detailLoading && <LinearProgress aria-label="جارٍ تحميل تفاصيل المراجعة" />}
        {detail && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Drawer header */}
            <Box
              sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="h6" fontWeight={700} gutterBottom>
                    {detail.title}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      size="small"
                      label={PHASE_LABELS[detail.status] || detail.status}
                      color={statusColor(detail.status)}
                    />
                    {detail.type && <Chip size="small" label={detail.type} variant="outlined" />}
                    {detail.reviewNumber && (
                      <Chip size="small" label={detail.reviewNumber} variant="outlined" />
                    )}
                  </Stack>
                </Box>
                <IconButton onClick={() => setDrawerOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>

              {detail.status !== 'cancelled' && (
                <Box sx={{ mt: 2 }}>
                  <Stepper activeStep={currentStep} alternativeLabel>
                    {PHASE_STEPS.map(s => (
                      <Step key={s}>
                        <StepLabel>{PHASE_LABELS[s]}</StepLabel>
                      </Step>
                    ))}
                  </Stepper>
                </Box>
              )}
              {detail.status === 'cancelled' && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  ملغاة — {detail.cancelledReason}
                </Alert>
              )}

              {detail.status !== 'closed' && detail.status !== 'cancelled' && (
                <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                  {detail.status === 'agenda_set' && (
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<StartIcon />}
                      onClick={() => handleStart(detail)}
                    >
                      بدء الاجتماع
                    </Button>
                  )}
                  {['decisions_recorded', 'actions_assigned'].includes(detail.status) && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      startIcon={<CloseReviewIcon />}
                      onClick={() => setCloseOpen(true)}
                    >
                      إغلاق المراجعة
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<CancelIcon />}
                    onClick={() => setCancelOpen(true)}
                  >
                    إلغاء
                  </Button>
                </Stack>
              )}
            </Box>

            {/* Detail tabs */}
            <Tabs
              value={detailTab}
              onChange={(_, v) => setDetailTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
            >
              <Tab label="نظرة عامة" />
              <Tab
                label={
                  <Badge badgeContent={detail.inputs?.length || 0} color="info">
                    المدخلات
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={detail.outputs?.length || 0} color="info">
                    المخرجات
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={detail.decisions?.length || 0} color="secondary">
                    القرارات
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge
                    badgeContent={
                      (detail.actions || []).filter(a =>
                        ['open', 'in_progress', 'overdue'].includes(a.status)
                      ).length
                    }
                    color="warning"
                  >
                    الإجراءات
                  </Badge>
                }
              />
              <Tab label="المحضر" />
              <Tab
                label={
                  <Badge badgeContent={detail.approvals?.length || 0} color="success">
                    الاعتمادات
                  </Badge>
                }
              />
            </Tabs>

            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {/* Overview */}
              {detailTab === 0 && (
                <Stack spacing={2}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        تاريخ الاجتماع
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {fmtDate(detail.scheduledFor)}
                      </Typography>
                    </Grid>
                    {detail.startedAt && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          بدأ في
                        </Typography>
                        <Typography variant="body2">{fmtDate(detail.startedAt)}</Typography>
                      </Grid>
                    )}
                    {detail.closedAt && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          أُغلق في
                        </Typography>
                        <Typography variant="body2">{fmtDate(detail.closedAt)}</Typography>
                      </Grid>
                    )}
                    {detail.nextReviewScheduledFor && (
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">
                          الدورة القادمة
                        </Typography>
                        <Typography variant="body2" color="info.main">
                          {fmtDate(detail.nextReviewScheduledFor)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      جدول الأعمال ({detail.agenda?.length || 0})
                    </Typography>
                    {detail.agenda?.length > 0 ? (
                      <List dense disablePadding>
                        {detail.agenda.map((a, i) => (
                          <ListItem key={i} disablePadding>
                            <ListItemText
                              primary={`${i + 1}. ${typeof a === 'string' ? a : a.title || JSON.stringify(a)}`}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        لم يُحدَّد جدول الأعمال بعد
                      </Typography>
                    )}
                  </Box>
                  {detail.attendees?.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        الحاضرون ({detail.attendees.length})
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {detail.attendees.map((a, i) => (
                          <Chip
                            key={i}
                            size="small"
                            label={`${a.nameSnapshot} (${a.role})`}
                            variant={a.present ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}
                  {detail.closureNotes && (
                    <Box>
                      <Typography variant="subtitle2">ملاحظات الإغلاق</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {detail.closureNotes}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}

              {/* Inputs */}
              {detailTab === 1 && (
                <Stack spacing={2}>
                  {detail.inputs?.map((inp, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {inp.code}
                      </Typography>
                      <Typography variant="body2">{inp.summary}</Typography>
                    </Paper>
                  ))}
                  {['agenda_set', 'in_progress'].includes(detail.status) && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        إضافة مدخل (ISO §9.3.2)
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          select
                          size="small"
                          label="الكود"
                          value={inputForm.code}
                          onChange={e => setInputForm(f => ({ ...f, code: e.target.value }))}
                          fullWidth
                        >
                          {(reference?.inputs || []).map(inp => (
                            <MenuItem key={inp.code} value={inp.code}>
                              {inp.nameAr || inp.code}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="الملخص"
                          value={inputForm.summary}
                          onChange={e => setInputForm(f => ({ ...f, summary: e.target.value }))}
                          multiline
                          rows={2}
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={
                            subSaving === 'input' ? <CircularProgress size={14} /> : <InputIcon />
                          }
                          onClick={handleAddInput}
                          disabled={subSaving === 'input' || !inputForm.code || !inputForm.summary}
                        >
                          إضافة
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}

              {/* Outputs */}
              {detailTab === 2 && (
                <Stack spacing={2}>
                  {detail.outputs?.map((out, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {out.code}
                      </Typography>
                      <Typography variant="body2">{out.description}</Typography>
                    </Paper>
                  ))}
                  {['in_progress', 'decisions_recorded', 'actions_assigned'].includes(
                    detail.status
                  ) && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        إضافة مخرج (ISO §9.3.3)
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          select
                          size="small"
                          label="الكود"
                          value={outputForm.code}
                          onChange={e => setOutputForm(f => ({ ...f, code: e.target.value }))}
                          fullWidth
                        >
                          {(reference?.outputs || []).map(o => (
                            <MenuItem key={o.code} value={o.code}>
                              {o.nameAr || o.code}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="الوصف"
                          value={outputForm.description}
                          onChange={e =>
                            setOutputForm(f => ({ ...f, description: e.target.value }))
                          }
                          multiline
                          rows={2}
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={
                            subSaving === 'output' ? <CircularProgress size={14} /> : <InputIcon />
                          }
                          onClick={handleAddOutput}
                          disabled={
                            subSaving === 'output' || !outputForm.code || !outputForm.description
                          }
                        >
                          إضافة
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}

              {/* Decisions */}
              {detailTab === 3 && (
                <Stack spacing={2}>
                  {detail.decisions?.map((dec, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Chip size="small" label={dec.type} variant="outlined" sx={{ mb: 0.5 }} />
                      <Typography variant="body2" fontWeight={500}>
                        {dec.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dec.rationale}
                      </Typography>
                    </Paper>
                  ))}
                  {['in_progress', 'decisions_recorded', 'actions_assigned'].includes(
                    detail.status
                  ) && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        تسجيل قرار
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          select
                          size="small"
                          label="نوع القرار"
                          value={decisionForm.type}
                          onChange={e => setDecisionForm(f => ({ ...f, type: e.target.value }))}
                          fullWidth
                        >
                          {(reference?.decisionTypes || []).map(t => (
                            <MenuItem key={t} value={t}>
                              {t}
                            </MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          size="small"
                          label="عنوان القرار"
                          value={decisionForm.title}
                          onChange={e => setDecisionForm(f => ({ ...f, title: e.target.value }))}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          label="المبرر"
                          value={decisionForm.rationale}
                          onChange={e =>
                            setDecisionForm(f => ({ ...f, rationale: e.target.value }))
                          }
                          multiline
                          rows={2}
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={
                            subSaving === 'decision' ? (
                              <CircularProgress size={14} />
                            ) : (
                              <DecisionIcon />
                            )
                          }
                          onClick={handleAddDecision}
                          disabled={
                            subSaving === 'decision' ||
                            !decisionForm.type ||
                            !decisionForm.title ||
                            !decisionForm.rationale
                          }
                        >
                          تسجيل
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}

              {/* Actions */}
              {detailTab === 4 && (
                <Stack spacing={2}>
                  {(detail.actions || []).map((act, i) => (
                    <Paper key={String(act._id) || i} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={500}>
                            {act.title}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ mt: 0.5 }}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            <Chip size="small" label={act.priority} variant="outlined" />
                            <Chip
                              size="small"
                              label={PHASE_LABELS[act.status] || act.status}
                              color={actionStatusColor(act.status)}
                            />
                            <Typography variant="caption" color="text.secondary">
                              يستحق: {fmtDate(act.dueDate)}
                            </Typography>
                          </Stack>
                          {act.completionNotes && (
                            <Typography
                              variant="caption"
                              color="success.main"
                              display="block"
                              mt={0.5}
                            >
                              ✓ {act.completionNotes}
                            </Typography>
                          )}
                        </Box>
                        {!['completed', 'cancelled'].includes(act.status) && (
                          <Stack direction="column" spacing={0.5} sx={{ ml: 1 }}>
                            {act.status !== 'in_progress' && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  handleUpdateActionStatus(String(act._id), 'in_progress')
                                }
                                disabled={subSaving === `act-${String(act._id)}`}
                              >
                                قيد التنفيذ
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleUpdateActionStatus(String(act._id), 'completed')}
                              disabled={subSaving === `act-${String(act._id)}`}
                            >
                              إنجاز
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    </Paper>
                  ))}
                  {['decisions_recorded', 'actions_assigned'].includes(detail.status) && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        إضافة إجراء
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          size="small"
                          label="عنوان الإجراء"
                          value={actionForm.title}
                          onChange={e => setActionForm(f => ({ ...f, title: e.target.value }))}
                          fullWidth
                        />
                        <TextField
                          size="small"
                          label="معرّف المسؤول"
                          value={actionForm.ownerUserId}
                          onChange={e =>
                            setActionForm(f => ({ ...f, ownerUserId: e.target.value }))
                          }
                          fullWidth
                        />
                        <Stack direction="row" spacing={1}>
                          <TextField
                            select
                            size="small"
                            label="الأولوية"
                            value={actionForm.priority}
                            onChange={e => setActionForm(f => ({ ...f, priority: e.target.value }))}
                            sx={{ flex: 1 }}
                          >
                            {(
                              reference?.actionPriorities || ['low', 'medium', 'high', 'critical']
                            ).map(p => (
                              <MenuItem key={p} value={p}>
                                {p}
                              </MenuItem>
                            ))}
                          </TextField>
                          <TextField
                            size="small"
                            type="date"
                            label="تاريخ الاستحقاق"
                            value={actionForm.dueDate}
                            onChange={e => setActionForm(f => ({ ...f, dueDate: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                            sx={{ flex: 1 }}
                          />
                        </Stack>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={
                            subSaving === 'action' ? <CircularProgress size={14} /> : <ActionIcon />
                          }
                          onClick={handleAddAction}
                          disabled={
                            subSaving === 'action' || !actionForm.title || !actionForm.ownerUserId
                          }
                        >
                          إضافة
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}

              {/* Minutes */}
              {detailTab === 5 && (
                <Stack spacing={2}>
                  <TextField
                    label="محضر الاجتماع"
                    value={minutesText}
                    onChange={e => setMinutesText(e.target.value)}
                    multiline
                    rows={12}
                    fullWidth
                    placeholder="اكتب ملخص الاجتماع، النقاشات، والتوصيات..."
                    disabled={
                      !['in_progress', 'decisions_recorded', 'actions_assigned', 'closed'].includes(
                        detail.status
                      )
                    }
                  />
                  {['in_progress', 'decisions_recorded', 'actions_assigned', 'closed'].includes(
                    detail.status
                  ) && (
                    <Button
                      variant="contained"
                      startIcon={
                        subSaving === 'minutes' ? <CircularProgress size={14} /> : <MinutesIcon />
                      }
                      onClick={handleSaveMinutes}
                      disabled={subSaving === 'minutes'}
                    >
                      حفظ المحضر
                    </Button>
                  )}
                </Stack>
              )}

              {/* Approvals */}
              {detailTab === 6 && (
                <Stack spacing={2}>
                  {(detail.approvals || []).map((ap, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {ap.role}
                          </Typography>
                          {ap.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {ap.notes}
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.disabled">
                          {fmtDate(ap.signedAt)}
                        </Typography>
                      </Stack>
                    </Paper>
                  ))}
                  {detail.status === 'closed' && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        إضافة توقيع اعتماد
                      </Typography>
                      <Stack spacing={2}>
                        <TextField
                          size="small"
                          label="الدور الوظيفي"
                          value={approvalForm.role}
                          onChange={e => setApprovalForm(f => ({ ...f, role: e.target.value }))}
                          fullWidth
                          placeholder="مثل: ceo، quality_manager"
                        />
                        <TextField
                          size="small"
                          label="ملاحظات (اختياري)"
                          value={approvalForm.notes}
                          onChange={e => setApprovalForm(f => ({ ...f, notes: e.target.value }))}
                          fullWidth
                        />
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={
                            subSaving === 'approval' ? (
                              <CircularProgress size={14} />
                            ) : (
                              <ApprovalIcon />
                            )
                          }
                          onClick={handleApprove}
                          disabled={subSaving === 'approval' || !approvalForm.role}
                        >
                          اعتماد
                        </Button>
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              )}
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ══ CLOSE DIALOG ════════════════════════════════════════ */}
      <Dialog open={closeOpen} onClose={() => setCloseOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إغلاق المراجعة</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            سيتم إغلاق المراجعة ونقلها للحالة النهائية. هذا الإجراء موثَّق وغير قابل للتراجع.
          </Typography>
          <TextField
            label="ملاحظات الإغلاق (اختياري)"
            value={closureNotes}
            onChange={e => setClosureNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={subSaving === 'close' ? <CircularProgress size={16} /> : <CloseReviewIcon />}
            onClick={handleClose}
            disabled={subSaving === 'close'}
          >
            تأكيد الإغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ CANCEL DIALOG ═══════════════════════════════════════ */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>إلغاء المراجعة</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            إلغاء المراجعة سيوقف دورتها. يُرجى توثيق السبب.
          </Alert>
          <TextField
            label="سبب الإلغاء *"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            multiline
            rows={3}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={subSaving === 'cancel' ? <CircularProgress size={16} /> : <CancelIcon />}
            onClick={handleCancel}
            disabled={subSaving === 'cancel' || !cancelReason.trim()}
          >
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
