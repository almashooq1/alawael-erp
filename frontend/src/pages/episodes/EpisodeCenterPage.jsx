/**
 * Episode Center Page — مركز الحلقة العلاجية الموحدة
 *
 * الصفحة المحورية التي تربط كل وحدات المنصة:
 * - 12 مرحلة سريرية (Referral → Post-Discharge Follow-up)
 * - ملف المستفيد + خطة الرعاية + الجلسات + التقييمات
 * - فريق MDT + الأهداف + مؤشرات النتائج
 * - لوحة تحكم + قائمة + تفاصيل الحلقة الكاملة
 */

import React, { useState, useEffect, useCallback, useMemo as _useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Chip,
  Tabs,
  Tab,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Stack,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
  LinearProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge as _Badge,
  Paper,
  Divider as _Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  ArrowForward as NextPhaseIcon,
  Assignment as CarePlanIcon,
  TrackChanges as GoalsIcon,
  Assessment as AssessmentIcon,
  CalendarMonth as CalendarIcon,
  Group as TeamIcon,
  BarChart as _StatsIcon,
  PlayArrow as ActiveIcon,
  CheckCircle as _DoneIcon,
  RadioButtonUnchecked as _PendingIcon,
  FiberManualRecord as _CurrentIcon,
  ArrowBack as BackIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  TrendingUp as TrendIcon,
  LocalHospital as MedIcon,
  Dashboard as DashIcon,
  List as ListIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend as _Legend,
} from 'recharts';

import { coreAPI, episodesAPI } from '../../services/ddd';
import { formatDate } from 'utils/dateUtils';

/* ── Styled Phase Connector ─────────────────────────────────────── */
const ColorlibConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: { top: 20 },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(90deg, #4caf50, #2196f3)',
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      backgroundImage: 'linear-gradient(90deg, #4caf50, #4caf50)',
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    height: 4,
    border: 0,
    borderRadius: 1,
    backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : '#eaeaf0',
  },
}));

/* ── Constants ──────────────────────────────────────────────────── */
const PHASES = [
  { key: 'referral', label: 'الإحالة', icon: '📋', color: '#9e9e9e' },
  { key: 'intake', label: 'القبول', icon: '📥', color: '#2196f3' },
  { key: 'triage', label: 'الفرز', icon: '🔍', color: '#ff9800' },
  { key: 'initial_assessment', label: 'التقييم الأولي', icon: '📊', color: '#673ab7' },
  { key: 'mdt_review', label: 'مراجعة الفريق', icon: '👥', color: '#00bcd4' },
  { key: 'care_plan_approval', label: 'اعتماد الخطة', icon: '✅', color: '#009688' },
  { key: 'active_treatment', label: 'العلاج النشط', icon: '💊', color: '#4caf50' },
  { key: 'reassessment', label: 'إعادة التقييم', icon: '🔄', color: '#ff5722' },
  { key: 'outcome_review', label: 'مراجعة النتائج', icon: '📈', color: '#795548' },
  { key: 'discharge_planning', label: 'تخطيط الخروج', icon: '📋', color: '#607d8b' },
  { key: 'discharge', label: 'الخروج', icon: '🏠', color: '#9e9e9e' },
  { key: 'post_discharge_followup', label: 'المتابعة البعدية', icon: '📞', color: '#8bc34a' },
];
const PHASE_MAP = Object.fromEntries(PHASES.map(p => [p.key, p]));
const _PHASE_INDEX = Object.fromEntries(PHASES.map((p, i) => [p.key, i]));

const EPISODE_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'initial', label: 'أولية' },
  { value: 'continuation', label: 'استمرارية' },
  { value: 'readmission', label: 'إعادة قبول' },
  { value: 'intensive', label: 'مكثفة' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'crisis', label: 'أزمة' },
  { value: 'tele_rehab', label: 'تأهيل عن بعد' },
  { value: 'home_based', label: 'منزلي' },
  { value: 'community', label: 'مجتمعي' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'active', label: 'نشط', color: '#4caf50' },
  { value: 'planned', label: 'مخطط', color: '#2196f3' },
  { value: 'on_hold', label: 'معلق', color: '#ff9800' },
  { value: 'completed', label: 'مكتمل', color: '#607d8b' },
  { value: 'cancelled', label: 'ملغى', color: '#f44336' },
  { value: 'transferred', label: 'محوّل', color: '#9c27b0' },
];

const PRIORITY_MAP = {
  routine: { label: 'اعتيادية', color: '#607d8b' },
  urgent: { label: 'عاجلة', color: '#ff9800' },
  emergency: { label: 'طارئة', color: '#f44336' },
};

const GOAL_STATUS_MAP = {
  PENDING: { label: 'معلق', color: '#9e9e9e' },
  IN_PROGRESS: { label: 'قيد التنفيذ', color: '#2196f3' },
  ACHIEVED: { label: 'محقق', color: '#4caf50' },
  DISCONTINUED: { label: 'متوقف', color: '#f44336' },
};

const PIE_COLORS = [
  '#4caf50',
  '#2196f3',
  '#ff9800',
  '#9c27b0',
  '#f44336',
  '#00bcd4',
  '#607d8b',
  '#795548',
];

/* ── Reusable components ─────────────────────────────────────────── */
function StatCard({ label, value, icon, color, sub }) {
  return (
    <Card sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}20`, color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={color} lineHeight={1}>
            {value ?? '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" display="block" color="text.disabled">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

function PhaseChip({ phase }) {
  const cfg = PHASE_MAP[phase] || { label: phase, color: '#607d8b' };
  return (
    <Chip
      label={`${cfg.icon || ''} ${cfg.label}`}
      size="small"
      sx={{ bgcolor: `${cfg.color}18`, color: cfg.color, fontWeight: 600, fontSize: '0.72rem' }}
    />
  );
}

function StatusChip({ status }) {
  const cfg = STATUS_OPTIONS.find(s => s.value === status) || { label: status, color: '#607d8b' };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{ bgcolor: `${cfg.color}18`, color: cfg.color, fontWeight: 600 }}
    />
  );
}

/* ── CreateEpisodeDialog ─────────────────────────────────────────── */
function CreateEpisodeDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    beneficiaryId: '',
    type: 'initial',
    priority: 'routine',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    clinicalNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (open) {
      setForm({
        beneficiaryId: '',
        type: 'initial',
        priority: 'routine',
        startDate: new Date().toISOString().split('T')[0],
        expectedEndDate: '',
        clinicalNotes: '',
      });
      setErr('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.beneficiaryId.trim()) {
      setErr('معرّف المستفيد مطلوب');
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إنشاء حلقة رعاية جديدة</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField
            label="معرّف المستفيد *"
            value={form.beneficiaryId}
            onChange={e => set('beneficiaryId', e.target.value)}
            fullWidth
            size="small"
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الحلقة</InputLabel>
                <Select
                  value={form.type}
                  label="نوع الحلقة"
                  onChange={e => set('type', e.target.value)}
                >
                  {EPISODE_TYPES.slice(1).map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={form.priority}
                  label="الأولوية"
                  onChange={e => set('priority', e.target.value)}
                >
                  {Object.entries(PRIORITY_MAP).map(([v, c]) => (
                    <MenuItem key={v} value={v}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="تاريخ البدء"
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="تاريخ الانتهاء المتوقع"
                type="date"
                value={form.expectedEndDate}
                onChange={e => set('expectedEndDate', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
          <TextField
            label="ملاحظات سريرية"
            value={form.clinicalNotes}
            onChange={e => set('clinicalNotes', e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * Dashboard Tab
 * ══════════════════════════════════════════════════════════════════ */
function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await coreAPI.getDashboard();
        setData(res?.data || res);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading)
    return (
      <Grid container spacing={2}>
        {[...Array(4)].map((_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
          </Grid>
        ))}
      </Grid>
    );

  const stats = data?.stats || {};

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="إجمالي المستفيدين"
            value={stats.totalBeneficiaries}
            icon={<PersonIcon />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="حلقات نشطة"
            value={stats.activeEpisodes}
            icon={<ActiveIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="مستفيدون جدد هذا الشهر"
            value={stats.newThisMonth}
            icon={<AddIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="تنبيهات"
            value={data?.alerts?.length || 0}
            icon={<WarningIcon />}
            color={data?.alerts?.some(a => a.level === 'error') ? '#f44336' : '#607d8b'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {data?.disabilityBreakdown?.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="توزيع أنواع الإعاقة"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              />
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={data.disabilityBreakdown}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                    >
                      {data.disabilityBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
        {data?.statusBreakdown?.length > 0 && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader
                title="توزيع حالات المستفيدين"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              />
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.statusBreakdown} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="status" width={90} tick={{ fontSize: 12 }} />
                    <ChartTooltip />
                    <Bar dataKey="count" fill="#2196f3" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {data?.alerts?.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {data.alerts.map((a, i) => (
            <Alert key={i} severity={a.level === 'error' ? 'error' : 'warning'} sx={{ mb: 1 }}>
              {a.message}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * Episodes List Tab
 * ══════════════════════════════════════════════════════════════════ */
function EpisodesListTab({ onViewEpisode }) {
  const [episodes, setEpisodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: '', type: '', priority: '', phase: '' });
  const [createOpen, setCreateOpen] = useState(false);

  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Use unified DDD core list for the beneficiary-centric view
      const res = await coreAPI.listEpisodeCenter({
        page,
        limit: 20,
        search,
        ...filters,
      });
      setEpisodes(res.items || res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const handleCreate = async form => {
    await episodesAPI.create(form);
    fetchEpisodes();
  };

  return (
    <Box>
      {/* Filters */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mb: 2 }}
        alignItems="center"
      >
        <TextField
          size="small"
          placeholder="بحث باسم أو رقم الملف..."
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={filters.status}
            label="الحالة"
            onChange={e => setFilter('status', e.target.value)}
          >
            {STATUS_OPTIONS.map(o => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={fetchEpisodes} color="primary">
          <RefreshIcon />
        </IconButton>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          حلقة جديدة
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Stack spacing={1}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={70} variant="rectangular" sx={{ borderRadius: 1 }} />
          ))}
        </Stack>
      ) : episodes.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">لا توجد نتائج</Typography>
        </Paper>
      ) : (
        <Stack spacing={1}>
          {episodes.map(item => (
            <Card
              key={item._id}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: 4 }, transition: '0.2s' }}
              onClick={() => onViewEpisode(item._id)}
            >
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: '#2196f320', color: '#2196f3', width: 42, height: 42 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box flexGrow={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {item.firstName} {item.lastName}
                      {item.firstNameEn && (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: 1 }}
                        >
                          ({item.firstNameEn} {item.lastNameEn})
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.fileNumber || item.mrn} • {item.disability?.type || '—'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label={item.status || '—'} size="small" sx={{ fontSize: '0.7rem' }} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {total > 20 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={Math.ceil(total / 20)}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      <CreateEpisodeDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
      />
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * Episode Detail Tab (Single Episode 360°)
 * ══════════════════════════════════════════════════════════════════ */
function EpisodeDetailTab({ episodeId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [advanceNotes, setAdvanceNotes] = useState('');
  const [advancing, setAdvancing] = useState(false);

  const load = useCallback(async () => {
    if (!episodeId) return;
    setLoading(true);
    setError('');
    try {
      const res = await coreAPI.getEpisodeCenterProfile(episodeId);
      setData(res?.data || res);
    } catch (e) {
      setError(e.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [episodeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdvancePhase = async () => {
    setAdvancing(true);
    try {
      await episodesAPI.advancePhase(data?.activeEpisode?._id, advanceNotes);
      setAdvanceDialog(false);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setAdvancing(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton height={160} variant="rectangular" sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[...Array(3)].map((_, i) => (
            <Grid item xs={4} key={i}>
              <Skeleton height={80} variant="rectangular" sx={{ borderRadius: 1 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  if (!data)
    return (
      <Alert severity="info" sx={{ m: 2 }}>
        لا توجد بيانات
      </Alert>
    );

  const beneficiary = data.beneficiary || {};
  const episode = data.activeEpisode || {};
  const carePlan = data.carePlan || {};
  const sessions = data.sessions || [];
  const assessments = data.assessments || [];
  const progress = data.progress || {};

  const currentPhaseIdx = episode.currentPhase
    ? PHASES.findIndex(p => p.key === episode.currentPhase)
    : -1;

  const goalsTotal = carePlan.goals?.length || 0;
  const goalsAchieved = carePlan.goals?.filter(g => g.status === 'ACHIEVED')?.length || 0;
  const goalsProgress = goalsTotal > 0 ? Math.round((goalsAchieved / goalsTotal) * 100) : 0;

  return (
    <Box>
      {/* Header */}
      <Card
        sx={{
          mb: 2,
          background: 'linear-gradient(135deg, #1a237e 0%, #0d47a1 100%)',
          color: 'white',
        }}
      >
        <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <IconButton onClick={onBack} sx={{ color: 'white' }}>
              <BackIcon />
            </IconButton>
            <Avatar
              src={beneficiary.photo}
              sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}
            >
              {(beneficiary.firstName || '?')[0]}
            </Avatar>
            <Box flexGrow={1}>
              <Typography variant="h6" fontWeight={700}>
                {beneficiary.firstName} {beneficiary.lastName}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {beneficiary.fileNumber || beneficiary.mrn} • {beneficiary.disability?.type}
                {beneficiary.dateOfBirth &&
                  ` • ${Math.floor((Date.now() - new Date(beneficiary.dateOfBirth)) / (365.25 * 86400000))} سنة`}
              </Typography>
            </Box>
            {episode.currentPhase && <PhaseChip phase={episode.currentPhase} />}
            {episode.status && <StatusChip status={episode.status} />}
            {episode.priority === 'emergency' && <Chip label="طارئة" size="small" color="error" />}
          </Stack>
        </CardContent>
      </Card>

      {/* Phase Stepper */}
      {episode.currentPhase && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle2" fontWeight={600} color="text.secondary">
                مسار الحلقة العلاجية — المرحلة الحالية: {PHASE_MAP[episode.currentPhase]?.label}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                startIcon={<NextPhaseIcon />}
                onClick={() => setAdvanceDialog(true)}
                disabled={currentPhaseIdx >= PHASES.length - 1}
              >
                المرحلة التالية
              </Button>
            </Stack>
            <Stepper
              alternativeLabel
              activeStep={currentPhaseIdx}
              connector={<ColorlibConnector />}
            >
              {PHASES.map((p, i) => (
                <Step key={p.key} completed={i < currentPhaseIdx}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontSize: '1.1rem',
                          bgcolor:
                            i < currentPhaseIdx
                              ? '#4caf5020'
                              : i === currentPhaseIdx
                                ? '#2196f320'
                                : '#9e9e9e15',
                          border: `2px solid ${i < currentPhaseIdx ? '#4caf50' : i === currentPhaseIdx ? '#2196f3' : '#e0e0e0'}`,
                        }}
                      >
                        {p.icon}
                      </Avatar>
                    )}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontSize: '0.65rem', display: 'block', mt: 0.5 }}
                    >
                      {p.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
            <LinearProgress
              variant="determinate"
              value={
                currentPhaseIdx >= 0 ? Math.round(((currentPhaseIdx + 1) / PHASES.length) * 100) : 0
              }
              sx={{ mt: 2, height: 6, borderRadius: 3 }}
            />
          </CardContent>
        </Card>
      )}

      {/* Quick stats */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="الجلسات"
            value={sessions.length}
            icon={<CalendarIcon />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="التقييمات"
            value={assessments.length}
            icon={<AssessmentIcon />}
            color="#9c27b0"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="الأهداف"
            value={goalsTotal}
            icon={<GoalsIcon />}
            color="#4caf50"
            sub={`${goalsProgress}% محقق`}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="أعضاء الفريق"
            value={episode.teamMembers?.length || 0}
            icon={<TeamIcon />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      {/* Sub-tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label="خطة الرعاية"
          icon={<CarePlanIcon />}
          iconPosition="start"
          sx={{ minHeight: 40 }}
        />
        <Tab label="الجلسات" icon={<CalendarIcon />} iconPosition="start" sx={{ minHeight: 40 }} />
        <Tab
          label="التقييمات"
          icon={<AssessmentIcon />}
          iconPosition="start"
          sx={{ minHeight: 40 }}
        />
        <Tab label="فريق العلاج" icon={<TeamIcon />} iconPosition="start" sx={{ minHeight: 40 }} />
        <Tab label="التقدم" icon={<TrendIcon />} iconPosition="start" sx={{ minHeight: 40 }} />
      </Tabs>

      {/* Tab: Care Plan */}
      {tab === 0 && (
        <Box>
          {!carePlan._id ? (
            <Alert severity="info">لا توجد خطة رعاية نشطة لهذا المستفيد</Alert>
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    label="رقم الخطة"
                    value={carePlan.planNumber || '—'}
                    icon={<CarePlanIcon />}
                    color="#009688"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    label="تاريخ البدء"
                    value={formatDate(carePlan.startDate)}
                    icon={<CalendarIcon />}
                    color="#009688"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    label="مراجعة"
                    value={formatDate(carePlan.reviewDate)}
                    icon={<ScheduleIcon />}
                    color="#ff9800"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <StatCard
                    label="تقدم الأهداف"
                    value={`${goalsProgress}%`}
                    icon={<GoalsIcon />}
                    color="#4caf50"
                  />
                </Grid>
              </Grid>
              {goalsTotal > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>الهدف</TableCell>
                        <TableCell>النوع</TableCell>
                        <TableCell>التقدم</TableCell>
                        <TableCell>الحالة</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {carePlan.goals.map((g, i) => (
                        <TableRow key={i}>
                          <TableCell>{g.title}</TableCell>
                          <TableCell>
                            <Chip label={g.type || '—'} size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={g.progress || 0}
                                sx={{ flexGrow: 1, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="caption">{g.progress || 0}%</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            {g.status && (
                              <Chip
                                label={GOAL_STATUS_MAP[g.status]?.label || g.status}
                                size="small"
                                sx={{
                                  bgcolor: `${GOAL_STATUS_MAP[g.status]?.color}18`,
                                  color: GOAL_STATUS_MAP[g.status]?.color,
                                }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          )}
        </Box>
      )}

      {/* Tab: Sessions */}
      {tab === 1 && (
        <Box>
          {sessions.length === 0 ? (
            <Alert severity="info">لا توجد جلسات مسجلة</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>النوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المدة</TableCell>
                    <TableCell>الملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.map((s, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(s.date)}</TableCell>
                      <TableCell>{s.sessionType || '—'}</TableCell>
                      <TableCell>
                        <Chip label={s.status || '—'} size="small" />
                      </TableCell>
                      <TableCell>{s.duration ? `${s.duration} د` : '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Typography variant="caption" noWrap>
                          {s.notes?.subjective || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Tab: Assessments */}
      {tab === 2 && (
        <Box>
          {assessments.length === 0 ? (
            <Alert severity="info">لا توجد تقييمات مسجلة</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الأداة</TableCell>
                    <TableCell>الفئة</TableCell>
                    <TableCell>الدرجة</TableCell>
                    <TableCell>التفسير</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {assessments.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{formatDate(a.createdAt)}</TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight={600}>
                          {a.tool || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={a.category || '—'} size="small" />
                      </TableCell>
                      <TableCell>
                        {a.score != null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight={700}>
                              {a.score}
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={a.score}
                              sx={{ width: 60, height: 4, borderRadius: 2 }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{a.interpretation || '—'}</Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Tab: Team */}
      {tab === 3 && (
        <Box>
          {!episode.teamMembers || episode.teamMembers.length === 0 ? (
            <Alert severity="info">لم يتم تعيين فريق علاجي بعد</Alert>
          ) : (
            <List dense>
              {episode.teamMembers.map((m, i) => (
                <ListItem key={i} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#2196f320', color: '#2196f3', width: 36, height: 36 }}>
                      {(m.role || 'U')[0].toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={m.userId?.name || m.userId || 'عضو الفريق'}
                    secondary={m.role || '—'}
                  />
                  {m.isPrimary && <Chip label="مسؤول رئيسي" size="small" color="primary" />}
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Tab: Progress */}
      {tab === 4 && (
        <Box>
          {!progress.trend || progress.trend.length === 0 ? (
            <Alert severity="info">لا توجد بيانات تقدم كافية بعد</Alert>
          ) : (
            <Card>
              <CardHeader
                title="منحنى التقدم — درجات التقييمات"
                titleTypographyProps={{ variant: 'subtitle2' }}
              />
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={progress.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => formatDate(d)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip />
                    <Bar dataKey="score" fill="#4caf50" radius={4} name="الدرجة" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Advance Phase Dialog */}
      <Dialog open={advanceDialog} onClose={() => setAdvanceDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>التقدم للمرحلة التالية</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            الانتقال من <strong>{PHASE_MAP[episode.currentPhase]?.label}</strong> إلى{' '}
            <strong>{PHASES[currentPhaseIdx + 1]?.label}</strong>
          </Typography>
          <TextField
            label="ملاحظات الانتقال"
            value={advanceNotes}
            onChange={e => setAdvanceNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdvanceDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAdvancePhase} disabled={advancing}>
            {advancing ? 'جاري...' : 'تأكيد الانتقال'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * Main Page
 * ══════════════════════════════════════════════════════════════════ */
export default function EpisodeCenterPage() {
  const [mainTab, setMainTab] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();
  const params = useParams();

  // If route has :id, jump to detail view
  useEffect(() => {
    if (params.id) {
      setSelectedId(params.id);
      setMainTab(2);
    }
  }, [params.id]);

  const handleViewEpisode = id => {
    setSelectedId(id);
    setMainTab(2);
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setMainTab(1);
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="primary">
            مركز الحلقة العلاجية الموحدة
          </Typography>
          <Typography variant="caption" color="text.secondary">
            إدارة دورة الرعاية الكاملة — من الإحالة حتى المتابعة البعدية
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="العودة للقائمة الرئيسية">
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate(-1)}
              startIcon={<BackIcon />}
            >
              رجوع
            </Button>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Main navigation */}
      <Tabs
        value={mainTab}
        onChange={(_, v) => setMainTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="لوحة التحكم" icon={<DashIcon />} iconPosition="start" sx={{ minHeight: 44 }} />
        <Tab
          label="قائمة المستفيدين"
          icon={<ListIcon />}
          iconPosition="start"
          sx={{ minHeight: 44 }}
        />
        <Tab
          label="تفاصيل الحلقة"
          icon={<MedIcon />}
          iconPosition="start"
          disabled={!selectedId}
          sx={{ minHeight: 44 }}
        />
      </Tabs>

      {mainTab === 0 && <DashboardTab />}
      {mainTab === 1 && <EpisodesListTab onViewEpisode={handleViewEpisode} />}
      {mainTab === 2 && selectedId && (
        <EpisodeDetailTab episodeId={selectedId} onBack={handleBackToList} />
      )}
    </Box>
  );
}
