/**
 * AdminNphiesClaims — /admin/nphies-claims page.
 *
 * Insurance claims management with NPHIES submission + eligibility check.
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
  Autocomplete,
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaidIcon from '@mui/icons-material/Paid';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import api from '../../services/api.client';

const CLAIM_STATUS = [
  { value: 'DRAFT', label: 'مسودّة', color: 'default' },
  { value: 'READY', label: 'جاهزة', color: 'info' },
  { value: 'SUBMITTED', label: 'مُرسَلة', color: 'primary' },
  { value: 'PAID', label: 'مدفوعة', color: 'success' },
  { value: 'DENIED', label: 'مرفوضة', color: 'error' },
  { value: 'CANCELLED', label: 'ملغاة', color: 'default' },
];
const CLAIM_LABELS = CLAIM_STATUS.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});
const CLAIM_COLORS = CLAIM_STATUS.reduce((a, s) => ({ ...a, [s.value]: s.color }), {});

const SUBMISSION_LABELS = {
  NOT_SUBMITTED: 'لم تُرسَل',
  APPROVED: '✓ مقبولة',
  REJECTED: '✗ مرفوضة',
  PENDING_REVIEW: 'قيد المراجعة',
  ERROR: 'خطأ',
};
const SUBMISSION_COLORS = {
  NOT_SUBMITTED: 'default',
  APPROVED: 'success',
  REJECTED: 'error',
  PENDING_REVIEW: 'warning',
  ERROR: 'error',
};

const ELIGIBILITY_LABELS = {
  eligible: 'مؤهَّل',
  not_covered: 'غير مغطى',
  requires_preauth: 'يتطلب تصريح مسبق',
  unknown: 'غير محدّد',
};

const EMPTY_SERVICE = { code: '', description: '', quantity: 1, unitPrice: 0 };
const EMPTY = {
  beneficiary: null,
  memberId: '',
  insurerName: '',
  insurerId: '',
  serviceDate: new Date().toISOString().slice(0, 10),
  diagnosis: [{ code: '', description: '' }],
  services: [EMPTY_SERVICE],
  notes: '',
};

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}
function formatSAR(n) {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(Number(n) || 0);
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

export default function AdminNphiesClaims() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [errMsg, setErrMsg] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [submission, setSubmission] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [eligibilityDialog, setEligibilityDialog] = useState({
    open: false,
    memberId: '',
    insurerId: '',
    running: false,
    result: null,
  });
  const [running, setRunning] = useState({});
  const [beneficiaryOpts, setBeneficiaryOpts] = useState([]);

  const loadOptions = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/beneficiaries?limit=200');
      setBeneficiaryOpts(
        (data?.items || []).map(x => ({
          id: x._id,
          label: `${fullName(x)} (${x.beneficiaryNumber || '—'})`,
        }))
      );
    } catch {
      setBeneficiaryOpts([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/nphies-claims/stats');
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
      if (submission) params.set('submissionStatus', submission);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      const { data } = await api.get(`/admin/nphies-claims?${params.toString()}`);
      setItems(data?.items || []);
      if (data?.pagination) setPagination(p => ({ ...p, ...data.pagination }));
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [q, status, submission, pagination.page, pagination.limit]);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totals = useMemo(() => {
    return form.services.reduce(
      (sum, s) => sum + Number(s.quantity || 0) * Number(s.unitPrice || 0),
      0
    );
  }, [form.services]);

  const openCreate = () => {
    setForm(EMPTY);
    setEditMode(false);
    setFormErr('');
    setDialogOpen(true);
  };

  const openEdit = async claim => {
    try {
      const { data } = await api.get(`/admin/nphies-claims/${claim._id}`);
      const c = data?.data || claim;
      setForm({
        _id: c._id,
        beneficiary: c.beneficiary
          ? { id: c.beneficiary._id || c.beneficiary, label: fullName(c.beneficiary) || '—' }
          : null,
        memberId: c.memberId || '',
        insurerName: c.insurerName || '',
        insurerId: c.insurerId || '',
        serviceDate: c.serviceDate ? new Date(c.serviceDate).toISOString().slice(0, 10) : '',
        diagnosis: c.diagnosis?.length ? c.diagnosis : [{ code: '', description: '' }],
        services: c.services?.length ? c.services : [EMPTY_SERVICE],
        notes: c.notes || '',
      });
      setEditMode(true);
      setFormErr('');
      setDialogOpen(true);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    }
  };

  const submitForm = async () => {
    if (!form.beneficiary?.id) return setFormErr('المستفيد مطلوب');
    if (!form.memberId) return setFormErr('رقم العضوية مطلوب');
    if (!form.serviceDate) return setFormErr('تاريخ الخدمة مطلوب');
    setSaving(true);
    setFormErr('');
    try {
      const payload = {
        beneficiary: form.beneficiary.id,
        memberId: form.memberId,
        insurerName: form.insurerName || undefined,
        insurerId: form.insurerId || undefined,
        serviceDate: form.serviceDate,
        diagnosis: form.diagnosis.filter(d => d.code || d.description),
        services: form.services.filter(s => s.code || s.description),
        notes: form.notes || undefined,
      };
      if (editMode) await api.patch(`/admin/nphies-claims/${form._id}`, payload);
      else await api.post('/admin/nphies-claims', payload);
      setDialogOpen(false);
      loadStats();
      loadList();
    } catch (err) {
      setFormErr(err?.response?.data?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const checkEligibility = async claim => {
    setRunning(r => ({ ...r, [`e:${claim._id}`]: true }));
    try {
      await api.post(`/admin/nphies-claims/${claim._id}/check-eligibility`, {});
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحقق من الأهلية');
    } finally {
      setRunning(r => ({ ...r, [`e:${claim._id}`]: false }));
    }
  };

  const submitClaim = async claim => {
    setRunning(r => ({ ...r, [`s:${claim._id}`]: true }));
    try {
      await api.post(`/admin/nphies-claims/${claim._id}/submit`, {});
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإرسال');
    } finally {
      setRunning(r => ({ ...r, [`s:${claim._id}`]: false }));
    }
  };

  const doCancel = async claim => {
    if (!window.confirm(`إلغاء المطالبة ${claim.claimNumber}؟`)) return;
    try {
      await api.delete(`/admin/nphies-claims/${claim._id}`);
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإلغاء');
    }
  };

  const runEligibility = async () => {
    setEligibilityDialog(d => ({ ...d, running: true, result: null }));
    try {
      const { data } = await api.post('/admin/nphies-claims/eligibility', {
        memberId: eligibilityDialog.memberId,
        insurerId: eligibilityDialog.insurerId,
      });
      setEligibilityDialog(d => ({ ...d, running: false, result: data.result }));
    } catch (err) {
      setEligibilityDialog(d => ({
        ...d,
        running: false,
        result: { status: 'error', message: err?.response?.data?.message || 'فشل' },
      }));
    }
  };

  const addService = () =>
    setForm(f => ({ ...f, services: [...f.services, { ...EMPTY_SERVICE }] }));
  const removeService = i =>
    setForm(f => ({ ...f, services: f.services.filter((_, idx) => idx !== i) }));
  const updateService = (i, k, v) =>
    setForm(f => ({
      ...f,
      services: f.services.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)),
    }));
  const addDiagnosis = () =>
    setForm(f => ({ ...f, diagnosis: [...f.diagnosis, { code: '', description: '' }] }));
  const removeDiagnosis = i =>
    setForm(f => ({ ...f, diagnosis: f.diagnosis.filter((_, idx) => idx !== i) }));
  const updateDiagnosis = (i, k, v) =>
    setForm(f => ({
      ...f,
      diagnosis: f.diagnosis.map((d, idx) => (idx === i ? { ...d, [k]: v } : d)),
    }));

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'إجمالي المطالبات',
        value: stats.total || 0,
        icon: <ReceiptLongIcon />,
        color: 'primary.main',
      },
      {
        label: 'مقبولة',
        value: stats.bySubmission?.APPROVED || 0,
        icon: <PaidIcon />,
        color: 'success.main',
      },
      {
        label: 'مرفوضة',
        value: stats.bySubmission?.REJECTED || 0,
        icon: <MoneyOffIcon />,
        color: 'error.main',
      },
      {
        label: 'قيد المراجعة',
        value: stats.bySubmission?.PENDING_REVIEW || 0,
        icon: <HourglassBottomIcon />,
        color: 'warning.main',
      },
      {
        label: 'مُطالَب هذا الشهر',
        value: formatSAR(stats.thisMonth?.claimed || 0),
        color: 'info.main',
      },
      {
        label: 'مُعتَمد هذا الشهر',
        value: formatSAR(stats.thisMonth?.approved || 0),
        color: 'success.main',
      },
    ];
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            المطالبات التأمينية (NPHIES)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إرسال + تتبّع مطالبات الضمان الصحي التعاوني عبر منصة CCHI.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={() => {
              loadStats();
              loadList();
            }}
          >
            <RefreshIcon />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<VerifiedUserIcon />}
            onClick={() =>
              setEligibilityDialog({
                open: true,
                memberId: '',
                insurerId: '',
                running: false,
                result: null,
              })
            }
          >
            فحص أهلية سريع
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            مطالبة جديدة
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
          <Grid item xs={6} md={2} key={i}>
            <Card>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ color: s.color }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder="رقم المطالبة / رقم العضوية..."
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 240 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select label="الحالة" value={status} onChange={e => setStatus(e.target.value)}>
              <MenuItem value="">الكل</MenuItem>
              {CLAIM_STATUS.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>حالة الإرسال</InputLabel>
            <Select
              label="حالة الإرسال"
              value={submission}
              onChange={e => setSubmission(e.target.value)}
            >
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="NOT_SUBMITTED">لم تُرسَل</MenuItem>
              <MenuItem value="APPROVED">مقبولة</MenuItem>
              <MenuItem value="REJECTED">مرفوضة</MenuItem>
              <MenuItem value="PENDING_REVIEW">قيد المراجعة</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>المطالبة</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>المؤمِّن / العضوية</TableCell>
              <TableCell>تاريخ الخدمة</TableCell>
              <TableCell align="right">المبلغ</TableCell>
              <TableCell>الأهلية</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإرسال</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد مطالبات
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(c => {
              const elig = c.nphies?.eligibility;
              const sub = c.nphies?.submission;
              return (
                <TableRow key={c._id} hover>
                  <TableCell>{c.claimNumber}</TableCell>
                  <TableCell>{fullName(c.beneficiary) || '—'}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{c.insurerName || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.memberId}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatDate(c.serviceDate)}</TableCell>
                  <TableCell align="right">
                    <strong>{formatSAR(c.totalAmount)}</strong>
                    {c.approvedAmount != null && (
                      <Typography variant="caption" color="success.main" display="block">
                        مُعتَمد: {formatSAR(c.approvedAmount)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {elig?.status ? (
                      <Chip
                        size="small"
                        label={ELIGIBILITY_LABELS[elig.status] || elig.status}
                        color={elig.status === 'eligible' ? 'success' : 'default'}
                        variant="outlined"
                      />
                    ) : (
                      <Chip size="small" label="لم يُفحَص" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={CLAIM_LABELS[c.status] || c.status}
                      color={CLAIM_COLORS[c.status] || 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {sub?.status && (
                      <Chip
                        size="small"
                        label={SUBMISSION_LABELS[sub.status] || sub.status}
                        color={SUBMISSION_COLORS[sub.status] || 'default'}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض">
                      <IconButton size="small" onClick={() => setDetail(c)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {c.status !== 'SUBMITTED' && c.status !== 'PAID' && (
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(c)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="فحص الأهلية">
                      <span>
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => checkEligibility(c)}
                          disabled={running[`e:${c._id}`]}
                        >
                          {running[`e:${c._id}`] ? (
                            <CircularProgress size={16} />
                          ) : (
                            <VerifiedUserIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    {(!sub?.status || sub.status === 'NOT_SUBMITTED' || sub.status === 'ERROR') &&
                      c.status !== 'CANCELLED' && (
                        <Tooltip title="إرسال إلى NPHIES">
                          <span>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => submitClaim(c)}
                              disabled={running[`s:${c._id}`]}
                            >
                              {running[`s:${c._id}`] ? (
                                <CircularProgress size={16} />
                              ) : (
                                <CloudUploadIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                    {c.status !== 'CANCELLED' && c.status !== 'PAID' && (
                      <Tooltip title="إلغاء">
                        <IconButton size="small" color="error" onClick={() => doCancel(c)}>
                          <CancelIcon fontSize="small" />
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

      {/* Create/Edit */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{editMode ? 'تعديل المطالبة' : 'مطالبة جديدة'}</DialogTitle>
        <DialogContent dividers>
          {formErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErr}
            </Alert>
          )}
          <Grid container spacing={2}>
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
              <TextField
                fullWidth
                type="date"
                label="تاريخ الخدمة *"
                InputLabelProps={{ shrink: true }}
                value={form.serviceDate}
                onChange={e => setForm(f => ({ ...f, serviceDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="رقم العضوية *"
                value={form.memberId}
                onChange={e => setForm(f => ({ ...f, memberId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="اسم المؤمِّن"
                value={form.insurerName}
                onChange={e => setForm(f => ({ ...f, insurerName: e.target.value }))}
                placeholder="بوبا العربية"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="معرّف المؤمِّن (اختياري)"
                value={form.insurerId}
                onChange={e => setForm(f => ({ ...f, insurerId: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption">التشخيص (ICD-10)</Typography>
              </Divider>
            </Grid>
            {form.diagnosis.map((d, i) => (
              <Grid container spacing={1} key={`d-${i}`} sx={{ mx: 0, mb: 1, px: 2 }}>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="كود (مثال: F84.0)"
                    value={d.code}
                    onChange={e => updateDiagnosis(i, 'code', e.target.value)}
                  />
                </Grid>
                <Grid item xs={7}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="الوصف"
                    value={d.description}
                    onChange={e => updateDiagnosis(i, 'description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={1}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeDiagnosis(i)}
                    disabled={form.diagnosis.length === 1}
                  >
                    ×
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" onClick={addDiagnosis} startIcon={<AddIcon />}>
                تشخيص آخر
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption">الخدمات</Typography>
              </Divider>
            </Grid>
            {form.services.map((s, i) => (
              <Grid container spacing={1} key={`s-${i}`} sx={{ mx: 0, mb: 1, px: 2 }}>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="كود"
                    value={s.code}
                    onChange={e => updateService(i, 'code', e.target.value)}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="الوصف"
                    value={s.description}
                    onChange={e => updateService(i, 'description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="الكمية"
                    value={s.quantity}
                    onChange={e => updateService(i, 'quantity', Number(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    placeholder="السعر"
                    value={s.unitPrice}
                    onChange={e => updateService(i, 'unitPrice', Number(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={1}>
                  <TextField
                    fullWidth
                    size="small"
                    value={formatSAR(Number(s.quantity) * Number(s.unitPrice))}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={1}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeService(i)}
                    disabled={form.services.length === 1}
                  >
                    ×
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Button size="small" onClick={addService} startIcon={<AddIcon />}>
                  خدمة أخرى
                </Button>
                <Typography variant="subtitle2">
                  الإجمالي: <strong>{formatSAR(totals)}</strong>
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
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

      {/* Detail */}
      <Dialog
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تفاصيل المطالبة {detail?.claimNumber}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    المستفيد
                  </Typography>
                  <Typography>{fullName(detail.beneficiary) || '—'}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    المؤمِّن
                  </Typography>
                  <Typography>{detail.insurerName || '—'}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    رقم العضوية
                  </Typography>
                  <Typography>{detail.memberId}</Typography>
                </Grid>
              </Grid>

              {detail.nphies?.eligibility?.status && (
                <Alert
                  severity={detail.nphies.eligibility.status === 'eligible' ? 'success' : 'info'}
                >
                  <strong>الأهلية:</strong> {ELIGIBILITY_LABELS[detail.nphies.eligibility.status]}
                  {detail.nphies.eligibility.message
                    ? ` — ${detail.nphies.eligibility.message}`
                    : ''}
                  {detail.nphies.eligibility.mode
                    ? ` · وضع: ${detail.nphies.eligibility.mode}`
                    : ''}
                </Alert>
              )}

              {detail.nphies?.submission?.status &&
                detail.nphies.submission.status !== 'NOT_SUBMITTED' && (
                  <Alert
                    severity={
                      detail.nphies.submission.status === 'APPROVED'
                        ? 'success'
                        : detail.nphies.submission.status === 'REJECTED'
                          ? 'error'
                          : 'warning'
                    }
                  >
                    <strong>NPHIES:</strong> {SUBMISSION_LABELS[detail.nphies.submission.status]}
                    {detail.nphies.submission.claimReference
                      ? ` · ref: ${detail.nphies.submission.claimReference}`
                      : ''}
                    {detail.nphies.submission.message
                      ? ` · ${detail.nphies.submission.message}`
                      : ''}
                    {detail.nphies.submission.reason ? ` · ${detail.nphies.submission.reason}` : ''}
                  </Alert>
                )}

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>كود</TableCell>
                    <TableCell>الوصف</TableCell>
                    <TableCell align="right">الكمية</TableCell>
                    <TableCell align="right">السعر</TableCell>
                    <TableCell align="right">الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detail.services || []).map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{s.code || '—'}</TableCell>
                      <TableCell>{s.description}</TableCell>
                      <TableCell align="right">{s.quantity}</TableCell>
                      <TableCell align="right">{formatSAR(s.unitPrice)}</TableCell>
                      <TableCell align="right">{formatSAR(s.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>الإجمالي</Typography>
                  <Typography fontWeight="bold">{formatSAR(detail.totalAmount)}</Typography>
                </Stack>
                {detail.approvedAmount != null && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>المُعتَمد من المؤمِّن</Typography>
                    <Typography color="success.main">{formatSAR(detail.approvedAmount)}</Typography>
                  </Stack>
                )}
                {detail.patientShare != null && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography>حصّة المستفيد</Typography>
                    <Typography>{formatSAR(detail.patientShare)}</Typography>
                  </Stack>
                )}
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Quick eligibility */}
      <Dialog
        open={eligibilityDialog.open}
        onClose={() =>
          !eligibilityDialog.running &&
          setEligibilityDialog({
            open: false,
            memberId: '',
            insurerId: '',
            running: false,
            result: null,
          })
        }
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>فحص أهلية سريع</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              autoFocus
              fullWidth
              label="رقم العضوية *"
              value={eligibilityDialog.memberId}
              onChange={e => setEligibilityDialog(d => ({ ...d, memberId: e.target.value }))}
            />
            <TextField
              fullWidth
              label="معرّف المؤمِّن (اختياري)"
              value={eligibilityDialog.insurerId}
              onChange={e => setEligibilityDialog(d => ({ ...d, insurerId: e.target.value }))}
            />
            {eligibilityDialog.result && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Stack direction="row" spacing={1} mb={1}>
                  <Chip
                    label={
                      ELIGIBILITY_LABELS[eligibilityDialog.result.status] ||
                      eligibilityDialog.result.status
                    }
                    color={eligibilityDialog.result.status === 'eligible' ? 'success' : 'warning'}
                  />
                  <Chip label={`وضع: ${eligibilityDialog.result.mode}`} variant="outlined" />
                </Stack>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap' }}
                >
                  {JSON.stringify(eligibilityDialog.result, null, 2)}
                </Typography>
              </Paper>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setEligibilityDialog({
                open: false,
                memberId: '',
                insurerId: '',
                running: false,
                result: null,
              })
            }
            disabled={eligibilityDialog.running}
          >
            إغلاق
          </Button>
          <Button
            variant="contained"
            onClick={runEligibility}
            disabled={eligibilityDialog.running || !eligibilityDialog.memberId}
          >
            {eligibilityDialog.running ? <CircularProgress size={20} /> : 'فحص'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
