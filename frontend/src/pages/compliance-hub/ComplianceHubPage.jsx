/**
 * ComplianceHubPage — مركز الامتثال المؤسسي
 *
 * Tabs:
 *  0 — الاعتماد المؤسسي   → accreditationManagerAPI
 *  1 — التفتيش والزيارات   → inspectionTrackerAPI
 *  2 — الامتثال للمعايير   → standardsComplianceAPI
 *  3 — التراخيص            → licensureManagerAPI
 *  4 — الشهادات والاعتمادات → credentialManagerAPI
 */
import React, { useState, useCallback } from 'react';
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
  Tabs,
  Tab,
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
  VerifiedUser as AccredIcon,
  Search as InspectIcon,
  Rule as StandardsIcon,
  CardMembership as LicenseIcon,
  School as CredIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as OkIcon,
  Warning as WarnIcon,
  Error as ErrIcon,
  BarChart as ChartIcon,
  GppMaybe as ComplianceIcon,
} from '@mui/icons-material';
import {
  accreditationManagerAPI,
  inspectionTrackerAPI,
  standardsComplianceAPI,
  licensureManagerAPI,
  credentialManagerAPI,
} from '../../services/ddd';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#4a148c';
const BG = '#f3e5f5';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

const statusChip = (s, map) => {
  const cfg = map[s] || { label: s || '—', color: 'default' };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

const ACCRED_STATUS = {
  active: { label: 'معتمد', color: 'success' },
  pending: { label: 'قيد الانتظار', color: 'warning' },
  expired: { label: 'منتهي', color: 'error' },
  suspended: { label: 'موقوف', color: 'default' },
  'under-review': { label: 'قيد المراجعة', color: 'info' },
};
const INSPECT_STATUS = {
  scheduled: { label: 'مجدول', color: 'info' },
  'in-progress': { label: 'جاري', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
  cancelled: { label: 'ملغي', color: 'default' },
  'follow-up': { label: 'متابعة', color: 'secondary' },
};
const GENERIC_STATUS = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  pending: { label: 'معلق', color: 'warning' },
  expired: { label: 'منتهي', color: 'error' },
  draft: { label: 'مسودة', color: 'default' },
  valid: { label: 'ساري', color: 'success' },
  revoked: { label: 'ملغي', color: 'error' },
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

/* ── Generic Section ─────────────────────────────────────
 *  Reusable panel: dashboard KPIs + table + create dialog
 * ──────────────────────────────────────────────────────── */
function GenericSection({
  api,
  sectionColor,
  kpiFields = [], // [{ key, label, icon }]
  tableColumns = [], // [{ key, label, render? }]
  formFields = [], // [{ key, label, type?, options?, required? }]
  statusMap = GENERIC_STATUS,
}) {
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.allSettled([
        api.getDashboard({}),
        api.list({ limit: 50 }),
      ]);
      if (dash.status === 'fulfilled') {
        setDashboard(dash.value?.data?.data || dash.value?.data || null);
      }
      if (list.status === 'fulfilled') {
        const d = list.value?.data?.data || list.value?.data;
        setItems(Array.isArray(d) ? d : d?.items || []);
      }
      setLoaded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Lazy load when section mounts (parent reveals it via `loaded` flag)
  React.useEffect(() => {
    if (!loaded) load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditTarget(null);
    const empty = {};
    formFields.forEach(f => {
      empty[f.key] = f.default || '';
    });
    setForm(empty);
    setDialogOpen(true);
  };

  const openEdit = item => {
    setEditTarget(item);
    const prefilled = {};
    formFields.forEach(f => {
      prefilled[f.key] = item[f.key] ?? f.default ?? '';
    });
    setForm(prefilled);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (editTarget) {
        await api.update(editTarget._id, form);
        toast('تم التحديث بنجاح');
      } else {
        await api.create(form);
        toast('تم الإنشاء بنجاح');
      }
      setDialogOpen(false);
      load();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const kpis = [
    {
      label: 'الإجمالي',
      value: dashboard?.total ?? items.length,
      icon: <ChartIcon />,
      color: sectionColor,
    },
    ...kpiFields.map(kf => ({
      label: kf.label,
      value: dashboard?.[kf.key] ?? '—',
      icon: kf.icon,
      color: kf.color || sectionColor,
    })),
  ];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {kpis.slice(0, 4).map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KpiCard {...k} />
          </Grid>
        ))}
      </Grid>

      {/* Table header */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: sectionColor, '&:hover': { bgcolor: sectionColor, opacity: 0.85 } }}
        >
          إضافة جديد
        </Button>
        <IconButton size="small" onClick={load}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: `${sectionColor}0a` }}>
              {tableColumns.map(c => (
                <TableCell key={c.key}>{c.label}</TableCell>
              ))}
              <TableCell align="center">تعديل</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={tableColumns.length + 1} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, i) => (
                <TableRow key={item._id || i} hover>
                  {tableColumns.map(c => (
                    <TableCell key={c.key}>
                      {c.render ? (
                        c.render(item)
                      ) : c.isStatus ? (
                        statusChip(item[c.key], statusMap)
                      ) : (
                        <Typography variant="body2">{item[c.key] ?? '—'}</Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" sx={{ color: sectionColor }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${sectionColor}12`, color: sectionColor }}>
          {editTarget ? 'تعديل السجل' : 'إضافة سجل جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {formFields.map(f =>
              f.options ? (
                <TextField
                  key={f.key}
                  select
                  fullWidth
                  size="small"
                  label={f.label}
                  value={form[f.key] || ''}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
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
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                />
              )
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={submitting}
            onClick={handleSubmit}
            sx={{ bgcolor: sectionColor, '&:hover': { bgcolor: sectionColor, opacity: 0.85 } }}
          >
            {submitting ? 'جاري...' : editTarget ? 'حفظ التعديلات' : 'إضافة'}
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

/* ══════════════════════════════════════════════════════════ */
export default function ComplianceHubPage() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: 'الاعتماد المؤسسي', icon: <AccredIcon /> },
    { label: 'التفتيش والزيارات', icon: <InspectIcon /> },
    { label: 'الامتثال للمعايير', icon: <StandardsIcon /> },
    { label: 'التراخيص', icon: <LicenseIcon /> },
    { label: 'الشهادات والاعتمادات', icon: <CredIcon /> },
  ];

  /* ── SECTION CONFIGS ── */

  const accredColumns = [
    { key: 'name', label: 'جهة الاعتماد' },
    { key: 'type', label: 'النوع' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'issueDate', label: 'تاريخ الإصدار', render: r => fmt(r.issueDate) },
    {
      key: 'expiryDate',
      label: 'تاريخ الانتهاء',
      render: r => {
        const d = r.expiryDate ? new Date(r.expiryDate) : null;
        const soon = d && d - new Date() < 90 * 86400000;
        return (
          <Typography variant="body2" color={soon ? 'error' : 'inherit'}>
            {fmt(r.expiryDate)}
          </Typography>
        );
      },
    },
  ];
  const accredForm = [
    { key: 'name', label: 'اسم جهة الاعتماد *' },
    { key: 'type', label: 'النوع' },
    { key: 'standard', label: 'المعيار (CBAHI / JCI / ISO)' },
    { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
    { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'معتمد' },
        { value: 'pending', label: 'قيد الانتظار' },
        { value: 'under-review', label: 'قيد المراجعة' },
        { value: 'expired', label: 'منتهي' },
        { value: 'suspended', label: 'موقوف' },
      ],
      default: 'pending',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  const inspectColumns = [
    { key: 'title', label: 'عنوان التفتيش' },
    { key: 'inspectorName', label: 'المفتش' },
    { key: 'inspectionDate', label: 'التاريخ', render: r => fmt(r.inspectionDate || r.date) },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'score', label: 'النتيجة', render: r => (r.score != null ? `${r.score}%` : '—') },
  ];
  const inspectForm = [
    { key: 'title', label: 'عنوان التفتيش *' },
    { key: 'inspectorName', label: 'اسم المفتش' },
    { key: 'inspectionDate', label: 'تاريخ التفتيش', type: 'date' },
    { key: 'department', label: 'القسم / الوحدة' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'scheduled', label: 'مجدول' },
        { value: 'in-progress', label: 'جاري' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'cancelled', label: 'ملغي' },
        { value: 'follow-up', label: 'متابعة' },
      ],
      default: 'scheduled',
    },
    { key: 'findings', label: 'الملاحظات والنتائج', multiline: true },
  ];

  const standardsColumns = [
    { key: 'name', label: 'اسم المعيار' },
    { key: 'framework', label: 'الإطار (CBAHI/ISO...)' },
    {
      key: 'complianceLevel',
      label: 'مستوى الامتثال',
      render: r => {
        const v = r.complianceLevel ?? r.compliance;
        if (v == null) return '—';
        const color = v >= 90 ? 'success' : v >= 70 ? 'warning' : 'error';
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={Math.min(v, 100)}
              color={color}
              sx={{ width: 80, height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption">{v}%</Typography>
          </Box>
        );
      },
    },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'lastAuditDate', label: 'آخر تدقيق', render: r => fmt(r.lastAuditDate) },
  ];
  const standardsForm = [
    { key: 'name', label: 'اسم المعيار *' },
    { key: 'framework', label: 'الإطار (CBAHI / ISO / JCI)' },
    { key: 'category', label: 'الفئة' },
    { key: 'complianceLevel', label: 'مستوى الامتثال (%)', type: 'number' },
    { key: 'lastAuditDate', label: 'تاريخ آخر تدقيق', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'pending', label: 'معلق' },
        { value: 'inactive', label: 'غير نشط' },
      ],
      default: 'active',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  const licenseColumns = [
    { key: 'name', label: 'اسم الترخيص' },
    { key: 'authority', label: 'جهة الإصدار' },
    { key: 'licenseNumber', label: 'رقم الترخيص' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'expiryDate',
      label: 'تاريخ الانتهاء',
      render: r => {
        const d = r.expiryDate ? new Date(r.expiryDate) : null;
        const soon = d && d - new Date() < 60 * 86400000;
        return (
          <Typography variant="body2" color={soon ? 'error.main' : 'inherit'}>
            {fmt(r.expiryDate)}
          </Typography>
        );
      },
    },
  ];
  const licenseForm = [
    { key: 'name', label: 'اسم الترخيص *' },
    { key: 'authority', label: 'جهة الإصدار' },
    { key: 'licenseNumber', label: 'رقم الترخيص' },
    { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
    { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'valid', label: 'ساري' },
        { value: 'pending', label: 'معلق' },
        { value: 'expired', label: 'منتهي' },
        { value: 'revoked', label: 'ملغي' },
      ],
      default: 'valid',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  const credColumns = [
    { key: 'employeeName', label: 'اسم الموظف' },
    { key: 'credentialType', label: 'نوع الاعتماد' },
    { key: 'issuingAuthority', label: 'جهة الإصدار' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'expiryDate',
      label: 'تاريخ الانتهاء',
      render: r => {
        const d = r.expiryDate ? new Date(r.expiryDate) : null;
        const soon = d && d - new Date() < 90 * 86400000;
        return (
          <Typography variant="body2" color={soon ? 'error.main' : 'inherit'}>
            {fmt(r.expiryDate)}
          </Typography>
        );
      },
    },
  ];
  const credForm = [
    { key: 'employeeName', label: 'اسم الموظف *' },
    { key: 'employeeId', label: 'معرف الموظف' },
    { key: 'credentialType', label: 'نوع الاعتماد' },
    { key: 'credentialNumber', label: 'رقم الاعتماد' },
    { key: 'issuingAuthority', label: 'جهة الإصدار' },
    { key: 'issueDate', label: 'تاريخ الإصدار', type: 'date' },
    { key: 'expiryDate', label: 'تاريخ الانتهاء', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'ساري' },
        { value: 'pending', label: 'معلق' },
        { value: 'expired', label: 'منتهي' },
      ],
      default: 'active',
    },
  ];

  const sectionProps = [
    {
      api: accreditationManagerAPI,
      sectionColor: '#6a1b9a',
      kpiFields: [
        { key: 'activeCount', label: 'معتمد', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'pendingCount', label: 'قيد الانتظار', icon: <WarnIcon />, color: '#e65100' },
        { key: 'expiringCount', label: 'ينتهي قريباً', icon: <ErrIcon />, color: '#c62828' },
      ],
      tableColumns: accredColumns,
      formFields: accredForm,
      statusMap: ACCRED_STATUS,
    },
    {
      api: inspectionTrackerAPI,
      sectionColor: '#0d47a1',
      kpiFields: [
        { key: 'completedCount', label: 'مكتملة', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'scheduledCount', label: 'مجدولة', icon: <WarnIcon />, color: '#1565c0' },
        {
          key: 'averageScore',
          label: 'متوسط النتيجة',
          icon: <ChartIcon />,
          color: '#6a1b9a',
          render: v => (v != null ? `${v}%` : '—'),
        },
      ],
      tableColumns: inspectColumns,
      formFields: inspectForm,
      statusMap: INSPECT_STATUS,
    },
    {
      api: standardsComplianceAPI,
      sectionColor: '#1b5e20',
      kpiFields: [
        { key: 'fullCompliance', label: 'امتثال كامل', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'partialCompliance', label: 'امتثال جزئي', icon: <WarnIcon />, color: '#e65100' },
        { key: 'avgCompliance', label: 'متوسط الامتثال', icon: <ChartIcon />, color: '#1565c0' },
      ],
      tableColumns: standardsColumns,
      formFields: standardsForm,
      statusMap: GENERIC_STATUS,
    },
    {
      api: licensureManagerAPI,
      sectionColor: '#bf360c',
      kpiFields: [
        { key: 'validCount', label: 'ساري', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'expiringCount', label: 'ينتهي قريباً', icon: <WarnIcon />, color: '#e65100' },
        { key: 'expiredCount', label: 'منتهي', icon: <ErrIcon />, color: '#c62828' },
      ],
      tableColumns: licenseColumns,
      formFields: licenseForm,
      statusMap: GENERIC_STATUS,
    },
    {
      api: credentialManagerAPI,
      sectionColor: '#004d40',
      kpiFields: [
        { key: 'activeCount', label: 'ساري', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'expiringCount', label: 'ينتهي خلال 90 يوم', icon: <WarnIcon />, color: '#e65100' },
        { key: 'expiredCount', label: 'منتهي', icon: <ErrIcon />, color: '#c62828' },
      ],
      tableColumns: credColumns,
      formFields: credForm,
      statusMap: GENERIC_STATUS,
    },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <ComplianceIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            مركز الامتثال المؤسسي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الاعتماد · التفتيش · المعايير · التراخيص · الشهادات
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          '& .MuiTab-root': { fontWeight: 600, minWidth: 130 },
          '& .Mui-selected': { color: sectionProps[tab]?.sectionColor || PRIMARY },
          '& .MuiTabs-indicator': { bgcolor: sectionProps[tab]?.sectionColor || PRIMARY },
        }}
      >
        {tabs.map((t, i) => (
          <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
        ))}
      </Tabs>

      {/* Sections */}
      {sectionProps.map((props, i) => (tab === i ? <GenericSection key={i} {...props} /> : null))}
    </Box>
  );
}
