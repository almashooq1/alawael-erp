/**
 * 📝 تطبيق المقاييس المتخصصة — Scale Administration
 * AlAwael ERP — Administer a specialized scale, record results, view history
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Paper,
  useTheme,
  alpha,
} from '@mui/material';


import {
  SPECIALIZED_SCALES_CATALOG,
  SCALE_CATEGORY_LABELS,
  specializedScalesService,
} from 'services/specializedRehab.service';
import { useSnackbar } from 'contexts/SnackbarContext';

const SEVERITY_COLORS = {
  normal: '#4CAF50',
  above_average: '#2196F3',
  mild: '#8BC34A',
  at_risk: '#FFC107',
  moderate: '#FF9800',
  severe: '#F44336',
  profound: '#9C27B0',
};

export default function ScaleAdministration() {
  const theme = useTheme();
  const g = theme.palette.gradients || {};
  const { showSnackbar } = useSnackbar();

  /* ── state ── */
  const [tab, setTab] = useState(0); // 0=administer, 1=history
  const [selectedScale, setSelectedScale] = useState(null);
  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [activeStep, setActiveStep] = useState(0); // 0=select scale, 1=fill domains, 2=review
  const [domainScores, setDomainScores] = useState({});
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [saving, setSaving] = useState(false);

  // History tab state
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [_searchBeneficiary, _setSearchBeneficiary] = useState('');
  const [_resultDetail, setResultDetail] = useState(null);

  /* ── computed ── */
  const totalScore = useMemo(() => {
    if (!selectedScale) return 0;
    return selectedScale.domains.reduce((sum, d) => sum + (domainScores[d.key] || 0), 0);
  }, [selectedScale, domainScores]);

  const totalPercentage = useMemo(() => {
    if (!selectedScale || !selectedScale.totalMaxScore) return 0;
    return Math.round((totalScore / selectedScale.totalMaxScore) * 100);
  }, [totalScore, selectedScale]);

  const currentInterpretation = useMemo(() => {
    if (!selectedScale) return null;
    return selectedScale.interpretation.find(i => totalScore >= i.min && totalScore <= i.max);
  }, [selectedScale, totalScore]);

  /* ── scale selection ── */
  const handleSelectScale = useCallback(scale => {
    setSelectedScale(scale);
    const initial = {};
    scale.domains.forEach(d => {
      initial[d.key] = 0;
    });
    setDomainScores(initial);
    setActiveStep(1);
  }, []);

  /* ── save result ── */
  const handleSave = useCallback(async () => {
    if (!selectedScale || !beneficiaryId) {
      showSnackbar('يرجى اختيار المقياس وتحديد المستفيد', 'warning');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        scaleCode: selectedScale.scaleCode,
        beneficiary: beneficiaryId,
        domainScores: selectedScale.domains.map(d => ({
          domainKey: d.key,
          rawScore: domainScores[d.key] || 0,
          maxScore: d.maxScore,
          percentage: Math.round(((domainScores[d.key] || 0) / d.maxScore) * 100),
        })),
        totalRawScore: totalScore,
        totalPercentage,
        interpretationLevel: currentInterpretation?.levelKey || '',
        clinicalNotes,
        recommendations: recommendations.split('\n').filter(r => r.trim()),
      };
      await specializedScalesService.recordResult(payload);
      showSnackbar('تم حفظ نتيجة التقييم بنجاح', 'success');
      // Reset
      setActiveStep(0);
      setSelectedScale(null);
      setDomainScores({});
      setClinicalNotes('');
      setRecommendations('');
    } catch (err) {
      showSnackbar('خطأ في حفظ النتيجة: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSaving(false);
    }
  }, [
    selectedScale,
    beneficiaryId,
    domainScores,
    totalScore,
    totalPercentage,
    currentInterpretation,
    clinicalNotes,
    recommendations,
    showSnackbar,
  ]);

  /* ── load history ── */
  const loadResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const res = await specializedScalesService.getResults({ limit: 50 });
      setResults(res.data?.results || res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 1 && results.length === 0) loadResults();
  }, [tab, results.length, loadResults]);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: g.ocean || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: alpha('#fff', 0.2) }}>
            <AssessmentIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              تطبيق المقاييس المتخصصة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              تطبيق مقاييس التقييم وتسجيل النتائج ومتابعة التاريخ
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<AssessmentIcon />} label="تطبيق مقياس جديد" />
          <Tab icon={<HistoryIcon />} label="سجل النتائج" />
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0: Administer ═══════ */}
      {tab === 0 && (
        <Box>
          {/* Stepper */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              <Step>
                <StepLabel>اختيار المقياس</StepLabel>
              </Step>
              <Step>
                <StepLabel>تسجيل الدرجات</StepLabel>
              </Step>
              <Step>
                <StepLabel>المراجعة والحفظ</StepLabel>
              </Step>
            </Stepper>
          </Paper>

          {/* Step 0: Select scale */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" fontWeight={700} mb={2}>
                اختر المقياس المراد تطبيقه
              </Typography>
              <Grid container spacing={2}>
                {SPECIALIZED_SCALES_CATALOG.map(scale => {
                  const cat = SCALE_CATEGORY_LABELS[scale.category] || {};
                  return (
                    <Grid item xs={12} sm={6} md={4} key={scale.scaleCode}>
                      <Card
                        sx={{
                          cursor: 'pointer',
                          borderRadius: 2,
                          transition: 'all .2s',
                          borderRight: `4px solid ${cat.color || '#666'}`,
                          '&:hover': {
                            bgcolor: alpha(cat.color || '#666', 0.05),
                            transform: 'translateY(-2px)',
                          },
                        }}
                        onClick={() => handleSelectScale(scale)}
                      >
                        <CardContent>
                          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                            <Chip
                              label={scale.abbreviation}
                              size="small"
                              sx={{ fontWeight: 700 }}
                            />
                            <Chip
                              label={`${scale.administrationTime} د`}
                              size="small"
                              variant="outlined"
                              icon={<TimerIcon />}
                            />
                          </Stack>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {scale.nameAr}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {scale.ageRange?.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* Step 1: Fill domain scores */}
          {activeStep === 1 && selectedScale && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    {selectedScale.nameAr}
                    <Chip
                      label={selectedScale.abbreviation}
                      size="small"
                      sx={{ mr: 1, fontWeight: 700 }}
                    />
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    سجل درجة كل مجال — الحد الأقصى: {selectedScale.totalMaxScore}
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<BackIcon />}
                  onClick={() => {
                    setActiveStep(0);
                    setSelectedScale(null);
                  }}
                >
                  رجوع
                </Button>
              </Stack>

              {/* Beneficiary */}
              <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="معرف المستفيد"
                      value={beneficiaryId}
                      onChange={e => setBeneficiaryId(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="اسم المستفيد (اختياري)"
                      value={beneficiaryName}
                      onChange={e => setBeneficiaryName(e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Paper>

              {/* Domain Scores */}
              <Grid container spacing={2} mb={2}>
                {selectedScale.domains.map(domain => {
                  const score = domainScores[domain.key] || 0;
                  const pct = Math.round((score / domain.maxScore) * 100);
                  return (
                    <Grid item xs={12} sm={6} key={domain.key}>
                      <Paper sx={{ p: 2, borderRadius: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} mb={1}>
                          {domain.nameAr}
                          {domain.nameEn && (
                            <Typography
                              component="span"
                              variant="caption"
                              color="text.secondary"
                              sx={{ mr: 1 }}
                            >
                              ({domain.nameEn})
                            </Typography>
                          )}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Slider
                            value={score}
                            onChange={(_, v) =>
                              setDomainScores(prev => ({ ...prev, [domain.key]: v }))
                            }
                            min={0}
                            max={domain.maxScore}
                            step={1}
                            valueLabelDisplay="on"
                            sx={{ flexGrow: 1 }}
                          />
                          <TextField
                            type="number"
                            size="small"
                            value={score}
                            onChange={e => {
                              const v = Math.max(
                                0,
                                Math.min(domain.maxScore, Number(e.target.value) || 0)
                              );
                              setDomainScores(prev => ({ ...prev, [domain.key]: v }));
                            }}
                            sx={{ width: 80 }}
                            inputProps={{ min: 0, max: domain.maxScore }}
                          />
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            mt: 1,
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {score} / {domain.maxScore} ({pct}%)
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Live Interpretation */}
              {currentInterpretation && (
                <Alert
                  severity={
                    currentInterpretation.severity === 'normal' ||
                    currentInterpretation.severity === 'above_average'
                      ? 'success'
                      : currentInterpretation.severity === 'mild' ||
                          currentInterpretation.severity === 'at_risk'
                        ? 'warning'
                        : 'error'
                  }
                  sx={{ mb: 2, borderRadius: 2 }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    التفسير الحالي: {currentInterpretation.labelAr}
                  </Typography>
                  <Typography variant="body2">
                    المجموع: {totalScore} / {selectedScale.totalMaxScore} ({totalPercentage}%)
                  </Typography>
                </Alert>
              )}

              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  endIcon={<ForwardIcon />}
                  onClick={() => setActiveStep(2)}
                  disabled={!beneficiaryId}
                >
                  المراجعة والحفظ
                </Button>
              </Stack>
            </Box>
          )}

          {/* Step 2: Review & Save */}
          {activeStep === 2 && selectedScale && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  مراجعة النتائج
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<BackIcon />}
                  onClick={() => setActiveStep(1)}
                >
                  رجوع
                </Button>
              </Stack>

              {/* Summary */}
              <Paper sx={{ p: 3, mb: 2, borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      المقياس
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedScale.nameAr}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      المستفيد
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {beneficiaryName || beneficiaryId}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      المجموع
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight={700}
                      color={SEVERITY_COLORS[currentInterpretation?.severity] || 'inherit'}
                    >
                      {totalScore} / {selectedScale.totalMaxScore}
                    </Typography>
                    <Chip
                      label={currentInterpretation?.labelAr || '—'}
                      size="small"
                      sx={{
                        bgcolor: alpha(
                          SEVERITY_COLORS[currentInterpretation?.severity] || '#999',
                          0.15
                        ),
                        color: SEVERITY_COLORS[currentInterpretation?.severity] || '#999',
                        fontWeight: 700,
                      }}
                    />
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                {/* Domain breakdown */}
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>المجال</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          الدرجة
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          الحد الأقصى
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          النسبة
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedScale.domains.map(d => {
                        const s = domainScores[d.key] || 0;
                        const p = Math.round((s / d.maxScore) * 100);
                        return (
                          <TableRow key={d.key}>
                            <TableCell>{d.nameAr}</TableCell>
                            <TableCell align="center">{s}</TableCell>
                            <TableCell align="center">{d.maxScore}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${p}%`}
                                size="small"
                                color={p >= 80 ? 'success' : p >= 50 ? 'warning' : 'error'}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Clinical notes & recommendations */}
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="الملاحظات السريرية"
                    value={clinicalNotes}
                    onChange={e => setClinicalNotes(e.target.value)}
                    placeholder="أدخل ملاحظاتك السريرية..."
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="التوصيات (سطر لكل توصية)"
                    value={recommendations}
                    onChange={e => setRecommendations(e.target.value)}
                    placeholder="أدخل توصياتك..."
                  />
                </Grid>
              </Grid>

              <Stack direction="row" justifyContent="flex-end" spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ النتيجة'}
                </Button>
              </Stack>
            </Box>
          )}
        </Box>
      )}

      {/* ═══════ TAB 1: History ═══════ */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              سجل نتائج التقييم
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadResults}
              disabled={loadingResults}
            >
              تحديث
            </Button>
          </Stack>

          {loadingResults ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>جارٍ التحميل...</Typography>
            </Box>
          ) : results.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <HistoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد نتائج مسجلة بعد
              </Typography>
              <Typography color="text.secondary">ابدأ بتطبيق المقاييس لتظهر النتائج هنا</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المقياس</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المستفيد</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      الدرجة
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>
                      النسبة
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التفسير</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((r, i) => (
                    <TableRow
                      key={r._id || i}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => setResultDetail(r)}
                    >
                      <TableCell>
                        {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip label={r.scaleCode || r.scale?.scaleCode || '—'} size="small" />
                      </TableCell>
                      <TableCell>
                        {r.beneficiary?.nameAr || r.beneficiary?.name || r.beneficiary || '—'}
                      </TableCell>
                      <TableCell align="center">{r.totalRawScore || '—'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${r.totalPercentage || 0}%`}
                          size="small"
                          color={
                            r.totalPercentage >= 80
                              ? 'success'
                              : r.totalPercentage >= 50
                                ? 'warning'
                                : 'error'
                          }
                        />
                      </TableCell>
                      <TableCell>{r.interpretationLevel || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            r.status === 'approved'
                              ? 'معتمد'
                              : r.status === 'reviewed'
                                ? 'مراجع'
                                : r.status === 'completed'
                                  ? 'مكتمل'
                                  : 'مسودة'
                          }
                          size="small"
                          variant="outlined"
                          color={
                            r.status === 'approved'
                              ? 'success'
                              : r.status === 'completed'
                                ? 'info'
                                : 'default'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
}
