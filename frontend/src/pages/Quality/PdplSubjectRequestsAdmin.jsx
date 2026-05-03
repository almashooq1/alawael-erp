/**
 * PdplSubjectRequestsAdmin.jsx — UI for PDPL Article 4 data subject
 * requests (access / rectification / erasure / portability).
 *
 * Backend: /api/pdpl/subject-requests (see backend/routes/pdpl.routes.js).
 *
 * What this page is for:
 *   • List all subject requests with deadline countdown (30-day legal SLA)
 *   • Highlight overdue requests in red — these are regulatory exposure
 *   • Update request status (received → in_progress → completed/rejected)
 *   • Trigger user data export (Article 4 — right to access + portability)
 *   • Trigger user data erasure (Article 4 — right to erasure)
 *
 * Why PDPL cares:
 *   Saudi Personal Data Protection Law gives data subjects 30 days to
 *   receive a response. Missing the deadline is a regulatory exposure.
 *   This UI surfaces overdue requests prominently so the DPO can act
 *   before the deadline.
 *
 * RBAC:
 *   The backend gates these endpoints to admin / dpo / compliance_officer.
 *   This page should be linked under the QMS group with a `PDPL` badge.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
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
  Button,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Download as ExportIcon,
  DeleteForever as EraseIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Gavel as PdplIcon,
  Warning as OverdueIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const STATUS_TITLE_ID = 'pdpl-status-dialog-title';
const DETAIL_TITLE_ID = 'pdpl-detail-dialog-title';

// PDPL Article 4 request types (Saudi Personal Data Protection Law)
const REQUEST_TYPES = [
  { value: 'access', label: 'حق الوصول (مادة 4)' },
  { value: 'rectification', label: 'حق التصحيح' },
  { value: 'erasure', label: 'حق المحو' },
  { value: 'portability', label: 'حق نقل البيانات' },
  { value: 'objection', label: 'حق الاعتراض' },
];

const STATUSES = [
  { value: 'received', label: 'مُستلَم' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مُنجَز' },
  { value: 'rejected', label: 'مرفوض' },
];

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
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'received':
      return 'warning';
    case 'rejected':
      return 'default';
    default:
      return 'default';
  }
}

function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function deadlineColor(days) {
  if (days === null) return 'default';
  if (days < 0) return 'error'; // overdue
  if (days <= 5) return 'warning';
  return 'default';
}

export default function PdplSubjectRequestsAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.requestType = filterType;
      const [list, overdue] = await Promise.all([
        apiClient.get('/pdpl/subject-requests', { params }),
        apiClient.get('/pdpl/subject-requests/overdue').catch(() => ({ data: { count: 0 } })),
      ]);
      setRows(list?.data?.data || []);
      setOverdueCount(overdue?.data?.count ?? overdue?.data?.data?.length ?? 0);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر تحميل الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const openStatus = row => {
    setStatusTarget(row);
    setNewStatus(row.status || 'received');
    setNewNotes('');
    setStatusOpen(true);
  };

  const handleStatusUpdate = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/pdpl/subject-requests/${statusTarget._id}`, {
        status: newStatus,
        notes: newNotes || undefined,
      });
      showSnackbar('تم تحديث حالة الطلب', 'success');
      setStatusOpen(false);
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر التحديث', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async row => {
    try {
      const { data } = await apiClient.get(`/pdpl/export/${row.userId || row.user}`);
      // Trigger a JSON download — no-op render side-effect; safe to leave.
      const blob = new Blob([JSON.stringify(data?.data || data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pdpl-export-${row.userId || row.user}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSnackbar('تم تنزيل البيانات', 'success');
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر التصدير', 'error');
    }
  };

  const handleErase = async row => {
    const reason = window.prompt('سبب طلب المحو؟ (سيُسجَّل في الـ audit trail)');
    if (!reason) return;
    if (
      !window.confirm(
        `تأكيد محو بيانات المستخدم ${row.userId || row.user}؟ هذا الإجراء غير قابل للتراجع.`
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/pdpl/erase/${row.userId || row.user}`, {
        data: { reason },
      });
      showSnackbar('تم محو البيانات الشخصية', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر المحو', 'error');
    }
  };

  const openDetail = row => {
    setDetail(row);
    setDetailOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PdplIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            طلبات أصحاب البيانات (PDPL مادة 4)
          </Typography>
        </Stack>
        {overdueCount > 0 && (
          <Chip
            icon={<OverdueIcon />}
            label={`${overdueCount} طلب متأخر — تجاوز 30 يوم`}
            color="error"
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        نظام حماية البيانات الشخصية (PDPL) السعودي يُعطي صاحب البيانات 30 يوماً للحصول على رد. الـ
        DPO أو مسؤول الامتثال يستخدم هذه الصفحة لإدارة طلبات الوصول والتصحيح والمحو ونقل البيانات.
      </Typography>

      {overdueCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <strong>تحذير تنظيمي:</strong> يوجد {overdueCount} طلب تجاوز الحد القانوني (30 يوماً من
          PDPL). يجب الرد عليها فوراً لتجنّب التعرّض القانوني.
        </Alert>
      )}

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
            {STATUSES.map(s => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="نوع الطلب"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {REQUEST_TYPES.map(t => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Chip label={`${rows.length} طلب`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول طلبات أصحاب البيانات">
          <TableHead>
            <TableRow>
              <TableCell>المستخدم</TableCell>
              <TableCell>نوع الطلب</TableCell>
              <TableCell>تاريخ الاستلام</TableCell>
              <TableCell>الموعد النهائي (30 يوم)</TableCell>
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
                    لا توجد طلبات تطابق الفلتر
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => {
              const days = daysUntilDeadline(row.deadline);
              const userId = row.userId || row.user;
              return (
                <TableRow key={row._id} hover>
                  <TableCell>{userId}</TableCell>
                  <TableCell>
                    {REQUEST_TYPES.find(t => t.value === row.requestType)?.label || row.requestType}
                  </TableCell>
                  <TableCell>{fmtDate(row.createdAt || row.receivedAt)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={
                        days === null
                          ? '—'
                          : days < 0
                            ? `متأخر ${Math.abs(days)} يوم`
                            : `${days} يوم متبقي`
                      }
                      color={deadlineColor(days)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={STATUSES.find(s => s.value === row.status)?.label || row.status}
                      color={statusColor(row.status)}
                    />
                  </TableCell>
                  <TableCell align="left">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        aria-label={`عرض طلب ${userId}`}
                        onClick={() => openDetail(row)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تحديث الحالة">
                      <IconButton
                        size="small"
                        aria-label={`تحديث حالة طلب ${userId}`}
                        onClick={() => openStatus(row)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {(row.requestType === 'access' || row.requestType === 'portability') && (
                      <Tooltip title="تصدير بيانات المستخدم (JSON)">
                        <IconButton
                          size="small"
                          aria-label={`تصدير بيانات ${userId}`}
                          onClick={() => handleExport(row)}
                        >
                          <ExportIcon fontSize="small" color="primary" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {row.requestType === 'erasure' && (
                      <Tooltip title="محو البيانات (لا رجعة)">
                        <IconButton
                          size="small"
                          aria-label={`محو بيانات ${userId}`}
                          onClick={() => handleErase(row)}
                        >
                          <EraseIcon fontSize="small" color="error" />
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

      {/* ── Status update dialog ───────────────────────────────────── */}
      <Dialog
        open={statusOpen}
        onClose={() => !saving && setStatusOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby={STATUS_TITLE_ID}
      >
        <DialogTitle id={STATUS_TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>تحديث حالة الطلب</span>
            <IconButton aria-label="إغلاق" onClick={() => setStatusOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="الحالة الجديدة"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
              fullWidth
              disabled={saving}
            >
              {STATUSES.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="ملاحظات (تُسجَّل في الـ audit trail)"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleStatusUpdate}
            disabled={saving}
          >
            تحديث
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
            <span>تفاصيل الطلب</span>
            <IconButton aria-label="إغلاق" onClick={() => setDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    معرّف المستخدم
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {detail.userId || detail.user}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    نوع الطلب
                  </Typography>
                  <Typography variant="body2">
                    {REQUEST_TYPES.find(t => t.value === detail.requestType)?.label ||
                      detail.requestType}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الاستلام
                  </Typography>
                  <Typography variant="body2">
                    {fmtDate(detail.createdAt || detail.receivedAt)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الموعد النهائي
                  </Typography>
                  <Typography variant="body2">{fmtDate(detail.deadline)}</Typography>
                </Grid>
              </Grid>
              {detail.notes && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    ملاحظات
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {detail.notes}
                  </Typography>
                </Box>
              )}
              {detail.handlerHistory && detail.handlerHistory.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    سجل الإجراءات ({detail.handlerHistory.length})
                  </Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
