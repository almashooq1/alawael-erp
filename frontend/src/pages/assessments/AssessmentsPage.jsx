/**
 * AssessmentsPage — إدارة التقييمات السريرية
 *
 * الهدف السريري: تمكين الأخصائي من إنشاء وتتبع التقييمات السريرية
 * باستخدام أدوات مقننة (CARS, M-CHAT, VB-MAPP, Denver-II, Vineland)
 * مع ربط كل تقييم بالمستفيد وحلقة الرعاية.
 *
 * الوظائف:
 * - قائمة التقييمات مع فلترة متعددة
 * - لوحة إحصاءات سريعة
 * - إنشاء تقييم جديد بنموذج موجّه
 * - عرض تفاصيل التقييم مع تاريخ الدرجات
 * - دعم context من URL (episodeId / beneficiaryId)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  LinearProgress,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
  Stack,
  CircularProgress,
  InputAdornment,
  Pagination,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Psychology as PsychologyIcon,
  AccountTree as EpisodeIcon,
  ArrowBack as BackIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as PendingIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { assessmentsAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ── Constants ──────────────────────────────────────────────────────────── */
const CATEGORY_OPTIONS = [
  { value: 'autism_screening', label: 'فحص التوحد', color: '#7c3aed' },
  { value: 'adaptive_behavior', label: 'السلوك التكيفي', color: '#0284c7' },
  { value: 'cognitive', label: 'المعرفي', color: '#0891b2' },
  { value: 'language', label: 'اللغة والتواصل', color: '#059669' },
  { value: 'motor', label: 'الحركي', color: '#d97706' },
  { value: 'sensory', label: 'الحسي', color: '#db2777' },
  { value: 'social_emotional', label: 'الاجتماعي العاطفي', color: '#7c3aed' },
  { value: 'academic', label: 'الأكاديمي', color: '#2563eb' },
  { value: 'behavioral', label: 'السلوكي', color: '#dc2626' },
  { value: 'quality_of_life', label: 'جودة الحياة', color: '#16a34a' },
  { value: 'other', label: 'أخرى', color: '#6b7280' },
];

const INTERPRETATION_MAP = {
  within_normal: { label: 'ضمن الطبيعي', color: 'success' },
  borderline: { label: 'حدي', color: 'warning' },
  mild: { label: 'خفيف', color: 'warning' },
  moderate: { label: 'متوسط', color: 'error' },
  severe: { label: 'شديد', color: 'error' },
  profound: { label: 'عميق', color: 'error' },
  not_applicable: { label: 'غير قابل للتطبيق', color: 'default' },
};

const STATUS_MAP = {
  draft: { label: 'مسودة', color: 'default' },
  in_progress: { label: 'جارٍ', color: 'warning' },
  completed: { label: 'مكتمل', color: 'success' },
  reviewed: { label: 'مراجع', color: 'info' },
};

const COMMON_TOOLS = [
  'CARS-2',
  'M-CHAT-R',
  'ADOS-2',
  'ADI-R',
  'VB-MAPP',
  'Denver-II',
  'Vineland-3',
  'ABAS-3',
  'Bayley-4',
  'GFTA-3',
  'CELF-5',
  'TAPS-4',
  'Beery VMI',
  'BOT-2',
  'SPM-2',
  'SIPT',
  'CBCL',
  'Conners-3',
  'BRIEF-2',
  'أداة مخصصة',
];

/* ── Stat Card ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, color, icon }) {
  return (
    <Card variant="outlined" sx={{ borderRight: `4px solid ${color}` }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}20`, color, width: 40, height: 40 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h6" fontWeight="bold" color={color}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── Score Bar ─────────────────────────────────────────────────────────── */
function ScoreBar({ score, interpretation }) {
  if (score == null)
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  const color =
    score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : score >= 40 ? '#ea580c' : '#dc2626';
  return (
    <Box sx={{ minWidth: 80 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" fontWeight="bold" color={color}>
          {score}%
        </Typography>
        {interpretation && (
          <Chip
            label={INTERPRETATION_MAP[interpretation]?.label || interpretation}
            color={INTERPRETATION_MAP[interpretation]?.color || 'default'}
            size="small"
            sx={{ height: 16, fontSize: 9 }}
          />
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={score}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: `${color}20`,
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
}

/* ── Create Assessment Dialog ──────────────────────────────────────────── */
function CreateAssessmentDialog({
  open,
  onClose,
  onSaved,
  initialBeneficiaryId,
  initialEpisodeId,
}) {
  const [form, setForm] = useState({
    tool: '',
    customTool: '',
    category: 'other',
    beneficiary: initialBeneficiaryId || '',
    episodeOfCare: initialEpisodeId || '',
    assessmentDate: new Date().toISOString().split('T')[0],
    score: '',
    interpretation: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        beneficiary: initialBeneficiaryId || '',
        episodeOfCare: initialEpisodeId || '',
        tool: '',
        customTool: '',
        score: '',
        interpretation: '',
        notes: '',
      }));
      setError(null);
    }
  }, [open, initialBeneficiaryId, initialEpisodeId]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const toolName = form.tool === 'أداة مخصصة' ? form.customTool : form.tool;
    if (!toolName || !form.beneficiary || !form.assessmentDate || !form.category) {
      setError('يرجى تعبئة الحقول المطلوبة: الأداة، المستفيد، الفئة، والتاريخ.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await assessmentsAPI.create({
        tool: toolName,
        category: form.category,
        beneficiary: form.beneficiary,
        episodeOfCare: form.episodeOfCare || undefined,
        assessmentDate: form.assessmentDate,
        score: form.score !== '' ? Number(form.score) : undefined,
        interpretation: form.interpretation || undefined,
        notes: form.notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="primary" />
          <Typography fontWeight="bold">تقييم سريري جديد</Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>الأداة / المقياس</InputLabel>
              <Select value={form.tool} onChange={set('tool')} label="الأداة / المقياس">
                {COMMON_TOOLS.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {form.tool === 'أداة مخصصة' && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="اسم الأداة المخصصة"
                value={form.customTool}
                onChange={set('customTool')}
                size="small"
                fullWidth
                required
              />
            </Grid>
          )}
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>الفئة</InputLabel>
              <Select value={form.category} onChange={set('category')} label="الفئة">
                {CATEGORY_OPTIONS.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="معرّف المستفيد"
              value={form.beneficiary}
              onChange={set('beneficiary')}
              size="small"
              fullWidth
              required
              helperText="ID المستفيد"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="حلقة الرعاية (اختياري)"
              value={form.episodeOfCare}
              onChange={set('episodeOfCare')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="تاريخ التقييم"
              type="date"
              value={form.assessmentDate}
              onChange={set('assessmentDate')}
              size="small"
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              label="الدرجة (0-100)"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={form.score}
              onChange={set('score')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={8}>
            <FormControl fullWidth size="small">
              <InputLabel>التفسير السريري</InputLabel>
              <Select
                value={form.interpretation}
                onChange={set('interpretation')}
                label="التفسير السريري"
              >
                <MenuItem value="">
                  <em>غير محدد</em>
                </MenuItem>
                {Object.entries(INTERPRETATION_MAP).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="ملاحظات سريرية"
              value={form.notes}
              onChange={set('notes')}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'حفظ التقييم'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Assessment Detail Dialog ──────────────────────────────────────────── */
function AssessmentDetailDialog({ assessment, open, onClose }) {
  if (!assessment) return null;
  const cat = CATEGORY_OPTIONS.find(c => c.value === assessment.category);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon sx={{ color: cat?.color || 'primary.main' }} />
          <Typography fontWeight="bold">{assessment.tool}</Typography>
          <Chip
            label={cat?.label || assessment.category}
            size="small"
            sx={{ bgcolor: `${cat?.color}20`, color: cat?.color, borderColor: cat?.color }}
            variant="outlined"
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              المستفيد
            </Typography>
            <Typography fontWeight="bold">
              {assessment.beneficiary?.name ||
                assessment.beneficiary?.nameAr ||
                assessment.beneficiary ||
                '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              تاريخ التقييم
            </Typography>
            <Typography fontWeight="bold">
              {assessment.assessmentDate ? _fmtDate(assessment.assessmentDate) : '—'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              الدرجة
            </Typography>
            <Box mt={0.5}>
              <ScoreBar score={assessment.score} interpretation={assessment.interpretation} />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              الحالة
            </Typography>
            <Box mt={0.5}>
              <Chip
                label={STATUS_MAP[assessment.status]?.label || assessment.status || 'غير محدد'}
                color={STATUS_MAP[assessment.status]?.color || 'default'}
                size="small"
              />
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="caption" color="text.secondary">
              المدة
            </Typography>
            <Typography fontWeight="bold">
              {assessment.duration ? `${assessment.duration} دقيقة` : '—'}
            </Typography>
          </Grid>
          {assessment.scoreBreakdown?.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                توزيع الدرجات على المجالات
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المجال</TableCell>
                      <TableCell>الدرجة</TableCell>
                      <TableCell>الشريط</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assessment.scoreBreakdown.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.domain}</TableCell>
                        <TableCell>{s.score ?? '—'}</TableCell>
                        <TableCell sx={{ minWidth: 100 }}>
                          {s.score != null && (
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(s.score, 100)}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          )}
          {assessment.notes && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                الملاحظات السريرية
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                <Typography variant="body2">{assessment.notes}</Typography>
              </Paper>
            </Grid>
          )}
          {assessment.recommendations && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                التوصيات
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'info.50' }}>
                <Typography variant="body2">{assessment.recommendations}</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 *  MAIN PAGE
 * ══════════════════════════════════════════════════════════════════════════ */
export default function AssessmentsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Context from URL
  const ctxEpisodeId = searchParams.get('episodeId') || '';
  const ctxBeneficiaryId = searchParams.get('beneficiaryId') || '';

  // State
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dashboard stats
  const [stats, setStats] = useState(null);

  // UI
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  /* ── Fetch list ── */
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: perPage,
        skip: (page - 1) * perPage,
        ...(search && { search }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterStatus && { status: filterStatus }),
        ...(ctxBeneficiaryId && { beneficiaryId: ctxBeneficiaryId }),
        ...(ctxEpisodeId && { episodeId: ctxEpisodeId }),
      };
      const res = await assessmentsAPI.list(params);
      const d = res?.data;
      const items = d?.data ?? (Array.isArray(d) ? d : []);
      setAssessments(items);
      setTotal(d?.total ?? items.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterStatus, ctxBeneficiaryId, ctxEpisodeId]);

  /* ── Fetch stats ── */
  const fetchStats = useCallback(async () => {
    try {
      const res = await assessmentsAPI.getDashboard();
      setStats(res?.data?.data || res?.data || null);
    } catch (_e) {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-open create dialog when beneficiaryId is in URL
  useEffect(() => {
    if (ctxBeneficiaryId) setCreateOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount
  }, []);

  const pageCount = Math.ceil(total / perPage);

  const catCounts = assessments.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Context Banner */}
      {(ctxEpisodeId || ctxBeneficiaryId) && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Stack direction="row" spacing={1}>
              {ctxEpisodeId && (
                <Button
                  size="small"
                  startIcon={<EpisodeIcon />}
                  onClick={() => navigate(`/platform/episodes`)}
                >
                  الحلقة
                </Button>
              )}
              <Button size="small" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
                رجوع
              </Button>
            </Stack>
          }
        >
          {ctxBeneficiaryId && `عرض تقييمات المستفيد: ${ctxBeneficiaryId}`}
          {ctxEpisodeId && ` | الحلقة: ${ctxEpisodeId}`}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <AssignmentIcon color="primary" />
            التقييمات السريرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة التقييمات بالأدوات المقننة وتتبع التحسن عبر الزمن
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            تقييم جديد
          </Button>
          <IconButton
            onClick={() => {
              fetchAssessments();
              fetchStats();
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="إجمالي التقييمات"
            value={stats?.total ?? total}
            color="#2563eb"
            icon={<AssignmentIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="مكتملة"
            value={stats?.completed ?? assessments.filter(a => a.status === 'completed').length}
            color="#16a34a"
            icon={<CheckCircleIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="جارية"
            value={stats?.inProgress ?? assessments.filter(a => a.status === 'in_progress').length}
            color="#d97706"
            icon={<PendingIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="متوسط الدرجة"
            value={
              assessments.filter(a => a.score != null).length > 0
                ? `${Math.round(assessments.filter(a => a.score != null).reduce((s, a) => s + a.score, 0) / assessments.filter(a => a.score != null).length)}%`
                : '—'
            }
            color="#7c3aed"
            icon={<StarIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="قائمة التقييمات" icon={<AssignmentIcon />} iconPosition="start" />
        <Tab label="توزيع الفئات" icon={<TrendingUpIcon />} iconPosition="start" />
      </Tabs>

      {tab === 0 && (
        <>
          {/* Filters */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    size="small"
                    placeholder="بحث بالأداة أو المستفيد..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    fullWidth
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>الفئة</InputLabel>
                    <Select
                      value={filterCategory}
                      onChange={e => {
                        setFilterCategory(e.target.value);
                        setPage(1);
                      }}
                      label="الفئة"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {CATEGORY_OPTIONS.map(c => (
                        <MenuItem key={c.value} value={c.value}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth size="small">
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
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {loading && <LinearProgress sx={{ mb: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>الأداة / المقياس</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الدرجة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <PsychologyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">لا توجد تقييمات</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  assessments.map(a => {
                    const cat = CATEGORY_OPTIONS.find(c => c.value === a.category);
                    return (
                      <TableRow
                        key={a._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => setDetailItem(a)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {a.tool}
                          </Typography>
                          {a.toolVersion && (
                            <Typography variant="caption" color="text.secondary">
                              {a.toolVersion}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cat?.label || a.category}
                            size="small"
                            sx={{ bgcolor: `${cat?.color}15`, color: cat?.color, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {a.beneficiary?.nameAr || a.beneficiary?.name || a.beneficiary || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {a.assessmentDate ? _fmtDate(a.assessmentDate) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 110 }}>
                          <ScoreBar score={a.score} interpretation={a.interpretation} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={STATUS_MAP[a.status]?.label || a.status || '—'}
                            color={STATUS_MAP[a.status]?.color || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center" onClick={e => e.stopPropagation()}>
                          <Tooltip title="عرض التفاصيل">
                            <IconButton size="small" onClick={() => setDetailItem(a)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {tab === 1 && (
        <Grid container spacing={2}>
          {CATEGORY_OPTIONS.map(c => {
            const count = catCounts[c.value] || 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <Grid item xs={12} sm={6} md={4} key={c.value}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {c.label}
                      </Typography>
                      <Chip
                        label={count}
                        size="small"
                        sx={{ bgcolor: `${c.color}20`, color: c.color }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: `${c.color}15`,
                        '& .MuiLinearProgress-bar': { bgcolor: c.color },
                      }}
                    />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: 'block' }}
                    >
                      {pct}% من الإجمالي
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialogs */}
      <CreateAssessmentDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          fetchAssessments();
          fetchStats();
        }}
        initialBeneficiaryId={ctxBeneficiaryId}
        initialEpisodeId={ctxEpisodeId}
      />
      <AssessmentDetailDialog
        assessment={detailItem}
        open={Boolean(detailItem)}
        onClose={() => setDetailItem(null)}
      />
    </Box>
  );
}
