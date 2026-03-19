/**
 * 🕒 إدارة الجلسات العلاجية (مستوى إداري) — Therapy Session Admin
 * AlAwael ERP — All sessions across therapists: schedule, documentation, filtering
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Button,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  useTheme,
  alpha,
  InputAdornment,
  Rating,
} from '@mui/material';
import {
  Schedule as ScheduleIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as CompleteIcon,
  PlayCircle as StartIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  MeetingRoom as RoomIcon,
  Timer as TimerIcon,
  Assessment as AssessIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  EventAvailable as EventIcon,
  Groups as GroupIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'contexts/SnackbarContext';
import { therapySessionService, rehabProgramService } from 'services/disabilityRehabService';

const SESSION_CATEGORIES = [
  'علاج طبيعي',
  'علاج نطق',
  'علاج وظيفي',
  'تأهيل سمعي',
  'تأهيل بصري',
  'تعديل سلوك',
  'مهارات اجتماعية',
];
const SESSION_TYPES = ['فردية', 'جماعية', 'متابعة', 'تقييم'];
const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'scheduled', label: 'مجدولة' },
  { value: 'in_progress', label: 'جارية' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغاة' },
];

const emptyForm = {
  date: '',
  time: '',
  duration: 45,
  therapist: '',
  beneficiary: '',
  program: '',
  type: 'فردية',
  category: 'علاج طبيعي',
  room: '',
  notes: '',
};

export default function TherapySessionAdmin() {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const g = theme.palette.gradients || {};

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  // Detail
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  // Complete dialog
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeForm, setCompleteForm] = useState({ notes: '', rating: 4, outcomes: '' });
  const [completeTarget, setCompleteTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ss, sc] = await Promise.all([
        therapySessionService.getAll(),
        therapySessionService.getSchedule(),
      ]);
      setSessions(ss?.sessions || ss?.data || therapySessionService.getMockSessions());
      setSchedule(sc?.schedule || sc?.data || therapySessionService.getMockSchedule());
      setStats(ss?.stats || therapySessionService.getMockStats());
    } catch {
      setSessions(therapySessionService.getMockSessions());
      setSchedule(therapySessionService.getMockSchedule());
      setStats(therapySessionService.getMockStats());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const st = stats || therapySessionService.getMockStats();

  /* Filtering */
  const filtered = sessions.filter(s => {
    const matchSearch =
      !search ||
      s.beneficiary?.includes(search) ||
      s.therapist?.includes(search) ||
      s.program?.includes(search) ||
      s.sessionNumber?.includes(search);
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchCat = filterCategory === 'all' || s.category === filterCategory;
    const matchDate = !filterDate || s.date === filterDate;
    return matchSearch && matchStatus && matchCat && matchDate;
  });

  /* Actions */
  const openCreate = () => {
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };
  const handleSave = async () => {
    const res = await therapySessionService.create(form);
    if (res) {
      showSnackbar('تم جدولة الجلسة بنجاح', 'success');
      load();
    } else {
      const newS = {
        _id: `s-${Date.now()}`,
        sessionNumber: `SS-NEW-${sessions.length + 1}`,
        ...form,
        status: 'scheduled',
      };
      setSessions(prev => [newS, ...prev]);
      showSnackbar('تم جدولة الجلسة (محلي)', 'success');
    }
    setDialogOpen(false);
  };

  const startSession = s => {
    setSessions(prev => prev.map(x => (x._id === s._id ? { ...x, status: 'in_progress' } : x)));
    showSnackbar('تم بدء الجلسة', 'info');
  };

  const openComplete = s => {
    setCompleteTarget(s);
    setCompleteForm({ notes: s.notes || '', rating: s.rating || 4, outcomes: '' });
    setCompleteOpen(true);
  };

  const handleComplete = () => {
    setSessions(prev =>
      prev.map(x =>
        x._id === completeTarget._id
          ? { ...x, status: 'completed', notes: completeForm.notes, rating: completeForm.rating }
          : x
      )
    );
    showSnackbar('تم إكمال الجلسة وتوثيقها', 'success');
    setCompleteOpen(false);
  };

  const cancelSession = s => {
    if (!window.confirm('هل تريد إلغاء هذه الجلسة؟')) return;
    setSessions(prev => prev.map(x => (x._id === s._id ? { ...x, status: 'cancelled' } : x)));
    showSnackbar('تم إلغاء الجلسة', 'warning');
  };

  const openDetail = s => {
    setSelectedSession(s);
    setDetailOpen(true);
  };

  const statusChip = s => {
    const map = {
      scheduled: { l: 'مجدولة', c: 'info', icon: <CalendarIcon sx={{ fontSize: 14 }} /> },
      in_progress: { l: 'جارية', c: 'warning', icon: <TimerIcon sx={{ fontSize: 14 }} /> },
      completed: { l: 'مكتملة', c: 'success', icon: <CompleteIcon sx={{ fontSize: 14 }} /> },
      cancelled: { l: 'ملغاة', c: 'error', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
    };
    const m = map[s] || { l: s, c: 'default' };
    return <Chip icon={m.icon} label={m.l} color={m.c} size="small" />;
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 12 }}>
        <CircularProgress size={48} />
      </Box>
    );

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: g.primary || 'linear-gradient(135deg,#ed6c02 0%,#e65100 100%)',
          color: '#fff',
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              🕒 إدارة الجلسات العلاجية
            </Typography>
            <Typography variant="body1" sx={{ mt: 0.5, opacity: 0.9 }}>
              عرض وإدارة جميع الجلسات — جدولة وتوثيق ومتابعة
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            sx={{ bgcolor: 'rgba(255,255,255,.2)', '&:hover': { bgcolor: 'rgba(255,255,255,.3)' } }}
          >
            جلسة جديدة
          </Button>
        </Stack>
      </Paper>

      {/* ── KPI Row ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'جلسات اليوم', value: st.totalToday, color: '#ed6c02' },
          { label: 'مكتملة', value: st.completed, color: '#2e7d32' },
          { label: 'جارية', value: st.inProgress, color: '#1976d2' },
          { label: 'مجدولة', value: st.scheduled, color: '#0288d1' },
          { label: 'هذا الأسبوع', value: st.totalWeek, color: '#9c27b0' },
          { label: 'هذا الشهر', value: st.totalMonth, color: '#455a64' },
          { label: 'متوسط المدة', value: `${st.avgDuration}د`, color: '#d32f2f' },
          { label: 'نسبة الحضور', value: `${st.attendanceRate}%`, color: '#388e3c' },
        ].map((k, i) => (
          <Grid item xs={6} sm={3} md={1.5} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                textAlign: 'center',
                border: `2px solid ${alpha(k.color, 0.2)}`,
                bgcolor: alpha(k.color, 0.04),
              }}
            >
              <Typography variant="h6" fontWeight={700} color={k.color}>
                {k.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                {k.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Paper
        elevation={0}
        sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: `1px solid ${theme.palette.divider}`, px: 2 }}
        >
          <Tab label="📋 قائمة الجلسات" />
          <Tab label="📅 الجدول الأسبوعي" />
        </Tabs>

        {/* ═ Tab 0: Sessions List ═ */}
        {tab === 0 && (
          <Box>
            {/* Filters */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                <TextField
                  size="small"
                  placeholder="بحث..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 220 }}
                />
                <TextField
                  select
                  size="small"
                  label="الحالة"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  {STATUS_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="التخصص"
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="all">الكل</MenuItem>
                  {SESSION_CATEGORIES.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="date"
                  label="التاريخ"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150 }}
                />
                <Chip label={`${filtered.length} جلسة`} color="primary" variant="outlined" />
              </Stack>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#ed6c02', 0.05) }}>
                    <TableCell sx={{ fontWeight: 700 }}>الرقم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الوقت</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التخصص</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الغرفة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المدة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التقييم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map(s => (
                    <TableRow key={s._id} hover>
                      <TableCell>
                        <Typography variant="caption" fontWeight={600}>
                          {s.sessionNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>{s.date}</TableCell>
                      <TableCell>
                        <Chip
                          icon={<ScheduleIcon />}
                          label={s.time}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{s.beneficiary}</TableCell>
                      <TableCell>{s.therapist}</TableCell>
                      <TableCell>
                        <Chip label={s.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={s.type}
                          size="small"
                          color={s.type === 'جماعية' ? 'secondary' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{s.room}</TableCell>
                      <TableCell>{s.duration}د</TableCell>
                      <TableCell>
                        {s.rating ? <Rating value={s.rating} size="small" readOnly /> : '—'}
                      </TableCell>
                      <TableCell>{statusChip(s.status)}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="التفاصيل">
                            <IconButton size="small" color="info" onClick={() => openDetail(s)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {s.status === 'scheduled' && (
                            <Tooltip title="بدء الجلسة">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => startSession(s)}
                              >
                                <StartIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {(s.status === 'in_progress' || s.status === 'scheduled') && (
                            <Tooltip title="إكمال وتوثيق">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => openComplete(s)}
                              >
                                <CompleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {s.status === 'scheduled' && (
                            <Tooltip title="إلغاء">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => cancelSession(s)}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">لا توجد جلسات مطابقة</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ═ Tab 1: Weekly Schedule ═ */}
        {tab === 1 && (
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              📅 الجدول الأسبوعي للجلسات
            </Typography>
            <Grid container spacing={2}>
              {schedule.map((day, di) => (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={di}>
                  <Paper
                    elevation={0}
                    sx={{
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: alpha('#1976d2', 0.08),
                        fontWeight: 700,
                        textAlign: 'center',
                      }}
                    >
                      <Typography variant="subtitle2" fontWeight={700}>
                        {day.day}
                      </Typography>
                    </Box>
                    <Stack spacing={1} sx={{ p: 1.5 }}>
                      {day.slots.map((slot, si) => (
                        <Paper
                          key={si}
                          elevation={0}
                          sx={{
                            p: 1.5,
                            borderRadius: 1.5,
                            bgcolor: alpha('#ed6c02', 0.05),
                            border: `1px solid ${alpha('#ed6c02', 0.15)}`,
                          }}
                        >
                          <Chip
                            icon={<ScheduleIcon />}
                            label={slot.time}
                            size="small"
                            sx={{ mb: 0.5 }}
                          />
                          <Typography variant="body2" fontWeight={600}>
                            {slot.beneficiary}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {slot.therapist}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            🏠 {slot.room}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>

      {/* ═══ Create Session Dialog ═══ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>جدولة جلسة جديدة</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="التاريخ"
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="الوقت"
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                label="المدة (دقيقة)"
                type="number"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المستفيد"
                value={form.beneficiary}
                onChange={e => setForm(f => ({ ...f, beneficiary: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المعالج"
                value={form.therapist}
                onChange={e => setForm(f => ({ ...f, therapist: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="البرنامج"
                value={form.program}
                onChange={e => setForm(f => ({ ...f, program: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الغرفة"
                value={form.room}
                onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              >
                {SESSION_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="التخصص"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              >
                {SESSION_CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={2}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
            جدولة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Complete Session Dialog ═══ */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إكمال وتوثيق الجلسة</DialogTitle>
        <DialogContent dividers>
          {completeTarget && (
            <Box>
              <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: alpha('#1976d2', 0.04) }}>
                <Typography variant="body2">
                  <b>المستفيد:</b> {completeTarget.beneficiary}
                </Typography>
                <Typography variant="body2">
                  <b>المعالج:</b> {completeTarget.therapist}
                </Typography>
                <Typography variant="body2">
                  <b>البرنامج:</b> {completeTarget.program}
                </Typography>
              </Paper>
              <TextField
                fullWidth
                label="ملاحظات الجلسة"
                multiline
                rows={3}
                value={completeForm.notes}
                onChange={e => setCompleteForm(f => ({ ...f, notes: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="المخرجات والتوصيات"
                multiline
                rows={2}
                value={completeForm.outcomes}
                onChange={e => setCompleteForm(f => ({ ...f, outcomes: e.target.value }))}
                sx={{ mb: 2 }}
              />
              <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="body2">تقييم الجلسة:</Typography>
                <Rating
                  value={completeForm.rating}
                  onChange={(_, v) => setCompleteForm(f => ({ ...f, rating: v }))}
                />
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCompleteOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CompleteIcon />}
            onClick={handleComplete}
          >
            إكمال الجلسة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ Detail Dialog ═══ */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="sm" fullWidth>
        {selectedSession && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                تفاصيل الجلسة {selectedSession.sessionNumber}
                <IconButton onClick={() => setDetailOpen(false)}>
                  <CloseIcon />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={2}>
                {[
                  { label: 'التاريخ', value: selectedSession.date },
                  { label: 'الوقت', value: selectedSession.time },
                  { label: 'المدة', value: `${selectedSession.duration} دقيقة` },
                  { label: 'المستفيد', value: selectedSession.beneficiary },
                  { label: 'المعالج', value: selectedSession.therapist },
                  { label: 'البرنامج', value: selectedSession.program },
                  { label: 'التخصص', value: selectedSession.category },
                  { label: 'النوع', value: selectedSession.type },
                  { label: 'الغرفة', value: selectedSession.room },
                ].map((f, i) => (
                  <Grid item xs={6} key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {f.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {f.value}
                    </Typography>
                  </Grid>
                ))}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    الحالة
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{statusChip(selectedSession.status)}</Box>
                </Grid>
                {selectedSession.rating && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      التقييم
                    </Typography>
                    <Rating value={selectedSession.rating} readOnly />
                  </Grid>
                )}
                {selectedSession.notes && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      الملاحظات
                    </Typography>
                    <Typography variant="body2">{selectedSession.notes}</Typography>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}
