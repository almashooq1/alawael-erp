/**
 * WorkflowDelegation – إدارة التفويضات
 * Delegation & out-of-office management for workflow tasks.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Skeleton,
  Divider,
  alpha,
  Avatar,
  Badge,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Tab,
  Tabs,
} from '@mui/material';
import {
  ArrowBack,
  Refresh,
  Add,
  PersonOff,
  SwapHoriz,
  Delete,
  Check,
  Cancel,
  AccessTime,
  Person,
  Category,
  EventNote,
  Autorenew,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const statusConfig = {
  active: { label: 'نشط', color: 'success' },
  scheduled: { label: 'مجدول', color: 'info' },
  expired: { label: 'منتهي', color: 'default' },
  cancelled: { label: 'ملغي', color: 'error' },
};

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

export default function WorkflowDelegation() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [delegations, setDelegations] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // form
  const [form, setForm] = useState({
    delegateTo: '',
    startDate: '',
    endDate: '',
    categories: '',
    reason: '',
    autoActivate: true,
    autoExpire: true,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await workflowService.getDelegations();
      setDelegations(res.data?.data || res.data || []);
    } catch {
      showSnackbar('تعذر تحميل التفويضات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        categories: form.categories ? form.categories.split(',').map(c => c.trim()) : [],
      };
      await workflowService.createDelegation(payload);
      showSnackbar('تم إنشاء التفويض بنجاح', 'success');
      setDialogOpen(false);
      setForm({
        delegateTo: '',
        startDate: '',
        endDate: '',
        categories: '',
        reason: '',
        autoActivate: true,
        autoExpire: true,
      });
      fetch();
    } catch (err) {
      showSnackbar(err.response?.data?.error || 'خطأ في إنشاء التفويض', 'error');
    }
  };

  const handleCancel = async id => {
    try {
      await workflowService.cancelDelegation(id);
      showSnackbar('تم إلغاء التفويض', 'success');
      fetch();
    } catch {
      showSnackbar('خطأ في إلغاء التفويض', 'error');
    }
  };

  const active = delegations.filter(d => d.status === 'active' || d.status === 'scheduled');
  const history = delegations.filter(d => d.status === 'expired' || d.status === 'cancelled');

  const stats = {
    total: delegations.length,
    active: delegations.filter(d => d.status === 'active').length,
    scheduled: delegations.filter(d => d.status === 'scheduled').length,
    expired: delegations.filter(d => d.status === 'expired').length,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <SwapHoriz sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إدارة التفويضات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تفويض المهام عند الغياب أو الإجازة
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<Add />} onClick={() => setDialogOpen(true)}>
            تفويض جديد
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetch}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الإجمالي', value: stats.total, color: '#6366f1', icon: <SwapHoriz /> },
          { label: 'نشط حالياً', value: stats.active, color: '#16a34a', icon: <Check /> },
          { label: 'مجدول', value: stats.scheduled, color: '#2563eb', icon: <AccessTime /> },
          { label: 'منتهي', value: stats.expired, color: '#94a3b8', icon: <EventNote /> },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
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
                <Avatar
                  sx={{ bgcolor: alpha(s.color, 0.15), color: s.color, width: 40, height: 40 }}
                >
                  {s.icon}
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

      {/* TABS */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
          <Tab label={`التفويضات النشطة (${active.length})`} />
          <Tab label={`السجل (${history.length})`} />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} height={60} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : active.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <PersonOff sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد تفويضات نشطة</Typography>
              <Typography variant="caption" color="text.secondary">
                أنشئ تفويضاً جديداً لتفعيل التعيين التلقائي
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المفوّض إليه</TableCell>
                    <TableCell>الفترة</TableCell>
                    <TableCell>الفئات</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>السبب</TableCell>
                    <TableCell>إجراء</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {active.map(d => (
                    <TableRow key={d._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}
                          >
                            {(d.delegateTo?.name || d.delegateToName || 'U')[0]}
                          </Avatar>
                          {d.delegateTo?.name || d.delegateToName || d.delegateTo}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(d.startDate).toLocaleDateString('ar')} –{' '}
                          {new Date(d.endDate).toLocaleDateString('ar')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {(d.categories || []).length > 0 ? (
                          d.categories.map(c => (
                            <Chip key={c} size="small" label={c} sx={{ mr: 0.5, fontSize: 10 }} />
                          ))
                        ) : (
                          <Chip
                            size="small"
                            label="جميع الفئات"
                            variant="outlined"
                            sx={{ fontSize: 10 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusConfig[d.status]?.label || d.status}
                          color={statusConfig[d.status]?.color || 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{d.reason || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="إلغاء التفويض">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleCancel(d._id)}
                          >
                            <Cancel fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map(i => (
                <Skeleton key={i} height={60} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : history.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">لا يوجد سجل تفويضات سابقة</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المفوّض إليه</TableCell>
                    <TableCell>الفترة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>السبب</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map(d => (
                    <TableRow key={d._id} hover>
                      <TableCell>
                        {d.delegateTo?.name || d.delegateToName || d.delegateTo}
                      </TableCell>
                      <TableCell>
                        {new Date(d.startDate).toLocaleDateString('ar')} –{' '}
                        {new Date(d.endDate).toLocaleDateString('ar')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusConfig[d.status]?.label || d.status}
                          color={statusConfig[d.status]?.color || 'default'}
                        />
                      </TableCell>
                      <TableCell>{d.reason || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>
      </Paper>

      {/* CREATE DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHoriz color="primary" /> إنشاء تفويض جديد
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              سيتم توجيه جميع المهام الجديدة المعيّنة إليك تلقائياً إلى الشخص المفوّض خلال فترة
              التفويض.
            </Alert>
            <TextField
              label="معرّف المفوّض إليه"
              fullWidth
              required
              value={form.delegateTo}
              onChange={e => setForm(f => ({ ...f, delegateTo: e.target.value }))}
              placeholder="أدخل معرّف المستخدم المفوّض إليه"
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ البدء"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="تاريخ الانتهاء"
                  type="date"
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              label="الفئات (اختياري)"
              fullWidth
              value={form.categories}
              onChange={e => setForm(f => ({ ...f, categories: e.target.value }))}
              placeholder="leave, purchase, maintenance (مفصولة بفاصلة)"
              helperText="اتركها فارغة لتفويض جميع الفئات"
            />
            <TextField
              label="السبب"
              fullWidth
              multiline
              rows={2}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="إجازة سنوية، سفر عمل، إلخ"
            />
            <Box sx={{ display: 'flex', gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.autoActivate}
                    onChange={e => setForm(f => ({ ...f, autoActivate: e.target.checked }))}
                  />
                }
                label="تفعيل تلقائي"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={form.autoExpire}
                    onChange={e => setForm(f => ({ ...f, autoExpire: e.target.checked }))}
                  />
                }
                label="إنهاء تلقائي"
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.delegateTo || !form.startDate || !form.endDate}
          >
            إنشاء التفويض
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
