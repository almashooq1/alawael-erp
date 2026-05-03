/**
 * ProgramEnrollment — تسجيل المستفيدين في البرامج التأهيلية
 * Program Enrollment Management — service-connected
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
  TextField,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Avatar,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useParams, useNavigate } from 'react-router-dom';
import {
  rehabProgramTemplatesService,
  REHAB_PROGRAM_TEMPLATES_CATALOG,
  PROGRAM_CATEGORY_LABELS,
} from '../../services/specializedRehab.service';

const STEPS = ['اختيار البرنامج', 'بيانات المستفيد', 'الجدول الزمني', 'التأكيد والحفظ'];

const SESSIONS_OPTS = [
  { value: 2, label: 'مرتان أسبوعياً' },
  { value: 3, label: '3 مرات أسبوعياً' },
  { value: 5, label: '5 مرات أسبوعياً' },
];

export default function ProgramEnrollment() {
  const theme = useTheme();
  const { programId } = useParams();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(programId ? 1 : 0);
  const [programsList, setProgramsList] = useState(REHAB_PROGRAM_TEMPLATES_CATALOG ?? []);
  const [selectedId, setSelectedId] = useState(programId || '');
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  const [beneficiaryId, setBeneficiaryId] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [therapistName, setTherapistName] = useState('');
  const [branch, setBranch] = useState('');

  const [startDate, setStartDate] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  useEffect(() => {
    rehabProgramTemplatesService
      .getAll({ limit: 100 })
      .then(res => {
        const d = res?.data?.data ?? res?.data ?? [];
        if (Array.isArray(d) && d.length > 0) setProgramsList(d);
      })
      .catch(() => {})
      .finally(() => setLoadingPrograms(false));
  }, []);

  const selectedProgram = useCallback(
    () => programsList.find(p => (p._id || p.programCode) === selectedId),
    [programsList, selectedId]
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    const prog = selectedProgram();
    const payload = {
      programTemplateId: selectedId,
      beneficiaryId: beneficiaryId || undefined,
      beneficiaryName: beneficiaryName || undefined,
      therapistName: therapistName || undefined,
      branch: branch || undefined,
      startDate: startDate || undefined,
      sessionsPerWeek,
      notes: notes || undefined,
      status: 'active',
    };
    try {
      const res = await rehabProgramTemplatesService.enroll(payload);
      setEnrollmentResult({
        ...payload,
        ...(res?.data?.data ?? res?.data ?? {}),
        programName: prog?.nameAr,
      });
      setActiveStep(4);
    } catch {
      setSubmitError('تعذّر حفظ التسجيل — يُرجى المحاولة مرة أخرى');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 3) {
      handleSubmit();
      return;
    }
    setActiveStep(p => Math.min(p + 1, 3));
  };
  const handleBack = () => setActiveStep(p => Math.max(p - 1, 0));

  const prog = selectedProgram();

  /* ── Success screen ── */
  if (activeStep === 4 && enrollmentResult) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2, textAlign: 'right' }}>
          تم تسجيل المستفيد في البرنامج بنجاح
        </Alert>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'البرنامج', value: enrollmentResult.programName },
            {
              label: 'المستفيد',
              value: enrollmentResult.beneficiaryName || enrollmentResult.beneficiaryId || '—',
            },
            { label: 'تاريخ البدء', value: enrollmentResult.startDate || '—' },
            { label: 'الجلسات أسبوعياً', value: `${enrollmentResult.sessionsPerWeek} جلسات` },
          ].map((item, i) => (
            <Grid item xs={6} key={i}>
              <Card
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}
              >
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {item.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Box display="flex" gap={2} justifyContent="center">
          <Button
            variant="outlined"
            onClick={() => {
              setActiveStep(0);
              setSelectedId('');
              setEnrollmentResult(null);
              setBeneficiaryId('');
              setBeneficiaryName('');
              setStartDate('');
            }}
          >
            تسجيل مستفيد آخر
          </Button>
          <Button variant="contained" onClick={() => navigate(-1)}>
            العودة للمكتبة
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
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
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 52, height: 52 }}>
          <HowToRegIcon sx={{ fontSize: 30, color: 'white' }} />
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            تسجيل في برنامج تأهيلي
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {prog ? prog.nameAr : 'اختر البرنامج للبدء'}
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
        {/* Step 0: Choose program */}
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              اختر البرنامج التأهيلي
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loadingPrograms ? (
              <LinearProgress sx={{ my: 2 }} />
            ) : (
              <FormControl fullWidth>
                <InputLabel>البرنامج</InputLabel>
                <Select
                  value={selectedId}
                  label="البرنامج"
                  onChange={e => setSelectedId(e.target.value)}
                >
                  {programsList.map(p => (
                    <MenuItem key={p._id || p.programCode} value={p._id || p.programCode}>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {p.nameAr || p.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {PROGRAM_CATEGORY_LABELS?.[p.category] ?? p.category}
                          {p.totalDurationWeeks ? ` · ${p.totalDurationWeeks} أسبوع` : ''}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {prog && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                <strong>{prog.nameAr}</strong>
                {prog.description && (
                  <>
                    <br />
                    <Typography variant="caption">{prog.description}</Typography>
                  </>
                )}
                <Box display="flex" gap={1} mt={1} flexWrap="wrap">
                  {prog.totalDurationWeeks && (
                    <Chip size="small" label={`${prog.totalDurationWeeks} أسبوع`} />
                  )}
                  {prog.sessionsPerWeek && (
                    <Chip size="small" label={`${prog.sessionsPerWeek} جلسات/أسبوع`} />
                  )}
                  {prog.targetAgeRange?.label && (
                    <Chip size="small" label={prog.targetAgeRange.label} color="info" />
                  )}
                </Box>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 1: Beneficiary data */}
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
                  label="رقم ملف المستفيد"
                  placeholder="BEN-2026-XXXXX"
                  value={beneficiaryId}
                  onChange={e => setBeneficiaryId(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="اسم المستفيد"
                  value={beneficiaryName}
                  onChange={e => setBeneficiaryName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="المعالج المسؤول"
                  value={therapistName}
                  onChange={e => setTherapistName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="الفرع"
                  value={branch}
                  onChange={e => setBranch(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Step 2: Schedule */}
        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              الجدول الزمني
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="تاريخ البدء"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>عدد الجلسات أسبوعياً</InputLabel>
                  <Select
                    value={sessionsPerWeek}
                    label="عدد الجلسات أسبوعياً"
                    onChange={e => setSessionsPerWeek(e.target.value)}
                  >
                    {SESSIONS_OPTS.map(o => (
                      <MenuItem key={o.value} value={o.value}>
                        {o.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
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
            {prog?.totalDurationWeeks && startDate && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                التاريخ المتوقع للانتهاء:{' '}
                <strong>
                  {new Date(
                    new Date(startDate).getTime() + prog.totalDurationWeeks * 7 * 86400000
                  ).toLocaleDateString('ar-SA')}
                </strong>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 3: Confirm */}
        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom fontWeight={600}>
              تأكيد التسجيل
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              يُرجى مراجعة البيانات قبل تأكيد التسجيل
            </Alert>
            <Grid container spacing={1.5}>
              {[
                { label: 'البرنامج', value: prog?.nameAr || selectedId },
                { label: 'رقم المستفيد', value: beneficiaryId || '—' },
                { label: 'اسم المستفيد', value: beneficiaryName || '—' },
                { label: 'المعالج', value: therapistName || '—' },
                { label: 'الفرع', value: branch || '—' },
                { label: 'تاريخ البدء', value: startDate || '—' },
                { label: 'الجلسات/أسبوع', value: `${sessionsPerWeek} جلسات` },
              ].map((item, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {item.value}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {submitError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {submitError}
              </Alert>
            )}
          </Box>
        )}

        {/* Nav */}
        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button onClick={handleBack} disabled={activeStep === 0} variant="outlined">
            السابق
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={(activeStep === 0 && !selectedId) || submitting}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {activeStep === 3 ? 'حفظ التسجيل' : 'التالي'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
