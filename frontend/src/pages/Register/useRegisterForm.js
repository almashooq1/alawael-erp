/**
 * useRegisterForm — Registration form state & logic
 *
 * Extracted from Register.js to keep the component slim.
 * Manages: form data, validation, step navigation, submission.
 */

import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { getPasswordStrength } from './registerConstants';

const useRegisterForm = () => {
  const navigate = useNavigate();
  const { register, error } = useAuth();
  const showSnackbar = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: '',
    nationalId: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const passwordStrength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password]
  );

  const handleChange = useCallback(
    field => e => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    },
    []
  );

  // ─── Validation per step ─────────────────────
  const validateStep = useCallback(
    step => {
      const errors = {};
      if (step === 0) {
        if (!formData.name || formData.name.trim().length < 2)
          errors.name = 'الاسم مطلوب (حرفين على الأقل)';
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          errors.email = 'البريد الإلكتروني غير صالح';
        if (formData.phone && !/^(05|5)\d{8}$/.test(formData.phone.replace(/\s/g, '')))
          errors.phone = 'رقم الجوال غير صالح (يبدأ بـ 05)';
      }
      if (step === 1) {
        if (!formData.password || formData.password.length < 6)
          errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        if (formData.password !== formData.confirmPassword)
          errors.confirmPassword = 'كلمتا المرور غير متطابقتين';
      }
      if (step === 2) {
        if (!formData.role) errors.role = 'يرجى اختيار نوع الحساب';
        if (!termsAccepted) errors.terms = 'يجب الموافقة على الشروط والأحكام';
      }
      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [formData, termsAccepted]
  );

  const handleNext = useCallback(() => {
    if (!validateStep(activeStep)) {
      showSnackbar('يرجى تصحيح الأخطاء قبل المتابعة', 'warning');
      return;
    }
    setActiveStep(p => p + 1);
  }, [activeStep, validateStep, showSnackbar]);

  const handleBack = useCallback(() => setActiveStep(p => p - 1), []);

  // ─── Submit ──────────────────────────────────
  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    try {
      setIsSubmitting(true);
      const { success } = await register(formData.name, formData.email, formData.password);
      if (success) {
        showSnackbar('تم التسجيل بنجاح! يتم توجيهك لصفحة الدخول...', 'success');
        setSubmitSuccess(true);
        setTimeout(() => {
          navigate('/login', { state: { message: 'تم التسجيل بنجاح! يرجى تسجيل الدخول.' } });
        }, 2500);
      }
    } catch (err) {
      logger.error('Registration error:', err);
      showSnackbar('حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
  };
};

export default useRegisterForm;
