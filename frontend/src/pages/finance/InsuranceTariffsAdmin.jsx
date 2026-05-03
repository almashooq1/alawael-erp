/**
 * InsuranceTariffsAdmin.jsx — admin UI for the InsuranceTariff table
 * that drives automatic claim pricing in the session→NPHIES bridge.
 *
 * Backend: /api/admin/insurance-tariffs (see
 * backend/routes/insurance-tariffs-admin.routes.js).
 *
 * Page layout:
 *   • filter row: provider search, CPT search, active/inactive toggle
 *   • table:      provider · providerId · CPT · price · effective from→to · active
 *   • toolbar:    "إضافة تعريفة"
 *   • inline:     edit / soft-delete / restore per row
 *
 * Validation mirrors the backend (provider/cpt/unitPrice required, price ≥ 0,
 * effectiveTo ≥ effectiveFrom). The dialog also surfaces server-side
 * `invalid_date_range` and `missing_field:*` codes back to the user.
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
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  MenuItem,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Search as SearchIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  PriceChange as PriceChangeIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const DIALOG_TITLE_ID = 'tariff-edit-dialog-title';

const EMPTY_FORM = {
  provider: '',
  providerId: '',
  cptCode: '',
  unitPrice: '',
  currency: 'SAR',
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  notes: '',
  isActive: true,
};

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

export default function InsuranceTariffsAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterProvider, setFilterProvider] = useState('');
  const [filterCpt, setFilterCpt] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProvider) params.provider = filterProvider;
      if (filterCpt) params.cptCode = filterCpt;
      if (!showInactive) params.isActive = true;
      const { data } = await apiClient.get('/admin/insurance-tariffs', { params });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل التعريفات', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterProvider, filterCpt, showInactive, showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setServerError(null);
    setDialogOpen(true);
  };

  const openEdit = row => {
    setEditingId(row._id);
    setForm({
      provider: row.provider || '',
      providerId: row.providerId || '',
      cptCode: row.cptCode || '',
      unitPrice: String(row.unitPrice ?? ''),
      currency: row.currency || 'SAR',
      effectiveFrom: row.effectiveFrom ? fmtDate(row.effectiveFrom) : '',
      effectiveTo: row.effectiveTo ? fmtDate(row.effectiveTo) : '',
      notes: row.notes || '',
      isActive: row.isActive !== false,
    });
    setServerError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setServerError(null);
    setSaving(true);
    try {
      const payload = {
        ...form,
        unitPrice: Number(form.unitPrice),
        effectiveTo: form.effectiveTo || null,
        providerId: form.providerId || undefined,
      };
      if (editingId) {
        await apiClient.patch(`/admin/insurance-tariffs/${editingId}`, payload);
        showSnackbar('تم تحديث التعريفة', 'success');
      } else {
        await apiClient.post('/admin/insurance-tariffs', payload);
        showSnackbar('تم إنشاء التعريفة', 'success');
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      setServerError(err?.response?.data?.error || err?.message || 'unknown_error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async row => {
    try {
      await apiClient.delete(`/admin/insurance-tariffs/${row._id}`);
      showSnackbar('تم تعطيل التعريفة', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر التعطيل', 'error');
    }
  };

  const handleRestore = async row => {
    try {
      await apiClient.post(`/admin/insurance-tariffs/${row._id}/restore`);
      showSnackbar('تم استعادة التعريفة', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر الاستعادة', 'error');
    }
  };

  const dateInvalid =
    form.effectiveTo && form.effectiveFrom && form.effectiveTo < form.effectiveFrom;
  const formInvalid =
    !form.provider ||
    !form.cptCode ||
    form.unitPrice === '' ||
    Number(form.unitPrice) < 0 ||
    dateInvalid;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <PriceChangeIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            تعريفات أسعار التأمين (NPHIES)
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة تعريفة
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        تُستخدم هذه التعريفات لتعبئة سعر CPT تلقائياً عند إنشاء مطالبات تأمينية. التعريفات معطّلة
        تظهر فقط عند تفعيل خيار "إظهار المعطّلة".
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="بحث في المزوّد..."
            value={filterProvider}
            onChange={e => setFilterProvider(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.5 }} />,
            }}
            sx={{ minWidth: 200 }}
          />
          <TextField
            size="small"
            placeholder="رمز CPT"
            value={filterCpt}
            onChange={e => setFilterCpt(e.target.value)}
            sx={{ width: 130 }}
          />
          <FormControlLabel
            control={
              <Switch checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            }
            label="إظهار المعطّلة"
          />
          <Box sx={{ flex: 1 }} />
          <Chip label={`${total} تعريفة`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول تعريفات الأسعار">
          <TableHead>
            <TableRow>
              <TableCell>المزوّد</TableCell>
              <TableCell>المعرّف (NPHIES)</TableCell>
              <TableCell>رمز CPT</TableCell>
              <TableCell>السعر</TableCell>
              <TableCell>سارٍ من</TableCell>
              <TableCell>سارٍ إلى</TableCell>
              <TableCell>الحالة</TableCell>
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
                    لا توجد تعريفات تطابق الفلتر
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row._id} hover>
                <TableCell>{row.provider}</TableCell>
                <TableCell>{row.providerId || '—'}</TableCell>
                <TableCell>{row.cptCode}</TableCell>
                <TableCell>
                  <strong>{row.unitPrice}</strong> {row.currency || 'SAR'}
                </TableCell>
                <TableCell>{fmtDate(row.effectiveFrom)}</TableCell>
                <TableCell>{fmtDate(row.effectiveTo)}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.isActive ? 'نشط' : 'معطّل'}
                    color={row.isActive ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell align="left">
                  <Tooltip title="تعديل">
                    <IconButton
                      size="small"
                      aria-label={`تعديل تعريفة ${row.provider} ${row.cptCode}`}
                      onClick={() => openEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {row.isActive ? (
                    <Tooltip title="تعطيل">
                      <IconButton
                        size="small"
                        aria-label={`تعطيل تعريفة ${row.provider} ${row.cptCode}`}
                        onClick={() => handleDisable(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="استعادة">
                      <IconButton
                        size="small"
                        aria-label={`استعادة تعريفة ${row.provider} ${row.cptCode}`}
                        onClick={() => handleRestore(row)}
                      >
                        <RestoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ── Edit/Create dialog ─────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby={DIALOG_TITLE_ID}
      >
        <DialogTitle id={DIALOG_TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>{editingId ? 'تعديل التعريفة' : 'إضافة تعريفة جديدة'}</span>
            <IconButton aria-label="إغلاق" onClick={() => setDialogOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="المزوّد (شركة التأمين)"
              value={form.provider}
              onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              label="معرّف NPHIES (اختياري)"
              value={form.providerId}
              onChange={e => setForm(f => ({ ...f, providerId: e.target.value }))}
              fullWidth
              helperText="يُستخدم لمطابقة دقيقة عند البحث"
              disabled={saving}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="رمز CPT"
                value={form.cptCode}
                onChange={e => setForm(f => ({ ...f, cptCode: e.target.value }))}
                required
                sx={{ width: 160 }}
                disabled={saving}
              />
              <TextField
                label="السعر للوحدة"
                type="number"
                value={form.unitPrice}
                onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))}
                required
                fullWidth
                inputProps={{ min: 0, step: 0.01 }}
                disabled={saving}
              />
              <TextField
                select
                label="العملة"
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                sx={{ width: 110 }}
                disabled={saving}
              >
                <MenuItem value="SAR">SAR</MenuItem>
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
              </TextField>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="سارٍ من"
                type="date"
                value={form.effectiveFrom}
                onChange={e => setForm(f => ({ ...f, effectiveFrom: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="سارٍ إلى (اختياري)"
                type="date"
                value={form.effectiveTo}
                onChange={e => setForm(f => ({ ...f, effectiveTo: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={!!dateInvalid}
                helperText={
                  dateInvalid ? 'يجب أن يكون بعد "سارٍ من"' : 'اتركه فارغاً للسريان غير محدود'
                }
                disabled={saving}
              />
            </Stack>
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              multiline
              rows={2}
              fullWidth
              disabled={saving}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  disabled={saving}
                />
              }
              label="مفعّل"
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
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving || formInvalid}
          >
            {editingId ? 'حفظ التعديلات' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
