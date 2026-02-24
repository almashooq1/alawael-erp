/**
 * Login Page - Complete Authentication System
 * صفحة تسجيل الدخول الشاملة
 */

import React, { useState, useEffect } from 'react';
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
  Paper,
  Grid,
  useMediaQuery,
  useTheme,
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
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

// Login Page Component
const LoginPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // State
  const [loginMethod, setLoginMethod] = useState('username'); // username, nationalId, phone
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form Data
  const [formData, setFormData] = useState({
    username: '',
    nationalId: '',
    phone: '',
    password: '',
  });
  
  // Centers for selection
  const centers = [
    { id: 'CTR-001', name: 'مركز التأهيل الشامل - الرياض' },
    { id: 'CTR-002', name: 'مركز التأهيل الشامل - جدة' },
    { id: 'CTR-003', name: 'مركز التأهيل الشامل - الدمام' },
  ];
  const [selectedCenter, setSelectedCenter] = useState(centers[0].id);
  
  // Handle input change
  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError('');
  };
  
  // Handle login method change
  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    setFormData({ username: '', nationalId: '', phone: '', password: '' });
    setError('');
  };
  
  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validation
    let identifier = '';
    if (loginMethod === 'username') {
      identifier = formData.username;
      if (!identifier) {
        setError('يرجى إدخال اسم المستخدم');
        setLoading(false);
        return;
      }
    } else if (loginMethod === 'nationalId') {
      identifier = formData.nationalId;
      if (!identifier || identifier.length !== 10) {
        setError('يرجى إدخال رقم الهوية الوطنية (10 أرقام)');
        setLoading(false);
        return;
      }
    } else if (loginMethod === 'phone') {
      identifier = formData.phone;
      if (!identifier || identifier.length !== 10) {
        setError('يرجى إدخال رقم الجوال (10 أرقام)');
        setLoading(false);
        return;
      }
    }
    
    if (!formData.password) {
      setError('يرجى إدخال كلمة المرور');
      setLoading(false);
      return;
    }
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock success
      setSuccess('تم تسجيل الدخول بنجاح! جاري التحويل...');
      
      // Save to localStorage if remember me
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedUsername', identifier);
      }
      
      // Redirect after delay
      setTimeout(() => {
        navigate('/');
      }, 1500);
      
    } catch (err) {
      setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load saved credentials
  useEffect(() => {
    const saved = localStorage.getItem('rememberMe');
    if (saved === 'true') {
      const savedUsername = localStorage.getItem('savedUsername');
      if (savedUsername) {
        setFormData(prev => ({ ...prev, username: savedUsername }));
        setRememberMe(true);
      }
    }
  }, []);
  
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: '#F3F4F6',
      }}
      dir="rtl"
    >
      {/* Left Side - Branding (hidden on mobile) */}
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
          <Avatar
            sx={{
              width: 100,
              height: 100,
              bgcolor: 'white',
              mb: 3,
            }}
          >
            <LocationIcon sx={{ fontSize: 60, color: 'primary.main' }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold" color="white" gutterBottom>
            نظام إدارة مراكز التأهيل
          </Typography>
          <Typography variant="body1" color="white" sx={{ opacity: 0.9, maxWidth: 400, textAlign: 'center' }}>
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
                <Avatar
                  sx={{
                    width: 70,
                    height: 70,
                    bgcolor: 'primary.main',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
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
              أدخل بياناتك للوصول إلى النظام
            </Typography>
            
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
            
            {/* Login Method Tabs */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <Button
                size="small"
                variant={loginMethod === 'username' ? 'contained' : 'outlined'}
                onClick={() => handleLoginMethodChange('username')}
                sx={{ flex: 1, borderRadius: 2 }}
              >
                اسم المستخدم
              </Button>
              <Button
                size="small"
                variant={loginMethod === 'nationalId' ? 'contained' : 'outlined'}
                onClick={() => handleLoginMethodChange('nationalId')}
                sx={{ flex: 1, borderRadius: 2 }}
              >
                الهوية
              </Button>
              <Button
                size="small"
                variant={loginMethod === 'phone' ? 'contained' : 'outlined'}
                onClick={() => handleLoginMethodChange('phone')}
                sx={{ flex: 1, borderRadius: 2 }}
              >
                الجوال
              </Button>
            </Box>
            
            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Username Field */}
              {loginMethod === 'username' && (
                <TextField
                  fullWidth
                  label="اسم المستخدم"
                  value={formData.username}
                  onChange={handleChange('username')}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              
              {/* National ID Field */}
              {loginMethod === 'nationalId' && (
                <TextField
                  fullWidth
                  label="رقم الهوية الوطنية"
                  value={formData.nationalId}
                  onChange={handleChange('nationalId')}
                  placeholder="10 أرقام"
                  inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              
              {/* Phone Field */}
              {loginMethod === 'phone' && (
                <TextField
                  fullWidth
                  label="رقم الجوال"
                  value={formData.phone}
                  onChange={handleChange('phone')}
                  placeholder="05xxxxxxxx"
                  inputProps={{ maxLength: 10, pattern: '[0-9]*' }}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
              
              {/* Password Field */}
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
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              
              {/* Center Selection */}
              <TextField
                fullWidth
                select
                label="المركز"
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                sx={{ mb: 2 }}
                SelectProps={{
                  native: true,
                }}
              >
                {centers.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </TextField>
              
              {/* Remember Me & Forgot Password */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">تذكرني</Typography>}
                />
                <Link
                  href="#"
                  variant="body2"
                  color="primary"
                  underline="hover"
                >
                  نسيت كلمة المرور؟
                </Link>
              </Box>
              
              {/* Login Button */}
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  mb: 2,
                }}
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
            
            {/* Divider */}
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
              sx={{
                py: 1.5,
                borderRadius: 2,
                mb: 2,
              }}
            >
              <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
                <SecurityIcon sx={{ fontSize: 16 }} />
              </Avatar>
              تسجيل الدخول بواسصة الوصول الموحد (SSO)
            </Button>
            
            {/* Help Links */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Link href="#" variant="body2" color="text.secondary" underline="hover" sx={{ mx: 1 }}>
                المساعدة
              </Link>
              <Link href="#" variant="body2" color="text.secondary" underline="hover" sx={{ mx: 1 }}>
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