/**
 * TimelinePage — الجدول الزمني للمستفيد
 *
 * الهدف السريري: عرض كل الأحداث المرتبطة بمستفيد محدد أو حلقة علاجية
 * بشكل زمني متسلسل — تقييمات، جلسات، أهداف، تغيير الحالة، ملاحظات.
 *
 * يُفتح من ملف المستفيد 360 أو من الحلقة العلاجية.
 * يدعم: ?beneficiaryId= و ?episodeId=
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Alert,
  Button,
  LinearProgress,
  Chip,
  Paper,
  Stack,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  AccessTime as TimeIcon,
  Assessment as AssessmentIcon,
  EventNote as SessionIcon,
  Flag as GoalIcon,
  Assignment as PlanIcon,
  Psychology as BehaviorIcon,
  Group as GroupIcon,
  VideoCameraFront as TeleIcon,
  Star as MilestoneIcon,
  Note as NoteIcon,
  Add as AddIcon,
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { timelineAPI } from '../../services/ddd';

/* ── Event type config ──────────────────────────────────────────────────── */
const EVENT_TYPES = {
  assessment: { label: 'تقييم', color: '#7c3aed', icon: <AssessmentIcon fontSize="small" /> },
  session: { label: 'جلسة', color: '#2563eb', icon: <SessionIcon fontSize="small" /> },
  goal: { label: 'هدف', color: '#16a34a', icon: <GoalIcon fontSize="small" /> },
  care_plan: { label: 'خطة رعاية', color: '#d97706', icon: <PlanIcon fontSize="small" /> },
  behavior: { label: 'سلوك', color: '#dc2626', icon: <BehaviorIcon fontSize="small" /> },
  group_therapy: { label: 'جلسة جماعية', color: '#9333ea', icon: <GroupIcon fontSize="small" /> },
  telerehab: { label: 'تأهيل عن بُعد', color: '#0891b2', icon: <TeleIcon fontSize="small" /> },
  milestone: { label: 'إنجاز', color: '#f59e0b', icon: <MilestoneIcon fontSize="small" /> },
  note: { label: 'ملاحظة', color: '#6b7280', icon: <NoteIcon fontSize="small" /> },
};

const _ALL_FILTER = { label: 'الكل', value: '' };

/* ── Add Event Dialog ───────────────────────────────────────────────────── */
function AddEventDialog({ open, onClose, onSaved, initialBeneficiaryId, initialEpisodeId }) {
  const [form, setForm] = useState({
    beneficiaryId: initialBeneficiaryId || '',
    episodeId: initialEpisodeId || '',
    eventType: 'note',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        beneficiaryId: initialBeneficiaryId || '',
        episodeId: initialEpisodeId || '',
      }));
      setError(null);
    }
  }, [open, initialBeneficiaryId, initialEpisodeId]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.beneficiaryId || !form.title) {
      setError('يرجى تعبئة: المستفيد والعنوان.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await timelineAPI.addEvent({
        beneficiaryId: form.beneficiaryId,
        episodeId: form.episodeId || undefined,
        eventType: form.eventType,
        title: form.title,
        description: form.description || undefined,
        eventDate: form.date,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon color="primary" />
          <Typography fontWeight="bold">إضافة حدث للجدول الزمني</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="معرّف المستفيد"
              value={form.beneficiaryId}
              onChange={set('beneficiaryId')}
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="حلقة الرعاية (اختياري)"
              value={form.episodeId}
              onChange={set('episodeId')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الحدث</InputLabel>
              <Select value={form.eventType} onChange={set('eventType')} label="نوع الحدث">
                {Object.entries(EVENT_TYPES).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="تاريخ الحدث"
              type="date"
              value={form.date}
              onChange={set('date')}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="العنوان"
              value={form.title}
              onChange={set('title')}
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="التفاصيل"
              value={form.description}
              onChange={set('description')}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'إضافة للجدول'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Timeline Event Card (custom, no @mui/lab) ─────────────────────────── */
function EventCard({ event, isLast }) {
  const cfg = EVENT_TYPES[event.eventType] || EVENT_TYPES.note;
  const dateStr = event.eventDate || event.createdAt;
  const date = dateStr ? new Date(dateStr) : null;

  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
      {/* Date column */}
      <Box sx={{ width: 80, textAlign: 'right', pt: 1, flexShrink: 0 }}>
        {date && (
          <>
            <Typography variant="caption" color="text.secondary" display="block">
              {date.toLocaleDateString('ar-SA', { day: '2-digit', month: 'short' })}
            </Typography>
          </>
        )}
      </Box>

      {/* Dot + line column */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
          width: 32,
        }}
      >
        <Avatar sx={{ bgcolor: cfg.color, width: 28, height: 28, mt: 0.5 }}>{cfg.icon}</Avatar>
        {!isLast && (
          <Box sx={{ width: 2, flexGrow: 1, bgcolor: 'divider', my: 0.5, minHeight: 20 }} />
        )}
      </Box>

      {/* Content */}
      <Box sx={{ flexGrow: 1, pb: 2 }}>
        <Card variant="outlined" sx={{ borderRight: `3px solid ${cfg.color}` }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle2" fontWeight="bold">
                  {event.title}
                </Typography>
                {event.description && (
                  <Typography variant="body2" color="text.secondary" mt={0.3}>
                    {event.description}
                  </Typography>
                )}
              </Box>
              <Chip
                label={cfg.label}
                size="small"
                sx={{ bgcolor: `${cfg.color}15`, color: cfg.color, ml: 1, flexShrink: 0 }}
              />
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 *  MAIN PAGE
 * ══════════════════════════════════════════════════════════════════════════ */
export default function TimelinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ctxBeneficiaryId = searchParams.get('beneficiaryId') || '';
  const ctxEpisodeId = searchParams.get('episodeId') || '';

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const fetchTimeline = useCallback(async () => {
    if (!ctxBeneficiaryId && !ctxEpisodeId) return;
    setLoading(true);
    setError(null);
    try {
      let res;
      if (ctxEpisodeId) {
        res = await timelineAPI.getByEpisode(ctxEpisodeId, {
          ...(filterType && { eventType: filterType }),
        });
      } else {
        res = await timelineAPI.getByBeneficiary(ctxBeneficiaryId, {
          ...(filterType && { eventType: filterType }),
        });
      }
      const d = res?.data;
      const items = d?.events ?? d?.data ?? (Array.isArray(d) ? d : []);
      // Sort newest first
      items.sort((a, b) => {
        const da = new Date(a.eventDate || a.createdAt);
        const db = new Date(b.eventDate || b.createdAt);
        return db - da;
      });
      setEvents(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ctxBeneficiaryId, ctxEpisodeId, filterType]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  // Filter by year client-side
  const years = [
    ...new Set(
      events
        .map(e => {
          const d = e.eventDate || e.createdAt;
          return d ? new Date(d).getFullYear() : null;
        })
        .filter(Boolean)
    ),
  ].sort((a, b) => b - a);

  const displayed = filterYear
    ? events.filter(e => {
        const d = e.eventDate || e.createdAt;
        return d && new Date(d).getFullYear() === Number(filterYear);
      })
    : events;

  // Group by year for display
  const grouped = displayed.reduce((acc, ev) => {
    const d = ev.eventDate || ev.createdAt;
    const yr = d ? new Date(d).getFullYear().toString() : 'غير محدد';
    if (!acc[yr]) acc[yr] = [];
    acc[yr].push(ev);
    return acc;
  }, {});

  const noContext = !ctxBeneficiaryId && !ctxEpisodeId;

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Context Banner */}
      {(ctxEpisodeId || ctxBeneficiaryId) && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button size="small" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
              رجوع
            </Button>
          }
        >
          {ctxBeneficiaryId && `الجدول الزمني للمستفيد: ${ctxBeneficiaryId}`}
          {ctxEpisodeId && ` | الحلقة: ${ctxEpisodeId}`}
          {` — ${events.length} حدث`}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <TimeIcon color="primary" />
            الجدول الزمني
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مسار رعاية المستفيد عبر الزمن
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
            disabled={noContext}
          >
            إضافة حدث
          </Button>
          <IconButton onClick={fetchTimeline}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {noContext && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          يرجى فتح الجدول الزمني من ملف مستفيد أو حلقة علاجية.
          <br />
          مثال: <code>/platform/timeline?beneficiaryId=XYZ</code>
        </Alert>
      )}

      {/* Filters */}
      {!noContext && (
        <Card sx={{ mb: 2 }}>
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>نوع الحدث</InputLabel>
                  <Select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    label="نوع الحدث"
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {Object.entries(EVENT_TYPES).map(([k, v]) => (
                      <MenuItem key={k} value={k}>
                        {v.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {years.length > 1 && (
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>السنة</InputLabel>
                    <Select
                      value={filterYear}
                      onChange={e => setFilterYear(e.target.value)}
                      label="السنة"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {years.map(y => (
                        <MenuItem key={y} value={y}>
                          {y}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
              {/* Event type legend */}
              <Grid item xs={12}>
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {Object.entries(EVENT_TYPES).map(([k, v]) => {
                    const count = events.filter(e => e.eventType === k).length;
                    if (!count) return null;
                    return (
                      <Chip
                        key={k}
                        label={`${v.label} (${count})`}
                        size="small"
                        onClick={() => setFilterType(filterType === k ? '' : k)}
                        sx={{
                          bgcolor: filterType === k ? `${v.color}30` : `${v.color}10`,
                          color: v.color,
                          border: `1px solid ${v.color}50`,
                          cursor: 'pointer',
                        }}
                      />
                    );
                  })}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Timeline by year groups */}
      {!noContext && !loading && displayed.length === 0 && (
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <TimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">لا توجد أحداث مسجلة</Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{ mt: 2 }}
            onClick={() => setAddOpen(true)}
          >
            أضف أول حدث
          </Button>
        </Paper>
      )}

      {Object.entries(grouped).map(([year, yearEvents]) => (
        <Box key={year} sx={{ mb: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Chip label={year} color="primary" />
            <Typography variant="caption" color="text.secondary">
              {yearEvents.length} حدث
            </Typography>
            <Divider sx={{ flexGrow: 1 }} />
          </Stack>
          <Box>
            {yearEvents.map((ev, idx) => (
              <EventCard key={ev._id || ev.id} event={ev} isLast={idx === yearEvents.length - 1} />
            ))}
          </Box>
        </Box>
      ))}

      {/* Add Event Dialog */}
      <AddEventDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={fetchTimeline}
        initialBeneficiaryId={ctxBeneficiaryId}
        initialEpisodeId={ctxEpisodeId}
      />
    </Box>
  );
}
