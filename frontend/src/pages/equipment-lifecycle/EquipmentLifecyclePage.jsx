/**
 * EquipmentLifecyclePage — دورة حياة المعدات والأجهزة
 *
 * Single section (no tabs): equipmentLifecycleAPI
 * KPI Dashboard + full CRUD table
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Button,
  IconButton,
  Stack,
  LinearProgress,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Build as BuildIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as OkIcon,
  Warning as WarnIcon,
  Error as ErrIcon,
  EventRepeat as NextServiceIcon,
} from '@mui/icons-material';
import { equipmentLifecycleAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#33691e';
const BG = '#f9fbe7';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? _fmtDate(d) : '—');
const daysUntil = d => {
  if (!d) return null;
  return Math.ceil((new Date(d) - Date.now()) / 86400000);
};

const MAINT_STATUS_MAP = {
  good: { label: 'جيد', color: 'success' },
  maintenance_due: { label: 'صيانة مستحقة', color: 'warning' },
  under_maintenance: { label: 'في الصيانة', color: 'info' },
  out_of_service: { label: 'خارج الخدمة', color: 'error' },
  retired: { label: 'متقاعد', color: 'default' },
};
const chip = (s, map) => {
  const cfg = map?.[s] || { label: s || '—', color: 'default' };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

/* ── KPI Card ───────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card variant="outlined" sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}18`, color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.disabled">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── form fields ────────────────────────────────────────── */
const FORM_FIELDS = [
  { key: 'equipmentName', label: 'اسم الجهاز / المعدة *' },
  { key: 'serialNumber', label: 'الرقم التسلسلي' },
  { key: 'manufacturer', label: 'الشركة المصنّعة' },
  { key: 'model', label: 'الموديل' },
  {
    key: 'category',
    label: 'التصنيف',
    options: [
      { value: 'rehabilitation', label: 'أجهزة تأهيل' },
      { value: 'diagnostic', label: 'أجهزة تشخيص' },
      { value: 'mobility', label: 'وسائل حركة' },
      { value: 'ar_vr', label: 'واقع افتراضي/معزز' },
      { value: 'sensory', label: 'أجهزة حسية' },
      { value: 'communication', label: 'أجهزة تواصل' },
      { value: 'furniture', label: 'أثاث طبي' },
      { value: 'it', label: 'تقنية المعلومات' },
      { value: 'other', label: 'أخرى' },
    ],
    default: 'rehabilitation',
  },
  { key: 'purchaseDate', label: 'تاريخ الشراء', type: 'date' },
  { key: 'warrantyExpiryDate', label: 'انتهاء الضمان', type: 'date' },
  { key: 'nextServiceDate', label: 'تاريخ الصيانة القادمة', type: 'date' },
  { key: 'location', label: 'الموقع / القسم' },
  { key: 'assignedTo', label: 'المسؤول / مستخدم الجهاز' },
  {
    key: 'maintenanceStatus',
    label: 'حالة الصيانة',
    options: [
      { value: 'good', label: 'جيد' },
      { value: 'maintenance_due', label: 'صيانة مستحقة' },
      { value: 'under_maintenance', label: 'في الصيانة' },
      { value: 'out_of_service', label: 'خارج الخدمة' },
      { value: 'retired', label: 'متقاعد' },
    ],
    default: 'good',
  },
  { key: 'purchaseCost', label: 'تكلفة الشراء (ر.س)', type: 'number' },
  { key: 'notes', label: 'ملاحظات', multiline: true },
];

/* ══════════════════════════════════════════════════════════ */
export default function EquipmentLifecyclePage() {
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [dialog, setDialog] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.allSettled([
        equipmentLifecycleAPI.getDashboard({}),
        equipmentLifecycleAPI.list({ limit: 100 }),
      ]);
      if (dash.status === 'fulfilled')
        setDashboard(dash.value?.data?.data || dash.value?.data || null);
      if (list.status === 'fulfilled') {
        const d = list.value?.data?.data || list.value?.data;
        setItems(Array.isArray(d) ? d : d?.items || []);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    const empty = {};
    FORM_FIELDS.forEach(f => {
      empty[f.key] = f.default || '';
    });
    setForm(empty);
    setDialog(true);
  };
  const openEdit = item => {
    setEditTarget(item);
    const pre = {};
    FORM_FIELDS.forEach(f => {
      pre[f.key] = item[f.key] ?? f.default ?? '';
    });
    setForm(pre);
    setDialog(true);
  };
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      editTarget
        ? await equipmentLifecycleAPI.update(editTarget._id, form)
        : await equipmentLifecycleAPI.create(form);
      setSnack({
        open: true,
        msg: editTarget ? 'تم التحديث' : 'تم إضافة الجهاز',
        severity: 'success',
      });
      setDialog(false);
      load();
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  /* KPIs */
  const kpis = [
    {
      label: 'إجمالي المعدات',
      value: dashboard?.total ?? items.length,
      icon: <BuildIcon />,
      color: PRIMARY,
    },
    {
      label: 'في الخدمة',
      value: dashboard?.activeCount ?? items.filter(i => i.maintenanceStatus === 'good').length,
      icon: <OkIcon />,
      color: '#2e7d32',
    },
    {
      label: 'صيانة مستحقة',
      value:
        dashboard?.maintenanceDueCount ??
        items.filter(i => i.maintenanceStatus === 'maintenance_due').length,
      icon: <WarnIcon />,
      color: '#e65100',
    },
    {
      label: 'خارج الخدمة',
      value:
        dashboard?.outOfServiceCount ??
        items.filter(i => i.maintenanceStatus === 'out_of_service').length,
      icon: <ErrIcon />,
      color: '#c62828',
    },
  ];

  /* columns */
  const columns = [
    { key: 'equipmentName', label: 'اسم الجهاز' },
    { key: 'category', label: 'التصنيف' },
    { key: 'serialNumber', label: 'الرقم التسلسلي' },
    { key: 'location', label: 'الموقع' },
    {
      key: 'maintenanceStatus',
      label: 'حالة الصيانة',
      render: item => chip(item.maintenanceStatus, MAINT_STATUS_MAP),
    },
    {
      key: 'nextServiceDate',
      label: 'الصيانة القادمة',
      render: item => {
        const days = daysUntil(item.nextServiceDate);
        const color =
          days === null
            ? 'text.secondary'
            : days < 0
              ? '#c62828'
              : days < 30
                ? '#e65100'
                : '#2e7d32';
        return (
          <Tooltip
            title={days !== null ? `${days < 0 ? 'متأخرة ' + Math.abs(days) : days} يوم` : ''}
          >
            <Typography variant="body2" sx={{ color }}>
              {fmt(item.nextServiceDate)}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'warrantyExpiryDate',
      label: 'الضمان ينتهي',
      render: item => {
        const days = daysUntil(item.warrantyExpiryDate);
        const color = days !== null && days < 90 ? '#e65100' : 'text.secondary';
        return (
          <Typography variant="body2" sx={{ color }}>
            {fmt(item.warrantyExpiryDate)}
          </Typography>
        );
      },
    },
    { key: 'purchaseDate', label: 'تاريخ الشراء', render: item => fmt(item.purchaseDate) },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <BuildIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            دورة حياة المعدات والأجهزة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تسجيل الأجهزة · جدولة الصيانة · تتبع الضمان · إدارة دورة الحياة الكاملة
          </Typography>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KpiCard {...k} />
          </Grid>
        ))}
      </Grid>

      {/* Upcoming maintenance alert */}
      {items.filter(it => {
        const d = daysUntil(it.nextServiceDate);
        return d !== null && d >= 0 && d <= 30;
      }).length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<NextServiceIcon />}>
          {
            items.filter(it => {
              const d = daysUntil(it.nextServiceDate);
              return d !== null && d >= 0 && d <= 30;
            }).length
          }{' '}
          أجهزة تحتاج صيانة خلال 30 يوماً
        </Alert>
      )}

      {/* Table header actions */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: PRIMARY, opacity: 0.85 } }}
        >
          إضافة جهاز
        </Button>
        <IconButton size="small" onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: `${PRIMARY}0a` }}>
              {columns.map(c => (
                <TableCell key={c.key}>{c.label}</TableCell>
              ))}
              <TableCell align="center">تعديل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد أجهزة مسجّلة</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, i) => (
                <TableRow key={item._id || i} hover>
                  {columns.map(c => (
                    <TableCell key={c.key}>
                      {c.render ? (
                        c.render(item)
                      ) : (
                        <Typography variant="body2">{item[c.key] ?? '—'}</Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" sx={{ color: PRIMARY }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${PRIMARY}12`, color: PRIMARY }}>
          {editTarget ? 'تعديل بيانات الجهاز' : 'إضافة جهاز جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {FORM_FIELDS.map(f =>
              f.options ? (
                <TextField
                  key={f.key}
                  select
                  fullWidth
                  size="small"
                  label={f.label}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                >
                  {f.options.map(o => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  key={f.key}
                  fullWidth
                  size="small"
                  label={f.label}
                  type={f.type || 'text'}
                  multiline={f.multiline}
                  rows={f.multiline ? 2 : undefined}
                  InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
                  value={form[f.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                />
              )
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={handleSubmit}
            sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: PRIMARY, opacity: 0.85 } }}
          >
            {submitting ? 'جاري...' : editTarget ? 'حفظ' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
