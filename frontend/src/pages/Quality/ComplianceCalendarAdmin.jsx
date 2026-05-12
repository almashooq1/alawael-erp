/**
 * ComplianceCalendarAdmin.jsx — UI for the QMS compliance calendar.
 *
 * Backend: /api/compliance-calendar (see
 * backend/routes/complianceCalendar.routes.js).
 *
 * What this page is for:
 *   • List + filter upcoming compliance events (type, severity, status)
 *   • Stats summary (counts in next-30-days window)
 *   • Create a stored event (title, type, dueDate, severity, owner)
 *   • Detail dialog with resolve / cancel / snooze actions
 *
 * Out of scope for v1:
 *   • Auto-link to evidence on resolve (the API supports evidenceId
 *     in the resolve body — UI for picking evidence is a follow-up)
 *   • Calendar/Gantt visualisation — this is a table v1
 *
 * Why CBAHI cares:
 *   "Show me your upcoming licence renewals + accreditation deadlines"
 *   is a CBAHI / Saudi MOH question. Without this UI an operator can
 *   miss a renewal because nothing surfaces in the dashboard.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Fade,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  CheckCircle as ResolveIcon,
  Cancel as CancelEventIcon,
  Schedule as SnoozeIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CalendarMonth as CalendarIcon,
  ViewList as ListIcon,
  CalendarViewMonth as GridIcon,
  NavigateBefore as PrevIcon,
  NavigateNext as NextIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const TITLE_ID = 'compcal-create-title';
const DETAIL_TITLE_ID = 'compcal-detail-title';

const EMPTY_FORM = {
  title: '',
  type: '',
  dueDate: '',
  severity: '',
};

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function severityColor(s) {
  switch (s) {
    case 'critical':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
}

function statusColor(s) {
  switch (s) {
    case 'resolved':
      return 'success';
    case 'overdue':
      return 'error';
    case 'upcoming':
      return 'info';
    case 'cancelled':
      return 'default';
    case 'snoozed':
      return 'warning';
    default:
      return 'default';
  }
}

const SEV_DOT = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#3b82f6',
};

// ── MonthGrid component ───────────────────────────────────────────────────────
// Pure display — receives `rows` (already filtered), `year`, `month`
// and `onEventClick`. Renders a 7-column CSS grid with colored dots.

function MonthGrid({ rows, year, month, onEventClick }) {
  // Build a map: "YYYY-MM-DD" → event[]
  const byDay = useMemo(() => {
    const map = {};
    rows.forEach(r => {
      if (!r.dueDate) return;
      const d = r.dueDate.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }, [rows]);

  // Cells for the grid
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);

  const DAY_NAMES = ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

  // blank leading cells
  const cells = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Box>
      {/* Day header row */}
      <Grid container columns={7} sx={{ mb: 0.5 }}>
        {DAY_NAMES.map(n => (
          <Grid item xs={1} key={n} sx={{ textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {n}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Day cells */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '4px' }}>
        {cells.map((day, i) => {
          if (day === null) return <Box key={`blank-${i}`} />;
          const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const evs = byDay[key] || [];
          const isToday = key === today;
          return (
            <Paper
              key={key}
              variant="outlined"
              sx={{
                minHeight: 72,
                p: '4px 6px',
                cursor: evs.length ? 'pointer' : 'default',
                bgcolor: isToday ? 'primary.50' : 'background.paper',
                border: isToday ? '2px solid' : '1px solid',
                borderColor: isToday ? 'primary.main' : 'divider',
                '&:hover': evs.length ? { boxShadow: 3 } : {},
              }}
              onClick={evs.length ? () => onEventClick(evs) : undefined}
            >
              <Typography
                variant="caption"
                fontWeight={isToday ? 800 : 500}
                color={isToday ? 'primary.main' : 'text.primary'}
              >
                {day}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap="2px" mt={0.3}>
                {evs.slice(0, 6).map((ev, ei) => (
                  <Tooltip key={ei} title={ev.title}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: SEV_DOT[ev.severity] || '#9ca3af',
                        flexShrink: 0,
                      }}
                    />
                  </Tooltip>
                ))}
                {evs.length > 6 && (
                  <Typography variant="caption" color="text.secondary" fontSize={9}>
                    +{evs.length - 6}
                  </Typography>
                )}
              </Stack>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}

export default function ComplianceCalendarAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [withinDays, setWithinDays] = useState(60);
  const [includeResolved, setIncludeResolved] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozeTarget, setSnoozeTarget] = useState(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [snoozeReason, setSnoozeReason] = useState('');

  // view mode: 'list' | 'calendar'
  const [viewMode, setViewMode] = useState('list');
  const [gridYear, setGridYear] = useState(() => new Date().getFullYear());
  const [gridMonth, setGridMonth] = useState(() => new Date().getMonth());
  const [dayEventsOpen, setDayEventsOpen] = useState(false);
  const [dayEvents, setDayEvents] = useState([]);

  const shiftMonth = delta => {
    setGridMonth(m => {
      const next = m + delta;
      if (next < 0) {
        setGridYear(y => y - 1);
        return 11;
      }
      if (next > 11) {
        setGridYear(y => y + 1);
        return 0;
      }
      return next;
    });
  };

  const MONTH_NAMES_AR = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];

  // ── Reference ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiClient.get('/compliance-calendar/reference');
        if (alive) setReference(data?.data || data);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── Stats header ─────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiClient.get('/compliance-calendar/stats', {
          params: { withinDays: 30 },
        });
        if (alive) setStats(data?.data || data);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { withinDays };
      if (filterType) params.type = filterType;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterStatus) params.status = filterStatus;
      if (includeResolved) params.includeResolved = true;
      const { data } = await apiClient.get('/compliance-calendar', { params });
      setRows(data?.data || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل الأحداث', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterSeverity, filterStatus, withinDays, includeResolved, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        type: form.type,
        dueDate: new Date(form.dueDate).toISOString(),
      };
      if (form.severity) payload.severity = form.severity;
      await apiClient.post('/compliance-calendar', payload);
      showSnackbar('تم إنشاء الحدث', 'success');
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (err) {
      setServerError(err?.response?.data?.error || err?.message || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async row => {
    setDetail(null);
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const { data } = await apiClient.get(`/compliance-calendar/${row._id}`);
      setDetail(data?.data || data);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل التفاصيل', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResolve = async row => {
    try {
      await apiClient.post(`/compliance-calendar/${row._id}/resolve`);
      showSnackbar('تم تحديد الحدث كمُنجَز', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر التحديث', 'error');
    }
  };

  const handleCancel = async row => {
    const reason = window.prompt('سبب الإلغاء؟');
    if (!reason) return;
    try {
      await apiClient.post(`/compliance-calendar/${row._id}/cancel`, { reason });
      showSnackbar('تم الإلغاء', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر الإلغاء', 'error');
    }
  };

  const openSnooze = row => {
    setSnoozeTarget(row);
    setSnoozeDate('');
    setSnoozeReason('');
    setSnoozeOpen(true);
  };

  const handleSnoozeSubmit = async () => {
    try {
      await apiClient.post(`/compliance-calendar/${snoozeTarget._id}/snooze`, {
        newDueDate: new Date(snoozeDate).toISOString(),
        reason: snoozeReason || undefined,
      });
      showSnackbar('تم تأجيل الحدث', 'success');
      setSnoozeOpen(false);
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر التأجيل', 'error');
    }
  };

  const formInvalid = !form.title.trim() || !form.type || !form.dueDate;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            تقويم الامتثال
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
          >
            <ToggleButton value="list" aria-label="عرض قائمة">
              <Tooltip title="قائمة">
                <ListIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="calendar" aria-label="عرض تقويم">
              <Tooltip title="تقويم شهري">
                <Badge
                  badgeContent={
                    rows.filter(r => {
                      const d = r.dueDate?.slice(0, 7);
                      return d === `${gridYear}-${String(gridMonth + 1).padStart(2, '0')}`;
                    }).length || null
                  }
                  color="error"
                >
                  <GridIcon fontSize="small" />
                </Badge>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setForm({ ...EMPTY_FORM });
              setServerError(null);
              setCreateOpen(true);
            }}
          >
            إضافة حدث
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        تجديد التراخيص + مواعيد الاعتماد + متطلبات MOH/CBAHI الدورية. الأحداث المحسوبة تلقائياً (من
        شهادات منتهية الصلاحية مثلاً) تظهر إلى جانب الأحداث المُدخَلة يدوياً.
      </Typography>

      {stats && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {Object.entries(stats.bySeverity || {}).map(([sev, count]) => (
            <Grid item xs={6} md={3} key={sev}>
              <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography variant="h6" fontWeight={700} color={severityColor(sev) + '.main'}>
                  {count}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {sev} (30 يوم)
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="النوع"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {(reference?.types || []).map(t => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="الخطورة"
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {(reference?.severities || []).map(s => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="الحالة"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {(reference?.statuses || []).map(s => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="النافذة (أيام)"
            value={withinDays}
            onChange={e => setWithinDays(Number(e.target.value))}
            sx={{ width: 140 }}
          >
            {[7, 14, 30, 60, 90, 180, 365].map(d => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
          </TextField>
          <Button
            size="small"
            variant={includeResolved ? 'contained' : 'outlined'}
            onClick={() => setIncludeResolved(v => !v)}
          >
            {includeResolved ? 'إخفاء المُنجَزة' : 'إظهار المُنجَزة'}
          </Button>
          <Box sx={{ flex: 1 }} />
          <Chip label={`${rows.length} حدث`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        {viewMode === 'calendar' && (
          <Fade in>
            <Box sx={{ p: 2 }}>
              {/* Month nav */}
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <IconButton size="small" onClick={() => shiftMonth(-1)}>
                  <PrevIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1, textAlign: 'center' }}>
                  {MONTH_NAMES_AR[gridMonth]} {gridYear}
                </Typography>
                <IconButton size="small" onClick={() => shiftMonth(1)}>
                  <NextIcon />
                </IconButton>
              </Stack>

              {/* Legend */}
              <Stack direction="row" spacing={2} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                {Object.entries(SEV_DOT).map(([sev, col]) => (
                  <Stack key={sev} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col }} />
                    <Typography variant="caption" color="text.secondary">
                      {sev}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <MonthGrid
                rows={rows}
                year={gridYear}
                month={gridMonth}
                onEventClick={evs => {
                  setDayEvents(evs);
                  setDayEventsOpen(true);
                }}
              />
            </Box>
          </Fade>
        )}

        {viewMode === 'list' && (
          <Table size="small" aria-label="جدول أحداث الامتثال">
            <TableHead>
              <TableRow>
                <TableCell>العنوان</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>الاستحقاق</TableCell>
                <TableCell>الخطورة</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>المصدر</TableCell>
                <TableCell align="left">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} aria-label="جاري التحميل" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      لا توجد أحداث في النافذة المحددة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.map(row => (
                <TableRow key={row._id || row.computedKey} hover>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.type || '—'}</TableCell>
                  <TableCell>{fmtDate(row.dueDate)}</TableCell>
                  <TableCell>
                    {row.severity && (
                      <Chip size="small" label={row.severity} color={severityColor(row.severity)} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.status} color={statusColor(row.status)} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.source || (row._id ? 'stored' : 'computed')}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="left">
                    {row._id && (
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          size="small"
                          aria-label={`عرض ${row.title}`}
                          onClick={() => openDetail(row)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row._id && row.status !== 'resolved' && row.status !== 'cancelled' && (
                      <>
                        <Tooltip title="تحديد كمُنجَز">
                          <IconButton
                            size="small"
                            aria-label={`إنجاز ${row.title}`}
                            onClick={() => handleResolve(row)}
                          >
                            <ResolveIcon fontSize="small" color="success" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تأجيل">
                          <IconButton
                            size="small"
                            aria-label={`تأجيل ${row.title}`}
                            onClick={() => openSnooze(row)}
                          >
                            <SnoozeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="إلغاء">
                          <IconButton
                            size="small"
                            aria-label={`إلغاء ${row.title}`}
                            onClick={() => handleCancel(row)}
                          >
                            <CancelEventIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* ── Create dialog ──────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby={TITLE_ID}
      >
        <DialogTitle id={TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>إضافة حدث امتثال جديد</span>
            <IconButton aria-label="إغلاق" onClick={() => setCreateOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="العنوان"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              select
              label="النوع"
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              required
              fullWidth
              disabled={saving}
            >
              {(reference?.types || []).map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="تاريخ الاستحقاق"
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              required
              InputLabelProps={{ shrink: true }}
              disabled={saving}
            />
            <TextField
              select
              label="الخطورة"
              value={form.severity}
              onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
              fullWidth
              disabled={saving}
            >
              <MenuItem value="">— غير محدد —</MenuItem>
              {(reference?.severities || []).map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <Box aria-live="polite">
              {serverError && (
                <Alert severity="error">
                  <Typography variant="body2">{serverError}</Typography>
                </Alert>
              )}
            </Box>
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
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail dialog ──────────────────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        maxWidth="md"
        fullWidth
        aria-labelledby={DETAIL_TITLE_ID}
      >
        <DialogTitle id={DETAIL_TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>تفاصيل الحدث</span>
            <IconButton aria-label="إغلاق" onClick={() => setDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <CircularProgress aria-label="جاري التحميل" />
            </Box>
          )}
          {!detailLoading && detail && (
            <Stack spacing={2}>
              <Typography variant="h6">{detail.title}</Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <Chip label={detail.status} color={statusColor(detail.status)} />
                {detail.severity && (
                  <Chip label={detail.severity} color={severityColor(detail.severity)} />
                )}
                {detail.type && <Chip label={detail.type} variant="outlined" />}
              </Stack>
              <Stack direction="row" spacing={4}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    الاستحقاق
                  </Typography>
                  <Typography variant="body2">{fmtDate(detail.dueDate)}</Typography>
                </Box>
                {detail.snoozedUntil && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      مُؤجَّل حتى
                    </Typography>
                    <Typography variant="body2">{fmtDate(detail.snoozedUntil)}</Typography>
                  </Box>
                )}
              </Stack>
              {detail.regulationRefs && detail.regulationRefs.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    المراجع التنظيمية
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {detail.regulationRefs.map((r, i) => (
                      <Chip key={i} size="small" label={r} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
              {detail.resolutionNotes && (
                <Alert severity="success">
                  <Typography variant="caption">ملاحظات الإنجاز</Typography>
                  <Typography variant="body2">{detail.resolutionNotes}</Typography>
                </Alert>
              )}
              {detail.cancellationReason && (
                <Alert severity="warning">
                  <Typography variant="caption">سبب الإلغاء</Typography>
                  <Typography variant="body2">{detail.cancellationReason}</Typography>
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Snooze dialog ──────────────────────────────────────────── */}
      <Dialog
        open={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby="compcal-snooze-title"
      >
        <DialogTitle id="compcal-snooze-title" sx={{ fontWeight: 700 }}>
          تأجيل الحدث
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="التاريخ الجديد"
              type="date"
              value={snoozeDate}
              onChange={e => setSnoozeDate(e.target.value)}
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="السبب"
              value={snoozeReason}
              onChange={e => setSnoozeReason(e.target.value)}
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSnoozeOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SnoozeIcon />}
            onClick={handleSnoozeSubmit}
            disabled={!snoozeDate}
          >
            تأجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Day events dialog (calendar grid click) ────────────────── */}
      <Dialog open={dayEventsOpen} onClose={() => setDayEventsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>أحداث اليوم المحدد ({dayEvents.length})</span>
            <IconButton onClick={() => setDayEventsOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            {dayEvents.map((ev, i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{ p: 1.5, borderRight: `4px solid ${SEV_DOT[ev.severity] || '#9ca3af'}` }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {ev.title}
                </Typography>
                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                  <Chip size="small" label={ev.status} color={statusColor(ev.status)} />
                  {ev.severity && (
                    <Chip size="small" label={ev.severity} color={severityColor(ev.severity)} />
                  )}
                  {ev.type && <Chip size="small" label={ev.type} variant="outlined" />}
                </Stack>
                {ev._id && (
                  <Stack direction="row" spacing={0.5} mt={0.5}>
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setDayEventsOpen(false);
                          openDetail(ev);
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {ev.status !== 'resolved' && ev.status !== 'cancelled' && (
                      <>
                        <Tooltip title="إنجاز">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => {
                              handleResolve(ev);
                              setDayEventsOpen(false);
                            }}
                          >
                            <ResolveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تأجيل">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setDayEventsOpen(false);
                              openSnooze(ev);
                            }}
                          >
                            <SnoozeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </Stack>
                )}
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDayEventsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
