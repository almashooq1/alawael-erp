/**
 * SimpleLogin — صفحة تسجيل الدخول الاحترافية
 *
 * Premium split-screen login:
 * - Left panel (40%): Clean white form
 * - Right panel (60%): Brand gradient with animated shapes
 * - Full Arabic RTL support
 * - Error handling + loading state
 * - Password visibility toggle
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
  Checkbox,
  FormControlLabel,
  Divider,
  Link,
  useTheme,
  useMediaQuery,
  alpha,
  Fade,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  Shield as ShieldIcon,
  AutoAwesome,
  TrendingUp,
  Groups,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';

// ─── Feature highlights (right panel) ────────────────────────────────────────
const FEATURES = [
  {
    icon: <Groups sx={{ fontSize: 22, color: '#818CF8' }} />,
    title: 'إدارة شاملة للمستفيدين',
    desc: 'تتبع كامل لملفات المستفيدين وبرامج التأهيل',
  },
  {
    icon: <TrendingUp sx={{ fontSize: 22, color: '#6EE7B7' }} />,
    title: 'تقارير وإحصاءات متقدمة',
    desc: 'لوحات معلومات تفاعلية بمؤشرات أداء دقيقة',
  },
  {
    icon: <AutoAwesome sx={{ fontSize: 22, color: '#FCD34D' }} />,
    title: 'ذكاء اصطناعي متكامل',
    desc: 'توصيات آلية وتحليل بيانات بتقنية AI',
  },
];

// ─── Animated floating shape ──────────────────────────────────────────────────
function FloatingShape({ size, top, left, right, opacity, delay, color }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        width: size,
        height: size,
        top,
        left,
        right,
        borderRadius: '50%',
        background: color || 'rgba(99,102,241,0.15)',
        filter: 'blur(40px)',
        opacity,
        animation: `float ${3 + delay}s ease-in-out infinite alternate`,
        '@keyframes float': {
          from: { transform: 'translateY(0px) scale(1)' },
          to:   { transform: `translateY(${-12 + delay * 3}px) scale(1.05)` },
        },
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SimpleLogin() {
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const navigate  = useNavigate();
  const { login } = useAuth() || {};
  const showSnackbar = useSnackbar?.();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPwd, setShowPwd]   = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    // Pre-fill dev credentials
    if (process.env.NODE_ENV === 'development') {
      setForm({ email: 'admin@alawael.org', password: 'Admin@123' });
    }
  }, []);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login?.(form.email, form.password);
      showSnackbar?.('مرحباً بك في نظام مراكز الأوائل', 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      logger.error('Login failed', err);
      const msg = err?.response?.data?.message || err?.message || '';
      if (msg.includes('Invalid') || msg.includes('credentials') || msg.includes('password')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      } else if (msg.includes('network') || msg.includes('Network')) {
        setError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#0A1628',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
      }}
    >
      {/* ── RIGHT PANEL — Brand/Visual (hidden on mobile) ─────────────────── */}
      {!isMobile && (
        <Box
          sx={{
            flex: '0 0 58%',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(160deg, #0F172A 0%, #1E3A8A 35%, #312E81 70%, #4C1D95 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 6,
          }}
        >
          {/* Animated background shapes */}
          <FloatingShape size={300} top="-80px" right="-80px"   opacity={0.6} delay={0} color="rgba(99,102,241,0.2)" />
          <FloatingShape size={250} bottom="0"  left="-60px"    opacity={0.5} delay={1} color="rgba(139,92,246,0.2)" />
          <FloatingShape size={180} top="40%"   right="10%"     opacity={0.4} delay={2} color="rgba(245,158,11,0.12)" />
          <FloatingShape size={120} top="15%"   left="20%"      opacity={0.3} delay={0.5} color="rgba(16,185,129,0.1)" />

          {/* Mesh grid overlay */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px),
                linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)
              `,
              backgroundSize: '48px 48px',
              pointerEvents: 'none',
            }}
          />

          <Fade in={mounted} timeout={800}>
            <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 440, width: '100%' }}>
              {/* Logo */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 24px rgba(99,102,241,0.45)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.4rem', fontFamily: 'Cairo' }}>
                    أ
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.25rem', lineHeight: 1.2, fontFamily: 'Cairo' }}>
                    مراكز الأوائل
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                    نظام الإدارة المتكامل
                  </Typography>
                </Box>
              </Box>

              {/* Headline */}
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '2rem',
                  lineHeight: 1.3,
                  mb: 1.5,
                  fontFamily: 'Cairo',
                }}
              >
                إدارة احترافية
                <br />
                <Box component="span" sx={{ background: 'linear-gradient(135deg, #818CF8, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لمراكز التأهيل
                </Box>
              </Typography>

              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', lineHeight: 1.7, mb: 5 }}>
                منصة شاملة لإدارة المستفيدين، الموارد البشرية، والخدمات المالية وفق رؤية 2030
              </Typography>

              {/* Feature cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {FEATURES.map((f, i) => (
                  <Fade key={i} in={mounted} timeout={800 + i * 200}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 2,
                        p: 2,
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(8px)',
                        transition: 'background 0.2s',
                        '&:hover': { background: 'rgba(255,255,255,0.08)' },
                      }}
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '10px',
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {f.icon}
                      </Box>
                      <Box>
                        <Typography sx={{ color: '#FFFFFF', fontWeight: 600, fontSize: '0.875rem', mb: 0.25 }}>
                          {f.title}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                          {f.desc}
                        </Typography>
                      </Box>
                    </Box>
                  </Fade>
                ))}
              </Box>

              {/* Bottom badge */}
              <Box
                sx={{
                  mt: 5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2,
                  py: 1,
                  borderRadius: '100px',
                  backgroundColor: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  width: 'fit-content',
                }}
              >
                <ShieldIcon sx={{ fontSize: 16, color: '#34D399' }} />
                <Typography sx={{ color: '#6EE7B7', fontSize: '0.75rem', fontWeight: 600 }}>
                  نظام آمن ومعتمد • ISO 27001
                </Typography>
              </Box>
            </Box>
          </Fade>
        </Box>
      )}

      {/* ── LEFT PANEL — Login Form ──────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          p: { xs: 3, md: 6 },
          position: 'relative',
          minHeight: '100vh',
        }}
      >
        {/* Mobile logo */}
        {isMobile && (
          <Box sx={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>أ</Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>مراكز الأوائل</Typography>
          </Box>
        )}

        <Fade in={mounted} timeout={600}>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.625rem', md: '1.875rem' },
                  color: '#0F172A',
                  lineHeight: 1.2,
                  mb: 1,
                  fontFamily: 'Cairo',
                }}
              >
                مرحباً بعودتك 👋
              </Typography>
              <Typography sx={{ color: '#64748B', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                سجّل الدخول للوصول إلى لوحة التحكم
              </Typography>
            </Box>

            {/* Error alert */}
            {error && (
              <Fade in={Boolean(error)}>
                <Alert
                  severity="error"
                  onClose={() => setError('')}
                  sx={{ mb: 3, borderRadius: 2 }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
              {/* Email */}
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155', mb: 0.75 }}>
                  البريد الإلكتروني
                </Typography>
                <TextField
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="admin@alawael.org"
                  fullWidth
                  size="medium"
                  disabled={loading}
                  error={Boolean(error)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ fontSize: 18, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: '10px',
                      backgroundColor: '#F8FAFC',
                      '&.Mui-focused': {
                        backgroundColor: '#FFFFFF',
                      },
                      '& input': { fontSize: '0.9375rem' },
                    },
                  }}
                />
              </Box>

              {/* Password */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#334155' }}>
                    كلمة المرور
                  </Typography>
                  <Link
                    href="/forgot-password"
                    sx={{
                      fontSize: '0.8125rem',
                      color: '#6366F1',
                      textDecoration: 'none',
                      fontWeight: 500,
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    نسيت كلمة المرور؟
                  </Link>
                </Box>
                <TextField
                  name="password"
                  type={showPwd ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  fullWidth
                  size="medium"
                  disabled={loading}
                  error={Boolean(error)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ fontSize: 18, color: '#94A3B8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPwd((v) => !v)}
                          edge="end"
                          size="small"
                          sx={{ color: '#94A3B8', '&:hover': { color: '#6366F1' } }}
                        >
                          {showPwd ? <VisibilityOff sx={{ fontSize: 18 }} /> : <Visibility sx={{ fontSize: 18 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: '10px',
                      backgroundColor: '#F8FAFC',
                      '&.Mui-focused': { backgroundColor: '#FFFFFF' },
                      '& input': { fontSize: '0.9375rem' },
                    },
                  }}
                />
              </Box>

              {/* Remember me */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    size="small"
                    sx={{
                      color: '#CBD5E1',
                      '&.Mui-checked': { color: '#6366F1' },
                      p: 0.75,
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.8125rem', color: '#64748B' }}>
                    تذكرني
                  </Typography>
                }
                sx={{ mb: 3, mr: 0 }}
              />

              {/* Submit */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? null : <LoginIcon sx={{ fontSize: 18 }} />}
                sx={{
                  height: 48,
                  borderRadius: '10px',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  letterSpacing: '0.01em',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4338CA 0%, #6D28D9 100%)',
                    boxShadow: '0 6px 20px rgba(99,102,241,0.45)',
                    transform: 'translateY(-1px)',
                  },
                  '&:active': { transform: 'translateY(0)' },
                  '&.Mui-disabled': {
                    background: '#E2E8F0',
                    boxShadow: 'none',
                    color: '#94A3B8',
                  },
                }}
              >
                {loading ? <CircularProgress size={22} sx={{ color: '#94A3B8' }} /> : 'تسجيل الدخول'}
              </Button>
            </Box>

            {/* Divider */}
            <Divider sx={{ my: 3, '& .MuiDivider-wrapper': { px: 2 } }}>
              <Typography variant="caption" color="text.secondary">
                نظام مراكز الأوائل
              </Typography>
            </Divider>

            {/* Dev hint */}
            {process.env.NODE_ENV === 'development' && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '10px',
                  backgroundColor: alpha('#6366F1', 0.05),
                  border: `1px solid ${alpha('#6366F1', 0.15)}`,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 600, mb: 0.5 }}>
                  🔧 بيئة التطوير — بيانات تلقائية
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                  admin@alawael.org / Admin@123
                </Typography>
              </Box>
            )}

            {/* Footer */}
            <Typography
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.75rem',
                color: '#94A3B8',
              }}
            >
              © {new Date().getFullYear()} مراكز الأوائل — جميع الحقوق محفوظة
            </Typography>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
}
