/**
 * Login Page with OTP - صفحة تسجيل الدخول مع رمز التحقق
 * نظام تسجيل الدخول عن طريق البريد الإلكتروني أو الواتساب أو الرسائل النصية
 * الإصدار 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { setToken, setRefreshToken } from '../utils/tokenStorage';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
  Link,
  Divider,
  Alert,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Login as LoginIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  ArrowBack as ArrowBackIcon,
  WhatsApp as WhatsAppIcon,
  Sms as SmsIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// API Base URL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';

// Login Page Component
const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Steps
  const _steps = ['اختيار طريقة الدخول', 'إدخال المعرف', 'رمز التحقق', 'تم الدخول'];
  const [_activeStep, setActiveStep] = useState(0);

  // State
  const [loginMethod, setLoginMethod] = useState('password'); // password, otp
  const [otpMethod, setOtpMethod] = useState('email'); // email, sms, whatsapp
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    identifier: '', // البريد أو الجوال
    password: '',
    otp: '',
  });

  // OTP Input refs
  const otpRefs = [0, 1, 2, 3, 4, 5].map(() => React.createRef());

  // Centers for selection
  const centers = [
    { id: 'CTR-001', name: 'مركز التأهيل الشامل - الرياض' },
    { id: 'CTR-002', name: 'مركز التأهيل الشامل - جدة' },
    { id: 'CTR-003', name: 'مركز التأهيل الشامل - الدمام' },
  ];
  const [selectedCenter, setSelectedCenter] = useState(centers[0].id);

  // Timer for resend
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Handle input change
  const handleChange = field => e => {
    setFormData({ ...formData, [field]: e.target.value });
    setError('');
  };

  // Handle OTP input change
  const handleOtpChange = index => e => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 1) {
      const newOtp = formData.otp.split('');
      newOtp[index] = value;
      setFormData({ ...formData, otp: newOtp.join('') });

      // Auto focus next input
      if (value && index < 5) {
        otpRefs[index + 1].current?.focus();
      }
    }
    setError('');
  };

  // Handle OTP key down
  const handleOtpKeyDown = index => e => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  // Handle login method change
  const handleLoginMethodChange = method => {
    setLoginMethod(method);
    setFormData({ identifier: '', password: '', otp: '' });
    setError('');
    setActiveStep(method === 'otp' ? 1 : 0);
  };

  // Handle OTP method change
  const handleOtpMethodChange = method => {
    setOtpMethod(method);
    setOtpSent(false);
    setFormData({ ...formData, otp: '' });
    setError('');
  };

  // Send OTP
  const sendOTP = async () => {
    setLoading(true);
    setError('');

    // Validation
    if (!formData.identifier) {
      setError('يرجى إدخال البريد الإلكتروني أو رقم الجوال');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/otp/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier,
          method:
            otpMethod === 'email' && !formData.identifier.includes('@')
              ? 'sms'
              : otpMethod === 'email' && formData.identifier.includes('@')
                ? 'email'
                : otpMethod,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpSent(true);
        setResendTimer(60);
        setActiveStep(2);
        setSuccess(data.message);
      } else {
        setError(data.message || 'فشل إرسال رمز التحقق');
      }
    } catch (err) {
      setError('حدث خطأ أثناء إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    setLoading(true);
    setError('');

    if (formData.otp.length !== 6) {
      setError('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/otp/login/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: formData.identifier,
          otp: formData.otp,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOtpVerified(true);
        setActiveStep(3);
        setSuccess('تم تسجيل الدخول بنجاح!');

        // Save token
        setToken(data.data.token);
        setRefreshToken(data.data.refreshToken);

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('savedIdentifier', formData.identifier);
        }

        // Redirect after delay
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setError(data.message || 'رمز التحقق غير صحيح');
      }
    } catch (err) {
      setError('حدث خطأ أثناء التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  // Traditional login with password
  const handlePasswordLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.identifier || !formData.password) {
      setError('يرجى إدخال اسم المستخدم/الجوال وكلمة المرور');
      setLoading(false);
      return;
    }

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess('تم تسجيل الدخول بنجاح! جاري التحويل...');

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedUsername', formData.identifier);
      }

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async () => {
    if (resendTimer > 0) return;
    await sendOTP();
  };

  // Load saved credentials
  useEffect(() => {
    const saved = localStorage.getItem('rememberMe');
    if (saved === 'true') {
      const savedUsername =
        localStorage.getItem('savedUsername') || localStorage.getItem('savedIdentifier');
      if (savedUsername) {
        setFormData(prev => ({ ...prev, identifier: savedUsername }));
        setRememberMe(true);
      }
    }
  }, []);

  // Render OTP Method Button
  const renderOtpMethodButton = (method, icon, label) => (
    <Chip
      icon={icon}
      label={label}
      onClick={() => handleOtpMethodChange(method)}
      color={otpMethod === method ? 'primary' : 'default'}
      variant={otpMethod === method ? 'filled' : 'outlined'}
      sx={{ m: 0.5 }}
    />
  );

  // Render OTP Input
  const renderOtpInputs = () => (
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', my: 3, direction: 'ltr' }}>
      {[0, 1, 2, 3, 4, 5].map(index => (
        <TextField
          key={index}
          inputRef={otpRefs[index]}
          value={formData.otp[index] || ''}
          onChange={handleOtpChange(index)}
          onKeyDown={handleOtpKeyDown(index)}
          inputProps={{
            maxLength: 1,
            style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' },
          }}
          sx={{
            width: 50,
            height: 60,
            '& .MuiOutlinedInput-root': {
              height: 60,
            },
          }}
          disabled={otpVerified}
        />
      ))}
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#F3F4F6',
      }}
      dir="rtl"
    >
      {/* Left Side - Branding */}
      {!isMobile && (
        <Box
          sx={{
            flex: 1,
            bgcolor: 'primary.main',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            p: 4,
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
          }}
        >
          <Avatar sx={{ width: 100, height: 100, bgcolor: 'white', mb: 3 }}>
            <LocationIcon sx={{ fontSize: 60, color: 'primary.main' }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
            نظام إدارة مراكز التأهيل
          </Typography>
          <Typography
            variant="body1"
            color="white"
            sx={{ opacity: 0.9, maxWidth: 400, textAlign: 'center' }}
          >
            نظام متكامل لإدارة مراكز تأهيل ذوي الإعاقة مع دعم الذكاء الاصطناعي
          </Typography>

          <Box sx={{ mt: 6, color: 'white', opacity: 0.8 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <SecurityIcon />
              <Typography>تسجيل دخول آمن</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <LocationIcon />
              <Typography>متوافق مع العنوان الوطني</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon />
              <Typography>دعم هوية الوصول الموحد</Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: isMobile ? 1 : { xs: 1, md: 0.6 },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 3,
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Mobile Logo */}
            {isMobile && (
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Avatar sx={{ width: 70, height: 70, bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
                  <LocationIcon sx={{ fontSize: 40 }} />
                </Avatar>
                <Typography variant="h5" fontWeight="bold">
                  نظام مراكز التأهيل
                </Typography>
              </Box>
            )}

            {/* Header */}
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              تسجيل الدخول
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              اختر طريقة تسجيل الدخول المناسبة
            </Typography>

            {/* Login Method Selection */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                fullWidth
                variant={loginMethod === 'password' ? 'contained' : 'outlined'}
                onClick={() => handleLoginMethodChange('password')}
                sx={{ borderRadius: 2 }}
              >
                <LockIcon sx={{ ml: 1 }} />
                كلمة المرور
              </Button>
              <Button
                fullWidth
                variant={loginMethod === 'otp' ? 'contained' : 'outlined'}
                onClick={() => handleLoginMethodChange('otp')}
                sx={{ borderRadius: 2 }}
              >
                <SecurityIcon sx={{ ml: 1 }} />
                رمز التحقق
              </Button>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Success Alert */}
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                {success}
              </Alert>
            )}

            {/* Password Login Form */}
            {loginMethod === 'password' && (
              <form onSubmit={handlePasswordLogin}>
                <TextField
                  fullWidth
                  label="اسم المستخدم / رقم الجوال / البريد الإلكتروني"
                  value={formData.identifier}
                  onChange={handleChange('identifier')}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="كلمة المرور"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange('password')}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  select
                  label="المركز"
                  value={selectedCenter}
                  onChange={e => setSelectedCenter(e.target.value)}
                  sx={{ mb: 2 }}
                  SelectProps={{ native: true }}
                >
                  {centers.map(center => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </TextField>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">تذكرني</Typography>}
                  />
                  <Link href="#" variant="body2" color="primary" underline="hover">
                    نسيت كلمة المرور؟
                  </Link>
                </Box>

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: 2 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    <>
                      <LoginIcon sx={{ ml: 1 }} />
                      تسجيل الدخول
                    </>
                  )}
                </Button>
              </form>
            )}

            {/* OTP Login Form */}
            {loginMethod === 'otp' && (
              <Box>
                {/* Step 1: Enter identifier */}
                {!otpSent && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      أدخل البريد الإلكتروني أو رقم الجوال لاستلام رمز التحقق
                    </Typography>

                    {/* OTP Method Selection */}
                    <Typography variant="caption" color="text.secondary">
                      اختر طريقة الاستلام:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', mb: 2 }}>
                      {renderOtpMethodButton('email', <EmailIcon />, 'البريد')}
                      {renderOtpMethodButton('sms', <SmsIcon />, 'الرسائل')}
                      {renderOtpMethodButton('whatsapp', <WhatsAppIcon />, 'الواتساب')}
                    </Box>

                    <TextField
                      fullWidth
                      label={otpMethod === 'email' ? 'البريد الإلكتروني' : 'رقم الجوال'}
                      placeholder={otpMethod === 'email' ? 'example@email.com' : '05xxxxxxxx'}
                      value={formData.identifier}
                      onChange={handleChange('identifier')}
                      sx={{ mb: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            {otpMethod === 'email' ? (
                              <EmailIcon color="action" />
                            ) : (
                              <PhoneIcon color="action" />
                            )}
                          </InputAdornment>
                        ),
                      }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={rememberMe}
                          onChange={e => setRememberMe(e.target.checked)}
                          size="small"
                        />
                      }
                      label={<Typography variant="body2">تذكرني</Typography>}
                      sx={{ mb: 2 }}
                    />

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={sendOTP}
                      disabled={loading || !formData.identifier}
                      sx={{ py: 1.5, borderRadius: 2 }}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'إرسال رمز التحقق'
                      )}
                    </Button>
                  </Box>
                )}

                {/* Step 2: Enter OTP */}
                {otpSent && !otpVerified && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      تم إرسال رمز التحقق إلى:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ mb: 2 }}>
                      {formData.identifier.includes('@')
                        ? formData.identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
                        : formData.identifier.replace(/(.{4})(.*)/, '$1****')}
                    </Typography>

                    {renderOtpInputs()}

                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: 1,
                        mb: 2,
                      }}
                    >
                      {resendTimer > 0 ? (
                        <>
                          <TimerIcon color="action" fontSize="small" />
                          <Typography variant="body2" color="text.secondary">
                            إعادة الإرسال خلال {resendTimer} ثانية
                          </Typography>
                        </>
                      ) : (
                        <Button
                          variant="text"
                          size="small"
                          startIcon={<RefreshIcon />}
                          onClick={resendOTP}
                        >
                          إعادة إرسال الرمز
                        </Button>
                      )}
                    </Box>

                    <Button
                      fullWidth
                      variant="contained"
                      size="large"
                      onClick={verifyOTP}
                      disabled={loading || formData.otp.length !== 6}
                      sx={{ py: 1.5, borderRadius: 2 }}
                    >
                      {loading ? <CircularProgress size={24} color="inherit" /> : 'تأكيد الرمز'}
                    </Button>

                    <Button
                      fullWidth
                      variant="text"
                      sx={{ mt: 2 }}
                      onClick={() => {
                        setOtpSent(false);
                        setFormData({ ...formData, otp: '' });
                        setActiveStep(1);
                      }}
                    >
                      <ArrowBackIcon sx={{ ml: 1 }} />
                      تغيير رقم الجوال / البريد
                    </Button>
                  </Box>
                )}

                {/* Success State */}
                {otpVerified && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      تم تسجيل الدخول بنجاح!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      جاري التحويل إلى لوحة التحكم...
                    </Typography>
                    <CircularProgress sx={{ mt: 2 }} />
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                أو
              </Typography>
            </Divider>

            {/* SSO Login */}
            <Button
              fullWidth
              variant="outlined"
              size="large"
              sx={{ py: 1.5, borderRadius: 2, mb: 2 }}
            >
              <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                <SecurityIcon sx={{ fontSize: 16 }} />
              </Avatar>
              تسجيل الدخول بواسطة الوصول الموحد (SSO)
            </Button>

            {/* Help Links */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link
                href="#"
                variant="body2"
                color="text.secondary"
                underline="hover"
                sx={{ mx: 1 }}
              >
                المساعدة
              </Link>
              <Link
                href="#"
                variant="body2"
                color="text.secondary"
                underline="hover"
                sx={{ mx: 1 }}
              >
                الدعم الفني
              </Link>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default LoginPage;
