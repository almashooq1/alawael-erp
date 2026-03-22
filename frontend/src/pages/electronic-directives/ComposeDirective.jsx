/**
 * Compose Directive — إنشاء توجيه إلكتروني جديد
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Snackbar,
  Card,
  CardContent,
  Autocomplete,
} from '@mui/material';
import {
  Send as SendIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  AttachFile as AttachIcon,
  Campaign as CampaignIcon,
} from '@mui/icons-material';
import electronicDirectivesService from '../../services/electronicDirectives.service';
import {
  typeOptions,
  priorityOptions,
  issuerOptions,
  recipientTypeOptions,
  DIRECTIVE_TYPES,
} from './constants';

export default function ComposeDirective() {
  const navigate = useNavigate();

  // ─── Form State ──────────────────────────────────────
  const [form, setForm] = useState({
    subject: '',
    content: '',
    type: 'circular',
    priority: 'normal',
    effectiveFrom: new Date().toISOString().split('T')[0],
    effectiveUntil: '',
    requiresAcknowledgment: false,
    acknowledgmentDeadline: '',
    requiresAction: false,
    actionDeadline: '',
    tags: [],
    categories: [],
    autoExpire: false,
  });

  // Issuer info
  const [issuerType, setIssuerType] = useState('admin');
  const [issuerName, setIssuerName] = useState('');
  const [issuerPosition, setIssuerPosition] = useState('');

  // Recipients
  const [recipients, setRecipients] = useState([
    { type: 'all', name: 'الجميع', targetId: '' },
  ]);

  // Actions
  const [actions, setActions] = useState([]);

  // Attachments
  const [attachments, setAttachments] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // ─── Handlers ────────────────────────────────────────
  const handleChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSwitchChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.checked }));
  };

  // Recipients management
  const addRecipient = () => {
    setRecipients((prev) => [...prev, { type: 'department', name: '', targetId: '' }]);
  };

  const updateRecipient = (index, field, value) => {
    setRecipients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeRecipient = (index) => {
    setRecipients((prev) => prev.filter((_, i) => i !== index));
  };

  // Actions management
  const addAction = () => {
    setActions((prev) => [
      ...prev,
      { description: '', deadline: '', assignee: '' },
    ]);
  };

  const updateAction = (index, field, value) => {
    setActions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeAction = (index) => {
    setActions((prev) => prev.filter((_, i) => i !== index));
  };

  // File attachment
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Build Payload ───────────────────────────────────
  const buildPayload = () => ({
    subject: form.subject.trim(),
    content: form.content.trim(),
    type: form.type,
    priority: form.priority,
    effectiveFrom: form.effectiveFrom,
    effectiveUntil: form.effectiveUntil || undefined,
    issuedBy: {
      type: issuerType,
      name: issuerName.trim() || undefined,
      position: issuerPosition.trim() || undefined,
    },
    recipients: recipients.map((r) => ({
      type: r.type,
      name: r.name.trim() || undefined,
      targetId: r.targetId || undefined,
    })),
    requiresAcknowledgment: form.requiresAcknowledgment,
    acknowledgmentDeadline: form.requiresAcknowledgment
      ? form.acknowledgmentDeadline || undefined
      : undefined,
    requiresAction: actions.length > 0,
    actionDeadline: form.requiresAction ? form.actionDeadline || undefined : undefined,
    requiredActions: actions
      .filter((a) => a.description.trim())
      .map((a) => ({
        description: a.description.trim(),
        deadline: a.deadline || undefined,
      })),
    tags: form.tags,
    categories: form.categories,
    autoExpire: form.autoExpire,
  });

  // ─── Validation ──────────────────────────────────────
  const validate = () => {
    if (!form.subject.trim()) return 'يرجى إدخال موضوع التوجيه';
    if (!form.content.trim()) return 'يرجى إدخال محتوى التوجيه';
    if (!form.effectiveFrom) return 'يرجى تحديد تاريخ السريان';
    if (recipients.length === 0) return 'يرجى إضافة مستلم واحد على الأقل';
    return null;
  };

  // ─── Save / Issue ────────────────────────────────────
  const handleSave = async (issueImmediately = false) => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = buildPayload();
      const res = await electronicDirectivesService.create(payload);
      const directiveId = res.data?.data?._id || res.data?._id;

      // Upload attachments if any
      if (attachments.length > 0 && directiveId) {
        for (const file of attachments) {
          await electronicDirectivesService.uploadAttachment(directiveId, file);
        }
      }

      // Issue immediately if requested
      if (issueImmediately && directiveId) {
        await electronicDirectivesService.issue(directiveId);
      }

      setSnackbar({
        open: true,
        message: issueImmediately
          ? 'تم إصدار التوجيه بنجاح'
          : 'تم حفظ المسودة بنجاح',
        severity: 'success',
      });

      setTimeout(() => {
        navigate(
          directiveId
            ? `/electronic-directives/view/${directiveId}`
            : '/electronic-directives/list'
        );
      }, 1000);
    } catch (err) {
      console.error('Failed to save directive:', err);
      setError(err.response?.data?.message || 'فشل في حفظ التوجيه');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate(-1)}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إنشاء توجيه جديد
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إنشاء وإصدار توجيه إلكتروني جديد
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* ═══ Basic Info ══════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          المعلومات الأساسية
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="موضوع التوجيه *"
              value={form.subject}
              onChange={handleChange('subject')}
              placeholder="أدخل موضوع التوجيه"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>النوع *</InputLabel>
              <Select value={form.type} label="النوع *" onChange={handleChange('type')}>
                {typeOptions.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: t.color,
                        }}
                      />
                      {t.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>الأولوية *</InputLabel>
              <Select
                value={form.priority}
                label="الأولوية *"
                onChange={handleChange('priority')}
              >
                {priorityOptions.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>{p.icon}</span>
                      {p.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="تاريخ السريان *"
              type="date"
              value={form.effectiveFrom}
              onChange={handleChange('effectiveFrom')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="تاريخ الانتهاء"
              type="date"
              value={form.effectiveUntil}
              onChange={handleChange('effectiveUntil')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={6}
              label="محتوى التوجيه *"
              value={form.content}
              onChange={handleChange('content')}
              placeholder="أدخل نص التوجيه بالتفصيل..."
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ═══ Issuer Info ═════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          معلومات المُصدِر
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>نوع المُصدِر</InputLabel>
              <Select
                value={issuerType}
                label="نوع المُصدِر"
                onChange={(e) => setIssuerType(e.target.value)}
              >
                {issuerOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="اسم المُصدِر"
              value={issuerName}
              onChange={(e) => setIssuerName(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="المنصب"
              value={issuerPosition}
              onChange={(e) => setIssuerPosition(e.target.value)}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ═══ Recipients ══════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            المستلمون
          </Typography>
          <Button startIcon={<AddIcon />} onClick={addRecipient} size="small">
            إضافة مستلم
          </Button>
        </Box>
        {recipients.map((r, idx) => (
          <Box key={idx} display="flex" gap={2} mb={2} alignItems="center">
            <FormControl sx={{ minWidth: 150 }} size="small">
              <InputLabel>النوع</InputLabel>
              <Select
                value={r.type}
                label="النوع"
                onChange={(e) => updateRecipient(idx, 'type', e.target.value)}
              >
                {recipientTypeOptions.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="الاسم / المعرّف"
              value={r.name}
              onChange={(e) => updateRecipient(idx, 'name', e.target.value)}
              sx={{ flex: 1 }}
            />
            {recipients.length > 1 && (
              <IconButton color="error" onClick={() => removeRecipient(idx)} size="small">
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        ))}
      </Paper>

      {/* ═══ Requirements ════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          المتطلبات
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.requiresAcknowledgment}
                  onChange={handleSwitchChange('requiresAcknowledgment')}
                />
              }
              label="يتطلب إقراراً بالاستلام"
            />
            {form.requiresAcknowledgment && (
              <TextField
                fullWidth
                label="موعد الإقرار النهائي"
                type="date"
                value={form.acknowledgmentDeadline}
                onChange={handleChange('acknowledgmentDeadline')}
                InputLabelProps={{ shrink: true }}
                sx={{ mt: 1 }}
                size="small"
              />
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.autoExpire}
                  onChange={handleSwitchChange('autoExpire')}
                />
              }
              label="انتهاء صلاحية تلقائي"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ═══ Required Actions ════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            الإجراءات المطلوبة
          </Typography>
          <Button startIcon={<AddIcon />} onClick={addAction} size="small">
            إضافة إجراء
          </Button>
        </Box>
        {actions.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            لا توجد إجراءات مطلوبة — أضف إجراءً ليتم تتبعه
          </Typography>
        ) : (
          actions.map((a, idx) => (
            <Card key={idx} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      size="small"
                      label="وصف الإجراء"
                      value={a.description}
                      onChange={(e) => updateAction(idx, 'description', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label="الموعد النهائي"
                      type="date"
                      value={a.deadline}
                      onChange={(e) => updateAction(idx, 'deadline', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <IconButton color="error" onClick={() => removeAction(idx)}>
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))
        )}
      </Paper>

      {/* ═══ Tags ════════════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          الوسوم والتصنيفات
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={form.tags}
              onChange={(_, newVal) => setForm((prev) => ({ ...prev, tags: newVal }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => (
                <TextField {...params} label="الوسوم" placeholder="أضف وسماً..." size="small" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={form.categories}
              onChange={(_, newVal) => setForm((prev) => ({ ...prev, categories: newVal }))}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="التصنيفات"
                  placeholder="أضف تصنيفاً..."
                  size="small"
                />
              )}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* ═══ Attachments ═════════════════════════════════ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            المرفقات
          </Typography>
          <Button component="label" startIcon={<AttachIcon />} size="small">
            إرفاق ملف
            <input type="file" hidden multiple onChange={handleFileSelect} />
          </Button>
        </Box>
        {attachments.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={2}>
            لا توجد مرفقات
          </Typography>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={1}>
            {attachments.map((file, idx) => (
              <Chip
                key={idx}
                label={file.name}
                onDelete={() => removeAttachment(idx)}
                icon={<AttachIcon />}
                variant="outlined"
              />
            ))}
          </Box>
        )}
      </Paper>

      {/* ═══ Actions ═════════════════════════════════════ */}
      <Box display="flex" justifyContent="flex-end" gap={2}>
        <Button variant="outlined" onClick={() => navigate(-1)} disabled={loading}>
          إلغاء
        </Button>
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={() => handleSave(false)}
          disabled={loading}
        >
          حفظ كمسودة
        </Button>
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          onClick={() => handleSave(true)}
          disabled={loading}
          sx={{ minWidth: 150 }}
        >
          {loading ? 'جاري الإصدار...' : 'إصدار التوجيه'}
        </Button>
      </Box>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
