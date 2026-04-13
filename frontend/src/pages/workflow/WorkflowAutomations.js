/**
 * WorkflowAutomations — قواعد الأتمتة
 *
 * Create and manage automation rules that trigger actions
 * based on workflow events. View execution logs and test rules.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  alpha,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  AutoFixHigh as AutoIcon,
  PlayArrow as TestIcon,
  FlashOn as TriggerIcon,
  Settings as ActionIcon,
  Rule as RuleIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const EVENT_LABELS = {
  task_created: 'إنشاء مهمة',
  task_updated: 'تحديث مهمة',
  task_completed: 'إكمال مهمة',
  task_assigned: 'تعيين مهمة',
  status_changed: 'تغيير الحالة',
  deadline_approaching: 'اقتراب الموعد',
  deadline_passed: 'تجاوز الموعد',
  comment_added: 'إضافة تعليق',
  approval_needed: 'طلب موافقة',
  sla_breach: 'خرق SLA',
  escalation_triggered: 'تصعيد',
};

const ACTION_LABELS = {
  send_notification: 'إرسال إشعار',
  send_email: 'إرسال بريد',
  assign_task: 'تعيين مهمة',
  change_status: 'تغيير الحالة',
  change_priority: 'تغيير الأولوية',
  add_comment: 'إضافة تعليق',
  create_task: 'إنشاء مهمة',
  trigger_webhook: 'تفعيل Webhook',
  escalate: 'تصعيد',
  start_approval: 'بدء موافقة',
};

const EVENT_COLORS = {
  task_created: '#4CAF50',
  task_updated: '#2196F3',
  task_completed: '#8BC34A',
  task_assigned: '#00BCD4',
  status_changed: '#9C27B0',
  deadline_approaching: '#FF9800',
  deadline_passed: '#F44336',
  comment_added: '#607D8B',
  approval_needed: '#673AB7',
  sla_breach: '#D32F2F',
  escalation_triggered: '#E91E63',
};

export default function WorkflowAutomations() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [_events, setEvents] = useState([]);
  const [_actions, setActions] = useState([]);

  // Dialog states
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleData, setRuleData] = useState({
    name: '',
    nameAr: '',
    description: '',
    event: 'task_created',
    isActive: true,
    priority: 10,
    conditions: [{ field: 'status', operator: 'equals', value: '' }],
    actions: [{ type: 'send_notification', config: {} }],
  });

  // Test dialog
  const [testDialog, setTestDialog] = useState(false);
  const [_testRuleId, setTestRuleId] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesRes, statsRes, logsRes, eventsRes, actionsRes] = await Promise.all([
        workflowService.getAutomationRules(),
        workflowService.getAutomationStats(),
        workflowService.getAutomationLogs({ limit: 20 }),
        workflowService.getAutomationEvents(),
        workflowService.getAutomationActions(),
      ]);
      setRules(rulesRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setLogs(logsRes.data?.data || []);
      setEvents(eventsRes.data?.data || Object.keys(EVENT_LABELS));
      setActions(actionsRes.data?.data || Object.keys(ACTION_LABELS));
    } catch (err) {
      showSnackbar('خطأ في تحميل قواعد الأتمتة', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveRule = async () => {
    try {
      if (editingRule) {
        await workflowService.updateAutomationRule(editingRule._id, ruleData);
        showSnackbar('تم تحديث قاعدة الأتمتة', 'success');
      } else {
        await workflowService.createAutomationRule(ruleData);
        showSnackbar('تم إنشاء قاعدة الأتمتة', 'success');
      }
      setRuleDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حفظ القاعدة', 'error');
    }
  };

  const handleDeleteRule = async id => {
    if (!window.confirm('هل تريد حذف هذه القاعدة؟')) return;
    try {
      await workflowService.deleteAutomationRule(id);
      showSnackbar('تم حذف القاعدة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حذف القاعدة', 'error');
    }
  };

  const handleToggleRule = async id => {
    try {
      await workflowService.toggleAutomationRule(id);
      showSnackbar('تم تغيير حالة القاعدة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في تغيير الحالة', 'error');
    }
  };

  const handleTestRule = async id => {
    setTestRuleId(id);
    setTestResult(null);
    setTestDialog(true);
    try {
      const res = await workflowService.testAutomationRule(id);
      setTestResult(res.data?.data || { success: true, message: 'تم تنفيذ الاختبار بنجاح' });
    } catch (err) {
      setTestResult({
        success: false,
        message: 'فشل الاختبار: ' + (err.response?.data?.message || err.message),
      });
    }
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleData({
      name: '',
      nameAr: '',
      description: '',
      event: 'task_created',
      isActive: true,
      priority: 10,
      conditions: [{ field: 'status', operator: 'equals', value: '' }],
      actions: [{ type: 'send_notification', config: {} }],
    });
    setRuleDialog(true);
  };

  const openEditRule = rule => {
    setEditingRule(rule);
    setRuleData({
      name: rule.name,
      nameAr: rule.nameAr,
      description: rule.description || '',
      event: rule.event,
      isActive: rule.isActive,
      priority: rule.priority || 10,
      conditions: rule.conditions || [],
      actions: rule.actions || [],
    });
    setRuleDialog(true);
  };

  const addCondition = () => {
    setRuleData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: 'equals', value: '' }],
    }));
  };

  const updateCondition = (idx, field, value) => {
    const updated = [...ruleData.conditions];
    updated[idx] = { ...updated[idx], [field]: value };
    setRuleData(prev => ({ ...prev, conditions: updated }));
  };

  const removeCondition = idx => {
    setRuleData(prev => ({ ...prev, conditions: prev.conditions.filter((_, i) => i !== idx) }));
  };

  const addAction = () => {
    setRuleData(prev => ({
      ...prev,
      actions: [...prev.actions, { type: 'send_notification', config: {} }],
    }));
  };

  const updateAction = (idx, field, value) => {
    const updated = [...ruleData.actions];
    updated[idx] = { ...updated[idx], [field]: value };
    setRuleData(prev => ({ ...prev, actions: updated }));
  };

  const removeAction = idx => {
    setRuleData(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            قواعد الأتمتة
          </Typography>
          <Chip icon={<AutoIcon />} label="Automation" size="small" color="warning" />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchData}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewRule}>
            قاعدة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'إجمالي القواعد', value: stats.totalRules || 0, color: '#2196F3' },
            { label: 'نشطة', value: stats.activeRules || 0, color: '#4CAF50' },
            { label: 'عمليات التنفيذ', value: stats.totalExecutions || 0, color: '#FF9800' },
            {
              label: 'نسبة النجاح',
              value: `${stats.successRate?.toFixed(1) || 0}%`,
              color: stats.successRate >= 90 ? '#4CAF50' : '#F44336',
            },
          ].map((s, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card sx={{ borderTop: `4px solid ${s.color}` }}>
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="القواعد" icon={<RuleIcon />} iconPosition="start" />
        <Tab
          label={
            <Badge badgeContent={logs.filter(l => l.status === 'error').length} color="error">
              سجل التنفيذ
            </Badge>
          }
        />
      </Tabs>

      {/* Rules Tab */}
      {tab === 0 && (
        <Grid container spacing={2}>
          {rules.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <AutoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary" gutterBottom>
                  لا توجد قواعد أتمتة
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openNewRule}>
                  إنشاء أول قاعدة
                </Button>
              </Paper>
            </Grid>
          ) : (
            rules.map(rule => (
              <Grid item xs={12} sm={6} md={4} key={rule._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={600}>
                        {rule.nameAr || rule.name}
                      </Typography>
                      <Switch
                        checked={rule.isActive}
                        size="small"
                        onChange={() => handleToggleRule(rule._id)}
                      />
                    </Box>
                    {rule.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {rule.description}
                      </Typography>
                    )}
                    {/* Event */}
                    <Box sx={{ mb: 1 }}>
                      <Chip
                        icon={<TriggerIcon />}
                        label={EVENT_LABELS[rule.event] || rule.event}
                        size="small"
                        sx={{
                          bgcolor: alpha(EVENT_COLORS[rule.event] || '#999', 0.12),
                          color: EVENT_COLORS[rule.event] || '#999',
                        }}
                      />
                    </Box>
                    {/* Conditions count */}
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                      <Chip
                        icon={<FilterIcon />}
                        label={`${rule.conditions?.length || 0} شرط`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        icon={<ActionIcon />}
                        label={`${rule.actions?.length || 0} إجراء`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(rule.actions || []).map((a, i) => (
                        <Chip
                          key={i}
                          label={ACTION_LABELS[a.type] || a.type}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      ))}
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      التنفيذ: {rule.executionCount || 0} مرة &bull; الأولوية: {rule.priority || 10}
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ justifyContent: 'flex-end' }}>
                    <Tooltip title="اختبار">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => handleTestRule(rule._id)}
                      >
                        <TestIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => openEditRule(rule)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteRule(rule._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {/* Execution Logs Tab */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الحالة</TableCell>
                <TableCell>القاعدة</TableCell>
                <TableCell>الحدث</TableCell>
                <TableCell>الإجراء</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>المدة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      لا توجد سجلات تنفيذ
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => (
                  <TableRow key={log._id} hover>
                    <TableCell>
                      <Chip
                        icon={log.status === 'success' ? <SuccessIcon /> : <ErrorIcon />}
                        label={log.status === 'success' ? 'نجح' : 'فشل'}
                        size="small"
                        color={log.status === 'success' ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={500}>
                        {log.ruleId?.nameAr || log.ruleId?.name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={EVENT_LABELS[log.event] || log.event || '—'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{ACTION_LABELS[log.actionType] || log.actionType || '—'}</TableCell>
                    <TableCell>
                      {log.executedAt ? new Date(log.executedAt).toLocaleString('ar-SA') : '—'}
                    </TableCell>
                    <TableCell>{log.duration ? `${log.duration}ms` : '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? 'تعديل قاعدة الأتمتة' : 'إنشاء قاعدة أتمتة'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (عربي)"
                value={ruleData.nameAr}
                onChange={e => setRuleData(p => ({ ...p, nameAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الاسم (إنجليزي)"
                value={ruleData.name}
                onChange={e => setRuleData(p => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={ruleData.description}
                onChange={e => setRuleData(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الحدث المحفز</InputLabel>
                <Select
                  value={ruleData.event}
                  label="الحدث المحفز"
                  onChange={e => setRuleData(p => ({ ...p, event: e.target.value }))}
                >
                  {Object.entries(EVENT_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                type="number"
                label="الأولوية"
                value={ruleData.priority}
                onChange={e => setRuleData(p => ({ ...p, priority: Number(e.target.value) }))}
                inputProps={{ min: 1, max: 100 }}
              />
            </Grid>
            <Grid item xs={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={ruleData.isActive}
                    onChange={e => setRuleData(p => ({ ...p, isActive: e.target.checked }))}
                  />
                }
                label="نشطة"
              />
            </Grid>
          </Grid>

          {/* Conditions */}
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              الشروط ({ruleData.conditions.length})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addCondition}>
              إضافة شرط
            </Button>
          </Box>
          {ruleData.conditions.map((cond, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                mb: 1,
                bgcolor: alpha('#2196F3', 0.04),
                border: '1px solid',
                borderColor: alpha('#2196F3', 0.15),
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="الحقل"
                    value={cond.field}
                    onChange={e => updateCondition(idx, 'field', e.target.value)}
                  />
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>العملية</InputLabel>
                    <Select
                      value={cond.operator}
                      label="العملية"
                      onChange={e => updateCondition(idx, 'operator', e.target.value)}
                    >
                      <MenuItem value="equals">يساوي</MenuItem>
                      <MenuItem value="not_equals">لا يساوي</MenuItem>
                      <MenuItem value="contains">يحتوي</MenuItem>
                      <MenuItem value="greater_than">أكبر من</MenuItem>
                      <MenuItem value="less_than">أقل من</MenuItem>
                      <MenuItem value="in">ضمن</MenuItem>
                      <MenuItem value="not_in">ليس ضمن</MenuItem>
                      <MenuItem value="exists">موجود</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="القيمة"
                    value={cond.value}
                    onChange={e => updateCondition(idx, 'value', e.target.value)}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton size="small" color="error" onClick={() => removeCondition(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}

          {/* Actions */}
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              الإجراءات ({ruleData.actions.length})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addAction}>
              إضافة إجراء
            </Button>
          </Box>
          {ruleData.actions.map((act, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                mb: 1,
                bgcolor: alpha('#FF9800', 0.04),
                border: '1px solid',
                borderColor: alpha('#FF9800', 0.15),
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>نوع الإجراء</InputLabel>
                    <Select
                      value={act.type}
                      label="نوع الإجراء"
                      onChange={e => updateAction(idx, 'type', e.target.value)}
                    >
                      {Object.entries(ACTION_LABELS).map(([k, v]) => (
                        <MenuItem key={k} value={k}>
                          {v}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="إعدادات (JSON)"
                    value={JSON.stringify(act.config || {})}
                    onChange={e => {
                      try {
                        updateAction(idx, 'config', JSON.parse(e.target.value));
                      } catch {}
                    }}
                  />
                </Grid>
                <Grid item xs={2}>
                  <IconButton size="small" color="error" onClick={() => removeAction(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRuleDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveRule}
            disabled={!ruleData.nameAr}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testDialog} onClose={() => setTestDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>نتيجة اختبار القاعدة</DialogTitle>
        <DialogContent>
          {!testResult ? (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">جارٍ تنفيذ الاختبار...</Typography>
            </Box>
          ) : (
            <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mt: 1 }}>
              {testResult.message ||
                (testResult.success ? 'تم تنفيذ الاختبار بنجاح' : 'فشل الاختبار')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
