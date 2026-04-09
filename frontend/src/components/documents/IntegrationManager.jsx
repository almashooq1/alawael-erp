import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Avatar, IconButton, Button,
  CircularProgress, Alert, Paper, Grid, List, ListItem, ListItemAvatar,
  ListItemText, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Switch, FormControlLabel,
  Badge, Tooltip,
} from '@mui/material';
import {
  Webhook as WebhookIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  PlayArrow as TestIcon,
  PowerSettingsNew as ToggleIcon,
  Delete as DeleteIcon,
  History as LogsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { integrationsApi } from '../../services/documentProPhase5Service';
import logger from '../../utils/logger';

const STATUS_COLORS = {
  active: '#22c55e', inactive: '#94a3b8', error: '#ef4444', testing: '#f59e0b',
};

/**
 * IntegrationManager — مدير التكاملات الخارجية
 * إنشاء واختبار وإدارة تكاملات الويب هوك والبريد الإلكتروني
 */
export default function IntegrationManager() {
  const [integrations, setIntegrations] = useState([]);
  const [providers, setProviders] = useState([]);
  const [eventTypes, setEventTypes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(null);
  const [logs, setLogs] = useState([]);
  const [newIntg, setNewIntg] = useState({
    name: '', type: 'webhook', provider: 'generic', config: { url: '' }, triggers: [],
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ir, pr, er, sr] = await Promise.all([
        integrationsApi.getAll(),
        integrationsApi.getProviders(),
        integrationsApi.getEventTypes(),
        integrationsApi.getStats(),
      ]);
      setIntegrations(ir.data?.integrations ?? []);
      setProviders(pr.data?.providers ?? []);
      setEventTypes(er.data?.eventTypes ?? []);
      setStats(sr.data?.stats);
    } catch (err) {
      logger.error('Load integrations error', err);
      setError('فشل تحميل التكاملات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!newIntg.name || !newIntg.config?.url) return;
    try {
      await integrationsApi.create(newIntg);
      setCreateOpen(false);
      setNewIntg({ name: '', type: 'webhook', provider: 'generic', config: { url: '' }, triggers: [] });
      loadData();
    } catch (err) { logger.error(err); }
  };

  const handleToggle = async (id) => {
    try { await integrationsApi.toggle(id); loadData(); } catch (err) { logger.error(err); }
  };

  const handleTest = async (id) => {
    try { await integrationsApi.test(id); loadData(); } catch (err) { logger.error(err); }
  };

  const handleDelete = async (id) => {
    try { await integrationsApi.delete(id); loadData(); } catch (err) { logger.error(err); }
  };

  const handleViewLogs = async (id) => {
    try {
      const res = await integrationsApi.getLogs(id, { limit: 20 });
      setLogs(res.data?.logs ?? []);
      setLogsOpen(id);
    } catch (err) { logger.error(err); }
  };

  return (
    <Box dir="rtl">
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <WebhookIcon color="primary" />
          <Typography variant="h6">مدير التكاملات</Typography>
          <Chip label={`${integrations.length} تكامل`} size="small" variant="outlined" />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={() => setCreateOpen(true)}>
            تكامل جديد
          </Button>
          <IconButton size="small" onClick={loadData}><RefreshIcon /></IconButton>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

      {/* Stats Overview */}
      <Grid container spacing={1} mb={2}>
        {Object.entries(stats?.byStatus || {}).map(([status, count]) => (
          <Grid item xs={6} sm={3} key={status}>
            <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
              <Badge
                badgeContent={count}
                color={status === 'active' ? 'success' : status === 'error' ? 'error' : 'default'}
              >
                <Typography variant="body2">{status === 'active' ? 'نشط' : status === 'inactive' ? 'معطل' : status === 'error' ? 'خطأ' : status}</Typography>
              </Badge>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Integrations List */}
      <Card variant="outlined">
        <CardContent sx={{ p: 1.5 }}>
          {integrations.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              لا توجد تكاملات — أنشئ تكاملاً جديداً لربط نظامك مع خدمات خارجية
            </Typography>
          ) : (
            <List>
              {integrations.map((intg, i) => (
                <React.Fragment key={intg._id}>
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="اختبار"><IconButton size="small" color="primary" onClick={() => handleTest(intg._id)}><TestIcon /></IconButton></Tooltip>
                        <Tooltip title={intg.status === 'active' ? 'تعطيل' : 'تفعيل'}>
                          <IconButton size="small" color={intg.status === 'active' ? 'success' : 'default'} onClick={() => handleToggle(intg._id)}><ToggleIcon /></IconButton>
                        </Tooltip>
                        <Tooltip title="السجلات"><IconButton size="small" onClick={() => handleViewLogs(intg._id)}><LogsIcon /></IconButton></Tooltip>
                        <Tooltip title="حذف"><IconButton size="small" color="error" onClick={() => handleDelete(intg._id)}><DeleteIcon /></IconButton></Tooltip>
                      </Stack>
                    }
                  >
                    <ListItemAvatar>
                      <Badge
                        variant="dot"
                        sx={{ '& .MuiBadge-badge': { bgcolor: STATUS_COLORS[intg.status] || '#94a3b8' } }}
                        overlap="circular"
                      >
                        <Avatar sx={{ bgcolor: (STATUS_COLORS[intg.status] || '#94a3b8') + '20' }}>
                          <WebhookIcon sx={{ color: STATUS_COLORS[intg.status] || '#94a3b8' }} />
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={600}>{intg.nameAr || intg.name}</Typography>
                          <Chip label={intg.type} size="small" variant="outlined" />
                          <Chip label={intg.provider} size="small" />
                        </Stack>
                      }
                      secondary={
                        <Stack direction="row" spacing={1} component="span">
                          <span>✅ {intg.stats?.successRuns ?? 0}</span>
                          <span>❌ {intg.stats?.failedRuns ?? 0}</span>
                          <span>📊 {intg.stats?.totalRuns ?? 0} إجمالي</span>
                          {intg.lastRun && <span>آخر تشغيل: {new Date(intg.lastRun).toLocaleDateString('ar-SA')}</span>}
                        </Stack>
                      }
                    />
                  </ListItem>
                  {i < integrations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء تكامل جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="اسم التكامل" size="small" value={newIntg.name}
              onChange={(e) => setNewIntg({ ...newIntg, name: e.target.value })} />
            <FormControl fullWidth size="small">
              <InputLabel>النوع</InputLabel>
              <Select value={newIntg.type} label="النوع"
                onChange={(e) => setNewIntg({ ...newIntg, type: e.target.value })}>
                <MenuItem value="webhook">Webhook</MenuItem>
                <MenuItem value="email">بريد إلكتروني</MenuItem>
                <MenuItem value="api_connector">موصل API</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>المزود</InputLabel>
              <Select value={newIntg.provider} label="المزود"
                onChange={(e) => setNewIntg({ ...newIntg, provider: e.target.value })}>
                {providers.map((p) => (
                  <MenuItem key={p.key} value={p.key}>{p.icon} {p.nameAr}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField fullWidth label="URL" size="small" value={newIntg.config?.url || ''}
              onChange={(e) => setNewIntg({ ...newIntg, config: { ...newIntg.config, url: e.target.value } })}
              placeholder="https://hooks.example.com/webhook" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newIntg.name || !newIntg.config?.url}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* Logs Dialog */}
      <Dialog open={Boolean(logsOpen)} onClose={() => setLogsOpen(null)} maxWidth="md" fullWidth>
        <DialogTitle>سجلات التكامل</DialogTitle>
        <DialogContent>
          {logs.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>لا توجد سجلات</Typography>
          ) : (
            <List dense>
              {logs.map((log) => (
                <ListItem key={log._id}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: log.status === 'success' ? '#d1fae5' : '#fef2f2', width: 32, height: 32 }}>
                      {log.status === 'success' ? <SuccessIcon color="success" sx={{ fontSize: 18 }} /> : <ErrorIcon color="error" sx={{ fontSize: 18 }} />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${log.event} — ${log.status}`}
                    secondary={`${new Date(log.createdAt).toLocaleString('ar-SA')} • ${log.responseTime}ms • HTTP ${log.response?.statusCode || '?'}`}
                    primaryTypographyProps={{ fontSize: 13 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsOpen(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
