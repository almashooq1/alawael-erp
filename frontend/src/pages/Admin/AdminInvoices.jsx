/**
 * AdminInvoices — /admin/invoices page.
 *
 * Finance-facing invoice CRUD with ZATCA Phase-2 envelope generation.
 * VAT 15% default, line-item editor, QR code display on issue.
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
  Divider,
  LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PaidIcon from '@mui/icons-material/Paid';
import CancelIcon from '@mui/icons-material/Cancel';
import QrCodeIcon from '@mui/icons-material/QrCode';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningIcon from '@mui/icons-material/Warning';
import api from '../../services/api.client';
import BeneficiaryTypeahead from '../../components/BeneficiaryTypeahead';

const STATUS_OPTIONS = [
  { value: '', label: 'كل الحالات' },
  { value: 'DRAFT', label: 'مسودّة', color: 'default' },
  { value: 'ISSUED', label: 'صادرة', color: 'info' },
  { value: 'PARTIALLY_PAID', label: 'مدفوعة جزئياً', color: 'warning' },
  { value: 'PAID', label: 'مدفوعة', color: 'success' },
  { value: 'OVERDUE', label: 'متأخرة', color: 'error' },
  { value: 'CANCELLED', label: 'ملغاة', color: 'default' },
];
const STATUS_LABELS = STATUS_OPTIONS.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});
const STATUS_COLORS = STATUS_OPTIONS.reduce(
  (a, s) => ({ ...a, [s.value]: s.color || 'default' }),
  {}
);

const EMPTY_ITEM = { description: '', quantity: 1, unitPrice: 0 };
const EMPTY = {
  beneficiary: null,
  invoiceNumber: '',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  items: [EMPTY_ITEM],
  discount: 0,
  taxRate: 0.15,
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

export default function AdminInvoices() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailInvoice, setDetailInvoice] = useState(null);
  const [issueDialog, setIssueDialog] = useState({ open: false, invoice: null, buyerVat: '' });
  const [payDialog, setPayDialog] = useState({ open: false, invoice: null, method: 'CASH' });

  // Beneficiary options are now fetched on-demand by BeneficiaryTypeahead
  // (debounced server-side search). Removed the eager load of up to 200
  // records which broke silently at branches with >200 kids.

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/invoices/stats');
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
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      const { data } = await api.get(`/admin/invoices?${params.toString()}`);
      setItems(data?.items || []);
      if (data?.pagination) setPagination(p => ({ ...p, ...data.pagination }));
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [q, status, from, to, pagination.page, pagination.limit]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const totals = useMemo(() => {
    const subTotal = form.items.reduce(
      (s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0),
      0
    );
    const discount = Number(form.discount || 0);
    const afterDisc = Math.max(0, subTotal - discount);
    const taxAmount = Math.round(afterDisc * Number(form.taxRate || 0) * 100) / 100;
    const totalAmount = Math.round((afterDisc + taxAmount) * 100) / 100;
    return { subTotal, discount, taxAmount, totalAmount };
  }, [form.items, form.discount, form.taxRate]);

  const openCreate = () => {
    setForm(EMPTY);
    setEditMode(false);
    setFormErr('');
    setDialogOpen(true);
  };

  const openEdit = async inv => {
    try {
      const { data } = await api.get(`/admin/invoices/${inv._id}`);
      const i = data?.data || inv;
      setForm({
        _id: i._id,
        beneficiary: i.beneficiary
          ? {
              id: i.beneficiary._id || i.beneficiary,
              label: fullName(i.beneficiary) || '—',
            }
          : null,
        invoiceNumber: i.invoiceNumber || '',
        issueDate: i.issueDate ? new Date(i.issueDate).toISOString().slice(0, 10) : '',
        dueDate: i.dueDate ? new Date(i.dueDate).toISOString().slice(0, 10) : '',
        items: i.items?.length ? i.items : [EMPTY_ITEM],
        discount: i.discount || 0,
        taxRate:
          i.taxAmount && i.subTotal ? i.taxAmount / Math.max(1, i.subTotal - i.discount) : 0.15,
        notes: i.notes || '',
      });
      setEditMode(true);
      setFormErr('');
      setDialogOpen(true);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    }
  };

  const submitForm = async () => {
    setFormErr('');
    if (!form.beneficiary?.id) {
      setFormErr('المستفيد مطلوب');
      return;
    }
    if (!form.items?.length) {
      setFormErr('أضف بنداً واحداً على الأقل');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        beneficiary: form.beneficiary.id,
        invoiceNumber: form.invoiceNumber || undefined,
        issueDate: form.issueDate || undefined,
        dueDate: form.dueDate || undefined,
        items: form.items,
        discount: Number(form.discount) || 0,
        taxRate: Number(form.taxRate) || 0,
        notes: form.notes || undefined,
      };
      if (editMode) {
        await api.patch(`/admin/invoices/${form._id}`, payload);
      } else {
        await api.post('/admin/invoices', payload);
      }
      setDialogOpen(false);
      loadStats();
      loadList();
    } catch (err) {
      setFormErr(err?.response?.data?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const submitIssue = async () => {
    const { invoice, buyerVat } = issueDialog;
    try {
      await api.post(`/admin/invoices/${invoice._id}/issue`, {
        buyerVatNumber: buyerVat,
      });
      setIssueDialog({ open: false, invoice: null, buyerVat: '' });
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإصدار');
    }
  };

  const submitPay = async () => {
    const { invoice, method } = payDialog;
    try {
      await api.post(`/admin/invoices/${invoice._id}/pay`, { paymentMethod: method });
      setPayDialog({ open: false, invoice: null, method: 'CASH' });
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل تسجيل الدفع');
    }
  };

  const doCancel = async inv => {
    const reason = window.prompt('سبب الإلغاء؟', '');
    if (reason === null) return;
    try {
      await api.post(`/admin/invoices/${inv._id}/cancel`, { reason });
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإلغاء');
    }
  };

  const [submitting, setSubmitting] = useState({});
  const [lastSubmitResult, setLastSubmitResult] = useState({});

  const submitToZatca = async inv => {
    setSubmitting(s => ({ ...s, [inv._id]: true }));
    setLastSubmitResult(r => ({ ...r, [inv._id]: null }));
    try {
      const { data } = await api.post(`/admin/invoices/${inv._id}/submit-to-zatca`, {});
      setLastSubmitResult(r => ({ ...r, [inv._id]: data.result }));
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الإرسال إلى ZATCA');
      setLastSubmitResult(r => ({
        ...r,
        [inv._id]: {
          status: 'ERROR',
          errors: [{ message: err?.response?.data?.message || err?.message }],
        },
      }));
    } finally {
      setSubmitting(s => ({ ...s, [inv._id]: false }));
    }
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, EMPTY_ITEM] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, key, val) =>
    setForm(f => ({
      ...f,
      items: f.items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)),
    }));

  const statCards = useMemo(() => {
    if (!stats) return [];
    const bs = stats.byStatus || {};
    return [
      {
        label: 'إيراد هذا الشهر',
        value: formatSAR(stats.revenueThisMonth || 0),
        icon: <AttachMoneyIcon />,
        color: 'success.main',
      },
      {
        label: 'فواتير صادرة',
        value: bs.ISSUED || 0,
        icon: <ReceiptIcon />,
        color: 'info.main',
      },
      {
        label: 'متأخرة',
        value: stats.overdueCount || 0,
        icon: <WarningIcon />,
        color: 'error.main',
      },
      {
        label: 'مُعلَّقة (غير مدفوعة)',
        value: formatSAR(stats.pendingAmount || 0),
        icon: <PaidIcon />,
        color: 'warning.main',
      },
    ];
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            الفواتير (ZATCA Phase-2)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة الفواتير + توليد مغلَّف ZATCA (UUID, Hash, QR TLV) عند الإصدار.
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            فاتورة جديدة
          </Button>
        </Stack>
      </Stack>

      {errMsg && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErrMsg('')}>
          {errMsg}
        </Alert>
      )}

      {Object.entries(lastSubmitResult).map(([invId, r]) =>
        r ? (
          <Alert
            key={invId}
            severity={
              r.status === 'ACCEPTED' || r.status === 'REPORTED'
                ? 'success'
                : r.status === 'REJECTED'
                  ? 'error'
                  : 'warning'
            }
            sx={{ mb: 1 }}
            onClose={() => setLastSubmitResult(x => ({ ...x, [invId]: null }))}
          >
            <strong>إرسال ZATCA:</strong>{' '}
            {r.status === 'ACCEPTED'
              ? `قُبلت (Clearance) · وضع ${r.mode}${r.latencyMs ? ` · ${r.latencyMs}ms` : ''}${r.zatcaReference ? ` · ref ${r.zatcaReference}` : ''}`
              : r.status === 'REPORTED'
                ? `تم الإبلاغ (Reporting) · وضع ${r.mode}${r.latencyMs ? ` · ${r.latencyMs}ms` : ''}`
                : r.status === 'REJECTED'
                  ? `رُفضت — ${(r.errors || []).map(e => `[${e.code || 'ERR'}] ${e.message}`).join(' | ')}`
                  : `خطأ — ${(r.errors || []).map(e => e.message).join(' | ')}`}
          </Alert>
        ) : null
      )}

      <Grid container spacing={2} mb={3}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" sx={{ color: s.color }}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: s.color, fontSize: 40 }}>{s.icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="رقم الفاتورة..."
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select label="الحالة" value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="date"
            label="من"
            InputLabelProps={{ shrink: true }}
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="إلى"
            InputLabelProps={{ shrink: true }}
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>رقم الفاتورة</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>تاريخ الإصدار</TableCell>
              <TableCell>الاستحقاق</TableCell>
              <TableCell align="right">المبلغ</TableCell>
              <TableCell>ZATCA</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد فواتير
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(inv => (
              <TableRow key={inv._id} hover>
                <TableCell>{inv.invoiceNumber}</TableCell>
                <TableCell>{fullName(inv.beneficiary) || '—'}</TableCell>
                <TableCell>{formatDate(inv.issueDate)}</TableCell>
                <TableCell>{formatDate(inv.dueDate)}</TableCell>
                <TableCell align="right">
                  <strong>{formatSAR(inv.totalAmount)}</strong>
                </TableCell>
                <TableCell>
                  {inv.zatca?.uuid ? (
                    <Stack spacing={0.3}>
                      <Chip
                        size="small"
                        icon={<QrCodeIcon fontSize="small" />}
                        label={`ICV ${inv.zatca.icv}`}
                        color="info"
                      />
                      {inv.zatca.zatcaStatus && inv.zatca.zatcaStatus !== 'NOT_SUBMITTED' && (
                        <Chip
                          size="small"
                          label={
                            inv.zatca.zatcaStatus === 'ACCEPTED'
                              ? '✓ مقبولة ZATCA'
                              : inv.zatca.zatcaStatus === 'SUBMITTED'
                                ? 'مُرسَلة ZATCA'
                                : inv.zatca.zatcaStatus === 'REJECTED'
                                  ? '✗ مرفوضة'
                                  : inv.zatca.zatcaStatus
                          }
                          color={
                            inv.zatca.zatcaStatus === 'ACCEPTED'
                              ? 'success'
                              : inv.zatca.zatcaStatus === 'SUBMITTED'
                                ? 'primary'
                                : inv.zatca.zatcaStatus === 'REJECTED'
                                  ? 'error'
                                  : 'default'
                          }
                          sx={{ fontSize: 10 }}
                        />
                      )}
                    </Stack>
                  ) : (
                    <Chip size="small" label="لم يُصدر" variant="outlined" />
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[inv.status] || inv.status}
                    color={STATUS_COLORS[inv.status] || 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => setDetailInvoice(inv)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {inv.status === 'DRAFT' && (
                    <>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(inv)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="إصدار + توليد ZATCA">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setIssueDialog({ open: true, invoice: inv, buyerVat: '' })}
                        >
                          <DoneAllIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  {['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) && (
                    <Tooltip title="تسجيل دفع">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={() => setPayDialog({ open: true, invoice: inv, method: 'CASH' })}
                      >
                        <PaidIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {inv.zatca?.uuid &&
                    (!inv.zatca.zatcaStatus ||
                      ['NOT_SUBMITTED', 'REJECTED'].includes(inv.zatca.zatcaStatus)) && (
                      <Tooltip title="إرسال إلى ZATCA (Fatoora)">
                        <span>
                          <IconButton
                            size="small"
                            color="info"
                            disabled={submitting[inv._id]}
                            onClick={() => submitToZatca(inv)}
                          >
                            {submitting[inv._id] ? (
                              <CircularProgress size={16} />
                            ) : (
                              <CloudUploadIcon fontSize="small" />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  {inv.status !== 'CANCELLED' && inv.status !== 'PAID' && (
                    <Tooltip title="إلغاء">
                      <IconButton size="small" color="error" onClick={() => doCancel(inv)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          p={2}
          borderTop={1}
          borderColor="divider"
        >
          <Typography variant="body2" color="text.secondary">
            {pagination.total} فاتورة · صفحة {pagination.page} من {pagination.pages || 1}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              السابق
            </Button>
            <Button
              size="small"
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              التالي
            </Button>
          </Stack>
        </Stack>
      </TableContainer>

      {/* Create / Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{editMode ? 'تعديل الفاتورة' : 'فاتورة جديدة'}</DialogTitle>
        <DialogContent dividers>
          {formErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErr}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <BeneficiaryTypeahead
                label="المستفيد *"
                required
                value={
                  form.beneficiary
                    ? {
                        _id: form.beneficiary.id,
                        name_ar: form.beneficiary.label,
                        beneficiaryNumber: form.beneficiary.beneficiaryNumber,
                      }
                    : null
                }
                onChange={v =>
                  setForm(f => ({
                    ...f,
                    beneficiary: v
                      ? {
                          id: v._id,
                          label: v.name_ar || v.name_en || v.beneficiaryNumber || '—',
                          beneficiaryNumber: v.beneficiaryNumber,
                        }
                      : null,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم الفاتورة (تلقائي إذا فارغ)"
                value={form.invoiceNumber}
                onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
                disabled={editMode}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الإصدار"
                InputLabelProps={{ shrink: true }}
                value={form.issueDate}
                onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الاستحقاق"
                InputLabelProps={{ shrink: true }}
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="نسبة الضريبة"
                inputProps={{ step: 0.01, min: 0, max: 1 }}
                value={form.taxRate}
                onChange={e => setForm(f => ({ ...f, taxRate: Number(e.target.value) || 0 }))}
                helperText="15% = 0.15"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption">بنود الفاتورة</Typography>
              </Divider>
            </Grid>
            {form.items.map((it, i) => (
              <Grid container spacing={1} key={i} sx={{ mx: 0, mb: 1, px: 2 }}>
                <Grid item xs={12} md={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="الوصف"
                    value={it.description}
                    onChange={e => updateItem(i, 'description', e.target.value)}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="الكمية"
                    value={it.quantity}
                    onChange={e => updateItem(i, 'quantity', Number(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="سعر الوحدة"
                    value={it.unitPrice}
                    onChange={e => updateItem(i, 'unitPrice', Number(e.target.value) || 0)}
                  />
                </Grid>
                <Grid item xs={8} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="الإجمالي"
                    value={formatSAR(Number(it.quantity) * Number(it.unitPrice))}
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={4} md={1}>
                  <IconButton
                    color="error"
                    size="small"
                    onClick={() => removeItem(i)}
                    disabled={form.items.length === 1}
                  >
                    ×
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Button size="small" onClick={addItem} startIcon={<AddIcon />}>
                إضافة بند
              </Button>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="الخصم"
                value={form.discount}
                onChange={e => setForm(f => ({ ...f, discount: Number(e.target.value) || 0 }))}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      الإجمالي قبل الضريبة
                    </Typography>
                    <Typography>{formatSAR(totals.subTotal)}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      الضريبة
                    </Typography>
                    <Typography>{formatSAR(totals.taxAmount)}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption" color="text.secondary">
                      الإجمالي شامل الضريبة
                    </Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">
                      {formatSAR(totals.totalAmount)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
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
            {saving ? <CircularProgress size={20} /> : editMode ? 'حفظ' : 'إنشاء مسودّة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail dialog */}
      <Dialog
        open={Boolean(detailInvoice)}
        onClose={() => setDetailInvoice(null)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تفاصيل الفاتورة {detailInvoice?.invoiceNumber}</DialogTitle>
        <DialogContent dividers>
          {detailInvoice && (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    المستفيد
                  </Typography>
                  <Typography>{fullName(detailInvoice.beneficiary) || '—'}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    الإصدار
                  </Typography>
                  <Typography>{formatDate(detailInvoice.issueDate)}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary">
                    الاستحقاق
                  </Typography>
                  <Typography>{formatDate(detailInvoice.dueDate)}</Typography>
                </Grid>
              </Grid>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الوصف</TableCell>
                    <TableCell align="right">الكمية</TableCell>
                    <TableCell align="right">سعر الوحدة</TableCell>
                    <TableCell align="right">الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(detailInvoice.items || []).map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell align="right">{it.quantity}</TableCell>
                      <TableCell align="right">{formatSAR(it.unitPrice)}</TableCell>
                      <TableCell align="right">{formatSAR(it.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>الإجمالي قبل الضريبة</Typography>
                  <Typography>{formatSAR(detailInvoice.subTotal)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>الخصم</Typography>
                  <Typography>- {formatSAR(detailInvoice.discount)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography>الضريبة (15%)</Typography>
                  <Typography>{formatSAR(detailInvoice.taxAmount)}</Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight="bold">الإجمالي</Typography>
                  <Typography fontWeight="bold" color="primary.main">
                    {formatSAR(detailInvoice.totalAmount)}
                  </Typography>
                </Stack>
              </Paper>

              {detailInvoice.zatca?.uuid && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" mb={1}>
                    <QrCodeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                    مغلَّف ZATCA Phase-2
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">
                        UUID
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                        {detailInvoice.zatca.uuid}
                      </Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        ICV
                      </Typography>
                      <Typography>{detailInvoice.zatca.icv}</Typography>
                    </Grid>
                    <Grid item xs={3}>
                      <Typography variant="caption" color="text.secondary">
                        النوع
                      </Typography>
                      <Typography>{detailInvoice.zatca.invoiceType}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        Invoice Hash
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ fontFamily: 'monospace', fontSize: 10, wordBreak: 'break-all' }}
                      >
                        {detailInvoice.zatca.invoiceHash}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        QR TLV (base64)
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: 10,
                          wordBreak: 'break-all',
                          bgcolor: 'background.paper',
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        {detailInvoice.zatca.qrCode}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailInvoice(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Issue (ZATCA) dialog */}
      <Dialog
        open={issueDialog.open}
        onClose={() => setIssueDialog({ open: false, invoice: null, buyerVat: '' })}
        dir="rtl"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إصدار الفاتورة + توليد مغلَّف ZATCA</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            سيتم حساب UUID، Invoice Hash، ICV، ورمز QR (TLV base64) وربطها بسلسلة الفواتير السابقة
            (PIH).
          </Alert>
          <TextField
            fullWidth
            label="الرقم الضريبي للمشتري (اختياري — لفواتير B2B)"
            value={issueDialog.buyerVat}
            onChange={e => setIssueDialog(d => ({ ...d, buyerVat: e.target.value }))}
            helperText="إذا تُرك فارغاً → فاتورة مبسَّطة (B2C). إذا مُلئ → فاتورة ضريبية قياسية (B2B)."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIssueDialog({ open: false, invoice: null, buyerVat: '' })}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={submitIssue}>
            إصدار
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pay dialog */}
      <Dialog
        open={payDialog.open}
        onClose={() => setPayDialog({ open: false, invoice: null, method: 'CASH' })}
        dir="rtl"
      >
        <DialogTitle>تسجيل دفعة</DialogTitle>
        <DialogContent>
          <FormControl fullWidth>
            <InputLabel>طريقة الدفع</InputLabel>
            <Select
              label="طريقة الدفع"
              value={payDialog.method}
              onChange={e => setPayDialog(d => ({ ...d, method: e.target.value }))}
            >
              <MenuItem value="CASH">نقدي</MenuItem>
              <MenuItem value="CARD">بطاقة</MenuItem>
              <MenuItem value="TRANSFER">تحويل بنكي</MenuItem>
              <MenuItem value="INSURANCE">تأمين</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialog({ open: false, invoice: null, method: 'CASH' })}>
            إلغاء
          </Button>
          <Button variant="contained" color="success" onClick={submitPay}>
            تأكيد الدفع
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
