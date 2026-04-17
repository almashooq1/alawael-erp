/**
 * AdminTherapySessions — /admin/therapy-sessions page.
 *
 * Manage clinical therapy sessions: calendar view + list, create with
 * conflict detection, status transitions, check-in, recurrence.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Paper,
  Alert,
  Tabs,
  Tab,
  Autocomplete,
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LoginIcon from '@mui/icons-material/Login';
import EventIcon from '@mui/icons-material/Event';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import api from '../../services/api.client';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'SCHEDULED', label: 'مجدولة', color: 'info' },
  { value: 'CONFIRMED', label: 'مؤكَّدة', color: 'primary' },
  { value: 'IN_PROGRESS', label: 'جارية', color: 'warning' },
  { value: 'COMPLETED', label: 'مكتملة', color: 'success' },
  { value: 'NO_SHOW', label: 'لم يحضر', color: 'error' },
  { value: 'CANCELLED_BY_PATIENT', label: 'ألغاها المستفيد', color: 'default' },
  { value: 'CANCELLED_BY_CENTER', label: 'ألغاها المركز', color: 'default' },
  { value: 'RESCHEDULED', label: 'أُعيدت جدولتها', color: 'secondary' },
];
const STATUS_COLORS = STATUS_OPTIONS.reduce(
  (a, o) => ({ ...a, [o.value]: o.color || 'default' }),
  {}
);
const STATUS_LABELS = STATUS_OPTIONS.reduce((a, o) => ({ ...a, [o.value]: o.label }), {});

const TYPE_OPTIONS = ['علاج طبيعي', 'علاج وظيفي', 'نطق وتخاطب', 'علاج سلوكي', 'علاج نفسي', 'أخرى'];
const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'مرة واحدة' },
  { value: 'daily', label: 'يومياً' },
  { value: 'weekly', label: 'أسبوعياً' },
  { value: 'biweekly', label: 'كل أسبوعين' },
  { value: 'monthly', label: 'شهرياً' },
];

const EMPTY = {
  title: '',
  sessionType: 'علاج طبيعي',
  beneficiary: null,
  therapist: null,
  room: null,
  date: new Date().toISOString().slice(0, 10),
  startTime: '10:00',
  endTime: '11:00',
  priority: 'normal',
  recurrence: 'none',
  recurrenceEnd: '',
};

function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}
function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}

export default function AdminTherapySessions() {
  const [tab, setTab] = useState(0); // 0=list, 1=calendar
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [calendarGrouped, setCalendarGrouped] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  // Filters
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [sessionType, setSessionType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [forceCreate, setForceCreate] = useState(false);

  // View detail
  const [detailSession, setDetailSession] = useState(null);

  // Status-change dialog
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    session: null,
    newStatus: '',
    reason: '',
  });

  // Option sources
  const [beneficiaryOpts, setBeneficiaryOpts] = useState([]);
  const [therapistOpts, setTherapistOpts] = useState([]);
  const [roomOpts, setRoomOpts] = useState([]);

  const loadOptions = useCallback(async () => {
    const tryGet = async (path, mapFn) => {
      try {
        const { data } = await api.get(path);
        const list = data?.items || data?.data || data?.results || [];
        return list.map(mapFn);
      } catch {
        return [];
      }
    };
    const [b, t, r] = await Promise.all([
      tryGet('/admin/beneficiaries?limit=100', x => ({
        id: x._id,
        label: `${fullName(x)} (${x.beneficiaryNumber || '—'})`,
      })),
      tryGet('/employees?limit=100', x => ({
        id: x._id,
        label: `${fullName(x)} (${x.employeeNumber || x.role || '—'})`,
      })),
      tryGet('/therapy-rooms?limit=100', x => ({
        id: x._id,
        label: x.name || x.code || x._id,
      })),
    ]);
    setBeneficiaryOpts(b);
    setTherapistOpts(t);
    setRoomOpts(r);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/therapy-sessions/stats');
      setStats(data);
    } catch {
      setStats(null);
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (sessionType) params.set('sessionType', sessionType);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      const { data } = await api.get(`/admin/therapy-sessions?${params.toString()}`);
      setItems(data?.items || []);
      if (data?.pagination) setPagination(p => ({ ...p, ...data.pagination }));
    } catch (err) {
      setErrMsg(err?.response?.data?.message || err?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [q, status, sessionType, from, to, pagination.page, pagination.limit]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    setErrMsg('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const { data } = await api.get(`/admin/therapy-sessions/calendar?${params.toString()}`);
      setCalendarGrouped(data?.grouped || {});
    } catch (err) {
      setErrMsg(err?.response?.data?.message || err?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  useEffect(() => {
    if (tab === 0) loadList();
    else loadCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q, status, sessionType, from, to, pagination.page, pagination.limit]);

  const resetForm = () => {
    setForm(EMPTY);
    setFormErr('');
    setConflicts([]);
    setForceCreate(false);
  };

  const openCreate = () => {
    resetForm();
    setEditMode(false);
    setDialogOpen(true);
  };

  const openEdit = async session => {
    try {
      const { data } = await api.get(`/admin/therapy-sessions/${session._id}`);
      const s = data?.data || session;
      setForm({
        _id: s._id,
        title: s.title || '',
        sessionType: s.sessionType || 'علاج طبيعي',
        beneficiary: s.beneficiary
          ? {
              id: s.beneficiary._id || s.beneficiary,
              label: fullName(s.beneficiary) || s.beneficiary._id,
            }
          : null,
        therapist: s.therapist
          ? {
              id: s.therapist._id || s.therapist,
              label: fullName(s.therapist) || s.therapist._id,
            }
          : null,
        room: s.room ? { id: s.room._id || s.room, label: s.room.name || s.room._id } : null,
        date: s.date ? new Date(s.date).toISOString().slice(0, 10) : '',
        startTime: s.startTime || '10:00',
        endTime: s.endTime || '11:00',
        priority: s.priority || 'normal',
        recurrence: 'none',
        recurrenceEnd: '',
      });
      setEditMode(true);
      setConflicts([]);
      setForceCreate(false);
      setFormErr('');
      setDialogOpen(true);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    }
  };

  const submitForm = async () => {
    setFormErr('');
    if (!form.date || !form.startTime || !form.endTime) {
      setFormErr('التاريخ ووقت البداية والنهاية مطلوبة');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        sessionType: form.sessionType,
        beneficiary: form.beneficiary?.id,
        therapist: form.therapist?.id,
        room: form.room?.id,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        priority: form.priority,
        recurrence: form.recurrence,
        recurrenceEnd: form.recurrenceEnd || undefined,
        force: forceCreate,
      };
      if (editMode) {
        await api.patch(`/admin/therapy-sessions/${form._id}`, payload);
      } else {
        await api.post('/admin/therapy-sessions', payload);
      }
      setDialogOpen(false);
      resetForm();
      loadStats();
      if (tab === 0) loadList();
      else loadCalendar();
    } catch (err) {
      const d = err?.response?.data;
      if (d?.conflicts?.length) {
        setConflicts(d.conflicts);
        setFormErr(d.message || 'يوجد تعارض — فعّل "تجاوز التعارض" للمتابعة');
      } else {
        setFormErr(d?.message || err?.message || 'فشل الحفظ');
      }
    } finally {
      setSaving(false);
    }
  };

  const doCheckIn = async session => {
    try {
      await api.post(`/admin/therapy-sessions/${session._id}/check-in`, {});
      loadStats();
      if (tab === 0) loadList();
      else loadCalendar();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تسجيل الحضور');
    }
  };

  const submitStatusChange = async () => {
    const { session, newStatus, reason } = statusDialog;
    if (!session || !newStatus) return;
    try {
      await api.post(`/admin/therapy-sessions/${session._id}/status`, {
        status: newStatus,
        reason,
      });
      setStatusDialog({ open: false, session: null, newStatus: '', reason: '' });
      loadStats();
      if (tab === 0) loadList();
      else loadCalendar();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تحديث الحالة');
    }
  };

  const doCancel = async session => {
    const reason = window.prompt('سبب الإلغاء؟', 'ظروف تشغيلية');
    if (reason === null) return;
    try {
      await api.delete(`/admin/therapy-sessions/${session._id}`, { data: { reason } });
      loadStats();
      if (tab === 0) loadList();
      else loadCalendar();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإلغاء');
    }
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'إجمالي الجلسات',
        value: stats.total || 0,
        icon: <EventIcon />,
        color: 'primary.main',
      },
      {
        label: 'اليوم',
        value: stats.today || 0,
        icon: <TodayIcon />,
        color: 'warning.main',
      },
      {
        label: 'هذا الأسبوع',
        value: stats.week || 0,
        icon: <DateRangeIcon />,
        color: 'info.main',
      },
      {
        label: 'معدّل الإكمال',
        value: stats.completionRate != null ? `${stats.completionRate}%` : '—',
        icon: <TrendingUpIcon />,
        color: 'success.main',
      },
    ];
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إدارة الجلسات العلاجية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            جدولة ومتابعة الجلسات الإكلينيكية — تقويم، قائمة، اكتشاف التعارضات، تسجيل الحضور.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton
              onClick={() => {
                loadStats();
                tab === 0 ? loadList() : loadCalendar();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            جلسة جديدة
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: s.color, fontSize: 40 }}>{s.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2 }}>
        <Stack direction="row" spacing={2} p={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="بحث بالعنوان أو ملاحظات..."
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select label="الحالة" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>نوع الجلسة</InputLabel>
            <Select
              label="نوع الجلسة"
              value={sessionType}
              onChange={e => setSessionType(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              {TYPE_OPTIONS.map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="من"
            InputLabelProps={{ shrink: true }}
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="إلى"
            InputLabelProps={{ shrink: true }}
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </Stack>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab label="قائمة الجلسات" />
          <Tab label="عرض التقويم" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>الوقت</TableCell>
                <TableCell>المستفيد</TableCell>
                <TableCell>المعالج</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الغرفة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography color="text.secondary" py={3}>
                      لا توجد جلسات مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {items.map(s => (
                <TableRow key={s._id} hover>
                  <TableCell>{formatDate(s.date)}</TableCell>
                  <TableCell>
                    {s.startTime || '—'} → {s.endTime || '—'}
                  </TableCell>
                  <TableCell>{fullName(s.beneficiary) || '—'}</TableCell>
                  <TableCell>{fullName(s.therapist) || '—'}</TableCell>
                  <TableCell>{s.sessionType || '—'}</TableCell>
                  <TableCell>{s.room?.name || s.location || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUS_LABELS[s.status] || s.status}
                      color={STATUS_COLORS[s.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض">
                      <IconButton size="small" onClick={() => setDetailSession(s)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEdit(s)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {s.status !== 'IN_PROGRESS' && s.status !== 'COMPLETED' && (
                      <Tooltip title="تسجيل حضور">
                        <IconButton size="small" color="warning" onClick={() => doCheckIn(s)}>
                          <LoginIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {s.status !== 'COMPLETED' && (
                      <Tooltip title="إنهاء كمكتملة">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() =>
                            setStatusDialog({
                              open: true,
                              session: s,
                              newStatus: 'COMPLETED',
                              reason: '',
                            })
                          }
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {s.status !== 'CANCELLED_BY_CENTER' && s.status !== 'CANCELLED_BY_PATIENT' && (
                      <Tooltip title="إلغاء">
                        <IconButton size="small" color="error" onClick={() => doCancel(s)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            p={2}
            borderTop={1}
            borderColor="divider"
          >
            <Typography variant="body2" color="text.secondary">
              {pagination.total} جلسة · صفحة {pagination.page} من {pagination.pages || 1}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              >
                السابق
              </Button>
              <Button
                size="small"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              >
                التالي
              </Button>
            </Stack>
          </Stack>
        </TableContainer>
      )}

      {tab === 1 && (
        <Box>
          {Object.keys(calendarGrouped).length === 0 && !loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد جلسات في النطاق الزمني المحدد.</Typography>
            </Paper>
          )}
          <Stack spacing={2}>
            {Object.keys(calendarGrouped)
              .sort()
              .map(day => (
                <Paper key={day} sx={{ overflow: 'hidden' }}>
                  <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1 }}>
                    <Typography fontWeight="bold">
                      {new Date(day).toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}{' '}
                      · {calendarGrouped[day].length} جلسة
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableBody>
                      {calendarGrouped[day].map(s => (
                        <TableRow key={s._id} hover>
                          <TableCell sx={{ width: 110 }}>
                            {s.startTime || '—'} → {s.endTime || '—'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={500}>
                              {fullName(s.beneficiary) || '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {s.sessionType} · {fullName(s.therapist) || '—'}
                              {s.room?.name ? ` · ${s.room.name}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ width: 140 }}>
                            <Chip
                              size="small"
                              label={STATUS_LABELS[s.status] || s.status}
                              color={STATUS_COLORS[s.status] || 'default'}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ width: 150 }}>
                            <IconButton size="small" onClick={() => setDetailSession(s)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => openEdit(s)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              ))}
          </Stack>
        </Box>
      )}

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{editMode ? 'تعديل الجلسة' : 'جلسة جديدة'}</DialogTitle>
        <DialogContent dividers>
          {formErr && (
            <Alert severity={conflicts.length ? 'warning' : 'error'} sx={{ mb: 2 }}>
              {formErr}
            </Alert>
          )}
          {conflicts.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography fontWeight="bold" mb={1}>
                تعارضات الجدولة ({conflicts.length}):
              </Typography>
              {conflicts.map((c, i) => (
                <Typography key={i} variant="body2">
                  • {c.startTime} → {c.endTime} — {c.title || 'جلسة'}
                </Typography>
              ))}
              <FormControl size="small" sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input
                    type="checkbox"
                    checked={forceCreate}
                    onChange={e => setForceCreate(e.target.checked)}
                    id="force"
                  />
                  <label htmlFor="force">تجاوز التعارض والمتابعة</label>
                </Stack>
              </FormControl>
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان الجلسة (اختياري)"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={beneficiaryOpts}
                value={form.beneficiary}
                onChange={(_, v) => setForm(f => ({ ...f, beneficiary: v }))}
                getOptionLabel={o => o?.label || ''}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={p => <TextField {...p} label="المستفيد *" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={therapistOpts}
                value={form.therapist}
                onChange={(_, v) => setForm(f => ({ ...f, therapist: v }))}
                getOptionLabel={o => o?.label || ''}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={p => <TextField {...p} label="المعالج" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={roomOpts}
                value={form.room}
                onChange={(_, v) => setForm(f => ({ ...f, room: v }))}
                getOptionLabel={o => o?.label || ''}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={p => <TextField {...p} label="الغرفة" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الجلسة</InputLabel>
                <Select
                  label="نوع الجلسة"
                  value={form.sessionType}
                  onChange={e => setForm(f => ({ ...f, sessionType: e.target.value }))}
                >
                  {TYPE_OPTIONS.map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ *"
                InputLabelProps={{ shrink: true }}
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                fullWidth
                type="time"
                label="من *"
                InputLabelProps={{ shrink: true }}
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} md={4}>
              <TextField
                fullWidth
                type="time"
                label="إلى *"
                InputLabelProps={{ shrink: true }}
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
              />
            </Grid>
            {!editMode && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>التكرار</InputLabel>
                    <Select
                      label="التكرار"
                      value={form.recurrence}
                      onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}
                    >
                      {RECURRENCE_OPTIONS.map(r => (
                        <MenuItem key={r.value} value={r.value}>
                          {r.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                {form.recurrence !== 'none' && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="ينتهي التكرار في *"
                      InputLabelProps={{ shrink: true }}
                      value={form.recurrenceEnd}
                      onChange={e => setForm(f => ({ ...f, recurrenceEnd: e.target.value }))}
                    />
                  </Grid>
                )}
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={submitForm} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : editMode ? 'حفظ' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={Boolean(detailSession)}
        onClose={() => setDetailSession(null)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تفاصيل الجلسة</DialogTitle>
        <DialogContent dividers>
          {detailSession && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  التاريخ
                </Typography>
                <Typography>{formatDate(detailSession.date)}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  الوقت
                </Typography>
                <Typography>
                  {detailSession.startTime} → {detailSession.endTime}
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  المستفيد
                </Typography>
                <Typography>{fullName(detailSession.beneficiary) || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  المعالج
                </Typography>
                <Typography>{fullName(detailSession.therapist) || '—'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  النوع
                </Typography>
                <Typography>{detailSession.sessionType}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary">
                  الحالة
                </Typography>
                <Chip
                  size="small"
                  label={STATUS_LABELS[detailSession.status] || detailSession.status}
                  color={STATUS_COLORS[detailSession.status] || 'default'}
                />
              </Grid>
              {detailSession.notes?.objective && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    الملاحظات السريرية (SOAP)
                  </Typography>
                  {detailSession.notes.subjective && (
                    <Typography variant="body2">
                      <strong>S:</strong> {detailSession.notes.subjective}
                    </Typography>
                  )}
                  {detailSession.notes.objective && (
                    <Typography variant="body2">
                      <strong>O:</strong> {detailSession.notes.objective}
                    </Typography>
                  )}
                  {detailSession.notes.assessment && (
                    <Typography variant="body2">
                      <strong>A:</strong> {detailSession.notes.assessment}
                    </Typography>
                  )}
                  {detailSession.notes.plan && (
                    <Typography variant="body2">
                      <strong>P:</strong> {detailSession.notes.plan}
                    </Typography>
                  )}
                </Grid>
              )}
              {detailSession.statusHistory?.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    سجل الحالات
                  </Typography>
                  {detailSession.statusHistory.map((h, i) => (
                    <Typography key={i} variant="body2">
                      {STATUS_LABELS[h.from] || h.from || '—'} → {STATUS_LABELS[h.to] || h.to}
                      {h.reason ? ` · ${h.reason}` : ''} ·{' '}
                      {h.changedAt ? new Date(h.changedAt).toLocaleString('ar-SA') : ''}
                    </Typography>
                  ))}
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailSession(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Status change */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog({ open: false, session: null, newStatus: '', reason: '' })}
        dir="rtl"
      >
        <DialogTitle>تغيير حالة الجلسة</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            الحالة الجديدة: <strong>{STATUS_LABELS[statusDialog.newStatus]}</strong>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="سبب / ملاحظة"
            value={statusDialog.reason}
            onChange={e => setStatusDialog(s => ({ ...s, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setStatusDialog({ open: false, session: null, newStatus: '', reason: '' })
            }
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={submitStatusChange}>
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
