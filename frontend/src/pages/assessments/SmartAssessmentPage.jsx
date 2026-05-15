/**
 * SmartAssessmentPage — شاشة التقييم الذكي الشاملة
 *
 * ميزات الشاشة:
 *  1. قائمة مقاييس تفاعلية مع البحث والفلترة حسب الفئة
 *  2. معالج خطوات (Wizard) لإدخال استجابات المقياس
 *  3. عرض النتيجة الفورية: الدرجة، التفسير السريري، اللون الدلالي
 *  4. توصيات ذكية وأهداف SMART قابلة للنسخ
 *  5. مخطط راداري/شريطي للنطاقات
 *  6. بطارية مقاييس متعددة مع ملخص سريري
 *  7. تتبع التقدم عبر الزمن بخط بياني
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Divider as _Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Alert,
  AlertTitle,
  LinearProgress,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as _WarningIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Lightbulb as LightbulbIcon,
  FitnessCenter as FitnessIcon,
  Psychology as PsychologyIcon,
  Hearing as HearingIcon,
  ChildCare as ChildIcon,
  FamilyRestroom as FamilyIcon,
  Close as CloseIcon,
  PlayArrow as StartIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart as _BarChart,
  Bar as _Bar,
  XAxis as _XAxis,
  YAxis as _YAxis,
  CartesianGrid as _CartesianGrid,
  Tooltip as _RTooltip,
  LineChart as _LineChart,
  Line as _Line,
  Legend as _Legend,
} from 'recharts';
import { rehabMeasuresAPI } from '../../services/ddd';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_ICONS = {
  motor: <FitnessIcon />,
  functional: <AssignmentIcon />,
  communication: <HearingIcon />,
  autism: <PsychologyIcon />,
  adaptive_behavior: <ChildIcon />,
  quality_of_life: <TrendingUpIcon />,
  caregiver_wellbeing: <FamilyIcon />,
  icf_based: <InfoIcon />,
  developmental: <ChildIcon />,
};

const TIER_COLOR = {
  // Functional levels (renamed from `minimal` to disambiguate against the
  // severity bucket below — JS would otherwise silently keep the last one).
  independent: '#43a047',
  modified_independent: '#66bb6a',
  supervision: '#ffa726',
  minimal_assist: '#ff7043',
  moderate: '#ef5350',
  maximal: '#e53935',
  total: '#b71c1c',
  // Fall risk
  low_fall_risk: '#43a047',
  medium_fall_risk: '#ffa726',
  high_fall_risk: '#e53935',
  // Severity
  minimal: '#43a047',
  mild_moderate: '#ffa726',
  severe: '#e53935',
  // Default
  default: '#78909c',
};

function tierColor(tier) {
  return TIER_COLOR[String(tier)] || TIER_COLOR.default;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MeasureCategoryFilter({ categories, selected, onSelect }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      <Chip
        label="الكل"
        variant={selected === null ? 'filled' : 'outlined'}
        color={selected === null ? 'primary' : 'default'}
        onClick={() => onSelect(null)}
        size="small"
      />
      {categories.map(cat => (
        <Chip
          key={cat.key}
          icon={CATEGORY_ICONS[cat.key] || <AssignmentIcon />}
          label={cat.label_ar}
          variant={selected === cat.key ? 'filled' : 'outlined'}
          color={selected === cat.key ? 'primary' : 'default'}
          onClick={() => onSelect(cat.key)}
          size="small"
          sx={{ '& .MuiChip-icon': { fontSize: 16 } }}
        />
      ))}
    </Box>
  );
}

function MeasureCard({ measure, onSelect, selected }) {
  return (
    <Card
      elevation={selected ? 4 : 1}
      sx={{
        border: selected ? 2 : 0,
        borderColor: 'primary.main',
        borderRadius: 2,
        transition: 'all 0.2s',
        '&:hover': { elevation: 3, transform: 'translateY(-2px)' },
      }}
    >
      <CardActionArea onClick={() => onSelect(measure)}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
              {measure.name_ar}
            </Typography>
            <Chip
              label={measure.abbreviation}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1, fontFamily: 'monospace', fontSize: 11 }}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {measure.name_en}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
            {measure.adminTime && (
              <Chip label={`${measure.adminTime} دقيقة`} size="small" variant="outlined" />
            )}
            {measure.adminMode && (
              <Chip label={measure.adminMode} size="small" variant="outlined" />
            )}
            {measure.totalItems && (
              <Chip label={`${measure.totalItems} بند`} size="small" variant="outlined" />
            )}
          </Box>
          {measure.targetPopulation && (
            <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 1 }}>
              {measure.targetPopulation.slice(0, 2).join(' • ')}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function ScoreResultCard({ result }) {
  if (!result || result.error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {result?.error || 'خطأ في الحساب'}
      </Alert>
    );
  }

  const interp = result.interpretation;
  const color = interp?.color || tierColor(result.tier);

  // Build radar data from domainScores
  const radarData = result.domainScores
    ? Object.entries(result.domainScores).map(([key, d]) => ({
        domain: d.name_ar || key,
        score: d.percent || 0,
        fullMark: 100,
      }))
    : [];

  return (
    <Box>
      {/* Score Summary */}
      <Card
        sx={{
          background: `linear-gradient(135deg, ${color}15, ${color}05)`,
          border: `2px solid ${color}`,
          borderRadius: 3,
          mb: 2,
        }}
      >
        <CardContent>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                {result.measureName}
              </Typography>
              {result.classification ? (
                <>
                  <Typography variant="h4" fontWeight={700} sx={{ color }}>
                    المستوى {result.classification.level}
                  </Typography>
                  <Typography variant="body1" sx={{ color }}>
                    {result.classification.label_ar}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="h3" fontWeight={700} sx={{ color }}>
                    {result.rawScore}
                    {result.maxScore && (
                      <Typography component="span" variant="h5" color="text.secondary">
                        /{result.maxScore}
                      </Typography>
                    )}
                  </Typography>
                  {result.percentScore !== null && (
                    <LinearProgress
                      variant="determinate"
                      value={result.percentScore}
                      sx={{
                        mt: 1,
                        height: 8,
                        borderRadius: 4,
                        bgcolor: `${color}20`,
                        '& .MuiLinearProgress-bar': { bgcolor: color },
                      }}
                    />
                  )}
                </>
              )}
            </Grid>
            <Grid item xs={12} sm={6}>
              {interp && (
                <Paper elevation={0} sx={{ p: 2, bgcolor: `${color}15`, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color }}>
                    {interp.label_ar}
                  </Typography>
                  {result.percentile && (
                    <Typography variant="caption" color="text.secondary">
                      الرتبة المئوية: {result.percentile}%
                    </Typography>
                  )}
                  {result.zScore !== null && result.zScore !== undefined && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Z-Score: {result.zScore}
                    </Typography>
                  )}
                </Paper>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Clinical Flags */}
      {result.flags?.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {result.flags.map((flag, i) => (
            <Alert
              key={i}
              severity={
                flag.type === 'safety' || flag.type === 'caregiver_alert' ? 'error' : 'warning'
              }
              sx={{ mb: 1 }}
            >
              <AlertTitle>{flag.type === 'safety' ? 'تنبيه السلامة' : 'ملاحظة سريرية'}</AlertTitle>
              {flag.message_ar}
            </Alert>
          ))}
        </Box>
      )}

      {/* Domain Radar Chart */}
      {radarData.length > 1 && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              الأداء حسب النطاق
            </Typography>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: '#555' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="الأداء"
                  dataKey="score"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {result.recommendations?.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <LightbulbIcon sx={{ mr: 1, color: 'warning.main' }} />
            <Typography fontWeight={700}>
              التوصيات السريرية ({result.recommendations.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {result.recommendations.map((rec, i) => (
                <ListItem key={i}>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary={rec} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* SMART Goals */}
      {result.smartGoals?.length > 0 && (
        <Accordion sx={{ mt: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
            <Typography fontWeight={700}>الأهداف المقترحة ({result.smartGoals.length})</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense>
              {result.smartGoals.map((goal, i) => (
                <ListItem
                  key={i}
                  secondaryAction={
                    <Tooltip title="نسخ الهدف">
                      <IconButton size="small" onClick={() => navigator.clipboard?.writeText(goal)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <ListItemIcon>
                    <Badge badgeContent={i + 1} color="primary" />
                  </ListItemIcon>
                  <ListItemText primary={goal} />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartAssessmentPage() {
  // ─ State ─
  const [tab, setTab] = useState(0);
  const [categories, setCategories] = useState([]);
  const [measures, setMeasures] = useState([]);
  const [filterCategory, setFilterCategory] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Single measure assessment wizard
  const [selectedMeasure, setSelectedMeasure] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [measureDetail, setMeasureDetail] = useState(null);
  const [responses, setResponses] = useState({});
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  // Suggest tool
  const [suggestDiagnosis, setSuggestDiagnosis] = useState('');
  const [suggestAge, setSuggestAge] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);

  // ─ Effects ─
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    loadCatalog();
    loadCategories();
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [filterCategory, searchText]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const loadCatalog = useCallback(async () => {
    setLoadingCatalog(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      if (searchText) params.search = searchText;
      const res = await rehabMeasuresAPI.list(params);
      setMeasures(res.data?.data?.measures || []);
    } catch {
      // silently fail — catalog still functional from previous load
    } finally {
      setLoadingCatalog(false);
    }
  }, [filterCategory, searchText]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await rehabMeasuresAPI.categories();
      setCategories(res.data?.data || []);
    } catch {
      // ignore
    }
  }, []);

  const handleSelectMeasure = useCallback(async measure => {
    setSelectedMeasure(measure);
    setResponses({});
    setScoreResult(null);
    setActiveStep(1);
    try {
      const res = await rehabMeasuresAPI.get(measure.key);
      setMeasureDetail(res.data?.data || null);
    } catch {
      setMeasureDetail(null);
    }
  }, []);

  const handleScore = useCallback(async () => {
    if (!selectedMeasure) return;
    setScoring(true);
    try {
      const res = await rehabMeasuresAPI.score({
        measureKey: selectedMeasure.key,
        responses,
      });
      setScoreResult(res.data?.data || null);
      setActiveStep(2);
    } catch (err) {
      setScoreResult({ error: err.response?.data?.message || 'خطأ في الاتصال بالخادم' });
      setActiveStep(2);
    } finally {
      setScoring(false);
    }
  }, [selectedMeasure, responses]);

  const handleSuggest = useCallback(async () => {
    if (!suggestDiagnosis || !suggestAge) return;
    setSuggestLoading(true);
    try {
      const res = await rehabMeasuresAPI.suggest({ diagnosis: suggestDiagnosis, age: suggestAge });
      setSuggestions(res.data?.data?.measures || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, [suggestDiagnosis, suggestAge]);

  const resetWizard = useCallback(() => {
    setSelectedMeasure(null);
    setMeasureDetail(null);
    setResponses({});
    setScoreResult(null);
    setActiveStep(0);
  }, []);

  // ─ Render helpers ─

  function renderResponseInput(item, isOrdinal) {
    if (isOrdinal) {
      return (
        <Box key={item.id || item.level} sx={{ mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>المستوى</InputLabel>
            <Select
              label="المستوى"
              value={responses.level ?? ''}
              onChange={e => setResponses({ level: e.target.value })}
            >
              {(measureDetail?.levels || []).map(l => (
                <MenuItem key={l.level} value={l.level}>
                  {l.level} — {l.label_ar}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      );
    }

    const maxScore = item.maxScore || item.max || 4;
    return (
      <Box key={item.id} sx={{ mb: 2 }}>
        <Typography variant="body2" gutterBottom>
          {item.name_ar || item.id}
        </Typography>
        <Slider
          min={item.min ?? 0}
          max={maxScore}
          step={1}
          marks
          valueLabelDisplay="auto"
          value={responses[item.id] ?? 0}
          onChange={(_, v) => setResponses(prev => ({ ...prev, [item.id]: v }))}
          sx={{ color: 'primary.main' }}
        />
        {item.rating_scale && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {item.rating_scale.slice(0, 2).map((r, i) => (
              <Typography key={i} variant="caption" color="text.secondary">
                {r.score}: {r.label_ar}
              </Typography>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  const isOrdinal = measureDetail?.scoringType === 'ordinal_classification';
  const allItems = measureDetail
    ? measureDetail.items || Object.values(measureDetail.domains || {}).flatMap(d => d.items || [])
    : [];

  // ─ Render ─
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          التقييم الذكي الشامل
        </Typography>
        <Typography variant="body2" color="text.secondary">
          مكتبة مقاييس تأهيل معتمدة دولياً مع تسجيل ذكي وتوصيات سريرية فورية
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="مكتبة المقاييس" icon={<AssignmentIcon />} iconPosition="start" />
        <Tab label="اقتراح المقاييس" icon={<LightbulbIcon />} iconPosition="start" />
      </Tabs>

      {/* ─── Tab 0: Measures Catalog & Wizard ─── */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Left: Catalog */}
          <Grid item xs={12} md={selectedMeasure ? 4 : 12}>
            {/* Search */}
            <TextField
              fullWidth
              size="small"
              placeholder="ابحث عن مقياس..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Category filter */}
            <MeasureCategoryFilter
              categories={categories}
              selected={filterCategory}
              onSelect={setFilterCategory}
            />

            {loadingCatalog ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {measures.map(m => (
                  <Grid
                    item
                    xs={12}
                    sm={selectedMeasure ? 12 : 6}
                    md={selectedMeasure ? 12 : 4}
                    key={m.key}
                  >
                    <MeasureCard
                      measure={m}
                      selected={selectedMeasure?.key === m.key}
                      onSelect={handleSelectMeasure}
                    />
                  </Grid>
                ))}
                {measures.length === 0 && (
                  <Grid item xs={12}>
                    <Alert severity="info">لا توجد مقاييس مطابقة للبحث</Alert>
                  </Grid>
                )}
              </Grid>
            )}
          </Grid>

          {/* Right: Wizard */}
          {selectedMeasure && (
            <Grid item xs={12} md={8}>
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" fontWeight={700}>
                      {selectedMeasure.name_ar}
                    </Typography>
                    <IconButton onClick={resetWizard} size="small">
                      <CloseIcon />
                    </IconButton>
                  </Box>

                  <Stepper activeStep={activeStep} orientation="vertical">
                    {/* Step 0: Info */}
                    <Step>
                      <StepLabel>معلومات المقياس</StepLabel>
                      <StepContent>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {selectedMeasure.name_en} — {selectedMeasure.abbreviation}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                          {selectedMeasure.adminTime && (
                            <Chip
                              label={`وقت التطبيق: ${selectedMeasure.adminTime} دقيقة`}
                              size="small"
                            />
                          )}
                          {selectedMeasure.adminMode && (
                            <Chip label={selectedMeasure.adminMode} size="small" />
                          )}
                          {selectedMeasure.reliability?.ICC && (
                            <Chip
                              label={`ICC: ${selectedMeasure.reliability.ICC}`}
                              size="small"
                              color="success"
                            />
                          )}
                        </Box>
                        <Button
                          variant="contained"
                          startIcon={<StartIcon />}
                          onClick={() => setActiveStep(1)}
                        >
                          بدء التقييم
                        </Button>
                      </StepContent>
                    </Step>

                    {/* Step 1: Responses */}
                    <Step>
                      <StepLabel>إدخال الاستجابات</StepLabel>
                      <StepContent>
                        {!measureDetail ? (
                          <CircularProgress size={20} />
                        ) : isOrdinal ? (
                          renderResponseInput(null, true)
                        ) : (
                          <Box sx={{ maxHeight: 400, overflowY: 'auto', pr: 1 }}>
                            {allItems.map(item => renderResponseInput(item, false))}
                          </Box>
                        )}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button onClick={() => setActiveStep(0)}>رجوع</Button>
                          <Button
                            variant="contained"
                            onClick={handleScore}
                            disabled={scoring}
                            startIcon={
                              scoring ? <CircularProgress size={16} /> : <CheckCircleIcon />
                            }
                          >
                            {scoring ? 'جاري الحساب...' : 'احسب النتيجة'}
                          </Button>
                        </Box>
                      </StepContent>
                    </Step>

                    {/* Step 2: Results */}
                    <Step>
                      <StepLabel>النتائج والتوصيات</StepLabel>
                      <StepContent>
                        {scoreResult && <ScoreResultCard result={scoreResult} />}
                        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                          <Button
                            startIcon={<RefreshIcon />}
                            onClick={() => {
                              setResponses({});
                              setScoreResult(null);
                              setActiveStep(1);
                            }}
                          >
                            إعادة التقييم
                          </Button>
                          <Button onClick={resetWizard}>مقياس آخر</Button>
                        </Box>
                      </StepContent>
                    </Step>
                  </Stepper>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {/* ─── Tab 1: Suggest Measures ─── */}
      {tab === 1 && (
        <Box>
          <Card sx={{ mb: 3, borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                اقتراح مقاييس مناسبة حسب التشخيص والعمر
              </Typography>
              <Grid container spacing={2} alignItems="flex-end">
                <Grid item xs={12} sm={5}>
                  <TextField
                    fullWidth
                    label="التشخيص"
                    placeholder="مثال: شلل دماغي، اضطراب طيف التوحد"
                    value={suggestDiagnosis}
                    onChange={e => setSuggestDiagnosis(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField
                    fullWidth
                    label="العمر (سنوات)"
                    type="number"
                    value={suggestAge}
                    onChange={e => setSuggestAge(e.target.value)}
                    size="small"
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSuggest}
                    disabled={suggestLoading || !suggestDiagnosis || !suggestAge}
                    startIcon={suggestLoading ? <CircularProgress size={16} /> : <LightbulbIcon />}
                  >
                    {suggestLoading ? 'جاري الاقتراح...' : 'اقترح المقاييس'}
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {suggestions.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                {suggestions.length} مقياس مقترح (مرتبة حسب الأولوية)
              </Typography>
              <Grid container spacing={2}>
                {suggestions.map((m, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={m.key}>
                    <Card
                      sx={{ position: 'relative', borderRadius: 2, border: '1px solid #e0e0e0' }}
                    >
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 13,
                          fontWeight: 700,
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <CardContent sx={{ pt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700}>
                          {m.name_ar}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {m.abbreviation} — {m.adminTime} دقيقة
                        </Typography>
                        <Button
                          size="small"
                          sx={{ mt: 1 }}
                          variant="outlined"
                          onClick={() => {
                            setTab(0);
                            handleSelectMeasure(m);
                          }}
                        >
                          ابدأ التقييم
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
