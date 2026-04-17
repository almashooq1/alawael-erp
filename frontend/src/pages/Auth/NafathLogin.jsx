/**
 * NafathLogin — /login/nafath page.
 *
 * Saudi Nafath SSO login flow:
 *   1. User enters national ID
 *   2. Backend initiates Nafath request → we show 2-digit random number
 *   3. User opens Nafath mobile app, taps the matching number
 *   4. We poll /status until APPROVED → store token → redirect to dashboard
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  LinearProgress,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import api from '../../services/api.client';

const POLL_INTERVAL_MS = 2000;

export default function NafathLogin() {
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [request, setRequest] = useState(null); // {requestId, randomNumber, expiresAt, mode}
  const [status, setStatus] = useState('IDLE'); // IDLE | PENDING | APPROVED | REJECTED | EXPIRED | ERROR
  const [finalMessage, setFinalMessage] = useState('');
  const [remainingSec, setRemainingSec] = useState(0);
  const pollRef = useRef(null);
  const clockRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (clockRef.current) {
      clearInterval(clockRef.current);
      clockRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const initiate = async () => {
    setErr('');
    setFinalMessage('');
    if (!/^[12]\d{9}$/.test(nationalId)) {
      setErr('أدخل رقم هوية وطنية صحيحاً (10 أرقام يبدأ بـ 1 أو 2)');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/nafath/initiate', { nationalId });
      setRequest({
        requestId: data.requestId,
        randomNumber: data.randomNumber,
        expiresAt: data.expiresAt,
        mode: data.mode,
      });
      setStatus('PENDING');
      if (data.message) setFinalMessage(data.message);

      // Start polling
      pollRef.current = setInterval(() => pollStatus(data.requestId), POLL_INTERVAL_MS);
      // Countdown
      clockRef.current = setInterval(() => {
        const left = Math.max(
          0,
          Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000)
        );
        setRemainingSec(left);
      }, 1000);
      setRemainingSec(
        Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000))
      );
    } catch (e) {
      setErr(e?.response?.data?.message || 'تعذّر بدء طلب نفاذ');
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async requestId => {
    try {
      const { data } = await api.get(`/auth/nafath/status/${requestId}`);
      if (data.status === 'PENDING') return;

      stopPolling();
      setStatus(data.status);

      if (data.status === 'APPROVED' && data.token && data.user) {
        // Store token under multiple known keys for compatibility with existing shell
        try {
          localStorage.setItem('token', data.token);
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          localStorage.setItem('currentUser', JSON.stringify(data.user));
        } catch {
          /* ignore storage errors */
        }
        setFinalMessage('تم التحقق بنجاح — جارٍ التحويل…');
        setTimeout(() => {
          const role = data.user?.role || '';
          if (['parent', 'guardian'].includes(role)) navigate('/my-children');
          else if (['therapist', 'specialist', 'clinical_supervisor'].includes(role))
            navigate('/workbench');
          else navigate('/dashboard');
        }, 1200);
      } else if (data.status === 'APPROVED' && data.needsOnboarding) {
        setFinalMessage(
          data.message || 'تم التحقق من هويتك، لكن لا يوجد حساب مرتبط. تواصل مع الإدارة.'
        );
      } else if (data.status === 'REJECTED') {
        setFinalMessage('رفضت الطلب في تطبيق نفاذ.');
      } else if (data.status === 'EXPIRED') {
        setFinalMessage('انتهت مهلة الطلب. حاول مرة أخرى.');
      } else if (data.status === 'ERROR') {
        setFinalMessage('حدث خطأ أثناء التحقق.');
      }
    } catch (e) {
      // Silent — keep polling
      if (e?.response?.status === 404) {
        stopPolling();
        setStatus('ERROR');
        setFinalMessage('لم يُعثر على الطلب.');
      }
    }
  };

  const cancel = async () => {
    if (!request?.requestId) return;
    try {
      await api.post(`/auth/nafath/cancel/${request.requestId}`, {});
    } catch {
      /* ignore */
    }
    stopPolling();
    reset();
  };

  const reset = () => {
    setRequest(null);
    setStatus('IDLE');
    setFinalMessage('');
    setErr('');
    setRemainingSec(0);
  };

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;

  return (
    <Container maxWidth="sm" sx={{ py: 6 }} dir="rtl">
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Stack alignItems="center" spacing={2} mb={2}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FingerprintIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h4" fontWeight="bold">
            تسجيل الدخول عبر نفاذ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            الدخول الموحَّد الرسمي عبر الهوية الرقمية السعودية.
          </Typography>
          {request?.mode === 'mock' && (
            <Chip size="small" color="warning" label="وضع المحاكاة (تطوير)" />
          )}
        </Stack>

        {err && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>
            {err}
          </Alert>
        )}

        {status === 'IDLE' && (
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="رقم الهوية الوطنية"
              placeholder="1XXXXXXXXX أو 2XXXXXXXXX"
              value={nationalId}
              onChange={e => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputProps={{ inputMode: 'numeric', maxLength: 10 }}
              autoFocus
            />
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={initiate}
              disabled={loading || !nationalId}
              startIcon={
                loading ? <CircularProgress size={20} color="inherit" /> : <FingerprintIcon />
              }
            >
              {loading ? 'جارٍ البدء…' : 'بدء التحقق عبر نفاذ'}
            </Button>
            <Divider />
            <Typography variant="caption" color="text.secondary">
              نصيحة للتطوير: انهي رقم الهوية بـ <code>99</code> لمحاكاة الرفض، بـ <code>88</code>{' '}
              لمحاكاة الانتهاء.
            </Typography>
          </Stack>
        )}

        {status === 'PENDING' && request && (
          <Stack spacing={3}>
            <HourglassEmptyIcon sx={{ fontSize: 64, color: 'warning.main', mx: 'auto' }} />
            <Typography variant="h6">في انتظار اعتمادك في تطبيق نفاذ</Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                bgcolor: 'primary.main',
                color: 'white',
                display: 'inline-block',
                mx: 'auto',
              }}
            >
              <Typography variant="caption" display="block">
                الرقم المطلوب
              </Typography>
              <Typography variant="h2" fontWeight="bold" sx={{ letterSpacing: 8 }}>
                {request.randomNumber}
              </Typography>
            </Paper>
            <Typography variant="body2" color="text.secondary">
              افتح تطبيق نفاذ على جوالك، ستجد طلباً معلَّقاً. اضغط على الرقم{' '}
              <strong>{request.randomNumber}</strong> لاعتماد تسجيل الدخول.
            </Typography>
            <LinearProgress variant="determinate" value={((900 - remainingSec) / 900) * 100} />
            <Typography variant="caption" color="text.secondary">
              الوقت المتبقي: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
            </Typography>
            {finalMessage && (
              <Alert severity="info" sx={{ textAlign: 'right' }}>
                {finalMessage}
              </Alert>
            )}
            <Button onClick={cancel} color="inherit">
              إلغاء الطلب
            </Button>
          </Stack>
        )}

        {status === 'APPROVED' && (
          <Stack spacing={2} alignItems="center">
            <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main' }} />
            <Typography variant="h6" color="success.main">
              تم التحقق بنجاح
            </Typography>
            {finalMessage && <Alert severity="success">{finalMessage}</Alert>}
            <LinearProgress sx={{ width: '80%' }} />
          </Stack>
        )}

        {(status === 'REJECTED' || status === 'EXPIRED' || status === 'ERROR') && (
          <Stack spacing={2} alignItems="center">
            <ErrorIcon sx={{ fontSize: 72, color: 'error.main' }} />
            <Typography variant="h6" color="error.main">
              {status === 'REJECTED'
                ? 'تم رفض الطلب'
                : status === 'EXPIRED'
                  ? 'انتهت مهلة الطلب'
                  : 'حدث خطأ'}
            </Typography>
            {finalMessage && <Alert severity="error">{finalMessage}</Alert>}
            <Button variant="contained" onClick={reset}>
              المحاولة مرة أخرى
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
