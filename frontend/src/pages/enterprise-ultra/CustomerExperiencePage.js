/**
 * Customer Experience Management Page
 * صفحة إدارة تجربة العملاء
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Grid, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, Alert, LinearProgress, Stack, IconButton, Rating, Divider,
} from '@mui/material';
import {
  SentimentSatisfiedAlt as CXIcon,
  Add as AddIcon,
  Poll as SurveyIcon,
  Feedback as FeedbackIcon,
  Report as ComplaintIcon,
  Timeline as JourneyIcon,
  Speed as BenchmarkIcon,
  Refresh as RefreshIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  TrendingUp as TrendUpIcon,
} from '@mui/icons-material';
import * as cxService from '../../services/enterpriseUltra.service';

const statusColors = {
  draft: 'default', active: 'success', paused: 'warning', completed: 'primary', archived: 'default',
  new: 'info', acknowledged: 'secondary', in_progress: 'warning', resolved: 'success', closed: 'default',
  open: 'info', escalated: 'error', investigating: 'warning',
  mapped: 'info', optimizing: 'warning', optimized: 'success',
};

const sentimentColors = { positive: 'success', negative: 'error', neutral: 'default', mixed: 'warning' };

export default function CustomerExperiencePage() {
  const [tab, setTab] = useState(0);
  const [surveys, setSurveys] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [journeys, setJourneys] = useState([]);
  const [benchmarks, setBenchmarks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState({ open: false, type: '' });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [surveysRes, feedbackRes, complaintsRes, journeysRes, benchRes, statsRes] = await Promise.all([
        cxService.getCXSurveys(),
        cxService.getCXFeedback(),
        cxService.getCXComplaints(),
        cxService.getCustomerJourneys(),
        cxService.getServiceBenchmarks(),
        cxService.getCXDashboard(),
      ]);
      setSurveys(surveysRes.data?.data || []);
      setFeedback(feedbackRes.data?.data || []);
      setComplaints(complaintsRes.data?.data || []);
      setJourneys(journeysRes.data?.data || []);
      setBenchmarks(benchRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch {
      setError('حدث خطأ في تحميل البيانات');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.type === 'survey') await cxService.createCXSurvey(form);
      else if (dialog.type === 'feedback') await cxService.createCXFeedback(form);
      else if (dialog.type === 'complaint') await cxService.createCXComplaint(form);
      else if (dialog.type === 'journey') await cxService.createCustomerJourney(form);
      else if (dialog.type === 'benchmark') await cxService.createServiceBenchmark(form);
      setDialog({ open: false, type: '' });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const openDialog = (type) => { setDialog({ open: true, type }); setForm({}); setError(''); };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CXIcon color="primary" fontSize="large" /> إدارة تجربة العملاء
          </Typography>
          <Typography variant="body2" color="text.secondary">استبيانات وتحليلات رضا العملاء وإدارة الشكاوى</Typography>
        </Box>
        <IconButton onClick={fetchData}><RefreshIcon /></IconButton>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'معدل الرضا (NPS)', value: stats.nps !== null ? stats.nps : '—', color: '#2e7d32', icon: <ThumbUpIcon /> },
          { label: 'الاستبيانات النشطة', value: stats.activeSurveys || 0, color: '#1976d2', icon: <SurveyIcon /> },
          { label: 'شكاوى مفتوحة', value: stats.openComplaints || 0, color: '#d32f2f', icon: <ComplaintIcon /> },
          { label: 'معدل الحل', value: `${stats.resolutionRate || 0}%`, color: '#9c27b0', icon: <TrendUpIcon /> },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ background: `linear-gradient(135deg, ${s.color}15, ${s.color}08)`, borderLeft: `4px solid ${s.color}` }}>
              <CardContent sx={{ py: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{ color: s.color }}>{s.icon}</Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                    <Typography variant="h5" fontWeight="bold" color={s.color}>{s.value}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`الاستبيانات (${surveys.length})`} icon={<SurveyIcon />} iconPosition="start" />
        <Tab label={`التغذية الراجعة (${feedback.length})`} icon={<FeedbackIcon />} iconPosition="start" />
        <Tab label={`الشكاوى (${complaints.length})`} icon={<ComplaintIcon />} iconPosition="start" />
        <Tab label={`رحلة العميل (${journeys.length})`} icon={<JourneyIcon />} iconPosition="start" />
        <Tab label={`المعايير (${benchmarks.length})`} icon={<BenchmarkIcon />} iconPosition="start" />
      </Tabs>

      {/* Tab 0: Surveys */}
      {tab === 0 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('survey')} sx={{ mb: 2 }}>استبيان جديد</Button>
          <Grid container spacing={2}>
            {surveys.map((s) => (
              <Grid item xs={12} md={4} key={s._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{s.title}</Typography>
                      <Chip size="small" color={statusColors[s.status] || 'default'} label={s.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{s.description}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">النوع: {s.surveyType?.replace(/_/g, ' ')}</Typography><br />
                    <Typography variant="caption">الأسئلة: {s.questions?.length || 0}</Typography><br />
                    <Typography variant="caption">الردود: {s.responseCount || 0}</Typography>
                    {s.averageScore !== null && (
                      <Box mt={1}>
                        <Rating value={s.averageScore / 20} readOnly size="small" precision={0.5} />
                        <Typography variant="caption" sx={{ ml: 1 }}>{s.averageScore}%</Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!surveys.length && <Grid item xs={12}><Alert severity="info">لا توجد استبيانات</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 1: Feedback */}
      {tab === 1 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('feedback')} sx={{ mb: 2 }}>تسجيل تغذية راجعة</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>العميل</TableCell><TableCell>القناة</TableCell><TableCell>المشاعر</TableCell>
                <TableCell>التقييم</TableCell><TableCell>التصنيف</TableCell><TableCell>التاريخ</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {feedback.map((f) => (
                  <TableRow key={f._id} hover>
                    <TableCell>{f.customer?.name || f.customerName || '—'}</TableCell>
                    <TableCell><Chip size="small" label={f.channel?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>
                      <Chip size="small" color={sentimentColors[f.sentiment] || 'default'} label={f.sentiment}
                        icon={f.sentiment === 'positive' ? <ThumbUpIcon /> : f.sentiment === 'negative' ? <ThumbDownIcon /> : undefined} />
                    </TableCell>
                    <TableCell><Rating value={f.rating || 0} readOnly size="small" max={5} /></TableCell>
                    <TableCell>{f.category?.replace(/_/g, ' ') || '—'}</TableCell>
                    <TableCell>{new Date(f.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                  </TableRow>
                ))}
                {!feedback.length && <TableRow><TableCell colSpan={6} align="center">لا توجد تغذية راجعة</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Complaints */}
      {tab === 2 && (
        <Box>
          <Button variant="contained" color="warning" startIcon={<AddIcon />} onClick={() => openDialog('complaint')} sx={{ mb: 2 }}>شكوى جديدة</Button>
          {complaints.filter(c => c.status === 'escalated').length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              يوجد {complaints.filter(c => c.status === 'escalated').length} شكوى مصعّدة تتطلب اهتمام فوري!
            </Alert>
          )}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>الرقم</TableCell><TableCell>العميل</TableCell><TableCell>الموضوع</TableCell>
                <TableCell>الفئة</TableCell><TableCell>الأولوية</TableCell><TableCell>الحالة</TableCell><TableCell>مدة الحل</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {complaints.map((c) => (
                  <TableRow key={c._id} hover sx={{ bgcolor: c.status === 'escalated' ? 'error.50' : 'inherit' }}>
                    <TableCell><Typography fontWeight="bold" variant="body2">{c.complaintNumber}</Typography></TableCell>
                    <TableCell>{c.customer?.name || '—'}</TableCell>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell><Chip size="small" label={c.category?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell><Chip size="small" color={{ critical: 'error', high: 'warning', medium: 'info', low: 'default' }[c.priority] || 'default'} label={c.priority} /></TableCell>
                    <TableCell><Chip size="small" color={statusColors[c.status] || 'default'} label={c.status?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{c.resolutionTime ? `${c.resolutionTime} يوم` : '—'}</TableCell>
                  </TableRow>
                ))}
                {!complaints.length && <TableRow><TableCell colSpan={7} align="center">لا توجد شكاوى</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 3: Customer Journeys */}
      {tab === 3 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('journey')} sx={{ mb: 2 }}>رحلة عميل جديدة</Button>
          <Grid container spacing={2}>
            {journeys.map((j) => (
              <Grid item xs={12} md={6} key={j._id}>
                <Card variant="outlined">
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography fontWeight="bold">{j.journeyName}</Typography>
                      <Chip size="small" color={statusColors[j.status] || 'default'} label={j.status?.replace(/_/g, ' ')} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" gutterBottom>{j.description}</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="caption">شريحة العملاء: {j.customerSegment || '—'}</Typography><br />
                    <Typography variant="caption">نقاط التماس: {j.touchpoints?.length || 0}</Typography><br />
                    <Typography variant="caption">نقاط الألم: {j.painPoints?.length || 0}</Typography>
                    {j.satisfactionScore !== null && (
                      <Box mt={1}><Rating value={j.satisfactionScore / 20} readOnly size="small" precision={0.5} /></Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {!journeys.length && <Grid item xs={12}><Alert severity="info">لا توجد رحلات عملاء</Alert></Grid>}
          </Grid>
        </Box>
      )}

      {/* Tab 4: Benchmarks */}
      {tab === 4 && (
        <Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDialog('benchmark')} sx={{ mb: 2 }}>معيار جديد</Button>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>المعيار</TableCell><TableCell>الفئة</TableCell><TableCell>القيمة الحالية</TableCell>
                <TableCell>الهدف</TableCell><TableCell>متوسط الصناعة</TableCell><TableCell>الاتجاه</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {benchmarks.map((b) => (
                  <TableRow key={b._id} hover>
                    <TableCell><Typography fontWeight="bold" variant="body2">{b.metricName}</Typography></TableCell>
                    <TableCell><Chip size="small" label={b.category?.replace(/_/g, ' ')} /></TableCell>
                    <TableCell>{b.currentValue !== null ? b.currentValue : '—'}{b.unit || ''}</TableCell>
                    <TableCell>{b.targetValue !== null ? b.targetValue : '—'}{b.unit || ''}</TableCell>
                    <TableCell>{b.industryAverage !== null ? b.industryAverage : '—'}{b.unit || ''}</TableCell>
                    <TableCell>
                      {b.trend === 'up' && <Chip size="small" color="success" label="↑ تحسن" />}
                      {b.trend === 'down' && <Chip size="small" color="error" label="↓ تراجع" />}
                      {b.trend === 'stable' && <Chip size="small" label="— مستقر" />}
                      {!b.trend && '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {!benchmarks.length && <TableRow><TableCell colSpan={6} align="center">لا توجد معايير</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={dialog.open} onClose={() => setDialog({ open: false, type: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialog.type === 'survey' && 'استبيان جديد'}
          {dialog.type === 'feedback' && 'تسجيل تغذية راجعة'}
          {dialog.type === 'complaint' && 'شكوى جديدة'}
          {dialog.type === 'journey' && 'رحلة عميل جديدة'}
          {dialog.type === 'benchmark' && 'معيار خدمة جديد'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {dialog.type === 'survey' && (<>
              <TextField label="عنوان الاستبيان" fullWidth value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <TextField select label="النوع" fullWidth value={form.surveyType || ''} onChange={e => setForm({ ...form, surveyType: e.target.value })}>
                {['nps', 'csat', 'ces', 'product', 'service', 'onboarding', 'exit', 'general'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
              </TextField>
            </>)}
            {dialog.type === 'feedback' && (<>
              <TextField label="اسم العميل" fullWidth value={form.customerName || ''} onChange={e => setForm({ ...form, customerName: e.target.value })} />
              <TextField select label="القناة" fullWidth value={form.channel || ''} onChange={e => setForm({ ...form, channel: e.target.value })}>
                {['phone', 'email', 'web', 'mobile_app', 'social_media', 'in_person', 'chat'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="التعليق" fullWidth multiline rows={3} value={form.comment || ''} onChange={e => setForm({ ...form, comment: e.target.value })} />
              <TextField select label="المشاعر" fullWidth value={form.sentiment || ''} onChange={e => setForm({ ...form, sentiment: e.target.value })}>
                {['positive', 'negative', 'neutral', 'mixed'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </>)}
            {dialog.type === 'complaint' && (<>
              <TextField label="رقم الشكوى" fullWidth value={form.complaintNumber || ''} onChange={e => setForm({ ...form, complaintNumber: e.target.value })} />
              <TextField label="الموضوع" fullWidth value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })} />
              <TextField select label="الفئة" fullWidth value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['product_quality', 'delivery', 'billing', 'customer_service', 'technical', 'policy', 'pricing'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField select label="الأولوية" fullWidth value={form.priority || 'medium'} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {['critical', 'high', 'medium', 'low'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
              <TextField label="التفاصيل" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </>)}
            {dialog.type === 'journey' && (<>
              <TextField label="اسم الرحلة" fullWidth value={form.journeyName || ''} onChange={e => setForm({ ...form, journeyName: e.target.value })} />
              <TextField label="الوصف" fullWidth multiline rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
              <TextField label="شريحة العملاء" fullWidth value={form.customerSegment || ''} onChange={e => setForm({ ...form, customerSegment: e.target.value })} />
            </>)}
            {dialog.type === 'benchmark' && (<>
              <TextField label="اسم المعيار" fullWidth value={form.metricName || ''} onChange={e => setForm({ ...form, metricName: e.target.value })} />
              <TextField select label="الفئة" fullWidth value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                {['response_time', 'resolution_time', 'satisfaction', 'retention', 'churn', 'engagement', 'loyalty'].map(t => <MenuItem key={t} value={t}>{t.replace(/_/g, ' ')}</MenuItem>)}
              </TextField>
              <TextField label="القيمة الحالية" fullWidth type="number" value={form.currentValue || ''} onChange={e => setForm({ ...form, currentValue: e.target.value })} />
              <TextField label="الهدف" fullWidth type="number" value={form.targetValue || ''} onChange={e => setForm({ ...form, targetValue: e.target.value })} />
            </>)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, type: '' })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
