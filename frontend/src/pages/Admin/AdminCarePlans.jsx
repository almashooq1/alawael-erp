/**
 * AdminCarePlans — /admin/care-plans page.
 *
 * Care plan management covering 3 plan types (Educational IEP, Therapeutic,
 * Life Skills) with goal tracking per domain.
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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FlagIcon from '@mui/icons-material/Flag';
import SchoolIcon from '@mui/icons-material/School';
import HealingIcon from '@mui/icons-material/Healing';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AssignmentIcon from '@mui/icons-material/Assignment';
import api from '../../services/api.client';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'مسودّة', color: 'default' },
  { value: 'ACTIVE', label: 'نشطة', color: 'success' },
  { value: 'ARCHIVED', label: 'مؤرشفة', color: 'default' },
];
const STATUS_LABELS = STATUS_OPTIONS.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});
const STATUS_COLORS = STATUS_OPTIONS.reduce((a, s) => ({ ...a, [s.value]: s.color }), {});

const GOAL_TYPES = [
  { value: 'ACADEMIC', label: 'أكاديمي' },
  { value: 'BEHAVIORAL', label: 'سلوكي' },
  { value: 'COMMUNICATION', label: 'تواصل' },
  { value: 'MOTOR', label: 'حركي' },
  { value: 'SPEECH', label: 'نطق' },
  { value: 'SOCIAL', label: 'اجتماعي' },
  { value: 'LIFE_SKILL', label: 'مهارة حياتية' },
  { value: 'OTHER', label: 'أخرى' },
];
const GOAL_STATUS = [
  { value: 'PENDING', label: 'منتظر', color: 'default' },
  { value: 'IN_PROGRESS', label: 'قيد التنفيذ', color: 'info' },
  { value: 'ACHIEVED', label: 'محقَّق', color: 'success' },
  { value: 'DISCONTINUED', label: 'موقوف', color: 'error' },
];
const GOAL_STATUS_LABELS = GOAL_STATUS.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});
const GOAL_STATUS_COLORS = GOAL_STATUS.reduce((a, s) => ({ ...a, [s.value]: s.color }), {});

const DOMAINS = {
  educational: {
    label: 'الخطة التربوية (IEP)',
    icon: <SchoolIcon />,
    color: '#1976d2',
    domains: {
      academic: 'أكاديمي',
      classroom: 'صف دراسي',
      communication: 'تواصل',
    },
  },
  therapeutic: {
    label: 'الخطة العلاجية',
    icon: <HealingIcon />,
    color: '#9c27b0',
    domains: {
      speech: 'نطق ولغة',
      occupational: 'علاج وظيفي',
      physical: 'علاج طبيعي',
      behavioral: 'علاج سلوكي',
      psychological: 'علاج نفسي',
    },
  },
  lifeSkills: {
    label: 'المهارات الحياتية',
    icon: <HomeWorkIcon />,
    color: '#ed6c02',
    domains: {
      selfCare: 'العناية الذاتية',
      homeSkills: 'مهارات منزلية',
      social: 'اجتماعي',
      transport: 'تنقُّل',
      financial: 'مالي',
    },
  },
};

const EMPTY_PLAN = {
  beneficiary: null,
  planNumber: '',
  startDate: new Date().toISOString().slice(0, 10),
  reviewDate: '',
  status: 'DRAFT',
  educational: { enabled: false },
  therapeutic: { enabled: false },
  lifeSkills: { enabled: false },
};

const EMPTY_GOAL = {
  title: '',
  description: '',
  type: 'ACADEMIC',
  baseline: '',
  target: '',
  criteria: '',
  startDate: '',
  targetDate: '',
  status: 'PENDING',
  progress: 0,
};

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}

export default function AdminCarePlans() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [stats, setStats] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [formErr, setFormErr] = useState('');
  const [saving, setSaving] = useState(false);

  const [detailPlan, setDetailPlan] = useState(null);
  const [goalDialog, setGoalDialog] = useState({
    open: false,
    planId: null,
    domainPath: '',
    goalId: null,
    data: EMPTY_GOAL,
    saving: false,
    err: '',
  });

  const [beneficiaryOpts, setBeneficiaryOpts] = useState([]);
  const [beneficiaryMap, setBeneficiaryMap] = useState({});

  const loadOptions = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/beneficiaries?limit=200');
      const list = data?.items || [];
      setBeneficiaryOpts(
        list.map(x => ({
          id: x._id,
          label: `${fullName(x)} (${x.beneficiaryNumber || '—'})`,
        }))
      );
      setBeneficiaryMap(Object.fromEntries(list.map(x => [x._id, fullName(x)])));
    } catch {
      setBeneficiaryOpts([]);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/care-plans/stats');
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
      params.set('page', pagination.page);
      params.set('limit', pagination.limit);
      const { data } = await api.get(`/admin/care-plans?${params.toString()}`);
      setItems(data?.items || []);
      if (data?.pagination) setPagination(p => ({ ...p, ...data.pagination }));
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    } finally {
      setLoading(false);
    }
  }, [q, status, pagination.page, pagination.limit]);

  useEffect(() => {
    loadOptions();
    loadStats();
  }, [loadOptions, loadStats]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openCreate = () => {
    setForm(EMPTY_PLAN);
    setEditMode(false);
    setFormErr('');
    setDialogOpen(true);
  };

  const openEdit = async plan => {
    try {
      const { data } = await api.get(`/admin/care-plans/${plan._id}`);
      const p = data?.data || plan;
      const benId = typeof p.beneficiary === 'string' ? p.beneficiary : p.beneficiary?._id;
      setForm({
        _id: p._id,
        beneficiary: benId ? { id: benId, label: beneficiaryMap[benId] || 'مستفيد' } : null,
        planNumber: p.planNumber || '',
        startDate: p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : '',
        reviewDate: p.reviewDate ? new Date(p.reviewDate).toISOString().slice(0, 10) : '',
        status: p.status || 'DRAFT',
        educational: { enabled: !!p.educational?.enabled },
        therapeutic: { enabled: !!p.therapeutic?.enabled },
        lifeSkills: { enabled: !!p.lifeSkills?.enabled },
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
    if (!form.startDate) {
      setFormErr('تاريخ البداية مطلوب');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        beneficiary: form.beneficiary.id,
        planNumber: form.planNumber || undefined,
        startDate: form.startDate,
        reviewDate: form.reviewDate || undefined,
        status: form.status,
        educational: { enabled: form.educational.enabled },
        therapeutic: { enabled: form.therapeutic.enabled },
        lifeSkills: { enabled: form.lifeSkills.enabled },
      };
      if (editMode) {
        await api.patch(`/admin/care-plans/${form._id}`, payload);
      } else {
        await api.post('/admin/care-plans', payload);
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

  const openDetail = async plan => {
    try {
      const { data } = await api.get(`/admin/care-plans/${plan._id}`);
      setDetailPlan(data?.data || plan);
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل التحميل');
    }
  };

  const openAddGoal = (planId, domainPath) => {
    setGoalDialog({
      open: true,
      planId,
      domainPath,
      goalId: null,
      data: EMPTY_GOAL,
      saving: false,
      err: '',
    });
  };

  const openEditGoal = (planId, goal) => {
    setGoalDialog({
      open: true,
      planId,
      domainPath: '',
      goalId: goal._id,
      data: {
        title: goal.title || '',
        description: goal.description || '',
        type: goal.type || 'ACADEMIC',
        baseline: goal.baseline || '',
        target: goal.target || '',
        criteria: goal.criteria || '',
        startDate: goal.startDate ? new Date(goal.startDate).toISOString().slice(0, 10) : '',
        targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().slice(0, 10) : '',
        status: goal.status || 'PENDING',
        progress: goal.progress ?? 0,
      },
      saving: false,
      err: '',
    });
  };

  const submitGoal = async () => {
    setGoalDialog(g => ({ ...g, saving: true, err: '' }));
    try {
      const { planId, domainPath, goalId, data } = goalDialog;
      if (goalId) {
        await api.patch(`/admin/care-plans/${planId}/goals/${goalId}`, data);
      } else {
        await api.post(`/admin/care-plans/${planId}/goals/${domainPath}`, data);
      }
      setGoalDialog({
        open: false,
        planId: null,
        domainPath: '',
        goalId: null,
        data: EMPTY_GOAL,
        saving: false,
        err: '',
      });
      // Refresh detail view
      if (detailPlan?._id === planId) openDetail({ _id: planId });
      loadStats();
    } catch (err) {
      setGoalDialog(g => ({
        ...g,
        saving: false,
        err: err?.response?.data?.message || 'فشل الحفظ',
      }));
    }
  };

  const doArchive = async plan => {
    if (!window.confirm(`أرشفة خطة "${plan.planNumber || '—'}"؟`)) return;
    try {
      await api.delete(`/admin/care-plans/${plan._id}`);
      loadStats();
      loadList();
    } catch (err) {
      setErrMsg(err?.response?.data?.message || 'فشل الأرشفة');
    }
  };

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        label: 'إجمالي الخطط',
        value: stats.total || 0,
        icon: <AssignmentIcon />,
        color: 'primary.main',
      },
      {
        label: 'خطط نشطة',
        value: stats.active || 0,
        icon: <FlagIcon />,
        color: 'success.main',
      },
      {
        label: 'تستحق المراجعة (30د)',
        value: stats.dueReview30d || 0,
        icon: <TrendingUpIcon />,
        color: 'warning.main',
      },
      {
        label: 'أهداف محقَّقة',
        value: stats.goals?.ACHIEVED?.count || 0,
        icon: <FlagIcon />,
        color: 'success.main',
      },
    ];
  }, [stats]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            خطط الرعاية الفردية (IEP)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            خطط تربوية + علاجية + مهارات حياتية، مع تتبّع الأهداف وقياس التقدّم.
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
            خطة جديدة
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
            placeholder="بحث برقم الخطة..."
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الحالة</InputLabel>
            <Select label="الحالة" value={status} onChange={e => setStatus(e.target.value)}>
              <MenuItem value="">كل الحالات</MenuItem>
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>رقم الخطة</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>البداية</TableCell>
              <TableCell>المراجعة</TableCell>
              <TableCell>المكوّنات</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {items.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={3}>
                    لا توجد خطط
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {items.map(p => (
              <TableRow key={p._id} hover>
                <TableCell>{p.planNumber || '—'}</TableCell>
                <TableCell>{beneficiaryMap[p.beneficiary] || '—'}</TableCell>
                <TableCell>
                  {p.startDate ? new Date(p.startDate).toLocaleDateString('ar-SA') : '—'}
                </TableCell>
                <TableCell>
                  {p.reviewDate ? new Date(p.reviewDate).toLocaleDateString('ar-SA') : '—'}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    {p.educational?.enabled && (
                      <Tooltip title="تربوية">
                        <SchoolIcon fontSize="small" sx={{ color: DOMAINS.educational.color }} />
                      </Tooltip>
                    )}
                    {p.therapeutic?.enabled && (
                      <Tooltip title="علاجية">
                        <HealingIcon fontSize="small" sx={{ color: DOMAINS.therapeutic.color }} />
                      </Tooltip>
                    )}
                    {p.lifeSkills?.enabled && (
                      <Tooltip title="مهارات حياتية">
                        <HomeWorkIcon fontSize="small" sx={{ color: DOMAINS.lifeSkills.color }} />
                      </Tooltip>
                    )}
                    {!p.educational?.enabled &&
                      !p.therapeutic?.enabled &&
                      !p.lifeSkills?.enabled && (
                        <Typography variant="caption" color="text.secondary">
                          لا يوجد
                        </Typography>
                      )}
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={STATUS_LABELS[p.status] || p.status}
                    color={STATUS_COLORS[p.status] || 'default'}
                  />
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="عرض">
                    <IconButton size="small" onClick={() => openDetail(p)}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEdit(p)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="أرشفة">
                    <IconButton size="small" color="error" onClick={() => doArchive(p)}>
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
            {pagination.total} خطة · صفحة {pagination.page} من {pagination.pages || 1}
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

      {/* Create/Edit dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{editMode ? 'تعديل الخطة' : 'خطة جديدة'}</DialogTitle>
        <DialogContent dividers>
          {formErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErr}
            </Alert>
          )}
          <Stack spacing={2}>
            <Autocomplete
              options={beneficiaryOpts}
              value={form.beneficiary}
              onChange={(_, v) => setForm(f => ({ ...f, beneficiary: v }))}
              getOptionLabel={o => o?.label || ''}
              isOptionEqualToValue={(a, b) => a?.id === b?.id}
              renderInput={p => <TextField {...p} label="المستفيد *" />}
            />
            <TextField
              fullWidth
              label="رقم الخطة (يُولَّد تلقائياً إذا تُرك فارغاً)"
              value={form.planNumber}
              onChange={e => setForm(f => ({ ...f, planNumber: e.target.value }))}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البدء *"
                InputLabelProps={{ shrink: true }}
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              />
              <TextField
                fullWidth
                type="date"
                label="تاريخ المراجعة"
                InputLabelProps={{ shrink: true }}
                value={form.reviewDate}
                onChange={e => setForm(f => ({ ...f, reviewDate: e.target.value }))}
              />
            </Stack>
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
            <Divider />
            <Typography variant="subtitle2">المكوّنات المُفعَّلة</Typography>
            {Object.entries(DOMAINS).map(([key, info]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={form[key]?.enabled || false}
                    onChange={e =>
                      setForm(f => ({ ...f, [key]: { ...f[key], enabled: e.target.checked } }))
                    }
                  />
                }
                label={
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ color: info.color }}>{info.icon}</Box>
                    <span>{info.label}</span>
                  </Stack>
                }
              />
            ))}
          </Stack>
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
        open={Boolean(detailPlan)}
        onClose={() => setDetailPlan(null)}
        maxWidth="lg"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>
          الخطة {detailPlan?.planNumber || '—'} · {beneficiaryMap[detailPlan?.beneficiary] || '—'}
        </DialogTitle>
        <DialogContent dividers>
          {detailPlan &&
            Object.entries(DOMAINS).map(([planKey, info]) => {
              const section = detailPlan[planKey];
              if (!section?.enabled) return null;
              return (
                <Accordion key={planKey} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ color: info.color }}>{info.icon}</Box>
                      <Typography variant="h6">{info.label}</Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    {Object.entries(info.domains).map(([domKey, domLabel]) => {
                      const dom = section.domains?.[domKey] || {};
                      const goals = dom.goals || [];
                      return (
                        <Box key={domKey} mb={2}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            mb={1}
                          >
                            <Typography variant="subtitle1" fontWeight={600}>
                              {domLabel}
                            </Typography>
                            <Button
                              size="small"
                              startIcon={<AddIcon />}
                              onClick={() => openAddGoal(detailPlan._id, `${planKey}.${domKey}`)}
                            >
                              إضافة هدف
                            </Button>
                          </Stack>
                          {goals.length === 0 ? (
                            <Typography variant="caption" color="text.secondary">
                              لا توجد أهداف
                            </Typography>
                          ) : (
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>الهدف</TableCell>
                                  <TableCell>النوع</TableCell>
                                  <TableCell>التقدّم</TableCell>
                                  <TableCell>الحالة</TableCell>
                                  <TableCell>المستهدَف</TableCell>
                                  <TableCell></TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {goals.map(g => (
                                  <TableRow key={g._id}>
                                    <TableCell>
                                      <Typography variant="body2" fontWeight={500}>
                                        {g.title}
                                      </Typography>
                                      {g.target && (
                                        <Typography variant="caption" color="text.secondary">
                                          {g.target}
                                        </Typography>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {GOAL_TYPES.find(t => t.value === g.type)?.label || g.type}
                                    </TableCell>
                                    <TableCell sx={{ width: 120 }}>
                                      <Stack direction="row" alignItems="center" spacing={1}>
                                        <LinearProgress
                                          variant="determinate"
                                          value={g.progress || 0}
                                          sx={{ flex: 1, height: 8, borderRadius: 1 }}
                                        />
                                        <Typography variant="caption">
                                          {g.progress || 0}%
                                        </Typography>
                                      </Stack>
                                    </TableCell>
                                    <TableCell>
                                      <Chip
                                        size="small"
                                        label={GOAL_STATUS_LABELS[g.status] || g.status}
                                        color={GOAL_STATUS_COLORS[g.status] || 'default'}
                                      />
                                    </TableCell>
                                    <TableCell>
                                      {g.targetDate
                                        ? new Date(g.targetDate).toLocaleDateString('ar-SA')
                                        : '—'}
                                    </TableCell>
                                    <TableCell>
                                      <IconButton
                                        size="small"
                                        onClick={() => openEditGoal(detailPlan._id, g)}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          {detailPlan &&
            !detailPlan.educational?.enabled &&
            !detailPlan.therapeutic?.enabled &&
            !detailPlan.lifeSkills?.enabled && (
              <Alert severity="info">
                لم يتم تفعيل أي مكوّن في هذه الخطة. عدّل الخطة لتفعيل المكوّنات المطلوبة.
              </Alert>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailPlan(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Goal dialog (add/edit) */}
      <Dialog
        open={goalDialog.open}
        onClose={() =>
          setGoalDialog({
            open: false,
            planId: null,
            domainPath: '',
            goalId: null,
            data: EMPTY_GOAL,
            saving: false,
            err: '',
          })
        }
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle>{goalDialog.goalId ? 'تعديل هدف' : 'إضافة هدف جديد'}</DialogTitle>
        <DialogContent dividers>
          {goalDialog.err && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {goalDialog.err}
            </Alert>
          )}
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="عنوان الهدف *"
              value={goalDialog.data.title}
              onChange={e =>
                setGoalDialog(g => ({ ...g, data: { ...g.data, title: e.target.value } }))
              }
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="الوصف"
              value={goalDialog.data.description}
              onChange={e =>
                setGoalDialog(g => ({ ...g, data: { ...g.data, description: e.target.value } }))
              }
            />
            <Stack direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>النوع</InputLabel>
                <Select
                  label="النوع"
                  value={goalDialog.data.type}
                  onChange={e =>
                    setGoalDialog(g => ({ ...g, data: { ...g.data, type: e.target.value } }))
                  }
                >
                  {GOAL_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  label="الحالة"
                  value={goalDialog.data.status}
                  onChange={e =>
                    setGoalDialog(g => ({ ...g, data: { ...g.data, status: e.target.value } }))
                  }
                >
                  {GOAL_STATUS.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              fullWidth
              label="المستوى الحالي (baseline)"
              value={goalDialog.data.baseline}
              onChange={e =>
                setGoalDialog(g => ({ ...g, data: { ...g.data, baseline: e.target.value } }))
              }
            />
            <TextField
              fullWidth
              label="المستوى المستهدَف"
              value={goalDialog.data.target}
              onChange={e =>
                setGoalDialog(g => ({ ...g, data: { ...g.data, target: e.target.value } }))
              }
            />
            <TextField
              fullWidth
              label='معايير الإتقان (مثال: "80% دقّة")'
              value={goalDialog.data.criteria}
              onChange={e =>
                setGoalDialog(g => ({ ...g, data: { ...g.data, criteria: e.target.value } }))
              }
            />
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البدء"
                InputLabelProps={{ shrink: true }}
                value={goalDialog.data.startDate}
                onChange={e =>
                  setGoalDialog(g => ({ ...g, data: { ...g.data, startDate: e.target.value } }))
                }
              />
              <TextField
                fullWidth
                type="date"
                label="تاريخ الاستحقاق"
                InputLabelProps={{ shrink: true }}
                value={goalDialog.data.targetDate}
                onChange={e =>
                  setGoalDialog(g => ({ ...g, data: { ...g.data, targetDate: e.target.value } }))
                }
              />
            </Stack>
            <TextField
              fullWidth
              type="number"
              inputProps={{ min: 0, max: 100 }}
              label="نسبة التقدّم (%)"
              value={goalDialog.data.progress}
              onChange={e =>
                setGoalDialog(g => ({
                  ...g,
                  data: { ...g.data, progress: Number(e.target.value) || 0 },
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setGoalDialog({
                open: false,
                planId: null,
                domainPath: '',
                goalId: null,
                data: EMPTY_GOAL,
                saving: false,
                err: '',
              })
            }
            disabled={goalDialog.saving}
          >
            إلغاء
          </Button>
          <Button variant="contained" onClick={submitGoal} disabled={goalDialog.saving}>
            {goalDialog.saving ? (
              <CircularProgress size={20} />
            ) : goalDialog.goalId ? (
              'حفظ'
            ) : (
              'إضافة'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
