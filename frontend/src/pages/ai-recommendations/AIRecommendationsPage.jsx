/**
 * AIRecommendationsPage — التوصيات الذكية وتقييم المخاطر
 *
 * Tabs:
 *  0 — لوحة المتابعة   → getRiskDashboard
 *  1 — عاليو المخاطر   → list (high-risk) + calculateRisk
 *  2 — التوصيات السريرية → getByBeneficiary + accept / dismiss
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Button,
  Stack,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Snackbar,
  Tooltip,
} from '@mui/material';
import {
  Psychology as AIIcon,
  Warning as HighRiskIcon,
  CheckCircle as AcceptIcon,
  Cancel as DismissIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  BarChart as ChartIcon,
  Person as PersonIcon,
  AutoAwesome as SparkIcon,
  Pending as PendingIcon,
  PriorityHigh as PriorityIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { aiRecommendationsAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';

/* ── colour palette ───────────────────────────────────────── */
const PRIMARY = '#7b1fa2';
const BG = '#f8f4fc';

/* ── helpers ──────────────────────────────────────────────── */
const fmt = d => (d ? _fmtDate(d) : '—');

const riskColor = level => {
  const map = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };
  return map[level] || 'default';
};

const riskLabel = level => {
  const map = { critical: 'حرجة', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' };
  return map[level] || level || '—';
};

/* ── KPI card ─────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card variant="outlined" sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}18`, color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.disabled">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function AIRecommendationsPage() {
  const [tab, setTab] = useState(0);

  /* ── dashboard state ── */
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  /* ── high-risk state ── */
  const [highRisk, setHighRisk] = useState([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [hrError, setHrError] = useState(null);
  const [hrSearch, setHrSearch] = useState('');
  const [calcLoading, setCalcLoading] = useState({});

  /* ── recommendations state ── */
  const [recSearch, setRecSearch] = useState('');
  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(null);

  /* ── therapist priorities state ── */
  const [prioSearch, setPrioSearch] = useState('');
  const [priorities, setPriorities] = useState([]);
  const [prioLoading, setPrioLoading] = useState(false);
  const [prioError, setPrioError] = useState(null);

  /* ── dismiss dialog ── */
  const [dismissTarget, setDismissTarget] = useState(null);
  const [dismissNote, setDismissNote] = useState('');
  const [dismissLoading, setDismissLoading] = useState(false);

  /* ── snackbar ── */
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  /* ── load dashboard ── */
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await aiRecommendationsAPI.getRiskDashboard({});
      setDashboard(res?.data?.data || res?.data || null);
    } catch (e) {
      setDashError(e.message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  /* ── load high-risk beneficiaries ── */
  const loadHighRisk = useCallback(async () => {
    setHrLoading(true);
    setHrError(null);
    try {
      const res = await aiRecommendationsAPI.list({ search: hrSearch });
      const data = res?.data?.data || res?.data;
      setHighRisk(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setHrError(e.message);
    } finally {
      setHrLoading(false);
    }
  }, [hrSearch]);

  /* ── load recommendations by beneficiary search ── */
  const loadRecs = useCallback(async () => {
    if (!recSearch.trim()) {
      setRecs([]);
      return;
    }
    setRecsLoading(true);
    setRecsError(null);
    try {
      const res = await aiRecommendationsAPI.getByBeneficiary(recSearch.trim());
      const data = res?.data?.data || res?.data;
      setRecs(Array.isArray(data) ? data : []);
    } catch (e) {
      setRecsError(e.message);
    } finally {
      setRecsLoading(false);
    }
  }, [recSearch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    if (tab === 1) loadHighRisk();
  }, [tab, loadHighRisk]);

  /* ── calculate risk for one beneficiary ── */
  const handleCalcRisk = async beneficiaryId => {
    setCalcLoading(p => ({ ...p, [beneficiaryId]: true }));
    try {
      await aiRecommendationsAPI.calculateRisk(beneficiaryId);
      toast('تم احتساب درجة المخاطرة بنجاح');
      loadHighRisk();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCalcLoading(p => ({ ...p, [beneficiaryId]: false }));
    }
  };

  /* ── load therapist priorities ── */
  const loadPriorities = async () => {
    if (!prioSearch.trim()) return;
    setPrioLoading(true);
    setPrioError(null);
    try {
      const res = await aiRecommendationsAPI.getTherapistPriorities(prioSearch.trim());
      const data = res?.data?.data || res?.data;
      setPriorities(Array.isArray(data) ? data : data?.priorities || []);
    } catch (e) {
      setPrioError(e.message);
    } finally {
      setPrioLoading(false);
    }
  };

  /* ── accept recommendation ── */
  const handleAccept = async id => {
    try {
      await aiRecommendationsAPI.markViewed(id).catch(() => {});
      await aiRecommendationsAPI.accept(id);
      toast('تم قبول التوصية');
      setRecs(prev => prev.map(r => (r._id === id ? { ...r, status: 'accepted' } : r)));
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── dismiss recommendation ── */
  const handleDismissConfirm = async () => {
    if (!dismissTarget) return;
    setDismissLoading(true);
    try {
      await aiRecommendationsAPI.dismiss(dismissTarget._id, { note: dismissNote });
      toast('تم رفض التوصية');
      setRecs(prev =>
        prev.map(r => (r._id === dismissTarget._id ? { ...r, status: 'dismissed' } : r))
      );
      setDismissTarget(null);
      setDismissNote('');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setDismissLoading(false);
    }
  };

  /* ── dashboard KPIs ── */
  const kpis = [
    {
      label: 'المستفيدون عاليو المخاطر',
      value: dashboard?.totalHighRisk ?? dashboard?.highRiskCount ?? 0,
      icon: <HighRiskIcon />,
      color: '#d32f2f',
    },
    {
      label: 'التوصيات المعلقة',
      value: dashboard?.pendingRecommendations ?? dashboard?.pending ?? 0,
      icon: <PendingIcon />,
      color: '#f57c00',
    },
    {
      label: 'التوصيات المقبولة',
      value: dashboard?.acceptedRecommendations ?? dashboard?.accepted ?? 0,
      icon: <AcceptIcon />,
      color: '#388e3c',
    },
    {
      label: 'التوصيات المرفوضة',
      value: dashboard?.dismissedRecommendations ?? dashboard?.dismissed ?? 0,
      icon: <DismissIcon />,
      color: '#616161',
    },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* ── Page header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <AIIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            التوصيات الذكية وتقييم المخاطر
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نظام دعم القرار السريري المدعوم بالذكاء الاصطناعي
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadDashboard}
          sx={{ borderColor: PRIMARY, color: PRIMARY }}
        >
          تحديث
        </Button>
      </Box>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { fontWeight: 600 },
          '& .Mui-selected': { color: PRIMARY },
          '& .MuiTabs-indicator': { bgcolor: PRIMARY },
        }}
      >
        <Tab icon={<ChartIcon />} iconPosition="start" label="لوحة المتابعة" />
        <Tab icon={<HighRiskIcon />} iconPosition="start" label="عاليو المخاطر" />
        <Tab icon={<SparkIcon />} iconPosition="start" label="التوصيات السريرية" />
        <Tab icon={<PriorityIcon />} iconPosition="start" label="أولويات الأخصائي" />
      </Tabs>

      {/* ════════════════════════════════════════
          TAB 0 — Dashboard
      ════════════════════════════════════════ */}
      {tab === 0 && (
        <Box>
          {dashLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {dashError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dashError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mb: 3 }}>
            {kpis.map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>

          {/* Summary cards */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    توزيع مستويات المخاطر
                  </Typography>
                  {['critical', 'high', 'medium', 'low'].map(level => {
                    const count =
                      dashboard?.riskDistribution?.[level] ?? dashboard?.[`${level}Risk`] ?? 0;
                    const total = dashboard?.totalBeneficiaries || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <Box key={level} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Chip size="small" label={riskLabel(level)} color={riskColor(level)} />
                          <Typography variant="body2">
                            {count} مستفيد ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          color={riskColor(level)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    ملخص التوصيات
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {[
                      {
                        label: 'إجمالي التوصيات',
                        val: dashboard?.totalRecommendations ?? '—',
                        color: PRIMARY,
                      },
                      {
                        label: 'نسبة القبول',
                        val: dashboard?.acceptanceRate ? `${dashboard.acceptanceRate}%` : '—',
                        color: '#388e3c',
                      },
                      {
                        label: 'متوسط درجة المخاطرة',
                        val: dashboard?.avgRiskScore ?? '—',
                        color: '#f57c00',
                      },
                      { label: 'آخر تحديث', val: fmt(dashboard?.lastUpdated), color: '#616161' },
                    ].map((r, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 0.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {r.label}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color={r.color}>
                          {r.val}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════════════════════════════════
          TAB 1 — High-risk beneficiaries
      ════════════════════════════════════════ */}
      {tab === 1 && (
        <Box>
          {/* Search + refresh */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="بحث باسم المستفيد..."
              value={hrSearch}
              onChange={e => setHrSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={loadHighRisk}
              startIcon={<RefreshIcon />}
              sx={{ borderColor: PRIMARY, color: PRIMARY }}
            >
              تحديث
            </Button>
          </Stack>

          {hrError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {hrError}
            </Alert>
          )}
          {hrLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f3e5f5' }}>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>درجة المخاطرة</TableCell>
                  <TableCell>مستوى المخاطرة</TableCell>
                  <TableCell>آخر احتساب</TableCell>
                  <TableCell>التوصيات المعلقة</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {highRisk.length === 0 && !hrLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد بيانات مخاطرة</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  highRisk.map((item, idx) => {
                    const bid = item.beneficiaryId?._id || item.beneficiaryId || item._id;
                    const name =
                      item.beneficiaryId?.name?.full ||
                      item.beneficiaryName ||
                      `مستفيد #${idx + 1}`;
                    const score = item.overallScore ?? item.riskScore ?? item.score;
                    const level = item.riskLevel || item.level;
                    return (
                      <TableRow key={item._id || idx} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: PRIMARY, fontSize: 12 }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                            <Typography variant="body2">{name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {score != null ? score : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={riskLabel(level)} color={riskColor(level)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {fmt(item.calculatedAt || item.updatedAt)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.pendingRecommendations ?? item.pendingCount ?? 0}
                            color="warning"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="احتساب المخاطرة الآن">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!!calcLoading[bid]}
                                onClick={() => handleCalcRisk(bid)}
                                sx={{ borderColor: PRIMARY, color: PRIMARY, fontSize: 11 }}
                              >
                                {calcLoading[bid] ? '...' : 'احتساب'}
                              </Button>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ════════════════════════════════════════
          TAB 2 — Clinical Recommendations
      ════════════════════════════════════════ */}
      {tab === 2 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="أدخل معرف المستفيد (ID) لعرض توصياته..."
                  value={recSearch}
                  onChange={e => setRecSearch(e.target.value)}
                  sx={{ flexGrow: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={loadRecs}
                  sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#6a1b9a' } }}
                  startIcon={<SearchIcon />}
                >
                  عرض التوصيات
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {recsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {recsError}
            </Alert>
          )}
          {recsLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {recs.length > 0 && (
            <Stack spacing={2}>
              {recs.map((rec, i) => {
                const isPending = !rec.status || rec.status === 'pending';
                const isAccepted = rec.status === 'accepted';
                const isDismissed = rec.status === 'dismissed';
                return (
                  <Card
                    key={rec._id || i}
                    variant="outlined"
                    sx={{
                      borderRight: `4px solid ${isAccepted ? '#388e3c' : isDismissed ? '#bdbdbd' : PRIMARY}`,
                      opacity: isDismissed ? 0.7 : 1,
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {rec.title || rec.recommendation || `توصية #${i + 1}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rec.category || rec.type || '—'} ·{' '}
                            {fmt(rec.generatedAt || rec.createdAt)}
                          </Typography>
                        </Box>
                        <Chip
                          size="small"
                          label={isAccepted ? 'مقبولة' : isDismissed ? 'مرفوضة' : 'معلقة'}
                          color={isAccepted ? 'success' : isDismissed ? 'default' : 'warning'}
                        />
                      </Box>

                      {rec.reasoning && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1, fontStyle: 'italic' }}
                        >
                          {rec.reasoning}
                        </Typography>
                      )}

                      {rec.suggestedActions?.length > 0 && (
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            الإجراءات المقترحة:
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                            {rec.suggestedActions.map((a, ai) => (
                              <Chip key={ai} size="small" label={a} variant="outlined" />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      {isPending && (
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<AcceptIcon />}
                            onClick={() => handleAccept(rec._id)}
                          >
                            قبول
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DismissIcon />}
                            onClick={() => setDismissTarget(rec)}
                          >
                            رفض
                          </Button>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {!recsLoading && recs.length === 0 && recSearch && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <SparkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد توصيات لهذا المستفيد</Typography>
            </Box>
          )}

          {!recSearch && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <AIIcon sx={{ fontSize: 56, color: '#ce93d8', mb: 1 }} />
              <Typography color="text.secondary" variant="h6">
                أدخل معرف المستفيد لعرض التوصيات الذكية
              </Typography>
              <Typography variant="caption" color="text.disabled">
                يمكنك نسخ معرف المستفيد من ملفه الشخصي
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ════════════════════════════════════════
          TAB 3 — Therapist Priorities
      ════════════════════════════════════════ */}
      {tab === 3 && (
        <Box>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="أدخل معرف الأخصائي لعرض أولويات اليوم..."
                  value={prioSearch}
                  onChange={e => setPrioSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && loadPriorities()}
                  sx={{ flexGrow: 1 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
                <Button
                  variant="contained"
                  size="small"
                  onClick={loadPriorities}
                  sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#6a1b9a' } }}
                  startIcon={<PriorityIcon />}
                >
                  عرض الأولويات
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {prioError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {prioError}
            </Alert>
          )}
          {prioLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {priorities.length > 0 && (
            <Stack spacing={1.5}>
              {priorities.map((item, i) => {
                const urgency = item.urgency || item.priority || 'medium';
                const urgencyColor =
                  { urgent: '#d32f2f', high: '#f57c00', medium: '#1976d2', low: '#388e3c' }[
                    urgency
                  ] || '#616161';
                const urgencyLabel =
                  { urgent: 'عاجل', high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[urgency] ||
                  urgency;
                return (
                  <Card
                    key={item._id || i}
                    variant="outlined"
                    sx={{ borderRight: `4px solid ${urgencyColor}` }}
                  >
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {item.beneficiaryName || item.title || `مستفيد #${i + 1}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.actionRequired || item.description || '—'}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip
                            size="small"
                            label={urgencyLabel}
                            sx={{
                              bgcolor: `${urgencyColor}18`,
                              color: urgencyColor,
                              fontWeight: 600,
                            }}
                          />
                          {item.dueTime && (
                            <Typography variant="caption" color="text.secondary">
                              {fmt(item.dueTime)}
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                      {item.recommendation && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {item.recommendation}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}

          {!prioLoading && priorities.length === 0 && prioSearch && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <PriorityIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد أولويات لهذا الأخصائي اليوم</Typography>
            </Box>
          )}

          {!prioSearch && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <ViewIcon sx={{ fontSize: 56, color: '#ce93d8', mb: 1 }} />
              <Typography color="text.secondary" variant="h6">
                أدخل معرف الأخصائي لعرض أولويات جلسات اليوم
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* ── Dismiss Dialog ── */}
      <Dialog open={!!dismissTarget} onClose={() => setDismissTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#fff3e0' }}>رفض التوصية</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {dismissTarget?.title || dismissTarget?.recommendation}
          </Typography>
          <TextField
            label="سبب الرفض (اختياري)"
            multiline
            rows={3}
            fullWidth
            value={dismissNote}
            onChange={e => setDismissNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDismissTarget(null);
              setDismissNote('');
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={dismissLoading}
            onClick={handleDismissConfirm}
          >
            {dismissLoading ? 'جاري...' : 'تأكيد الرفض'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
