/**
 * WorkflowWebhooks – إدارة Webhooks
 * Webhook management for workflow events — create, test, view delivery logs.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const EVENT_TYPES = [
  { value: 'instance.created', label: 'إنشاء سير عمل' },
  { value: 'instance.completed', label: 'اكتمال سير عمل' },
  { value: 'instance.cancelled', label: 'إلغاء سير عمل' },
  { value: 'task.assigned', label: 'تعيين مهمة' },
  { value: 'task.completed', label: 'إكمال مهمة' },
  { value: 'task.overdue', label: 'تأخر مهمة' },
  { value: 'sla.violated', label: 'انتهاك SLA' },
  { value: 'comment.added', label: 'إضافة تعليق' },
];

export default function WorkflowWebhooks() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [testing, setTesting] = useState(null);
  const [logsDialog, setLogsDialog] = useState(null);
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    url: '',
    secret: '',
    events: [],
    active: true,
  });

  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getWebhooks();
      setWebhooks(res.data?.data || res.data || []);
    } catch {
      showSnackbar('تعذر تحميل Webhooks', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editId) {
        await workflowService.updateWebhook(editId, form);
        showSnackbar('تم تحديث Webhook', 'success');
      } else {
        await workflowService.createWebhook(form);
        showSnackbar('تم إنشاء Webhook بنجاح', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchWebhooks();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'خطأ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا Webhook؟')) return;
    try {
      await workflowService.deleteWebhook(id);
      showSnackbar('تم الحذف', 'success');
      fetchWebhooks();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const handleTest = async id => {
    try {
      setTesting(id);
      await workflowService.testWebhook(id);
      showSnackbar('تم إرسال اختبار Webhook بنجاح', 'success');
    } catch {
      showSnackbar('فشل اختبار Webhook', 'error');
    } finally {
      setTesting(null);
    }
  };

  const viewLogs = async id => {
    try {
      const res = await workflowService.getWebhookLogs(id);
      setLogs(res.data?.data || res.data || []);
      setLogsDialog(id);
    } catch {
      showSnackbar('تعذر تحميل السجلات', 'error');
    }
  };

  const resetForm = () => {
    setForm({ name: '', url: '', secret: '', events: [], active: true });
    setEditId(null);
  };

  const openEdit = wh => {
    setForm({
      name: wh.name,
      url: wh.url,
      secret: wh.secret || '',
      events: wh.events || [],
      active: wh.active !== false,
    });
    setEditId(wh._id);
    setDialogOpen(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <Webhook sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة Webhooks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إرسال إشعارات لأنظمة خارجية عند حدوث أحداث في سير العمل
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
          >
            Webhook جديد
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchWebhooks}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الإجمالي', value: webhooks.length, color: '#6366f1' },
          {
            label: 'نشط',
            value: webhooks.filter(w => w.active !== false).length,
            color: '#16a34a',
          },
          {
            label: 'معطّل',
            value: webhooks.filter(w => w.active === false).length,
            color: '#94a3b8',
          },
        ].map((s, i) => (
          <Grid item xs={4} key={i}>
            <Card
              sx={{ bgcolor: alpha(s.color, 0.06), border: `1px solid ${alpha(s.color, 0.15)}` }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  '&:last-child': { pb: 1.5 },
                }}
              >
                <Avatar sx={{ bgcolor: alpha(s.color, 0.15), color: s.color }}>
                  <Webhook />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {loading ? '—' : s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* WEBHOOKS TABLE */}
      <Paper>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            Webhooks ({webhooks.length})
          </Typography>
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 2 }}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} height={55} sx={{ mb: 1 }} />
            ))}
          </Box>
        ) : webhooks.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Webhook sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">لا توجد Webhooks</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الاسم</TableCell>
                  <TableCell>URL</TableCell>
                  <TableCell>الأحداث</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.map(wh => (
                  <TableRow key={wh._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{wh.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Link sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography
                          variant="caption"
                          sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {wh.url}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {(wh.events || []).slice(0, 2).map(ev => (
                        <Chip
                          key={ev}
                          size="small"
                          label={EVENT_TYPES.find(e => e.value === ev)?.label || ev}
                          sx={{ mr: 0.5, mb: 0.3, fontSize: 10 }}
                        />
                      ))}
                      {(wh.events || []).length > 2 && (
                        <Chip
                          size="small"
                          label={`+${wh.events.length - 2}`}
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={
                          wh.active !== false ? (
                            <CheckCircle sx={{ fontSize: 14 }} />
                          ) : (
                            <Error sx={{ fontSize: 14 }} />
                          )
                        }
                        label={wh.active !== false ? 'نشط' : 'معطّل'}
                        color={wh.active !== false ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="اختبار">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleTest(wh._id)}
                            disabled={testing === wh._id}
                          >
                            {testing === wh._id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Send fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="السجلات">
                          <IconButton size="small" onClick={() => viewLogs(wh._id)}>
                            <History fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(wh)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(wh._id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* CREATE/EDIT DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل Webhook' : 'Webhook جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="الاسم"
              fullWidth
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="URL"
              fullWidth
              required
              placeholder="https://example.com/webhook"
              value={form.url}
              onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            />
            <TextField
              label="المفتاح السري (اختياري)"
              fullWidth
              value={form.secret}
              onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
              helperText="يُستخدم لتوقيع الطلبات (HMAC-SHA256)"
            />
            <FormControl fullWidth>
              <InputLabel>الأحداث</InputLabel>
              <Select
                multiple
                value={form.events}
                label="الأحداث"
                onChange={e => setForm(f => ({ ...f, events: e.target.value }))}
                renderValue={sel => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {sel.map(v => (
                      <Chip
                        key={v}
                        size="small"
                        label={EVENT_TYPES.find(e => e.value === v)?.label || v}
                        sx={{ fontSize: 10 }}
                      />
                    ))}
                  </Box>
                )}
              >
                {EVENT_TYPES.map(ev => (
                  <MenuItem key={ev.value} value={ev.value}>
                    {ev.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                />
              }
              label="نشط"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              resetForm();
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.name || !form.url || saving}
          >
            {saving ? <CircularProgress size={20} /> : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* LOGS DIALOG */}
      <Dialog open={!!logsDialog} onClose={() => setLogsDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>سجل التسليمات</DialogTitle>
        <DialogContent dividers>
          {logs.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              لا توجد سجلات تسليم
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الحدث</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>رمز الاستجابة</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow key={i}>
                      <TableCell>{log.event}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={log.success ? 'نجح' : 'فشل'}
                          color={log.success ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>{log.statusCode || '—'}</TableCell>
                      <TableCell>
                        {new Date(log.timestamp || log.createdAt).toLocaleString('ar')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialog(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
