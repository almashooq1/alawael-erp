/**
 * InteroperabilityPage — مركز التشغيل البيني والتكامل
 *
 * Tabs:
 *  0 — تكامل FHIR          → fhirIntegrationAPI
 *  1 — رسائل HL7            → hl7MessagingAPI
 *  2 — تبادل البيانات       → dataExchangeAPI
 *  3 — مركز التشغيل البيني  → interoperabilityHubAPI
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
  Badge,
} from '@mui/material';
import {
  Hub as HubIcon,
  SyncAlt as SyncIcon,
  Message as MsgIcon,
  SwapHoriz as ExchangeIcon,
  Cable as FhirIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as OkIcon,
  Error as ErrIcon,
  PauseCircle as PauseIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { formatDate as _fmtDate } from 'utils/dateUtils';
import {
  fhirIntegrationAPI,
  hl7MessagingAPI,
  dataExchangeAPI,
  interoperabilityHubAPI,
} from '../../services/ddd';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#004d40';
const BG = '#e0f2f1';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? _fmtDate(d) : '—');
const chip = (s, map) => {
  const cfg = map[s] || { label: s || '—', color: 'default' };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  pending: { label: 'معلق', color: 'warning' },
  error: { label: 'خطأ', color: 'error' },
  paused: { label: 'موقوف مؤقتاً', color: 'default' },
  connected: { label: 'متصل', color: 'success' },
  disconnected: { label: 'مقطوع', color: 'error' },
  processing: { label: 'يعالج', color: 'info' },
  completed: { label: 'مكتمل', color: 'success' },
  failed: { label: 'فشل', color: 'error' },
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

/* ── useSection: load dashboard + list once per tab reveal ── */
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

  return { dashboard, items, loading, error, load, loaded };
}

/* ── Generic Section ────────────────────────────────────── */
function Section({ section, color, kpis, columns, formFields }) {
  const { dashboard, items, loading, error, load, loaded } = useSection(section.api);

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
      editTarget ? await section.api.update(editTarget._id, form) : await section.api.create(form);
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

      {/* Dialog */}
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
export default function InteroperabilityPage() {
  const [tab, setTab] = useState(0);

  /* ── FHIR columns + form ── */
  const fhirCols = [
    { key: 'name', label: 'اسم التكامل' },
    { key: 'fhirVersion', label: 'إصدار FHIR' },
    { key: 'endpoint', label: 'نقطة الاتصال (Endpoint)' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'lastSync', label: 'آخر مزامنة', render: r => fmt(r.lastSync || r.lastSyncAt) },
  ];
  const fhirForm = [
    { key: 'name', label: 'اسم التكامل *' },
    {
      key: 'fhirVersion',
      label: 'إصدار FHIR',
      options: [
        { value: 'R4', label: 'R4' },
        { value: 'R4B', label: 'R4B' },
        { value: 'STU3', label: 'STU3' },
        { value: 'DSTU2', label: 'DSTU2' },
      ],
      default: 'R4',
    },
    { key: 'endpoint', label: 'Base URL / Endpoint' },
    { key: 'resourceType', label: 'نوع المورد (Patient, Observation...)' },
    {
      key: 'authType',
      label: 'نوع المصادقة',
      options: [
        { value: 'none', label: 'بدون' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'basic', label: 'Basic Auth' },
        { value: 'oauth2', label: 'OAuth2' },
      ],
      default: 'bearer',
    },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'paused', label: 'موقوف مؤقتاً' },
      ],
      default: 'active',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── HL7 columns + form ── */
  const hl7Cols = [
    { key: 'messageName', label: 'اسم الرسالة' },
    { key: 'messageType', label: 'نوع الرسالة (ADT/ORU...)' },
    { key: 'sourceSystem', label: 'النظام المرسل' },
    { key: 'targetSystem', label: 'النظام المستقبل' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'timestamp', label: 'التاريخ', render: r => fmt(r.timestamp || r.createdAt) },
  ];
  const hl7Form = [
    { key: 'messageName', label: 'اسم الرسالة *' },
    {
      key: 'messageType',
      label: 'نوع الرسالة (ADT/ORU/ORM/ORR/MDM)',
      options: [
        { value: 'ADT', label: 'ADT — بيانات المريض' },
        { value: 'ORU', label: 'ORU — نتائج الفحوصات' },
        { value: 'ORM', label: 'ORM — الطلبات' },
        { value: 'ORR', label: 'ORR — استجابة الطلبات' },
        { value: 'MDM', label: 'MDM — وثائق طبية' },
        { value: 'ACK', label: 'ACK — تأكيد' },
      ],
      default: 'ADT',
    },
    { key: 'sourceSystem', label: 'النظام المرسل' },
    { key: 'targetSystem', label: 'النظام المستقبل' },
    {
      key: 'hl7Version',
      label: 'إصدار HL7',
      options: [
        { value: '2.3', label: '2.3' },
        { value: '2.4', label: '2.4' },
        { value: '2.5', label: '2.5' },
        { value: '2.7', label: '2.7' },
      ],
      default: '2.5',
    },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'processing', label: 'يعالج' },
        { value: 'error', label: 'خطأ' },
      ],
      default: 'active',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Data Exchange columns + form ── */
  const exchangeCols = [
    { key: 'exchangeName', label: 'اسم التبادل' },
    { key: 'exchangeType', label: 'النوع' },
    {
      key: 'direction',
      label: 'الاتجاه',
      render: r => {
        const map = { inbound: 'وارد ←', outbound: 'صادر →', bidirectional: '↔ ثنائي' };
        return <Chip size="small" label={map[r.direction] || r.direction || '—'} />;
      },
    },
    { key: 'format', label: 'الصيغة (JSON/XML/CSV)' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'lastExchange',
      label: 'آخر تبادل',
      render: r => fmt(r.lastExchange || r.lastExchangeAt),
    },
  ];
  const exchangeForm = [
    { key: 'exchangeName', label: 'اسم التبادل *' },
    {
      key: 'exchangeType',
      label: 'نوع التبادل',
      options: [
        { value: 'api', label: 'API' },
        { value: 'file', label: 'ملف' },
        { value: 'database', label: 'قاعدة بيانات' },
        { value: 'webhook', label: 'Webhook' },
      ],
      default: 'api',
    },
    {
      key: 'direction',
      label: 'الاتجاه',
      options: [
        { value: 'inbound', label: 'وارد' },
        { value: 'outbound', label: 'صادر' },
        { value: 'bidirectional', label: 'ثنائي الاتجاه' },
      ],
      default: 'bidirectional',
    },
    {
      key: 'format',
      label: 'صيغة البيانات',
      options: [
        { value: 'JSON', label: 'JSON' },
        { value: 'XML', label: 'XML' },
        { value: 'CSV', label: 'CSV' },
        { value: 'HL7', label: 'HL7' },
        { value: 'FHIR', label: 'FHIR-JSON' },
      ],
      default: 'JSON',
    },
    { key: 'endpoint', label: 'Endpoint / مسار الملف' },
    { key: 'schedule', label: 'جدولة (Cron / يدوي)' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'paused', label: 'موقوف' },
        { value: 'error', label: 'خطأ' },
      ],
      default: 'active',
    },
  ];

  /* ── Interoperability Hub columns + form ── */
  const hubCols = [
    { key: 'name', label: 'اسم الاتصال' },
    { key: 'systemType', label: 'نوع النظام' },
    { key: 'protocol', label: 'البروتوكول' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'connectedSystems',
      label: 'أنظمة متصلة',
      render: r => {
        const n = Array.isArray(r.connectedSystems)
          ? r.connectedSystems.length
          : (r.connectedSystemsCount ?? '—');
        return (
          <Badge
            badgeContent={n}
            color="primary"
            sx={{ '& .MuiBadge-badge': { position: 'relative', transform: 'none', ml: 1 } }}
          >
            <Typography variant="body2">أنظمة</Typography>
          </Badge>
        );
      },
    },
    { key: 'updatedAt', label: 'آخر تحديث', render: r => fmt(r.updatedAt) },
  ];
  const hubForm = [
    { key: 'name', label: 'اسم الاتصال *' },
    {
      key: 'systemType',
      label: 'نوع النظام',
      options: [
        { value: 'HIS', label: 'HIS — نظام المعلومات الصحية' },
        { value: 'LIS', label: 'LIS — نظام المختبرات' },
        { value: 'RIS', label: 'RIS — نظام الأشعة' },
        { value: 'EHR', label: 'EHR — السجل الصحي الإلكتروني' },
        { value: 'PHR', label: 'PHR — سجل صحة شخصي' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'HIS',
    },
    {
      key: 'protocol',
      label: 'البروتوكول',
      options: [
        { value: 'REST', label: 'REST/HTTP' },
        { value: 'SOAP', label: 'SOAP/XML' },
        { value: 'HL7v2', label: 'HL7 v2.x' },
        { value: 'FHIR', label: 'FHIR R4' },
        { value: 'DICOM', label: 'DICOM' },
        { value: 'X12', label: 'X12 EDI' },
      ],
      default: 'REST',
    },
    { key: 'baseUrl', label: 'Base URL / Endpoint' },
    { key: 'vendor', label: 'الشركة المورّدة' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'connected', label: 'متصل' },
        { value: 'disconnected', label: 'مقطوع' },
        { value: 'pending', label: 'معلق' },
        { value: 'error', label: 'خطأ' },
      ],
      default: 'connected',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  const sections = [
    {
      api: fhirIntegrationAPI,
      color: '#1b5e20',
      kpis: [
        { key: 'activeCount', label: 'نشط', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'errorCount', label: 'يحتاج مراجعة', icon: <ErrIcon />, color: '#c62828' },
        { key: 'totalSyncs', label: 'مزامنات الشهر', icon: <SyncIcon />, color: '#0277bd' },
      ],
      columns: fhirCols,
      formFields: fhirForm,
    },
    {
      api: hl7MessagingAPI,
      color: '#0d47a1',
      kpis: [
        { key: 'activeCount', label: 'نشط', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'messagesProcessed', label: 'رسائل معالَجة', icon: <MsgIcon />, color: '#0277bd' },
        { key: 'errorCount', label: 'رسائل فاشلة', icon: <ErrIcon />, color: '#c62828' },
      ],
      columns: hl7Cols,
      formFields: hl7Form,
    },
    {
      api: dataExchangeAPI,
      color: '#4a148c',
      kpis: [
        { key: 'activeCount', label: 'نشط', icon: <OkIcon />, color: '#2e7d32' },
        {
          key: 'exchangesThisMonth',
          label: 'تبادلات الشهر',
          icon: <ExchangeIcon />,
          color: '#4a148c',
        },
        { key: 'failedCount', label: 'فاشل', icon: <ErrIcon />, color: '#c62828' },
      ],
      columns: exchangeCols,
      formFields: exchangeForm,
    },
    {
      api: interoperabilityHubAPI,
      color: '#004d40',
      kpis: [
        { key: 'connectedCount', label: 'متصل', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'totalSystems', label: 'إجمالي الأنظمة', icon: <HubIcon />, color: '#004d40' },
        { key: 'pendingCount', label: 'معلق', icon: <PauseIcon />, color: '#e65100' },
      ],
      columns: hubCols,
      formFields: hubForm,
    },
  ];

  const tabDefs = [
    { label: 'تكامل FHIR', icon: <FhirIcon /> },
    { label: 'رسائل HL7', icon: <MsgIcon /> },
    { label: 'تبادل البيانات', icon: <ExchangeIcon /> },
    { label: 'مركز التشغيل البيني', icon: <HubIcon /> },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <SyncIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            مركز التشغيل البيني والتكامل
          </Typography>
          <Typography variant="body2" color="text.secondary">
            FHIR · HL7 · تبادل البيانات · ربط الأنظمة الخارجية
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

      {sections.map((s, i) =>
        tab === i ? (
          <Section
            key={i}
            section={s}
            color={s.color}
            kpis={s.kpis}
            columns={s.columns}
            formFields={s.formFields}
          />
        ) : null
      )}
    </Box>
  );
}
