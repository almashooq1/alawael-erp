/**
 * CapaAdmin.jsx — لوحة إدارة الإجراءات التصحيحية والوقائية (CAPA)
 *
 * Backend: /api/admin/capa  (capa-admin.routes.js)
 *
 * الوظائف:
 *   • قائمة كاملة للإجراءات مع فلترة (الحالة، الخطورة، الفرع)
 *   • شريط ملخص: إجمالي، متأخرة، مفتوحة
 *   • إنشاء إجراء جديد
 *   • انتقالات دورة الحياة: بدء / حل / تحقق / تصعيد
 *   • حذف ناعم (soft-delete)
 *
 * دورة الحياة:
 *   open → in_progress → resolved → closed
 *                    ↘ escalated
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
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
  CircularProgress,
  Alert,
  Grid,
  LinearProgress,
  Fade,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as ResolveIcon,
  VerifiedUser as VerifyIcon,
  ArrowUpward as EscalateIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Close as CloseIcon,
  Assignment as CapaIcon,
  Warning as OverdueIcon,
  Timeline as AgingIcon,
  BoltOutlined as BulkIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

const STATUS_COLOR = {
  open: 'default',
  in_progress: 'info',
  pending_review: 'warning',
  resolved: 'success',
  closed: 'success',
  escalated: 'error',
  overdue: 'error',
};

const STATUS_LABEL = {
  open: 'مفتوح',
  in_progress: 'قيد التنفيذ',
  pending_review: 'بانتظار المراجعة',
  resolved: 'محلول',
  closed: 'مغلق',
  escalated: 'مصعّد',
  overdue: 'متأخر',
};

const SEVERITY_COLOR = {
  critical: 'error',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const BASE = '/api/admin/capa';

// ─── component ───────────────────────────────────────────────────────────────

export default function CapaAdmin() {
  const { showSnackbar } = useSnackbar();

  // list state
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [page, setPage] = useState(1);

  // dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(null); // holds the doc
  const [escalateOpen, setEscalateOpen] = useState(null);

  // form state
  const [form, setForm] = useState({
    title: '',
    requiredAction: '',
    severity: 'medium',
    type: 'process_improvement',
    dueDate: '',
    description: '',
  });
  const [resolutionNote, setResolutionNote] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── derived analytics ──────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const now = Date.now();
    const active = rows.filter(r => !['resolved', 'closed'].includes(r.status));

    // Aging by days since createdAt
    const aging = { '0-7': 0, '8-30': 0, '31-90': 0, '90+': 0 };
    active.forEach(r => {
      const age = Math.floor(
        (now - new Date(r.createdAt || r._id ? parseInt(r._id?.substring(0, 8), 16) * 1000 : now)) /
          86_400_000
      );
      if (age <= 7) aging['0-7']++;
      else if (age <= 30) aging['8-30']++;
      else if (age <= 90) aging['31-90']++;
      else aging['90+']++;
    });

    // Status counts
    const byStatus = Object.fromEntries(
      Object.keys(STATUS_LABEL).map(k => [k, rows.filter(r => r.status === k).length])
    );

    // Severity counts for active items
    const bySev = { critical: 0, high: 0, medium: 0, low: 0 };
    active.forEach(r => {
      if (r.severity && bySev[r.severity] !== undefined) bySev[r.severity]++;
    });

    return { aging, byStatus, bySev, activeCount: active.length };
  }, [rows]);

  const bulkEscalateOverdue = async () => {
    const targets = rows.filter(
      r =>
        !['resolved', 'closed', 'escalated'].includes(r.status) && new Date(r.dueDate) < new Date()
    );
    if (!targets.length) {
      showSnackbar('لا توجد إجراءات متأخرة للتصعيد', 'info');
      return;
    }
    if (!window.confirm(`تصعيد ${targets.length} إجراء متأخر؟`)) return;
    await Promise.allSettled(
      targets.map(r =>
        apiClient.post(`${BASE}/${r._id}/escalate`, {
          reason: 'تصعيد تلقائي — تجاوز تاريخ الاستحقاق',
        })
      )
    );
    showSnackbar(`تم تصعيد ${targets.length} إجراء`, 'success');
    fetchData();
  };

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterOverdue) params.overdue = 'true';
      const { data } = await apiClient.get(BASE, { params });
      setRows(data.data || []);
      setTotal(data.pagination?.total || 0);
      setOverdueCount(data.overdueCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterSeverity, filterOverdue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── lifecycle actions ──────────────────────────────────────────────────────
  const transition = async (id, action, body = {}) => {
    try {
      await apiClient.post(`${BASE}/${id}/${action}`, body);
      showSnackbar('تم التحديث بنجاح', 'success');
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'فشل التحديث', 'error');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإجراء التصحيحي؟')) return;
    try {
      await apiClient.delete(`${BASE}/${id}`);
      showSnackbar('تم الحذف بنجاح', 'success');
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'فشل الحذف', 'error');
    }
  };

  // ── create ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.title || !form.requiredAction || !form.dueDate) {
      showSnackbar('يرجى ملء الحقول المطلوبة', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(BASE, form);
      showSnackbar('تم إنشاء الإجراء التصحيحي بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        title: '',
        requiredAction: '',
        severity: 'medium',
        type: 'process_improvement',
        dueDate: '',
        description: '',
      });
      fetchData();
    } catch (err) {
      showSnackbar(err.response?.data?.message || 'فشل الإنشاء', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── resolve ────────────────────────────────────────────────────────────────
  const handleResolve = async () => {
    if (!resolutionNote) {
      showSnackbar('ملاحظة الحل مطلوبة', 'warning');
      return;
    }
    setSubmitting(true);
    await transition(resolveOpen._id, 'resolve', { resolutionNote });
    setResolveOpen(null);
    setResolutionNote('');
    setSubmitting(false);
  };

  // ── escalate ───────────────────────────────────────────────────────────────
  const handleEscalate = async () => {
    setSubmitting(true);
    await transition(escalateOpen._id, 'escalate', { reason: escalateReason });
    setEscalateOpen(null);
    setEscalateReason('');
    setSubmitting(false);
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        <CapaIcon color="primary" fontSize="large" />
        <Typography variant="h5" fontWeight="bold">
          الإجراءات التصحيحية والوقائية (CAPA)
        </Typography>
        {overdueCount > 0 && (
          <Chip
            icon={<OverdueIcon />}
            label={`${overdueCount} متأخرة`}
            color="error"
            size="small"
          />
        )}
      </Stack>

      {/* Summary chips */}
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" alignItems="center">
        <Chip label={`الإجمالي: ${total}`} color="primary" variant="outlined" />
        <Chip
          label={`متأخرة: ${overdueCount}`}
          color={overdueCount > 0 ? 'error' : 'default'}
          variant={overdueCount > 0 ? 'filled' : 'outlined'}
          onClick={() => setFilterOverdue(v => !v)}
          clickable
        />
        {overdueCount > 0 && (
          <Tooltip title="تصعيد جميع الإجراءات المتأخرة دفعة واحدة">
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<BulkIcon />}
              onClick={bulkEscalateOverdue}
            >
              تصعيد المتأخرة
            </Button>
          </Tooltip>
        )}
      </Stack>

      {/* ── Analytics Panel ─────────────────────────────────────────────── */}
      <Fade in timeout={600}>
        <Paper
          sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg,#faf5ff,#eef2ff)' }}
          elevation={0}
          variant="outlined"
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
            <AgingIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight={700} color="#8b5cf6">
              تحليلات دورة الحياة
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {/* Aging */}
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                gutterBottom
                display="block"
              >
                التقادم (الإجراءات النشطة)
              </Typography>
              <Stack spacing={0.8}>
                {[
                  ['0-7', '1-7 أيام', '#10b981'],
                  ['8-30', '8-30 يوم', '#f59e0b'],
                  ['31-90', '31-90 يوم', '#f97316'],
                  ['90+', 'أكثر من 90 يوم', '#ef4444'],
                ].map(([k, lbl, col]) => (
                  <Stack key={k} direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" sx={{ width: 90 }} color="text.secondary">
                      {lbl}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={
                        analytics.activeCount
                          ? (analytics.aging[k] / analytics.activeCount) * 100
                          : 0
                      }
                      sx={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        bgcolor: `${col}20`,
                        '& .MuiLinearProgress-bar': { bgcolor: col, borderRadius: 3 },
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={col}
                      sx={{ width: 20, textAlign: 'right' }}
                    >
                      {analytics.aging[k]}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Grid>

            {/* Status distribution */}
            <Grid item xs={12} sm={6} md={4}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                gutterBottom
                display="block"
              >
                توزيع الحالات
              </Typography>
              <Stack spacing={0.6}>
                {Object.entries(analytics.byStatus)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => (
                    <Stack key={k} direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="caption"
                        sx={{ width: 100 }}
                        color="text.secondary"
                        noWrap
                      >
                        {STATUS_LABEL[k] || k}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={total ? (v / total) * 100 : 0}
                        sx={{ flex: 1, height: 5, borderRadius: 3 }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ width: 20, textAlign: 'right' }}
                      >
                        {v}
                      </Typography>
                    </Stack>
                  ))}
              </Stack>
            </Grid>

            {/* Severity distribution */}
            <Grid item xs={12} sm={12} md={4}>
              <Typography
                variant="caption"
                fontWeight={600}
                color="text.secondary"
                gutterBottom
                display="block"
              >
                توزيع الخطورة (نشط)
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {[
                  ['critical', 'حرجة', 'error'],
                  ['high', 'عالية', 'warning'],
                  ['medium', 'متوسطة', 'info'],
                  ['low', 'منخفضة', 'default'],
                ].map(([k, lbl, color]) => (
                  <Chip
                    key={k}
                    size="small"
                    color={color}
                    label={`${lbl}: ${analytics.bySev[k]}`}
                    variant={analytics.bySev[k] > 0 ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Fade>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="الحالة"
              value={filterStatus}
              onChange={e => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(STATUS_LABEL).map(([v, l]) => (
                <MenuItem key={v} value={v}>
                  {l}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="الخطورة"
              value={filterSeverity}
              onChange={e => {
                setFilterSeverity(e.target.value);
                setPage(1);
              }}
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="critical">حرجة</MenuItem>
              <MenuItem value="high">عالية</MenuItem>
              <MenuItem value="medium">متوسطة</MenuItem>
              <MenuItem value="low">منخفضة</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              إضافة إجراء تصحيحي
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'primary.main' }}>
              {['العنوان', 'النوع', 'الخطورة', 'الحالة', 'تاريخ الاستحقاق', 'الإجراءات'].map(h => (
                <TableCell key={h} sx={{ color: 'white', fontWeight: 'bold' }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary">لا توجد إجراءات تصحيحية</Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => {
                const isOverdue =
                  new Date(row.dueDate) < new Date() &&
                  !['resolved', 'closed'].includes(row.status);
                return (
                  <TableRow
                    key={row._id}
                    hover
                    sx={isOverdue ? { backgroundColor: 'error.lighter' } : {}}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {row.title}
                      </Typography>
                      {isOverdue && (
                        <Chip label="متأخر" color="error" size="small" sx={{ mt: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {row.type?.replace(/_/g, ' ') || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={row.severity || '—'}
                        color={SEVERITY_COLOR[row.severity] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={STATUS_LABEL[row.status] || row.status}
                        color={STATUS_COLOR[row.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={isOverdue ? 'error' : 'text.primary'}>
                        {fmtDate(row.dueDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {row.status === 'open' && (
                          <Tooltip title="بدء التنفيذ">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => transition(row._id, 'start')}
                            >
                              <StartIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {['open', 'in_progress', 'pending_review'].includes(row.status) && (
                          <Tooltip title="حل">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => setResolveOpen(row)}
                            >
                              <ResolveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {row.status === 'resolved' && (
                          <Tooltip title="تحقق وإغلاق">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => transition(row._id, 'verify')}
                            >
                              <VerifyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!['resolved', 'closed'].includes(row.status) && (
                          <Tooltip title="تصعيد">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => setEscalateOpen(row)}
                            >
                              <EscalateIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(row._id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {total > 20 && (
        <Stack direction="row" justifyContent="center" spacing={1} mt={2}>
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            السابق
          </Button>
          <Typography sx={{ alignSelf: 'center' }}>
            {page} / {Math.ceil(total / 20)}
          </Typography>
          <Button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>
            التالي
          </Button>
        </Stack>
      )}

      {/* ── Create Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          إضافة إجراء تصحيحي جديد
          <IconButton
            onClick={() => setCreateOpen(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={1}>
            <TextField
              required
              fullWidth
              label="العنوان"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
            <TextField
              required
              fullWidth
              multiline
              rows={2}
              label="الإجراء المطلوب"
              value={form.requiredAction}
              onChange={e => setForm(f => ({ ...f, requiredAction: e.target.value }))}
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="الوصف"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="النوع"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {[
                    ['complete_documentation', 'إكمال التوثيق'],
                    ['schedule_reassessment', 'جدولة إعادة تقييم'],
                    ['update_care_plan', 'تحديث خطة الرعاية'],
                    ['contact_family', 'التواصل مع الأسرة'],
                    ['training_required', 'تدريب مطلوب'],
                    ['process_improvement', 'تحسين العملية'],
                    ['equipment_request', 'طلب معدات'],
                    ['escalate_to_supervisor', 'تصعيد للمشرف'],
                    ['custom', 'مخصص'],
                  ].map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="الخطورة"
                  value={form.severity}
                  onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                >
                  <MenuItem value="critical">حرجة</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="medium">متوسطة</MenuItem>
                  <MenuItem value="low">منخفضة</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  type="date"
                  label="تاريخ الاستحقاق"
                  InputLabelProps={{ shrink: true }}
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Resolve Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={!!resolveOpen} onClose={() => setResolveOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          حل الإجراء التصحيحي
          <IconButton
            onClick={() => setResolveOpen(null)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {resolveOpen && (
            <Stack spacing={2} pt={1}>
              <Typography variant="body2" color="text.secondary">
                {resolveOpen.title}
              </Typography>
              <TextField
                required
                fullWidth
                multiline
                rows={3}
                label="ملاحظة الحل"
                value={resolutionNote}
                onChange={e => setResolutionNote(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveOpen(null)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleResolve} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : 'تأكيد الحل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Escalate Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!escalateOpen} onClose={() => setEscalateOpen(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          تصعيد الإجراء التصحيحي
          <IconButton
            onClick={() => setEscalateOpen(null)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {escalateOpen && (
            <Stack spacing={2} pt={1}>
              <Typography variant="body2" color="text.secondary">
                {escalateOpen.title}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="سبب التصعيد"
                value={escalateReason}
                onChange={e => setEscalateReason(e.target.value)}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEscalateOpen(null)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleEscalate}
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={20} /> : 'تصعيد'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
