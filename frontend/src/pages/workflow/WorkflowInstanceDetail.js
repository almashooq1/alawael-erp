/**
 * WorkflowInstanceDetail — تفاصيل نسخة سير العمل
 *
 * Shows visual step progress, current task, audit timeline,
 * variables, metadata, and lifecycle actions (cancel/suspend/resume).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Chip,
  IconButton,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  LinearProgress,
  alpha,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Cancel as CancelIcon,
  PauseCircle as SuspendIcon,
  PlayCircle as ResumeIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
  HourglassBottom as PendingIcon,
  Assignment as TaskIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Description as DescIcon,
  AccountTree as WorkflowIcon,
  Circle as DotIcon,
  Timeline as AuditIcon,
  DataObject as VarIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

// ─── Constants ──────────────────────────────────────────────────────────────
const INSTANCE_STATUS = {
  running: { label: 'قيد التنفيذ', color: 'primary', icon: <WorkflowIcon /> },
  completed: { label: 'مكتمل', color: 'success', icon: <CompleteIcon /> },
  cancelled: { label: 'ملغي', color: 'error', icon: <CancelIcon /> },
  error: { label: 'خطأ', color: 'error', icon: <ErrorIcon /> },
  suspended: { label: 'مُعلّق', color: 'warning', icon: <SuspendIcon /> },
};

const TASK_STATUS_COLORS = {
  completed: 'success',
  in_progress: 'warning',
  assigned: 'info',
  pending: 'default',
  cancelled: 'error',
  skipped: 'default',
};
const TASK_STATUS_LABELS = {
  completed: 'مكتمل',
  in_progress: 'جاري',
  assigned: 'معين',
  pending: 'قيد الانتظار',
  cancelled: 'ملغي',
  skipped: 'تم تخطيه',
};

const STEP_TYPE_LABELS = {
  start: 'بداية',
  end: 'نهاية',
  task: 'مهمة',
  approval: 'موافقة',
  notification: 'إشعار',
  condition: 'شرط',
  parallel: 'متوازي',
  subprocess: 'عملية فرعية',
  integration: 'تكامل',
};

const PRIORITY_CONFIG = {
  low: { label: 'منخفض', color: '#10B981' },
  medium: { label: 'متوسط', color: '#3B82F6' },
  high: { label: 'مرتفع', color: '#F59E0B' },
  urgent: { label: 'عاجل', color: '#EF4444' },
};

const fmtDate = d =>
  d
    ? new Date(d).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

export default function WorkflowInstanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [instance, setInstance] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const instRes = await workflowService.getInstance(id);
      const resData = instRes.data.data;
      // Backend returns { instance, tasks, auditLog }
      if (resData.instance) {
        // Merge tasks into the instance object for easy access
        setInstance({ ...resData.instance, tasks: resData.tasks || [] });
        setAuditLog(resData.auditLog || []);
      } else {
        // Fallback: flat instance object
        setInstance(resData);
        // Fetch audit separately if not included
        try {
          const auditRes = await workflowService.getAuditLog({ workflowInstanceId: id, limit: 50 });
          setAuditLog(auditRes.data.data || []);
        } catch {
          /* ignore */
        }
      }
    } catch {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = async () => {
    try {
      await workflowService.cancelInstance(id, cancelReason);
      showSnackbar('تم إلغاء سير العمل', 'success');
      setCancelDialog(false);
      fetchData();
    } catch {
      showSnackbar('خطأ في الإلغاء', 'error');
    }
  };

  const handleSuspend = async () => {
    try {
      await workflowService.suspendInstance(id);
      showSnackbar('تم تعليق سير العمل', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const handleResume = async () => {
    try {
      await workflowService.resumeInstance(id);
      showSnackbar('تم استئناف سير العمل', 'success');
      fetchData();
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  if (loading) return <LinearProgress />;
  if (!instance)
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">لم يتم العثور على النسخة</Typography>
        <Button onClick={() => navigate('/workflow')} startIcon={<BackIcon />} sx={{ mt: 2 }}>
          العودة
        </Button>
      </Box>
    );

  const def = instance.definition || {};
  const steps = def.steps || [];
  const priority = PRIORITY_CONFIG[instance.priority] || PRIORITY_CONFIG.medium;
  const currentStepIdx = steps.findIndex(s => s.id === instance.currentStep);
  const statusCfg = INSTANCE_STATUS[instance.status] || INSTANCE_STATUS.running;

  // Tasks grouped by step
  const tasksByStep = {};
  (instance.tasks || []).forEach(t => {
    if (!tasksByStep[t.stepId]) tasksByStep[t.stepId] = [];
    tasksByStep[t.stepId].push(t);
  });

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {def.nameAr || def.name || 'سير عمل'}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <Chip
                size="small"
                label={statusCfg.label}
                color={statusCfg.color}
                icon={statusCfg.icon}
              />
              <Chip
                size="small"
                label={priority.label}
                sx={{ bgcolor: alpha(priority.color, 0.1), color: priority.color, fontWeight: 600 }}
              />
              <span>بدأ {fmtDate(instance.startedAt || instance.createdAt)}</span>
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {instance.status === 'running' && (
            <>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<SuspendIcon />}
                onClick={handleSuspend}
              >
                تعليق
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => setCancelDialog(true)}
              >
                إلغاء
              </Button>
            </>
          )}
          {instance.status === 'suspended' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<ResumeIcon />}
              onClick={handleResume}
            >
              استئناف
            </Button>
          )}
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Visual Progress */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <WorkflowIcon color="primary" /> مسار سير العمل
            </Typography>
            <Stepper activeStep={currentStepIdx} orientation="vertical">
              {steps.map((step, idx) => {
                const stepTasks = tasksByStep[step.id] || [];
                const isCompleted = idx < currentStepIdx || instance.status === 'completed';
                const isCurrent = idx === currentStepIdx && instance.status === 'running';

                return (
                  <Step key={step.id} completed={isCompleted}>
                    <StepLabel
                      error={step.type === 'end' && instance.status === 'error'}
                      optional={
                        <Typography variant="caption" color="text.secondary">
                          {STEP_TYPE_LABELS[step.type] || step.type}
                          {step.sla?.duration ? ` • مهلة: ${step.sla.duration} ساعة` : ''}
                        </Typography>
                      }
                    >
                      <Typography
                        fontWeight={isCurrent ? 700 : 400}
                        color={isCurrent ? 'primary' : 'inherit'}
                      >
                        {step.nameAr || step.name}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      {stepTasks.length > 0 && (
                        <Box sx={{ mb: 1 }}>
                          {stepTasks.map(t => (
                            <Box
                              key={t._id}
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                py: 0.5,
                                borderRight: isCurrent ? '3px solid' : 'none',
                                borderColor: 'primary.main',
                                pr: isCurrent ? 1 : 0,
                              }}
                            >
                              <Chip
                                size="small"
                                label={TASK_STATUS_LABELS[t.status] || t.status}
                                color={TASK_STATUS_COLORS[t.status] || 'default'}
                              />
                              <Typography variant="body2">{t.nameAr || t.name}</Typography>
                              {t.assignee?.name && (
                                <Chip
                                  size="small"
                                  icon={<PersonIcon />}
                                  label={t.assignee.name}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </StepContent>
                  </Step>
                );
              })}
            </Stepper>
          </Paper>

          {/* Audit Trail */}
          <Paper sx={{ p: 3 }}>
            <Typography
              variant="h6"
              fontWeight={700}
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <AuditIcon color="primary" /> سجل النشاط
            </Typography>
            {auditLog.length === 0 ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'center', py: 3 }}
              >
                لا يوجد سجل نشاط بعد
              </Typography>
            ) : (
              <List dense>
                {auditLog.map((entry, idx) => (
                  <ListItem key={idx} sx={{ alignItems: 'flex-start' }}>
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                      <DotIcon
                        sx={{
                          fontSize: 12,
                          color: entry.action?.includes('complete')
                            ? '#10B981'
                            : entry.action?.includes('cancel')
                              ? '#EF4444'
                              : entry.action?.includes('start')
                                ? '#3B82F6'
                                : '#9CA3AF',
                        }}
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.action || 'إجراء'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {fmtDate(entry.createdAt || entry.timestamp)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box>
                          {entry.performedBy?.name && (
                            <Typography variant="caption" color="text.secondary">
                              بواسطة: {entry.performedBy.name}
                            </Typography>
                          )}
                          {entry.details && (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {typeof entry.details === 'string'
                                ? entry.details
                                : JSON.stringify(entry.details)}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right: Metadata */}
        <Grid item xs={12} md={4}>
          {/* Instance Info */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              معلومات النسخة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <InfoRow icon={<DescIcon />} label="التعريف" value={def.nameAr || def.name || '—'} />
              <InfoRow
                icon={<PersonIcon />}
                label="مقدم الطلب"
                value={instance.requester?.name || '—'}
              />
              <InfoRow
                icon={<TimeIcon />}
                label="تاريخ البدء"
                value={fmtDate(instance.startedAt || instance.createdAt)}
              />
              {instance.completedAt && (
                <InfoRow
                  icon={<CompleteIcon />}
                  label="تاريخ الإتمام"
                  value={fmtDate(instance.completedAt)}
                />
              )}
              <InfoRow
                icon={<TaskIcon />}
                label="الخطوة الحالية"
                value={steps[currentStepIdx]?.nameAr || steps[currentStepIdx]?.name || '—'}
              />
              {instance.sla?.deadline && (
                <InfoRow
                  icon={<PendingIcon />}
                  label="مهلة SLA"
                  value={fmtDate(instance.sla.deadline)}
                />
              )}
            </Box>
          </Paper>

          {/* Variables */}
          {instance.variables && Object.keys(instance.variables).length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                gutterBottom
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                <VarIcon fontSize="small" /> المتغيرات
              </Typography>
              {Object.entries(instance.variables).map(([k, v]) => (
                <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {k}
                  </Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </Typography>
                </Box>
              ))}
            </Paper>
          )}

          {/* ID */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              معرفات
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  معرف النسخة
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}
                >
                  {instance._id}
                </Typography>
              </Box>
              {def._id && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    معرف التعريف
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}
                  >
                    {def._id}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إلغاء سير العمل</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            سيتم إلغاء سير العمل نهائياً ولا يمكن التراجع عن ذلك
          </Alert>
          <TextField
            label="سبب الإلغاء"
            multiline
            rows={3}
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>تراجع</Button>
          <Button variant="contained" color="error" onClick={handleCancel}>
            تأكيد الإلغاء
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Helper component
function InfoRow({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ color: 'text.secondary', display: 'flex' }}>
        {React.cloneElement(icon, { fontSize: 'small' })}
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Box>
  );
}
