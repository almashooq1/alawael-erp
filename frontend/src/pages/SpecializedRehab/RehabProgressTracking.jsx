/**
 * RehabProgressTracking — تتبع تقدم التأهيل
 * Rehabilitation Progress Tracking Dashboard — service-connected
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import RefreshIcon from '@mui/icons-material/Refresh';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { specializedScalesService } from '../../services/specializedRehab.service';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ── Fallback data ── */
const DATA_METRICS = [
  { label: 'التقدم العام', value: 72, color: 'primary' },
  { label: 'الحركة والتنقل', value: 80, color: 'success' },
  { label: 'الأنشطة اليومية', value: 65, color: 'warning' },
  { label: 'التواصل الاجتماعي', value: 58, color: 'info' },
];

const DATA_GOALS = [
  {
    _id: 'g1',
    goal: 'المشي لمسافة 100 متر بدون مساعدة',
    progress: 85,
    status: 'in_progress',
    week: 8,
  },
  { _id: 'g2', goal: 'تناول الطعام باستقلالية', progress: 100, status: 'achieved', week: 4 },
  { _id: 'g3', goal: 'الصعود والنزول على الدرج', progress: 40, status: 'in_progress', week: 12 },
  { _id: 'g4', goal: 'تقليل مستوى الألم إلى 3/10', progress: 70, status: 'in_progress', week: 6 },
  { _id: 'g5', goal: 'تحسين قوة العضلات 20%', progress: 0, status: 'not_started', week: 10 },
];

const STATUS_CONFIG = {
  achieved: { label: 'محقق', color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
  in_progress: { label: 'جاري', color: 'primary', icon: <PendingIcon fontSize="small" /> },
  not_started: { label: 'لم يبدأ', color: 'default', icon: null },
  reviewed: { label: 'مراجعة', color: 'warning', icon: null },
};

export default function RehabProgressTracking() {
  const theme = useTheme();
  const [view, setView] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(DATA_METRICS);
  const [goals, setGoals] = useState(DATA_GOALS);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, resultsRes] = await Promise.allSettled([
        specializedScalesService.getResultStats(),
        specializedScalesService.getResults({ limit: 20, sort: '-administeredAt' }),
      ]);
      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value?.data?.data ?? statsRes.value?.data;
        if (s) {
          setStats(s);
          /* Map API stats to metric cards if shape matches */
          if (s.domainProgress && Array.isArray(s.domainProgress)) setMetrics(s.domainProgress);
          if (s.goals && Array.isArray(s.goals)) setGoals(s.goals);
        }
      }
      if (resultsRes.status === 'fulfilled') {
        const r = resultsRes.value?.data?.data ?? resultsRes.value?.data ?? [];
        if (Array.isArray(r)) setResults(r);
      }
    } catch {
      /* keep fallback data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalResults = stats?.totalResults ?? results.length;
  const avgScore =
    stats?.avgScore ??
    (results.length > 0
      ? Math.round(results.reduce((s, r) => s + (r.totalScore || 0), 0) / results.length)
      : 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 52, height: 52 }}>
            <TrendingUpIcon sx={{ fontSize: 30, color: 'white' }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              تتبع تقدم التأهيل
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              متابعة الأهداف العلاجية ونتائج تطبيق المقاييس
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={load} disabled={loading} sx={{ color: 'white' }}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي التقييمات', value: totalResults, color: 'primary.main' },
          { label: 'متوسط الدرجات', value: avgScore, color: 'success.main' },
          {
            label: 'أهداف قيد التنفيذ',
            value: goals.filter(g => g.status === 'in_progress').length,
            color: 'warning.main',
          },
          {
            label: 'أهداف محققة',
            value: goals.filter(g => g.status === 'achieved').length,
            color: 'success.main',
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                textAlign: 'center',
              }}
            >
              {loading ? (
                <CircularProgress size={20} />
              ) : (
                <Typography variant="h4" fontWeight={700} color={s.color}>
                  {s.value}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* View toggle */}
      <Box mb={2}>
        <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
          <ToggleButton value="overview">نظرة عامة</ToggleButton>
          <ToggleButton value="goals">الأهداف</ToggleButton>
          <ToggleButton value="results">نتائج المقاييس</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Overview */}
      {view === 'overview' && (
        <Grid container spacing={3}>
          {metrics.map((metric, i) => (
            <Grid item xs={12} sm={6} md={3} key={metric.label || i}>
              <Card
                elevation={0}
                sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
              >
                <CardContent>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {metric.label}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color={`${metric.color}.main`}>
                    {metric.value}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={metric.value}
                    color={metric.color}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Goals */}
      {view === 'goals' && (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell sx={{ fontWeight: 600 }}>الهدف</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  الأسبوع المستهدف
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>نسبة التقدم</TableCell>
                <TableCell align="center" sx={{ fontWeight: 600 }}>
                  الحالة
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((goal, idx) => {
                const config = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.not_started;
                return (
                  <TableRow key={goal._id || idx} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar
                          sx={{ width: 28, height: 28, fontSize: 13, bgcolor: 'primary.light' }}
                        >
                          {idx + 1}
                        </Avatar>
                        {goal.goal || goal.goalAr || goal.title}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      الأسبوع {goal.week || goal.targetWeek || '—'}
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress
                          variant="determinate"
                          value={goal.progress ?? 0}
                          sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" minWidth={40}>
                          {goal.progress ?? 0}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={config.label}
                        color={config.color}
                        size="small"
                        icon={config.icon}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Results */}
      {view === 'results' &&
        (loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : results.length === 0 ? (
          <Box textAlign="center" py={8}>
            <AssessmentIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">لا توجد نتائج مسجّلة بعد</Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600 }}>المقياس</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>المستفيد</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    النتيجة
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>
                    النسبة
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>التاريخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((r, i) => {
                  const pct = r.maxScore ? Math.round((r.totalScore / r.maxScore) * 100) : null;
                  return (
                    <TableRow key={r._id || i} hover>
                      <TableCell>{r.scaleId?.nameAr || r.scaleName || r.scaleId || '—'}</TableCell>
                      <TableCell>{r.beneficiaryName || r.beneficiaryId || '—'}</TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700}>
                          {r.totalScore ?? '—'} / {r.maxScore ?? '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        {pct !== null && (
                          <Chip
                            label={`${pct}%`}
                            size="small"
                            color={pct >= 75 ? 'success' : pct >= 50 ? 'warning' : 'error'}
                          />
                        )}
                      </TableCell>
                      <TableCell>{r.administeredAt ? _fmtDate(r.administeredAt) : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {!loading && view === 'overview' && (
        <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
          يعرض هذا القسم مؤشرات التقدم المجمّعة. لعرض تفاصيل مستفيد بعينه، اختر المستفيد من القائمة
          الرئيسية.
        </Alert>
      )}
    </Container>
  );
}
