/**
 * BusinessContinuityPage — استمرارية الأعمال وإدارة الأزمات
 *
 * Tabs:
 *  0 — النسخ الاحتياطي       → backupManagerAPI
 *  1 — استمرارية الأعمال     → businessContinuityAPI
 *  2 — تجاوز الأعطال         → systemFailoverAPI
 *  3 — الاستجابة للحوادث     → incidentResponseAPI
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
  Security as SecurityIcon,
  Backup as BackupIcon,
  AccountTree as ContinuityIcon,
  SwapVert as FailoverIcon,
  BugReport as IncidentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as OkIcon,
  Error as ErrIcon,
  Warning as WarnIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { formatDate as _fmtDate } from 'utils/dateUtils';
import {
  backupManagerAPI,
  businessContinuityAPI,
  systemFailoverAPI,
  incidentResponseAPI,
} from '../../services/ddd';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#b71c1c';
const BG = '#ffebee';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? _fmtDate(d) : '—');
const fmtTime = d => {
  if (!d) return '—';
  return new Date(d).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const SEVERITY_MAP = {
  low: { label: 'منخفض', color: 'success' },
  medium: { label: 'متوسط', color: 'info' },
  high: { label: 'عالٍ', color: 'warning' },
  critical: { label: 'حرج', color: 'error' },
};
const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  pending: { label: 'معلق', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
  failed: { label: 'فشل', color: 'error' },
  scheduled: { label: 'مجدول', color: 'info' },
  'in-progress': { label: 'جاري', color: 'warning' },
  resolved: { label: 'محلول', color: 'success' },
  open: { label: 'مفتوح', color: 'error' },
  closed: { label: 'مغلق', color: 'default' },
  triggered: { label: 'مُفعَّل', color: 'error' },
  standby: { label: 'جاهز', color: 'info' },
};
const chip = (s, map) => {
  const cfg = map?.[s] || STATUS_MAP[s] || { label: s || '—', color: 'default' };
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

/* ── useSection ─────────────────────────────────────────── */
function useSection(api) {
  const [dashboard, setDashboard] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, list] = await Promise.allSettled([
        api.getDashboard({}),
        api.list({ limit: 50 }),
      ]);
      if (dash.status === 'fulfilled')
        setDashboard(dash.value?.data?.data || dash.value?.data || null);
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

  return { dashboard, items, loading, error, load, loaded };
}

/* ── Section component ──────────────────────────────────── */
function Section({ api, color, kpis, columns, formFields }) {
  const { dashboard, items, loading, error, load, loaded } = useSection(api);
  useEffect(() => {
    if (!loaded) load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [dialog, setDialog] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const openCreate = () => {
    setEditTarget(null);
    const empty = {};
    formFields.forEach(f => {
      empty[f.key] = f.default || '';
    });
    setForm(empty);
    setDialog(true);
  };
  const openEdit = item => {
    setEditTarget(item);
    const pre = {};
    formFields.forEach(f => {
      pre[f.key] = item[f.key] ?? f.default ?? '';
    });
    setForm(pre);
    setDialog(true);
  };
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      editTarget ? await api.update(editTarget._id, form) : await api.create(form);
      setSnack({ open: true, msg: editTarget ? 'تم التحديث' : 'تم الإنشاء', severity: 'success' });
      setDialog(false);
      load();
    } catch (e) {
      setSnack({ open: true, msg: e.message, severity: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const resolvedKpis = [
    { label: 'الإجمالي', value: dashboard?.total ?? items.length, icon: <ChartIcon />, color },
    ...kpis.map(k => ({ ...k, value: dashboard?.[k.key] ?? '—', color: k.color || color })),
  ];

  return (
    <Box>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {resolvedKpis.slice(0, 4).map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KpiCard {...k} />
          </Grid>
        ))}
      </Grid>
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mb: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{ bgcolor: color, '&:hover': { bgcolor: color, opacity: 0.85 } }}
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
            <TableRow sx={{ bgcolor: `${color}0a` }}>
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
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, i) => (
                <TableRow key={item._id || i} hover>
                  {columns.map(c => (
                    <TableCell key={c.key}>
                      {c.render ? (
                        c.render(item)
                      ) : c.isStatus ? (
                        chip(item[c.key], STATUS_MAP)
                      ) : c.isSeverity ? (
                        chip(item[c.key], SEVERITY_MAP)
                      ) : (
                        <Typography variant="body2">{item[c.key] ?? '—'}</Typography>
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="center">
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEdit(item)}>
                        <EditIcon fontSize="small" sx={{ color }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: `${color}12`, color }}>
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
            sx={{ bgcolor: color, '&:hover': { bgcolor: color, opacity: 0.85 } }}
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

/* ══════════════════════════════════════════════════════════ */
export default function BusinessContinuityPage() {
  const [tab, setTab] = useState(0);

  /* ── Backup columns + form ── */
  const backupCols = [
    { key: 'name', label: 'اسم النسخة' },
    { key: 'backupType', label: 'النوع' },
    { key: 'frequency', label: 'التردد' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'lastBackupAt', label: 'آخر نسخة', render: r => fmt(r.lastBackupAt || r.lastBackup) },
    { key: 'nextBackupAt', label: 'القادمة', render: r => fmt(r.nextBackupAt || r.nextBackup) },
  ];
  const backupForm = [
    { key: 'name', label: 'اسم النسخة الاحتياطية *' },
    {
      key: 'backupType',
      label: 'النوع',
      options: [
        { value: 'full', label: 'كاملة' },
        { value: 'incremental', label: 'تزايدية' },
        { value: 'differential', label: 'تفاضلية' },
        { value: 'snapshot', label: 'لقطة' },
      ],
      default: 'full',
    },
    {
      key: 'frequency',
      label: 'التردد',
      options: [
        { value: 'hourly', label: 'كل ساعة' },
        { value: 'daily', label: 'يومي' },
        { value: 'weekly', label: 'أسبوعي' },
        { value: 'monthly', label: 'شهري' },
        { value: 'manual', label: 'يدوي' },
      ],
      default: 'daily',
    },
    { key: 'retentionDays', label: 'فترة الاحتفاظ (أيام)', type: 'number' },
    { key: 'storageLocation', label: 'موقع التخزين' },
    {
      key: 'encryptionEnabled',
      label: 'التشفير',
      options: [
        { value: 'true', label: 'مفعّل' },
        { value: 'false', label: 'غير مفعّل' },
      ],
      default: 'true',
    },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'scheduled', label: 'مجدول' },
        { value: 'inactive', label: 'غير نشط' },
      ],
      default: 'active',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Business Continuity columns + form ── */
  const continuityCols = [
    { key: 'planName', label: 'اسم الخطة' },
    { key: 'planType', label: 'النوع' },
    { key: 'rto', label: 'RTO (ساعة)' },
    { key: 'rpo', label: 'RPO (ساعة)' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'lastTestedAt', label: 'آخر اختبار', render: r => fmt(r.lastTestedAt || r.lastTested) },
  ];
  const continuityForm = [
    { key: 'planName', label: 'اسم الخطة *' },
    {
      key: 'planType',
      label: 'نوع الخطة',
      options: [
        { value: 'BCP', label: 'BCP — استمرارية الأعمال' },
        { value: 'DRP', label: 'DRP — التعافي من الكوارث' },
        { value: 'COOP', label: 'COOP — خطة استمرار العمليات' },
      ],
      default: 'BCP',
    },
    { key: 'rto', label: 'هدف وقت الاسترداد RTO (ساعة)', type: 'number' },
    { key: 'rpo', label: 'هدف نقطة الاسترداد RPO (ساعة)', type: 'number' },
    { key: 'owner', label: 'المسؤول' },
    { key: 'lastTestedAt', label: 'تاريخ آخر اختبار', type: 'date' },
    { key: 'nextTestDate', label: 'تاريخ الاختبار القادم', type: 'date' },
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
    { key: 'scope', label: 'نطاق الخطة', multiline: true },
  ];

  /* ── System Failover columns + form ── */
  const failoverCols = [
    { key: 'systemName', label: 'اسم النظام' },
    { key: 'failoverType', label: 'نوع التجاوز' },
    { key: 'primaryServer', label: 'الخادم الأساسي' },
    { key: 'secondaryServer', label: 'الخادم الاحتياطي' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'lastTriggeredAt',
      label: 'آخر تفعيل',
      render: r => fmt(r.lastTriggeredAt || r.lastFailover),
    },
  ];
  const failoverForm = [
    { key: 'systemName', label: 'اسم النظام *' },
    {
      key: 'failoverType',
      label: 'نوع التجاوز',
      options: [
        { value: 'automatic', label: 'تلقائي' },
        { value: 'manual', label: 'يدوي' },
        { value: 'semi-automatic', label: 'شبه تلقائي' },
      ],
      default: 'automatic',
    },
    { key: 'primaryServer', label: 'الخادم الأساسي' },
    { key: 'secondaryServer', label: 'الخادم الاحتياطي' },
    { key: 'failoverThreshold', label: 'عتبة التفعيل (ثانية)', type: 'number' },
    { key: 'healthCheckInterval', label: 'فترة فحص الصحة (ثانية)', type: 'number' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'standby', label: 'جاهز' },
        { value: 'active', label: 'نشط' },
        { value: 'triggered', label: 'مُفعَّل' },
        { value: 'inactive', label: 'غير نشط' },
      ],
      default: 'standby',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Incident Response columns + form ── */
  const incidentCols = [
    { key: 'title', label: 'عنوان الحادثة' },
    { key: 'incidentType', label: 'النوع' },
    { key: 'severity', label: 'الخطورة', isSeverity: true },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'assignedTo', label: 'المسؤول' },
    { key: 'detectedAt', label: 'وقت الاكتشاف', render: r => fmtTime(r.detectedAt || r.createdAt) },
    { key: 'resolvedAt', label: 'وقت الحل', render: r => fmt(r.resolvedAt) },
  ];
  const incidentForm = [
    { key: 'title', label: 'عنوان الحادثة *' },
    {
      key: 'incidentType',
      label: 'نوع الحادثة',
      options: [
        { value: 'security', label: 'أمني' },
        { value: 'system', label: 'نظام' },
        { value: 'data', label: 'بيانات' },
        { value: 'network', label: 'شبكة' },
        { value: 'physical', label: 'مادي' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'system',
    },
    {
      key: 'severity',
      label: 'مستوى الخطورة',
      options: [
        { value: 'low', label: 'منخفض' },
        { value: 'medium', label: 'متوسط' },
        { value: 'high', label: 'عالٍ' },
        { value: 'critical', label: 'حرج' },
      ],
      default: 'medium',
    },
    { key: 'assignedTo', label: 'المسؤول عن الحادثة' },
    { key: 'affectedSystems', label: 'الأنظمة المتأثرة' },
    { key: 'detectedAt', label: 'وقت الاكتشاف', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'open', label: 'مفتوح' },
        { value: 'in-progress', label: 'جاري' },
        { value: 'resolved', label: 'محلول' },
        { value: 'closed', label: 'مغلق' },
      ],
      default: 'open',
    },
    { key: 'description', label: 'وصف الحادثة', multiline: true },
    { key: 'resolution', label: 'الإجراء المتخذ', multiline: true },
  ];

  const sections = [
    {
      api: backupManagerAPI,
      color: '#1565c0',
      kpis: [
        { key: 'successCount', label: 'ناجحة', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'failedCount', label: 'فاشلة', icon: <ErrIcon />, color: '#c62828' },
        { key: 'totalSizeGB', label: 'الحجم الكلي (GB)', icon: <BackupIcon />, color: '#1565c0' },
      ],
      columns: backupCols,
      formFields: backupForm,
    },
    {
      api: businessContinuityAPI,
      color: '#1b5e20',
      kpis: [
        { key: 'activeCount', label: 'خطط نشطة', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'averageRto', label: 'متوسط RTO (ساعة)', icon: <ChartIcon />, color: '#0277bd' },
        {
          key: 'testedThisYear',
          label: 'مختبرة هذا العام',
          icon: <ContinuityIcon />,
          color: '#1b5e20',
        },
      ],
      columns: continuityCols,
      formFields: continuityForm,
    },
    {
      api: systemFailoverAPI,
      color: '#4a148c',
      kpis: [
        { key: 'standbyCount', label: 'جاهز', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'triggeredCount', label: 'مُفعَّل حالياً', icon: <WarnIcon />, color: '#e65100' },
        {
          key: 'totalFailoversThisMonth',
          label: 'تجاوزات الشهر',
          icon: <FailoverIcon />,
          color: '#4a148c',
        },
      ],
      columns: failoverCols,
      formFields: failoverForm,
    },
    {
      api: incidentResponseAPI,
      color: '#b71c1c',
      kpis: [
        { key: 'openCount', label: 'مفتوح', icon: <ErrIcon />, color: '#c62828' },
        { key: 'resolvedThisMonth', label: 'محلول الشهر', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'criticalCount', label: 'حرج', icon: <WarnIcon />, color: '#e65100' },
      ],
      columns: incidentCols,
      formFields: incidentForm,
    },
  ];

  const tabDefs = [
    { label: 'النسخ الاحتياطي', icon: <BackupIcon /> },
    { label: 'استمرارية الأعمال', icon: <ContinuityIcon /> },
    { label: 'تجاوز الأعطال', icon: <FailoverIcon /> },
    { label: 'الاستجابة للحوادث', icon: <IncidentIcon /> },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <SecurityIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            استمرارية الأعمال وإدارة الأزمات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            النسخ الاحتياطي · خطط الاستمرارية · تجاوز الأعطال · الاستجابة للحوادث
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          bgcolor: 'background.paper',
          borderRadius: 2,
          '& .MuiTab-root': { fontWeight: 600 },
          '& .Mui-selected': { color: sections[tab]?.color || PRIMARY },
          '& .MuiTabs-indicator': { bgcolor: sections[tab]?.color || PRIMARY },
        }}
      >
        {tabDefs.map((t, i) => (
          <Tab key={i} icon={t.icon} iconPosition="start" label={t.label} />
        ))}
      </Tabs>

      {sections.map((s, i) => (tab === i ? <Section key={i} {...s} /> : null))}
    </Box>
  );
}
