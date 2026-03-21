/**
 * WorkflowBuilder — منشئ سير العمل المرئي
 *
 * Visual step-based workflow definition builder with:
 * - Drag-style step cards arranged in a visual flow
 * - Step type configuration (start, end, task, approval, condition, notification, etc.)
 * - SLA, assignment, actions configuration per step
 * - Definition metadata (name, category, permissions)
 * - Save as draft / publish
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';

import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import StartIcon from '@mui/icons-material/Start';
import TaskIcon from '@mui/icons-material/Task';
import ApprovalIcon from '@mui/icons-material/Approval';
import SaveIcon from '@mui/icons-material/Save';
import PublishIcon from '@mui/icons-material/Publish';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

// ─── Step type configuration ────────────────────────────────────────────────
const STEP_TYPES = [
  { type: 'start', label: 'البداية', icon: <StartIcon />, color: '#10B981', max: 1 },
  { type: 'task', label: 'مهمة', icon: <TaskIcon />, color: '#3B82F6' },
  { type: 'approval', label: 'موافقة', icon: <ApprovalIcon />, color: '#7C3AED' },
  { type: 'notification', label: 'إشعار', icon: <NotifIcon />, color: '#F59E0B' },
  { type: 'condition', label: 'شرط', icon: <ConditionIcon />, color: '#EF4444' },
  { type: 'parallel', label: 'متوازي', icon: <ParallelIcon />, color: '#EC4899' },
  { type: 'end', label: 'النهاية', icon: <EndIcon />, color: '#6B7280', max: 1 },
];

const CATEGORIES = [
  { value: 'approval', label: 'موافقات' },
  { value: 'request', label: 'طلبات' },
  { value: 'incident', label: 'حوادث' },
  { value: 'change', label: 'تغييرات' },
  { value: 'project', label: 'مشاريع' },
  { value: 'custom', label: 'مخصص' },
];

const ASSIGNMENT_TYPES = [
  { value: 'user', label: 'مستخدم محدد' },
  { value: 'role', label: 'دور وظيفي' },
  { value: 'group', label: 'مجموعة' },
  { value: 'manager', label: 'المدير المباشر' },
  { value: 'previous_assignee', label: 'المسؤول السابق' },
];

const PRIORITIES = [
  { value: 'low', label: 'منخفض', color: '#10B981' },
  { value: 'medium', label: 'متوسط', color: '#3B82F6' },
  { value: 'high', label: 'مرتفع', color: '#F59E0B' },
  { value: 'urgent', label: 'عاجل', color: '#EF4444' },
];

const ACTION_TYPES = [
  { value: 'approve', label: 'موافقة' },
  { value: 'reject', label: 'رفض' },
  { value: 'return', label: 'إعادة' },
  { value: 'delegate', label: 'تفويض' },
  { value: 'custom', label: 'مخصص' },
];

const newStep = (type, index) => ({
  id: `step_${Date.now()}_${index}`,
  name: '',
  nameAr: '',
  type,
  assignment: { type: 'manager' },
  sla: { enabled: false, duration: 0, escalateAfter: 0 },
  taskConfig: {
    priority: 'medium',
    requireComment: false,
    requireAttachment: false,
    actions:
      type === 'approval'
        ? [
            {
              id: `act_approve_${Date.now()}`,
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: '',
            },
            {
              id: `act_reject_${Date.now()}`,
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: '',
            },
          ]
        : [],
  },
  notifications: [],
  conditions: [],
  nextSteps: [],
  position: { x: 200, y: 100 + index * 160 },
});

export default function WorkflowBuilder() {
  const navigate = useNavigate();
  const { id } = useParams();
  const showSnackbar = useSnackbar();
  const [saving, setSaving] = useState(false);

  // Definition metadata
  const [meta, setMeta] = useState({
    name: '',
    nameAr: '',
    code: '',
    description: '',
    category: 'custom',
    permissions: { canStart: ['*'], canView: ['*'], canAdmin: ['admin'] },
    settings: {
      allowReassignment: true,
      allowDelegation: true,
      allowCancellation: true,
      notifyOnComplete: true,
    },
  });

  // Steps
  const [steps, setSteps] = useState([
    { ...newStep('start', 0), name: 'Start', nameAr: 'البداية' },
    { ...newStep('end', 1), name: 'End', nameAr: 'النهاية' },
  ]);

  // Edit dialog
  const [editDialog, setEditDialog] = useState({ open: false, index: -1 });
  const [editStep, setEditStep] = useState(null);

  // Load existing definition
  useEffect(() => {
    if (id) {
      (async () => {
        try {
          const res = await workflowService.getDefinition(id);
          const def = res.data?.data || res.data;
          setMeta({
            name: def.name || '',
            nameAr: def.nameAr || '',
            code: def.code || '',
            description: def.description || '',
            category: def.category || 'custom',
            permissions: def.permissions || {
              canStart: ['*'],
              canView: ['*'],
              canAdmin: ['admin'],
            },
            settings: def.settings || {},
          });
          if (def.steps?.length > 0) setSteps(def.steps);
        } catch {
          showSnackbar('خطأ في تحميل سير العمل', 'error');
        }
      })();
    }
  }, [id, showSnackbar]);

  // Add step
  const addStep = type => {
    const typeConfig = STEP_TYPES.find(t => t.type === type);
    if (typeConfig?.max) {
      const existing = steps.filter(s => s.type === type).length;
      if (existing >= typeConfig.max) {
        showSnackbar(
          `لا يمكن إضافة أكثر من ${typeConfig.max} خطوة من نوع "${typeConfig.label}"`,
          'warning'
        );
        return;
      }
    }
    const idx = steps.length - 1; // Insert before 'end'
    const step = { ...newStep(type, idx) };
    const updated = [...steps];
    updated.splice(idx, 0, step);
    setSteps(updated);
  };

  // Remove step
  const removeStep = index => {
    if (steps[index].type === 'start' || steps[index].type === 'end') return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  // Move step up/down
  const moveStep = (index, direction) => {
    const newIdx = index + direction;
    if (newIdx < 1 || newIdx >= steps.length - 1) return; // Can't move before start or after end
    const updated = [...steps];
    [updated[index], updated[newIdx]] = [updated[newIdx], updated[index]];
    setSteps(updated);
  };

  // Open edit dialog
  const openEdit = index => {
    setEditStep({
      ...steps[index],
      taskConfig: { ...steps[index].taskConfig },
      sla: { ...steps[index].sla },
      assignment: { ...steps[index].assignment },
    });
    setEditDialog({ open: true, index });
  };

  // Save step edit
  const saveStepEdit = () => {
    if (!editStep) return;
    const updated = [...steps];
    updated[editDialog.index] = editStep;
    // Auto-wire nextSteps for sequential flow
    for (let i = 0; i < updated.length - 1; i++) {
      if (updated[i].type !== 'condition' && updated[i].type !== 'parallel') {
        updated[i].nextSteps = [updated[i + 1]?.id].filter(Boolean);
      }
    }
    setSteps(updated);
    setEditDialog({ open: false, index: -1 });
    setEditStep(null);
  };

  // Save definition
  const handleSave = async (publish = false) => {
    if (!meta.nameAr || !meta.code) {
      showSnackbar('يرجى ملء الاسم والرمز', 'warning');
      return;
    }
    if (steps.length < 3) {
      showSnackbar(
        'يجب أن يحتوي سير العمل على خطوة واحدة على الأقل بين البداية والنهاية',
        'warning'
      );
      return;
    }

    setSaving(true);
    try {
      // Auto-wire nextSteps
      const wiredSteps = steps.map((s, i) => ({
        ...s,
        nextSteps: s.type !== 'end' ? [steps[i + 1]?.id].filter(Boolean) : [],
      }));

      const payload = { ...meta, steps: wiredSteps };

      let result;
      if (id) {
        result = await workflowService.updateDefinition(id, payload);
      } else {
        result = await workflowService.createDefinition(payload);
      }

      const defId = result.data?.data?._id || id;

      if (publish && defId) {
        await workflowService.publishDefinition(defId);
        showSnackbar('تم نشر وتفعيل سير العمل بنجاح', 'success');
      } else {
        showSnackbar('تم حفظ سير العمل كمسودة', 'success');
      }

      navigate('/workflow');
    } catch (err) {
      showSnackbar('حدث خطأ في الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Clone step
  const cloneStep = index => {
    const original = steps[index];
    if (original.type === 'start' || original.type === 'end') return;
    const clone = {
      ...JSON.parse(JSON.stringify(original)),
      id: `step_${Date.now()}_clone`,
      nameAr: `${original.nameAr} (نسخة)`,
      name: `${original.name} (copy)`,
    };
    const updated = [...steps];
    updated.splice(index + 1, 0, clone);
    setSteps(updated);
  };

  const getStepTypeConfig = type => STEP_TYPES.find(t => t.type === type) || STEP_TYPES[0];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate('/workflow')}>
            <BackIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={700}>
            {id ? 'تعديل سير العمل' : 'إنشاء سير عمل جديد'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            حفظ كمسودة
          </Button>
          <Button
            variant="contained"
            startIcon={<PublishIcon />}
            onClick={() => handleSave(true)}
            disabled={saving}
            color="success"
          >
            حفظ ونشر
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Metadata */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              معلومات سير العمل
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="الاسم بالعربي *"
                value={meta.nameAr}
                onChange={e => setMeta({ ...meta, nameAr: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="الاسم بالإنجليزي"
                value={meta.name}
                onChange={e => setMeta({ ...meta, name: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="الرمز (Code) *"
                value={meta.code}
                onChange={e =>
                  setMeta({ ...meta, code: e.target.value.replace(/\s/g, '-').toLowerCase() })
                }
                fullWidth
                size="small"
                helperText="رمز فريد لتعريف سير العمل"
              />
              <TextField
                select
                label="التصنيف"
                value={meta.category}
                onChange={e => setMeta({ ...meta, category: e.target.value })}
                fullWidth
                size="small"
              >
                {CATEGORIES.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="الوصف"
                value={meta.description}
                onChange={e => setMeta({ ...meta, description: e.target.value })}
                multiline
                rows={3}
                fullWidth
                size="small"
              />
            </Box>
          </Paper>

          {/* Settings */}
          <Paper sx={{ p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              الإعدادات
            </Typography>
            {[
              { key: 'allowReassignment', label: 'السماح بإعادة التعيين' },
              { key: 'allowDelegation', label: 'السماح بالتفويض' },
              { key: 'allowCancellation', label: 'السماح بالإلغاء' },
              { key: 'notifyOnComplete', label: 'إشعار عند الإكتمال' },
            ].map(({ key, label }) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={meta.settings[key] ?? true}
                    onChange={e =>
                      setMeta({
                        ...meta,
                        settings: { ...meta.settings, [key]: e.target.checked },
                      })
                    }
                    size="small"
                  />
                }
                label={<Typography variant="body2">{label}</Typography>}
                sx={{ display: 'block', mb: 0.5 }}
              />
            ))}
          </Paper>

          {/* Step Palette */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              إضافة خطوة
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {STEP_TYPES.filter(t => t.type !== 'start' && t.type !== 'end').map(t => (
                <Chip
                  key={t.type}
                  icon={t.icon}
                  label={t.label}
                  onClick={() => addStep(t.type)}
                  sx={{
                    bgcolor: alpha(t.color, 0.1),
                    color: t.color,
                    fontWeight: 600,
                    '&:hover': { bgcolor: alpha(t.color, 0.2) },
                    cursor: 'pointer',
                  }}
                />
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Right: Visual Flow */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, minHeight: 500 }}>
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              مسار سير العمل ({steps.length} خطوة)
            </Typography>

            {steps.length < 3 && (
              <Alert severity="info" sx={{ mb: 2 }}>
                أضف خطوات بين البداية والنهاية من القائمة على اليسار
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              {steps.map((step, index) => {
                const typeConf = getStepTypeConfig(step.type);
                const isEdgeStep = step.type === 'start' || step.type === 'end';

                return (
                  <React.Fragment key={step.id}>
                    {/* Step Card */}
                    <Card
                      variant="outlined"
                      sx={{
                        width: '100%',
                        maxWidth: 500,
                        borderColor: alpha(typeConf.color, 0.4),
                        borderWidth: 2,
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: typeConf.color, boxShadow: 3 },
                      }}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar
                              sx={{
                                bgcolor: alpha(typeConf.color, 0.15),
                                color: typeConf.color,
                                width: 36,
                                height: 36,
                              }}
                            >
                              {typeConf.icon}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" fontWeight={600}>
                                {step.nameAr || typeConf.label}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.3 }}>
                                <Chip
                                  size="small"
                                  label={typeConf.label}
                                  sx={{
                                    fontSize: '0.65rem',
                                    height: 20,
                                    bgcolor: alpha(typeConf.color, 0.1),
                                    color: typeConf.color,
                                  }}
                                />
                                {step.sla?.enabled && (
                                  <Chip
                                    size="small"
                                    icon={<SLAIcon sx={{ fontSize: 14 }} />}
                                    label={`${step.sla.duration} دقيقة (${Math.round(step.sla.duration / 60)} ساعة)`}
                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                    color="warning"
                                    variant="outlined"
                                  />
                                )}
                                {step.assignment?.type && !isEdgeStep && (
                                  <Chip
                                    size="small"
                                    icon={<AssignIcon sx={{ fontSize: 14 }} />}
                                    label={
                                      ASSIGNMENT_TYPES.find(a => a.value === step.assignment.type)
                                        ?.label || ''
                                    }
                                    sx={{ fontSize: '0.65rem', height: 20 }}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            {!isEdgeStep && (
                              <>
                                <Tooltip title="نقل للأعلى">
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={index <= 1}
                                      onClick={() => moveStep(index, index - 1)}
                                    >
                                      <ArrowUpIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="نقل للأسفل">
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={index >= steps.length - 2}
                                      onClick={() => moveStep(index, index + 1)}
                                    >
                                      <ArrowIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="تعديل">
                                  <IconButton size="small" onClick={() => openEdit(index)}>
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="نسخ">
                                  <IconButton size="small" onClick={() => cloneStep(index)}>
                                    <CloneIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => removeStep(index)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {isEdgeStep && step.type === 'start' && (
                              <Tooltip title="تعديل">
                                <IconButton size="small" onClick={() => openEdit(index)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>

                        {/* Actions display for approval/task */}
                        {step.taskConfig?.actions?.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                            {step.taskConfig.actions.map(act => (
                              <Chip
                                key={act.id}
                                size="small"
                                label={act.labelAr || act.label}
                                color={
                                  act.type === 'approve'
                                    ? 'success'
                                    : act.type === 'reject'
                                      ? 'error'
                                      : 'default'
                                }
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>

                    {/* Arrow connector */}
                    {index < steps.length - 1 && (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          my: 0.5,
                        }}
                      >
                        <ArrowIcon sx={{ color: 'text.disabled', fontSize: 28 }} />
                      </Box>
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Step Edit Dialog ───────────────────────────────────────────────── */}
      <Dialog
        open={editDialog.open}
        onClose={() => setEditDialog({ open: false, index: -1 })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل الخطوة</DialogTitle>
        <DialogContent dividers>
          {editStep && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="الاسم بالعربي"
                value={editStep.nameAr}
                onChange={e => setEditStep({ ...editStep, nameAr: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="الاسم بالإنجليزي"
                value={editStep.name}
                onChange={e => setEditStep({ ...editStep, name: e.target.value })}
                fullWidth
                size="small"
              />

              {/* Assignment (for task/approval) */}
              {['task', 'approval'].includes(editStep.type) && (
                <>
                  <Divider>
                    <Chip label="التعيين" size="small" />
                  </Divider>
                  <TextField
                    select
                    label="نوع التعيين"
                    value={editStep.assignment?.type || 'manager'}
                    onChange={e =>
                      setEditStep({
                        ...editStep,
                        assignment: { ...editStep.assignment, type: e.target.value },
                      })
                    }
                    fullWidth
                    size="small"
                  >
                    {ASSIGNMENT_TYPES.map(a => (
                      <MenuItem key={a.value} value={a.value}>
                        {a.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="الأولوية"
                    value={editStep.taskConfig?.priority || 'medium'}
                    onChange={e =>
                      setEditStep({
                        ...editStep,
                        taskConfig: { ...editStep.taskConfig, priority: e.target.value },
                      })
                    }
                    fullWidth
                    size="small"
                  >
                    {PRIORITIES.map(p => (
                      <MenuItem key={p.value} value={p.value}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={editStep.taskConfig?.requireComment ?? false}
                          onChange={e =>
                            setEditStep({
                              ...editStep,
                              taskConfig: {
                                ...editStep.taskConfig,
                                requireComment: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="تعليق مطلوب"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={editStep.taskConfig?.requireAttachment ?? false}
                          onChange={e =>
                            setEditStep({
                              ...editStep,
                              taskConfig: {
                                ...editStep.taskConfig,
                                requireAttachment: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label="مرفق مطلوب"
                    />
                  </Box>
                </>
              )}

              {/* SLA */}
              <Divider>
                <Chip label="اتفاقية مستوى الخدمة (SLA)" size="small" />
              </Divider>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={editStep.sla?.enabled ?? false}
                    onChange={e =>
                      setEditStep({
                        ...editStep,
                        sla: { ...editStep.sla, enabled: e.target.checked },
                      })
                    }
                  />
                }
                label="تفعيل SLA"
              />
              {editStep.sla?.enabled && (
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="المدة (دقائق)"
                    type="number"
                    value={editStep.sla?.duration || 0}
                    onChange={e =>
                      setEditStep({
                        ...editStep,
                        sla: { ...editStep.sla, duration: parseInt(e.target.value) || 0 },
                      })
                    }
                    size="small"
                    sx={{ flex: 1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">دقيقة</InputAdornment>,
                    }}
                  />
                  <TextField
                    label="التصعيد بعد (دقائق)"
                    type="number"
                    value={editStep.sla?.escalateAfter || 0}
                    onChange={e =>
                      setEditStep({
                        ...editStep,
                        sla: { ...editStep.sla, escalateAfter: parseInt(e.target.value) || 0 },
                      })
                    }
                    size="small"
                    sx={{ flex: 1 }}
                  />
                </Box>
              )}

              {/* Actions (for approval type) */}
              {editStep.type === 'approval' && (
                <>
                  <Divider>
                    <Chip label="الإجراءات المتاحة" size="small" />
                  </Divider>
                  {(editStep.taskConfig?.actions || []).map((action, ai) => (
                    <Box
                      key={action.id || ai}
                      sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                    >
                      <TextField
                        label="الاسم بالعربي"
                        value={action.labelAr || ''}
                        onChange={e => {
                          const actions = [...(editStep.taskConfig?.actions || [])];
                          actions[ai] = { ...actions[ai], labelAr: e.target.value };
                          setEditStep({
                            ...editStep,
                            taskConfig: { ...editStep.taskConfig, actions },
                          });
                        }}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        select
                        label="النوع"
                        value={action.type || 'custom'}
                        onChange={e => {
                          const actions = [...(editStep.taskConfig?.actions || [])];
                          actions[ai] = { ...actions[ai], type: e.target.value };
                          setEditStep({
                            ...editStep,
                            taskConfig: { ...editStep.taskConfig, actions },
                          });
                        }}
                        size="small"
                        sx={{ width: 120 }}
                      >
                        {ACTION_TYPES.map(at => (
                          <MenuItem key={at.value} value={at.value}>
                            {at.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          const actions = (editStep.taskConfig?.actions || []).filter(
                            (_, j) => j !== ai
                          );
                          setEditStep({
                            ...editStep,
                            taskConfig: { ...editStep.taskConfig, actions },
                          });
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const actions = [
                        ...(editStep.taskConfig?.actions || []),
                        {
                          id: `act_${Date.now()}`,
                          label: '',
                          labelAr: '',
                          type: 'custom',
                          nextStep: '',
                        },
                      ];
                      setEditStep({ ...editStep, taskConfig: { ...editStep.taskConfig, actions } });
                    }}
                  >
                    إضافة إجراء
                  </Button>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, index: -1 })}>إلغاء</Button>
          <Button variant="contained" onClick={saveStepEdit}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
