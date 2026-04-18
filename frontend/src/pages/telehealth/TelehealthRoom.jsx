/**
 * TelehealthRoom — /telehealth/:sessionId page.
 *
 * Video meeting view. Shows Jitsi embed when joined, with controls to
 * open in new tab or end (therapist). Uses external Jitsi API script
 * loaded on demand so the page is usable even if CSP blocks iframe.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Chip,
  Paper,
  Alert,
  LinearProgress,
  IconButton,
  Divider,
  Grid,
  CircularProgress,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CallEndIcon from '@mui/icons-material/CallEnd';
import VideocamIcon from '@mui/icons-material/Videocam';
import PersonIcon from '@mui/icons-material/Person';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import api from '../../services/api.client';

function fullName(x) {
  if (!x) return '';
  return x.firstName_ar || x.fullName || `${x.firstName || ''} ${x.lastName || ''}`.trim() || '';
}
function formatDate(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString('ar-SA');
  } catch {
    return '—';
  }
}

function loadJitsiScript() {
  return new Promise((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve(window.JitsiMeetExternalAPI);
    const existing = document.getElementById('jitsi-external-api');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.JitsiMeetExternalAPI));
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.id = 'jitsi-external-api';
    s.src = 'https://meet.jit.si/external_api.js';
    s.async = true;
    s.onload = () => resolve(window.JitsiMeetExternalAPI);
    s.onerror = reject;
    document.body.appendChild(s);
  });
}

export default function TelehealthRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinInfo, setJoinInfo] = useState(null);
  const [embedReady, setEmbedReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const embedRef = useRef(null);
  const apiRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const { data } = await api.get(`/telehealth-v2/sessions/${sessionId}`);
      setSession(data?.data || null);
    } catch (e) {
      setErr(e?.response?.data?.message || 'تعذر تحميل الجلسة');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const isTherapistOrAdmin = useMemo(
    () => session?.joinerRole === 'therapist' || session?.joinerRole === 'admin',
    [session]
  );

  const createRoom = async () => {
    try {
      await api.post(`/telehealth-v2/sessions/${sessionId}/create-room`, { provider: 'jitsi' });
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || 'فشل إنشاء الغرفة');
    }
  };

  const join = async () => {
    setJoining(true);
    try {
      const { data } = await api.post(`/telehealth-v2/sessions/${sessionId}/join`, {});
      setJoinInfo(data);
      // Try embedding
      try {
        const JitsiAPI = await loadJitsiScript();
        if (!embedRef.current) return;
        embedRef.current.innerHTML = '';
        apiRef.current = new JitsiAPI('meet.jit.si', {
          roomName: data.roomName,
          parentNode: embedRef.current,
          width: '100%',
          height: 560,
          userInfo: { displayName: data.displayName || 'مشارك' },
          configOverwrite: {
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            LANG_DETECTION: true,
          },
        });
        apiRef.current.addEventListener('readyToClose', () => {
          setEmbedReady(false);
          try {
            apiRef.current?.dispose();
          } catch {
            /* ignore */
          }
        });
        setEmbedReady(true);
      } catch (embedErr) {
        // Fallback → open in new tab
        window.open(data.roomUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      setErr(e?.response?.data?.message || 'فشل الانضمام');
    } finally {
      setJoining(false);
    }
  };

  const endMeeting = async () => {
    if (!window.confirm('إنهاء الجلسة؟ سيُغلَق الاتصال وتُعتبر الجلسة مكتملة.')) return;
    try {
      await api.post(`/telehealth-v2/sessions/${sessionId}/end`, {});
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          /* ignore */
        }
      }
      setEmbedReady(false);
      setEnded(true);
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || 'فشل الإنهاء');
    }
  };

  useEffect(
    () => () => {
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  if (loading) {
    return (
      <Container sx={{ py: 4 }} dir="rtl">
        <LinearProgress />
      </Container>
    );
  }

  if (err && !session) {
    return (
      <Container sx={{ py: 4 }} dir="rtl">
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
          العودة
        </Button>
      </Container>
    );
  }

  const th = session?.telehealth || {};
  const hasRoom = Boolean(th.enabled && th.roomUrl);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }} dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              جلسة فيديو — {session?.sessionType}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(session?.date)} · {session?.startTime} → {session?.endTime}
            </Typography>
          </Box>
        </Stack>
        <Chip label={session?.status} color="primary" variant="outlined" />
      </Stack>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>
          {err}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 0, overflow: 'hidden', minHeight: 600 }}>
            {!hasRoom ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ height: 600, p: 4, textAlign: 'center' }}
                spacing={2}
              >
                <VideocamIcon sx={{ fontSize: 96, color: 'grey.400' }} />
                <Typography variant="h6">لم يتم إنشاء غرفة اجتماع بعد</Typography>
                <Typography color="text.secondary">
                  {isTherapistOrAdmin
                    ? 'اضغط الزرّ أدناه لإنشاء غرفة Jitsi فورية لهذه الجلسة.'
                    : 'يحتاج المعالج لإنشاء الغرفة. حاول التحديث بعد لحظات.'}
                </Typography>
                {isTherapistOrAdmin && (
                  <Button variant="contained" size="large" onClick={createRoom}>
                    إنشاء غرفة الآن
                  </Button>
                )}
              </Stack>
            ) : ended ? (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ height: 600, p: 4, textAlign: 'center' }}
                spacing={2}
              >
                <CallEndIcon sx={{ fontSize: 96, color: 'error.main' }} />
                <Typography variant="h6">انتهت الجلسة</Typography>
                <Typography color="text.secondary">تم تسجيل الجلسة كمكتملة. شكراً لكم.</Typography>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                  العودة
                </Button>
              </Stack>
            ) : embedReady ? (
              <Box ref={embedRef} sx={{ width: '100%', minHeight: 600 }} />
            ) : (
              <Stack
                alignItems="center"
                justifyContent="center"
                sx={{ height: 600, p: 4, textAlign: 'center' }}
                spacing={2}
              >
                <VideocamIcon sx={{ fontSize: 96, color: 'primary.main' }} />
                <Typography variant="h6">جاهز للانضمام</Typography>
                <Typography color="text.secondary">
                  اضغط على "انضمام" لبدء الجلسة المرئية. إذا تعذّر التضمين، ستُفتح في نافذة جديدة
                  تلقائياً.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={
                    joining ? <CircularProgress size={18} color="inherit" /> : <VideocamIcon />
                  }
                  onClick={join}
                  disabled={joining}
                >
                  انضمام إلى الاجتماع
                </Button>
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" mb={1}>
              المشاركون
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon color="primary" />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {fullName(session?.therapist) || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    المعالج
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center">
                <PersonIcon color="secondary" />
                <Box>
                  <Typography variant="body2" fontWeight={500}>
                    {fullName(session?.beneficiary) || '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    المستفيد
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Paper>

          {hasRoom && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                رابط الاجتماع
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="caption"
                  sx={{ wordBreak: 'break-all', flex: 1, fontFamily: 'monospace', fontSize: 11 }}
                >
                  {th.roomUrl}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    navigator.clipboard?.writeText(th.roomUrl);
                  }}
                  title="نسخ"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Button
                fullWidth
                variant="outlined"
                size="small"
                startIcon={<OpenInNewIcon />}
                onClick={() => window.open(th.roomUrl, '_blank', 'noopener,noreferrer')}
              >
                فتح في نافذة جديدة
              </Button>
            </Paper>
          )}

          {isTherapistOrAdmin && embedReady && (
            <Paper sx={{ p: 2 }}>
              <Button
                fullWidth
                variant="contained"
                color="error"
                startIcon={<CallEndIcon />}
                onClick={endMeeting}
              >
                إنهاء الجلسة
              </Button>
            </Paper>
          )}

          {th.hostJoinedAt && (
            <Paper sx={{ p: 2, mt: 2 }}>
              <Typography variant="subtitle2" mb={1}>
                حالة الاتصال
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                انضمام المعالج: {new Date(th.hostJoinedAt).toLocaleString('ar-SA')}
              </Typography>
              {th.guestJoinedAt && (
                <Typography variant="caption" color="text.secondary" display="block">
                  انضمام المستفيد: {new Date(th.guestJoinedAt).toLocaleString('ar-SA')}
                </Typography>
              )}
              {th.endedAt && (
                <Typography variant="caption" color="success.main" display="block">
                  انتهت: {new Date(th.endedAt).toLocaleString('ar-SA')}
                  {th.durationSeconds
                    ? ` · المدة ${Math.round(th.durationSeconds / 60)} دقيقة`
                    : ''}
                </Typography>
              )}
            </Paper>
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
