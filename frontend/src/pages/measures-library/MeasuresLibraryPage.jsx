import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Grid,
  Typography,
  Chip,
  Avatar,
  Stack,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Alert,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Badge,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HistoryIcon from '@mui/icons-material/History';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CloseIcon from '@mui/icons-material/Close';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { goalsAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// TabPanel helper
// ─────────────────────────────────────────────────────────────────────────────
function TabPanel({ children, value, index }) {
  return value === index ? <Box>{children}</Box> : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity color map (aligned with Measure.scoringRuleSchema.severity)
// ─────────────────────────────────────────────────────────────────────────────
const SEVERITY = {
  critical: { label: 'حرج', color: '#d32f2f', chip: 'error' },
  high: { label: 'مرتفع', color: '#f57c00', chip: 'warning' },
  moderate: { label: 'متوسط', color: '#1976d2', chip: 'info' },
  mild: { label: 'خفيف', color: '#388e3c', chip: 'success' },
  normal: { label: 'طبيعي', color: '#616161', chip: 'default' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MeasureCard — single measure in the library list
// ─────────────────────────────────────────────────────────────────────────────
function MeasureCard({ measure, onApply, onHistory }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <AssessmentIcon />
          </Avatar>
        }
        title={
          <Typography variant="subtitle1" fontWeight="bold" noWrap>
            {measure.name_ar || measure.name}
          </Typography>
        }
        subheader={
          <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.3 }}>
            {measure.abbreviation && (
              <Chip size="small" label={measure.abbreviation} variant="outlined" />
            )}
            {measure.category && <Chip size="small" label={measure.category} />}
            {measure.version && (
              <Chip size="small" label={`v${measure.version}`} variant="outlined" color="default" />
            )}
          </Stack>
        }
      />
      <CardContent sx={{ flexGrow: 1, pt: 0 }}>
        {measure.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {measure.description}
          </Typography>
        )}
        <Grid container spacing={1}>
          {measure.targetAgeMin != null && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                الفئة العمرية
              </Typography>
              <Typography variant="body2">
                {measure.targetAgeMin}–{measure.targetAgeMax ?? '∞'} سنة
              </Typography>
            </Grid>
          )}
          {measure.targetPopulation?.length > 0 && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                الفئة المستهدفة
              </Typography>
              <Typography variant="body2">{measure.targetPopulation.join('، ')}</Typography>
            </Grid>
          )}
          {measure.administrationTime && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                مدة التطبيق
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2">{measure.administrationTime} دقيقة</Typography>
              </Stack>
            </Grid>
          )}
          {measure.domainDefinitions?.length > 0 && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary">
                المجالات
              </Typography>
              <Typography variant="body2">{measure.domainDefinitions.length} مجال</Typography>
            </Grid>
          )}
        </Grid>
      </CardContent>
      <CardActions sx={{ justifyContent: 'flex-end', gap: 1, px: 2, pb: 1.5 }}>
        <Tooltip title="سجل التطبيقات">
          <IconButton size="small" onClick={() => onHistory(measure)}>
            <HistoryIcon />
          </IconButton>
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          startIcon={<InfoOutlinedIcon />}
          onClick={() => onHistory(measure)}
        >
          التفاصيل
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={() => onApply(measure)}
          color="primary"
        >
          تطبيق
        </Button>
      </CardActions>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ApplyMeasureDialog — step-by-step measure application
// ─────────────────────────────────────────────────────────────────────────────
function ApplyMeasureDialog({ open, measure, beneficiaryId, beneficiaryName, onClose, onSuccess }) {
  const [step, setStep] = useState(0); // 0=confirm, 1=score domains, 2=done
  const [domainScores, setDomainScores] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setDomainScores({});
      setNotes('');
      setResult(null);
    }
  }, [open]);

  const domains = measure?.domainDefinitions || [];
  const _allScored = domains.length === 0 || domains.every(d => domainScores[d.code] != null);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        measureId: measure._id,
        beneficiaryId,
        domainScores,
        notes,
      };
      const res = await goalsAPI.measures.apply(payload);
      setResult(res.data?.data || res.data || {});
      setStep(2);
      onSuccess?.();
    } catch (err) {
      // show inline error
      setResult({ error: err.response?.data?.message || err.message });
    } finally {
      setSaving(false);
    }
  };

  const scoringLabel = item => {
    if (item.type === 'binary') return ['لا', 'نعم'];
    if (item.options?.length) return item.options.map(o => o.label || o.value);
    return null;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { direction: 'rtl' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack>
          <Typography variant="subtitle1" fontWeight="bold">
            تطبيق مقياس: {measure?.name_ar || measure?.name}
          </Typography>
          {beneficiaryName && (
            <Typography variant="body2" color="text.secondary">
              المستفيد: {beneficiaryName}
            </Typography>
          )}
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {step === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                {measure?.description ||
                  'تطبيق المقياس على المستفيد المحدد وحفظ النتائج في الملف الطولي.'}
              </Typography>
            </Alert>
            {measure?.domainDefinitions?.length > 0 && (
              <>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  المجالات التي سيتم تقييمها:
                </Typography>
                <List dense>
                  {measure.domainDefinitions.map(d => (
                    <ListItem key={d.code} divider>
                      <ListItemIcon>
                        <AssessmentIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={d.name_ar || d.name} secondary={d.description} />
                      {d.items?.length > 0 && <Chip size="small" label={`${d.items.length} بند`} />}
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}

        {step === 1 && (
          <Box>
            {domains.length === 0 ? (
              <Alert severity="warning">
                هذا المقياس لا يحتوي على مجالات تفصيلية. سيتم تطبيقه كدرجة إجمالية.
              </Alert>
            ) : (
              domains.map(domain => (
                <Accordion key={domain.code} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">{domain.name_ar || domain.name}</Typography>
                    {domainScores[domain.code] != null && (
                      <CheckCircleIcon color="success" sx={{ ml: 1 }} />
                    )}
                  </AccordionSummary>
                  <AccordionDetails>
                    {domain.items?.length > 0 ? (
                      domain.items.map((item, idx) => {
                        const labels = scoringLabel(item);
                        return (
                          <Box key={idx} sx={{ mb: 2 }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.5 }}>
                              {item.label_ar || item.label || item.code}
                            </Typography>
                            {labels ? (
                              <Stack direction="row" spacing={1}>
                                {labels.map((lbl, li) => (
                                  <Chip
                                    key={li}
                                    label={lbl}
                                    size="small"
                                    clickable
                                    variant={
                                      domainScores[`${domain.code}.${item.code ?? idx}`] === li
                                        ? 'filled'
                                        : 'outlined'
                                    }
                                    color={
                                      domainScores[`${domain.code}.${item.code ?? idx}`] === li
                                        ? 'primary'
                                        : 'default'
                                    }
                                    onClick={() =>
                                      setDomainScores(prev => ({
                                        ...prev,
                                        [`${domain.code}.${item.code ?? idx}`]: li,
                                      }))
                                    }
                                  />
                                ))}
                              </Stack>
                            ) : (
                              <TextField
                                type="number"
                                size="small"
                                value={domainScores[`${domain.code}.${item.code ?? idx}`] ?? ''}
                                onChange={e =>
                                  setDomainScores(prev => ({
                                    ...prev,
                                    [`${domain.code}.${item.code ?? idx}`]: Number(e.target.value),
                                  }))
                                }
                                inputProps={{ min: item.min ?? 0, max: item.max ?? 100 }}
                                label="الدرجة"
                                sx={{ width: 120 }}
                              />
                            )}
                          </Box>
                        );
                      })
                    ) : (
                      <TextField
                        type="number"
                        size="small"
                        fullWidth
                        label={`درجة ${domain.name_ar || domain.name}`}
                        value={domainScores[domain.code] ?? ''}
                        onChange={e =>
                          setDomainScores(prev => ({
                            ...prev,
                            [domain.code]: Number(e.target.value),
                          }))
                        }
                        inputProps={{ min: 0, max: 100 }}
                      />
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            )}
            <TextField
              multiline
              rows={3}
              fullWidth
              sx={{ mt: 2 }}
              label="ملاحظات الأخصائي"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </Box>
        )}

        {step === 2 && (
          <Box>
            {result?.error ? (
              <Alert severity="error">{result.error}</Alert>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  تم تطبيق المقياس وحفظ النتائج بنجاح
                </Alert>
                {result && (
                  <Grid container spacing={2}>
                    {result.totalScore != null && (
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h4" fontWeight="bold" color="primary">
                            {result.totalScore}
                          </Typography>
                          <Typography variant="caption">الدرجة الإجمالية</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {result.severity && (
                      <Grid item xs={6}>
                        <Paper
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            borderTop: `4px solid ${SEVERITY[result.severity]?.color || '#9e9e9e'}`,
                          }}
                        >
                          <Typography
                            variant="h5"
                            fontWeight="bold"
                            color={SEVERITY[result.severity]?.color}
                          >
                            {SEVERITY[result.severity]?.label || result.severity}
                          </Typography>
                          <Typography variant="caption">مستوى الخطورة</Typography>
                        </Paper>
                      </Grid>
                    )}
                    {result.interpretation && (
                      <Grid item xs={12}>
                        <Alert severity="info">{result.interpretation}</Alert>
                      </Grid>
                    )}
                  </Grid>
                )}
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {step < 2 && (
          <>
            <Button onClick={onClose} color="inherit">
              إلغاء
            </Button>
            {step === 0 && (
              <Button variant="contained" onClick={() => setStep(1)}>
                بدء التقييم
              </Button>
            )}
            {step === 1 && (
              <>
                <Button onClick={() => setStep(0)}>رجوع</Button>
                <Button
                  variant="contained"
                  disabled={saving}
                  onClick={handleSubmit}
                  startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ النتائج'}
                </Button>
              </>
            )}
          </>
        )}
        {step === 2 && (
          <Button variant="contained" onClick={onClose}>
            إغلاق
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MeasureHistoryDialog — trend chart + application log per beneficiary
// ─────────────────────────────────────────────────────────────────────────────
function MeasureHistoryDialog({ open, measure, beneficiaryId, beneficiaryName, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !measure || !beneficiaryId) return;
    setLoading(true);
    goalsAPI.measures
      .history(beneficiaryId, measure._id)
      .then(res => setHistory(res.data?.data || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, measure, beneficiaryId]);

  const chartData = useMemo(
    () =>
      [...history]
        .sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt))
        .map(h => ({
          date: _fmtDate(h.appliedAt, { month: 'short', year: '2-digit' }),
          score: h.totalScore ?? h.score,
          severity: h.severity,
        })),
    [history]
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { direction: 'rtl' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Stack>
          <Typography variant="subtitle1" fontWeight="bold">
            سجل تطبيقات: {measure?.name_ar || measure?.name}
          </Typography>
          {beneficiaryName && (
            <Typography variant="body2" color="text.secondary">
              {beneficiaryName}
            </Typography>
          )}
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Alert severity="info">لا توجد تطبيقات سابقة لهذا المقياس على المستفيد</Alert>
        ) : (
          <>
            {/* Trend Chart */}
            {chartData.length > 1 && (
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardHeader
                  title="منحنى التقدم عبر الزمن"
                  titleTypographyProps={{ variant: 'subtitle2', fontWeight: 'bold' }}
                />
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <ChartTooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#1976d2"
                        strokeWidth={2}
                        dot={{ r: 5 }}
                        name="الدرجة"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Application log */}
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الدرجة الإجمالية</TableCell>
                  <TableCell>مستوى الخطورة</TableCell>
                  <TableCell>الأخصائي</TableCell>
                  <TableCell>ملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[...history]
                  .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt))
                  .map((h, i) => (
                    <TableRow key={h._id || i} hover>
                      <TableCell>{h.appliedAt ? _fmtDate(h.appliedAt) : '—'}</TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{h.totalScore ?? h.score ?? '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        {h.severity ? (
                          <Chip
                            size="small"
                            label={SEVERITY[h.severity]?.label || h.severity}
                            color={SEVERITY[h.severity]?.chip || 'default'}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{h.appliedBy?.name || '—'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
                          {h.notes || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function MeasuresLibraryPage({ beneficiaryId, beneficiaryName } = {}) {
  const [tab, setTab] = useState(0);
  const [measures, setMeasures] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [beneficiarySummary, setBeneficiarySummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // dialogs
  const [applyDialog, setApplyDialog] = useState({ open: false, measure: null });
  const [historyDialog, setHistoryDialog] = useState({ open: false, measure: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [measuresRes, overdueRes] = await Promise.allSettled([
        goalsAPI.measures.list({ limit: 200 }),
        goalsAPI.measures.overdueReapplications(),
      ]);
      setMeasures(measuresRes.status === 'fulfilled' ? measuresRes.value.data?.data || [] : []);
      setOverdue(overdueRes.status === 'fulfilled' ? overdueRes.value.data?.data || [] : []);

      if (beneficiaryId) {
        const summaryRes = await goalsAPI.measures
          .beneficiarySummary(beneficiaryId)
          .catch(() => ({ data: { data: [] } }));
        setBeneficiarySummary(summaryRes.data?.data || []);
      }
    } catch (err) {
      setError(err.message || 'خطأ في تحميل المكتبة');
    } finally {
      setLoading(false);
    }
  }, [beneficiaryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // derived
  const categories = useMemo(
    () => [...new Set(measures.map(m => m.category).filter(Boolean))],
    [measures]
  );

  const filteredMeasures = useMemo(
    () =>
      measures.filter(m => {
        const matchSearch =
          !search ||
          [m.name_ar, m.name, m.abbreviation].some(s =>
            s?.toLowerCase().includes(search.toLowerCase())
          );
        const matchCategory = !filterCategory || m.category === filterCategory;
        return matchSearch && matchCategory;
      }),
    [measures, search, filterCategory]
  );

  const appliedMeasureIds = useMemo(
    () => new Set(beneficiarySummary.map(s => s.measureId)),
    [beneficiarySummary]
  );

  // ─── Loading / Error ───
  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          <LibraryBooksIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          مكتبة المقاييس السريرية
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Card variant="outlined">
                <CardContent>
                  <LinearProgress />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Alert severity="error" action={<Button onClick={loadData}>إعادة المحاولة</Button>}>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ═══════════════ Header ═══════════════ */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight="bold">
            <LibraryBooksIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
            مكتبة المقاييس السريرية
          </Typography>
          {beneficiaryName && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              <PersonSearchIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              {beneficiaryName}
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {overdue.length > 0 && (
            <Badge badgeContent={overdue.length} color="error">
              <Chip
                icon={<WarningAmberIcon />}
                label="تطبيقات متأخرة"
                color="warning"
                clickable
                onClick={() => setTab(2)}
              />
            </Badge>
          )}
          <Button variant="contained" size="small" onClick={loadData}>
            تحديث
          </Button>
        </Stack>
      </Box>

      {/* ═══════════════ Stats Row ═══════════════ */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'إجمالي المقاييس', value: measures.length, color: '#1976d2' },
          { label: 'الفئات', value: categories.length, color: '#388e3c' },
          beneficiaryId && {
            label: 'مطبقة على المستفيد',
            value: appliedMeasureIds.size,
            color: '#7b1fa2',
          },
          overdue.length > 0 && {
            label: 'تطبيقات متأخرة',
            value: overdue.length,
            color: '#d32f2f',
          },
        ]
          .filter(Boolean)
          .map((s, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Paper sx={{ p: 2, textAlign: 'center', borderTop: `4px solid ${s.color}` }}>
                <Typography variant="h4" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
      </Grid>

      {/* ═══════════════ Filters ═══════════════ */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="البحث في المكتبة"
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={filterCategory}
                  label="الفئة"
                  onChange={e => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {categories.map(c => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {filteredMeasures.length} نتيجة
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ═══════════════ Tabs ═══════════════ */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<LibraryBooksIcon />} iconPosition="start" label="المكتبة" />
          {beneficiaryId && (
            <Tab
              icon={<AssessmentIcon />}
              iconPosition="start"
              label={`المطبقة (${appliedMeasureIds.size})`}
            />
          )}
          <Tab
            icon={
              <Badge badgeContent={overdue.length} color="error" max={99}>
                <WarningAmberIcon />
              </Badge>
            }
            iconPosition="start"
            label="التطبيقات المتأخرة"
          />
        </Tabs>

        {/* ─── Tab 0: Library ─── */}
        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            {filteredMeasures.length === 0 ? (
              <Alert severity="info">لا توجد مقاييس تطابق معايير البحث</Alert>
            ) : (
              <Grid container spacing={2}>
                {filteredMeasures.map(m => (
                  <Grid item xs={12} md={6} lg={4} key={m._id}>
                    <MeasureCard
                      measure={m}
                      onApply={measure => setApplyDialog({ open: true, measure })}
                      onHistory={measure => setHistoryDialog({ open: true, measure })}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* ─── Tab 1: Applied to Beneficiary ─── (only when beneficiaryId provided) */}
        {beneficiaryId && (
          <TabPanel value={tab} index={1}>
            <Box sx={{ p: 2 }}>
              {beneficiarySummary.length === 0 ? (
                <Alert severity="info">لم تُطبَّق أي مقاييس على هذا المستفيد بعد</Alert>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>المقياس</TableCell>
                      <TableCell>آخر تطبيق</TableCell>
                      <TableCell>الدرجة</TableCell>
                      <TableCell>مستوى الخطورة</TableCell>
                      <TableCell>التغيُّر</TableCell>
                      <TableCell>إجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {beneficiarySummary.map((s, i) => {
                      const m = measures.find(x => x._id === s.measureId);
                      return (
                        <TableRow key={s._id || i} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {s.measureName || m?.name_ar || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>{s.lastApplied ? _fmtDate(s.lastApplied) : '—'}</TableCell>
                          <TableCell>
                            <Typography fontWeight="bold" color="primary">
                              {s.lastScore ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {s.severity ? (
                              <Chip
                                size="small"
                                label={SEVERITY[s.severity]?.label || s.severity}
                                color={SEVERITY[s.severity]?.chip || 'default'}
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            {s.trend === 'improving' ? (
                              <TrendingUpIcon color="success" />
                            ) : s.trend === 'declining' ? (
                              <TrendingDownIcon color="error" />
                            ) : s.trend === 'stable' ? (
                              <TrendingFlatIcon color="action" />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5}>
                              <Tooltip title="السجل">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setHistoryDialog({
                                      open: true,
                                      measure: m || { _id: s.measureId, name_ar: s.measureName },
                                    })
                                  }
                                >
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {m && (
                                <Tooltip title="إعادة تطبيق">
                                  <IconButton
                                    size="small"
                                    onClick={() => setApplyDialog({ open: true, measure: m })}
                                  >
                                    <PlayArrowIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Box>
          </TabPanel>
        )}

        {/* ─── Tab 2 (or 1 without beneficiaryId): Overdue ─── */}
        <TabPanel value={tab} index={beneficiaryId ? 2 : 1}>
          <Box sx={{ p: 2 }}>
            {overdue.length === 0 ? (
              <Alert severity="success">لا توجد تطبيقات متأخرة — جميع المقاييس محدَّثة</Alert>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المستفيد</TableCell>
                    <TableCell>المقياس</TableCell>
                    <TableCell>آخر تطبيق</TableCell>
                    <TableCell>الأيام المتأخرة</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {overdue.map((o, i) => {
                    const m = measures.find(x => x._id === o.measureId);
                    return (
                      <TableRow
                        key={o._id || i}
                        hover
                        sx={{ bgcolor: (o.overdueDays ?? 0) > 30 ? 'error.50' : 'inherit' }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">
                            {o.beneficiaryName || o.beneficiaryId}
                          </Typography>
                        </TableCell>
                        <TableCell>{o.measureName || m?.name_ar || '—'}</TableCell>
                        <TableCell>
                          {o.lastApplied ? _fmtDate(o.lastApplied) : 'لم يُطبَّق'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={`${o.overdueDays ?? '?'} يوم`}
                            color={(o.overdueDays ?? 0) > 30 ? 'error' : 'warning'}
                          />
                        </TableCell>
                        <TableCell>
                          {m && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PlayArrowIcon />}
                              onClick={() => {
                                setApplyDialog({ open: true, measure: m });
                              }}
                            >
                              تطبيق
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Box>
        </TabPanel>
      </Card>

      {/* ═══════════════ Dialogs ═══════════════ */}
      <ApplyMeasureDialog
        open={applyDialog.open}
        measure={applyDialog.measure}
        beneficiaryId={beneficiaryId}
        beneficiaryName={beneficiaryName}
        onClose={() => setApplyDialog({ open: false, measure: null })}
        onSuccess={() => {
          setApplyDialog({ open: false, measure: null });
          loadData();
        }}
      />
      <MeasureHistoryDialog
        open={historyDialog.open}
        measure={historyDialog.measure}
        beneficiaryId={beneficiaryId}
        beneficiaryName={beneficiaryName}
        onClose={() => setHistoryDialog({ open: false, measure: null })}
      />
    </Box>
  );
}
