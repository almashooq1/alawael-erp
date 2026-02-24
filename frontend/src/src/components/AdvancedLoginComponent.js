/**
 * ========================================
 * مكون تسجيل الدخول المتقدم
 * Advanced Login Component
 * ========================================
 *
 * مكون React لتسجيل الدخول والتسجيل
 * مع دعم 4 طرق دخول مختلفة
 *
 * Features:
 * - Smart Login (تحديد طريقة الدخول تلقائياً)
 * - تسجيل جديد
 * - استرجاع كلمة المرور
 * - تغيير كلمة المرور
 * - المصادقة الثنائية
 * - معاينة قوة كلمة المرور
 * - Responsive Design
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Tab,
  Tabs,
  Container,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Grid,
  Paper,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Phone,
  Person,
  Lock,
  CheckCircle,
  ErrorOutline,
  Info,
  Smartphone,
  ArrowBack,
  Google,
  Apple,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  transition: 'all 0.3s ease',
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: 'white',
  padding: theme.spacing(4),
  borderRadius: '12px',
  marginBottom: theme.spacing(3),
  textAlign: 'center',
}));

const TabPanel = props => {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

function AdvancedLoginComponent({ onLoginSuccess }) {
  // الحالة الرئيسية
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // بيانات تسجيل الدخول الذكي
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [credentialType, setCredentialType] = useState(null);

  // بيانات التسجيل
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    phone: '',
    idNumber: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });

  // استرجاع كلمة المرور
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: إدخال البريد، 2: إدخال الرمز، 3: كلمة مرور جديدة

  // المصادقة الثنائية
  const [twoFADialog, setTwoFADialog] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState('');

  /**
   * التحقق من صحة البيانات المدخلة
   */
  const validateCredential = async value => {
    try {
      const response = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: value }),
      });

      const data = await response.json();
      setCredentialType(data.validationType);
      return data;
    } catch (err) {
      console.error('خطأ في التحقق:', err);
    }
  };

  /**
   * معالجة تغيير حقل البيانات المدخلة
   */
  const handleCredentialChange = e => {
    const value = e.target.value;
    setCredential(value);

    if (value.length > 3) {
      validateCredential(value);
    } else {
      setCredentialType(null);
    }
  };

  /**
   * تسجيل الدخول الذكي
   */
  const handleSmartLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, password }),
      });

      const data = await response.json();

      if (data.success) {
        // حفظ الـ token
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);

        setSuccess('تم تسجيل الدخول بنجاح!');

        // تأخير قبل إعادة التوجيه
        setTimeout(() => {
          if (onLoginSuccess) onLoginSuccess(data.user);
        }, 1000);
      } else {
        setError(data.message || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * التسجيل كمستخدم جديد
   */
  const handleRegister = async e => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
        // إعادة تعيين النموذج
        setRegisterData({
          username: '',
          email: '',
          phone: '',
          idNumber: '',
          firstName: '',
          lastName: '',
          password: '',
          confirmPassword: '',
        });
        // الرجوع إلى تسجيل الدخول
        setTimeout(() => setTabValue(0), 2000);
      } else {
        setError(data.error || 'فشل إنشاء الحساب');
      }
    } catch (err) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * التحقق من قوة كلمة المرور
   */
  const checkPasswordStrength = async pwd => {
    try {
      const response = await fetch('/api/auth/password/strength', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });

      const data = await response.json();

      // حساب نسبة القوة
      const requirementsMet = Object.values(passwordRequirements).filter(Boolean).length;
      setPasswordStrength((requirementsMet / 5) * 100);
    } catch (err) {
      console.error('خطأ:', err);
    }
  };

  /**
   * معالجة تغيير كلمة المرور أثناء التسجيل
   */
  const handlePasswordChange = e => {
    const pwd = e.target.value;
    setRegisterData({ ...registerData, password: pwd });

    // التحقق من المتطلبات
    setPasswordRequirements({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[@$!%*?&]/.test(pwd),
    });

    // حساب القوة
    const met = Object.values({
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[@$!%*?&]/.test(pwd),
    }).filter(Boolean).length;

    setPasswordStrength((met / 5) * 100);
  };

  /**
   * طلب إعادة تعيين كلمة المرور
   */
  const handleResetPasswordRequest = async e => {
    e.preventDefault();

    if (!resetEmail) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني');
        setResetStep(2);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError(`خطأ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * الحصول على لون مؤشر القوة
   */
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'error';
    if (passwordStrength < 70) return 'warning';
    return 'success';
  };

  /**
   * الحصول على نص قوة كلمة المرور
   */
  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'ضعيفة جداً';
    if (passwordStrength < 70) return 'متوسطة';
    return 'قوية';
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      {/* Header */}
      <HeaderBox>
        <Lock sx={{ fontSize: 40, mb: 2 }} />
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 1 }}>
          نظام المصادقة
        </Typography>
        <Typography variant="h6" sx={{ opacity: 0.9 }}>
          تسجيل الدخول والتسجيل الآمن
        </Typography>
      </HeaderBox>

      {/* الرسائل */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs Navigation */}
      <StyledCard>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="تسجيل الدخول" icon={<Person />} iconPosition="start" />
          <Tab label="حساب جديد" icon={<PersonAdd />} iconPosition="start" />
          <Tab label="استرجاع كلمة المرور" icon={<Lock />} iconPosition="start" />
        </Tabs>
      </StyledCard>

      {/* Tab 1: Smart Login */}
      <TabPanel value={tabValue} index={0}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
              تسجيل الدخول الذكي
            </Typography>

            {credentialType && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'success.light', borderRadius: '8px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle sx={{ color: 'success.main' }} />
                  <Typography variant="body2">
                    {credentialType === 'email' && '✅ بريد إلكتروني'}
                    {credentialType === 'phone' && '✅ رقم جوال'}
                    {credentialType === 'idNumber' && '✅ رقم بطاقة أحوال'}
                    {credentialType === 'username' && '✅ اسم مستخدم'}
                  </Typography>
                </Box>
              </Box>
            )}

            <form onSubmit={handleSmartLogin}>
              <TextField
                fullWidth
                label="اسم المستخدم أو البريد أو الجوال أو الهوية"
                placeholder="مثال: user@email.com أو 0501234567"
                value={credential}
                onChange={handleCredentialChange}
                disabled={loading}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="كلمة المرور"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                margin="normal"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3, mb: 2 }} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'تسجيل الدخول'}
              </Button>

              <Typography
                variant="body2"
                sx={{ textAlign: 'center', cursor: 'pointer', color: 'primary.main', mb: 2 }}
                onClick={() => setTabValue(2)}
              >
                هل نسيت كلمة المرور؟
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Button variant="outlined" fullWidth startIcon={<Google />} sx={{ mb: 1 }}>
                الدخول عبر جوجل
              </Button>
              <Button variant="outlined" fullWidth startIcon={<Apple />}>
                الدخول عبر أبل
              </Button>
            </form>
          </CardContent>
        </StyledCard>
      </TabPanel>

      {/* Tab 2: Registration */}
      <TabPanel value={tabValue} index={1}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
              إنشاء حساب جديد
            </Typography>

            <form onSubmit={handleRegister}>
              <Grid container spacing={2}>
                {/* البيانات الشخصية */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الاسم الأول"
                    value={registerData.firstName}
                    onChange={e => setRegisterData({ ...registerData, firstName: e.target.value })}
                    disabled={loading}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="الاسم الأخير"
                    value={registerData.lastName}
                    onChange={e => setRegisterData({ ...registerData, lastName: e.target.value })}
                    disabled={loading}
                  />
                </Grid>

                {/* اسم المستخدم */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="اسم المستخدم"
                    placeholder="من 3 إلى 20 حرف"
                    value={registerData.username}
                    onChange={e => setRegisterData({ ...registerData, username: e.target.value })}
                    disabled={loading}
                  />
                </Grid>

                {/* البريد الإلكتروني */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="البريد الإلكتروني"
                    type="email"
                    value={registerData.email}
                    onChange={e => setRegisterData({ ...registerData, email: e.target.value })}
                    disabled={loading}
                  />
                </Grid>

                {/* رقم الجوال */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="رقم الجوال السعودي"
                    placeholder="0501234567"
                    value={registerData.phone}
                    onChange={e => setRegisterData({ ...registerData, phone: e.target.value })}
                    disabled={loading}
                  />
                </Grid>

                {/* رقم الهوية */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="رقم بطاقة الأحوال"
                    placeholder="1234567890"
                    value={registerData.idNumber}
                    onChange={e => setRegisterData({ ...registerData, idNumber: e.target.value })}
                    disabled={loading}
                  />
                </Grid>

                {/* كلمة المرور */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="كلمة المرور"
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={handlePasswordChange}
                    disabled={loading}
                    helperText="يجب أن تحتوي على 8 أحرف، حروف كبيرة، صغيرة، أرقام، ورموز"
                  />

                  {/* مؤشر قوة كلمة المرور */}
                  {registerData.password && (
                    <>
                      <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption">قوة كلمة المرور:</Typography>
                          <Typography variant="caption" color={getPasswordStrengthColor() + '.main'}>
                            {getPasswordStrengthText()}
                          </Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={passwordStrength} color={getPasswordStrengthColor()} />
                      </Box>

                      {/* متطلبات كلمة المرور */}
                      <List sx={{ mt: 2, p: 0 }}>
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {passwordRequirements.length ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                            ) : (
                              <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="8 أحرف على الأقل" primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {passwordRequirements.uppercase ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                            ) : (
                              <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="حرف كبير" primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {passwordRequirements.lowercase ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                            ) : (
                              <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="حرف صغير" primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {passwordRequirements.number ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                            ) : (
                              <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="رقم" primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                        <ListItem sx={{ py: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {passwordRequirements.special ? (
                              <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                            ) : (
                              <ErrorOutline sx={{ color: 'error.main', fontSize: 20 }} />
                            )}
                          </ListItemIcon>
                          <ListItemText primary="رمز خاص (@$!%*?&)" primaryTypographyProps={{ variant: 'caption' }} />
                        </ListItem>
                      </List>
                    </>
                  )}
                </Grid>

                {/* تأكيد كلمة المرور */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="تأكيد كلمة المرور"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={registerData.confirmPassword}
                    onChange={e => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    disabled={loading}
                    error={registerData.confirmPassword && registerData.password !== registerData.confirmPassword}
                    helperText={
                      registerData.confirmPassword && registerData.password !== registerData.confirmPassword
                        ? 'كلمات المرور غير متطابقة'
                        : ''
                    }
                  />
                </Grid>
              </Grid>

              <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'إنشاء الحساب'}
              </Button>
            </form>
          </CardContent>
        </StyledCard>
      </TabPanel>

      {/* Tab 3: Reset Password */}
      <TabPanel value={tabValue} index={2}>
        <StyledCard>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, textAlign: 'center', fontWeight: 'bold' }}>
              استرجاع كلمة المرور
            </Typography>

            {resetStep === 1 && (
              <form onSubmit={handleResetPasswordRequest}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  أدخل البريد الإلكتروني المرتبط بحسابك
                </Alert>

                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  disabled={loading}
                  margin="normal"
                />

                <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 3 }} disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'إرسال رابط التحقق'}
                </Button>
              </form>
            )}

            {resetStep === 2 && (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
                </Alert>

                <Typography variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
                  اتبع الرابط في بريدك لإعادة تعيين كلمة المرور
                </Typography>

                <Button variant="outlined" fullWidth onClick={() => setResetStep(1)} startIcon={<ArrowBack />}>
                  العودة
                </Button>
              </Box>
            )}
          </CardContent>
        </StyledCard>
      </TabPanel>
    </Container>
  );
}

export default AdvancedLoginComponent;
