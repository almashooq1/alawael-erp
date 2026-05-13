/**
 * Therapeutic Goals Management Page — إدارة الأهداف العلاجية
 *
 * الهدف السريري: تتبع الأهداف العلاجية المرتبطة بالمستفيد والحلقة وخطة الرعاية.
 * يدعم: إنشاء أهداف SMART، تسجيل التقدم، عرض الإحصائيات حسب النطاق.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  LinearProgress,
  Avatar,
  Tooltip,
  CircularProgress,
  Slider,
  Collapse,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  TrackChanges as GoalIcon,
  CheckCircle as AchievedIcon,
  HourglassBottom as DraftIcon,
  PlayCircleOutlined as ActiveIcon,
  Cancel as DiscontinuedIcon,
  TrendingUp as ProgressIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Update as UpdateIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { goalsAPI, episodesAPI } from '../../services/ddd';

// ── Constants ────────────────────────────────────────────────────────────────
const GOAL_TYPES = [
  { value: 'long_term', label: 'طويل المدى' },
  { value: 'short_term', label: 'قصير المدى' },
  { value: 'session', label: 'هدف الجلسة' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'discharge', label: 'الخروج' },
];

const GOAL_DOMAINS = [
  { value: 'motor_gross', label: 'الحركة الكبيرة' },
  { value: 'motor_fine', label: 'الحركة الدقيقة' },
  { value: 'speech', label: 'النطق' },
  { value: 'language', label: 'اللغة' },
  { value: 'communication', label: 'التواصل' },
  { value: 'cognitive', label: 'الإدراك المعرفي' },
  { value: 'social', label: 'الاجتماعي' },
  { value: 'behavioral', label: 'السلوكي' },
  { value: 'sensory', label: 'الحسي' },
  { value: 'self_care', label: 'العناية الذاتية' },
  { value: 'academic', label: 'الأكاديمي' },
  { value: 'vocational', label: 'المهني' },
  { value: 'play', label: 'اللعب' },
  { value: 'feeding', label: 'التغذية' },
  { value: 'community', label: 'المجتمعي' },
  { value: 'emotional', label: 'العاطفي' },
  { value: 'adaptive', label: 'التكيفي' },
  { value: 'other', label: 'أخرى' },
];

const PRIORITIES = [
  { value: 'critical', label: 'حرج', color: '#d32f2f' },
  { value: 'high', label: 'عالي', color: '#f57c00' },
  { value: 'medium', label: 'متوسط', color: '#1976d2' },
  { value: 'low', label: 'منخفض', color: '#616161' },
];

const STATUS_CONFIG = {
  draft: { label: 'مسودة', color: 'default', Icon: DraftIcon, bg: '#9e9e9e' },
  active: { label: 'نشط', color: 'success', Icon: ActiveIcon, bg: '#4caf50' },
  achieved: { label: 'محقق', color: 'info', Icon: AchievedIcon, bg: '#2196f3' },
  discontinued: { label: 'متوقف', color: 'error', Icon: DiscontinuedIcon, bg: '#f44336' },
  modified: { label: 'معدّل', color: 'warning', Icon: EditIcon, bg: '#ff9800' },
};

const DOMAIN_COLORS = [
  '#2196f3',
  '#4caf50',
  '#ff9800',
  '#9c27b0',
  '#00bcd4',
  '#f44336',
  '#3f51b5',
  '#8bc34a',
  '#ff5722',
  '#795548',
  '#607d8b',
  '#e91e63',
];

const INITIAL_FORM = {
  title: '',
  title_ar: '',
  description: '',
  type: 'short_term',
  domain: 'communication',
  priority: 'medium',
  episodeId: '',
  carePlanId: '',
  beneficiaryId: '',
  beneficiaryName: '',
  specific: '',
  measurable: '',
  achievable: '',
  relevant: '',
  timeBound: '',
  baselineValue: '',
  baselineDescription: '',
  targetValue: 100,
  targetDescription: '',
  targetCriteria: '',
  startDate: '',
  targetDate: '',
};

const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const getDomainLabel = v => GOAL_DOMAINS.find(d => d.value === v)?.label || v;
const getTypeLabel = v => GOAL_TYPES.find(t => t.value === v)?.label || v;

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, loading: busy }) {
  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${color}33` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          {busy ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="h4" fontWeight="bold" lineHeight={1}>
              {value ?? 0}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Progress Bar Row ──────────────────────────────────────────────────────────
function ProgressBar({ value, color = '#4caf50' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
      <LinearProgress
        variant="determinate"
        value={value || 0}
        sx={{ flex: 1, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: color } }}
      />
      <Typography variant="caption" sx={{ minWidth: 32 }}>
        {value || 0}%
      </Typography>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [tab, setTab] = useState(0);
  const [goals, setGoals] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const rowsPerPage = 20;

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [progressDialog, setProgressDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [progressValue, setProgressValue] = useState(50);
  const [progressNote, setProgressNote] = useState('');

  // Expanded rows
  const [expandedRow, setExpandedRow] = useState(null);

  // ── Fetch Goals ─────────────────────────────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: rowsPerPage,
        page,
        ...(filterStatus && { status: filterStatus }),
        ...(filterType && { type: filterType }),
        ...(filterDomain && { domain: filterDomain }),
      };
      const res = await goalsAPI.list(params);
      const items = res?.data?.data || res?.data?.goals || res?.data || [];
      setGoals(Array.isArray(items) ? items : []);
      setTotal(res?.data?.total || items.length || 0);
    } catch (err) {
      setError(err?.response?.data?.message || 'حدث خطأ أثناء تحميل الأهداف');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterType, filterDomain]);

  // ── Fetch Episodes ──────────────────────────────────────────────────────────
  useEffect(() => {
    episodesAPI
      .list({ status: 'active', limit: 200 })
      .then(res => {
        const items = res?.data?.episodes || res?.data?.data || res?.data || [];
        setEpisodes(Array.isArray(items) ? items : []);
      })
      .catch(() => setEpisodes([]));
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // ── Derived Stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = goals.filter(g => g.status === 'active').length;
    const achieved = goals.filter(g => g.status === 'achieved').length;
    const draft = goals.filter(g => g.status === 'draft').length;
    const avgProgress = goals.length
      ? Math.round(goals.reduce((s, g) => s + (g.currentProgress || 0), 0) / goals.length)
      : 0;
    return { total: goals.length, active, achieved, draft, avgProgress };
  }, [goals]);

  const domainData = useMemo(() => {
    const counts = {};
    goals.forEach(g => {
      if (g.domain) counts[g.domain] = (counts[g.domain] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([domain, count]) => ({ domain: getDomainLabel(domain), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [goals]);

  const pieData = useMemo(
    () =>
      [
        { name: 'نشط', value: stats.active, fill: '#4caf50' },
        { name: 'محقق', value: stats.achieved, fill: '#2196f3' },
        { name: 'مسودة', value: stats.draft, fill: '#9e9e9e' },
        {
          name: 'متوقف',
          value: goals.filter(g => g.status === 'discontinued').length,
          fill: '#f44336',
        },
      ].filter(d => d.value > 0),
    [stats, goals]
  );

  // ── Filtered View ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return goals;
    const q = search.toLowerCase();
    return goals.filter(
      g =>
        g.title?.toLowerCase().includes(q) ||
        g.title_ar?.toLowerCase().includes(q) ||
        g.beneficiaryId?.name?.toLowerCase().includes(q)
    );
  }, [goals, search]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditingGoal(null);
    setForm(INITIAL_FORM);
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenEdit = goal => {
    setEditingGoal(goal);
    setForm({
      title: goal.title || '',
      title_ar: goal.title_ar || '',
      description: goal.description || '',
      type: goal.type || 'short_term',
      domain: goal.domain || 'communication',
      priority: goal.priority || 'medium',
      episodeId: goal.episodeId?._id || goal.episodeId || '',
      carePlanId: goal.carePlanId?._id || goal.carePlanId || '',
      beneficiaryId: goal.beneficiaryId?._id || goal.beneficiaryId || '',
      beneficiaryName: goal.beneficiaryId?.name || '',
      specific: goal.specific || '',
      measurable: goal.measurable || '',
      achievable: goal.achievable || '',
      relevant: goal.relevant || '',
      timeBound: goal.timeBound || '',
      baselineValue: goal.baseline?.value ?? '',
      baselineDescription: goal.baseline?.description || '',
      targetValue: goal.target?.value ?? 100,
      targetDescription: goal.target?.description || '',
      targetCriteria: goal.target?.criteria || '',
      startDate: goal.startDate ? goal.startDate.slice(0, 10) : '',
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : '',
    });
    setFormError('');
    setOpenDialog(true);
  };

  const handleOpenView = goal => {
    setSelectedGoal(goal);
    setViewDialog(true);
  };

  const handleOpenProgress = goal => {
    setSelectedGoal(goal);
    setProgressValue(goal.currentProgress || 0);
    setProgressNote('');
    setProgressDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      setFormError('العنوان مطلوب');
      return;
    }
    if (!form.episodeId) {
      setFormError('حلقة الرعاية مطلوبة');
      return;
    }
    if (!form.beneficiaryId && !editingGoal) {
      setFormError('المستفيد مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        title: form.title,
        title_ar: form.title_ar || undefined,
        description: form.description || undefined,
        type: form.type,
        domain: form.domain,
        priority: form.priority,
        episodeId: form.episodeId,
        carePlanId: form.carePlanId || undefined,
        beneficiaryId:
          form.beneficiaryId || editingGoal?.beneficiaryId?._id || editingGoal?.beneficiaryId,
        specific: form.specific || undefined,
        measurable: form.measurable || undefined,
        achievable: form.achievable || undefined,
        relevant: form.relevant || undefined,
        timeBound: form.timeBound || undefined,
        baseline:
          form.baselineValue !== ''
            ? {
                value: Number(form.baselineValue),
                description: form.baselineDescription || undefined,
              }
            : undefined,
        target: {
          value: Number(form.targetValue) || 100,
          description: form.targetDescription || undefined,
          criteria: form.targetCriteria || undefined,
        },
        startDate: form.startDate || undefined,
        targetDate: form.targetDate || undefined,
      };
      if (editingGoal) {
        await goalsAPI.update(editingGoal._id, payload);
      } else {
        await goalsAPI.create(payload);
      }
      setOpenDialog(false);
      fetchGoals();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!selectedGoal) return;
    setSaving(true);
    try {
      await goalsAPI.recordProgress(selectedGoal._id, {
        value: progressValue,
        date: new Date().toISOString(),
        notes: progressNote || undefined,
      });
      setProgressDialog(false);
      fetchGoals();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ أثناء تسجيل التقدم');
    } finally {
      setSaving(false);
    }
  };

  const handleSetField = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Render: Episode select dropdown ─────────────────────────────────────────
  const selectedEpisode = episodes.find(e => e._id === form.episodeId);

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#673ab7', width: 44, height: 44 }}>
            <GoalIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              الأهداف العلاجية
            </Typography>
            <Typography variant="caption" color="text.secondary">
              إدارة أهداف SMART المرتبطة بالمستفيد والحلقة العلاجية
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchGoals} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{ bgcolor: '#673ab7', '&:hover': { bgcolor: '#512da8' } }}
          >
            هدف جديد
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="لوحة المؤشرات" />
        <Tab label={`قائمة الأهداف (${total})`} />
      </Tabs>

      {/* ── TAB 0: Dashboard ── */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="إجمالي الأهداف"
                value={stats.total}
                icon={<GoalIcon />}
                color="#673ab7"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="نشطة"
                value={stats.active}
                icon={<ActiveIcon />}
                color="#4caf50"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="محققة"
                value={stats.achieved}
                icon={<AchievedIcon />}
                color="#2196f3"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="متوسط التقدم"
                value={`${stats.avgProgress}%`}
                icon={<ProgressIcon />}
                color="#ff9800"
                loading={loading}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {/* Domain Bar Chart */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    توزيع الأهداف حسب النطاق
                  </Typography>
                  {domainData.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      لا توجد بيانات كافية
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={domainData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="domain"
                          angle={-35}
                          textAnchor="end"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis allowDecimals={false} />
                        <RechartTooltip />
                        <Bar dataKey="count" name="عدد الأهداف" radius={[4, 4, 0, 0]}>
                          {domainData.map((_, i) => (
                            <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Status Pie */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                    توزيع حسب الحالة
                  </Typography>
                  {pieData.length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      لا توجد بيانات
                    </Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend />
                        <RechartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── TAB 1: Goals List ── */}
      {tab === 1 && (
        <Box>
          {/* Search & Filters */}
          <Card sx={{ mb: 2, borderRadius: 2 }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="بحث في الأهداف..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Tooltip title="تصفية">
                  <IconButton onClick={() => setShowFilters(f => !f)}>
                    <FilterIcon color={showFilters ? 'primary' : 'inherit'} />
                  </IconButton>
                </Tooltip>
              </Stack>
              <Collapse in={showFilters}>
                <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>الحالة</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={e => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                      }}
                      label="الحالة"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                        <MenuItem key={v} value={v}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>النوع</InputLabel>
                    <Select
                      value={filterType}
                      onChange={e => {
                        setFilterType(e.target.value);
                        setPage(1);
                      }}
                      label="النوع"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {GOAL_TYPES.map(t => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>النطاق</InputLabel>
                    <Select
                      value={filterDomain}
                      onChange={e => {
                        setFilterDomain(e.target.value);
                        setPage(1);
                      }}
                      label="النطاق"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {GOAL_DOMAINS.map(d => (
                        <MenuItem key={d.value} value={d.value}>
                          {d.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button
                    size="small"
                    onClick={() => {
                      setFilterStatus('');
                      setFilterType('');
                      setFilterDomain('');
                      setSearch('');
                      setPage(1);
                    }}
                  >
                    مسح الفلاتر
                  </Button>
                </Stack>
              </Collapse>
            </CardContent>
          </Card>

          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell width={40} />
                  <TableCell>العنوان</TableCell>
                  <TableCell>النطاق</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التقدم</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      {loading ? 'جاري التحميل...' : 'لا توجد أهداف علاجية'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(goal => {
                    const sc = STATUS_CONFIG[goal.status] || STATUS_CONFIG.draft;
                    const priority = PRIORITIES.find(p => p.value === goal.priority);
                    const isExpanded = expandedRow === goal._id;
                    return [
                      <TableRow
                        key={goal._id}
                        hover
                        sx={{ '& > *': { borderBottom: isExpanded ? 0 : undefined } }}
                      >
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedRow(isExpanded ? null : goal._id)}
                          >
                            {isExpanded ? (
                              <CollapseIcon fontSize="small" />
                            ) : (
                              <ExpandIcon fontSize="small" />
                            )}
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight="medium"
                            noWrap
                            sx={{ maxWidth: 200 }}
                          >
                            {goal.title}
                          </Typography>
                          {goal.title_ar && (
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {goal.title_ar}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getDomainLabel(goal.domain)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{getTypeLabel(goal.type)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={priority?.label || goal.priority}
                            size="small"
                            sx={{
                              bgcolor: `${priority?.color}22`,
                              color: priority?.color,
                              fontWeight: 'bold',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={sc.label} color={sc.color} size="small" />
                        </TableCell>
                        <TableCell sx={{ minWidth: 140 }}>
                          <ProgressBar value={goal.currentProgress} color={sc.bg} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{fmtDate(goal.targetDate)}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="عرض">
                              <IconButton size="small" onClick={() => handleOpenView(goal)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton size="small" onClick={() => handleOpenEdit(goal)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تسجيل التقدم">
                              <IconButton size="small" onClick={() => handleOpenProgress(goal)}>
                                <UpdateIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>,
                      <TableRow key={`${goal._id}-detail`}>
                        <TableCell colSpan={9} sx={{ p: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Grid container spacing={2}>
                                {goal.specific && (
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary">
                                      محدد (S)
                                    </Typography>
                                    <Typography variant="body2">{goal.specific}</Typography>
                                  </Grid>
                                )}
                                {goal.measurable && (
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary">
                                      قابل للقياس (M)
                                    </Typography>
                                    <Typography variant="body2">{goal.measurable}</Typography>
                                  </Grid>
                                )}
                                {goal.target?.description && (
                                  <Grid item xs={12} sm={6} md={4}>
                                    <Typography variant="caption" color="text.secondary">
                                      الهدف
                                    </Typography>
                                    <Typography variant="body2">
                                      {goal.target.description}
                                    </Typography>
                                  </Grid>
                                )}
                                {goal.description && (
                                  <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary">
                                      الوصف
                                    </Typography>
                                    <Typography variant="body2">{goal.description}</Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>,
                    ];
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── Create / Edit Dialog ── */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">
              {editingGoal ? 'تعديل الهدف العلاجي' : 'إنشاء هدف علاجي جديد'}
            </Typography>
            <IconButton onClick={() => setOpenDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="عنوان الهدف *"
                value={form.title}
                onChange={handleSetField('title')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع *</InputLabel>
                <Select value={form.type} onChange={handleSetField('type')} label="النوع *">
                  {GOAL_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="العنوان بالعربية"
                value={form.title_ar}
                onChange={handleSetField('title_ar')}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  onChange={handleSetField('priority')}
                  label="الأولوية"
                >
                  {PRIORITIES.map(p => (
                    <MenuItem key={p.value} value={p.value}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>النطاق *</InputLabel>
                <Select value={form.domain} onChange={handleSetField('domain')} label="النطاق *">
                  {GOAL_DOMAINS.map(d => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>حلقة الرعاية *</InputLabel>
                <Select
                  value={form.episodeId}
                  onChange={handleSetField('episodeId')}
                  label="حلقة الرعاية *"
                >
                  <MenuItem value="">اختر حلقة...</MenuItem>
                  {episodes.map(ep => (
                    <MenuItem key={ep._id} value={ep._id}>
                      {ep.episodeNumber || ep._id.slice(-6)} — {ep.beneficiaryId?.name || 'مستفيد'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {selectedEpisode && !editingGoal && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  المستفيد: {selectedEpisode.beneficiaryId?.name || '—'} | المرحلة:{' '}
                  {selectedEpisode.currentPhase || '—'}
                </Alert>
              </Grid>
            )}

            {!editingGoal && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="معرّف المستفيد (ObjectId) *"
                  value={form.beneficiaryId}
                  onChange={handleSetField('beneficiaryId')}
                  helperText="سيتم ربطه تلقائياً من الحلقة قريباً"
                />
              </Grid>
            )}

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ البدء"
                type="date"
                value={form.startDate}
                onChange={handleSetField('startDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="تاريخ الانتهاء المستهدف"
                type="date"
                value={form.targetDate}
                onChange={handleSetField('targetDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={handleSetField('description')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption">مكونات SMART</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="محدد (Specific)"
                value={form.specific}
                onChange={handleSetField('specific')}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="قابل للقياس (Measurable)"
                value={form.measurable}
                onChange={handleSetField('measurable')}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="قابل للتحقيق (Achievable)"
                value={form.achievable}
                onChange={handleSetField('achievable')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="ذو صلة (Relevant)"
                value={form.relevant}
                onChange={handleSetField('relevant')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="محدد بوقت (Time-bound)"
                value={form.timeBound}
                onChange={handleSetField('timeBound')}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider>
                <Typography variant="caption">الخط الأساسي والهدف</Typography>
              </Divider>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="القيمة الأساسية (Baseline)"
                value={form.baselineValue}
                onChange={handleSetField('baselineValue')}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="القيمة المستهدفة *"
                value={form.targetValue}
                onChange={handleSetField('targetValue')}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="وصف الخط الأساسي"
                value={form.baselineDescription}
                onChange={handleSetField('baselineDescription')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="معايير الإنجاز"
                value={form.targetCriteria}
                onChange={handleSetField('targetCriteria')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ bgcolor: '#673ab7', '&:hover': { bgcolor: '#512da8' } }}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : editingGoal ? (
              'حفظ التعديلات'
            ) : (
              'إنشاء الهدف'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تفاصيل الهدف</Typography>
            <IconButton onClick={() => setViewDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedGoal && (
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  العنوان
                </Typography>
                <Typography fontWeight="bold">{selectedGoal.title}</Typography>
                {selectedGoal.title_ar && (
                  <Typography variant="body2">{selectedGoal.title_ar}</Typography>
                )}
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    النطاق
                  </Typography>
                  <Typography variant="body2">{getDomainLabel(selectedGoal.domain)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    النوع
                  </Typography>
                  <Typography variant="body2">{getTypeLabel(selectedGoal.type)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الحالة
                  </Typography>
                  <Chip
                    label={STATUS_CONFIG[selectedGoal.status]?.label || selectedGoal.status}
                    color={STATUS_CONFIG[selectedGoal.status]?.color || 'default'}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الأولوية
                  </Typography>
                  <Typography variant="body2">
                    {PRIORITIES.find(p => p.value === selectedGoal.priority)?.label ||
                      selectedGoal.priority}
                  </Typography>
                </Grid>
              </Grid>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  التقدم الحالي
                </Typography>
                <ProgressBar
                  value={selectedGoal.currentProgress}
                  color={STATUS_CONFIG[selectedGoal.status]?.bg}
                />
              </Box>
              {selectedGoal.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    الوصف
                  </Typography>
                  <Typography variant="body2">{selectedGoal.description}</Typography>
                </Box>
              )}
              {(selectedGoal.specific || selectedGoal.measurable || selectedGoal.timeBound) && (
                <>
                  <Divider />
                  {selectedGoal.specific && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        محدد (S)
                      </Typography>
                      <Typography variant="body2">{selectedGoal.specific}</Typography>
                    </Box>
                  )}
                  {selectedGoal.measurable && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        قابل للقياس (M)
                      </Typography>
                      <Typography variant="body2">{selectedGoal.measurable}</Typography>
                    </Box>
                  )}
                  {selectedGoal.timeBound && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        محدد بوقت (T)
                      </Typography>
                      <Typography variant="body2">{selectedGoal.timeBound}</Typography>
                    </Box>
                  )}
                </>
              )}
              <Grid container spacing={1}>
                {selectedGoal.startDate && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ البدء
                    </Typography>
                    <Typography variant="body2">{fmtDate(selectedGoal.startDate)}</Typography>
                  </Grid>
                )}
                {selectedGoal.targetDate && (
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ الانتهاء
                    </Typography>
                    <Typography variant="body2">{fmtDate(selectedGoal.targetDate)}</Typography>
                  </Grid>
                )}
              </Grid>
              {selectedGoal.progressLog?.length > 0 && (
                <>
                  <Divider />
                  <Typography variant="caption" color="text.secondary">
                    سجل التقدم الأخير
                  </Typography>
                  <Stack spacing={0.5}>
                    {selectedGoal.progressLog
                      .slice(-5)
                      .reverse()
                      .map((p, i) => (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Typography variant="caption">{fmtDate(p.date)}</Typography>
                          <Chip label={`${p.value}%`} size="small" />
                          {p.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {p.notes}
                            </Typography>
                          )}
                        </Box>
                      ))}
                  </Stack>
                </>
              )}
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>إغلاق</Button>
          <Button
            variant="outlined"
            onClick={() => {
              setViewDialog(false);
              if (selectedGoal) handleOpenEdit(selectedGoal);
            }}
          >
            تعديل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Progress Dialog ── */}
      <Dialog
        open={progressDialog}
        onClose={() => setProgressDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تسجيل التقدم</Typography>
            <IconButton onClick={() => setProgressDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        {selectedGoal && (
          <DialogContent dividers>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedGoal.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              نسبة التقدم الحالية
            </Typography>
            <Slider
              value={progressValue}
              onChange={(_, v) => setProgressValue(v)}
              min={0}
              max={100}
              step={5}
              valueLabelDisplay="on"
              sx={{ mt: 3, mb: 1, color: '#673ab7' }}
            />
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="ملاحظات (اختياري)"
              value={progressNote}
              onChange={e => setProgressNote(e.target.value)}
              sx={{ mt: 1 }}
            />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setProgressDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveProgress}
            disabled={saving}
            sx={{ bgcolor: '#673ab7', '&:hover': { bgcolor: '#512da8' } }}
          >
            {saving ? <CircularProgress size={20} /> : 'حفظ التقدم'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
