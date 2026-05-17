/**
 * FacilityManagementPage — إدارة المرافق والبيئة
 *
 * Tabs:
 *  0 — المراقبة البيئية   → environmentalMonitoringAPI
 *  1 — إدارة المساحات     → spaceManagementAPI
 *  2 — تتبع الأصول        → assetTrackingAPI
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
  Thermostat as ThermoIcon,
  MeetingRoom as RoomIcon,
  Inventory2 as AssetIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { formatDate as _fmtDate } from 'utils/dateUtils';
import {
  environmentalMonitoringAPI,
  spaceManagementAPI,
  assetTrackingAPI,
} from '../../services/ddd';

const PRIMARY = '#263238';
const BG = '#eceff1';

const fmt = d => (d ? _fmtDate(d) : '—');
const chip = (s, map) => {
  const cfg = map[s] || { label: s || '—', color: 'default' };
  return <Chip size="small" label={cfg.label} color={cfg.color} />;
};

const ENV_STATUS = {
  normal: { label: 'طبيعي', color: 'success' },
  alert: { label: 'تنبيه', color: 'error' },
  warning: { label: 'تحذير', color: 'warning' },
  offline: { label: 'غير متصل', color: 'default' },
};
const SPACE_STATUS = {
  available: { label: 'متاح', color: 'success' },
  occupied: { label: 'مشغول', color: 'info' },
  reserved: { label: 'محجوز', color: 'warning' },
  maintenance: { label: 'صيانة', color: 'error' },
};
const ASSET_STATUS = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  maintenance: { label: 'صيانة', color: 'warning' },
  retired: { label: 'متقاعد', color: 'error' },
  lost: { label: 'مفقود', color: 'error' },
};

/* ── KPI Card ── */
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

/* ── useSection hook ── */
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

/* ── Generic Section ── */
function Section({ section, color, statusMap, kpis, columns, formFields }) {
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
                        chip(item[c.key], statusMap)
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
export default function FacilityManagementPage() {
  const [tab, setTab] = useState(0);

  /* ── Environmental Monitoring ── */
  const envCols = [
    {
      key: 'location',
      label: 'الموقع',
      render: r => <Typography variant="body2">{r.location || r.name || '—'}</Typography>,
    },
    {
      key: 'parameter',
      label: 'المؤشر',
      render: r => <Typography variant="body2">{r.parameter || r.metric || '—'}</Typography>,
    },
    {
      key: 'value',
      label: 'القيمة',
      render: r => (
        <Typography variant="body2" fontWeight="bold">
          {r.value ?? '—'} {r.unit || ''}
        </Typography>
      ),
    },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'lastReading', label: 'آخر قراءة', render: r => fmt(r.lastReading || r.updatedAt) },
  ];
  const envForm = [
    { key: 'name', label: 'اسم المستشعر / الموقع *' },
    { key: 'location', label: 'الموقع الفعلي (غرفة / طابق)' },
    {
      key: 'parameter',
      label: 'المؤشر المراقَب',
      options: [
        { value: 'temperature', label: 'درجة الحرارة' },
        { value: 'humidity', label: 'الرطوبة' },
        { value: 'air_quality', label: 'جودة الهواء' },
        { value: 'noise', label: 'مستوى الضوضاء' },
        { value: 'lighting', label: 'مستوى الإضاءة' },
        { value: 'co2', label: 'ثاني أكسيد الكربون CO₂' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'temperature',
    },
    { key: 'unit', label: 'وحدة القياس (°C / % / ppm)' },
    { key: 'upperLimit', label: 'الحد الأعلى المسموح', type: 'number' },
    { key: 'lowerLimit', label: 'الحد الأدنى المسموح', type: 'number' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'normal', label: 'طبيعي' },
        { value: 'alert', label: 'تنبيه' },
        { value: 'warning', label: 'تحذير' },
        { value: 'offline', label: 'غير متصل' },
      ],
      default: 'normal',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Space Management ── */
  const spaceCols = [
    {
      key: 'name',
      label: 'اسم المساحة',
      render: r => <Typography variant="body2">{r.name || r.spaceName || '—'}</Typography>,
    },
    { key: 'type', label: 'النوع' },
    {
      key: 'capacity',
      label: 'السعة',
      render: r => <Typography variant="body2">{r.capacity ?? '—'} شخص</Typography>,
    },
    { key: 'floor', label: 'الطابق' },
    { key: 'status', label: 'الحالة', isStatus: true },
    {
      key: 'occupancyRate',
      label: 'نسبة الإشغال',
      render: r =>
        r.occupancyRate != null ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LinearProgress
              variant="determinate"
              value={r.occupancyRate}
              sx={{ width: 60, height: 6, borderRadius: 3 }}
            />
            <Typography variant="caption">{r.occupancyRate}%</Typography>
          </Box>
        ) : (
          '—'
        ),
    },
  ];
  const spaceForm = [
    { key: 'name', label: 'اسم المساحة *' },
    {
      key: 'type',
      label: 'نوع المساحة',
      options: [
        { value: 'therapy_room', label: 'غرفة علاج' },
        { value: 'group_room', label: 'غرفة جماعية' },
        { value: 'assessment_room', label: 'غرفة تقييم' },
        { value: 'waiting_area', label: 'منطقة انتظار' },
        { value: 'office', label: 'مكتب إداري' },
        { value: 'gym', label: 'صالة تمارين' },
        { value: 'simulation', label: 'غرفة محاكاة' },
        { value: 'storage', label: 'مخزن' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'therapy_room',
    },
    { key: 'capacity', label: 'السعة (عدد الأشخاص)', type: 'number' },
    { key: 'floor', label: 'الطابق' },
    { key: 'building', label: 'المبنى' },
    { key: 'area', label: 'المساحة (م²)', type: 'number' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'available', label: 'متاح' },
        { value: 'occupied', label: 'مشغول' },
        { value: 'reserved', label: 'محجوز' },
        { value: 'maintenance', label: 'صيانة' },
      ],
      default: 'available',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Asset Tracking ── */
  const assetCols = [
    {
      key: 'name',
      label: 'الأصل',
      render: r => <Typography variant="body2">{r.name || r.assetName || '—'}</Typography>,
    },
    { key: 'assetTag', label: 'رمز الأصل' },
    { key: 'category', label: 'الفئة' },
    { key: 'location', label: 'الموقع' },
    {
      key: 'value',
      label: 'القيمة',
      render: r =>
        r.value ? <Typography variant="body2">{r.value.toLocaleString()} ر.س</Typography> : '—',
    },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'purchaseDate', label: 'تاريخ الشراء', render: r => fmt(r.purchaseDate) },
  ];
  const assetForm = [
    { key: 'name', label: 'اسم الأصل *' },
    { key: 'assetTag', label: 'رمز / باركود الأصل' },
    {
      key: 'category',
      label: 'الفئة',
      options: [
        { value: 'equipment', label: 'معدات طبية' },
        { value: 'furniture', label: 'أثاث' },
        { value: 'it', label: 'تقنية معلومات' },
        { value: 'vehicle', label: 'مركبة' },
        { value: 'tool', label: 'أداة' },
        { value: 'software', label: 'برمجيات' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'equipment',
    },
    { key: 'serialNumber', label: 'الرقم التسلسلي' },
    { key: 'manufacturer', label: 'الشركة المصنعة' },
    { key: 'location', label: 'الموقع الحالي' },
    { key: 'assignedTo', label: 'معيَّن لـ' },
    { key: 'value', label: 'القيمة (ر.س)', type: 'number' },
    { key: 'purchaseDate', label: 'تاريخ الشراء', type: 'date' },
    { key: 'warrantyExpiry', label: 'انتهاء الضمان', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'maintenance', label: 'صيانة' },
        { value: 'retired', label: 'متقاعد' },
        { value: 'lost', label: 'مفقود' },
      ],
      default: 'active',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  const tabs = [
    {
      label: 'المراقبة البيئية',
      icon: <ThermoIcon />,
      color: '#00695c',
      api: environmentalMonitoringAPI,
      statusMap: ENV_STATUS,
      kpis: [
        { key: 'alertCount', label: 'تنبيهات نشطة', icon: <ThermoIcon />, color: '#d32f2f' },
        { key: 'normalCount', label: 'مستشعرات طبيعية', icon: <ThermoIcon />, color: '#2e7d32' },
        { key: 'offlineCount', label: 'غير متصل', icon: <ThermoIcon />, color: '#9e9e9e' },
      ],
      columns: envCols,
      formFields: envForm,
    },
    {
      label: 'إدارة المساحات',
      icon: <RoomIcon />,
      color: '#37474f',
      api: spaceManagementAPI,
      statusMap: SPACE_STATUS,
      kpis: [
        { key: 'availableCount', label: 'متاح', icon: <RoomIcon />, color: '#2e7d32' },
        { key: 'occupiedCount', label: 'مشغول', icon: <RoomIcon />, color: '#0277bd' },
        { key: 'totalCapacity', label: 'إجمالي السعة', icon: <RoomIcon />, color: '#37474f' },
      ],
      columns: spaceCols,
      formFields: spaceForm,
    },
    {
      label: 'تتبع الأصول',
      icon: <AssetIcon />,
      color: '#4e342e',
      api: assetTrackingAPI,
      statusMap: ASSET_STATUS,
      kpis: [
        { key: 'activeCount', label: 'أصول نشطة', icon: <AssetIcon />, color: '#2e7d32' },
        { key: 'maintenanceCount', label: 'صيانة', icon: <AssetIcon />, color: '#f57f17' },
        { key: 'totalValue', label: 'إجمالي القيمة (ر.س)', icon: <AssetIcon />, color: '#4e342e' },
      ],
      columns: assetCols,
      formFields: assetForm,
    },
  ];

  const activeTab = tabs[tab];

  return (
    <Box sx={{ p: 3, bgcolor: BG, minHeight: '100vh' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <RoomIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color: PRIMARY }}>
            إدارة المرافق والبيئة
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مراقبة البيئة • إدارة المساحات • تتبع الأصول
          </Typography>
        </Box>
      </Stack>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: `2px solid ${activeTab.color}` }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{
                minHeight: 56,
                '&.Mui-selected': { color: t.color, fontWeight: 'bold' },
              }}
            />
          ))}
        </Tabs>
        <Box sx={{ p: 2 }}>
          <Section
            key={tab}
            section={activeTab}
            color={activeTab.color}
            statusMap={activeTab.statusMap}
            kpis={activeTab.kpis}
            columns={activeTab.columns}
            formFields={activeTab.formFields}
          />
        </Box>
      </Paper>
    </Box>
  );
}
