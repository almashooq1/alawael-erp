/**
 * Forgot Password Page
 * صفحة نسيت كلمة المرور
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Avatar,
  InputAdornment,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import {
  LockReset as LockResetIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [method, setMethod] = useState('email');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    nationalId: '',
  });

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    let identifier = '';
    if (method === 'email') {
      identifier = formData.email;
      if (!identifier || !identifier.includes('@')) {
        setError('يرجى إدخال بريد إلكتروني صحيح');
        setLoading(false);
        return;
      }
    } else if (method === 'phone') {
      identifier = formData.phone;
      if (!identifier || identifier.length !== 10) {
        setError('يرجى إدخال رقم جوال صحيح (10 أرقام)');
        setLoading(false);
        return;
      }
    } else if (method === 'nationalId') {
      identifier = formData.nationalId;
      if (!identifier || identifier.length !== 10) {
        setError('يرجى إدخال رقم هوية صحيح (10 أرقام)');
        setLoading(false);
        return;
      }
    }

    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSuccess(true);
    } catch (err) {
      setError('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#F3F4F6',
        p: 2,
      }}
      dir="rtl"
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 450,
          borderRadius: 3,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Avatar
              sx={{
                width: 70,
                height: 70,
                bgcolor: success ? 'success.main' : 'warning.main',
                mx: 'auto',
                mb: 2,
              }}
            >
              {success ? <CheckCircleIcon sx={{ fontSize: 40 }} /> : <LockResetIcon sx={{ fontSize: 40 }} />}
            </Avatar>
            <Typography variant="h5" fontWeight="bold">
              {success ? 'تم الإرسال!' : 'نسيت كلمة المرور؟'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {success
                ? 'تم إرسال رابط إعادة تعيين كلمة المرور'
                : 'أدخل بياناتك لاستعادة كلمة المرور'}
            </Typography>
          </Box>

          {success ? (
            <Box sx={{ textAlign: 'center' }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                تم إرسال رابط إعادة تعيين كلمة المرور إلى{' '}
                {method === 'email' ? formData.email : method === 'phone' ? formData.phone : formData.nationalId}
              </Alert>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                يرجى التحقق من {method === 'email' ? 'البريد الإلكتروني' : 'الهاتف'} واتباع التعليمات
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/login')}
                sx={{ mb: 2 }}
              >
                العودة لتسجيل الدخول
              </Button>
            </Box>
          ) : (
            <>
              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Method Selection */}
              <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
                <Button
                  size="small"
                  variant={method === 'email' ? 'contained' : 'outlined'}
                  onClick={() => setMethod('email')}
                  sx={{ flex: 1, borderRadius: 2 }}
                >
                  البريد
                </Button>
                <Button
                  size="small"
                  variant={method === 'phone' ? 'contained' : 'outlined'}
                  onClick={() => setMethod('phone')}
                  sx={{ flex: 1, borderRadius: 2 }}
                >
                  الجوال
                </Button>
                <Button
                  size="small"
                  variant={method === 'nationalId' ? 'contained' : 'outlined'}
                  onClick={() => setMethod('nationalId')}
                  sx={{ flex: 1, borderRadius: 2 }}
                >
                  الهوية
                </Button>
              </Box>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                {method === 'email' && (
                  <TextField
                    fullWidth
                    label="البريد الإلكتروني"
                    type="email"
                    value={formData.email}
                    onChange={handleChange('email')}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                {method === 'phone' && (
                  <TextField
                    fullWidth
                    label="رقم الجوال"
                    value={formData.phone}
                    onChange={handleChange('phone')}
                    placeholder="05xxxxxxxx"
                    inputProps={{ maxLength: 10 }}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                {method === 'nationalId' && (
                  <TextField
                    fullWidth
                    label="رقم الهوية الوطنية"
                    value={formData.nationalId}
                    onChange={handleChange('nationalId')}
                    placeholder="10 أرقام"
                    inputProps={{ maxLength: 10 }}
                    sx={{ mb: 3 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ py: 1.5, borderRadius: 2, mb: 2 }}
                >
                  {loading ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'إرسال رابط الاستعادة'
                  )}
                </Button>
              </form>

              {/* Back to Login */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Link
                  href="#"
                  onClick={() => navigate('/login')}
                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
                >
                  <ArrowBackIcon sx={{ fontSize: 16 }} />
                  العودة لتسجيل الدخول
                </Link>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordPage;