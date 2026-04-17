/**
 * AdminNotifications — /admin/notifications page.
 *
 * Unified multi-channel dispatcher (WhatsApp + SMS + Email) with compose
 * form, bulk mode, and audit-log viewer.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Paper,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import api from '../../services/api.client';

const CHANNEL_COLORS = {
  whatsapp: 'success',
  sms: 'info',
  email: 'primary',
  push: 'secondary',
  'in-app': 'default',
};
const STATUS_COLORS = {
  sent: 'success',
  pending: 'warning',
  failed: 'error',
  skipped: 'default',
};
const STATUS_LABELS = {
  sent: 'تم الإرسال',
  pending: 'قيد الإرسال',
  failed: 'فشل',
  skipped: 'متجاوز',
};

export default function AdminNotifications() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsFilter, setLogsFilter] = useState({ channel: '', status: '', q: '' });
  const [logsPagination, setLogsPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });

  // Compose form state
  const [compose, setCompose] = useState({
    to: '',
    channels: 'auto',
    subject: '',
    body: '',
    priority: 'normal',
    templateKey: '',
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkRecipients, setBulkRecipients] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const r = await api.get('/notify/stats');
      setStats(r.data);
    } catch (_e) {
      /* ignore */
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const r = await api.get('/notify/logs', {
        params: {
          channel: logsFilter.channel || undefined,
          status: logsFilter.status || undefined,
          q: logsFilter.q || undefined,
          page: logsPagination.page,
          limit: logsPagination.limit,
        },
      });
      setLogs(r.data?.items || []);
      setLogsPagination(p => ({ ...p, ...(r.data?.pagination || {}) }));
    } catch (_e) {
      /* ignore */
    } finally {
      setLogsLoading(false);
    }
  }, [
    logsFilter.channel,
    logsFilter.status,
    logsFilter.q,
    logsPagination.page,
    logsPagination.limit,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  useEffect(() => {
    if (tab === 1) fetchLogs();
  }, [tab, fetchLogs]);

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      if (bulkMode) {
        const recipients = bulkRecipients
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean)
          .map(to => ({ to }));
        if (recipients.length === 0) {
          setResult({ success: false, message: 'أضف مستلماً واحداً على الأقل' });
          return;
        }
        const r = await api.post('/notify/bulk', {
          recipients,
          channels: compose.channels === 'auto' ? 'auto' : [compose.channels],
          subject: compose.subject,
          body: compose.body,
          priority: compose.priority,
          templateKey: compose.templateKey,
        });
        setResult({
          success: true,
          message: `تم: ${r.data.sent}/${r.data.total} (${r.data.failed} فشل)`,
        });
      } else {
        const r = await api.post('/notify', {
          to: compose.to,
          channels: compose.channels === 'auto' ? 'auto' : [compose.channels],
          subject: compose.subject,
          body: compose.body,
          priority: compose.priority,
          templateKey: compose.templateKey,
        });
        setResult({
          success: r.data.success,
          message: r.data.success ? 'تم الإرسال' : 'فشل الإرسال',
          details: r.data.results,
        });
      }
      fetchStats();
      if (tab === 1) fetchLogs();
    } catch (err) {
      setResult({ success: false, message: err?.response?.data?.message || 'خطأ' });
    } finally {
      setSending(false);
    }
  };

  const summaryCards = [
    { label: 'إجمالي الإرسالات', value: stats?.total ?? '—', color: '#0ea5e9' },
    { label: 'آخر 30 يوم', value: stats?.last30days ?? '—', color: '#10b981' },
    { label: 'تم الإرسال', value: stats?.byStatus?.sent ?? 0, color: '#059669' },
    { label: 'فشل', value: stats?.byStatus?.failed ?? 0, color: '#ef4444' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} dir="rtl">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            مركز الإشعارات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إرسال موحّد عبر واتساب + SMS + بريد إلكتروني مع fallback chain ذكي
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchStats}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map(c => (
          <Grid item xs={6} md={3} key={c.label}>
            <Card sx={{ borderRadius: 3, borderTop: `4px solid ${c.color}` }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h4" fontWeight={700}>
                  {typeof c.value === 'number' ? c.value.toLocaleString('ar-SA') : c.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="إرسال إشعار" />
        <Tab label="سجل الإرسالات" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={bulkMode}
                    onChange={e => {
                      setBulkMode(e.target.checked);
                      setResult(null);
                    }}
                  />
                }
                label="وضع الإرسال الجماعي (حتى 500 مستلم)"
              />

              {bulkMode ? (
                <TextField
                  label="المستلمون (سطر لكل مستلم — هاتف أو بريد)"
                  multiline
                  rows={6}
                  fullWidth
                  value={bulkRecipients}
                  onChange={e => setBulkRecipients(e.target.value)}
                  helperText={`${bulkRecipients.split(/\r?\n/).filter(l => l.trim()).length} مستلم`}
                  placeholder="0501234567&#10;user@example.com&#10;0552223344"
                />
              ) : (
                <TextField
                  label="إلى (هاتف 05xxxxxxxx أو بريد إلكتروني)"
                  fullWidth
                  required
                  dir="ltr"
                  value={compose.to}
                  onChange={e => setCompose({ ...compose, to: e.target.value })}
                />
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>القناة</InputLabel>
                  <Select
                    label="القناة"
                    value={compose.channels}
                    onChange={e => setCompose({ ...compose, channels: e.target.value })}
                  >
                    <MenuItem value="auto">تلقائي (واتساب → SMS → بريد)</MenuItem>
                    <MenuItem value="whatsapp">واتساب فقط</MenuItem>
                    <MenuItem value="sms">SMS فقط</MenuItem>
                    <MenuItem value="email">بريد إلكتروني فقط</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>الأولوية</InputLabel>
                  <Select
                    label="الأولوية"
                    value={compose.priority}
                    onChange={e => setCompose({ ...compose, priority: e.target.value })}
                  >
                    <MenuItem value="low">منخفضة</MenuItem>
                    <MenuItem value="normal">عادية</MenuItem>
                    <MenuItem value="high">مرتفعة</MenuItem>
                    <MenuItem value="urgent">عاجلة</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="رمز القالب (اختياري — للتدقيق)"
                  fullWidth
                  value={compose.templateKey}
                  onChange={e => setCompose({ ...compose, templateKey: e.target.value })}
                />
              </Stack>

              <TextField
                label="الموضوع (للبريد الإلكتروني)"
                fullWidth
                value={compose.subject}
                onChange={e => setCompose({ ...compose, subject: e.target.value })}
              />
              <TextField
                label="نص الرسالة"
                fullWidth
                multiline
                rows={6}
                required
                value={compose.body}
                onChange={e => setCompose({ ...compose, body: e.target.value })}
                helperText={`${compose.body.length}/2000`}
              />

              {result && (
                <Alert severity={result.success ? 'success' : 'error'}>
                  {result.message}
                  {result.details && (
                    <Box mt={1}>
                      {result.details.map((d, i) => (
                        <Typography key={i} variant="caption" display="block">
                          · {d.channel}: {d.success ? '✓' : '✗'} {d.error || d.reason || ''}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </Alert>
              )}

              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SendIcon />}
                  disabled={
                    sending ||
                    !compose.body ||
                    (!bulkMode && !compose.to) ||
                    (bulkMode && !bulkRecipients.trim())
                  }
                  onClick={handleSend}
                >
                  {sending ? 'جارٍ الإرسال...' : bulkMode ? 'إرسال جماعي' : 'إرسال'}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="بحث (مستلم/موضوع)"
                  value={logsFilter.q}
                  onChange={e => setLogsFilter(f => ({ ...f, q: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>القناة</InputLabel>
                  <Select
                    label="القناة"
                    value={logsFilter.channel}
                    onChange={e => setLogsFilter(f => ({ ...f, channel: e.target.value }))}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {['whatsapp', 'sms', 'email', 'push', 'in-app'].map(c => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    label="الحالة"
                    value={logsFilter.status}
                    onChange={e => setLogsFilter(f => ({ ...f, status: e.target.value }))}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {Object.keys(STATUS_LABELS).map(s => (
                      <MenuItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button fullWidth variant="contained" onClick={fetchLogs} disabled={logsLoading}>
                  تطبيق
                </Button>
              </Grid>
            </Grid>

            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>القناة</TableCell>
                    <TableCell>إلى</TableCell>
                    <TableCell>الموضوع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الخطأ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logsLoading && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  )}
                  {!logsLoading && logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary">لا توجد سجلات</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {logs.map(r => (
                    <TableRow key={r._id} hover>
                      <TableCell>{new Date(r.createdAt).toLocaleString('ar-SA')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={r.channel}
                          color={CHANNEL_COLORS[r.channel] || 'default'}
                        />
                      </TableCell>
                      <TableCell dir="ltr">{r.to}</TableCell>
                      <TableCell>{r.subject || r.body?.slice(0, 40) || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={STATUS_LABELS[r.status] || r.status}
                          color={STATUS_COLORS[r.status] || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="error">
                          {r.lastError || '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                إجمالي: {(logsPagination.total || 0).toLocaleString('ar-SA')}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  size="small"
                  disabled={logsPagination.page <= 1 || logsLoading}
                  onClick={() => setLogsPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  السابق
                </Button>
                <Typography variant="body2">
                  {logsPagination.page} / {logsPagination.pages || 1}
                </Typography>
                <Button
                  size="small"
                  disabled={logsPagination.page >= logsPagination.pages || logsLoading}
                  onClick={() => setLogsPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  التالي
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
