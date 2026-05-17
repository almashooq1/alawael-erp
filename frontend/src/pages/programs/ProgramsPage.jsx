/**
 * ProgramsPage — برامج التأهيل
 *
 * الهدف السريري: إدارة برامج التأهيل المتخصصة، تسجيل المستفيدين،
 * ومتابعة التقدم الفردي. يدعم 7 فئات برامج.
 *
 * الوظائف:
 * - قائمة البرامج مع الفلترة والبحث
 * - إنشاء برنامج جديد
 * - تسجيل مستفيد في برنامج (Enrollment)
 * - تحديث تقدم المستفيد
 * - عرض التوصيات الذكية للبرامج
 * - ربط URL context: ?beneficiaryId=
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  Button,
  Chip,
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
  Stack,
  CircularProgress,
  InputAdornment,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
  Divider,
} from '@mui/material';
import {
  School as ProgramIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Groups as GroupIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as DurationIcon,
  Lightbulb as RecommendIcon,
  ArrowBack as BackIcon,
  TrendingUp as ProgressIcon,
  PersonAdd as EnrollIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { programsAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ── Constants ──────────────────────────────────────────────────────────── */
const CATEGORY_MAP = {
  physical: { label: 'علاج طبيعي', color: '#2563eb' },
  cognitive: { label: 'تدريب معرفي', color: '#7c3aed' },
  occupational: { label: 'علاج وظيفي', color: '#d97706' },
  speech: { label: 'تخاطب', color: '#059669' },
  behavioral: { label: 'سلوكي (ABA)', color: '#dc2626' },
  educational: { label: 'تعليمي', color: '#0891b2' },
  vocational: { label: 'تأهيل مهني', color: '#9333ea' },
};

const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  completed: { label: 'مكتمل', color: 'info' },
  paused: { label: 'موقوف', color: 'warning' },
};

const ENROLLMENT_STATUS_MAP = {
  enrolled: { label: 'مسجل', color: 'primary' },
  active: { label: 'نشط', color: 'success' },
  completed: { label: 'أكمل', color: 'info' },
  dropped: { label: 'انسحب', color: 'error' },
  pending: { label: 'بانتظار', color: 'warning' },
};

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

/* ── Progress Bar ──────────────────────────────────────────────────────── */
function CapacityBar({ current, target }) {
  if (!target)
    return (
      <Typography variant="caption" color="text.secondary">
        —
      </Typography>
    );
  const pct = Math.min(100, Math.round((current / target) * 100));
  const color = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary';
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption">
          {current} / {target}
        </Typography>
        <Typography variant="caption" color={`${color}.main`}>
          {pct}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

/* ── Create Program Dialog ─────────────────────────────────────────────── */
function CreateProgramDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'physical',
    duration: '',
    targetParticipants: '',
    startDate: '',
    endDate: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setError(null);
    }
  }, [open]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.category) {
      setError('يرجى تعبئة: اسم البرنامج والفئة.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await programsAPI.create({
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        duration: form.duration ? Number(form.duration) : undefined,
        targetParticipants: form.targetParticipants ? Number(form.targetParticipants) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        tags: form.tags
          ? form.tags
              .split('،')
              .map(t => t.trim())
              .filter(Boolean)
          : [],
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
          <ProgramIcon color="primary" />
          <Typography fontWeight="bold">برنامج تأهيل جديد</Typography>
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
          <Grid item xs={12}>
            <TextField
              label="اسم البرنامج"
              value={form.name}
              onChange={set('name')}
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>الفئة</InputLabel>
              <Select value={form.category} onChange={set('category')} label="الفئة">
                {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="المدة (أسابيع)"
              type="number"
              inputProps={{ min: 1 }}
              value={form.duration}
              onChange={set('duration')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="الطاقة الاستيعابية"
              type="number"
              inputProps={{ min: 1 }}
              value={form.targetParticipants}
              onChange={set('targetParticipants')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="تاريخ البدء"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="وصف البرنامج"
              value={form.description}
              onChange={set('description')}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="الوسوم (مفصولة بـ ،)"
              value={form.tags}
              onChange={set('tags')}
              size="small"
              fullWidth
              placeholder="مثال: مكثف، مبكر، دمج"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'حفظ البرنامج'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Enroll Dialog ─────────────────────────────────────────────────────── */
function EnrollDialog({ program, open, onClose, onSaved, initialBeneficiaryId }) {
  const [form, setForm] = useState({
    beneficiaryId: initialBeneficiaryId || '',
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, beneficiaryId: initialBeneficiaryId || '' }));
      setError(null);
    }
  }, [open, initialBeneficiaryId]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.beneficiaryId) {
      setError('يرجى إدخال معرّف المستفيد.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await programsAPI.enroll(program._id, {
        beneficiaryId: form.beneficiaryId,
        startDate: form.startDate,
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

  if (!program) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography fontWeight="bold">تسجيل في البرنامج</Typography>
          <Typography variant="caption" color="text.secondary">
            {program.name}
          </Typography>
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
          <Grid item xs={12}>
            <TextField
              label="معرّف المستفيد"
              value={form.beneficiaryId}
              onChange={set('beneficiaryId')}
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="تاريخ البدء"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={set('notes')}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<EnrollIcon />}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <CircularProgress size={18} /> : 'تسجيل'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Enrollments Dialog ────────────────────────────────────────────────── */
function EnrollmentsDialog({ program, open, onClose }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progressForm, setProgressForm] = useState({ enrollmentId: null, value: '' });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open && program) {
      setLoading(true);
      programsAPI
        .getEnrollments(program._id)
        .then(res => {
          const d = res?.data;
          setEnrollments(d?.data ?? (Array.isArray(d) ? d : []));
        })
        .catch(() => setEnrollments([]))
        .finally(() => setLoading(false));
    }
  }, [open, program]);

  const handleUpdateProgress = async enrollmentId => {
    if (!progressForm.value) return;
    setUpdating(true);
    try {
      await programsAPI.updateProgress(enrollmentId, { progress: Number(progressForm.value) });
      setProgressForm({ enrollmentId: null, value: '' });
      // refresh
      const res = await programsAPI.getEnrollments(program._id);
      const d = res?.data;
      setEnrollments(d?.data ?? (Array.isArray(d) ? d : []));
    } catch (_e) {
      // ignore
    } finally {
      setUpdating(false);
    }
  };

  if (!program) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography fontWeight="bold">المسجلون — {program.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {enrollments.length} مسجل
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 1 }} />}
        {enrollments.length === 0 && !loading ? (
          <Typography color="text.secondary" align="center" py={3}>
            لا يوجد مسجلون بعد
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التقدم</TableCell>
                  <TableCell>تاريخ التسجيل</TableCell>
                  <TableCell>تحديث التقدم</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {enrollments.map(en => (
                  <TableRow key={en._id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {en.beneficiary?.nameAr || en.beneficiary?.name || en.beneficiaryId || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ENROLLMENT_STATUS_MAP[en.status]?.label || en.status || '—'}
                        color={ENROLLMENT_STATUS_MAP[en.status]?.color || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 140 }}>
                      <Box>
                        <Typography variant="caption">{en.progress ?? 0}%</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={en.progress ?? 0}
                          sx={{ height: 6, borderRadius: 3, mt: 0.3 }}
                          color={en.progress >= 80 ? 'success' : 'primary'}
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {en.startDate ? _fmtDate(en.startDate) : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {progressForm.enrollmentId === en._id ? (
                        <Stack direction="row" spacing={0.5}>
                          <TextField
                            size="small"
                            type="number"
                            inputProps={{ min: 0, max: 100 }}
                            value={progressForm.value}
                            onChange={e =>
                              setProgressForm({ enrollmentId: en._id, value: e.target.value })
                            }
                            sx={{ width: 70 }}
                          />
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => handleUpdateProgress(en._id)}
                            disabled={updating}
                          >
                            {updating ? <CircularProgress size={14} /> : 'حفظ'}
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => setProgressForm({ enrollmentId: null, value: '' })}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ) : (
                        <Button
                          size="small"
                          startIcon={<ProgressIcon />}
                          onClick={() =>
                            setProgressForm({
                              enrollmentId: en._id,
                              value: String(en.progress ?? 0),
                            })
                          }
                        >
                          تحديث
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
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
export default function ProgramsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ctxBeneficiaryId = searchParams.get('beneficiaryId') || '';

  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [tab, setTab] = useState(0);

  // Recommendations for beneficiary context
  const [recommendations, setRecommendations] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [enrollTarget, setEnrollTarget] = useState(null);
  const [enrollmentsTarget, setEnrollmentsTarget] = useState(null);

  const perPage = 12;

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limit: perPage,
        page,
        ...(search && { search }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterStatus && { status: filterStatus }),
      };
      const res = await programsAPI.list(params);
      const d = res?.data;
      const items = d?.data ?? (Array.isArray(d) ? d : []);
      setPrograms(items);
      setTotal(d?.total ?? items.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterCategory, filterStatus]);

  const fetchRecommendations = useCallback(async () => {
    if (!ctxBeneficiaryId) return;
    setRecsLoading(true);
    try {
      const res = await programsAPI.getRecommendations(ctxBeneficiaryId);
      const d = res?.data;
      setRecommendations(d?.recommendations ?? (Array.isArray(d) ? d : []));
    } catch (_e) {
      setRecommendations([]);
    } finally {
      setRecsLoading(false);
    }
  }, [ctxBeneficiaryId]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const activeCount = programs.filter(p => p.status === 'active').length;
  const totalEnrolled = programs.reduce((s, p) => s + (p.currentParticipants || 0), 0);
  const pageCount = Math.ceil(total / perPage);

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Context Banner */}
      {ctxBeneficiaryId && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <Button size="small" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
              رجوع
            </Button>
          }
        >
          عرض البرامج للمستفيد: {ctxBeneficiaryId}
          {recommendations.length > 0 && ` | ${recommendations.length} برنامج موصى به`}
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
            <ProgramIcon color="primary" />
            برامج التأهيل
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة البرامج التأهيلية وتتبع إنجاز المستفيدين
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            برنامج جديد
          </Button>
          <IconButton onClick={fetchPrograms}>
            <RefreshIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="إجمالي البرامج"
            value={total}
            color="#2563eb"
            icon={<ProgramIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="برامج نشطة"
            value={activeCount}
            color="#16a34a"
            icon={<CheckCircleIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="إجمالي المسجلين"
            value={totalEnrolled}
            color="#7c3aed"
            icon={<GroupIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="توصيات ذكية"
            value={recommendations.length}
            color="#d97706"
            icon={<RecommendIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="قائمة البرامج" />
        {ctxBeneficiaryId && (
          <Tab
            label={
              <Badge badgeContent={recommendations.length} color="warning">
                توصيات للمستفيد
              </Badge>
            }
          />
        )}
      </Tabs>

      {/* Tab 0: Programs List */}
      {tab === 0 && (
        <>
          {/* Filters */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="بحث باسم البرنامج..."
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
                      {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v.label}
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

          {/* Programs Grid */}
          <Grid container spacing={2}>
            {programs.length === 0 && !loading ? (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
                  <ProgramIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">لا توجد برامج مطابقة</Typography>
                </Paper>
              </Grid>
            ) : (
              programs.map(p => (
                <Grid item xs={12} sm={6} md={4} key={p._id}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: '100%',
                      borderRight: `4px solid ${CATEGORY_MAP[p.category]?.color || '#9ca3af'}`,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      {/* Category & Status row */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        mb={1}
                      >
                        <Chip
                          label={CATEGORY_MAP[p.category]?.label || p.category}
                          size="small"
                          sx={{
                            bgcolor: `${CATEGORY_MAP[p.category]?.color}20`,
                            color: CATEGORY_MAP[p.category]?.color,
                            fontWeight: 'bold',
                          }}
                        />
                        <Chip
                          label={STATUS_MAP[p.status]?.label || p.status}
                          color={STATUS_MAP[p.status]?.color || 'default'}
                          size="small"
                        />
                      </Stack>

                      <Typography variant="subtitle1" fontWeight="bold" mb={0.5}>
                        {p.name}
                      </Typography>

                      {p.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          mb={1}
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {p.description}
                        </Typography>
                      )}

                      {/* Duration */}
                      {p.duration && (
                        <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                          <DurationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {p.duration} أسبوع
                          </Typography>
                        </Stack>
                      )}

                      {/* Capacity Bar */}
                      <CapacityBar
                        current={p.currentParticipants || 0}
                        target={p.targetParticipants}
                      />

                      {/* Tags */}
                      {p.tags?.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={1}>
                          {p.tags.map(t => (
                            <Chip
                              key={t}
                              label={t}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: 10 }}
                            />
                          ))}
                        </Stack>
                      )}
                    </CardContent>

                    <Divider />
                    <CardActions sx={{ justifyContent: 'space-between', px: 1.5, py: 1 }}>
                      <Button
                        size="small"
                        startIcon={<EnrollIcon />}
                        onClick={() => setEnrollTarget(p)}
                        disabled={p.status !== 'active'}
                      >
                        تسجيل مستفيد
                      </Button>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => setEnrollmentsTarget(p)}
                        color="secondary"
                      >
                        المسجلون
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))
            )}
          </Grid>

          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
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

      {/* Tab 1: Recommendations */}
      {tab === 1 && ctxBeneficiaryId && (
        <>
          {recsLoading && <LinearProgress sx={{ mb: 1 }} />}
          {recommendations.length === 0 && !recsLoading && (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <RecommendIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد توصيات للمستفيد حالياً</Typography>
            </Paper>
          )}
          <Grid container spacing={2}>
            {recommendations.map((rec, i) => (
              <Grid item xs={12} sm={6} md={4} key={rec._id || i}>
                <Card variant="outlined" sx={{ borderRight: '4px solid #d97706' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <RecommendIcon color="warning" fontSize="small" />
                      <Typography fontWeight="bold">
                        {rec.programName || rec.name || `برنامج ${i + 1}`}
                      </Typography>
                    </Stack>
                    {rec.reason && (
                      <Typography variant="body2" color="text.secondary">
                        {rec.reason}
                      </Typography>
                    )}
                    {rec.matchScore != null && (
                      <Box mt={1}>
                        <Typography variant="caption">نسبة التطابق: {rec.matchScore}%</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={rec.matchScore}
                          color="warning"
                          sx={{ height: 4, mt: 0.3 }}
                        />
                      </Box>
                    )}
                  </CardContent>
                  <CardActions sx={{ px: 1.5 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<EnrollIcon />}
                      onClick={() => {
                        const prog = programs.find(
                          p => p._id === rec.programId || p.name === rec.programName
                        );
                        if (prog) setEnrollTarget(prog);
                      }}
                    >
                      تسجيل الآن
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Dialogs */}
      <CreateProgramDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={fetchPrograms}
      />
      <EnrollDialog
        program={enrollTarget}
        open={Boolean(enrollTarget)}
        onClose={() => setEnrollTarget(null)}
        onSaved={fetchPrograms}
        initialBeneficiaryId={ctxBeneficiaryId}
      />
      <EnrollmentsDialog
        program={enrollmentsTarget}
        open={Boolean(enrollmentsTarget)}
        onClose={() => setEnrollmentsTarget(null)}
      />
    </Box>
  );
}
