/**
 * ActivityLibraryPage — مكتبة الأنشطة التأهيلية (المرحلة 27)
 *
 * يتيح للأخصائي:
 *  Tab 0 — استعراض جميع الأنشطة (بطاقات قابلة للبحث والتصفية)
 *  Tab 1 — إحصائيات المكتبة (عدد الأنشطة لكل تخصص / مجال / صعوبة)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CardActions,
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
  InputAdornment,
  Paper,
  Divider,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  FitnessCenter as ActivityIcon,
  Search as SearchIcon,
  BarChart as StatsIcon,
  Refresh as RefreshIcon,
  LibraryBooks as LibraryIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { activityLibraryAPI } from '../../services/ddd';

/* ── palette ─────────────────────────────────────────────────────────── */
const PRIMARY = '#1b5e20';
const BG = '#e8f5e9';

/* ── constants ───────────────────────────────────────────────────────── */
const DISCIPLINE_LABELS = {
  speech_language: 'النطق واللغة',
  occupational: 'العلاج الوظيفي',
  physical: 'العلاج الطبيعي',
  behavior: 'العلاج السلوكي',
  cognitive: 'التأهيل المعرفي',
  vocational: 'التأهيل المهني',
};

const DIFFICULTY_CHIPS = {
  easy: { label: 'سهل', color: 'success' },
  medium: { label: 'متوسط', color: 'warning' },
  hard: { label: 'صعب', color: 'error' },
};

const DOMAIN_LABELS = {
  motor: 'حركي',
  cognitive: 'معرفي',
  communication: 'تواصل',
  social: 'اجتماعي',
  adaptive: 'تكيفي',
  sensory: 'حسي',
  emotional: 'انفعالي',
  academic: 'أكاديمي',
};

/* ── TabPanel ─────────────────────────────────────────────────────────── */
function TabPanel({ children, value, index }) {
  return value === index ? <Box pt={2}>{children}</Box> : null;
}

/* ── Activity Card ─────────────────────────────────────────────────────── */
function ActivityCard({ activity }) {
  const diff = DIFFICULTY_CHIPS[activity.difficulty] || {
    label: activity.difficulty,
    color: 'default',
  };
  const ageRange = activity.age_range
    ? `${activity.age_range.min ?? 0}–${activity.age_range.max ?? '+'} سنة`
    : null;

  return (
    <Card
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${PRIMARY}`,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: 6 },
      }}
    >
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: BG, color: PRIMARY }}>
            <ActivityIcon />
          </Avatar>
        }
        title={
          <Typography variant="subtitle1" fontWeight={700} dir="rtl">
            {activity.name_ar}
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            {activity.activity_code}
          </Typography>
        }
      />
      <CardContent sx={{ flexGrow: 1 }}>
        {activity.description_ar && (
          <Typography variant="body2" color="text.secondary" gutterBottom dir="rtl">
            {activity.description_ar}
          </Typography>
        )}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mt={1}>
          <Chip
            label={DISCIPLINE_LABELS[activity.discipline] ?? activity.discipline}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip label={diff.label} size="small" color={diff.color} />
          {activity.group_activity && (
            <Chip icon={<GroupIcon />} label="جماعي" size="small" variant="outlined" />
          )}
        </Stack>
        {activity.target_domains?.length > 0 && (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5} mt={1}>
            {activity.target_domains.map(d => (
              <Chip
                key={d}
                label={DOMAIN_LABELS[d] ?? d}
                size="small"
                variant="outlined"
                sx={{ borderColor: '#81c784', color: PRIMARY }}
              />
            ))}
          </Stack>
        )}
        {ageRange && (
          <Stack direction="row" alignItems="center" spacing={0.5} mt={1}>
            <TimeIcon fontSize="small" color="action" />
            <Typography variant="caption" color="text.secondary">
              {ageRange}
            </Typography>
          </Stack>
        )}
        {typeof activity.use_count === 'number' && (
          <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
            <StarIcon fontSize="small" sx={{ color: '#ffa000' }} />
            <Typography variant="caption" color="text.secondary">
              استُخدم {activity.use_count} مرة
            </Typography>
          </Stack>
        )}
      </CardContent>
      <CardActions sx={{ pt: 0 }}>
        <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
          {activity.instructions_steps?.length ?? 0} خطوة تطبيق
        </Typography>
      </CardActions>
    </Card>
  );
}

/* ── Stats Panel ─────────────────────────────────────────────────────── */
function StatsPanel({ stats }) {
  if (!stats) return null;
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h4" color="primary" fontWeight={800}>
            {stats.total ?? 0}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إجمالي الأنشطة
          </Typography>
        </Paper>
      </Grid>
      {stats.byDiscipline &&
        Object.entries(stats.byDiscipline).map(([key, count]) => (
          <Grid item xs={12} sm={6} md={3} key={key}>
            <Paper
              elevation={1}
              sx={{ p: 2, textAlign: 'center', borderTop: `3px solid ${PRIMARY}` }}
            >
              <Typography variant="h5" fontWeight={700} color="primary">
                {count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {DISCIPLINE_LABELS[key] ?? key}
              </Typography>
            </Paper>
          </Grid>
        ))}
      {stats.byDifficulty && (
        <Grid item xs={12}>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              توزيع الصعوبة
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {Object.entries(stats.byDifficulty).map(([key, count]) => {
                const d = DIFFICULTY_CHIPS[key] || { label: key, color: 'default' };
                return <Chip key={key} label={`${d.label}: ${count}`} color={d.color} />;
              })}
            </Stack>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 *  Main Component
 * ══════════════════════════════════════════════════════════════════════ */
export default function ActivityLibraryPage() {
  const [tab, setTab] = useState(0);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [disciplines, setDisciplines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ── filters ── */
  const [search, setSearch] = useState('');
  const [filterDiscipline, setFilterDiscipline] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  /* ── loaders ── */
  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterDiscipline) params.discipline = filterDiscipline;
      if (filterDifficulty) params.difficulty = filterDifficulty;
      if (search.trim()) params.search = search.trim();
      const res = await activityLibraryAPI.list(params);
      setActivities(res.data?.activities ?? res.data ?? []);
    } catch (err) {
      setError('تعذّر تحميل الأنشطة. تحقق من الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }, [filterDiscipline, filterDifficulty, search]);

  const loadStats = useCallback(async () => {
    try {
      const res = await activityLibraryAPI.stats();
      setStats(res.data);
    } catch (_e) {
      /* stats are non-critical */
    }
  }, []);

  const loadDisciplines = useCallback(async () => {
    try {
      const res = await activityLibraryAPI.disciplines();
      setDisciplines(res.data?.disciplines ?? []);
    } catch (_e) {
      /* fallback to static list */
    }
  }, []);

  useEffect(() => {
    loadDisciplines();
    loadStats();
  }, [loadDisciplines, loadStats]);

  useEffect(() => {
    if (tab === 0) loadActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab change triggers reload
  }, [tab, filterDiscipline, filterDifficulty]);

  const handleSearch = e => {
    if (e.key === 'Enter') loadActivities();
  };

  /* ── seed (admin) ── */
  const handleSeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await activityLibraryAPI.seed();
      const inserted = res.data?.inserted ?? 0;
      await loadActivities();
      await loadStats();
      setError(null);
      // Show success inline — no toast dependency needed
      alert(`تم زرع ${inserted} نشاط بنجاح`);
    } catch (err) {
      setError('فشل في زرع الأنشطة الافتراضية.');
    } finally {
      setLoading(false);
    }
  };

  /* ── derived ── */
  const disciplineOptions = disciplines.length ? disciplines : Object.keys(DISCIPLINE_LABELS);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} mb={3} flexWrap="wrap">
        <Avatar sx={{ bgcolor: PRIMARY, width: 48, height: 48 }}>
          <LibraryIcon />
        </Avatar>
        <Box flex={1}>
          <Typography variant="h5" fontWeight={800} color={PRIMARY} dir="rtl">
            مكتبة الأنشطة التأهيلية
          </Typography>
          <Typography variant="body2" color="text.secondary" dir="rtl">
            فهرس شامل لأنشطة التأهيل المستندة إلى الأدلة عبر التخصصات
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton
            onClick={() => {
              loadActivities();
              loadStats();
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="outlined"
          size="small"
          color="success"
          onClick={handleSeed}
          disabled={loading}
        >
          زرع الأنشطة الافتراضية
        </Button>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
      >
        <Tab icon={<ActivityIcon />} iconPosition="start" label="الأنشطة" />
        <Tab icon={<StatsIcon />} iconPosition="start" label="الإحصائيات" />
      </Tabs>

      {/* ── Tab 0: Activities ── */}
      <TabPanel value={tab} index={0}>
        {/* Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} flexWrap="wrap">
          <TextField
            label="بحث عن نشاط"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            size="small"
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            dir="rtl"
          />
          <TextField
            select
            label="التخصص"
            value={filterDiscipline}
            onChange={e => setFilterDiscipline(e.target.value)}
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {disciplineOptions.map(d => (
              <MenuItem key={d} value={d}>
                {DISCIPLINE_LABELS[d] ?? d}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="الصعوبة"
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            size="small"
            sx={{ minWidth: 140 }}
          >
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(DIFFICULTY_CHIPS).map(([k, v]) => (
              <MenuItem key={k} value={k}>
                {v.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={loadActivities}
            disabled={loading}
            sx={{ bgcolor: PRIMARY }}
          >
            بحث
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {activities.length === 0 && !loading ? (
          <Alert severity="info" dir="rtl">
            لا توجد أنشطة مطابقة. جرّب تغيير الفلاتر أو اضغط "زرع الأنشطة الافتراضية".
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {activities.map(act => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={act._id ?? act.activity_code}>
                <ActivityCard activity={act} />
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* ── Tab 1: Stats ── */}
      <TabPanel value={tab} index={1}>
        {stats ? (
          <StatsPanel stats={stats} />
        ) : (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}
      </TabPanel>
    </Box>
  );
}
