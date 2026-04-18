/**
 * AdminAssessments — /admin/assessments page.
 *
 * Clinical assessment library: list + create + edit + per-beneficiary
 * trend analysis. Canonical 0–100 normalized score + per-domain breakdown.
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
import ArchiveIcon from '@mui/icons-material/Archive';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventIcon from '@mui/icons-material/Event';
import ScoreIcon from '@mui/icons-material/Score';
import api from '../../services/api.client';
import BeneficiaryTypeahead from '../../components/BeneficiaryTypeahead';

const CATEGORIES = [
  { value: '', label: 'كل الفئات' },
  { value: 'autism_screening', label: 'فحص التوحد' },
  { value: 'adaptive_behavior', label: 'سلوك تكيُّفي' },
  { value: 'cognitive', label: 'معرفي' },
  { value: 'language', label: 'لغوي' },
  { value: 'motor', label: 'حركي' },
  { value: 'sensory', label: 'حسّي' },
  { value: 'social_emotional', label: 'اجتماعي-عاطفي' },
  { value: 'academic', label: 'أكاديمي' },
  { value: 'behavioral', label: 'سلوكي' },
  { value: 'quality_of_life', label: 'جودة الحياة' },
  { value: 'other', label: 'أخرى' },
];
const CATEGORY_LABELS = CATEGORIES.reduce((a, c) => ({ ...a, [c.value]: c.label }), {});

const INTERPRETATIONS = [
  { value: 'within_normal', label: 'طبيعي', color: 'success' },
  { value: 'borderline', label: 'حدّي', color: 'warning' },
  { value: 'mild', label: 'خفيف', color: 'info' },
  { value: 'moderate', label: 'متوسط', color: 'warning' },
  { value: 'severe', label: 'شديد', color: 'error' },
  { value: 'profound', label: 'شديد جداً', color: 'error' },
  { value: 'not_applicable', label: 'غير منطبق', color: 'default' },
];
const INTERP_LABELS = INTERPRETATIONS.reduce((a, i) => ({ ...a, [i.value]: i.label }), {});
const INTERP_COLORS = INTERPRETATIONS.reduce((a, i) => ({ ...a, [i.value]: i.color }), {});

const STATUS_OPTIONS = [
  { value: 'draft', label: 'مسودّة' },
  { value: 'completed', label: 'مكتمل', color: 'success' },
  { value: 'reviewed', label: 'مُراجَع', color: 'primary' },
  { value: 'archived', label: 'مؤرشف' },
];
const STATUS_LABELS = STATUS_OPTIONS.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});
const STATUS_COLORS = STATUS_OPTIONS.reduce(
  (a, s) => ({ ...a, [s.value]: s.color || 'default' }),
  {}
);

const COMMON_TOOLS = [
  'CARS-2',
  'M-CHAT-R',
  'ADOS-2',
  'VB-MAPP',
  'ABLLS-R',
  'Vineland-3',
  'Denver-II',
  'GARS-3',
  'SCQ',
  'Conners-3',
  'WISC-V',
  'Leiter-3',
  'PEP-3',
  'BASC-3',
  'Bayley-4',
];

const EMPTY = {
  beneficiary: null,
  therapist: null,
  tool: '',
  toolVersion: '',
  category: 'other',
  assessmentDate: new Date().toISOString().slice(0, 10),
  duration: '',
  score: '',
  rawScore: '',
  maxRawScore: '',
  interpretation: '',
  observations: '',
  strengths: '',
  concerns: '',
  recommendations: '',
  status: 'completed',
  scoreBreakdown: [],
};

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}

export default function AdminAssessments() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  // Filters
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [tool, setTool] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailItem, setDetailItem] = useState(null);
  const [trendDialog, setTrendDialog] = useState({ open: false, loading: false, data: null });

  // Options — beneficiary uses BeneficiaryTypeahead (on-demand search)
  const [therapistOpts, setTherapistOpts] = useState([]);
  const [toolOpts, setToolOpts] = useState(COMMON_TOOLS);

  const loadOptions = useCallback(async () => {
    const tryGet = async (path, mapFn) => {
      try {
        const { data } = await api.get(path);
        const list = data?.items || data?.data || data?.results || [];
        return list.map(mapFn);
      } catch {
        return [];
      }
    };
    const [t, tools] = await Promise.all([
      tryGet('/employees?limit=100', x => ({
        id: x._id,
        label: `${fullName(x)} (${x.role || '—'})`,
      })),
      (async () => {
        try {
          const { data } = await api.get('/admin/assessments/tools');
          return data?.items || [];
        } catch {
          return [];
        }
      })(),
    ]);
    setTherapistOpts(t);
    setToolOpts(Array.from(new Set([...COMMON_TOOLS, ...tools])));
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/assessments/stats');
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
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (tool) params.set('tool', tool);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      const { data } = await api.get(`/admin/assessments?${params.toString()}`);
      setItems(data?.items || []);
      if (data?.pagination) setPagination(p => ({ ...p, ...data.pagination }));
    } catch (err) {
      setErrMsg(err?.response?.data?.message || err?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [q, category, status, tool, from, to, pagination.page, pagination.limit]);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const resetForm = () => {
    setForm(EMPTY);
    setFormErr('');
  };

  const openCreate = () => {
    resetForm();
    setEditMode(false);
    setDialogOpen(true);
  };

  const openEdit = async row => {
    try {
      const { data } = await api.get(`/admin/assessments/${row._id}`);
      const a = data?.data || row;
      setForm({
        _id: a._id,
        beneficiary: a.beneficiary
          ? { id: a.beneficiary._id || a.beneficiary, label: fullName(a.beneficiary) || '—' }
          : null,
        therapist: a.therapist
          ? { id: a.therapist._id || a.therapist, label: fullName(a.therapist) || '—' }
          : null,
        tool: a.tool || '',
        toolVersion: a.toolVersion || '',
        category: a.category || 'other',
        assessmentDate: a.assessmentDate
          ? new Date(a.assessmentDate).toISOString().slice(0, 10)
          : '',
        duration: a.duration ?? '',
        score: a.score ?? '',
        rawScore: a.rawScore ?? '',
        maxRawScore: a.maxRawScore ?? '',
        interpretation: a.interpretation || '',
        observations: a.observations || '',
        strengths: (a.strengths || []).join('\n'),
        concerns: (a.concerns || []).join('\n'),
        recommendations: (a.recommendations || []).join('\n'),
        status: a.status || 'completed',
        scoreBreakdown: a.scoreBreakdown || [],
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
    if (!form.beneficiary) {
      setFormErr('المستفيد مطلوب');
      return;
    }
    if (!form.tool) {
      setFormErr('أداة التقييم مطلوبة');
      return;
    }
    if (!form.assessmentDate) {
      setFormErr('تاريخ التقييم مطلوب');
      return;
    }
    setSaving(true);
    try {
      const toArr = s =>
        String(s || '')
          .split('\n')
          .map(x => x.trim())
          .filter(Boolean);
      const payload = {
        beneficiary: form.beneficiary?.id,
        therapist: form.therapist?.id || undefined,
        tool: form.tool,
        toolVersion: form.toolVersion || undefined,
        category: form.category,
        assessmentDate: form.assessmentDate,
        duration: form.duration ? Number(form.duration) : undefined,
        score: form.score !== '' ? Number(form.score) : undefined,
        rawScore: form.rawScore !== '' ? Number(form.rawScore) : undefined,
        maxRawScore: form.maxRawScore !== '' ? Number(form.maxRawScore) : undefined,
        interpretation: form.interpretation || undefined,
        observations: form.observations || undefined,
        strengths: toArr(form.strengths),
        concerns: toArr(form.concerns),
        recommendations: toArr(form.recommendations),
        status: form.status,
        scoreBreakdown: form.scoreBreakdown,
      };
      if (editMode) {
        await api.patch(`/admin/assessments/${form._id}`, payload);
      } else {
        await api.post('/admin/assessments', payload);
      }
      setDialogOpen(false);
      resetForm();
      loadStats();
      loadList();
    } catch (err) {
      setFormErr(err?.response?.data?.message || err?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const doArchive = async row => {
    if (!window.confirm(`أرشفة تقييم "${row.tool}"؟`)) return;
    try {
      await api.delete(`/admin/assessments/${row._id}`);
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الأرشفة');
    }
  };

  const openTrend = async benId => {
    setTrendDialog({ open: true, loading: true, data: null });
    try {
      const { data } = await api.get(`/admin/assessments/beneficiary/${benId}/trend`);
      setTrendDialog({ open: true, loading: false, data });
    } catch (err) {
      setTrendDialog({
        open: true,
        loading: false,
        data: { error: err?.response?.data?.message || 'فشل التحميل' },
      });
    }
  };

  const addBreakdownRow = () => {
    setForm(f => ({
      ...f,
      scoreBreakdown: [...f.scoreBreakdown, { domain: '', score: '', maxScore: '' }],
    }));
  };
  const updateBreakdown = (i, key, val) => {
    setForm(f => ({
      ...f,
      scoreBreakdown: f.scoreBreakdown.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)),
    }));
  };
  const removeBreakdown = i => {
    setForm(f => ({ ...f, scoreBreakdown: f.scoreBreakdown.filter((_, idx) => idx !== i) }));
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'إجمالي التقييمات',
        value: stats.total || 0,
        icon: <AssessmentIcon />,
        color: 'primary.main',
      },
      {
        label: 'آخر 30 يوماً',
        value: stats.last30days || 0,
        icon: <EventIcon />,
        color: 'info.main',
      },
      {
        label: 'متوسط الدرجة',
        value: stats.avgScore != null ? `${stats.avgScore}/100` : '—',
        icon: <ScoreIcon />,
        color: 'success.main',
      },
      {
        label: 'الأدوات المستخدمة',
        value: (stats.topTools || []).length,
        icon: <TrendingUpIcon />,
        color: 'warning.main',
      },
    ];
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            مكتبة التقييمات السريرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة تقييمات المستفيدين — CARS, VB-MAPP, Vineland, Denver-II وغيرها — مع تتبع
            الاتجاهات.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton
              onClick={() => {
                loadStats();
                loadList();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            تقييم جديد
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
          <Grid item xs={6} md={3} key={i}>
            <Card>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
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
            placeholder="بحث أداة / ملاحظات..."
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الفئة</InputLabel>
            <Select label="الفئة" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>الحالة</InputLabel>
            <Select label="الحالة" value={status} onChange={e => setStatus(e.target.value)}>
              <MenuItem value="">الكل</MenuItem>
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            freeSolo
            options={toolOpts}
            value={tool}
            onChange={(_, v) => setTool(v || '')}
            inputValue={tool}
            onInputChange={(_, v) => setTool(v || '')}
            size="small"
            sx={{ minWidth: 180 }}
            renderInput={p => <TextField {...p} label="الأداة" />}
          />
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
              <TableCell>التاريخ</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>الأداة</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الدرجة</TableCell>
              <TableCell>التفسير</TableCell>
              <TableCell>التغيّر</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد تقييمات
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(a => (
              <TableRow key={a._id} hover>
                <TableCell>
                  {a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString('ar-SA') : '—'}
                </TableCell>
                <TableCell>{fullName(a.beneficiary) || '—'}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {a.tool}
                  </Typography>
                  {a.toolVersion && (
                    <Typography variant="caption" color="text.secondary">
                      {a.toolVersion}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>{CATEGORY_LABELS[a.category] || a.category}</TableCell>
                <TableCell>
                  {a.score != null ? `${a.score}/100` : a.rawScore != null ? a.rawScore : '—'}
                </TableCell>
                <TableCell>
                  {a.interpretation ? (
                    <Chip
                      size="small"
                      label={INTERP_LABELS[a.interpretation] || a.interpretation}
                      color={INTERP_COLORS[a.interpretation] || 'default'}
                    />
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  {a.scoreChange == null ? (
                    '—'
                  ) : a.scoreChange > 0 ? (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TrendingUpIcon fontSize="small" color="success" />
                      <Typography variant="body2" color="success.main">
                        +{a.scoreChange}
                      </Typography>
                    </Stack>
                  ) : a.scoreChange < 0 ? (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TrendingDownIcon fontSize="small" color="error" />
                      <Typography variant="body2" color="error.main">
                        {a.scoreChange}
                      </Typography>
                    </Stack>
                  ) : (
                    '='
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[a.status] || a.status}
                    color={STATUS_COLORS[a.status] || 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => setDetailItem(a)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(a)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="مسار التقدّم">
                    <IconButton
                      size="small"
                      color="info"
                      onClick={() => openTrend(a.beneficiary?._id || a.beneficiary)}
                    >
                      <TrendingUpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="أرشفة">
                    <IconButton size="small" color="error" onClick={() => doArchive(a)}>
                      <ArchiveIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
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
            {pagination.total} تقييم · صفحة {pagination.page} من {pagination.pages || 1}
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
        <DialogTitle>{editMode ? 'تعديل التقييم' : 'تقييم جديد'}</DialogTitle>
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
                    ? { _id: form.beneficiary.id, name_ar: form.beneficiary.label }
                    : null
                }
                onChange={v =>
                  setForm(f => ({
                    ...f,
                    beneficiary: v
                      ? {
                          id: v._id,
                          label: v.name_ar || v.name_en || v.beneficiaryNumber || '—',
                        }
                      : null,
                  }))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={therapistOpts}
                value={form.therapist}
                onChange={(_, v) => setForm(f => ({ ...f, therapist: v }))}
                getOptionLabel={o => o?.label || ''}
                isOptionEqualToValue={(a, b) => a?.id === b?.id}
                renderInput={p => <TextField {...p} label="المُقيِّم" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                freeSolo
                options={toolOpts}
                value={form.tool}
                onChange={(_, v) => setForm(f => ({ ...f, tool: v || '' }))}
                inputValue={form.tool}
                onInputChange={(_, v) => setForm(f => ({ ...f, tool: v || '' }))}
                renderInput={p => <TextField {...p} label="الأداة *" />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="إصدار الأداة"
                value={form.toolVersion}
                onChange={e => setForm(f => ({ ...f, toolVersion: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  label="الفئة"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.filter(c => c.value).map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ التقييم *"
                InputLabelProps={{ shrink: true }}
                value={form.assessmentDate}
                onChange={e => setForm(f => ({ ...f, assessmentDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="number"
                label="المدة (د)"
                value={form.duration}
                onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0, max: 100 }}
                label="الدرجة (/100)"
                value={form.score}
                onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="الخام"
                value={form.rawScore}
                onChange={e => setForm(f => ({ ...f, rawScore: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأقصى"
                value={form.maxRawScore}
                onChange={e => setForm(f => ({ ...f, maxRawScore: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>التفسير</InputLabel>
                <Select
                  label="التفسير"
                  value={form.interpretation}
                  onChange={e => setForm(f => ({ ...f, interpretation: e.target.value }))}
                >
                  <MenuItem value="">—</MenuItem>
                  {INTERPRETATIONS.map(i => (
                    <MenuItem key={i.value} value={i.value}>
                      {i.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  label="الحالة"
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                >
                  {STATUS_OPTIONS.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الملاحظات السريرية"
                value={form.observations}
                onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="نقاط القوة (سطر/بند)"
                value={form.strengths}
                onChange={e => setForm(f => ({ ...f, strengths: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="مجالات الاهتمام (سطر/بند)"
                value={form.concerns}
                onChange={e => setForm(f => ({ ...f, concerns: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="التوصيات (سطر/بند)"
                value={form.recommendations}
                onChange={e => setForm(f => ({ ...f, recommendations: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2">التفصيل حسب المجال</Typography>
                <Button size="small" onClick={addBreakdownRow}>
                  + إضافة مجال
                </Button>
              </Stack>
              {form.scoreBreakdown.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  اختياري — أضف الدرجات الفرعية لكل مجال
                </Typography>
              )}
              {form.scoreBreakdown.map((r, i) => (
                <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
                  <Grid item xs={5}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="اسم المجال"
                      value={r.domain}
                      onChange={e => updateBreakdown(i, 'domain', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="الدرجة"
                      value={r.score}
                      onChange={e => updateBreakdown(i, 'score', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="الحد الأقصى"
                      value={r.maxScore}
                      onChange={e => updateBreakdown(i, 'maxScore', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton size="small" color="error" onClick={() => removeBreakdown(i)}>
                      ×
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
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

      {/* Detail dialog */}
      <Dialog
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>تفاصيل التقييم</DialogTitle>
        <DialogContent dividers>
          {detailItem && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  الأداة
                </Typography>
                <Typography fontWeight={500}>
                  {detailItem.tool}
                  {detailItem.toolVersion ? ` · ${detailItem.toolVersion}` : ''}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  التاريخ
                </Typography>
                <Typography>
                  {detailItem.assessmentDate
                    ? new Date(detailItem.assessmentDate).toLocaleDateString('ar-SA')
                    : '—'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  المستفيد
                </Typography>
                <Typography>{fullName(detailItem.beneficiary) || '—'}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  المقيِّم
                </Typography>
                <Typography>{fullName(detailItem.therapist) || '—'}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  الدرجة
                </Typography>
                <Typography fontWeight={500}>
                  {detailItem.score != null ? `${detailItem.score} / 100` : '—'}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  السابقة
                </Typography>
                <Typography>
                  {detailItem.previousScore != null ? detailItem.previousScore : '—'}
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="caption" color="text.secondary">
                  التغيّر
                </Typography>
                <Typography
                  color={
                    detailItem.scoreChange > 0
                      ? 'success.main'
                      : detailItem.scoreChange < 0
                        ? 'error.main'
                        : 'text.primary'
                  }
                >
                  {detailItem.scoreChange != null
                    ? `${detailItem.scoreChange > 0 ? '+' : ''}${detailItem.scoreChange}`
                    : '—'}
                </Typography>
              </Grid>
              {detailItem.observations && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    الملاحظات
                  </Typography>
                  <Typography>{detailItem.observations}</Typography>
                </Grid>
              )}
              {detailItem.scoreBreakdown?.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" mb={1}>
                    التفصيل حسب المجال
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>المجال</TableCell>
                        <TableCell>الدرجة</TableCell>
                        <TableCell>النسبة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailItem.scoreBreakdown.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell>{b.domain}</TableCell>
                          <TableCell>
                            {b.score}/{b.maxScore}
                          </TableCell>
                          <TableCell>
                            {b.maxScore
                              ? `${Math.round(((b.score || 0) / b.maxScore) * 100)}%`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
              )}
              {['strengths', 'concerns', 'recommendations'].map(k =>
                detailItem[k]?.length > 0 ? (
                  <Grid item xs={4} key={k}>
                    <Typography variant="caption" color="text.secondary">
                      {k === 'strengths'
                        ? 'نقاط القوة'
                        : k === 'concerns'
                          ? 'مجالات الاهتمام'
                          : 'التوصيات'}
                    </Typography>
                    {detailItem[k].map((item, i) => (
                      <Typography variant="body2" key={i}>
                        • {item}
                      </Typography>
                    ))}
                  </Grid>
                ) : null
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailItem(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Trend dialog */}
      <Dialog
        open={trendDialog.open}
        onClose={() => setTrendDialog({ open: false, loading: false, data: null })}
        maxWidth="md"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>مسار التقدّم عبر الأدوات</DialogTitle>
        <DialogContent dividers>
          {trendDialog.loading && <LinearProgress />}
          {trendDialog.data?.error && <Alert severity="error">{trendDialog.data.error}</Alert>}
          {trendDialog.data?.byTool &&
            Object.keys(trendDialog.data.byTool).map(t => {
              const rows = trendDialog.data.byTool[t];
              return (
                <Box key={t} mb={2}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {t} — {rows.length} تقييم
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>الدرجة</TableCell>
                        <TableCell>الخام</TableCell>
                        <TableCell>التفسير</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            {r.date ? new Date(r.date).toLocaleDateString('ar-SA') : '—'}
                          </TableCell>
                          <TableCell>{r.score != null ? `${r.score}/100` : '—'}</TableCell>
                          <TableCell>{r.rawScore ?? '—'}</TableCell>
                          <TableCell>
                            {r.interpretation ? INTERP_LABELS[r.interpretation] : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              );
            })}
          {trendDialog.data?.byTool && Object.keys(trendDialog.data.byTool).length === 0 && (
            <Typography color="text.secondary">لا توجد تقييمات لهذا المستفيد.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrendDialog({ open: false, loading: false, data: null })}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
