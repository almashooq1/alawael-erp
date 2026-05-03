/**
 * ScaleAdministration — إدارة وتطبيق المقاييس التشخيصية
 * Scale Administration & Scoring — service-connected
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Slider,
  Divider,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Select,
  MenuItem,
  InputLabel,
  LinearProgress,
  Card,
  CardContent,
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import { useParams, useNavigate } from 'react-router-dom';
import { specializedScalesService } from '../../services/specializedRehab.service';

/* ── Fallback scale catalog ── */
const DATA_SCALES_BRIEF = [
  { _id: 's1', nameAr: 'مقياس الاستقلالية الوظيفية (FIM)', category: 'وظيفي' },
  { _id: 's3', nameAr: 'مؤشر بارثل', category: 'أنشطة يومية' },
  { _id: 's6', nameAr: 'مقياس بيرغ للتوازن', category: 'توازن' },
  { _id: 's17', nameAr: 'مقياس الألم العددي (NRS)', category: 'ألم' },
  { _id: 's12', nameAr: 'اختبار الحالة العقلية المصغّر (MMSE)', category: 'إدراكي' },
  { _id: 's4', nameAr: 'جدول تقييم الإعاقة (WHODAS 2.0)', category: 'إعاقة' },
];

const NRS_ITEMS = [
  {
    id: 'nrs1',
    text: 'كيف تصف مستوى الألم لديك الآن؟ (0 = لا ألم، 10 = ألم شديد جداً)',
    type: 'slider',
    min: 0,
    max: 10,
  },
];

const STEPS = ['اختيار المقياس', 'بيانات المستفيد', 'تطبيق المقياس', 'النتائج'];

export default function ScaleAdministration() {
  const theme = useTheme();
  const { scaleId } = useParams();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(scaleId ? 1 : 0);
  const [scalesList, setScalesList] = useState(DATA_SCALES_BRIEF);
  const [selectedScaleId, setSelectedScaleId] = useState(scaleId || '');
  const [scaleDetail, setScaleDetail] = useState(null);
  const [loadingScale, setLoadingScale] = useState(false);
  const [scaleError, setScaleError] = useState(null);

  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    specializedScalesService
      .getAll({ limit: 100 })
      .then(res => {
        const d = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(d) && d.length > 0) setScalesList(d);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, []);

  const loadScaleDetail = useCallback(async id => {
    if (!id) return;
    setLoadingScale(true);
    setScaleError(null);
    setScaleDetail(null);
    try {
      const res = await specializedScalesService.getById(id);
      setScaleDetail(res?.data?.data ?? res?.data ?? null);
    } catch {
      setScaleError('تعذّر تحميل تفاصيل المقياس — سيتم تطبيق مقياس NRS كبديل');
      setScaleDetail({ _id: id, nameAr: 'مقياس نظامي', items: NRS_ITEMS });
    } finally {
      setLoadingScale(false);
    }
  }, []);

  useEffect(() => {
    if (selectedScaleId && activeStep >= 1) loadScaleDetail(selectedScaleId);
  }, [selectedScaleId, activeStep, loadScaleDetail]);

  const computeTotal = () =>
    Object.values(answers)
      .map(v => Number(v) || 0)
      .reduce((s, v) => s + v, 0);

  const maxPossible = () =>
    (scaleDetail?.items ?? NRS_ITEMS).reduce((s, item) => s + (item.max ?? 10), 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const payload = {
      scaleId: selectedScaleId,
      beneficiaryId: beneficiaryId || undefined,
      beneficiaryName: beneficiaryName || undefined,
      totalScore: computeTotal(),
      maxScore: maxPossible(),
      answers,
      notes,
      administeredAt: new Date().toISOString(),
    };
    try {
      const res = await specializedScalesService.recordResult(payload);
      setSubmitResult(res?.data?.data ?? res?.data ?? payload);
      setActiveStep(3);
    } catch {
      setSubmitError('تعذّر حفظ النتيجة — يُرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const items = scaleDetail?.items ?? NRS_ITEMS;
  const allAnswered = items.length > 0 && items.every(item => answers[item.id] !== undefined);

  const handleNext = () => {
    if (activeStep === 2) {
      handleSubmit();
      return;
    }
    setActiveStep(p => Math.min(p + 1, STEPS.length - 1));
  };
  const handleBack = () => setActiveStep(p => Math.max(p - 1, 0));

  const selectedScaleName =
    scalesList.find(s => (s._id || s.id) === selectedScaleId)?.nameAr ||
    scaleDetail?.nameAr ||
    'المقياس المحدد';

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          borderRadius: 3,
          p: 3,
          mb: 4,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 52, height: 52 }}>
          <AssignmentIcon sx={{ fontSize: 30, color: 'white' }} />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تطبيق المقياس التشخيصي
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {activeStep > 0 && selectedScaleName ? selectedScaleName : 'اختر المقياس للبدء'}
          </Typography>
        </Box>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper
        elevation={0}
        sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
      >
        {/* Step 0: Choose Scale */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              اختر المقياس المراد تطبيقه
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <FormControl fullWidth>
              <InputLabel>المقياس</InputLabel>
              <Select
                value={selectedScaleId}
                label="المقياس"
                onChange={e => setSelectedScaleId(e.target.value)}
              >
                {scalesList.map(s => (
                  <MenuItem key={s._id || s.id} value={s._id || s.id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {s.nameAr || s.nameEn || s.name}
                      </Typography>
                      {s.category && (
                        <Typography variant="caption" color="text.secondary">
                          {s.category}
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {selectedScaleId && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                تم اختيار: <strong>{selectedScaleName}</strong>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 1: Beneficiary Data */}
        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              بيانات المستفيد
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="رقم المستفيد / المعرّف"
                  value={beneficiaryId}
                  onChange={e => setBeneficiaryId(e.target.value)}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
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
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="ملاحظات (اختياري)"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </Grid>
            </Grid>
            {loadingScale && <LinearProgress sx={{ mt: 2 }} />}
            {scaleError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {scaleError}
              </Alert>
            )}
            <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
              المقياس المختار: <strong>{selectedScaleName}</strong>
              {scaleDetail?.items && ` — ${scaleDetail.items.length} بند`}
            </Alert>
          </Box>
        )}

        {/* Step 2: Apply Scale */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              تطبيق: {selectedScaleName}
            </Typography>
            <Divider sx={{ mb: 3 }} />
            {loadingScale ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {items.map((item, idx) => (
                  <Paper
                    key={item.id || idx}
                    elevation={0}
                    sx={{
                      p: 2.5,
                      mb: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      ...(answers[item.id] !== undefined
                        ? {
                            borderColor: 'primary.main',
                            bgcolor: alpha(theme.palette.primary.main, 0.04),
                          }
                        : {}),
                    }}
                  >
                    <Typography variant="body1" fontWeight={500} mb={1.5}>
                      {idx + 1}. {item.text || item.textAr || item.question}
                    </Typography>
                    {item.type === 'slider' ? (
                      <Box px={2}>
                        <Slider
                          value={answers[item.id] ?? item.min ?? 0}
                          onChange={(_, v) => setAnswers(a => ({ ...a, [item.id]: v }))}
                          min={item.min ?? 0}
                          max={item.max ?? 10}
                          step={item.step ?? 1}
                          marks
                          valueLabelDisplay="on"
                          sx={{ mt: 3 }}
                        />
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            {item.minLabel || '0'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.maxLabel || String(item.max ?? 10)}
                          </Typography>
                        </Box>
                      </Box>
                    ) : item.options ? (
                      <FormControl>
                        <RadioGroup
                          value={answers[item.id] ?? ''}
                          onChange={e =>
                            setAnswers(a => ({ ...a, [item.id]: Number(e.target.value) }))
                          }
                        >
                          {item.options.map(opt => (
                            <FormControlLabel
                              key={opt.value}
                              value={opt.value}
                              control={<Radio />}
                              label={`${opt.label} (${opt.value} نقطة)`}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    ) : (
                      <TextField
                        size="small"
                        type="number"
                        label="القيمة"
                        inputProps={{ min: item.min ?? 0, max: item.max ?? 10 }}
                        value={answers[item.id] ?? ''}
                        onChange={e =>
                          setAnswers(a => ({ ...a, [item.id]: Number(e.target.value) }))
                        }
                      />
                    )}
                  </Paper>
                ))}
                {submitError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {submitError}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Step 3: Results */}
        {activeStep === 3 && (
          <Box textAlign="center">
            <CheckCircleIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2, textAlign: 'right' }}>
              تم تسجيل نتيجة المقياس بنجاح
            </Alert>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Card
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  <CardContent>
                    <Typography variant="h3" fontWeight={700} color="primary.main">
                      {submitResult?.totalScore ?? computeTotal()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      النتيجة الإجمالية
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6}>
                <Card
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
                >
                  <CardContent>
                    <Typography variant="h3" fontWeight={700} color="text.secondary">
                      {submitResult?.maxScore ?? maxPossible()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      الحد الأقصى
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
            <LinearProgress
              variant="determinate"
              value={Math.round(
                ((submitResult?.totalScore ?? computeTotal()) /
                  ((submitResult?.maxScore ?? maxPossible()) || 1)) *
                  100
              )}
              sx={{ height: 12, borderRadius: 6, mb: 2 }}
            />
            <Box display="flex" justifyContent="center" gap={1} flexWrap="wrap" mb={3}>
              <Chip label={`المقياس: ${selectedScaleName}`} color="primary" />
              {beneficiaryId && <Chip label={`المستفيد: ${beneficiaryId}`} variant="outlined" />}
            </Box>
            <Box display="flex" gap={2} justifyContent="center">
              <Button
                variant="outlined"
                onClick={() => {
                  setActiveStep(0);
                  setAnswers({});
                  setSelectedScaleId('');
                  setSubmitResult(null);
                }}
              >
                تطبيق مقياس آخر
              </Button>
              <Button variant="contained" onClick={() => navigate(-1)}>
                العودة
              </Button>
            </Box>
          </Box>
        )}

        {/* Navigation */}
        {activeStep < 3 && (
          <Box display="flex" justifyContent="space-between" mt={4}>
            <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined">
              السابق
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !selectedScaleId) ||
                (activeStep === 2 && (!allAnswered || submitting || loadingScale))
              }
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {activeStep === 2 ? 'احتساب النتيجة وحفظها' : 'التالي'}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
