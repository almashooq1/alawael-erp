/**
 * Tele-Rehabilitation Page — صفحة التأهيل عن بُعد
 *
 * الهدف السريري: جدولة وإدارة جلسات التأهيل عن بُعد عبر الإنترنت،
 * تتبع جودة الاتصال ورضا المستفيد، وتوفير لوحة متابعة شاملة.
 *
 * يستخدم: teleRehabAPI من services/ddd
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Rating,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  VideoCall as VideoIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  SignalCellularAlt as QualityIcon,
} from '@mui/icons-material';
import { teleRehabAPI } from '../../services/ddd';

// ── Constants ─────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'custom', label: 'منصة خاصة' },
  { value: 'whatsapp', label: 'واتساب' },
];

const SESSION_STATUSES = {
  scheduled: { label: 'مجدولة', color: 'primary' },
  in_progress: { label: 'جارية', color: 'warning' },
  completed: { label: 'مكتملة', color: 'success' },
  canceled: { label: 'ملغاة', color: 'error' },
  no_show: { label: 'لم يحضر', color: 'default' },
};

const QUALITY_RATINGS = [
  { value: 5, label: 'ممتاز' },
  { value: 4, label: 'جيد جداً' },
  { value: 3, label: 'جيد' },
  { value: 2, label: 'مقبول' },
  { value: 1, label: 'ضعيف' },
];

const INITIAL_SCHEDULE_FORM = {
  beneficiaryId: '',
  therapistId: '',
  scheduledAt: '',
  durationMinutes: 45,
  platform: 'zoom',
  meetingLink: '',
  notes: '',
};

const INITIAL_COMPLETE_FORM = {
  summary: '',
  goalsAchieved: '',
  nextSessionGoals: '',
  homeworkAssigned: '',
  overallProgress: 3,
};

const INITIAL_QUALITY_FORM = {
  videoQuality: 4,
  audioQuality: 4,
  connectionStability: 4,
  notes: '',
};

const fmtDate = d => (d ? new Date(d).toLocaleString('ar-SA') : '—');
const _fmtDateShort = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, loading: busy }) {
  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${color}33` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          {busy ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="h4" fontWeight="bold" lineHeight={1}>
              {value ?? 0}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Status Chip ───────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const s = SESSION_STATUSES[status] || { label: status, color: 'default' };
  return <Chip label={s.label} color={s.color} size="small" />;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TeleRehabPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [dashboardData, setDashboardData] = useState(null);

  // Dialogs
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [completeDialog, setCompleteDialog] = useState(false);
  const [qualityDialog, setQualityDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  // Forms
  const [scheduleForm, setScheduleForm] = useState(INITIAL_SCHEDULE_FORM);
  const [completeForm, setCompleteForm] = useState(INITIAL_COMPLETE_FORM);
  const [qualityForm, setQualityForm] = useState(INITIAL_QUALITY_FORM);
  const [cancelReason, setCancelReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBeneficiary, setFilterBeneficiary] = useState('');

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await teleRehabAPI.getDashboard({});
      setDashboardData(res?.data?.data || res?.data || null);
    } catch {
      setDashboardData(null);
    }
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const params = {
        limit: 50,
        ...(filterStatus && { status: filterStatus }),
        ...(filterBeneficiary && { beneficiaryId: filterBeneficiary }),
      };
      const res = await teleRehabAPI.list(params);
      const data = res?.data?.data || res?.data?.sessions || res?.data || [];
      setSessions(Array.isArray(data) ? data : []);
      setTotal(res?.data?.total || data.length);
    } catch {
      setSessions([]);
    }
  }, [filterStatus, filterBeneficiary]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([fetchDashboard(), fetchSessions()]);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchSessions]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const d = dashboardData;
    return {
      total: d?.totalSessions ?? total,
      completed: d?.completedSessions ?? sessions.filter(s => s.status === 'completed').length,
      upcoming: d?.upcomingSessions ?? sessions.filter(s => s.status === 'scheduled').length,
      avgQuality: d?.avgConnectionQuality ?? null,
    };
  }, [dashboardData, total, sessions]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSchedule = async () => {
    if (!scheduleForm.beneficiaryId.trim()) {
      setFormError('معرّف المستفيد مطلوب');
      return;
    }
    if (!scheduleForm.scheduledAt) {
      setFormError('تاريخ ووقت الجلسة مطلوبان');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await teleRehabAPI.schedule({
        ...scheduleForm,
        scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
        durationMinutes: Number(scheduleForm.durationMinutes),
      });
      setScheduleDialog(false);
      setScheduleForm(INITIAL_SCHEDULE_FORM);
      fetchAll();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ أثناء الجدولة');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async session => {
    try {
      await teleRehabAPI.start(session._id);
      fetchSessions();
    } catch (err) {
      setError(err?.response?.data?.message || 'تعذّر بدء الجلسة');
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    setFormError('');
    try {
      await teleRehabAPI.complete(activeSession._id, {
        ...completeForm,
        overallProgress: Number(completeForm.overallProgress),
      });
      setCompleteDialog(false);
      setCompleteForm(INITIAL_COMPLETE_FORM);
      fetchAll();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleQuality = async () => {
    setSaving(true);
    setFormError('');
    try {
      await teleRehabAPI.recordQuality(activeSession._id, {
        ...qualityForm,
        videoQuality: Number(qualityForm.videoQuality),
        audioQuality: Number(qualityForm.audioQuality),
        connectionStability: Number(qualityForm.connectionStability),
      });
      setQualityDialog(false);
      setQualityForm(INITIAL_QUALITY_FORM);
      fetchSessions();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setFormError('سبب الإلغاء مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await teleRehabAPI.cancel(activeSession._id, { reason: cancelReason });
      setCancelDialog(false);
      setCancelReason('');
      fetchSessions();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const setSchedField = k => e => setScheduleForm(f => ({ ...f, [k]: e.target.value }));
  const setComplField = k => e => setCompleteForm(f => ({ ...f, [k]: e.target.value }));
  const setQualField = k => e => setQualityForm(f => ({ ...f, [k]: e.target.value }));

  const openComplete = s => {
    setActiveSession(s);
    setFormError('');
    setCompleteDialog(true);
  };
  const openQuality = s => {
    setActiveSession(s);
    setFormError('');
    setQualityDialog(true);
  };
  const openCancel = s => {
    setActiveSession(s);
    setFormError('');
    setCancelDialog(true);
  };

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#0288d1', width: 44, height: 44 }}>
            <VideoIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              التأهيل عن بُعد
            </Typography>
            <Typography variant="caption" color="text.secondary">
              جدولة جلسات التأهيل الإلكتروني وتتبع الجودة والمتابعة
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchAll} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="لوحة المتابعة" />
        <Tab
          icon={<CalendarIcon fontSize="small" />}
          iconPosition="start"
          label={`الجلسات (${total})`}
        />
      </Tabs>

      {/* ── TAB 0: Dashboard ── */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="إجمالي الجلسات"
                value={kpis.total}
                icon={<VideoIcon />}
                color="#0288d1"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="جلسات مكتملة"
                value={kpis.completed}
                icon={<CompleteIcon />}
                color="#4caf50"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="جلسات مجدولة"
                value={kpis.upcoming}
                icon={<CalendarIcon />}
                color="#ff9800"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="متوسط جودة الاتصال"
                value={kpis.avgQuality ? `${kpis.avgQuality}/5` : '—'}
                icon={<QualityIcon />}
                color="#9c27b0"
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Upcoming sessions */}
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold">
                  الجلسات المجدولة القادمة
                </Typography>
                <Button size="small" onClick={() => setTab(1)}>
                  عرض الكل
                </Button>
              </Box>
              {sessions.filter(s => s.status === 'scheduled').length === 0 ? (
                <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                  لا توجد جلسات مجدولة
                </Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell>المستفيد</TableCell>
                        <TableCell>المعالج</TableCell>
                        <TableCell>الموعد</TableCell>
                        <TableCell>المنصة</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell align="center">إجراء</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sessions
                        .filter(s => s.status === 'scheduled')
                        .slice(0, 5)
                        .map(s => (
                          <TableRow key={s._id} hover>
                            <TableCell>{s.beneficiaryId?.name || s.beneficiaryId}</TableCell>
                            <TableCell>{s.therapistId?.name || s.therapistId || '—'}</TableCell>
                            <TableCell>
                              <Typography variant="caption">{fmtDate(s.scheduledAt)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={
                                  PLATFORMS.find(p => p.value === s.platform)?.label || s.platform
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <StatusChip status={s.status} />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<StartIcon />}
                                onClick={() => handleStart(s)}
                                sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
                              >
                                بدء
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
        </Box>
      )}

      {/* ── TAB 1: All Sessions ── */}
      {tab === 1 && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 2 }}
            flexWrap="wrap"
            useFlexGap
          >
            <TextField
              size="small"
              placeholder="معرّف المستفيد..."
              value={filterBeneficiary}
              onChange={e => setFilterBeneficiary(e.target.value)}
              sx={{ minWidth: 180 }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  fetchSessions();
                }}
                label="الحالة"
              >
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(SESSION_STATUSES).map(([v, s]) => (
                  <MenuItem key={v} value={v}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError('');
                setScheduleDialog(true);
              }}
              sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
            >
              جدولة جلسة
            </Button>
          </Stack>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>المعالج</TableCell>
                  <TableCell>الموعد</TableCell>
                  <TableCell>المدة</TableCell>
                  <TableCell>المنصة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      لا توجد جلسات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map(s => (
                    <TableRow key={s._id} hover>
                      <TableCell>{s.beneficiaryId?.name || s.beneficiaryId}</TableCell>
                      <TableCell>{s.therapistId?.name || s.therapistId || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption">{fmtDate(s.scheduledAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{s.durationMinutes} دقيقة</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={PLATFORMS.find(p => p.value === s.platform)?.label || s.platform}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={s.status} />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {s.status === 'scheduled' && (
                            <Tooltip title="بدء الجلسة">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleStart(s)}
                              >
                                <StartIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {s.status === 'in_progress' && (
                            <Tooltip title="إتمام الجلسة">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => openComplete(s)}
                              >
                                <CompleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {s.status === 'completed' && (
                            <Tooltip title="تسجيل جودة الاتصال">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => openQuality(s)}
                              >
                                <QualityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(s.status === 'scheduled' || s.status === 'in_progress') && (
                            <Tooltip title="إلغاء">
                              <IconButton size="small" color="error" onClick={() => openCancel(s)}>
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Schedule Dialog ── */}
      <Dialog
        open={scheduleDialog}
        onClose={() => setScheduleDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">جدولة جلسة تأهيل عن بُعد</Typography>
            <IconButton onClick={() => setScheduleDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="معرّف المستفيد *"
                value={scheduleForm.beneficiaryId}
                onChange={setSchedField('beneficiaryId')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="معرّف المعالج"
                value={scheduleForm.therapistId}
                onChange={setSchedField('therapistId')}
              />
            </Grid>
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                type="datetime-local"
                label="تاريخ ووقت الجلسة *"
                value={scheduleForm.scheduledAt}
                onChange={setSchedField('scheduledAt')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="المدة (دقيقة)"
                value={scheduleForm.durationMinutes}
                onChange={setSchedField('durationMinutes')}
                inputProps={{ min: 15, max: 120 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>المنصة</InputLabel>
                <Select
                  value={scheduleForm.platform}
                  onChange={setSchedField('platform')}
                  label="المنصة"
                >
                  {PLATFORMS.map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="رابط الاجتماع"
                value={scheduleForm.meetingLink}
                onChange={setSchedField('meetingLink')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="ملاحظات"
                value={scheduleForm.notes}
                onChange={setSchedField('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={saving}
            sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
          >
            {saving ? <CircularProgress size={20} /> : 'جدولة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Complete Session Dialog ── */}
      <Dialog
        open={completeDialog}
        onClose={() => setCompleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">إتمام الجلسة وتوثيق النتائج</Typography>
            <IconButton onClick={() => setCompleteDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="ملخص الجلسة"
                value={completeForm.summary}
                onChange={setComplField('summary')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الأهداف المحققة"
                value={completeForm.goalsAchieved}
                onChange={setComplField('goalsAchieved')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="أهداف الجلسة القادمة"
                value={completeForm.nextSessionGoals}
                onChange={setComplField('nextSessionGoals')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="الواجب المنزلي المكلَّف به"
                value={completeForm.homeworkAssigned}
                onChange={setComplField('homeworkAssigned')}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                التقدم العام (1–5)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating
                  value={Number(completeForm.overallProgress)}
                  onChange={(_, v) => setCompleteForm(f => ({ ...f, overallProgress: v }))}
                  max={5}
                />
                <Typography variant="body2">
                  {
                    QUALITY_RATINGS.find(r => r.value === Number(completeForm.overallProgress))
                      ?.label
                  }
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleComplete} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'إتمام الجلسة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Quality Dialog ── */}
      <Dialog open={qualityDialog} onClose={() => setQualityDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تسجيل جودة الاتصال</Typography>
            <IconButton onClick={() => setQualityDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2}>
            {[
              { field: 'videoQuality', label: 'جودة الصورة' },
              { field: 'audioQuality', label: 'جودة الصوت' },
              { field: 'connectionStability', label: 'استقرار الاتصال' },
            ].map(({ field, label }) => (
              <Box key={field}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Rating
                    value={Number(qualityForm[field])}
                    onChange={(_, v) => setQualityForm(f => ({ ...f, [field]: v }))}
                    max={5}
                  />
                </Stack>
              </Box>
            ))}
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="ملاحظات"
              value={qualityForm.notes}
              onChange={setQualField('notes')}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQualityDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="secondary" onClick={handleQuality} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Cancel Dialog ── */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">إلغاء الجلسة</Typography>
            <IconButton onClick={() => setCancelDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            multiline
            rows={2}
            label="سبب الإلغاء *"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>تراجع</Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'تأكيد الإلغاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
