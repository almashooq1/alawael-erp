/**
 * HRDevelopmentPage — تطوير الكوادر البشرية
 *
 * Tabs:
 *  0 — برامج الإرشاد المهني  → mentorshipProgramAPI
 *  1 — المسارات المهنية       → careerPathwayAPI
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
  People as PeopleIcon,
  School as SchoolIcon,
  TrendingUp as CareerIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  CheckCircle as OkIcon,
  HourglassEmpty as InProgressIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { mentorshipProgramAPI, careerPathwayAPI } from '../../services/ddd';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#1a237e';
const BG = '#e8eaf6';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  pending: { label: 'معلق', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
  in_progress: { label: 'جاري', color: 'info' },
  'in-progress': { label: 'جاري', color: 'info' },
  paused: { label: 'موقوف مؤقتاً', color: 'warning' },
  cancelled: { label: 'ملغى', color: 'error' },
  draft: { label: 'مسودة', color: 'default' },
  published: { label: 'منشور', color: 'success' },
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

/* ── Section ────────────────────────────────────────────── */
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
export default function HRDevelopmentPage() {
  const [tab, setTab] = useState(0);

  /* ── Mentorship columns + form ── */
  const mentorCols = [
    { key: 'programName', label: 'اسم البرنامج' },
    { key: 'mentorName', label: 'المرشد' },
    { key: 'menteeName', label: 'المتلقي' },
    { key: 'specialty', label: 'التخصص' },
    { key: 'durationMonths', label: 'المدة (شهر)' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'startDate', label: 'تاريخ البدء', render: r => fmt(r.startDate) },
    { key: 'endDate', label: 'تاريخ الانتهاء', render: r => fmt(r.endDate) },
  ];
  const mentorForm = [
    { key: 'programName', label: 'اسم البرنامج *' },
    { key: 'mentorName', label: 'اسم المرشد' },
    { key: 'menteeName', label: 'اسم المتلقي' },
    {
      key: 'specialty',
      label: 'التخصص',
      options: [
        { value: 'PT', label: 'علاج طبيعي' },
        { value: 'OT', label: 'علاج وظيفي' },
        { value: 'SLP', label: 'تخاطب' },
        { value: 'psychology', label: 'علم النفس' },
        { value: 'social_work', label: 'خدمة اجتماعية' },
        { value: 'nursing', label: 'تمريض' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'PT',
    },
    { key: 'durationMonths', label: 'مدة البرنامج (شهر)', type: 'number' },
    { key: 'startDate', label: 'تاريخ البدء', type: 'date' },
    { key: 'endDate', label: 'تاريخ الانتهاء', type: 'date' },
    { key: 'goals', label: 'أهداف البرنامج', multiline: true },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'pending', label: 'معلق' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'cancelled', label: 'ملغى' },
      ],
      default: 'active',
    },
    { key: 'notes', label: 'ملاحظات', multiline: true },
  ];

  /* ── Career Pathway columns + form ── */
  const careerCols = [
    { key: 'pathwayName', label: 'اسم المسار' },
    { key: 'specialty', label: 'التخصص' },
    { key: 'currentLevel', label: 'المستوى الحالي' },
    { key: 'targetLevel', label: 'المستوى المستهدف' },
    { key: 'employeeName', label: 'الموظف' },
    { key: 'status', label: 'الحالة', isStatus: true },
    { key: 'targetDate', label: 'التاريخ المستهدف', render: r => fmt(r.targetDate) },
    {
      key: 'completionPercentage',
      label: 'الإنجاز',
      render: r => {
        const pct = r.completionPercentage ?? r.progress ?? 0;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 90 }}>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                bgcolor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: pct >= 80 ? '#2e7d32' : pct >= 50 ? '#0277bd' : '#e65100',
                },
              }}
            />
            <Typography variant="caption">{pct}%</Typography>
          </Box>
        );
      },
    },
  ];
  const careerForm = [
    { key: 'pathwayName', label: 'اسم المسار المهني *' },
    {
      key: 'specialty',
      label: 'التخصص',
      options: [
        { value: 'PT', label: 'علاج طبيعي' },
        { value: 'OT', label: 'علاج وظيفي' },
        { value: 'SLP', label: 'تخاطب' },
        { value: 'psychology', label: 'علم النفس' },
        { value: 'social_work', label: 'خدمة اجتماعية' },
        { value: 'management', label: 'إدارة' },
        { value: 'other', label: 'أخرى' },
      ],
      default: 'PT',
    },
    { key: 'employeeName', label: 'اسم الموظف' },
    {
      key: 'currentLevel',
      label: 'المستوى الحالي',
      options: [
        { value: 'junior', label: 'مبتدئ' },
        { value: 'mid', label: 'متوسط' },
        { value: 'senior', label: 'أول' },
        { value: 'lead', label: 'قيادي' },
        { value: 'manager', label: 'مدير' },
      ],
      default: 'junior',
    },
    {
      key: 'targetLevel',
      label: 'المستوى المستهدف',
      options: [
        { value: 'mid', label: 'متوسط' },
        { value: 'senior', label: 'أول' },
        { value: 'lead', label: 'قيادي' },
        { value: 'manager', label: 'مدير' },
        { value: 'director', label: 'مدير عام' },
      ],
      default: 'mid',
    },
    { key: 'targetDate', label: 'التاريخ المستهدف', type: 'date' },
    { key: 'completionPercentage', label: 'نسبة الإنجاز (%)', type: 'number' },
    {
      key: 'status',
      label: 'الحالة',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'in-progress', label: 'جاري' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'paused', label: 'موقوف' },
        { value: 'draft', label: 'مسودة' },
      ],
      default: 'active',
    },
    { key: 'requirements', label: 'متطلبات المسار', multiline: true },
    { key: 'milestones', label: 'المراحل الرئيسية', multiline: true },
  ];

  const sections = [
    {
      api: mentorshipProgramAPI,
      color: '#283593',
      kpis: [
        { key: 'activeCount', label: 'برامج نشطة', icon: <OkIcon />, color: '#2e7d32' },
        { key: 'completedCount', label: 'مكتملة', icon: <OkIcon />, color: '#283593' },
        { key: 'totalMentors', label: 'مرشدون', icon: <PeopleIcon />, color: '#0277bd' },
      ],
      columns: mentorCols,
      formFields: mentorForm,
    },
    {
      api: careerPathwayAPI,
      color: '#880e4f',
      kpis: [
        { key: 'activeCount', label: 'مسارات نشطة', icon: <InProgressIcon />, color: '#880e4f' },
        { key: 'completedCount', label: 'مكتملة', icon: <OkIcon />, color: '#2e7d32' },
        {
          key: 'averageCompletion',
          label: 'متوسط الإنجاز %',
          icon: <ChartIcon />,
          color: '#0277bd',
        },
      ],
      columns: careerCols,
      formFields: careerForm,
    },
  ];

  const tabDefs = [
    { label: 'برامج الإرشاد المهني', icon: <SchoolIcon /> },
    { label: 'المسارات المهنية', icon: <CareerIcon /> },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <PeopleIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            تطوير الكوادر البشرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            برامج الإرشاد المهني · المسارات الوظيفية والتطوير المهني
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
