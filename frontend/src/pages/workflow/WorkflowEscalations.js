/**
 * WorkflowEscalations — إدارة التصعيد
 *
 * Manage escalation rules (creation, editing, toggling) and
 * view escalation logs with resolution interface.
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
  Tooltip,
  Tabs,
  Tab,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Warning as WarningIcon,
  Notifications as NotifyIcon,
  TrendingUp as EscalateIcon,
  CheckCircle as ResolvedIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const TRIGGER_LABELS = {
  deadline_approaching: 'اقتراب الموعد النهائي',
  deadline_passed: 'تجاوز الموعد النهائي',
  no_action: 'عدم اتخاذ إجراء',
  sla_breach: 'خرق مستوى الخدمة',
  manual: 'تصعيد يدوي',
  error: 'حدوث خطأ',
};

const TRIGGER_COLORS = {
  deadline_approaching: '#FF9800',
  deadline_passed: '#F44336',
  no_action: '#E91E63',
  sla_breach: '#D32F2F',
  manual: '#2196F3',
  error: '#FF5722',
};

const STATUS_CONFIG = {
  triggered: { label: 'مفعّل', color: '#FF9800', icon: <WarningIcon /> },
  notified: { label: 'تم الإبلاغ', color: '#2196F3', icon: <NotifyIcon /> },
  escalated: { label: 'تم التصعيد', color: '#F44336', icon: <EscalateIcon /> },
  resolved: { label: 'تم الحل', color: '#4CAF50', icon: <ResolvedIcon /> },
  expired: { label: 'منتهي', color: '#9E9E9E', icon: <TimerIcon /> },
};

export default function WorkflowEscalations() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  // Rules state
  const [rules, setRules] = useState([]);
  const [stats, setStats] = useState(null);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleData, setRuleData] = useState({
    name: '',
    nameAr: '',
    trigger: 'deadline_passed',
    priority: 'medium',
    isActive: true,
    conditions: { overdueMinutes: 60 },
    levels: [{ level: 1, action: 'notify', notifyRoles: ['manager'], waitMinutes: 30 }],
  });

  // Logs state
  const [logs, setLogs] = useState([]);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rulesRes, statsRes, logsRes] = await Promise.all([
        workflowService.getEscalationRules(),
        workflowService.getEscalationStats(),
        workflowService.getEscalationLogs({ limit: 20 }),
      ]);
      setRules(rulesRes.data?.data || []);
      setStats(statsRes.data?.data || null);
      setLogs(logsRes.data?.data || []);
    } catch (err) {
      showSnackbar('خطأ في تحميل بيانات التصعيد', 'error');
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
        await workflowService.updateEscalationRule(editingRule._id, ruleData);
        showSnackbar('تم تحديث قاعدة التصعيد', 'success');
      } else {
        await workflowService.createEscalationRule(ruleData);
        showSnackbar('تم إنشاء قاعدة التصعيد', 'success');
      }
      setRuleDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حفظ قاعدة التصعيد', 'error');
    }
  };

  const handleDeleteRule = async id => {
    if (!window.confirm('هل تريد حذف قاعدة التصعيد؟')) return;
    try {
      await workflowService.deleteEscalationRule(id);
      showSnackbar('تم حذف قاعدة التصعيد', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حذف القاعدة', 'error');
    }
  };

  const handleToggleRule = async id => {
    try {
      await workflowService.toggleEscalationRule(id);
      showSnackbar('تم تغيير حالة القاعدة', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في تغيير الحالة', 'error');
    }
  };

  const handleResolveLog = async () => {
    if (!selectedLog) return;
    try {
      await workflowService.resolveEscalation(selectedLog._id, { resolution: resolutionNote });
      showSnackbar('تم حل التصعيد بنجاح', 'success');
      setResolveDialog(false);
      fetchData();
    } catch (err) {
      showSnackbar('خطأ في حل التصعيد', 'error');
    }
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleData({
      name: '',
      nameAr: '',
      trigger: 'deadline_passed',
      priority: 'medium',
      isActive: true,
      conditions: { overdueMinutes: 60 },
      levels: [{ level: 1, action: 'notify', notifyRoles: ['manager'], waitMinutes: 30 }],
    });
    setRuleDialog(true);
  };

  const openEditRule = rule => {
    setEditingRule(rule);
    setRuleData({
      name: rule.name,
      nameAr: rule.nameAr,
      trigger: rule.trigger,
      priority: rule.priority,
      isActive: rule.isActive,
      conditions: rule.conditions || {},
      levels: rule.levels || [],
    });
    setRuleDialog(true);
  };

  const addLevel = () => {
    setRuleData(prev => ({
      ...prev,
      levels: [
        ...prev.levels,
        {
          level: prev.levels.length + 1,
          action: 'notify',
          notifyRoles: ['admin'],
          waitMinutes: 60,
        },
      ],
    }));
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
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
            إدارة التصعيد
          </Typography>
          <Chip icon={<WarningIcon />} label="Escalation" size="small" color="warning" />
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
            { label: 'قواعد نشطة', value: stats.activeRules || 0, color: '#4CAF50' },
            { label: 'تصعيدات مفتوحة', value: stats.openEscalations || 0, color: '#FF9800' },
            { label: 'تم الحل', value: stats.resolvedEscalations || 0, color: '#9C27B0' },
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
        <Tab label="قواعد التصعيد" />
        <Tab
          label={
            <Badge badgeContent={logs.filter(l => l.status !== 'resolved').length} color="error">
              سجل التصعيدات
            </Badge>
          }
        />
      </Tabs>

      {/* Rules Tab */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>القاعدة</TableCell>
                <TableCell>المحفز</TableCell>
                <TableCell>الأولوية</TableCell>
                <TableCell>المستويات</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      لا توجد قواعد تصعيد
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rules.map(rule => (
                  <TableRow key={rule._id} hover>
                    <TableCell>
                      <Typography fontWeight={600}>{rule.nameAr || rule.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TRIGGER_LABELS[rule.trigger] || rule.trigger}
                        size="small"
                        sx={{
                          bgcolor: alpha(TRIGGER_COLORS[rule.trigger] || '#999', 0.12),
                          color: TRIGGER_COLORS[rule.trigger] || '#999',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          rule.priority === 'critical'
                            ? 'حرج'
                            : rule.priority === 'high'
                              ? 'عالي'
                              : rule.priority === 'medium'
                                ? 'متوسط'
                                : 'منخفض'
                        }
                        color={
                          rule.priority === 'critical'
                            ? 'error'
                            : rule.priority === 'high'
                              ? 'warning'
                              : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{rule.levels?.length || 0} مستويات</TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.isActive}
                        size="small"
                        onChange={() => handleToggleRule(rule._id)}
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Logs Tab */}
      {tab === 1 && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الحالة</TableCell>
                <TableCell>القاعدة</TableCell>
                <TableCell>المستوى الحالي</TableCell>
                <TableCell>وقت التصعيد</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary" sx={{ py: 3 }}>
                      لا توجد سجلات تصعيد
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map(log => {
                  const st = STATUS_CONFIG[log.status] || STATUS_CONFIG.triggered;
                  return (
                    <TableRow key={log._id} hover>
                      <TableCell>
                        <Chip
                          icon={st.icon}
                          label={st.label}
                          size="small"
                          sx={{ bgcolor: alpha(st.color, 0.12), color: st.color }}
                        />
                      </TableCell>
                      <TableCell>{log.ruleId?.nameAr || log.ruleId?.name || '—'}</TableCell>
                      <TableCell>المستوى {log.currentLevel || 1}</TableCell>
                      <TableCell>
                        {log.triggeredAt ? new Date(log.triggeredAt).toLocaleString('ar-SA') : '—'}
                      </TableCell>
                      <TableCell>
                        {log.status !== 'resolved' && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => {
                              setSelectedLog(log);
                              setResolutionNote('');
                              setResolveDialog(true);
                            }}
                          >
                            حل
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onClose={() => setRuleDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingRule ? 'تعديل قاعدة التصعيد' : 'إنشاء قاعدة تصعيد'}</DialogTitle>
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
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>المحفز</InputLabel>
                <Select
                  value={ruleData.trigger}
                  label="المحفز"
                  onChange={e => setRuleData(p => ({ ...p, trigger: e.target.value }))}
                >
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الأولوية</InputLabel>
                <Select
                  value={ruleData.priority}
                  label="الأولوية"
                  onChange={e => setRuleData(p => ({ ...p, priority: e.target.value }))}
                >
                  <MenuItem value="low">منخفض</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="high">عالي</MenuItem>
                  <MenuItem value="critical">حرج</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="وقت التأخير (دقائق)"
                value={ruleData.conditions?.overdueMinutes || 60}
                onChange={e =>
                  setRuleData(p => ({
                    ...p,
                    conditions: { ...p.conditions, overdueMinutes: Number(e.target.value) },
                  }))
                }
              />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              مستويات التصعيد ({ruleData.levels.length})
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addLevel}>
              إضافة مستوى
            </Button>
          </Box>
          {ruleData.levels.map((lvl, idx) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                mb: 1,
                bgcolor: alpha('#FF9800', 0.04),
                border: '1px solid',
                borderColor: alpha('#FF9800', 0.2),
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={1}>
                  <Chip label={`${lvl.level}`} color="warning" size="small" />
                </Grid>
                <Grid item xs={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>الإجراء</InputLabel>
                    <Select
                      value={lvl.action}
                      label="الإجراء"
                      onChange={e => {
                        const updated = [...ruleData.levels];
                        updated[idx] = { ...updated[idx], action: e.target.value };
                        setRuleData(p => ({ ...p, levels: updated }));
                      }}
                    >
                      <MenuItem value="notify">إشعار</MenuItem>
                      <MenuItem value="reassign">إعادة تعيين</MenuItem>
                      <MenuItem value="escalate">تصعيد</MenuItem>
                      <MenuItem value="auto_resolve">حل تلقائي</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="وقت الانتظار (دقائق)"
                    type="number"
                    value={lvl.waitMinutes}
                    onChange={e => {
                      const updated = [...ruleData.levels];
                      updated[idx] = { ...updated[idx], waitMinutes: Number(e.target.value) };
                      setRuleData(p => ({ ...p, levels: updated }));
                    }}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="الأدوار المبلّغة"
                    value={(lvl.notifyRoles || []).join(', ')}
                    onChange={e => {
                      const updated = [...ruleData.levels];
                      updated[idx] = {
                        ...updated[idx],
                        notifyRoles: e.target.value.split(',').map(s => s.trim()),
                      };
                      setRuleData(p => ({ ...p, levels: updated }));
                    }}
                  />
                </Grid>
                <Grid item xs={1}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      setRuleData(p => ({ ...p, levels: p.levels.filter((_, i) => i !== idx) }))
                    }
                  >
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

      {/* Resolve Dialog */}
      <Dialog open={resolveDialog} onClose={() => setResolveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>حل التصعيد</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="ملاحظات الحل"
            value={resolutionNote}
            onChange={e => setResolutionNote(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolveDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleResolveLog}>
            تأكيد الحل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
