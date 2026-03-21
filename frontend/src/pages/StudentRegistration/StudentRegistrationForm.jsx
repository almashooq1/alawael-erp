/**
 * Student Registration Form — نموذج تسجيل الطالب / المستفيد
 *
 * Orchestrator: state, navigation, validation, submission.
 * Steps are rendered by dedicated sub-components.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { gradients, surfaceColors } from 'theme/palette';
import studentManagementService from 'services/studentManagementService';

import { STEPS, INITIAL_FORM } from './studentRegistrationConfig';
import { validateStepFields, buildPayload } from './studentRegistrationUtils';
import { CustomStepIcon } from './StyledComponents';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  LinearProgress,
  Paper,
  Slide,
  Snackbar,
  Step,
  StepLabel,
  Stepper,
  Typography
} from '@mui/material';
import ArrowForward from '@mui/icons-material/ArrowForward';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Save from '@mui/icons-material/Save';

// Step sub-components

// ═══════════════════════════════════════════════════════
//  StudentRegistrationForm Component
// ═══════════════════════════════════════════════════════
const StudentRegistrationForm = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Helpers ───────────────────────────────────
  const handleChange = useCallback((field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
  }, []);

  const handleMultiSelect = useCallback((field, value) => {
    setFormData((prev) => {
      const current = prev[field] || [];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      };
    });
  }, []);

  // ─── Validation ────────────────────────────────
  const validateStep = useCallback((step) => {
    const errors = validateStepFields(step, formData);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(activeStep)) setActiveStep((p) => p + 1);
  }, [activeStep, validateStep]);

  const handleBack = useCallback(() => setActiveStep((p) => p - 1), []);

  // ─── Submit ─────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    try {
      setIsSubmitting(true);
      setSubmitError('');
      const payload = buildPayload(formData);
      await studentManagementService.createStudent(payload);
      setSubmitSuccess(true);
      setSnackbar({ open: true, message: 'تم تسجيل الطالب بنجاح!', severity: 'success' });
    } catch (err) {
      const serverError = err?.data?.error || err?.response?.data?.error;
      setSubmitError(serverError || err?.message || 'حدث خطأ أثناء التسجيل');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Age calculation ────────────────────────────
  const calculatedAge = useMemo(() => {
    if (!formData.dateOfBirth) return null;
    const birth = new Date(formData.dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() ||
      (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  }, [formData.dateOfBirth]);

  // ─── Success View ──────────────────────────────
  if (submitSuccess) {
    return (
      <RegistrationSuccess
        formData={formData}
        onReset={() => { setSubmitSuccess(false); setFormData(INITIAL_FORM); setActiveStep(0); }}
        onNavigate={navigate}
      />
    );
  }

  // ─── Step Renderers ────────────────────────────
  const stepRenderers = [
    () => <PersonalInfoStep formData={formData} fieldErrors={fieldErrors} handleChange={handleChange} calculatedAge={calculatedAge} />,
    () => <DisabilityStep formData={formData} fieldErrors={fieldErrors} handleChange={handleChange} />,
    () => <GuardianStep formData={formData} fieldErrors={fieldErrors} handleChange={handleChange} />,
    () => <ProgramsStep formData={formData} fieldErrors={fieldErrors} handleChange={handleChange} handleMultiSelect={handleMultiSelect} />,
    () => <MedicalStep formData={formData} handleChange={handleChange} setFormData={setFormData} />,
    () => <ReviewStep formData={formData} submitError={submitError} calculatedAge={calculatedAge} />,
  ];

  // ═══════════════════════════════════════════════════
  //  Main Render
  // ═══════════════════════════════════════════════════
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: surfaceColors.brandTint, pb: 6 }}>
      <GradientHeader>
        <Slide in direction="down" timeout={600}>
          <Box>
            <Avatar sx={{
              width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)',
              mx: 'auto', mb: 2, fontSize: 28,
            }}>
              📋
            </Avatar>
            <Typography variant="h5" fontWeight="bold" sx={{ mb: 0.5 }}>
              تسجيل طالب / مستفيد جديد
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              نظام الأوائل لإدارة مراكز التأهيل
            </Typography>
          </Box>
        </Slide>
      </GradientHeader>

      <Container maxWidth="md" sx={{ mt: -3, position: 'relative', zIndex: 2 }}>
        {/* Stepper */}
        <Paper elevation={0} sx={{
          borderRadius: 3, p: 2, mb: 3, bgcolor: 'white',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <Stepper activeStep={activeStep} alternativeLabel connector={<StyledStepConnector />}>
            {STEPS.map((label, idx) => (
              <Step key={label}>
                <StepLabel StepIconComponent={CustomStepIcon}>
                  <Typography variant="caption"
                    fontWeight={activeStep === idx ? 'bold' : 'normal'}
                    color={activeStep >= idx ? 'text.primary' : 'text.secondary'}
                    sx={{ display: { xs: 'none', sm: 'block' } }}>
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
          <LinearProgress variant="determinate" value={((activeStep + 1) / STEPS.length) * 100}
            sx={{
              mt: 2, height: 4, borderRadius: 2, bgcolor: surfaceColors.softGray,
              '& .MuiLinearProgress-bar': { background: gradients.primary, borderRadius: 2 },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            الخطوة {activeStep + 1} من {STEPS.length}
          </Typography>
        </Paper>

        {/* Form */}
        <Paper elevation={0} sx={{
          borderRadius: 3, p: { xs: 2.5, sm: 4 }, bgcolor: 'white',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          {stepRenderers[activeStep]()}

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button variant="outlined" onClick={handleBack} disabled={activeStep === 0}
              startIcon={<ArrowForward />}
              sx={{ borderRadius: 2, visibility: activeStep === 0 ? 'hidden' : 'visible' }}>
              السابق
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button variant="contained" onClick={handleNext} endIcon={<ArrowBack />}
                sx={{
                  borderRadius: 2, background: gradients.primary, px: 4, py: 1.2, fontWeight: 'bold',
                  '&:hover': { background: gradients.primary, filter: 'brightness(1.1)' },
                }}>
                التالي
              </Button>
            ) : (
              <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting}
                endIcon={isSubmitting ? null : <Save />}
                sx={{
                  borderRadius: 2, background: gradients.success, px: 4, py: 1.2,
                  fontWeight: 'bold', color: '#fff',
                  '&:hover': { background: gradients.success, filter: 'brightness(1.1)' },
                }}>
                {isSubmitting ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'تسجيل الطالب'}
              </Button>
            )}
          </Box>
        </Paper>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentRegistrationForm;
