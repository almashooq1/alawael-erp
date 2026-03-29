import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import eSignatureService from '../../services/eSignature.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Avatar,
  Divider,
  Tooltip,  CircularProgress,
  Switch,
  FormControlLabel,} from '@mui/material';
import {
  Add as AddIcon,
  Edit,
  Delete,
  Description,
  ArrowBack,
  ContentCopy,  Refresh,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Categories ════════════════════════════════════════════════════════ */
const categories = [
  { value: 'contracts', label: 'العقود', icon: '📄' },
  { value: 'agreements', label: 'الاتفاقيات', icon: '🤝' },
  { value: 'approvals', label: 'الموافقات', icon: '✅' },
  { value: 'memos', label: 'المذكرات', icon: '📝' },
  { value: 'policies', label: 'السياسات', icon: '📋' },
  { value: 'authorizations', label: 'التفويضات', icon: '🔑' },
  { value: 'financial', label: 'المالية', icon: '💰' },
  { value: 'hr', label: 'الموارد البشرية', icon: '👥' },
  { value: 'medical', label: 'الطبية', icon: '🏥' },
  { value: 'legal', label: 'القانونية', icon: '⚖️' },
  { value: 'other', label: 'أخرى', icon: '📎' },
];

const signerRoles = [
  { value: 'signer', label: 'موقّع' },
  { value: 'approver', label: 'معتمد' },
  { value: 'witness', label: 'شاهد' },
  { value: 'reviewer', label: 'مراجع' },
  { value: 'cc', label: 'نسخة' },
];

const emptyTemplate = {
  templateCode: '',
  name_ar: '',
  name_en: '',
  description_ar: '',
  category: 'contracts',
  defaultSigners: [],
  workflow: {
    sequential: true,
    requireAllSigners: true,
    allowDelegation: false,
    expiryDays: 30,
    autoReminder: true,
    reminderIntervalHours: 48,
    allowRejection: true,
    requireRejectionReason: true,
  },
  security: {
    requireOTP: false,
    requireNationalId: false,
  },
};

const emptyDefaultSigner = {
  role: 'signer',
  title_ar: '',
  order: 1,
  required: true,
  defaultDepartment: '',
};

export default function ESignatureTemplates() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...emptyTemplate });
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');

  /* ─── Load Templates ───────────────────────────────────────────────────── */
  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterCategory) params.category = filterCategory;
      const res = await eSignatureService.getTemplates(params);
      if (res?.data?.data) setTemplates(res.data.data);
    } catch {
      showSnackbar('خطأ في تحميل القوالب', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  /* ─── Open dialog ──────────────────────────────────────────────────────── */
  const openCreateDialog = () => {
    setEditing(null);
    setForm({
      ...emptyTemplate,
      defaultSigners: [],
      workflow: { ...emptyTemplate.workflow },
      security: { ...emptyTemplate.security },
    });
    setDialogOpen(true);
  };

  const openEditDialog = tpl => {
    setEditing(tpl);
    setForm({
      templateCode: tpl.templateCode || '',
      name_ar: tpl.name_ar || '',
      name_en: tpl.name_en || '',
      description_ar: tpl.description_ar || '',
      category: tpl.category || 'contracts',
      defaultSigners: tpl.defaultSigners?.map(s => ({ ...s })) || [],
      workflow: { ...emptyTemplate.workflow, ...(tpl.workflow || {}) },
      security: { ...emptyTemplate.security, ...(tpl.security || {}) },
    });
    setDialogOpen(true);
  };

  /* ─── Default Signers helpers ──────────────────────────────────────────── */
  const addDefaultSigner = () => {
    setForm(prev => ({
      ...prev,
      defaultSigners: [
        ...prev.defaultSigners,
        { ...emptyDefaultSigner, order: prev.defaultSigners.length + 1 },
      ],
    }));
  };

  const removeDefaultSigner = i => {
    setForm(prev => ({
      ...prev,
      defaultSigners: prev.defaultSigners.filter((_, idx) => idx !== i),
    }));
  };

  const updateDefaultSigner = (i, field, value) => {
    setForm(prev => ({
      ...prev,
      defaultSigners: prev.defaultSigners.map((s, idx) =>
        idx === i ? { ...s, [field]: value } : s
      ),
    }));
  };

  /* ─── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!form.templateCode || !form.name_ar || !form.category) {
      showSnackbar('الكود والاسم والتصنيف مطلوبون', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await eSignatureService.updateTemplate(editing._id, form);
        showSnackbar('تم تحديث القالب بنجاح', 'success');
      } else {
        await eSignatureService.createTemplate(form);
        showSnackbar('تم إنشاء القالب بنجاح', 'success');
      }
      setDialogOpen(false);
      loadTemplates();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في حفظ القالب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Delete ───────────────────────────────────────────────────────────── */
  const handleDelete = async id => {
    try {
      await eSignatureService.deleteTemplate(id);
      showSnackbar('تم حذف القالب', 'success');
      loadTemplates();
    } catch {
      showSnackbar('خطأ في حذف القالب', 'error');
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Description sx={{ fontSize: 32 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                قوالب التوقيع الإلكتروني
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إدارة قوالب المستندات لتسريع إنشاء طلبات التوقيع
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/e-signature')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              رجوع
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
            >
              قالب جديد
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ─── Category Filter ─────────────────────────────────────────────── */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ ml: 1 }}>
            تصفية:
          </Typography>
          <Chip
            label="الكل"
            onClick={() => setFilterCategory('')}
            color={!filterCategory ? 'primary' : 'default'}
            variant={!filterCategory ? 'filled' : 'outlined'}
          />
          {categories.map(cat => (
            <Chip
              key={cat.value}
              label={`${cat.icon} ${cat.label}`}
              onClick={() => setFilterCategory(cat.value)}
              color={filterCategory === cat.value ? 'primary' : 'default'}
              variant={filterCategory === cat.value ? 'filled' : 'outlined'}
            />
          ))}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="تحديث">
            <IconButton onClick={loadTemplates}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* ─── Loading ─────────────────────────────────────────────────────── */}
      {loading && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* ─── Templates Grid ──────────────────────────────────────────────── */}
      {!loading && templates.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <Description sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            لا توجد قوالب
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ابدأ بإنشاء قالب جديد لتسهيل عملية إنشاء طلبات التوقيع
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
            إنشاء قالب
          </Button>
        </Paper>
      )}

      <Grid container spacing={3}>
        {templates.map(tpl => {
          const cat = categories.find(c => c.value === tpl.category);
          return (
            <Grid item xs={12} sm={6} md={4} key={tpl._id}>
              <Card
                sx={{
                  borderRadius: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  '&:hover': { boxShadow: 6 },
                  transition: 'box-shadow 0.2s',
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 2,
                    }}
                  >
                    <Chip
                      label={`${cat?.icon || '📎'} ${cat?.label || tpl.category}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip label={`v${tpl.version || 1}`} size="small" color="info" />
                  </Box>

                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {tpl.name_ar}
                  </Typography>
                  {tpl.description_ar && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        lineClamp: 2,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {tpl.description_ar}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${tpl.defaultSigners?.length || 0} موقع`}
                      size="small"
                      icon={<span>👤</span>}
                    />
                    <Chip label={tpl.workflow?.sequential ? 'تسلسلي' : 'متوازي'} size="small" />
                    {tpl.usageCount > 0 && (
                      <Chip
                        label={`${tpl.usageCount} استخدام`}
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: 'monospace' }}
                  >
                    {tpl.templateCode}
                  </Typography>
                </CardContent>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                  <Tooltip title="تعديل">
                    <IconButton size="small" onClick={() => openEditDialog(tpl)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="استخدام">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => navigate('/e-signature/create')}
                    >
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="حذف">
                    <IconButton size="small" color="error" onClick={() => handleDelete(tpl._id)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* ═══ Create/Edit Dialog ════════════════════════════════════════════ */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          {editing ? 'تعديل القالب' : 'إنشاء قالب جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                size="small"
                label="كود القالب"
                value={form.templateCode}
                disabled={!!editing}
                onChange={e =>
                  setForm({
                    ...form,
                    templateCode: e.target.value.toUpperCase().replace(/\s/g, '-'),
                  })
                }
                placeholder="CONTRACT-001"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                size="small"
                label="الاسم (عربي)"
                value={form.name_ar}
                onChange={e => setForm({ ...form, name_ar: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                required
                size="small"
                label="التصنيف"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {categories.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="الوصف"
                value={form.description_ar}
                onChange={e => setForm({ ...form, description_ar: e.target.value })}
              />
            </Grid>
          </Grid>

          {/* Default Signers */}
          <Divider sx={{ my: 3 }} />
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Typography variant="subtitle1" fontWeight="bold">
              الموقعون الافتراضيون
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={addDefaultSigner}>
              إضافة
            </Button>
          </Box>

          {form.defaultSigners.map((ds, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <Chip label={i + 1} size="small" />
              <TextField
                size="small"
                label="المسمى"
                value={ds.title_ar}
                sx={{ flex: 2 }}
                onChange={e => updateDefaultSigner(i, 'title_ar', e.target.value)}
              />
              <TextField
                select
                size="small"
                label="الدور"
                value={ds.role}
                sx={{ flex: 1 }}
                onChange={e => updateDefaultSigner(i, 'role', e.target.value)}
              >
                {signerRoles.map(r => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="القسم"
                value={ds.defaultDepartment || ''}
                sx={{ flex: 1 }}
                onChange={e => updateDefaultSigner(i, 'defaultDepartment', e.target.value)}
              />
              <IconButton size="small" color="error" onClick={() => removeDefaultSigner(i)}>
                <Delete />
              </IconButton>
            </Box>
          ))}

          {/* Workflow */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            إعدادات سير العمل
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.workflow.sequential}
                    onChange={e =>
                      setForm({
                        ...form,
                        workflow: { ...form.workflow, sequential: e.target.checked },
                      })
                    }
                  />
                }
                label="تسلسلي"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.workflow.allowDelegation}
                    onChange={e =>
                      setForm({
                        ...form,
                        workflow: { ...form.workflow, allowDelegation: e.target.checked },
                      })
                    }
                  />
                }
                label="التفويض"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.workflow.autoReminder}
                    onChange={e =>
                      setForm({
                        ...form,
                        workflow: { ...form.workflow, autoReminder: e.target.checked },
                      })
                    }
                  />
                }
                label="تذكير تلقائي"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                size="small"
                type="number"
                label="أيام الانتهاء"
                value={form.workflow.expiryDays}
                onChange={e =>
                  setForm({ ...form, workflow: { ...form.workflow, expiryDays: +e.target.value } })
                }
              />
            </Grid>
          </Grid>

          {/* Security */}
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            الأمان
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.security.requireOTP}
                    onChange={e =>
                      setForm({
                        ...form,
                        security: { ...form.security, requireOTP: e.target.checked },
                      })
                    }
                  />
                }
                label="يتطلب رمز OTP"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.security.requireNationalId}
                    onChange={e =>
                      setForm({
                        ...form,
                        security: { ...form.security, requireNationalId: e.target.checked },
                      })
                    }
                  />
                }
                label="يتطلب رقم الهوية"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <CircularProgress size={20} /> : editing ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
