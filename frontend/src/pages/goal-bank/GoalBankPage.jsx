/**
 * GoalBankPage — بنك الأهداف التأهيلية الذكية
 *
 * يتيح للأخصائي والمشرف الإكلينيكي:
 *  Tab 0 — تصفح وبحث (فلترة متقدمة + بطاقات الأهداف)
 *  Tab 1 — إضافة / تعديل هدف
 *
 * مرتبط بـ: Episode of Care → Care Plan → Goals
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Typography,
  Chip,
  Button,
  Stack,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  LinearProgress,
  Alert,
  Avatar,
  Tooltip,
  Paper,
  Divider,
  IconButton,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
} from '@mui/material';
import {
  TrackChanges as GoalIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Domain as DomainIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { goalBankAPI } from '../../services/ddd';

/* ── palette ──────────────────────────────────────────────────────── */
const PRIMARY = '#1b5e20';
const BG = '#e8f5e9';

/* ── difficulty colors ─────────────────────────────────────────────── */
const DIFF_COLOR = {
  easy: 'success',
  medium: 'warning',
  hard: 'error',
  beginner: 'success',
  intermediate: 'warning',
  advanced: 'error',
};
const DIFF_LABEL = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};

/* ── empty form ────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  domain: '',
  category: '',
  difficulty: 'medium',
  title: '',
  description: '',
  criteria: '',
  targetAgeMin: '',
  targetAgeMax: '',
};

/* ════════════════════════════════════════════════════════════════════
 * GoalCard
 * ════════════════════════════════════════════════════════════════════ */
function GoalCard({ goal, onEdit, onDelete }) {
  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `3px solid ${PRIMARY}`,
        '&:hover': { boxShadow: 6 },
        transition: 'box-shadow .2s',
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        <Stack direction="row" spacing={1} mb={1} flexWrap="wrap">
          <Chip label={goal.domain} size="small" color="primary" />
          {goal.difficulty && (
            <Chip
              label={DIFF_LABEL[goal.difficulty] || goal.difficulty}
              size="small"
              color={DIFF_COLOR[goal.difficulty] || 'default'}
            />
          )}
          {goal.category && <Chip label={goal.category} size="small" variant="outlined" />}
        </Stack>
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
          {goal.title || goal.goal_text}
        </Typography>
        {goal.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {goal.description}
          </Typography>
        )}
        {goal.criteria && (
          <Stack direction="row" alignItems="flex-start" spacing={0.5}>
            <CheckIcon sx={{ fontSize: 14, color: PRIMARY, mt: 0.3 }} />
            <Typography variant="caption" color="text.secondary">
              {goal.criteria}
            </Typography>
          </Stack>
        )}
        {(goal.targetAgeMin || goal.targetAgeMax) && (
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            العمر المستهدف: {goal.targetAgeMin ?? '?'}–{goal.targetAgeMax ?? '?'} سنة
          </Typography>
        )}
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        <Tooltip title="تعديل">
          <IconButton size="small" onClick={() => onEdit(goal)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton size="small" color="error" onClick={() => onDelete(goal)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 0 — Browse
 * ════════════════════════════════════════════════════════════════════ */
function BrowseTab({ onEdit }) {
  const [goals, setGoals] = useState([]);
  const [total, setTotal] = useState(0);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    domain: '',
    difficulty: '',
    search: '',
    page: 1,
    limit: 30,
  });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDomains = useCallback(async () => {
    try {
      const res = await goalBankAPI.domains();
      setDomains(res.data?.data || []);
    } catch (_e) {
      /* non-critical */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
      const res = await goalBankAPI.list(params);
      setGoals(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDomains();
  }, [loadDomains]);
  useEffect(() => {
    load();
  }, [load]);

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await goalBankAPI.delete(deleteTarget._id || deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box>
      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: BG, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
          <TextField
            size="small"
            placeholder="بحث في الأهداف..."
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value, page: 1 }))}
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="المجال"
            value={filters.domain}
            onChange={e => setFilters(p => ({ ...p, domain: e.target.value, page: 1 }))}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {domains.map(d => (
              <MenuItem key={d._id} value={d._id}>
                {d._id} ({d.count})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="الصعوبة"
            value={filters.difficulty}
            onChange={e => setFilters(p => ({ ...p, difficulty: e.target.value, page: 1 }))}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="easy">سهل</MenuItem>
            <MenuItem value="medium">متوسط</MenuItem>
            <MenuItem value="hard">صعب</MenuItem>
            <MenuItem value="beginner">مبتدئ</MenuItem>
            <MenuItem value="intermediate">متوسط</MenuItem>
            <MenuItem value="advanced">متقدم</MenuItem>
          </TextField>
          <Tooltip title="تحديث">
            <IconButton onClick={load} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            <Badge badgeContent={total} color="primary" max={9999}>
              <FilterIcon sx={{ color: PRIMARY }} />
            </Badge>{' '}
            نتيجة
          </Typography>
        </Stack>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {goals.length > 0 ? (
        <Grid container spacing={2}>
          {goals.map(g => (
            <Grid item xs={12} sm={6} md={4} key={g._id || g.id}>
              <GoalCard goal={g} onEdit={onEdit} onDelete={setDeleteTarget} />
            </Grid>
          ))}
        </Grid>
      ) : (
        !loading && (
          <Paper sx={{ p: 5, textAlign: 'center', bgcolor: BG }}>
            <GoalIcon sx={{ fontSize: 64, color: PRIMARY, opacity: 0.3 }} />
            <Typography color="text.secondary" mt={1}>
              لا توجد أهداف مطابقة لمعايير البحث
            </Typography>
          </Paper>
        )
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل تريد حذف الهدف: <strong>{deleteTarget?.title || deleteTarget?.goal_text}</strong>؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={14} /> : <DeleteIcon />}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Tab 1 — Add / Edit Goal
 * ════════════════════════════════════════════════════════════════════ */
function GoalFormTab({ editGoal, onSaved }) {
  const [form, setForm] = useState(editGoal ? { ...editGoal } : EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const isEdit = Boolean(editGoal?._id || editGoal?.id);

  useEffect(() => {
    setForm(editGoal ? { ...editGoal } : EMPTY_FORM);
    setError(null);
    setSuccess(false);
  }, [editGoal]);

  const set = key => e => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.domain || !form.title) {
      setError('المجال والعنوان مطلوبان');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        await goalBankAPI.update(editGoal._id || editGoal.id, form);
      } else {
        await goalBankAPI.create(form);
      }
      setSuccess(true);
      if (!isEdit) setForm(EMPTY_FORM);
      if (onSaved) onSaved();
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth={680}>
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
          {isEdit ? 'تم تحديث الهدف بنجاح' : 'تم إضافة الهدف إلى البنك بنجاح'}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card elevation={2}>
        <CardHeader
          title={isEdit ? 'تعديل هدف' : 'إضافة هدف تأهيلي جديد'}
          subheader="يُحفظ في البنك المؤسسي المشترك — يمكن إضافته لأي خطة رعاية"
          titleTypographyProps={{ fontWeight: 700 }}
        />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                label="المجال الوظيفي"
                size="small"
                fullWidth
                value={form.domain}
                onChange={set('domain')}
                placeholder="مثال: التواصل، الحركة، المعرفي"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="الفئة الفرعية"
                size="small"
                fullWidth
                value={form.category}
                onChange={set('category')}
                placeholder="مثال: اللغة التعبيرية"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                label="عنوان الهدف"
                size="small"
                fullWidth
                value={form.title}
                onChange={set('title')}
                placeholder="مثال: أن ينطق الطفل بجملة مكونة من 3 كلمات"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="الوصف التفصيلي"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={form.description}
                onChange={set('description')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="معيار الإتقان (Mastery Criteria)"
                size="small"
                fullWidth
                value={form.criteria}
                onChange={set('criteria')}
                placeholder="مثال: 80٪ في 3 جلسات متتالية"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                label="مستوى الصعوبة"
                size="small"
                fullWidth
                value={form.difficulty}
                onChange={set('difficulty')}
              >
                <MenuItem value="easy">سهل</MenuItem>
                <MenuItem value="medium">متوسط</MenuItem>
                <MenuItem value="hard">صعب</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                label="العمر الأدنى (سنة)"
                size="small"
                type="number"
                fullWidth
                value={form.targetAgeMin}
                onChange={set('targetAgeMin')}
                inputProps={{ min: 0, max: 99 }}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                label="العمر الأقصى (سنة)"
                size="small"
                type="number"
                fullWidth
                value={form.targetAgeMax}
                onChange={set('targetAgeMax')}
                inputProps={{ min: 0, max: 99 }}
              />
            </Grid>
          </Grid>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
            sx={{ bgcolor: PRIMARY }}
          >
            {isEdit ? 'حفظ التعديلات' : 'إضافة للبنك'}
          </Button>
        </CardActions>
      </Card>
    </Box>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Root Page
 * ════════════════════════════════════════════════════════════════════ */
export default function GoalBankPage() {
  const [tab, setTab] = useState(0);
  const [editGoal, setEditGoal] = useState(null);

  const handleEdit = goal => {
    setEditGoal(goal);
    setTab(1);
  };

  const handleSaved = () => {
    setEditGoal(null);
    setTab(0);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 48, height: 48 }}>
          <GoalIcon />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={700} color={PRIMARY}>
            بنك الأهداف التأهيلية الذكية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مكتبة مؤسسية من الأهداف المعيارية SMART القابلة للإضافة لأي خطة رعاية
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto' }}>
          <Button
            variant="contained"
            startIcon={<DomainIcon />}
            onClick={() => {
              setEditGoal(null);
              setTab(1);
            }}
            sx={{ bgcolor: PRIMARY }}
          >
            إضافة هدف
          </Button>
        </Box>
      </Stack>

      {/* Tabs */}
      <Paper elevation={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab icon={<SearchIcon />} iconPosition="start" label="تصفح الأهداف" />
          <Tab
            icon={editGoal ? <EditIcon /> : <AddIcon />}
            iconPosition="start"
            label={editGoal ? 'تعديل هدف' : 'إضافة هدف'}
          />
        </Tabs>
      </Paper>

      {tab === 0 && <BrowseTab onEdit={handleEdit} />}
      {tab === 1 && <GoalFormTab editGoal={editGoal} onSaved={handleSaved} />}
    </Box>
  );
}
