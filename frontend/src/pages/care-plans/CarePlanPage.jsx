/**
 * Care Plan Management Page — إدارة خطط الرعاية
 * AlAwael ERP — Full rebuild with Dashboard + Plans + Goals
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
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
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  Tooltip,
  CircularProgress,
  Avatar,
  Collapse,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Assignment as PlanIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  CheckCircle as ActiveIcon,
  Archive as ArchiveIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Dashboard as StatsIcon,
  School as AcademicIcon,
  Psychology as BehaviorIcon,
  RecordVoiceOver as SpeechIcon,
  DirectionsWalk as MotorIcon,
  Groups as SocialIcon,
  SelfImprovement as LifeSkillIcon,
  TrackChanges as GoalsNavIcon,
  AccountTree as EpisodeIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CheckCircleOutlined as AchievedIcon,
  HourglassBottom as PendingIcon,
  PlayCircleOutlined as InProgressIcon,
  Cancel as DiscontinuedIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartTooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import carePlanService from '../../services/carePlanService';
import { formatDate as _fmtDate } from 'utils/dateUtils';

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  DRAFT: { label: 'مسودة', color: 'default', bg: '#9e9e9e' },
  ACTIVE: { label: 'نشطة', color: 'success', bg: '#4caf50' },
  ARCHIVED: { label: 'مؤرشفة', color: 'error', bg: '#f44336' },
};

const GOAL_STATUS = {
  PENDING: { label: 'قيد الانتظار', color: '#9e9e9e', Icon: PendingIcon },
  IN_PROGRESS: { label: 'جارٍ', color: '#2196f3', Icon: InProgressIcon },
  ACHIEVED: { label: 'محقق', color: '#4caf50', Icon: AchievedIcon },
  DISCONTINUED: { label: 'متوقف', color: '#f44336', Icon: DiscontinuedIcon },
};

const GOAL_TYPE_LABELS = {
  ACADEMIC: { label: 'أكاديمي', Icon: AcademicIcon, color: '#1976d2' },
  BEHAVIORAL: { label: 'سلوكي', Icon: BehaviorIcon, color: '#7b1fa2' },
  COMMUNICATION: { label: 'تواصل', Icon: SpeechIcon, color: '#0288d1' },
  MOTOR: { label: 'حركي', Icon: MotorIcon, color: '#2e7d32' },
  SPEECH: { label: 'نطق', Icon: SpeechIcon, color: '#00838f' },
  SOCIAL: { label: 'اجتماعي', Icon: SocialIcon, color: '#e65100' },
  LIFE_SKILL: { label: 'مهارات حياة', Icon: LifeSkillIcon, color: '#558b2f' },
  OTHER: { label: 'أخرى', Icon: GoalsNavIcon, color: '#546e7a' },
};

const SECTION_DOMAINS = {
  educational: {
    label: 'الخطة التعليمية',
    color: '#1976d2',
    domains: {
      academic: 'الأكاديمي',
      classroom: 'الفصل الدراسي',
      communication: 'التواصل',
    },
  },
  therapeutic: {
    label: 'الخطة العلاجية',
    color: '#7b1fa2',
    domains: {
      speech: 'النطق والكلام',
      occupational: 'العلاج الوظيفي',
      physical: 'العلاج الطبيعي',
      behavioral: 'السلوكي',
      psychological: 'النفسي',
    },
  },
  lifeSkills: {
    label: 'مهارات الحياة',
    color: '#2e7d32',
    domains: {
      selfCare: 'العناية الذاتية',
      homeSkills: 'المهارات المنزلية',
      social: 'الاجتماعي',
      transport: 'التنقل',
      financial: 'المالي',
    },
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = d => (d ? _fmtDate(d) : '—');

const collectGoals = plan => {
  const goals = [];
  Object.entries(SECTION_DOMAINS).forEach(([sectionKey, sectionDef]) => {
    const section = plan[sectionKey];
    if (!section?.enabled) return;
    Object.keys(sectionDef.domains).forEach(domainKey => {
      const domain = section.domains?.[domainKey];
      if (domain?.goals?.length) {
        domain.goals.forEach(g =>
          goals.push({
            ...g,
            _sectionLabel: sectionDef.label,
            _domainLabel: sectionDef.domains[domainKey],
          })
        );
      }
    });
  });
  return goals;
};

// ── Sub-components ───────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, loading: busy }) {
  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${color}22` }}>
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
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

function GoalProgressBar({ goal }) {
  const gs = GOAL_STATUS[goal.status] || GOAL_STATUS.PENDING;
  const GIcon = gs.Icon;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <GIcon sx={{ fontSize: 14, color: gs.color }} />
          <Typography variant="body2" fontWeight={500}>
            {goal.title}
          </Typography>
          {goal.type && GOAL_TYPE_LABELS[goal.type] && (
            <Chip
              label={GOAL_TYPE_LABELS[goal.type].label}
              size="small"
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: GOAL_TYPE_LABELS[goal.type].color + '22',
                color: GOAL_TYPE_LABELS[goal.type].color,
              }}
            />
          )}
        </Stack>
        <Typography variant="caption" color={gs.color} fontWeight="bold">
          {goal.progress ?? 0}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={goal.progress ?? 0}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: gs.color + '22',
          '& .MuiLinearProgress-bar': { bgcolor: gs.color },
        }}
      />
      {goal.criteria && (
        <Typography variant="caption" color="text.secondary">
          المعيار: {goal.criteria}
        </Typography>
      )}
    </Box>
  );
}

function SectionPanel({ sectionKey, plan, onGoalClick }) {
  const sectionDef = SECTION_DOMAINS[sectionKey];
  const section = plan[sectionKey];
  const [open, setOpen] = useState(true);

  if (!section?.enabled) return null;

  return (
    <Card variant="outlined" sx={{ mb: 2, borderLeft: `4px solid ${sectionDef.color}` }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => setOpen(o => !o)}
          sx={{ cursor: 'pointer', mb: open ? 1 : 0 }}
        >
          <Typography fontWeight="bold" color={sectionDef.color}>
            {sectionDef.label}
          </Typography>
          <IconButton size="small">{open ? <CollapseIcon /> : <ExpandIcon />}</IconButton>
        </Stack>
        <Collapse in={open}>
          {Object.entries(sectionDef.domains).map(([domainKey, domainLabel]) => {
            const domain = section.domains?.[domainKey];
            if (!domain?.goals?.length && !domain?.frequency) return null;
            return (
              <Box key={domainKey} sx={{ mb: 2 }}>
                <Divider sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {domainLabel}
                    {domain?.frequency && ` — ${domain.frequency}`}
                  </Typography>
                </Divider>
                {domain?.goals?.map(g => (
                  <Box
                    key={g._id || g.title}
                    onClick={() => onGoalClick && onGoalClick(plan._id, g)}
                    sx={{
                      cursor: onGoalClick ? 'pointer' : 'default',
                      '&:hover': onGoalClick ? { opacity: 0.8 } : {},
                    }}
                  >
                    <GoalProgressBar goal={g} />
                  </Box>
                ))}
              </Box>
            );
          })}
        </Collapse>
      </CardContent>
    </Card>
  );
}

function CreatePlanDialog({
  open,
  onClose,
  onSave,
  error: extErr,
  initialBeneficiaryId,
  initialEpisodeId,
}) {
  const [form, setForm] = useState({
    planNumber: '',
    beneficiary: initialBeneficiaryId || '',
    episode: initialEpisodeId || '',
    startDate: '',
    reviewDate: '',
    requiresSignature: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Re-sync when pre-fill props change
  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        beneficiary: f.beneficiary || initialBeneficiaryId || '',
        episode: f.episode || initialEpisodeId || '',
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on dialog open
  }, [open]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
    setForm({
      planNumber: '',
      beneficiary: '',
      episode: '',
      startDate: '',
      reviewDate: '',
      requiresSignature: false,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>إنشاء خطة رعاية جديدة</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {extErr && <Alert severity="error">{extErr}</Alert>}
          <TextField
            label="رقم الخطة"
            value={form.planNumber}
            onChange={e => set('planNumber', e.target.value)}
            fullWidth
          />
          <TextField
            label="معرّف الحلقة العلاجية (Episode)"
            value={form.episode}
            onChange={e => set('episode', e.target.value)}
            fullWidth
            helperText="اختياري — يربط الخطة بمسار علاجي محدد"
          />
          <TextField
            label="معرّف المستفيد"
            value={form.beneficiary}
            onChange={e => set('beneficiary', e.target.value)}
            fullWidth
            required
          />
          <TextField
            label="تاريخ البداية"
            type="date"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
          />
          <TextField
            label="تاريخ المراجعة"
            type="date"
            value={form.reviewDate}
            onChange={e => set('reviewDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.requiresSignature}
                onChange={e => set('requiresSignature', e.target.checked)}
              />
            }
            label="تتطلب توقيعاً"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !form.beneficiary || !form.startDate}
        >
          {saving ? <CircularProgress size={20} /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function GoalProgressDialog({ open, planId, goal, onClose, onSave }) {
  const [progress, setProgress] = useState(goal?.progress ?? 0);
  const [status, setStatus] = useState(goal?.status || 'IN_PROGRESS');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setProgress(goal.progress ?? 0);
      setStatus(goal.status || 'IN_PROGRESS');
    }
  }, [goal]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(planId, goal._id, { progress, status });
    setSaving(false);
  };

  if (!goal) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>تحديث تقدم الهدف</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Typography variant="body1" fontWeight={500}>
            {goal.title}
          </Typography>
          {goal.baseline && (
            <Typography variant="body2" color="text.secondary">
              المستوى الحالي: {goal.baseline}
            </Typography>
          )}
          {goal.target && (
            <Typography variant="body2" color="text.secondary">
              الهدف: {goal.target}
            </Typography>
          )}
          <TextField
            label="نسبة التقدم %"
            type="number"
            inputProps={{ min: 0, max: 100 }}
            value={progress}
            onChange={e => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
            fullWidth
          />
          <Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
          </Box>
          <FormControl fullWidth>
            <InputLabel>الحالة</InputLabel>
            <Select value={status} label="الحالة" onChange={e => setStatus(e.target.value)}>
              {Object.entries(GOAL_STATUS).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Dashboard Tab ────────────────────────────────────────────────────────────
function DashboardTab({ stats, plans, loading }) {
  const goalStatusData = useMemo(() => {
    const counts = { PENDING: 0, IN_PROGRESS: 0, ACHIEVED: 0, DISCONTINUED: 0 };
    plans.forEach(plan => {
      const goals = collectGoals(plan);
      goals.forEach(g => {
        if (counts[g.status] !== undefined) counts[g.status]++;
      });
    });
    return Object.entries(counts)
      .map(([k, v]) => ({
        name: GOAL_STATUS[k]?.label || k,
        value: v,
        color: GOAL_STATUS[k]?.color,
      }))
      .filter(d => d.value > 0);
  }, [plans]);

  const sectionEnabledData = useMemo(() => {
    const counts = { educational: 0, therapeutic: 0, lifeSkills: 0 };
    plans.forEach(plan => {
      Object.keys(counts).forEach(k => {
        if (plan[k]?.enabled) counts[k]++;
      });
    });
    return [
      { name: 'تعليمية', value: counts.educational, color: '#1976d2' },
      { name: 'علاجية', value: counts.therapeutic, color: '#7b1fa2' },
      { name: 'مهارات حياة', value: counts.lifeSkills, color: '#2e7d32' },
    ];
  }, [plans]);

  const reviewDue = useMemo(
    () =>
      plans
        .filter(p => p.status === 'ACTIVE' && p.reviewDate && new Date(p.reviewDate) <= new Date())
        .sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate))
        .slice(0, 5),
    [plans]
  );

  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الخطط', value: stats?.total, icon: <StatsIcon />, color: '#1976d2' },
          { label: 'نشطة', value: stats?.active, icon: <ActiveIcon />, color: '#2e7d32' },
          { label: 'مسودات', value: stats?.draft, icon: <EditIcon />, color: '#ed6c02' },
          { label: 'مؤرشفة', value: stats?.archived, icon: <ArchiveIcon />, color: '#d32f2f' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <KpiCard {...s} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography fontWeight="bold" sx={{ mb: 1 }}>
              توزيع حالة الأهداف
            </Typography>
            {goalStatusData.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={goalStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={d => d.name}
                  >
                    {goalStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                لا توجد أهداف مسجلة
              </Typography>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography fontWeight="bold" sx={{ mb: 1 }}>
              الخطط حسب النوع
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={sectionEnabledData}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <RechartTooltip />
                <Bar dataKey="value" name="عدد الخطط" radius={[4, 4, 0, 0]}>
                  {sectionEnabledData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
      </Grid>

      {/* Plans due for review */}
      {reviewDue.length > 0 && (
        <Card sx={{ border: '1px solid #ff9800', borderRadius: 2 }}>
          <CardContent>
            <Typography fontWeight="bold" color="warning.main" sx={{ mb: 1.5 }}>
              ⚠️ خطط تجاوزت موعد المراجعة ({reviewDue.length})
            </Typography>
            <Stack spacing={1}>
              {reviewDue.map(plan => (
                <Stack
                  key={plan._id}
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2">
                    {plan.planNumber || plan._id?.slice(-6)} —{' '}
                    {plan.beneficiary?.name || plan.beneficiary?.fullName || '—'}
                  </Typography>
                  <Chip label={fmtDate(plan.reviewDate)} size="small" color="warning" />
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// ── Plans Tab ────────────────────────────────────────────────────────────────
function PlansTab({ plans, loading, onActivate, onArchive, onSelect, selectedId }) {
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(
    () => (statusFilter ? plans.filter(p => p.status === statusFilter) : plans),
    [plans, statusFilter]
  );

  return (
    <Box>
      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <FilterIcon color="action" />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الحالة</InputLabel>
          <Select
            value={statusFilter}
            label="الحالة"
            onChange={e => setStatusFilter(e.target.value)}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {filtered.length} خطة
        </Typography>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell>رقم الخطة</TableCell>
              <TableCell>المستفيد</TableCell>
              <TableCell>البداية</TableCell>
              <TableCell>المراجعة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الأقسام</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" sx={{ py: 4 }}>
                    لا توجد خطط رعاية
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(plan => {
                const st = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;
                const isSelected = plan._id === selectedId;
                return (
                  <TableRow
                    key={plan._id}
                    hover
                    selected={isSelected}
                    sx={{ cursor: 'pointer', bgcolor: isSelected ? 'primary.50' : 'inherit' }}
                    onClick={() => onSelect(plan)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {plan.planNumber || `#${plan._id?.slice(-6)}`}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Avatar
                          sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.main' }}
                        >
                          {(plan.beneficiary?.name || plan.beneficiary?.fullName || '?')[0]}
                        </Avatar>
                        <Typography variant="body2">
                          {plan.beneficiary?.name || plan.beneficiary?.fullName || '—'}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{fmtDate(plan.startDate)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          plan.reviewDate && new Date(plan.reviewDate) < new Date()
                            ? 'error'
                            : 'text.primary'
                        }
                      >
                        {fmtDate(plan.reviewDate)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={st.label} color={st.color} size="small" />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {plan.educational?.enabled && (
                          <Chip
                            label="تعليمي"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              bgcolor: '#1976d222',
                              color: '#1976d2',
                            }}
                          />
                        )}
                        {plan.therapeutic?.enabled && (
                          <Chip
                            label="علاجي"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              bgcolor: '#7b1fa222',
                              color: '#7b1fa2',
                            }}
                          />
                        )}
                        {plan.lifeSkills?.enabled && (
                          <Chip
                            label="حياة"
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 10,
                              bgcolor: '#2e7d3222',
                              color: '#2e7d32',
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="عرض التفاصيل">
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              onSelect(plan);
                            }}
                          >
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {plan.status === 'DRAFT' && (
                          <Tooltip title="تفعيل">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={e => {
                                e.stopPropagation();
                                onActivate(plan._id);
                              }}
                            >
                              <ActiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {plan.status === 'ACTIVE' && (
                          <Tooltip title="أرشفة">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={e => {
                                e.stopPropagation();
                                onArchive(plan._id);
                              }}
                            >
                              <ArchiveIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ── Plan Detail Panel ────────────────────────────────────────────────────────
function PlanDetailPanel({ plan, onClose, onGoalClick, loading }) {
  const navigate = useNavigate();

  if (!plan) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        <PlanIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
        <Typography>اختر خطة من القائمة لعرض تفاصيلها</Typography>
      </Box>
    );
  }

  if (loading)
    return (
      <Box sx={{ p: 4 }}>
        <LinearProgress />
      </Box>
    );

  const goals = collectGoals(plan);
  const achieved = goals.filter(g => g.status === 'ACHIEVED').length;
  const overallProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length)
    : 0;
  const st = STATUS_CONFIG[plan.status] || STATUS_CONFIG.DRAFT;

  return (
    <Box>
      {/* Panel Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight="bold">
              {plan.planNumber || `خطة #${plan._id?.slice(-6)}`}
            </Typography>
            <Chip label={st.label} color={st.color} size="small" />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {plan.beneficiary?.name || plan.beneficiary?.fullName || '—'}
          </Typography>
        </Box>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Tooltip title="الأهداف">
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                const bid = plan.beneficiary?._id || plan.beneficiary;
                navigate(
                  `/platform/goals?carePlanId=${plan._id}${bid ? `&beneficiaryId=${bid}` : ''}`
                );
              }}
            >
              <GoalsNavIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Stack>

      {/* Meta */}
      <Card variant="outlined" sx={{ mb: 2, p: 1.5 }}>
        <Grid container spacing={1}>
          {[
            { l: 'تاريخ البداية', v: fmtDate(plan.startDate) },
            {
              l: 'تاريخ المراجعة',
              v: fmtDate(plan.reviewDate),
              warn: plan.reviewDate && new Date(plan.reviewDate) < new Date(),
            },
            { l: 'عدد الأهداف', v: goals.length },
            { l: 'محقق', v: `${achieved}/${goals.length}` },
          ].map((item, i) => (
            <Grid item xs={6} key={i}>
              <Typography variant="caption" color="text.secondary">
                {item.l}
              </Typography>
              <Typography variant="body2" fontWeight={500} color={item.warn ? 'error' : 'inherit'}>
                {item.v}
              </Typography>
            </Grid>
          ))}
        </Grid>
        {goals.length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                التقدم العام
              </Typography>
              <Typography variant="caption" fontWeight="bold">
                {overallProgress}%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={overallProgress}
              sx={{ height: 8, borderRadius: 4 }}
              color={
                overallProgress >= 80 ? 'success' : overallProgress >= 50 ? 'warning' : 'primary'
              }
            />
          </Box>
        )}
      </Card>

      {/* Sections with Goals */}
      {Object.keys(SECTION_DOMAINS).map(sectionKey => (
        <SectionPanel
          key={sectionKey}
          sectionKey={sectionKey}
          plan={plan}
          onGoalClick={onGoalClick}
        />
      ))}

      {goals.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          لا توجد أهداف مسجلة في هذه الخطة
        </Typography>
      )}
    </Box>
  );
}

export default function CarePlanPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const episodeIdFromUrl = searchParams.get('episodeId') || '';
  const beneficiaryIdFromUrl = searchParams.get('beneficiaryId') || '';

  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [createError, setCreateError] = useState('');
  const [tab, setTab] = useState(0); // 0=dashboard 1=plans 2=detail
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [activeGoal, setActiveGoal] = useState(null);
  const [activePlanId, setActivePlanId] = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [plansRes, statsRes] = await Promise.allSettled([
        carePlanService.getAll({ limit: 100 }),
        carePlanService.getStats(),
      ]);
      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value.data?.data || plansRes.value.data || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data?.data || statsRes.value.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Auto-open create dialog when arriving from Episodes page
  useEffect(() => {
    if (beneficiaryIdFromUrl && !dialogOpen) {
      setDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // ── Select plan → load full detail ────────────────────────────────────
  const handleSelectPlan = useCallback(async plan => {
    setSelectedPlan(plan);
    setTab(2);
    setDetailLoading(true);
    try {
      const res = await carePlanService.getById(plan._id);
      setSelectedPlan(res.data?.data || res.data);
    } catch {
      // keep shallow plan if detail fails
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleCreate = useCallback(
    async form => {
      setCreateError('');
      try {
        await carePlanService.create(form);
        setDialogOpen(false);
        fetchAll();
      } catch (err) {
        setCreateError(err.response?.data?.message || 'خطأ في الإنشاء');
      }
    },
    [fetchAll]
  );

  const handleActivate = useCallback(
    async id => {
      try {
        await carePlanService.activate(id);
        fetchAll();
      } catch (err) {
        setError(err.response?.data?.message || 'خطأ في تفعيل الخطة');
      }
    },
    [fetchAll]
  );

  const handleArchive = useCallback(
    async id => {
      try {
        await carePlanService.archive(id);
        fetchAll();
      } catch (err) {
        setError(err.response?.data?.message || 'خطأ في أرشفة الخطة');
      }
    },
    [fetchAll]
  );

  const handleGoalClick = useCallback((planId, goal) => {
    setActivePlanId(planId);
    setActiveGoal(goal);
    setGoalDialogOpen(true);
  }, []);

  const handleGoalSave = useCallback(
    async (planId, goalId, data) => {
      try {
        await carePlanService.updateGoalProgress(planId, goalId, data);
        setGoalDialogOpen(false);
        // Reload detail
        if (selectedPlan?._id === planId) {
          const res = await carePlanService.getById(planId);
          setSelectedPlan(res.data?.data || res.data);
        }
        fetchAll();
      } catch (err) {
        setError(err.response?.data?.message || 'خطأ في تحديث الهدف');
      }
    },
    [selectedPlan, fetchAll]
  );

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PlanIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            إدارة خطط الرعاية
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button startIcon={<RefreshIcon />} onClick={fetchAll} variant="outlined" size="small">
            تحديث
          </Button>
          <Button startIcon={<AddIcon />} onClick={() => setDialogOpen(true)} variant="contained">
            خطة جديدة
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Episode context banner */}
      {episodeIdFromUrl && (
        <Alert
          severity="info"
          icon={<EpisodeIcon />}
          sx={{ mb: 2 }}
          action={
            <Button
              size="small"
              startIcon={<GoalsNavIcon />}
              onClick={() =>
                navigate(
                  `/platform/goals?episodeId=${episodeIdFromUrl}&beneficiaryId=${beneficiaryIdFromUrl}`
                )
              }
            >
              انتقال للأهداف
            </Button>
          }
        >
          سياق الحلقة العلاجية — الحلقة: <strong>{episodeIdFromUrl.slice(-8)}</strong>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="لوحة التحكم" icon={<StatsIcon />} iconPosition="start" />
        <Tab label="الخطط" icon={<PlanIcon />} iconPosition="start" />
        <Tab
          label={
            selectedPlan
              ? `تفاصيل: ${selectedPlan.planNumber || selectedPlan._id?.slice(-6)}`
              : 'تفاصيل'
          }
          icon={<ViewIcon />}
          iconPosition="start"
          disabled={!selectedPlan}
        />
      </Tabs>

      {/* Tab 0: Dashboard */}
      {tab === 0 && <DashboardTab stats={stats} plans={plans} loading={loading} />}

      {/* Tab 1: Plans */}
      {tab === 1 && (
        <PlansTab
          plans={plans}
          loading={loading}
          onActivate={handleActivate}
          onArchive={handleArchive}
          onSelect={handleSelectPlan}
          selectedId={selectedPlan?._id}
        />
      )}

      {/* Tab 2: Plan Detail */}
      {tab === 2 && (
        <Box sx={{ maxWidth: 900 }}>
          <PlanDetailPanel
            plan={selectedPlan}
            loading={detailLoading}
            onClose={() => {
              setSelectedPlan(null);
              setTab(1);
            }}
            onGoalClick={handleGoalClick}
          />
        </Box>
      )}

      {/* Create Dialog */}
      <CreatePlanDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setCreateError('');
        }}
        onSave={handleCreate}
        error={createError}
        initialBeneficiaryId={beneficiaryIdFromUrl}
        initialEpisodeId={episodeIdFromUrl}
      />

      {/* Goal Progress Dialog */}
      <GoalProgressDialog
        open={goalDialogOpen}
        planId={activePlanId}
        goal={activeGoal}
        onClose={() => setGoalDialogOpen(false)}
        onSave={handleGoalSave}
      />
    </Container>
  );
}
