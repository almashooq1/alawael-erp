/**
 * SimpleLogin — صفحة تسجيل الدخول الاحترافية
 *
 * Professional MUI login page with:
 * - Gradient background with decorative shapes
 * - Logo / branding
 * - Password visibility toggle
 * - Error alerts
 * - Loading state
 * - Dev-only test credentials
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Avatar,
  Fade,
  Collapse,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients } from 'theme/palette';
import { prefetchRoutes } from 'utils/lazyLoader';

const SimpleLogin = () => {
  const showSnackbar = useSnackbar();
  const { login } = useAuth();

  // Prefetch dashboard & core routes while user types credentials
  useEffect(() => {
    prefetchRoutes([
      () => import('components/dashboard/AdvancedDashboard'),
      () => import('pages/common/Home'),
      () => import('components/Layout/ProLayout'),
    ]);
  }, []);
  const [email, setEmail] = useState(
    process.env.NODE_ENV === 'development' ? 'admin@alawael.com' : ''
  );
  const [password, setPassword] = useState(
    process.env.NODE_ENV === 'development' ? 'Admin@123456' : ''
  );
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        showSnackbar('تم تسجيل الدخول بنجاح!', 'success');
        navigate('/dashboard');
      } else {
        throw new Error(result.error || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      logger.error('❌ Login error:', err);

      const isNetworkError =
        err.message === 'Network Error' ||
        err.code === 'ERR_NETWORK' ||
        err.code === 'ECONNREFUSED';
      const errorMsg = isNetworkError
        ? 'تعذر الاتصال بالخادم. تأكد أن الـ Backend يعمل على المنفذ الصحيح وأن الاتصال ليس محجوباً.'
        : err.data?.message || err.message || 'فشل تسجيل الدخول';
      setError(errorMsg);
      showSnackbar('خطأ: ' + errorMsg, 'error');
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
        background: gradients.primary,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative background circles */}
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          top: -100,
          right: -100,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          bottom: -80,
          left: -80,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          top: '40%',
          left: '10%',
        }}
      />

      <Fade in timeout={800}>
        <Paper
          elevation={24}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: 4,
            width: '100%',
            maxWidth: 420,
            mx: 2,
            position: 'relative',
            zIndex: 1,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
          }}
        >
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              component="img"
              src="/logo.svg"
              alt="مراكز الأوائل للرعاية النهارية"
              sx={{
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
                borderRadius: '50%',
                boxShadow: '0 8px 24px rgba(102,126,234,0.35)',
              }}
            />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              نظام مراكز الأوائل
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تسجيل الدخول إلى نظام الرعاية النهارية
            </Typography>
          </Box>

          {/* Error Alert */}
          <Collapse in={!!error}>
            <Alert
              severity="error"
              sx={{ mb: 2.5, borderRadius: 2 }}
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          </Collapse>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="كلمة المرور"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              sx={{ mb: 3.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              size="large"
              startIcon={
                loading ? (
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                ) : (
                  <LoginIcon />
                )
              }
              sx={{
                py: 1.5,
                borderRadius: 2,
                fontWeight: 'bold',
                fontSize: '1rem',
                background: gradients.primary,
                boxShadow: '0 4px 16px rgba(102,126,234,0.35)',
                '&:hover': {
                  background: gradients.primary,
                  filter: 'brightness(1.1)',
                  boxShadow: '0 6px 24px rgba(102,126,234,0.45)',
                },
              }}
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </Button>
          </form>

          {/* Dev-only test credentials */}
          {process.env.NODE_ENV === 'development' && (
            <Box
              sx={{
                mt: 3,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(102,126,234,0.06)',
                border: '1px dashed rgba(102,126,234,0.2)',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center' }}
              >
                🔧 بيانات الاختبار — بيئة التطوير فقط
              </Typography>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ display: 'block', textAlign: 'center', mt: 0.3 }}
              >
                admin@test.com / Admin@123
              </Typography>
            </Box>
          )}

          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ display: 'block', textAlign: 'center', mt: 3 }}
          >
            نظام مراكز الأوائل للرعاية النهارية © {new Date().getFullYear()}
          </Typography>
        </Paper>
      </Fade>
    </Box>
  );
};

export default SimpleLogin;
