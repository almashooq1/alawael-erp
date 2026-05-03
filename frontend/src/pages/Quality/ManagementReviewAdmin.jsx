/**
 * ManagementReviewAdmin.jsx — UI for ISO 9001 §9.3 management reviews.
 *
 * Backend: /api/management-review (see
 * backend/routes/managementReview.routes.js).
 *
 * What this page is for:
 *   • List + filter scheduled / in-progress / closed reviews
 *   • Schedule a new review (title, scheduledFor, type, cycleLabel)
 *   • Inspect a review's phase (status + agenda + inputs + outputs)
 *   • Start a meeting (transition: scheduled → in-progress)
 *
 * NOT in scope for v1:
 *   • Inputs / outputs / decisions / actions editing — those have
 *     dedicated POST endpoints on the backend; the UI for them is a
 *     follow-up. CBAHI auditors first need to see that reviews are
 *     SCHEDULED on a cycle and HAPPENING — that's the gate this page
 *     unlocks.
 *
 * Why CBAHI cares:
 *   "Show me your management review minutes for the past 12 months"
 *   is a standard audit question. Without this UI the operator has
 *   nothing to point at, even though the data is in the DB.
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
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  PlayCircle as StartIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  EventNote as ReviewIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const TITLE_ID = 'mgmt-review-dialog-title';
const DETAIL_TITLE_ID = 'mgmt-review-detail-title';

const EMPTY_FORM = {
  title: '',
  scheduledFor: '',
  type: '',
  cycleLabel: '',
};

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function statusColor(s) {
  switch (s) {
    case 'closed':
      return 'success';
    case 'in_progress':
      return 'warning';
    case 'scheduled':
      return 'info';
    case 'cancelled':
      return 'default';
    default:
      return 'default';
  }
}

export default function ManagementReviewAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Reference (statuses, types, ...) — load once ─────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiClient.get('/management-review/reference');
        if (alive) setReference(data?.data || data);
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
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const { data } = await apiClient.get('/management-review', { params });
      setRows(data?.data || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل المراجعات', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Schedule ─────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setServerError(null);
    setCreateOpen(true);
  };

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
      load();
    } catch (err) {
      setServerError(err?.response?.data?.error || err?.message || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  // ── View detail ──────────────────────────────────────────────────
  const openDetail = async row => {
    setDetail(null);
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const { data } = await apiClient.get(`/management-review/${row._id}`);
      setDetail(data?.data || data);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل التفاصيل', 'error');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Start meeting ────────────────────────────────────────────────
  const handleStart = async row => {
    try {
      await apiClient.post(`/management-review/${row._id}/start`);
      showSnackbar('بدأ الاجتماع', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر بدء الاجتماع', 'error');
    }
  };

  const formInvalid = !form.title.trim() || !form.scheduledFor;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <ReviewIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            مراجعات الإدارة (ISO 9001 §9.3)
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          جدولة مراجعة
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        المراجعة الإدارية الدورية وفق ISO 9001 §9.3 — مطلب CBAHI أساسي. الـ inputs والقرارات تُضاف
        لاحقاً عبر API مباشرة (UI لاحق).
      </Typography>

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
                {s}
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
          <Chip label={`${rows.length} مراجعة`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول مراجعات الإدارة">
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الدورة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} aria-label="جاري التحميل" />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    لا توجد مراجعات تطابق الفلتر
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row._id} hover>
                <TableCell>{row.title}</TableCell>
                <TableCell>{fmtDate(row.scheduledFor)}</TableCell>
                <TableCell>{row.type || '—'}</TableCell>
                <TableCell>{row.cycleLabel || '—'}</TableCell>
                <TableCell>
                  <Chip size="small" label={row.status} color={statusColor(row.status)} />
                </TableCell>
                <TableCell align="left">
                  <Tooltip title="عرض التفاصيل">
                    <IconButton
                      size="small"
                      aria-label={`عرض ${row.title}`}
                      onClick={() => openDetail(row)}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {row.status === 'scheduled' && (
                    <Tooltip title="بدء الاجتماع">
                      <IconButton
                        size="small"
                        aria-label={`بدء ${row.title}`}
                        onClick={() => handleStart(row)}
                      >
                        <StartIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Schedule dialog ────────────────────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => !saving && setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby={TITLE_ID}
      >
        <DialogTitle id={TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>جدولة مراجعة إدارة جديدة</span>
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
              label="التاريخ"
              type="datetime-local"
              value={form.scheduledFor}
              onChange={e => setForm(f => ({ ...f, scheduledFor: e.target.value }))}
              required
              InputLabelProps={{ shrink: true }}
              disabled={saving}
            />
            <TextField
              select
              label="النوع"
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
              label="الدورة (مثل: Q1-2026)"
              value={form.cycleLabel}
              onChange={e => setForm(f => ({ ...f, cycleLabel: e.target.value }))}
              fullWidth
              disabled={saving}
            />
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
            جدولة
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
            <span>تفاصيل المراجعة</span>
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
              <Stack direction="row" spacing={2}>
                <Chip label={detail.status} color={statusColor(detail.status)} />
                {detail.type && <Chip label={detail.type} variant="outlined" />}
                {detail.cycleLabel && <Chip label={detail.cycleLabel} variant="outlined" />}
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  التاريخ المجدول
                </Typography>
                <Typography variant="body2">{fmtDate(detail.scheduledFor)}</Typography>
              </Box>
              {detail.agenda && detail.agenda.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    جدول الأعمال ({detail.agenda.length})
                  </Typography>
                  <ul>
                    {detail.agenda.map((a, i) => (
                      <li key={i}>{typeof a === 'string' ? a : a.title || JSON.stringify(a)}</li>
                    ))}
                  </ul>
                </Box>
              )}
              {detail.attendees && detail.attendees.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    الحاضرون ({detail.attendees.length})
                  </Typography>
                </Box>
              )}
              {detail.inputs && detail.inputs.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">المدخلات ({detail.inputs.length})</Typography>
                </Box>
              )}
              {detail.outputs && detail.outputs.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">المخرجات ({detail.outputs.length})</Typography>
                </Box>
              )}
              {detail.actions && detail.actions.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">الإجراءات ({detail.actions.length})</Typography>
                </Box>
              )}
              <Divider />
              <Typography variant="caption" color="text.secondary">
                الإضافة التفصيلية للمدخلات والمخرجات والقرارات تُجرى عبر API مباشرة في الإصدار
                الحالي. UI تفصيلي سيُضاف لاحقاً.
              </Typography>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
