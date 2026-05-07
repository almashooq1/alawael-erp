/**
 * ClinicalAssessmentsPage.jsx
 * ════════════════════════════════════════════════════════════════
 * صفحة التقييمات السريرية — إدارة كاملة للتقييمات
 *
 * Tabs:
 *  1. لوحة القيادة   — KPIs + آخر التقييمات
 *  2. قائمة التقييمات — جدول كامل مع فلاتر
 *  3. إجراء تقييم   — نموذج إنشاء/تعديل + إدخال النتائج
 *  4. تحليل الاتجاهات — رسوم بيانية طولية لمستفيد بعينه
 * ════════════════════════════════════════════════════════════════
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Tabs,
  Tab,
  Button,
  TextField,
  MenuItem,
  IconButton,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  Alert,
  Tooltip,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendIcon,
  Warning as WarnIcon,
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Psychology as PsychIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import clinicalAssessmentsService, {
  ASSESSMENT_TOOLS,
  CATEGORIES,
  INTERPRETATIONS,
  STATUSES,
} from '../../services/clinicalAssessments.service';
import { useSnackbar } from '../../contexts/SnackbarContext';

// ── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

const INITIAL_FORM = {
  beneficiary: null,
  episodeOfCare: null,
  therapist: null,
  tool: '',
  toolVersion: '',
  category: 'other',
  assessmentDate: new Date().toISOString().split('T')[0],
  duration: '',
  score: '',
  rawScore: '',
  maxRawScore: '',
  interpretation: '',
  scoreBreakdown: [],
  observations: '',
  strengths: '',
  concerns: '',
  recommendations: '',
  status: 'completed',
};

// ── Helper Components ─────────────────────────────────────────────────────────
function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

function InterpretationChip({ value }) {
  const found = INTERPRETATIONS.find(i => i.value === value);
  if (!found) return null;
  return <Chip label={found.label} color={found.color} size="small" />;
}

function StatusChip({ value }) {
  const found = STATUSES.find(s => s.value === value);
  if (!found) return null;
  return <Chip label={found.label} color={found.color} size="small" variant="outlined" />;
}

function ScoreBar({ score, maxScore = 100 }) {
  if (score == null)
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  const pct = Math.min(100, (score / maxScore) * 100);
  const color = pct >= 70 ? 'success' : pct >= 40 ? 'warning' : 'error';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <LinearProgress
        variant="determinate"
        value={pct}
        color={color}
        sx={{ flex: 1, height: 8, borderRadius: 4 }}
      />
      <Typography variant="body2" fontWeight="bold">
        {score}%
      </Typography>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClinicalAssessmentsPage() {
  const showSnackbar = useSnackbar();
  const [tab, setTab] = useState(0);

  // List state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    q: '',
    tool: '',
    category: '',
    status: '',
    beneficiary: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    thisMonth: 0,
    avgScore: 0,
    byCategory: [],
    byTool: [],
  });

  // Dialog state
  const [dialog, setDialog] = useState({ open: false, mode: 'create', item: null });
  const [form, setForm] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [scoreBreakdowns, setScoreBreakdowns] = useState([]);

  // View dialog
  const [viewItem, setViewItem] = useState(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Trend state
  const [trendBeneficiary, setTrendBeneficiary] = useState('');
  const [trendTool, setTrendTool] = useState('');
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // ── Fetch List ──────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: rowsPerPage, ...filters };
      Object.keys(params).forEach(k => {
        if (!params[k]) delete params[k];
      });
      const data = await clinicalAssessmentsService.list(params);
      setItems(data?.items || data?.data || []);
      setTotal(data?.pagination?.total || 0);
    } catch (err) {
      showSnackbar(err?.message || 'فشل تحميل التقييمات', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filters, showSnackbar]);

  // ── Fetch Stats ─────────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const data = await clinicalAssessmentsService.getStats();
      setStats(data);
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    fetchList();
    fetchStats();
  }, [fetchList, fetchStats]);

  // ── Open Create/Edit Dialog ─────────────────────────────────────────────
  const openCreate = () => {
    setForm(INITIAL_FORM);
    setScoreBreakdowns([]);
    setFormError('');
    setDialog({ open: true, mode: 'create', item: null });
  };

  const openEdit = item => {
    setForm({
      ...INITIAL_FORM,
      tool: item.tool || '',
      toolVersion: item.toolVersion || '',
      category: item.category || 'other',
      assessmentDate: item.assessmentDate ? item.assessmentDate.split('T')[0] : '',
      duration: item.duration || '',
      score: item.score ?? '',
      rawScore: item.rawScore ?? '',
      maxRawScore: item.maxRawScore ?? '',
      interpretation: item.interpretation || '',
      observations: item.observations || '',
      strengths: (item.strengths || []).join('\n'),
      concerns: (item.concerns || []).join('\n'),
      recommendations: (item.recommendations || []).join('\n'),
      status: item.status || 'completed',
    });
    setScoreBreakdowns(item.scoreBreakdown || []);
    setFormError('');
    setDialog({ open: true, mode: 'edit', item });
  };

  // ── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.tool) {
      setFormError('يجب اختيار أداة التقييم');
      return;
    }
    if (!form.assessmentDate) {
      setFormError('يجب تحديد تاريخ التقييم');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...form,
        score: form.score !== '' ? Number(form.score) : undefined,
        rawScore: form.rawScore !== '' ? Number(form.rawScore) : undefined,
        maxRawScore: form.maxRawScore !== '' ? Number(form.maxRawScore) : undefined,
        duration: form.duration !== '' ? Number(form.duration) : undefined,
        strengths: form.strengths ? form.strengths.split('\n').filter(Boolean) : [],
        concerns: form.concerns ? form.concerns.split('\n').filter(Boolean) : [],
        recommendations: form.recommendations
          ? form.recommendations.split('\n').filter(Boolean)
          : [],
        scoreBreakdown: scoreBreakdowns,
      };
      if (dialog.mode === 'create') {
        await clinicalAssessmentsService.create(payload);
        showSnackbar('تم إنشاء التقييم بنجاح', 'success');
      } else {
        await clinicalAssessmentsService.update(dialog.item._id, payload);
        showSnackbar('تم تحديث التقييم بنجاح', 'success');
      }
      setDialog({ open: false, mode: 'create', item: null });
      fetchList();
      fetchStats();
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // ── Archive ─────────────────────────────────────────────────────────────
  const handleArchive = async id => {
    if (!window.confirm('هل تريد أرشفة هذا التقييم؟')) return;
    try {
      await clinicalAssessmentsService.archive(id);
      showSnackbar('تم أرشفة التقييم', 'success');
      fetchList();
      fetchStats();
    } catch (err) {
      showSnackbar(err?.message || 'فشل الأرشفة', 'error');
    }
  };

  // ── Trend ────────────────────────────────────────────────────────────────
  const fetchTrend = useCallback(async () => {
    if (!trendBeneficiary || !trendTool) return;
    setTrendLoading(true);
    try {
      const data = await clinicalAssessmentsService.getTrend(trendBeneficiary, trendTool);
      setTrendData(data?.items || []);
    } catch {
      setTrendData([]);
    } finally {
      setTrendLoading(false);
    }
  }, [trendBeneficiary, trendTool]);

  // ── Score Breakdown Rows ─────────────────────────────────────────────────
  const addBreakdown = () =>
    setScoreBreakdowns(prev => [...prev, { domain: '', score: '', maxScore: '', notes: '' }]);
  const updateBreakdown = (idx, field, val) => {
    setScoreBreakdowns(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };
  const removeBreakdown = idx => setScoreBreakdowns(prev => prev.filter((_, i) => i !== idx));

  // ── Stats Cards ──────────────────────────────────────────────────────────
  const statsCards = useMemo(
    () => [
      {
        label: 'إجمالي التقييمات',
        value: stats.total || 0,
        color: '#1976d2',
        icon: <AssessmentIcon />,
      },
      { label: 'هذا الشهر', value: stats.thisMonth || 0, color: '#4caf50', icon: <TrendIcon /> },
      {
        label: 'متوسط النتيجة',
        value: stats.avgScore ? `${Math.round(stats.avgScore)}%` : '—',
        color: '#ff9800',
        icon: <AnalyticsIcon />,
      },
      {
        label: 'بانتظار المراجعة',
        value: stats.pendingReview || 0,
        color: '#9c27b0',
        icon: <WarnIcon />,
      },
    ],
    [stats]
  );

  const categoryData = useMemo(
    () =>
      (stats.byCategory || []).map(c => ({
        name: CATEGORIES.find(cat => cat.value === c._id)?.label || c._id,
        value: c.count,
      })),
    [stats]
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            التقييمات السريرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة وتوثيق التقييمات التشخيصية والمتابعة
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="تحديث">
            <IconButton
              onClick={() => {
                fetchList();
                fetchStats();
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            تقييم جديد
          </Button>
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab
            label="لوحة القيادة"
            icon={<AnalyticsIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label="قائمة التقييمات"
            icon={<AssessmentIcon fontSize="small" />}
            iconPosition="start"
          />
          <Tab
            label="تحليل الاتجاهات"
            icon={<TimelineIcon fontSize="small" />}
            iconPosition="start"
          />
        </Tabs>

        {/* ─── Tab 1: Dashboard ────────────────────────────────────── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {statsCards.map((s, i) => (
                <Grid item xs={6} sm={3} key={i}>
                  <Card
                    elevation={0}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                  >
                    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: s.color, width: 48, height: 48 }}>{s.icon}</Avatar>
                      <Box>
                        <Typography variant="h5" fontWeight="bold">
                          {s.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {s.label}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Grid container spacing={2}>
              {/* Category Distribution */}
              <Grid item xs={12} md={5}>
                <Card
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}
                >
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    توزيع التقييمات حسب الفئة
                  </Typography>
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {categoryData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend />
                        <ChartTip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                      <AssessmentIcon sx={{ fontSize: 40, mb: 1 }} />
                      <Typography>لا توجد بيانات</Typography>
                    </Box>
                  )}
                </Card>
              </Grid>

              {/* Recent Assessments */}
              <Grid item xs={12} md={7}>
                <Card
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        آخر التقييمات
                      </Typography>
                      <Button size="small" onClick={() => setTab(1)}>
                        عرض الكل
                      </Button>
                    </Box>
                    {loading ? (
                      <CircularProgress size={24} />
                    ) : (
                      <List dense>
                        {items.slice(0, 5).map(item => (
                          <ListItem
                            key={item._id}
                            sx={{
                              borderRadius: 1,
                              mb: 0.5,
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {ASSESSMENT_TOOLS.find(t => t.id === item.tool)?.label ||
                                      item.tool}
                                  </Typography>
                                  <InterpretationChip value={item.interpretation} />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {item.beneficiary?.firstName} {item.beneficiary?.lastName} •{' '}
                                  {new Date(item.assessmentDate).toLocaleDateString('ar-SA')}
                                </Typography>
                              }
                            />
                            <ListItemSecondaryAction>
                              {item.score != null && (
                                <Typography variant="body2" fontWeight="bold" color="primary">
                                  {item.score}%
                                </Typography>
                              )}
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                        {items.length === 0 && (
                          <Typography
                            color="text.secondary"
                            variant="body2"
                            sx={{ textAlign: 'center', py: 2 }}
                          >
                            لا توجد تقييمات
                          </Typography>
                        )}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* ─── Tab 2: Assessments List ──────────────────────────────── */}
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            {/* Filters */}
            <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                size="small"
                placeholder="بحث..."
                variant="outlined"
                sx={{ width: 200 }}
                value={filters.q}
                onChange={e => {
                  setFilters(prev => ({ ...prev, q: e.target.value }));
                  setPage(0);
                }}
              />
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                startIcon={<FilterIcon />}
                size="small"
                onClick={() => setShowFilters(v => !v)}
              >
                فلاتر
              </Button>
              <Box sx={{ flex: 1 }} />
              <Typography variant="caption" color="text.secondary">
                {total} نتيجة
              </Typography>
            </Box>

            {showFilters && (
              <Paper
                sx={{
                  p: 2,
                  mb: 2,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>أداة التقييم</InputLabel>
                      <Select
                        value={filters.tool}
                        onChange={e => {
                          setFilters(p => ({ ...p, tool: e.target.value }));
                          setPage(0);
                        }}
                        label="أداة التقييم"
                      >
                        <MenuItem value="">الكل</MenuItem>
                        {ASSESSMENT_TOOLS.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>الفئة</InputLabel>
                      <Select
                        value={filters.category}
                        onChange={e => {
                          setFilters(p => ({ ...p, category: e.target.value }));
                          setPage(0);
                        }}
                        label="الفئة"
                      >
                        <MenuItem value="">الكل</MenuItem>
                        {CATEGORIES.map(c => (
                          <MenuItem key={c.value} value={c.value}>
                            {c.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>الحالة</InputLabel>
                      <Select
                        value={filters.status}
                        onChange={e => {
                          setFilters(p => ({ ...p, status: e.target.value }));
                          setPage(0);
                        }}
                        label="الحالة"
                      >
                        <MenuItem value="">الكل</MenuItem>
                        {STATUSES.map(s => (
                          <MenuItem key={s.value} value={s.value}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Paper>
            )}

            {/* Table */}
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الأداة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>المستفيد</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>النتيجة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>التفسير</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحلقة العلاجية</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                      إجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={28} />
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        <AssessmentIcon
                          sx={{ fontSize: 40, mb: 1, display: 'block', mx: 'auto', opacity: 0.3 }}
                        />
                        لا توجد تقييمات مطابقة
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map(item => (
                      <TableRow key={item._id} hover>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {ASSESSMENT_TOOLS.find(t => t.id === item.tool)?.label || item.tool}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {CATEGORIES.find(c => c.value === item.category)?.label || ''}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {item.beneficiary?.firstName} {item.beneficiary?.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.beneficiary?.beneficiaryNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {new Date(item.assessmentDate).toLocaleDateString('ar-SA')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <ScoreBar score={item.score} />
                        </TableCell>
                        <TableCell>
                          <InterpretationChip value={item.interpretation} />
                        </TableCell>
                        <TableCell>
                          <StatusChip value={item.status} />
                        </TableCell>
                        <TableCell>
                          {item.episodeOfCare ? (
                            <Chip
                              size="small"
                              label={item.episodeOfCare.episodeNumber || 'مرتبط'}
                              color="primary"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            <Tooltip title="عرض">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setViewItem(item);
                                  setViewOpen(true);
                                }}
                              >
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton size="small" onClick={() => openEdit(item)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="أرشفة">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleArchive(item._id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={e => {
                  setRowsPerPage(+e.target.value);
                  setPage(0);
                }}
                rowsPerPageOptions={[10, 25, 50]}
                labelRowsPerPage="عدد الصفوف:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
              />
            </TableContainer>
          </Box>
        </TabPanel>

        {/* ─── Tab 3: Trend Analysis ────────────────────────────────── */}
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              تحليل الاتجاه الطولي
            </Typography>
            <Paper
              sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
            >
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="رقم المستفيد (ObjectId)"
                    value={trendBeneficiary}
                    onChange={e => setTrendBeneficiary(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={5}>
                  <FormControl fullWidth size="small">
                    <InputLabel>أداة التقييم</InputLabel>
                    <Select
                      value={trendTool}
                      onChange={e => setTrendTool(e.target.value)}
                      label="أداة التقييم"
                    >
                      <MenuItem value="">اختر أداة</MenuItem>
                      {ASSESSMENT_TOOLS.map(t => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={fetchTrend}
                    disabled={trendLoading || !trendBeneficiary || !trendTool}
                  >
                    {trendLoading ? <CircularProgress size={20} color="inherit" /> : 'تحليل'}
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {trendData.length > 0 ? (
              <Card
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  منحنى التقدم عبر الزمن ({trendTool})
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => new Date(d).toLocaleDateString('ar-SA')}
                    />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <ChartTip
                      formatter={v => [`${v}%`, 'النتيجة']}
                      labelFormatter={d => new Date(d).toLocaleDateString('ar-SA')}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#1976d2"
                      strokeWidth={2}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                      name="النتيجة"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <TimelineIcon sx={{ fontSize: 60, mb: 2, opacity: 0.3 }} />
                <Typography variant="h6">حدد مستفيداً وأداة لعرض منحنى التقدم</Typography>
                <Typography variant="body2">
                  يعرض النظام تطور النتائج عبر الجلسات المتعددة
                </Typography>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* ─── Create / Edit Dialog ──────────────────────────────────── */}
      <Dialog
        open={dialog.open}
        onClose={() => !saving && setDialog({ open: false, mode: 'create', item: null })}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PsychIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              {dialog.mode === 'create' ? 'تقييم سريري جديد' : 'تعديل التقييم'}
            </Typography>
          </Box>
          <IconButton
            onClick={() => setDialog({ open: false, mode: 'create', item: null })}
            disabled={saving}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ pt: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            {/* Assessment Tool */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>أداة التقييم *</InputLabel>
                <Select
                  value={form.tool}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      tool: e.target.value,
                      category:
                        ASSESSMENT_TOOLS.find(t => t.id === e.target.value)?.category || p.category,
                    }))
                  }
                  label="أداة التقييم *"
                >
                  {ASSESSMENT_TOOLS.map(t => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="إصدار الأداة"
                size="medium"
                value={form.toolVersion}
                onChange={e => setForm(p => ({ ...p, toolVersion: e.target.value }))}
                placeholder="مثال: 3rd Ed."
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="تاريخ التقييم *"
                type="date"
                required
                value={form.assessmentDate}
                onChange={e => setForm(p => ({ ...p, assessmentDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  label="الفئة"
                >
                  {CATEGORIES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                label="المدة (دقائق)"
                type="number"
                value={form.duration}
                onChange={e => setForm(p => ({ ...p, duration: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  label="الحالة"
                >
                  {STATUSES.map(s => (
                    <MenuItem key={s.value} value={s.value}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Divider sx={{ width: '100%', my: 1, mx: 2 }} />
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary">
                النتائج والتسجيل
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الدرجة الخام"
                type="number"
                value={form.rawScore}
                onChange={e => setForm(p => ({ ...p, rawScore: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الحد الأقصى للدرجة الخام"
                type="number"
                value={form.maxRawScore}
                onChange={e => setForm(p => ({ ...p, maxRawScore: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="النتيجة المعيارية (0-100%)"
                type="number"
                value={form.score}
                onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
                inputProps={{ min: 0, max: 100 }}
                helperText="تحتسب تلقائياً إذا أدخلت الخام والحد الأقصى"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>التفسير السريري</InputLabel>
                <Select
                  value={form.interpretation}
                  onChange={e => setForm(p => ({ ...p, interpretation: e.target.value }))}
                  label="التفسير السريري"
                >
                  <MenuItem value="">—</MenuItem>
                  {INTERPRETATIONS.map(i => (
                    <MenuItem key={i.value} value={i.value}>
                      {i.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Score Breakdown */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  تفصيل النتائج بالمجالات
                </Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addBreakdown}>
                  إضافة مجال
                </Button>
              </Box>
              {scoreBreakdowns.map((row, idx) => (
                <Grid container spacing={1} key={idx} sx={{ mb: 1 }}>
                  <Grid item xs={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="المجال"
                      value={row.domain}
                      onChange={e => updateBreakdown(idx, 'domain', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="الدرجة"
                      type="number"
                      value={row.score}
                      onChange={e => updateBreakdown(idx, 'score', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="الحد الأقصى"
                      type="number"
                      value={row.maxScore}
                      onChange={e => updateBreakdown(idx, 'maxScore', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="ملاحظات"
                      value={row.notes}
                      onChange={e => updateBreakdown(idx, 'notes', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={1}>
                    <IconButton color="error" size="small" onClick={() => removeBreakdown(idx)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Grid>

            <Divider sx={{ width: '100%', my: 1, mx: 2 }} />
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight="bold" color="primary">
                الملاحظات والتوصيات
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الملاحظات السريرية"
                value={form.observations}
                onChange={e => setForm(p => ({ ...p, observations: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="نقاط القوة (سطر لكل نقطة)"
                value={form.strengths}
                onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="المخاوف (سطر لكل نقطة)"
                value={form.concerns}
                onChange={e => setForm(p => ({ ...p, concerns: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="التوصيات (سطر لكل توصية)"
                value={form.recommendations}
                onChange={e => setForm(p => ({ ...p, recommendations: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => setDialog({ open: false, mode: 'create', item: null })}
            disabled={saving}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── View Dialog ────────────────────────────────────────────── */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight="bold">
            {viewItem &&
              (ASSESSMENT_TOOLS.find(t => t.id === viewItem.tool)?.label || viewItem.tool)}
          </Typography>
          <IconButton onClick={() => setViewOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        {viewItem && (
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  المستفيد
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {viewItem.beneficiary?.firstName} {viewItem.beneficiary?.lastName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  التاريخ
                </Typography>
                <Typography variant="body2">
                  {new Date(viewItem.assessmentDate).toLocaleDateString('ar-SA')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  النتيجة
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <ScoreBar score={viewItem.score} />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  التفسير
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <InterpretationChip value={viewItem.interpretation} />
                </Box>
              </Grid>
              {viewItem.observations && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    الملاحظات
                  </Typography>
                  <Typography variant="body2">{viewItem.observations}</Typography>
                </Grid>
              )}
              {viewItem.strengths?.length > 0 && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    نقاط القوة
                  </Typography>
                  {viewItem.strengths.map((s, i) => (
                    <Typography key={i} variant="body2">
                      • {s}
                    </Typography>
                  ))}
                </Grid>
              )}
              {viewItem.concerns?.length > 0 && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    المخاوف
                  </Typography>
                  {viewItem.concerns.map((c, i) => (
                    <Typography key={i} variant="body2">
                      • {c}
                    </Typography>
                  ))}
                </Grid>
              )}
              {viewItem.recommendations?.length > 0 && (
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    التوصيات
                  </Typography>
                  {viewItem.recommendations.map((r, i) => (
                    <Typography key={i} variant="body2">
                      • {r}
                    </Typography>
                  ))}
                </Grid>
              )}
              {viewItem.scoreBreakdown?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    تفصيل المجالات
                  </Typography>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={viewItem.scoreBreakdown.map(d => ({
                        name: d.domain,
                        value:
                          d.percentage ??
                          (d.score && d.maxScore ? Math.round((d.score / d.maxScore) * 100) : 0),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                        tick={{ fontSize: 11 }}
                      />
                      <ChartTip formatter={v => [`${v}%`]} />
                      <Bar dataKey="value" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              )}
            </Grid>
          </DialogContent>
        )}
        <DialogActions>
          <Button
            onClick={() => {
              setViewOpen(false);
              if (viewItem) openEdit(viewItem);
            }}
            startIcon={<EditIcon />}
          >
            تعديل
          </Button>
          <Button onClick={() => setViewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
