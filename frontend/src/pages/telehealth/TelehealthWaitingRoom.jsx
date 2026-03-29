/**
 * TelehealthWaitingRoom — غرفة انتظار المرضى
 *
 * Shows today's queue of scheduled and in-progress sessions with countdown timers,
 * priority badges, and quick actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Chip, IconButton, Alert,
  LinearProgress, Card, CardContent, CardActions, Divider,
  Tooltip, Badge,
} from '@mui/material';
import {
  People as PeopleIcon,
  VideoCall as VideoCallIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import telehealthService from '../../services/telehealthService';

const priorityColors = { normal: '#4caf50', high: '#ff9800', urgent: '#f44336' };
const priorityLabels = { normal: 'عادي', high: 'مرتفع', urgent: 'عاجل' };

export default function TelehealthWaitingRoom() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [waitingList, setWaitingList] = useState([]);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  const fetchWaiting = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await telehealthService.getWaitingRoom();
      if (data.success) setWaitingList(data.data);
    } catch {
      setError('فشل تحميل قائمة الانتظار');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWaiting(); }, [fetchWaiting]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWaiting();
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchWaiting]);

  // Clock ticker
  useEffect(() => {
    const ticker = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const getTimeUntil = (dateStr) => {
    const target = new Date(dateStr);
    const diff = target - now;
    if (diff <= 0) return { text: 'الآن', past: true };
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return { text: `بعد ${hrs} ساعة و ${mins % 60} دقيقة`, past: false };
    return { text: `بعد ${mins} دقيقة`, past: false };
  };

  const handleStartSession = async (id) => {
    try {
      const { data } = await telehealthService.startSession(id);
      if (data.success && data.data?.room?.joinUrl) {
        navigate(`/telehealth/video-room/${id}`);
      }
      fetchWaiting();
    } catch {
      setError('فشل بدء الجلسة');
    }
  };

  const handleJoinSession = (session) => {
    if (session.roomUrl) {
      navigate(`/telehealth/video-room/${session.id}`);
    }
  };

  const scheduled = waitingList.filter((s) => s.status === 'scheduled');
  const inProgress = waitingList.filter((s) => s.status === 'in-progress');

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/telehealth')}>
            <BackIcon />
          </IconButton>
          <PeopleIcon color="primary" fontSize="large" />
          <Typography variant="h5" fontWeight="bold">غرفة الانتظار</Typography>
          <Chip
            label={now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
        <Box>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchWaiting}><RefreshIcon /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4}>
          <Card sx={{ textAlign: 'center', borderTop: '3px solid #1976d2' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="h4" fontWeight="bold">{waitingList.length}</Typography>
              <Typography variant="body2" color="text.secondary">إجمالي اليوم</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={4}>
          <Card sx={{ textAlign: 'center', borderTop: '3px solid #ed6c02' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{inProgress.length}</Typography>
              <Typography variant="body2" color="text.secondary">جلسات نشطة</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ textAlign: 'center', borderTop: '3px solid #0288d1' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="h4" fontWeight="bold" color="info.main">{scheduled.length}</Typography>
              <Typography variant="body2" color="text.secondary">في الانتظار</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* In-progress Sessions */}
      {inProgress.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge badgeContent={inProgress.length} color="warning">
              <VideoCallIcon color="warning" />
            </Badge>
            جلسات نشطة الآن
          </Typography>
          <Grid container spacing={2}>
            {inProgress.map((s) => (
              <Grid item xs={12} sm={6} md={4} key={s.id}>
                <Card
                  sx={{
                    borderLeft: '4px solid #ed6c02',
                    bgcolor: '#fff3e0',
                    animation: 'pulse 3s infinite',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{s.title}</Typography>
                      <Chip label="مباشر" color="warning" size="small" />
                    </Box>
                    <Typography variant="body2">👤 {s.patientName}</Typography>
                    <Typography variant="body2">🩺 {s.therapistName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      🏥 {s.department || 'غير محدد'} — {s.duration} دقيقة
                    </Typography>
                    <Chip
                      label={s.platform}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<VideoCallIcon />}
                      onClick={() => handleJoinSession(s)}
                      fullWidth
                    >
                      انضمام للجلسة
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Scheduled (Waiting) */}
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Badge badgeContent={scheduled.length} color="info">
          <ScheduleIcon color="info" />
        </Badge>
        قائمة الانتظار
      </Typography>

      {scheduled.length === 0 && !loading && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PeopleIcon sx={{ fontSize: 60, opacity: 0.2 }} />
          <Typography color="text.secondary" sx={{ mt: 1 }}>لا يوجد مرضى في الانتظار حالياً</Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {scheduled
          .sort((a, b) => {
            // Urgent first, then by time
            const pOrder = { urgent: 0, high: 1, normal: 2 };
            const pDiff = (pOrder[a.priority] || 2) - (pOrder[b.priority] || 2);
            if (pDiff !== 0) return pDiff;
            return new Date(a.scheduledDate) - new Date(b.scheduledDate);
          })
          .map((s, idx) => {
            const timeInfo = getTimeUntil(s.scheduledDate);
            return (
              <Grid item xs={12} sm={6} md={4} key={s.id}>
                <Card
                  sx={{
                    borderLeft: `4px solid ${priorityColors[s.priority] || '#4caf50'}`,
                    position: 'relative',
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={`#${idx + 1}`} size="small" color="primary" />
                      <Chip
                        label={priorityLabels[s.priority] || s.priority}
                        size="small"
                        sx={{ bgcolor: priorityColors[s.priority], color: '#fff' }}
                      />
                    </Box>
                    <Typography variant="subtitle1" fontWeight="bold">{s.title}</Typography>
                    <Typography variant="body2">👤 {s.patientName}</Typography>
                    <Typography variant="body2">🩺 {s.therapistName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      🏥 {s.department || 'غير محدد'}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TimeIcon fontSize="small" color={timeInfo.past ? 'error' : 'action'} />
                        <Typography
                          variant="body2"
                          color={timeInfo.past ? 'error' : 'text.secondary'}
                          fontWeight={timeInfo.past ? 'bold' : 'normal'}
                        >
                          {timeInfo.text}
                        </Typography>
                      </Box>
                      <Typography variant="caption">{s.duration} د</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" dir="ltr">
                      {new Date(s.scheduledDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayIcon />}
                      onClick={() => handleStartSession(s.id)}
                      fullWidth
                    >
                      بدء الجلسة
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
      </Grid>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </Box>
  );
}
