/**
 * TelehealthRecordingsPage — تسجيلات وتقارير الجلسات
 *
 * View completed sessions, session reports, recordings, engagement analysis.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Button, TextField, Chip, IconButton,
  Alert, LinearProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Card, CardContent, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Rating, Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  PlayCircle as PlayIcon,
  VideoLibrary as RecordingIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  Timer as TimerIcon,
  Download as DownloadIcon,
  Psychology as AIIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import telehealthService from '../../services/telehealthService';

export default function TelehealthRecordingsPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [report, setReport] = useState(null);
  const [engagement, setEngagement] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const fetchCompleted = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await telehealthService.getSessions({ status: 'completed', limit: 100 });
      if (data.success) setSessions(data.data);
    } catch {
      setError('فشل تحميل الجلسات المكتملة');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompleted(); }, [fetchCompleted]);

  const filtered = sessions.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.title || '').toLowerCase().includes(q) ||
      (s.patientName || '').toLowerCase().includes(q) ||
      (s.therapistName || '').toLowerCase().includes(q)
    );
  });

  const handleViewReport = async (session) => {
    setSelectedSession(session);
    setReport(null);
    setEngagement(null);
    setReportOpen(true);
    try {
      const [reportRes, engagementRes] = await Promise.allSettled([
        telehealthService.getSessionReport(session.id),
        telehealthService.analyzeEngagement(session.id),
      ]);
      if (reportRes.status === 'fulfilled' && reportRes.value.data.success)
        setReport(reportRes.value.data.data);
      if (engagementRes.status === 'fulfilled' && engagementRes.value.data.success)
        setEngagement(engagementRes.value.data.data);
    } catch { /* silent */ }
  };

  const stats = {
    total: sessions.length,
    avgDuration: sessions.length > 0 ? Math.round(sessions.reduce((s, i) => s + (i.duration || 0), 0) / sessions.length) : 0,
    avgRating: sessions.filter(s => s.rating).length > 0
      ? (sessions.filter(s => s.rating).reduce((s, i) => s + i.rating, 0) / sessions.filter(s => s.rating).length).toFixed(1)
      : 0,
    withRecording: sessions.filter(s => s.recordingUrl || s.status === 'completed').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">📼 تسجيلات وتقارير الجلسات</Typography>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchCompleted}><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'جلسات مكتملة', value: stats.total, icon: <RecordingIcon />, color: '#2e7d32' },
          { label: 'متوسط المدة', value: `${stats.avgDuration} د`, icon: <TimerIcon />, color: '#0288d1' },
          { label: 'متوسط التقييم', value: stats.avgRating, icon: <StarIcon />, color: '#f9a825' },
          { label: 'تسجيلات متاحة', value: stats.withRecording, icon: <PlayIcon />, color: '#9c27b0' },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <CardContent sx={{ py: 1.5 }}>
                <Typography variant="h5" fontWeight="bold">{s.value}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth size="small" placeholder="بحث في التسجيلات..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
      </Paper>

      {/* Table */}
      {loading ? <LinearProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                <TableCell>العنوان</TableCell>
                <TableCell>المريض</TableCell>
                <TableCell>المعالج</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>المدة</TableCell>
                <TableCell>التقييم</TableCell>
                <TableCell align="center">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>{s.patientName}</TableCell>
                  <TableCell>{s.therapistName}</TableCell>
                  <TableCell dir="ltr">
                    {new Date(s.completedAt || s.scheduledDate).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell>{s.duration} د</TableCell>
                  <TableCell>
                    {s.rating ? <Rating value={s.rating} readOnly size="small" /> : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التقرير">
                      <IconButton size="small" color="primary" onClick={() => handleViewReport(s)}>
                        <ReportIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">لا توجد تسجيلات</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Report Dialog */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          📊 تقرير الجلسة — {selectedSession?.title}
        </DialogTitle>
        <DialogContent>
          {!report && !engagement && <LinearProgress />}

          {report && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="h6" gutterBottom>معلومات الجلسة</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>المريض:</strong> {report.patientName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>المعالج:</strong> {report.therapistName}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>التاريخ:</strong> {new Date(report.scheduledDate).toLocaleDateString('ar-SA')}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2"><strong>المدة:</strong> {report.duration} دقيقة</Typography>
                </Grid>
                {report.rating && (
                  <Grid item xs={12}>
                    <Typography variant="body2"><strong>التقييم:</strong></Typography>
                    <Rating value={report.rating} readOnly />
                  </Grid>
                )}
              </Grid>

              {report.notes?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>ملاحظات الجلسة ({report.notes.length})</Typography>
                  {report.notes.map((n, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 1, mb: 1 }}>
                      <Typography variant="body2">{n.content}</Typography>
                      <Typography variant="caption" color="text.secondary">{n.author} — {new Date(n.timestamp).toLocaleTimeString('ar-SA')}</Typography>
                    </Paper>
                  ))}
                </>
              )}

              {report.vitals?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>العلامات الحيوية ({report.vitals.length})</Typography>
                  {report.vitals.map((v, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      {v.heartRate && <Chip label={`نبض: ${v.heartRate}`} size="small" color="error" variant="outlined" />}
                      {v.bloodPressure && <Chip label={`ضغط: ${v.bloodPressure}`} size="small" variant="outlined" />}
                      {v.oxygenSaturation && <Chip label={`أكسجين: ${v.oxygenSaturation}%`} size="small" color="info" variant="outlined" />}
                      {v.temperature && <Chip label={`حرارة: ${v.temperature}°C`} size="small" color="warning" variant="outlined" />}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          )}

          {engagement && (
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                <AIIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                تحليل الذكاء الاصطناعي
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">{engagement.attentionScore || '—'}</Typography>
                      <Typography variant="body2">درجة الانتباه</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Chip label={engagement.engagementLevel || '—'} color="success" />
                      <Typography variant="body2" sx={{ mt: 1 }}>مستوى التفاعل</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              {engagement.insights?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">الملاحظات:</Typography>
                  {engagement.insights.map((insight, i) => (
                    <Typography key={i} variant="body2" sx={{ ml: 2 }}>• {insight}</Typography>
                  ))}
                </Box>
              )}
              {engagement.recommendation && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <strong>التوصية:</strong> {engagement.recommendation}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
