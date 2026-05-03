/**
 * PdplProcessingRecordsAdmin.jsx — UI for PDPL Article 32
 * "Records of processing activities" register.
 *
 * Backend: /api/pdpl/processing-records (see backend/routes/pdpl.routes.js).
 *
 * What this page is for:
 *   • List the org's data processing inventory (data categories,
 *     purposes, legal bases, recipients, retention periods)
 *   • Add a new processing-activity record when a new flow starts
 *   • Inspect a single record's full envelope
 *
 * Backend constraints:
 *   The PDPL routes only expose POST + GET (no PUT/DELETE) — by design,
 *   processing records are an immutable audit register. To "change" an
 *   activity you record a new entry; the old one stays for the audit
 *   trail. The UI reflects this (no edit/delete actions).
 *
 * Why PDPL Article 32 cares:
 *   Saudi PDPL requires the data controller to maintain an up-to-date
 *   "register of processing activities" — a written inventory of every
 *   kind of personal-data processing the org performs. SDAIA can ask
 *   for it during an audit. Without this UI the operator has no way to
 *   surface the register (the data lives in DataProcessingRecord docs
 *   in Mongo).
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
  Divider,
  Grid,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  ListAlt as RegisterIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const TITLE_ID = 'pdpl-processing-create-title';
const DETAIL_TITLE_ID = 'pdpl-processing-detail-title';

// PDPL Article 5 legal bases — the six lawful grounds for processing
// personal data. Hard-coded so audit reports stay consistent.
const LEGAL_BASES = [
  { value: 'consent', label: 'موافقة صاحب البيانات' },
  { value: 'contract', label: 'تنفيذ عقد' },
  { value: 'legal_obligation', label: 'التزام قانوني' },
  { value: 'vital_interest', label: 'مصلحة حيوية' },
  { value: 'public_task', label: 'مهمة عامة' },
  { value: 'legitimate_interest', label: 'مصلحة مشروعة' },
];

// Aligned with RETENTION_PERIODS in backend/services/pdpl.service.js so
// the auto-derived retentionPeriod field is recognized.
const DATA_CATEGORIES = [
  { value: 'financial_records', label: 'سجلات مالية' },
  { value: 'employee_records', label: 'سجلات الموظفين' },
  { value: 'medical_records', label: 'سجلات طبية' },
  { value: 'insurance_claims', label: 'مطالبات تأمينية' },
  { value: 'audit_logs', label: 'سجلات التدقيق' },
  { value: 'session_recordings', label: 'تسجيلات الجلسات' },
  { value: 'consent_records', label: 'سجلات الموافقات' },
  { value: 'beneficiary_records', label: 'سجلات المستفيدين' },
];

const RECIPIENT_CATEGORIES = [
  { value: 'internal_only', label: 'داخلي فقط' },
  { value: 'insurance_partners', label: 'شركاء تأمين (NPHIES)' },
  { value: 'government_agencies', label: 'جهات حكومية (MOH/SDAIA/ZATCA)' },
  { value: 'third_party_processors', label: 'معالجون خارجيون' },
  { value: 'data_subjects', label: 'أصحاب البيانات أنفسهم' },
];

const EMPTY_FORM = {
  purpose: '',
  dataCategory: '',
  legalBasis: '',
  recipientCategory: 'internal_only',
  crossBorderTransfer: false,
};

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function legalBasisLabel(v) {
  return LEGAL_BASES.find(l => l.value === v)?.label || v;
}

function dataCategoryLabel(v) {
  return DATA_CATEGORIES.find(d => d.value === v)?.label || v;
}

export default function PdplProcessingRecordsAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterCategory, setFilterCategory] = useState('');
  const [filterBasis, setFilterBasis] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.dataCategory = filterCategory;
      if (filterBasis) params.legalBasis = filterBasis;
      const { data } = await apiClient.get('/pdpl/processing-records', { params });
      setRows(data?.data || []);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'تعذّر تحميل السجلات', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterBasis, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setServerError(null);
    setSaving(true);
    try {
      await apiClient.post('/pdpl/processing-records', {
        purpose: form.purpose.trim(),
        dataCategory: form.dataCategory,
        legalBasis: form.legalBasis,
        recipientCategory: form.recipientCategory,
        crossBorderTransfer: form.crossBorderTransfer,
      });
      showSnackbar('تم تسجيل نشاط المعالجة', 'success');
      setCreateOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (err) {
      setServerError(err?.response?.data?.message || err?.message || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  const formInvalid = !form.purpose.trim() || !form.dataCategory || !form.legalBasis;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <RegisterIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            سجل أنشطة المعالجة (PDPL مادة 32)
          </Typography>
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setForm({ ...EMPTY_FORM });
            setServerError(null);
            setCreateOpen(true);
          }}
        >
          تسجيل نشاط معالجة
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        نظام حماية البيانات الشخصية (PDPL) السعودي يُلزم بحفظ سجل دائم لكل نشاط معالجة بيانات شخصية
        في المنشأة (الغرض، فئة البيانات، الأساس القانوني، المستلمون، فترة الاحتفاظ). هذا السجل قابل
        للتفتيش من قبل SDAIA. السجلات هنا غير قابلة للتعديل أو الحذف لضمان أمانة الـ audit — لتحديث
        نشاط، أضف سجلاً جديداً.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            size="small"
            label="فئة البيانات"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {DATA_CATEGORIES.map(c => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="الأساس القانوني"
            value={filterBasis}
            onChange={e => setFilterBasis(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {LEGAL_BASES.map(b => (
              <MenuItem key={b.value} value={b.value}>
                {b.label}
              </MenuItem>
            ))}
          </TextField>
          <Box sx={{ flex: 1 }} />
          <Chip label={`${rows.length} نشاط`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول أنشطة المعالجة">
          <TableHead>
            <TableRow>
              <TableCell>الغرض</TableCell>
              <TableCell>فئة البيانات</TableCell>
              <TableCell>الأساس القانوني</TableCell>
              <TableCell>المستلم</TableCell>
              <TableCell>نقل عبر الحدود</TableCell>
              <TableCell>الاحتفاظ</TableCell>
              <TableCell>تاريخ التسجيل</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <CircularProgress size={24} aria-label="جاري التحميل" />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    السجل فارغ — ابدأ بتسجيل نشاط معالجة
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row._id} hover>
                <TableCell sx={{ maxWidth: 220 }}>
                  <Typography variant="body2" noWrap title={row.purpose}>
                    {row.purpose}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={dataCategoryLabel(row.dataCategory)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{legalBasisLabel(row.legalBasis)}</TableCell>
                <TableCell>
                  {RECIPIENT_CATEGORIES.find(r => r.value === row.recipientCategory)?.label ||
                    row.recipientCategory}
                </TableCell>
                <TableCell>
                  {row.crossBorderTransfer ? (
                    <Chip size="small" label="نعم" color="warning" />
                  ) : (
                    <Chip size="small" label="لا" />
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{row.retentionPeriod || '—'}</Typography>
                </TableCell>
                <TableCell>{fmtDate(row.createdAt)}</TableCell>
                <TableCell align="left">
                  <Tooltip title="عرض التفاصيل">
                    <IconButton
                      size="small"
                      aria-label={`عرض نشاط ${row.purpose}`}
                      onClick={() => {
                        setDetail(row);
                        setDetailOpen(true);
                      }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
            <span>تسجيل نشاط معالجة جديد</span>
            <IconButton aria-label="إغلاق" onClick={() => setCreateOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info">
              <strong>تنويه:</strong> لا يمكن تعديل السجل بعد الحفظ — السجل غير قابل للتغيير لضمان
              أمانة الـ audit. لتغيير نشاط، أضف سجلاً جديداً يصف التغيير.
            </Alert>
            <TextField
              label="الغرض من المعالجة"
              value={form.purpose}
              onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              required
              multiline
              rows={2}
              fullWidth
              disabled={saving}
              helperText="ما الغرض من معالجة هذه البيانات؟"
            />
            <Stack direction="row" spacing={2}>
              <TextField
                select
                label="فئة البيانات"
                value={form.dataCategory}
                onChange={e => setForm(f => ({ ...f, dataCategory: e.target.value }))}
                required
                fullWidth
                disabled={saving}
                helperText="فترة الاحتفاظ تُحدَّد تلقائياً"
              >
                {DATA_CATEGORIES.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="الأساس القانوني"
                value={form.legalBasis}
                onChange={e => setForm(f => ({ ...f, legalBasis: e.target.value }))}
                required
                fullWidth
                disabled={saving}
                helperText="مادة 5 من PDPL"
              >
                {LEGAL_BASES.map(b => (
                  <MenuItem key={b.value} value={b.value}>
                    {b.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              select
              label="فئة المستلمين"
              value={form.recipientCategory}
              onChange={e => setForm(f => ({ ...f, recipientCategory: e.target.value }))}
              fullWidth
              disabled={saving}
            >
              {RECIPIENT_CATEGORIES.map(r => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Switch
                  checked={form.crossBorderTransfer}
                  onChange={e => setForm(f => ({ ...f, crossBorderTransfer: e.target.checked }))}
                  disabled={saving}
                />
              }
              label="هل البيانات تُنقَل خارج المملكة العربية السعودية؟"
            />
            {form.crossBorderTransfer && (
              <Alert severity="warning">
                نقل البيانات الشخصية خارج المملكة يتطلب ضمانات إضافية وفق PDPL. تأكد من أن الجهة
                المستلمة تستوفي معايير الحماية المكافئة.
              </Alert>
            )}
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
            onClick={handleCreate}
            disabled={saving || formInvalid}
          >
            تسجيل
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
            <span>تفاصيل نشاط المعالجة</span>
            <IconButton aria-label="إغلاق" onClick={() => setDetailOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  الغرض
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {detail.purpose}
                </Typography>
              </Box>
              <Divider />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    فئة البيانات
                  </Typography>
                  <Typography variant="body2">{dataCategoryLabel(detail.dataCategory)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الأساس القانوني (PDPL مادة 5)
                  </Typography>
                  <Typography variant="body2">{legalBasisLabel(detail.legalBasis)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    فئة المستلمين
                  </Typography>
                  <Typography variant="body2">
                    {RECIPIENT_CATEGORIES.find(r => r.value === detail.recipientCategory)?.label ||
                      detail.recipientCategory}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    نقل عبر الحدود
                  </Typography>
                  <Typography variant="body2">
                    {detail.crossBorderTransfer ? 'نعم' : 'لا'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    فترة الاحتفاظ
                  </Typography>
                  <Typography variant="body2">{detail.retentionPeriod || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ التسجيل
                  </Typography>
                  <Typography variant="body2">{fmtDate(detail.createdAt)}</Typography>
                </Grid>
              </Grid>
              {detail.securityMeasures && (
                <Box>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    الإجراءات الأمنية
                  </Typography>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {String(detail.securityMeasures)
                      .split(',')
                      .map((m, i) => (
                        <Chip key={i} size="small" label={m.trim()} variant="outlined" />
                      ))}
                  </Stack>
                </Box>
              )}
              <Alert severity="info">
                هذا السجل غير قابل للتعديل أو الحذف. لتحديث نشاط، أضف سجلاً جديداً.
              </Alert>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
