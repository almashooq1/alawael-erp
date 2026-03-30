/**
 * SimpleLogin — صفحة تسجيل الدخول المحسّنة
 *
 * Premium split-screen login:
 * - Left panel (42%): Clean white form with micro-interactions
 * - Right panel (58%): Deep brand gradient with animated mesh & shapes
 * - Full Arabic RTL support
 * - Error handling + loading state
 * - Password visibility toggle
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
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
  Slide,
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
  CheckCircle,
} from '@mui/icons-material';
import { useAuth } from 'contexts/AuthContext';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';

// ─── Feature highlights (right panel) ────────────────────────────────────────
const FEATURES = [
  {
    icon: <Groups sx={{ fontSize: 20, color: '#A78BFA' }} />,
    title: 'إدارة شاملة للمستفيدين',
    desc: 'تتبع كامل لملفات المستفيدين وبرامج التأهيل',
    color: '#A78BFA',
  },
  {
    icon: <TrendingUp sx={{ fontSize: 20, color: '#6EE7B7' }} />,
    title: 'تقارير وإحصاءات متقدمة',
    desc: 'لوحات معلومات تفاعلية بمؤشرات أداء دقيقة',
    color: '#6EE7B7',
  },
  {
    icon: <AutoAwesome sx={{ fontSize: 20, color: '#FCD34D' }} />,
    title: 'ذكاء اصطناعي متكامل',
    desc: 'توصيات آلية وتحليل بيانات بتقنية AI',
    color: '#FCD34D',
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '+500', label: 'مستفيد' },
  { value: '99.9%', label: 'وقت التشغيل' },
  { value: '+30', label: 'وحدة إدارية' },
];

// ─── Animated floating blob ───────────────────────────────────────────────────
function FloatingBlob({ size, top, left, right, bottom, opacity, delay, color }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        width: size,
        height: size,
        top,
        left,
        right,
        bottom,
        borderRadius: '50%',
        background: color || 'rgba(99,102,241,0.18)',
        filter: 'blur(60px)',
        opacity,
        animation: `blobFloat ${4 + delay * 0.8}s ease-in-out infinite alternate`,
        '@keyframes blobFloat': {
          from: { transform: 'translate(0, 0) scale(1)' },
          to:   { transform: `translate(${delay % 2 === 0 ? '-12px' : '12px'}, -16px) scale(1.06)` },
        },
        animationDelay: `${delay}s`,
        pointerEvents: 'none',
        willChange: 'transform',
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
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    if (process.env.NODE_ENV === 'development') {
      setForm({ email: 'admin@alawael.org', password: 'Admin@123' });
    }
    return () => clearTimeout(t);
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
      const result = await login?.(form.email, form.password);
      if (result?.success) {
        showSnackbar?.('مرحباً بك في نظام مراكز الأوائل', 'success');
        navigate('/dashboard', { replace: true });
      } else {
        const msg = result?.error || '';
        if (msg.includes('Invalid') || msg.includes('credentials') || msg.includes('password') || msg.includes('غير صحيح')) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else if (msg.includes('network') || msg.includes('Network') || msg.includes('الاتصال')) {
          setError('تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت');
        } else {
          setError(msg || 'حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى');
        }
      }
    } catch (err) {
      logger.error('Login failed', err);
      setError('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى');
    } finally {
      setLoading(false);
    }
  };

  // Shared input styles
  const inputSx = (fieldName) => ({
    borderRadius: '12px',
    backgroundColor: focusedField === fieldName ? '#FFFFFF' : '#F8FAFC',
    border: `1.5px solid ${focusedField === fieldName ? '#6366F1' : (error ? '#F43F5E' : '#E2E8F0')}`,
    boxShadow: focusedField === fieldName ? `0 0 0 3px ${alpha('#6366F1', 0.12)}` : 'none',
    transition: 'all 0.2s ease',
    '& fieldset': { border: 'none' },
    '& input': { fontSize: '0.9375rem', py: 1.375 },
    '& .MuiInputBase-root': { borderRadius: '12px' },
  });

  // ── Layout ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        backgroundColor: '#080E1A',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        overflow: 'hidden',
      }}
    >
      {/* ── RIGHT PANEL — Brand/Visual ─────────────────────────────────────── */}
      {!isMobile && (
        <Box
          sx={{
            flex: '0 0 56%',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, #060D1F 0%, #0D1B40 25%, #1A1060 55%, #2D0A5E 80%, #3B0764 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 6,
          }}
        >
          {/* Animated blobs */}
          <FloatingBlob size={420} top="-120px" right="-100px" opacity={0.5} delay={0}   color="rgba(79,70,229,0.25)" />
          <FloatingBlob size={320} bottom="-80px" left="-80px"  opacity={0.45} delay={1.2} color="rgba(109,40,217,0.22)" />
          <FloatingBlob size={220} top="38%"   right="8%"     opacity={0.35} delay={2.4} color="rgba(245,158,11,0.1)" />
          <FloatingBlob size={160} top="12%"   left="15%"     opacity={0.25} delay={0.6} color="rgba(16,185,129,0.12)" />
          <FloatingBlob size={100} bottom="20%" right="25%"   opacity={0.2}  delay={1.8} color="rgba(14,165,233,0.15)" />

          {/* Dot mesh grid */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              pointerEvents: 'none',
            }}
          />

          {/* Subtle scan-line effect */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(0deg, transparent 50%, rgba(255,255,255,0.015) 50%)',
              backgroundSize: '100% 4px',
              pointerEvents: 'none',
            }}
          />

          {/* Bottom glow */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(0deg, rgba(99,102,241,0.12) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          <Fade in={mounted} timeout={900}>
            <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 460, width: '100%' }}>

              {/* Logo */}
              <Slide in={mounted} direction="down" timeout={600}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 5 }}>
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '16px',
                      background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 32px rgba(99,102,241,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        borderRadius: '16px 16px 0 0',
                      },
                    }}
                  >
                    <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.5rem', fontFamily: 'Cairo', position: 'relative' }}>
                      أ
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.2, fontFamily: 'Cairo', letterSpacing: '-0.01em' }}>
                      مراكز الأوائل
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.78rem', letterSpacing: '0.04em', mt: 0.2 }}>
                      نظام الإدارة المتكامل
                    </Typography>
                  </Box>
                </Box>
              </Slide>

              {/* Headline */}
              <Typography
                sx={{
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '2.25rem',
                  lineHeight: 1.25,
                  mb: 1.5,
                  fontFamily: 'Cairo',
                  letterSpacing: '-0.02em',
                }}
              >
                إدارة احترافية
                <br />
                <Box
                  component="span"
                  sx={{
                    background: 'linear-gradient(135deg, #818CF8 0%, #C4B5FD 50%, #A78BFA 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  لمراكز التأهيل
                </Box>
              </Typography>

              <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9375rem', lineHeight: 1.75, mb: 5, maxWidth: 380 }}>
                منصة شاملة لإدارة المستفيدين، الموارد البشرية، والخدمات المالية وفق رؤية 2030
              </Typography>

              {/* Feature cards */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
                {FEATURES.map((f, i) => (
                  <Fade key={i} in={mounted} timeout={700 + i * 180}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        p: 2,
                        borderRadius: '14px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(12px)',
                        transition: 'all 0.25s ease',
                        cursor: 'default',
                        '&:hover': {
                          background: 'rgba(255,255,255,0.07)',
                          border: `1px solid ${f.color}28`,
                          transform: 'translateX(-4px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '11px',
                          background: `${f.color}18`,
                          border: `1px solid ${f.color}25`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {f.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ color: 'rgba(255,255,255,0.88)', fontWeight: 600, fontSize: '0.875rem', mb: 0.2, lineHeight: 1.3 }}>
                          {f.title}
                        </Typography>
                        <Typography sx={{ color: 'rgba(255,255,255,0.42)', fontSize: '0.78rem', lineHeight: 1.5 }}>
                          {f.desc}
                        </Typography>
                      </Box>
                      <CheckCircle sx={{ fontSize: 16, color: `${f.color}80`, flexShrink: 0 }} />
                    </Box>
                  </Fade>
                ))}
              </Box>

              {/* Stats row */}
              <Fade in={mounted} timeout={1400}>
                <Box
                  sx={{
                    mt: 4,
                    display: 'flex',
                    gap: 0,
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  {STATS.map((s, i) => (
                    <Box
                      key={i}
                      sx={{
                        flex: 1,
                        py: 1.75,
                        textAlign: 'center',
                        borderRight: i < STATS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                      }}
                    >
                      <Typography sx={{ color: '#FFFFFF', fontWeight: 800, fontSize: '1.25rem', fontFamily: 'Cairo' }}>
                        {s.value}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', mt: 0.2 }}>
                        {s.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Fade>

              {/* Security badge */}
              <Fade in={mounted} timeout={1600}>
                <Box
                  sx={{
                    mt: 3,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 2,
                    py: 1,
                    borderRadius: '100px',
                    background: 'rgba(16,185,129,0.1)',
                    border: '1px solid rgba(16,185,129,0.2)',
                  }}
                >
                  <ShieldIcon sx={{ fontSize: 14, color: '#34D399' }} />
                  <Typography sx={{ color: '#6EE7B7', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                    نظام آمن ومعتمد • ISO 27001 • رؤية 2030
                  </Typography>
                </Box>
              </Fade>
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
          p: { xs: 3, md: 5 },
          position: 'relative',
          minHeight: '100vh',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background pattern */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        {/* Mobile logo */}
        {isMobile && (
          <Box sx={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
              }}
            >
              <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.15rem' }}>أ</Typography>
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>مراكز الأوائل</Typography>
              <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8' }}>نظام الإدارة المتكامل</Typography>
            </Box>
          </Box>
        )}

        <Fade in={mounted} timeout={500}>
          <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

            {/* Welcome header */}
            <Box sx={{ mb: 4.5 }}>
              {!isMobile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Box sx={{ width: 28, height: 3, borderRadius: 2, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)' }} />
                  <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366F1', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    نظام مراكز الأوائل
                  </Typography>
                </Box>
              )}
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '1.75rem', md: '2rem' },
                  color: '#0F172A',
                  lineHeight: 1.2,
                  mb: 0.75,
                  fontFamily: 'Cairo',
                  letterSpacing: '-0.02em',
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
                  sx={{
                    mb: 3,
                    borderRadius: '12px',
                    border: '1px solid rgba(244,63,94,0.2)',
                    backgroundColor: '#FFF1F2',
                    '& .MuiAlert-icon': { color: '#F43F5E' },
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} noValidate>

              {/* Email */}
              <Box sx={{ mb: 2.5 }}>
                <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151', mb: 0.875, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  البريد الإلكتروني
                </Typography>
                <TextField
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="admin@alawael.org"
                  fullWidth
                  size="medium"
                  disabled={loading}
                  error={Boolean(error)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ fontSize: 17, color: focusedField === 'email' ? '#6366F1' : '#CBD5E1', transition: 'color 0.2s' }} />
                      </InputAdornment>
                    ),
                    sx: inputSx('email'),
                  }}
                />
              </Box>

              {/* Password */}
              <Box sx={{ mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.875 }}>
                  <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>
                    كلمة المرور
                  </Typography>
                  <Link
                    href="/forgot-password"
                    sx={{
                      fontSize: '0.8125rem',
                      color: '#6366F1',
                      textDecoration: 'none',
                      fontWeight: 500,
                      transition: 'color 0.15s',
                      '&:hover': { color: '#4F46E5' },
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
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  fullWidth
                  size="medium"
                  disabled={loading}
                  error={Boolean(error)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ fontSize: 17, color: focusedField === 'password' ? '#6366F1' : '#CBD5E1', transition: 'color 0.2s' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPwd((v) => !v)}
                          edge="end"
                          size="small"
                          sx={{
                            color: '#CBD5E1',
                            borderRadius: '8px',
                            '&:hover': { color: '#6366F1', backgroundColor: alpha('#6366F1', 0.08) },
                          }}
                        >
                          {showPwd ? <VisibilityOff sx={{ fontSize: 17 }} /> : <Visibility sx={{ fontSize: 17 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: inputSx('password'),
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
                      color: '#E2E8F0',
                      borderRadius: '4px',
                      '&.Mui-checked': { color: '#6366F1' },
                      p: 0.75,
                    }}
                  />
                }
                label={
                  <Typography sx={{ fontSize: '0.8125rem', color: '#64748B' }}>
                    تذكرني لمدة 30 يوماً
                  </Typography>
                }
                sx={{ mb: 3.5, mr: 0 }}
              />

              {/* Submit button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  height: 52,
                  borderRadius: '13px',
                  fontSize: '1rem',
                  fontWeight: 700,
                  fontFamily: 'Cairo',
                  letterSpacing: '0.01em',
                  background: loading
                    ? '#E2E8F0'
                    : 'linear-gradient(135deg, #4F46E5 0%, #6D28D9 100%)',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.25s ease',
                  '&::before': !loading ? {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '50%',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '13px 13px 0 0',
                  } : {},
                  '&:hover': !loading ? {
                    background: 'linear-gradient(135deg, #4338CA 0%, #5B21B6 100%)',
                    boxShadow: '0 8px 28px rgba(99,102,241,0.5)',
                    transform: 'translateY(-2px)',
                  } : {},
                  '&:active': { transform: 'translateY(0)', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' },
                  '&.Mui-disabled': {
                    background: '#F1F5F9',
                    boxShadow: 'none',
                    color: '#94A3B8',
                  },
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={18} sx={{ color: '#94A3B8' }} />
                    <span>جارٍ تسجيل الدخول...</span>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <LoginIcon sx={{ fontSize: 18 }} />
                    تسجيل الدخول
                  </Box>
                )}
              </Button>
            </Box>

            {/* Divider */}
            <Divider
              sx={{
                my: 3.5,
                '&::before, &::after': { borderColor: '#F1F5F9' },
                '& .MuiDivider-wrapper': { px: 2 },
              }}
            >
              <Typography variant="caption" sx={{ color: '#CBD5E1', fontSize: '0.75rem', fontWeight: 500 }}>
                نظام مراكز الأوائل
              </Typography>
            </Divider>

            {/* Dev hint */}
            {process.env.NODE_ENV === 'development' && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, rgba(139,92,246,0.04) 100%)',
                  border: `1px solid ${alpha('#6366F1', 0.12)}`,
                  textAlign: 'center',
                }}
              >
                <Typography sx={{ fontSize: '0.75rem', color: '#6366F1', fontWeight: 700, mb: 0.75 }}>
                  🔧 بيئة التطوير
                </Typography>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: '6px',
                    backgroundColor: alpha('#6366F1', 0.08),
                  }}
                >
                  <Typography sx={{ fontSize: '0.72rem', color: '#6366F1', fontFamily: 'monospace' }}>
                    admin@alawael.org
                  </Typography>
                  <Box sx={{ width: 1, height: 12, backgroundColor: alpha('#6366F1', 0.25) }} />
                  <Typography sx={{ fontSize: '0.72rem', color: '#6366F1', fontFamily: 'monospace' }}>
                    Admin@123
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Footer */}
            <Typography
              sx={{
                mt: 4,
                textAlign: 'center',
                fontSize: '0.75rem',
                color: '#CBD5E1',
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
