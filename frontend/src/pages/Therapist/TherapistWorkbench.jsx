/**
 * TherapistWorkbench — /workbench page (therapist-facing).
 *
 * One-stop view for a therapist's day: today's sessions, week grid,
 * caseload, per-session check-in + SOAP notes + goal progress.
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
  Avatar,
  Paper,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Rating,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoginIcon from '@mui/icons-material/Login';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotesIcon from '@mui/icons-material/Notes';
import TodayIcon from '@mui/icons-material/Today';
import DateRangeIcon from '@mui/icons-material/DateRange';
import PeopleIcon from '@mui/icons-material/People';
import EventIcon from '@mui/icons-material/Event';
import api from '../../services/api.client';

const SESSION_STATUS = {
  SCHEDULED: { label: 'مجدولة', color: 'info' },
  CONFIRMED: { label: 'مؤكَّدة', color: 'primary' },
  IN_PROGRESS: { label: 'جارية', color: 'warning' },
  COMPLETED: { label: 'مكتملة', color: 'success' },
  NO_SHOW: { label: 'لم يحضر', color: 'error' },
  CANCELLED_BY_PATIENT: { label: 'ألغى المستفيد', color: 'default' },
  CANCELLED_BY_CENTER: { label: 'ألغى المركز', color: 'default' },
  RESCHEDULED: { label: 'أُعيدت جدولتها', color: 'secondary' },
};

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function TherapistWorkbench() {
  const [tab, setTab] = useState(0);
  const [me, setMe] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const [today, setToday] = useState({ items: [], totals: {} });
  const [week, setWeek] = useState({ grouped: {} });
  const [caseload, setCaseload] = useState([]);

  const [noteDialog, setNoteDialog] = useState({
    open: false,
    session: null,
    saving: false,
    err: '',
    notes: { subjective: '', objective: '', assessment: '', plan: '' },
    rating: null,
    mode: 'edit', // 'edit' or 'complete'
  });

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/therapist-workbench/me');
      setMe(data?.data || null);
    } catch (err) {
      setErrMsg(
        err?.response?.data?.message ||
          'تعذر تحميل بياناتك — تأكد من تسجيل الدخول بحساب معالج مرتبط بسجل موظف'
      );
    }
  }, []);

  const loadToday = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/therapist-workbench/today');
      setToday({ items: data?.items || [], totals: data?.totals || {} });
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/therapist-workbench/week');
      setWeek({ grouped: data?.grouped || {} });
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCaseload = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/therapist-workbench/caseload');
      setCaseload(data?.items || []);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    if (tab === 0) loadToday();
    else if (tab === 1) loadWeek();
    else loadCaseload();
  }, [tab, loadToday, loadWeek, loadCaseload]);

  const doCheckIn = async session => {
    try {
      await api.post(`/therapist-workbench/session/${session._id}/check-in`, {});
      loadToday();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تسجيل الحضور');
    }
  };

  const openNoteDialog = (session, mode) => {
    setNoteDialog({
      open: true,
      session,
      saving: false,
      err: '',
      notes: {
        subjective: session.notes?.subjective || '',
        objective: session.notes?.objective || '',
        assessment: session.notes?.assessment || '',
        plan: session.notes?.plan || '',
      },
      rating: session.rating || null,
      mode,
    });
  };

  const closeNoteDialog = () =>
    setNoteDialog({
      open: false,
      session: null,
      saving: false,
      err: '',
      notes: { subjective: '', objective: '', assessment: '', plan: '' },
      rating: null,
      mode: 'edit',
    });

  const submitNotes = async () => {
    setNoteDialog(d => ({ ...d, saving: true, err: '' }));
    try {
      const payload = { notes: noteDialog.notes, rating: noteDialog.rating };
      if (noteDialog.mode === 'complete') {
        await api.post(`/therapist-workbench/session/${noteDialog.session._id}/complete`, payload);
      } else {
        await api.patch(`/therapist-workbench/session/${noteDialog.session._id}/notes`, payload);
      }
      closeNoteDialog();
      if (tab === 0) loadToday();
      else if (tab === 1) loadWeek();
    } catch (err) {
      setNoteDialog(d => ({
        ...d,
        saving: false,
        err: err?.response?.data?.message || 'فشل الحفظ',
      }));
    }
  };

  const todayTiles = useMemo(() => {
    const t = today.totals || {};
    return [
      { label: 'جلسات اليوم', value: t.total || 0, icon: <TodayIcon />, color: 'primary.main' },
      { label: 'قادمة', value: t.upcoming || 0, icon: <EventIcon />, color: 'info.main' },
      { label: 'جارية', value: t.inProgress || 0, icon: <LoginIcon />, color: 'warning.main' },
      {
        label: 'مكتملة',
        value: t.completed || 0,
        icon: <CheckCircleIcon />,
        color: 'success.main',
      },
    ];
  }, [today]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            لوحة المعالج
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {me
              ? `مرحباً ${fullName(me)} — جلساتك، حالاتك، ملاحظاتك الإكلينيكية (SOAP).`
              : 'يومك العلاجي — تحضير، متابعة، توثيق سريع.'}
          </Typography>
        </Box>
        <IconButton
          onClick={() => {
            loadMe();
            if (tab === 0) loadToday();
            else if (tab === 1) loadWeek();
            else loadCaseload();
          }}
        >
          <RefreshIcon />
        </IconButton>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<TodayIcon />} iconPosition="start" label="اليوم" />
          <Tab icon={<DateRangeIcon />} iconPosition="start" label="الأسبوع" />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="حالاتي" />
        </Tabs>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {tab === 0 && (
        <Box>
          <Grid container spacing={2} mb={3}>
            {todayTiles.map((t, i) => (
              <Grid item xs={6} md={3} key={i}>
                <Card>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {t.label}
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: t.color }}>
                          {t.value}
                        </Typography>
                      </Box>
                      <Box sx={{ color: t.color, fontSize: 40 }}>{t.icon}</Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الوقت</TableCell>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الغرفة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {today.items.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" py={3}>
                        لا توجد جلسات لك اليوم. استمتع بوقتك!
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {today.items.map(s => (
                  <TableRow key={s._id} hover>
                    <TableCell>
                      {s.startTime || '—'} → {s.endTime || '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>
                        {fullName(s.beneficiary) || '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.beneficiary?.beneficiaryNumber || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{s.sessionType}</TableCell>
                    <TableCell>{s.room?.name || s.location || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={SESSION_STATUS[s.status]?.label || s.status}
                        color={SESSION_STATUS[s.status]?.color || 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      {['SCHEDULED', 'CONFIRMED'].includes(s.status) && (
                        <Tooltip title="تسجيل حضور / بدء الجلسة">
                          <IconButton size="small" color="warning" onClick={() => doCheckIn(s)}>
                            <LoginIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="ملاحظات SOAP">
                        <IconButton size="small" onClick={() => openNoteDialog(s, 'edit')}>
                          <NotesIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {s.status !== 'COMPLETED' && (
                        <Tooltip title="إنهاء الجلسة">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => openNoteDialog(s, 'complete')}
                          >
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {tab === 1 && (
        <Stack spacing={2}>
          {Object.keys(week.grouped || {}).length === 0 && !loading && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">لا توجد جلسات هذا الأسبوع.</Typography>
            </Paper>
          )}
          {Object.keys(week.grouped)
            .sort()
            .map(day => (
              <Paper key={day}>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', px: 2, py: 1 }}>
                  <Typography fontWeight="bold">
                    {new Date(day).toLocaleDateString('ar-SA', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}{' '}
                    · {week.grouped[day].length} جلسة
                  </Typography>
                </Box>
                <Table size="small">
                  <TableBody>
                    {week.grouped[day].map(s => (
                      <TableRow key={s._id} hover>
                        <TableCell sx={{ width: 110 }}>
                          {s.startTime || '—'} → {s.endTime || '—'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {fullName(s.beneficiary) || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {s.sessionType} {s.room?.name ? `· ${s.room.name}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <Chip
                            size="small"
                            label={SESSION_STATUS[s.status]?.label || s.status}
                            color={SESSION_STATUS[s.status]?.color || 'default'}
                          />
                        </TableCell>
                        <TableCell align="center" sx={{ width: 110 }}>
                          <IconButton size="small" onClick={() => openNoteDialog(s, 'edit')}>
                            <NotesIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ))}
        </Stack>
      )}

      {tab === 2 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>المستفيد</TableCell>
                <TableCell>نوع الإعاقة</TableCell>
                <TableCell>عدد الجلسات</TableCell>
                <TableCell>مكتملة</TableCell>
                <TableCell>قادمة</TableCell>
                <TableCell>آخر جلسة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {caseload.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={3}>
                      لا توجد حالات مسجَّلة لك.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {caseload.map((r, i) => (
                <TableRow key={i} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Avatar sx={{ width: 28, height: 28, fontSize: 14 }}>
                        {(fullName(r.beneficiary) || '?')[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {fullName(r.beneficiary) || '—'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.beneficiary?.beneficiaryNumber || '—'}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{r.beneficiary?.disability?.primaryType || '—'}</TableCell>
                  <TableCell>{r.sessionCount}</TableCell>
                  <TableCell>{r.completed}</TableCell>
                  <TableCell>{r.upcoming}</TableCell>
                  <TableCell>{formatDate(r.lastSession)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Notes dialog */}
      <Dialog open={noteDialog.open} onClose={closeNoteDialog} maxWidth="md" fullWidth dir="rtl">
        <DialogTitle>
          {noteDialog.mode === 'complete' ? 'إنهاء الجلسة + توثيق SOAP' : 'ملاحظات SOAP'}
          {noteDialog.session?.beneficiary && (
            <Typography variant="caption" display="block" color="text.secondary">
              {fullName(noteDialog.session.beneficiary)} · {formatDate(noteDialog.session.date)} ·{' '}
              {noteDialog.session.startTime}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {noteDialog.err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {noteDialog.err}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="S — ما قاله المستفيد / الأسرة"
              value={noteDialog.notes.subjective}
              onChange={e =>
                setNoteDialog(d => ({
                  ...d,
                  notes: { ...d.notes, subjective: e.target.value },
                }))
              }
            />
            <TextField
              fullWidth
              multiline
              rows={3}
              label="O — ما لاحظه المعالج (مواضيعي)"
              value={noteDialog.notes.objective}
              onChange={e =>
                setNoteDialog(d => ({
                  ...d,
                  notes: { ...d.notes, objective: e.target.value },
                }))
              }
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="A — التحليل والتقييم"
              value={noteDialog.notes.assessment}
              onChange={e =>
                setNoteDialog(d => ({
                  ...d,
                  notes: { ...d.notes, assessment: e.target.value },
                }))
              }
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="P — الخطة للجلسة القادمة"
              value={noteDialog.notes.plan}
              onChange={e =>
                setNoteDialog(d => ({
                  ...d,
                  notes: { ...d.notes, plan: e.target.value },
                }))
              }
            />
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography>تقييم أداء المستفيد:</Typography>
              <Rating
                value={noteDialog.rating || 0}
                onChange={(_, v) => setNoteDialog(d => ({ ...d, rating: v }))}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeNoteDialog} disabled={noteDialog.saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color={noteDialog.mode === 'complete' ? 'success' : 'primary'}
            onClick={submitNotes}
            disabled={noteDialog.saving}
          >
            {noteDialog.saving ? (
              <CircularProgress size={20} />
            ) : noteDialog.mode === 'complete' ? (
              'إنهاء + حفظ'
            ) : (
              'حفظ'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
