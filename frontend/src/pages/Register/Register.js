/**
 * Register Page — صفحة التسجيل المحسّنة
 *
 * Multi-step registration orchestrator.
 * Sub-components: SuccessView, StepBasicInfo, StepPassword, StepRoleSelection
 * Logic extracted to useRegisterForm hook.
 */

import { Link } from 'react-router-dom';


import { gradients, brandColors, surfaceColors } from 'theme/palette';
import CustomStepIcon from './CustomStepIcon';
import { STEPS } from './registerConstants';
import useRegisterForm from './useRegisterForm';

// ═══════════════════════════════════════════════════
//  Register Component
// ═══════════════════════════════════════════════════
const Register = () => {
  const {
    activeStep,
    formData,
    setFormData,
    fieldErrors,
    setFieldErrors,
    isSubmitting,
    termsAccepted,
    setTermsAccepted,
    showPassword,
    setShowPassword,
    showConfirm,
    setShowConfirm,
    submitSuccess,
    passwordStrength,
    error,
    handleChange,
    handleNext,
    handleBack,
    handleSubmit,
  } = useRegisterForm();

  if (submitSuccess) return <SuccessView />;

  // ─── Step Content ────────────────────────────
  const renderStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <StepBasicInfo
            formData={formData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
          />
        );
      case 1:
        return (
          <StepPassword
            formData={formData}
            fieldErrors={fieldErrors}
            handleChange={handleChange}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirm={showConfirm}
            setShowConfirm={setShowConfirm}
            passwordStrength={passwordStrength}
          />
        );
      case 2:
        return (
          <StepRoleSelection
            formData={formData}
            setFormData={setFormData}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            termsAccepted={termsAccepted}
            setTermsAccepted={setTermsAccepted}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: surfaceColors.brandTint }}>
      {/* Gradient Header */}
      <GradientHeader>
        <Slide in direction="down" timeout={600}>
          <Box>
            <Avatar
              sx={{
                width: 72,
                height: 72,
                bgcolor: 'rgba(255,255,255,0.2)',
                mx: 'auto',
                mb: 2,
                backdropFilter: 'blur(8px)',
                fontSize: 32,
                fontWeight: 'bold',
              }}
            >
              🏫
            </Avatar>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 1 }}>
              نظام الأوائل
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              إنشاء حساب جديد للوصول إلى نظام إدارة مراكز التأهيل
            </Typography>
          </Box>
        </Slide>
      </GradientHeader>

      <Container maxWidth="sm" sx={{ mt: -4, mb: 6, position: 'relative', zIndex: 2 }}>
        {/* Stepper */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 2,
            mb: 3,
            bgcolor: 'white',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Stepper activeStep={activeStep} alternativeLabel connector={<StyledStepConnector />}>
            {STEPS.map((label, idx) => (
              <Step key={label}>
                <StepLabel StepIconComponent={CustomStepIcon}>
                  <Typography
                    variant="caption"
                    fontWeight={activeStep === idx ? 'bold' : 'normal'}
                    color={activeStep >= idx ? 'text.primary' : 'text.secondary'}
                  >
                    {label}
                  </Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
          <LinearProgress
            variant="determinate"
            value={((activeStep + 1) / STEPS.length) * 100}
            sx={{
              mt: 2,
              height: 4,
              borderRadius: 2,
              bgcolor: surfaceColors.softGray,
              '& .MuiLinearProgress-bar': { background: gradients.primary, borderRadius: 2 },
            }}
          />
        </Paper>

        {/* Form Card */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 3,
            p: 4,
            bgcolor: 'white',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {renderStep()}

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0}
              startIcon={<ArrowForward />}
              sx={{ borderRadius: 2, visibility: activeStep === 0 ? 'hidden' : 'visible' }}
            >
              السابق
            </Button>

            {activeStep < STEPS.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowBack />}
                sx={{
                  borderRadius: 2,
                  background: gradients.primary,
                  px: 4,
                  py: 1.2,
                  fontWeight: 'bold',
                  '&:hover': { background: gradients.primary, filter: 'brightness(1.1)' },
                }}
              >
                التالي
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting}
                endIcon={isSubmitting ? null : <CheckCircle />}
                sx={{
                  borderRadius: 2,
                  background: gradients.success,
                  px: 4,
                  py: 1.2,
                  fontWeight: 'bold',
                  color: 'white',
                  '&:hover': { background: gradients.success, filter: 'brightness(1.1)' },
                }}
              >
                {isSubmitting ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : (
                  'إنشاء الحساب'
                )}
              </Button>
            )}
          </Box>
        </Paper>

        {/* Login Link */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            لديك حساب بالفعل؟{' '}
            <MuiLink
              component={Link}
              to="/login"
              variant="body2"
              sx={{ textDecoration: 'none', fontWeight: 'bold', color: brandColors.primaryStart }}
            >
              تسجيل الدخول
            </MuiLink>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Register;
