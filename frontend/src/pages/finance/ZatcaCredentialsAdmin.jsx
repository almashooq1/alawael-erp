/**
 * ZatcaCredentialsAdmin.jsx — admin UI for the ZatcaCredential table.
 * Each row is one branch's CSID + organisation + invoice-counter state.
 *
 * Backend: /api/admin/zatca-credentials (see
 * backend/routes/zatca-credentials-admin.routes.js).
 *
 * What the UI is for:
 *   • Org-info CRUD (name, VAT, CR, address) — these feed CSR generation.
 *   • Trigger onboarding (with OTP from ZATCA portal) → service mints
 *     compliance CSID server-side.
 *   • Promote compliance → production CSID once compliance check passes.
 *   • Soft-disable / restore credentials.
 *   • Inspect status: isConfigured? isProduction? csidExpiresAt?
 *     last sync time, invoice counter (PIH chain anchor).
 *
 * What the UI is NOT for:
 *   • Editing keys, CSIDs, or secrets directly. Those are server-side.
 *     The backend redacts them to '[REDACTED]' on the way out.
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
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  CloudUpload as OnboardIcon,
  PlayCircle as PromoteIcon,
  VpnKey as KeyIcon,
} from '@mui/icons-material';
import apiClient from '../../services/api.client';
import { useSnackbar } from 'contexts/SnackbarContext';

const TITLE_ID = 'zatca-cred-dialog-title';
const ONBOARD_TITLE_ID = 'zatca-cred-onboard-title';

const EMPTY_FORM = {
  branchId: '',
  branchCode: '',
  organizationName: '',
  organizationNameAr: '',
  vatNumber: '',
  crNumber: '',
  egsSerialNumber: '',
  street: '',
  buildingNumber: '',
  city: '',
  district: '',
  postalCode: '',
  isProduction: false,
  isActive: true,
  notes: '',
};

function fmtDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

export default function ZatcaCredentialsAdmin() {
  const { showSnackbar } = useSnackbar();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [filterQ, setFilterQ] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState(null);

  // Onboard sub-dialog
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardTarget, setOnboardTarget] = useState(null);
  const [otp, setOtp] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [onboardError, setOnboardError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterQ) params.q = filterQ;
      if (!showInactive) params.isActive = true;
      const { data } = await apiClient.get('/admin/zatca-credentials', { params });
      setRows(data.rows || []);
      setTotal(data.total || 0);
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر تحميل بيانات الاعتماد', 'error');
    } finally {
      setLoading(false);
    }
  }, [filterQ, showInactive, showSnackbar]);

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
      branchId: row.branchId || '',
      branchCode: row.branchCode || '',
      organizationName: row.organizationName || '',
      organizationNameAr: row.organizationNameAr || '',
      vatNumber: row.vatNumber || '',
      crNumber: row.crNumber || '',
      egsSerialNumber: row.egsSerialNumber || '',
      street: row.street || '',
      buildingNumber: row.buildingNumber || '',
      city: row.city || '',
      district: row.district || '',
      postalCode: row.postalCode || '',
      isProduction: !!row.isProduction,
      isActive: row.isActive !== false,
      notes: row.notes || '',
    });
    setServerError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setServerError(null);
    setSaving(true);
    try {
      if (editingId) {
        const { branchId: _ignoreBranch, ...rest } = form;
        await apiClient.patch(`/admin/zatca-credentials/${editingId}`, rest);
        showSnackbar('تم تحديث بيانات الاعتماد', 'success');
      } else {
        await apiClient.post('/admin/zatca-credentials', form);
        showSnackbar('تم إنشاء بيانات الاعتماد', 'success');
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
      await apiClient.delete(`/admin/zatca-credentials/${row._id}`);
      showSnackbar('تم تعطيل بيانات الاعتماد', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر التعطيل', 'error');
    }
  };

  const handleRestore = async row => {
    try {
      await apiClient.post(`/admin/zatca-credentials/${row._id}/restore`);
      showSnackbar('تم استعادة بيانات الاعتماد', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر الاستعادة', 'error');
    }
  };

  const openOnboard = row => {
    setOnboardTarget(row);
    setOtp('');
    setOnboardError(null);
    setOnboardOpen(true);
  };

  const submitOnboard = async () => {
    setOnboardError(null);
    setOnboarding(true);
    try {
      await apiClient.post(`/admin/zatca-credentials/${onboardTarget._id}/onboard`, { otp });
      showSnackbar('تم تسجيل بيانات الاعتماد لدى ZATCA', 'success');
      setOnboardOpen(false);
      load();
    } catch (err) {
      setOnboardError(err?.response?.data?.error || err?.message || 'unknown_error');
    } finally {
      setOnboarding(false);
    }
  };

  const handlePromote = async row => {
    try {
      await apiClient.post(`/admin/zatca-credentials/${row._id}/production`);
      showSnackbar('تم الترقية إلى Production CSID', 'success');
      load();
    } catch (err) {
      showSnackbar(err?.response?.data?.error || 'تعذّر الترقية', 'error');
    }
  };

  const formInvalid = !form.branchId || !form.branchCode;

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <KeyIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            بيانات اعتماد ZATCA (CSIDs)
          </Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          إضافة بيانات اعتماد
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        كل فرع يحتاج إلى صف واحد يحتوي بيانات المنشأة (الرقم الضريبي، السجل التجاري، العنوان) +
        شهادات CSID التي تُحضَّر تلقائياً عبر زر "تسجيل لدى ZATCA". لا تظهر المفاتيح الخاصة في
        الواجهة — تبقى على الخادم فقط.
      </Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="بحث..."
            value={filterQ}
            onChange={e => setFilterQ(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <FormControlLabel
            control={
              <Switch checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            }
            label="إظهار المعطّلة"
          />
          <Box sx={{ flex: 1 }} />
          <Chip label={`${total} فرع`} size="small" />
        </Stack>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="جدول بيانات اعتماد ZATCA">
          <TableHead>
            <TableRow>
              <TableCell>كود الفرع</TableCell>
              <TableCell>المنشأة</TableCell>
              <TableCell>VAT</TableCell>
              <TableCell>CR</TableCell>
              <TableCell>CSID</TableCell>
              <TableCell>البيئة</TableCell>
              <TableCell>عداد الفواتير</TableCell>
              <TableCell>آخر مزامنة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="left">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <CircularProgress size={24} aria-label="جاري التحميل" />
                </TableCell>
              </TableRow>
            )}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="text.secondary">
                    لا توجد بيانات اعتماد
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {rows.map(row => (
              <TableRow key={row._id} hover>
                <TableCell>{row.branchCode}</TableCell>
                <TableCell>{row.organizationNameAr || row.organizationName || '—'}</TableCell>
                <TableCell>{row.vatNumber || '—'}</TableCell>
                <TableCell>{row.crNumber || '—'}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.isConfigured ? 'مهيّأ' : 'غير مهيّأ'}
                    color={row.isConfigured ? 'success' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={row.isProduction ? 'إنتاج' : 'تجريبي'}
                    color={row.isProduction ? 'warning' : 'default'}
                    variant={row.isProduction ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell>{row.invoiceCounter ?? 0}</TableCell>
                <TableCell>{fmtDate(row.lastSyncAt)}</TableCell>
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
                      aria-label={`تعديل ${row.branchCode}`}
                      onClick={() => openEdit(row)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تسجيل لدى ZATCA">
                    <IconButton
                      size="small"
                      aria-label={`تسجيل ${row.branchCode} لدى ZATCA`}
                      onClick={() => openOnboard(row)}
                      disabled={!row.isActive}
                    >
                      <OnboardIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ترقية إلى Production">
                    <IconButton
                      size="small"
                      aria-label={`ترقية ${row.branchCode} إلى Production`}
                      onClick={() => handlePromote(row)}
                      disabled={!row.isConfigured}
                    >
                      <PromoteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {row.isActive ? (
                    <Tooltip title="تعطيل">
                      <IconButton
                        size="small"
                        aria-label={`تعطيل ${row.branchCode}`}
                        onClick={() => handleDisable(row)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="استعادة">
                      <IconButton
                        size="small"
                        aria-label={`استعادة ${row.branchCode}`}
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
        maxWidth="md"
        fullWidth
        aria-labelledby={TITLE_ID}
      >
        <DialogTitle id={TITLE_ID} sx={{ fontWeight: 700 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>{editingId ? 'تعديل بيانات الاعتماد' : 'إضافة بيانات اعتماد جديدة'}</span>
            <IconButton aria-label="إغلاق" onClick={() => setDialogOpen(false)} disabled={saving}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="معرّف الفرع (Mongo Id)"
                value={form.branchId}
                onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                required
                fullWidth
                disabled={saving || !!editingId}
                helperText={editingId ? 'لا يمكن تغيير الفرع بعد الإنشاء' : ''}
              />
              <TextField
                label="كود الفرع"
                value={form.branchCode}
                onChange={e => setForm(f => ({ ...f, branchCode: e.target.value }))}
                required
                sx={{ width: 180 }}
                disabled={saving}
              />
            </Stack>
            <Divider>بيانات المنشأة</Divider>
            <Stack direction="row" spacing={2}>
              <TextField
                label="اسم المنشأة (إنجليزي)"
                value={form.organizationName}
                onChange={e => setForm(f => ({ ...f, organizationName: e.target.value }))}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="اسم المنشأة (عربي)"
                value={form.organizationNameAr}
                onChange={e => setForm(f => ({ ...f, organizationNameAr: e.target.value }))}
                fullWidth
                disabled={saving}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="الرقم الضريبي (15 رقم)"
                value={form.vatNumber}
                onChange={e => setForm(f => ({ ...f, vatNumber: e.target.value }))}
                fullWidth
                inputProps={{ maxLength: 15 }}
                disabled={saving}
              />
              <TextField
                label="السجل التجاري"
                value={form.crNumber}
                onChange={e => setForm(f => ({ ...f, crNumber: e.target.value }))}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="EGS Serial"
                value={form.egsSerialNumber}
                onChange={e => setForm(f => ({ ...f, egsSerialNumber: e.target.value }))}
                sx={{ width: 160 }}
                disabled={saving}
              />
            </Stack>
            <Divider>العنوان</Divider>
            <Stack direction="row" spacing={2}>
              <TextField
                label="الشارع"
                value={form.street}
                onChange={e => setForm(f => ({ ...f, street: e.target.value }))}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="رقم المبنى"
                value={form.buildingNumber}
                onChange={e => setForm(f => ({ ...f, buildingNumber: e.target.value }))}
                sx={{ width: 130 }}
                disabled={saving}
              />
              <TextField
                label="الرمز البريدي"
                value={form.postalCode}
                onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
                sx={{ width: 130 }}
                disabled={saving}
              />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField
                label="المدينة"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                fullWidth
                disabled={saving}
              />
              <TextField
                label="الحي"
                value={form.district}
                onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                fullWidth
                disabled={saving}
              />
            </Stack>
            <Divider>الحالة</Divider>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isProduction}
                    onChange={e => setForm(f => ({ ...f, isProduction: e.target.checked }))}
                    disabled={saving}
                  />
                }
                label="بيئة الإنتاج"
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

      {/* ── Onboard sub-dialog ─────────────────────────────────────── */}
      <Dialog
        open={onboardOpen}
        onClose={() => !onboarding && setOnboardOpen(false)}
        maxWidth="xs"
        fullWidth
        aria-labelledby={ONBOARD_TITLE_ID}
      >
        <DialogTitle id={ONBOARD_TITLE_ID} sx={{ fontWeight: 700 }}>
          تسجيل {onboardTarget?.branchCode} لدى ZATCA
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              أدخل OTP الذي ستحصل عليه من بوابة ZATCA. سيتم إنشاء CSR وتوقيعه على الخادم بعد إدخاله.
            </Typography>
            <TextField
              label="OTP"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              autoFocus
              required
              inputProps={{ inputMode: 'numeric' }}
              disabled={onboarding}
            />
            <Box aria-live="polite">
              {onboardError && (
                <Alert severity="error">
                  <Typography variant="body2">{onboardError}</Typography>
                </Alert>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOnboardOpen(false)} disabled={onboarding}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={onboarding ? <CircularProgress size={16} /> : <OnboardIcon />}
            onClick={submitOnboard}
            disabled={onboarding || !otp}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
