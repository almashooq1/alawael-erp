/**
 * PdplBreachReportingAdmin.jsx — UI for PDPL Article 20 data breach
 * incident reporting + tracking.
 *
 * Backend: /api/pdpl/breaches (see backend/routes/pdpl.routes.js).
 *
 * What this page is for:
 *   • List all data breach incidents with severity + status
 *   • Highlight incidents that must be reported to SDAIA within 72h
 *     (severity = high/critical) — countdown chip per row
 *   • Report a new incident (description, severity, affected records,
 *     data types affected, root cause)
 *   • Update incident state (investigation status, mitigation notes)
 *
 * Why PDPL Article 20 cares:
 *   Saudi PDPL requires notifying SDAIA (Saudi Data & AI Authority)
 *   within 72 HOURS of detecting a high/critical-severity data breach.
 *   Missing the deadline is a regulatory violation. The list highlights
 *   incidents whose 72h window is closing so the DPO can act.
 *
 * RBAC:
 *   Backend gates POST + PUT to admin / dpo / security_team. Read is
 *   wider (also compliance_officer).
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
  Button,
  Autocomplete,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  ReportProblem as BreachIcon,
  Warning as UrgentIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const REPORT_TITLE_ID = 'pdpl-breach-report-title';
const DETAIL_TITLE_ID = 'pdpl-breach-detail-title';
const UPDATE_TITLE_ID = 'pdpl-breach-update-title';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

const STATUSES = [
  { value: 'detected', label: 'تم اكتشافها' },
  { value: 'investigating', label: 'قيد التحقيق' },
  { value: 'contained', label: 'تم احتواؤها' },
  { value: 'resolved', label: 'مُنجَزة' },
  { value: 'reported_to_sdaia', label: 'تم الإبلاغ لـ SDAIA' },
];

const STANDARD_DATA_TYPES = [
  'personal_info',
  'health_data',
  'financial_data',
  'biometric_data',
  'authentication_credentials',
  'medical_records',
  'communication_records',
  'imaging_records',
];

const EMPTY_FORM = {
  description: '',
  severity: 'medium',
  affectedRecords: '',
  dataTypesAffected: [],
  rootCause: '',
};

const SDAIA_DEADLINE_HOURS = 72;

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return String(v);
  }
}

function severityColor(s) {
  switch (s) {
    case 'critical':
      return 'error';
    case 'high':
      return 'error';
    case 'medium':
      return 'warning';
    case 'low':
      return 'info';
    default:
      return 'default';
  }
}

function statusColor(s) {
  switch (s) {
    case 'resolved':
    case 'reported_to_sdaia':
      return 'success';
    case 'contained':
      return 'info';
    case 'investigating':
      return 'warning';
    case 'detected':
      return 'error';
    default:
      return 'default';
  }
}

// Hours until the SDAIA 72h deadline closes for this incident.
// Returns null when the incident isn't high/critical (no SDAIA gate).
function hoursUntilSdaiaDeadline(incident) {
  if (!['high', 'critical'].includes(incident.severity)) return null;
  if (incident.status === 'reported_to_sdaia') return null;
  if (!incident.detectedAt) return null;
  const deadline = new Date(incident.detectedAt).getTime() + SDAIA_DEADLINE_HOURS * 60 * 60 * 1000;
  return Math.floor((deadline - Date.now()) / (60 * 60 * 1000));
}

export default function PdplBreachReportingAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [reportOpen, setReportOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSeverity) params.severity = filterSeverity;
      if (filterStatus) params.status = filterStatus;
      const { data } = await apiClient.get('/pdpl/breaches', { params });
      setRows(data?.data || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر تحميل الحوادث', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterSeverity, filterStatus, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReport = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        severity: form.severity,
        affectedRecords: form.affectedRecords ? Number(form.affectedRecords) : 0,
        dataTypesAffected: form.dataTypesAffected,
        rootCause: form.rootCause.trim(),
      };
      const { data } = await apiClient.post('/pdpl/breaches', payload);
      const sdaia = data?.requiresSdaiaNotification;
      showSnackbar(
        sdaia ? '⚠️ تم التسجيل — يجب إخطار SDAIA خلال 72 ساعة' : 'تم تسجيل حادثة الخرق',
        sdaia ? 'warning' : 'success'
      );
      setReportOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (err) {
      setServerError(err?.response?.data?.message || err?.message || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/pdpl/breaches/${updateTarget._id}`, {
        status: updateStatus,
        notes: updateNotes || undefined,
      });
      showSnackbar('تم تحديث الحادثة', 'success');
      setUpdateOpen(false);
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر التحديث', 'error');
    } finally {
      setSaving(false);
    }
  };

  const formInvalid =
    !form.description.trim() || !form.severity || form.dataTypesAffected.length === 0;

  // Count incidents that still need SDAIA notification within 72h.
  const sdaiaUrgentCount = rows.filter(r => {
    const h = hoursUntilSdaiaDeadline(r);
    return h !== null && h > 0;
  }).length;
  const sdaiaOverdueCount = rows.filter(r => {
    const h = hoursUntilSdaiaDeadline(r);
    return h !== null && h <= 0;
  }).length;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <BreachIcon color="error" />
          <Typography variant="h5" fontWeight={700}>
            الإبلاغ عن خرق البيانات (PDPL مادة 20)
          </Typography>
        </Stack>
        <Button
          variant="contained"
          color="error"
          startIcon={<AddIcon />}
          onClick={() => {
            setForm({ ...EMPTY_FORM });
            setServerError(null);
            setReportOpen(true);
          }}
        >
          الإبلاغ عن حادثة
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        نظام حماية البيانات الشخصية (PDPL) السعودي يُلزم بإخطار هيئة البيانات والذكاء الاصطناعي
        (SDAIA) خلال 72 ساعة من اكتشاف خرق بدرجة خطورة عالية أو حرجة. هذه الصفحة تعرض ساعات العدّ
        التنازلي وتُمكّن DPO/الأمن من تتبّع الحوادث.
      </Typography>

      {sdaiaOverdueCount > 0 && (
        <Alert severity="error" icon={<UrgentIcon />} sx={{ mb: 2 }}>
          <strong>تحذير حرج:</strong> {sdaiaOverdueCount} حادثة تجاوزت مهلة الـ 72 ساعة لإبلاغ
          SDAIA. تواصل مع SDAIA فوراً وحدّث الحالة.
        </Alert>
      )}
      {sdaiaUrgentCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {sdaiaUrgentCount} حادثة عالية/حرجة الخطورة لم تُبلَّغ إلى SDAIA بعد — راجع العدّ التنازلي
          في الجدول.
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="درجة الخطورة"
            value={filterSeverity}
            onChange={e => setFilterSeverity(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {SEVERITIES.map(s => (
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
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {STATUSES.map(s => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Chip label={`${rows.length} حادثة`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول حوادث خرق البيانات">
          <TableHead>
            <TableRow>
              <TableCell>الوصف</TableCell>
              <TableCell>الخطورة</TableCell>
              <TableCell>السجلات المتأثرة</TableCell>
              <TableCell>تاريخ الاكتشاف</TableCell>
              <TableCell>SDAIA (72 ساعة)</TableCell>
              <TableCell>الحالة</TableCell>
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
                    لا توجد حوادث مسجَّلة (هذا أمر جيد!)
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => {
              const hours = hoursUntilSdaiaDeadline(row);
              return (
                <TableRow key={row._id} hover>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" noWrap title={row.description}>
                      {row.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.severity} color={severityColor(row.severity)} />
                  </TableCell>
                  <TableCell>{row.affectedRecords ?? 0}</TableCell>
                  <TableCell>{fmtDate(row.detectedAt)}</TableCell>
                  <TableCell>
                    {hours === null ? (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    ) : hours <= 0 ? (
                      <Chip
                        size="small"
                        label={`متأخر ${Math.abs(hours)} ساعة`}
                        color="error"
                        icon={<UrgentIcon fontSize="small" />}
                      />
                    ) : hours <= 12 ? (
                      <Chip size="small" label={`${hours} ساعة متبقية`} color="error" />
                    ) : hours <= 24 ? (
                      <Chip size="small" label={`${hours} ساعة متبقية`} color="warning" />
                    ) : (
                      <Chip size="small" label={`${hours} ساعة متبقية`} color="info" />
                    )}
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
                        aria-label={`عرض حادثة ${row._id}`}
                        onClick={() => {
                          setDetail(row);
                          setDetailOpen(true);
                        }}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تحديث الحالة">
                      <IconButton
                        size="small"
                        aria-label={`تحديث حادثة ${row._id}`}
                        onClick={() => {
                          setUpdateTarget(row);
                          setUpdateStatus(row.status || 'detected');
                          setUpdateNotes('');
                          setUpdateOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Report dialog ──────────────────────────────────────────── */}
      <Dialog
        open={reportOpen}
        onClose={() => !saving && setReportOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby={REPORT_TITLE_ID}
      >
        <DialogTitle id={REPORT_TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>الإبلاغ عن حادثة خرق بيانات</span>
            <IconButton aria-label="إغلاق" onClick={() => setReportOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              السجلات بدرجة خطورة <strong>عالية</strong> أو <strong>حرجة</strong> تتطلب إخطار SDAIA
              خلال 72 ساعة. اختر الخطورة بدقة.
            </Alert>
            <TextField
              label="وصف الحادثة"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              required
              multiline
              rows={3}
              fullWidth
              disabled={saving}
              helperText="ماذا حدث؟ متى؟ كيف اكتُشف؟"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="درجة الخطورة"
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                required
                fullWidth
                disabled={saving}
              >
                {SEVERITIES.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="عدد السجلات المتأثرة"
                type="number"
                value={form.affectedRecords}
                onChange={e => setForm(f => ({ ...f, affectedRecords: e.target.value }))}
                inputProps={{ min: 0 }}
                fullWidth
                disabled={saving}
              />
            </Stack>
            <Autocomplete
              multiple
              options={STANDARD_DATA_TYPES}
              value={form.dataTypesAffected}
              onChange={(_, v) => setForm(f => ({ ...f, dataTypesAffected: v }))}
              disabled={saving}
              renderInput={params => (
                <TextField {...params} label="أنواع البيانات المتأثرة" required />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
            />
            <TextField
              label="السبب الجذري"
              value={form.rootCause}
              onChange={e => setForm(f => ({ ...f, rootCause: e.target.value }))}
              multiline
              rows={2}
              fullWidth
              disabled={saving}
              helperText="ما الذي مكّن من حدوث الخرق؟"
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
          <Button onClick={() => setReportOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleReport}
            disabled={saving || formInvalid}
          >
            تسجيل الحادثة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Update status dialog ───────────────────────────────────── */}
      <Dialog
        open={updateOpen}
        onClose={() => !saving && setUpdateOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby={UPDATE_TITLE_ID}
      >
        <DialogTitle id={UPDATE_TITLE_ID} sx={{ fontWeight: 700 }}>
          تحديث حالة الحادثة
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="الحالة الجديدة"
              value={updateStatus}
              onChange={e => setUpdateStatus(e.target.value)}
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
              value={updateNotes}
              onChange={e => setUpdateNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
              disabled={saving}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleUpdate}
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
            <span>تفاصيل الحادثة</span>
            <IconButton aria-label="إغلاق" onClick={() => setDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={detail.severity} color={severityColor(detail.severity)} />
                <Chip
                  label={STATUSES.find(s => s.value === detail.status)?.label || detail.status}
                  color={statusColor(detail.status)}
                />
              </Stack>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary">
                  الوصف
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {detail.description}
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الاكتشاف
                  </Typography>
                  <Typography variant="body2">{fmtDate(detail.detectedAt)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    عدد السجلات المتأثرة
                  </Typography>
                  <Typography variant="body2">{detail.affectedRecords ?? 0}</Typography>
                </Grid>
              </Grid>
              {detail.dataTypesAffected && detail.dataTypesAffected.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    أنواع البيانات المتأثرة
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {detail.dataTypesAffected.map((dt, i) => (
                      <Chip key={i} size="small" label={dt} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
              {detail.rootCause && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    السبب الجذري
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {detail.rootCause}
                  </Typography>
                </Box>
              )}
              {['high', 'critical'].includes(detail.severity) && (
                <Alert severity={detail.status === 'reported_to_sdaia' ? 'success' : 'error'}>
                  {detail.status === 'reported_to_sdaia'
                    ? 'تم الإبلاغ إلى SDAIA'
                    : 'يجب الإبلاغ إلى SDAIA خلال 72 ساعة من الاكتشاف'}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
