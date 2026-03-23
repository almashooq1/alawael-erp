/**
 * TelehealthVideoRoom — غرفة الفيديو للطب عن بُعد
 *
 * Embedded Jitsi / join-URL interface with:
 *  - Vital signs panel
 *  - Session notes
 *  - Chat messages
 *  - Session timer & controls
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, Chip, IconButton,
  Alert, LinearProgress, Divider, Drawer, List, ListItem, ListItemText,
  Avatar, Badge, Tooltip, Card, CardContent, Tab, Tabs,
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  CallEnd as EndCallIcon,
  Mic as MicIcon, MicOff as MicOffIcon,
  Videocam as CamIcon, VideocamOff as CamOffIcon,
  ScreenShare as ScreenShareIcon,
  Chat as ChatIcon, NoteAdd as NoteIcon,
  FavoriteOutlined as HeartIcon,
  Thermostat as TempIcon,
  Send as SendIcon,
  Timer as TimerIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import telehealthService from '../../services/telehealthService';

export default function TelehealthVideoRoom() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0); // 0=chat, 1=notes, 2=vitals
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Chat
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');

  // Notes
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');

  // Vitals
  const [vitals, setVitals] = useState([]);
  const [vitalForm, setVitalForm] = useState({ heartRate: '', bloodPressure: '', oxygenSaturation: '', temperature: '' });

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Media toggles
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const { data } = await telehealthService.getSessionById(sessionId);
      if (data.success) {
        setSession(data.data);
        setMessages(data.data.messages || []);
        setNotes(data.data.sessionNotes || []);
        setVitals(data.data.vitals || []);
      }
    } catch {
      setError('فشل تحميل بيانات الجلسة');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Timer
  useEffect(() => {
    if (session?.status === 'in-progress') {
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [session?.status]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSendMessage = async () => {
    if (!msgInput.trim()) return;
    try {
      const { data } = await telehealthService.sendMessage(sessionId, { content: msgInput });
      if (data.success) setMessages((m) => [...m, data.data]);
      setMsgInput('');
    } catch { /* silent */ }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;
    try {
      const { data } = await telehealthService.addNote(sessionId, { content: noteInput, type: 'observation' });
      if (data.success) setNotes((n) => [...n, data.data]);
      setNoteInput('');
    } catch { /* silent */ }
  };

  const handleRecordVitals = async () => {
    try {
      const payload = {};
      if (vitalForm.heartRate) payload.heartRate = parseInt(vitalForm.heartRate);
      if (vitalForm.bloodPressure) payload.bloodPressure = vitalForm.bloodPressure;
      if (vitalForm.oxygenSaturation) payload.oxygenSaturation = parseInt(vitalForm.oxygenSaturation);
      if (vitalForm.temperature) payload.temperature = parseFloat(vitalForm.temperature);
      const { data } = await telehealthService.recordVitals(sessionId, payload);
      if (data.success) {
        setVitals((v) => [...v, data.data.vital]);
        setVitalForm({ heartRate: '', bloodPressure: '', oxygenSaturation: '', temperature: '' });
        if (data.data.alerts?.length > 0) {
          setError(`⚠️ تنبيه: ${data.data.alerts.map((a) => a.message || a).join(', ')}`);
        }
      }
    } catch { /* silent */ }
  };

  const handleEndSession = async () => {
    try {
      await telehealthService.endSession(sessionId, { notes: 'تم إنهاء الجلسة' });
      clearInterval(timerRef.current);
      navigate('/telehealth/sessions');
    } catch {
      setError('فشل إنهاء الجلسة');
    }
  };

  if (loading) return <LinearProgress />;
  if (error && !session) return <Alert severity="error">{error}</Alert>;

  const joinUrl = session?.roomUrl || searchParams.get('url') || '';

  return (
    <Box sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {error && <Alert severity="warning" onClose={() => setError('')}>{error}</Alert>}

      {/* Top Bar */}
      <Paper
        sx={{
          p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '2px solid #1976d2',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/telehealth/sessions')}>
            <BackIcon />
          </IconButton>
          <VideoCallIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">{session?.title || 'غرفة الفيديو'}</Typography>
          <Chip
            label={session?.status === 'in-progress' ? 'مباشر' : session?.status || '—'}
            color={session?.status === 'in-progress' ? 'error' : 'default'}
            size="small"
            sx={session?.status === 'in-progress' ? { animation: 'pulse 2s infinite' } : {}}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip icon={<TimerIcon />} label={formatTime(elapsed)} color="primary" variant="outlined" />
          <Typography variant="body2" color="text.secondary">
            {session?.patientName} — {session?.therapistName}
          </Typography>
        </Box>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video Area */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              flex: 1, bgcolor: '#1a1a2e', display: 'flex', justifyContent: 'center',
              alignItems: 'center', position: 'relative',
            }}
          >
            {joinUrl ? (
              <iframe
                src={joinUrl}
                title="Telehealth Video"
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; fullscreen; display-capture"
              />
            ) : (
              <Box sx={{ textAlign: 'center', color: '#fff' }}>
                <VideoCallIcon sx={{ fontSize: 80, opacity: 0.3 }} />
                <Typography variant="h6" sx={{ opacity: 0.5, mt: 2 }}>
                  في انتظار بدء الجلسة...
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.3, mt: 1 }}>
                  سيتم فتح غرفة الفيديو عند بدء الجلسة
                </Typography>
              </Box>
            )}
          </Box>

          {/* Controls */}
          <Paper sx={{ p: 1.5, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Tooltip title={micOn ? 'كتم الصوت' : 'تشغيل الصوت'}>
              <IconButton
                onClick={() => setMicOn(!micOn)}
                sx={{ bgcolor: micOn ? 'transparent' : 'error.main', color: micOn ? 'inherit' : '#fff' }}
              >
                {micOn ? <MicIcon /> : <MicOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title={camOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}>
              <IconButton
                onClick={() => setCamOn(!camOn)}
                sx={{ bgcolor: camOn ? 'transparent' : 'error.main', color: camOn ? 'inherit' : '#fff' }}
              >
                {camOn ? <CamIcon /> : <CamOffIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="مشاركة الشاشة">
              <IconButton><ScreenShareIcon /></IconButton>
            </Tooltip>
            <Tooltip title="المحادثة والملاحظات">
              <IconButton onClick={() => setSidebarOpen(!sidebarOpen)} color={sidebarOpen ? 'primary' : 'default'}>
                <ChatIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="error"
              startIcon={<EndCallIcon />}
              onClick={handleEndSession}
              sx={{ borderRadius: 20, px: 3 }}
            >
              إنهاء الجلسة
            </Button>
          </Paper>
        </Box>

        {/* Sidebar */}
        {sidebarOpen && (
          <Paper sx={{ width: 340, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e0e0e0' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="💬 المحادثة" />
              <Tab label="📝 الملاحظات" />
              <Tab label="❤️ العلامات" />
            </Tabs>

            {/* Chat Tab */}
            {tab === 0 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                  {messages.length === 0 && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>لا توجد رسائل</Typography>
                  )}
                  {messages.map((m, i) => (
                    <Box key={i} sx={{ mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="caption" fontWeight="bold">{m.senderName || 'مستخدم'}</Typography>
                      <Typography variant="body2">{m.content}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(m.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
                  <TextField
                    size="small" fullWidth placeholder="اكتب رسالة..."
                    value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <IconButton color="primary" onClick={handleSendMessage}><SendIcon /></IconButton>
                </Box>
              </Box>
            )}

            {/* Notes Tab */}
            {tab === 1 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                  {notes.length === 0 && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>لا توجد ملاحظات</Typography>
                  )}
                  {notes.map((n, i) => (
                    <Card key={i} sx={{ mb: 1 }} variant="outlined">
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Typography variant="body2">{n.content}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {n.author} — {new Date(n.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                <Box sx={{ p: 1, display: 'flex', gap: 1 }}>
                  <TextField
                    size="small" fullWidth multiline maxRows={3} placeholder="أضف ملاحظة..."
                    value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
                  />
                  <IconButton color="primary" onClick={handleAddNote}><NoteIcon /></IconButton>
                </Box>
              </Box>
            )}

            {/* Vitals Tab */}
            {tab === 2 && (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
                  {vitals.length === 0 && (
                    <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                      لا توجد قراءات
                    </Typography>
                  )}
                  {vitals.map((v, i) => (
                    <Card key={i} sx={{ mb: 1 }} variant="outlined">
                      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {v.heartRate && <Chip icon={<HeartIcon />} label={`${v.heartRate} bpm`} size="small" color="error" variant="outlined" />}
                          {v.bloodPressure && <Chip label={`BP: ${v.bloodPressure}`} size="small" variant="outlined" />}
                          {v.oxygenSaturation && <Chip label={`O₂: ${v.oxygenSaturation}%`} size="small" color="info" variant="outlined" />}
                          {v.temperature && <Chip icon={<TempIcon />} label={`${v.temperature}°C`} size="small" color="warning" variant="outlined" />}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(v.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
                <Box sx={{ p: 1 }}>
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <TextField
                        size="small" fullWidth label="نبض القلب" type="number"
                        value={vitalForm.heartRate}
                        onChange={(e) => setVitalForm({ ...vitalForm, heartRate: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        size="small" fullWidth label="ضغط الدم"
                        value={vitalForm.bloodPressure} placeholder="120/80"
                        onChange={(e) => setVitalForm({ ...vitalForm, bloodPressure: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        size="small" fullWidth label="أكسجين %" type="number"
                        value={vitalForm.oxygenSaturation}
                        onChange={(e) => setVitalForm({ ...vitalForm, oxygenSaturation: e.target.value })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        size="small" fullWidth label="حرارة °C" type="number"
                        value={vitalForm.temperature}
                        onChange={(e) => setVitalForm({ ...vitalForm, temperature: e.target.value })}
                        inputProps={{ step: 0.1 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button fullWidth variant="contained" size="small" onClick={handleRecordVitals}>
                        تسجيل العلامات الحيوية
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Box>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </Box>
  );
}
