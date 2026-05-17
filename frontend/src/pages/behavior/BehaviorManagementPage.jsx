/**
 * BehaviorManagementPage — إدارة السلوك
 *
 * الهدف السريري: تسجيل السلوكيات المستهدفة، بناء خطط التدخل السلوكي (BIP)،
 * وتتبع التحسن عبر الزمن. يدعم ABA وفق إطار العمل السلوكي الوظيفي.
 *
 * الوظائف:
 * - تبويبات: سجلات السلوك / خطط التدخل / التحليلات
 * - إنشاء سجل سلوك جديد
 * - إنشاء خطة تدخل سلوكي
 * - ربط بالمستفيد والحلقة العلاجية عبر URL
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Assignment as PlanIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as BackIcon,
  FiberManualRecord as DotIcon,
  List as ListIcon,
  Rule as RuleIcon,
} from '@mui/icons-material';
import { behaviorAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ── Constants ──────────────────────────────────────────────────────────── */
const TOPOGRAPHY_OPTIONS = [
  'العدوان الجسدي',
  'إيذاء الذات',
  'نوبات الغضب',
  'الصراخ',
  'الهروب والتجنب',
  'السلوك النمطي',
  'الرفض',
  'تدمير الممتلكات',
  'الكلام غير اللائق',
  'سلوك آخر',
];

const SEVERITY_MAP = {
  mild: { label: 'خفيف', color: '#d97706' },
  moderate: { label: 'متوسط', color: '#ea580c' },
  severe: { label: 'شديد', color: '#dc2626' },
};

const ANTECEDENT_OPTIONS = [
  'طلب مهمة',
  'تغيير الروتين',
  'رفض الطلب',
  'انتهاء النشاط المفضل',
  'الازدحام/الضوضاء',
  'الانتظار',
  'التفاعل الاجتماعي',
  'غير محدد',
];

const CONSEQUENCE_OPTIONS = [
  'توقف الطلب',
  'الحصول على الاهتمام',
  'الهروب من الموقف',
  'الوصول إلى الشيء المفضل',
  'توجيه التهدئة',
  'التجاهل',
  'غير محدد',
];

const PLAN_STATUS_MAP = {
  draft: { label: 'مسودة', color: 'default' },
  active: { label: 'نشطة', color: 'success' },
  review: { label: 'قيد المراجعة', color: 'warning' },
  completed: { label: 'مكتملة', color: 'info' },
  suspended: { label: 'موقوفة', color: 'error' },
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

/* ── Create Record Dialog ──────────────────────────────────────────────── */
function CreateRecordDialog({ open, onClose, onSaved, initialBeneficiaryId, initialEpisodeId }) {
  const [form, setForm] = useState({
    beneficiaryId: initialBeneficiaryId || '',
    episodeId: initialEpisodeId || '',
    topography: '',
    customTopography: '',
    severity: 'moderate',
    duration: '',
    frequency: '',
    antecedent: '',
    consequence: '',
    setting: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(f => ({
        ...f,
        beneficiaryId: initialBeneficiaryId || '',
        episodeId: initialEpisodeId || '',
      }));
      setError(null);
    }
  }, [open, initialBeneficiaryId, initialEpisodeId]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    const topographyVal = form.topography === 'سلوك آخر' ? form.customTopography : form.topography;
    if (!topographyVal || !form.beneficiaryId) {
      setError('يرجى تعبئة: المستفيد ونوع السلوك.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await behaviorAPI.createRecord({
        beneficiaryId: form.beneficiaryId,
        episodeOfCareId: form.episodeId || undefined,
        topography: topographyVal,
        severity: form.severity,
        duration: form.duration ? Number(form.duration) : undefined,
        frequency: form.frequency ? Number(form.frequency) : undefined,
        antecedent: form.antecedent || undefined,
        consequence: form.consequence || undefined,
        setting: form.setting || undefined,
        occurredAt: form.date,
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
          <WarningIcon color="warning" />
          <Typography fontWeight="bold">تسجيل سلوك جديد (ABC)</Typography>
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
            <TextField
              label="معرّف المستفيد"
              value={form.beneficiaryId}
              onChange={set('beneficiaryId')}
              size="small"
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="حلقة الرعاية (اختياري)"
              value={form.episodeId}
              onChange={set('episodeId')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" required>
              <InputLabel>طبيعة السلوك (Topography)</InputLabel>
              <Select
                value={form.topography}
                onChange={set('topography')}
                label="طبيعة السلوك (Topography)"
              >
                {TOPOGRAPHY_OPTIONS.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {form.topography === 'سلوك آخر' && (
            <Grid item xs={12} sm={6}>
              <TextField
                label="وصف السلوك"
                value={form.customTopography}
                onChange={set('customTopography')}
                size="small"
                fullWidth
                required
              />
            </Grid>
          )}
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>الشدة</InputLabel>
              <Select value={form.severity} onChange={set('severity')} label="الشدة">
                {Object.entries(SEVERITY_MAP).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              label="المدة (دقائق)"
              type="number"
              inputProps={{ min: 0 }}
              value={form.duration}
              onChange={set('duration')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={6} sm={4}>
            <TextField
              label="التكرار (مرات)"
              type="number"
              inputProps={{ min: 0 }}
              value={form.frequency}
              onChange={set('frequency')}
              size="small"
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>المثير السابق (A)</InputLabel>
              <Select
                value={form.antecedent}
                onChange={set('antecedent')}
                label="المثير السابق (A)"
              >
                <MenuItem value="">
                  <em>غير محدد</em>
                </MenuItem>
                {ANTECEDENT_OPTIONS.map(a => (
                  <MenuItem key={a} value={a}>
                    {a}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>النتيجة/التعزيز (C)</InputLabel>
              <Select
                value={form.consequence}
                onChange={set('consequence')}
                label="النتيجة/التعزيز (C)"
              >
                <MenuItem value="">
                  <em>غير محدد</em>
                </MenuItem>
                {CONSEQUENCE_OPTIONS.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="بيئة الحدث"
              value={form.setting}
              onChange={set('setting')}
              size="small"
              fullWidth
              placeholder="مثال: الفصل، العيادة، المنزل"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="تاريخ الحدث"
              type="date"
              value={form.date}
              onChange={set('date')}
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
        <Button variant="contained" onClick={handleSave} disabled={saving} color="warning">
          {saving ? <CircularProgress size={18} /> : 'تسجيل السلوك'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Create Plan Dialog ────────────────────────────────────────────────── */
function CreatePlanDialog({ open, onClose, onSaved, initialBeneficiaryId }) {
  const [form, setForm] = useState({
    beneficiaryId: initialBeneficiaryId || '',
    targetBehavior: '',
    operationalDefinition: '',
    hypothesizedFunction: 'escape',
    replacementBehavior: '',
    interventionStrategies: '',
    reinforcers: '',
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
    if (!form.beneficiaryId || !form.targetBehavior) {
      setError('يرجى تعبئة: المستفيد والسلوك المستهدف.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await behaviorAPI.createPlan({
        beneficiaryId: form.beneficiaryId,
        targetBehavior: form.targetBehavior,
        operationalDefinition: form.operationalDefinition || undefined,
        hypothesizedFunction: form.hypothesizedFunction,
        replacementBehavior: form.replacementBehavior || undefined,
        interventionStrategies: form.interventionStrategies
          ? form.interventionStrategies.split('\n').filter(Boolean)
          : [],
        reinforcers: form.reinforcers
          ? form.reinforcers
              .split('،')
              .map(s => s.trim())
              .filter(Boolean)
          : [],
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
          <PlanIcon color="primary" />
          <Typography fontWeight="bold">خطة تدخل سلوكي جديدة (BIP)</Typography>
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
              label="السلوك المستهدف"
              value={form.targetBehavior}
              onChange={set('targetBehavior')}
              size="small"
              fullWidth
              required
              placeholder="مثال: الاعتداء على الزملاء بالعض"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="التعريف الإجرائي"
              value={form.operationalDefinition}
              onChange={set('operationalDefinition')}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="وصف قابل للقياس والملاحظة..."
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>الوظيفة المفترضة للسلوك</InputLabel>
              <Select
                value={form.hypothesizedFunction}
                onChange={set('hypothesizedFunction')}
                label="الوظيفة المفترضة للسلوك"
              >
                <MenuItem value="escape">هروب / تجنب</MenuItem>
                <MenuItem value="attention">طلب الاهتمام</MenuItem>
                <MenuItem value="tangible">الحصول على شيء ملموس</MenuItem>
                <MenuItem value="sensory">تحفيز ذاتي / حسي</MenuItem>
                <MenuItem value="unknown">غير محدد</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="السلوك البديل المقترح"
              value={form.replacementBehavior}
              onChange={set('replacementBehavior')}
              size="small"
              fullWidth
              placeholder="مثال: الإشارة لطلب المساعدة"
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="استراتيجيات التدخل (كل سطر استراتيجية)"
              value={form.interventionStrategies}
              onChange={set('interventionStrategies')}
              size="small"
              fullWidth
              multiline
              rows={3}
              placeholder={
                'تعديل البيئة لتقليل المثيرات\nتعليم السلوك البديل\nتعزيز السلوك المناسب'
              }
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="المعززات الفعّالة (مفصولة بـ ،)"
              value={form.reinforcers}
              onChange={set('reinforcers')}
              size="small"
              fullWidth
              placeholder="الألعاب، الرسم، وقت الحاسوب"
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
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'حفظ الخطة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ── Plan Detail Dialog ────────────────────────────────────────────────── */
function PlanDetailDialog({ plan, open, onClose, onApprove }) {
  const [approving, setApproving] = useState(false);
  if (!plan) return null;

  const handleApprove = async () => {
    setApproving(true);
    try {
      await behaviorAPI.approvePlan(plan._id);
      onApprove();
      onClose();
    } catch (_e) {
      // ignore
    } finally {
      setApproving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PlanIcon color="primary" />
          <Typography fontWeight="bold">خطة التدخل السلوكي</Typography>
          <Chip
            label={PLAN_STATUS_MAP[plan.status]?.label || plan.status}
            color={PLAN_STATUS_MAP[plan.status]?.color || 'default'}
            size="small"
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
              السلوك المستهدف
            </Typography>
            <Typography fontWeight="bold" color="error.main">
              {plan.targetBehavior}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">
              الوظيفة المفترضة
            </Typography>
            <Chip
              label={
                {
                  escape: 'هروب/تجنب',
                  attention: 'طلب الاهتمام',
                  tangible: 'الحصول على شيء',
                  sensory: 'تحفيز ذاتي',
                  unknown: 'غير محدد',
                }[plan.hypothesizedFunction] || plan.hypothesizedFunction
              }
              color="warning"
              size="small"
            />
          </Grid>
          {plan.operationalDefinition && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                التعريف الإجرائي
              </Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                <Typography variant="body2">{plan.operationalDefinition}</Typography>
              </Paper>
            </Grid>
          )}
          {plan.replacementBehavior && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">
                السلوك البديل
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight="bold">
                ✓ {plan.replacementBehavior}
              </Typography>
            </Grid>
          )}
          {plan.interventionStrategies?.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                استراتيجيات التدخل
              </Typography>
              <List dense disablePadding>
                {plan.interventionStrategies.map((s, i) => (
                  <ListItem key={i} disableGutters>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <DotIcon sx={{ fontSize: 10, color: 'primary.main' }} />
                    </ListItemIcon>
                    <ListItemText primary={s} primaryTypographyProps={{ variant: 'body2' }} />
                  </ListItem>
                ))}
              </List>
            </Grid>
          )}
          {plan.reinforcers?.length > 0 && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                المعززات
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                {plan.reinforcers.map((r, i) => (
                  <Chip key={i} label={r} size="small" color="success" variant="outlined" />
                ))}
              </Stack>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {plan.status === 'draft' && (
          <Button variant="contained" color="success" onClick={handleApprove} disabled={approving}>
            {approving ? <CircularProgress size={18} /> : 'اعتماد الخطة'}
          </Button>
        )}
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 *  MAIN PAGE
 * ══════════════════════════════════════════════════════════════════════════ */
export default function BehaviorManagementPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const ctxBeneficiaryId = searchParams.get('beneficiaryId') || '';
  const ctxEpisodeId = searchParams.get('episodeId') || '';

  const [tab, setTab] = useState(0);

  // Records state
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState(null);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordSearch, setRecordSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');

  // Plans state
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState(null);
  const [plansTotal, setPlansTotal] = useState(0);
  const [plansPage, setPlansPage] = useState(1);

  const perPage = 15;

  // UI
  const [createRecordOpen, setCreateRecordOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [detailPlan, setDetailPlan] = useState(null);

  /* ── Fetch records ── */
  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const params = {
        limit: perPage,
        page: recordsPage,
        ...(ctxBeneficiaryId && { beneficiaryId: ctxBeneficiaryId }),
        ...(filterSeverity && { severity: filterSeverity }),
      };
      const res = await behaviorAPI.listRecords(params);
      const d = res?.data;
      const items = d?.data ?? (Array.isArray(d) ? d : []);
      setRecords(items);
      setRecordsTotal(d?.total ?? items.length);
    } catch (err) {
      setRecordsError(err.message);
    } finally {
      setRecordsLoading(false);
    }
  }, [recordsPage, filterSeverity, ctxBeneficiaryId]);

  /* ── Fetch plans ── */
  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const params = {
        limit: perPage,
        page: plansPage,
        ...(ctxBeneficiaryId && { beneficiaryId: ctxBeneficiaryId }),
      };
      const res = await behaviorAPI.listPlans(params);
      const d = res?.data;
      const items = d?.data ?? (Array.isArray(d) ? d : []);
      setPlans(items);
      setPlansTotal(d?.total ?? items.length);
    } catch (err) {
      setPlansError(err.message);
    } finally {
      setPlansLoading(false);
    }
  }, [plansPage, ctxBeneficiaryId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const recordsPageCount = Math.ceil(recordsTotal / perPage);
  const plansPageCount = Math.ceil(plansTotal / perPage);

  const severeCount = records.filter(r => r.severity === 'severe').length;
  const activePlans = plans.filter(p => p.status === 'active').length;

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Context Banner */}
      {(ctxEpisodeId || ctxBeneficiaryId) && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button size="small" startIcon={<BackIcon />} onClick={() => navigate(-1)}>
              رجوع
            </Button>
          }
        >
          {ctxBeneficiaryId && `إدارة سلوك المستفيد: ${ctxBeneficiaryId}`}
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
            <PsychologyIcon color="warning" />
            إدارة السلوك
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحليل السلوك التطبيقي — تسجيل السلوكيات وخطط التدخل (ABA/BIP)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<WarningIcon />}
            onClick={() => setCreateRecordOpen(true)}
          >
            تسجيل سلوك
          </Button>
          <Button
            variant="contained"
            startIcon={<PlanIcon />}
            onClick={() => setCreatePlanOpen(true)}
          >
            خطة تدخل
          </Button>
          <IconButton
            onClick={() => {
              fetchRecords();
              fetchPlans();
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
            label="سجلات السلوك"
            value={recordsTotal}
            color="#d97706"
            icon={<WarningIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="سلوكيات شديدة"
            value={severeCount}
            color="#dc2626"
            icon={<RuleIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="خطط التدخل"
            value={plansTotal}
            color="#2563eb"
            icon={<PlanIcon fontSize="small" />}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            label="خطط نشطة"
            value={activePlans}
            color="#16a34a"
            icon={<CheckCircleIcon fontSize="small" />}
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`سجلات السلوك (${recordsTotal})`} icon={<ListIcon />} iconPosition="start" />
        <Tab label={`خطط التدخل BIP (${plansTotal})`} icon={<PlanIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0 — Records */}
      {tab === 0 && (
        <>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={7}>
                  <TextField
                    size="small"
                    placeholder="بحث بالسلوك أو البيئة..."
                    value={recordSearch}
                    onChange={e => setRecordSearch(e.target.value)}
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
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>الشدة</InputLabel>
                    <Select
                      value={filterSeverity}
                      onChange={e => {
                        setFilterSeverity(e.target.value);
                        setRecordsPage(1);
                      }}
                      label="الشدة"
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {Object.entries(SEVERITY_MAP).map(([k, v]) => (
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

          {recordsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {recordsError}
            </Alert>
          )}
          {recordsLoading && <LinearProgress sx={{ mb: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>السلوك</TableCell>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>المثير (A)</TableCell>
                  <TableCell>النتيجة (C)</TableCell>
                  <TableCell>الشدة</TableCell>
                  <TableCell>التكرار</TableCell>
                  <TableCell>التاريخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.length === 0 && !recordsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <PsychologyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">لا توجد سجلات سلوكية</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  records
                    .filter(
                      r =>
                        !recordSearch ||
                        r.topography?.includes(recordSearch) ||
                        r.setting?.includes(recordSearch)
                    )
                    .map(r => (
                      <TableRow key={r._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {r.topography}
                          </Typography>
                          {r.setting && (
                            <Typography variant="caption" color="text.secondary">
                              {r.setting}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {r.beneficiary?.nameAr || r.beneficiary?.name || r.beneficiaryId || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{r.antecedent || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{r.consequence || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={SEVERITY_MAP[r.severity]?.label || r.severity || '—'}
                            size="small"
                            sx={{
                              bgcolor: `${SEVERITY_MAP[r.severity]?.color}20`,
                              color: SEVERITY_MAP[r.severity]?.color,
                              fontSize: 11,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {r.frequency != null ? (
                            <Chip label={`${r.frequency}×`} size="small" variant="outlined" />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {r.occurredAt ? _fmtDate(r.occurredAt) : '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {recordsPageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={recordsPageCount}
                page={recordsPage}
                onChange={(_, v) => setRecordsPage(v)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Tab 1 — Plans */}
      {tab === 1 && (
        <>
          {plansError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {plansError}
            </Alert>
          )}
          {plansLoading && <LinearProgress sx={{ mb: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>السلوك المستهدف</TableCell>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>الوظيفة</TableCell>
                  <TableCell>السلوك البديل</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plans.length === 0 && !plansLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <PlanIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                      <Typography color="text.secondary">لا توجد خطط تدخل</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  plans.map(p => (
                    <TableRow
                      key={p._id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setDetailPlan(p)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="error.main">
                          {p.targetBehavior}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {p.beneficiary?.nameAr || p.beneficiary?.name || p.beneficiaryId || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            {
                              escape: 'هروب',
                              attention: 'اهتمام',
                              tangible: 'حصول',
                              sensory: 'حسي',
                              unknown: 'غير محدد',
                            }[p.hypothesizedFunction] ||
                            p.hypothesizedFunction ||
                            '—'
                          }
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main">
                          {p.replacementBehavior || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={PLAN_STATUS_MAP[p.status]?.label || p.status || '—'}
                          color={PLAN_STATUS_MAP[p.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center" onClick={e => e.stopPropagation()}>
                        <Tooltip title="عرض التفاصيل">
                          <IconButton size="small" onClick={() => setDetailPlan(p)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {plansPageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={plansPageCount}
                page={plansPage}
                onChange={(_, v) => setPlansPage(v)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Dialogs */}
      <CreateRecordDialog
        open={createRecordOpen}
        onClose={() => setCreateRecordOpen(false)}
        onSaved={fetchRecords}
        initialBeneficiaryId={ctxBeneficiaryId}
        initialEpisodeId={ctxEpisodeId}
      />
      <CreatePlanDialog
        open={createPlanOpen}
        onClose={() => setCreatePlanOpen(false)}
        onSaved={fetchPlans}
        initialBeneficiaryId={ctxBeneficiaryId}
      />
      <PlanDetailDialog
        plan={detailPlan}
        open={Boolean(detailPlan)}
        onClose={() => setDetailPlan(null)}
        onApprove={fetchPlans}
      />
    </Box>
  );
}
