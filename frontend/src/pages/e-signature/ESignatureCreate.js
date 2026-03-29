import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import eSignatureService from '../../services/eSignature.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  MenuItem,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,  Alert,
  Avatar,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,  Send,
  Add as AddIcon,
  Delete,
  Draw as SignIcon,
  Person,
  Description,
  Settings,
  Preview,
  DragIndicator,} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Constants ═══════════════════════════════════════════════════════════ */
const docTypes = [
  { value: 'contract', label: 'عقد' },
  { value: 'agreement', label: 'اتفاقية' },
  { value: 'approval', label: 'موافقة' },
  { value: 'memo', label: 'مذكرة' },
  { value: 'policy', label: 'سياسة' },
  { value: 'authorization', label: 'تفويض' },
  { value: 'financial', label: 'مالي' },
  { value: 'hr', label: 'موارد بشرية' },
  { value: 'medical', label: 'طبي' },
  { value: 'legal', label: 'قانوني' },
  { value: 'purchase_order', label: 'أمر شراء' },
  { value: 'nda', label: 'اتفاقية سرية' },
  { value: 'mou', label: 'مذكرة تفاهم' },
  { value: 'other', label: 'أخرى' },
];

const roles = [
  { value: 'signer', label: 'موقّع' },
  { value: 'approver', label: 'معتمد' },
  { value: 'witness', label: 'شاهد' },
  { value: 'reviewer', label: 'مراجع' },
  { value: 'cc', label: 'نسخة (CC)' },
];

const priorities = [
  { value: 'low', label: 'منخفضة', color: '#9e9e9e' },
  { value: 'medium', label: 'متوسطة', color: '#2196f3' },
  { value: 'high', label: 'عالية', color: '#ff9800' },
  { value: 'urgent', label: 'عاجلة', color: '#f44336' },
];

const steps = ['بيانات المستند', 'الموقعون', 'إعدادات سير العمل', 'المراجعة والإرسال'];

const emptySigner = {
  name: '',
  email: '',
  phone: '',
  department: '',
  jobTitle: '',
  role: 'signer',
};

export default function ESignatureCreate() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [form, setForm] = useState({
    documentTitle: '',
    documentType: 'contract',
    description: '',
    department: '',
    priority: 'medium',
    expiresAt: '',
    tags: [],
    tagInput: '',
  });

  const [signers, setSigners] = useState([{ ...emptySigner }]);

  const [workflow, setWorkflow] = useState({
    sequential: true,
    requireAllSigners: true,
    allowDelegation: false,
  });

  useEffect(() => {
    eSignatureService
      .getTemplates()
      .then(res => {
        if (res?.data?.data) setTemplates(res.data.data);
      })
      .catch(() => {});
  }, []);

  /* ─── Template selection ───────────────────────────────────────────────── */
  const applyTemplate = tpl => {
    if (!tpl) {
      setSelectedTemplate(null);
      return;
    }
    setSelectedTemplate(tpl);
    setForm(prev => ({
      ...prev,
      documentTitle: tpl.name_ar || prev.documentTitle,
      documentType: tpl.category || prev.documentType,
      description: tpl.description_ar || prev.description,
    }));
    if (tpl.defaultSigners?.length) {
      setSigners(
        tpl.defaultSigners.map(ds => ({
          name: '',
          email: '',
          phone: '',
          department: ds.defaultDepartment || '',
          jobTitle: ds.title_ar || '',
          role: ds.role || 'signer',
        }))
      );
    }
    if (tpl.workflow) {
      setWorkflow({
        sequential: tpl.workflow.sequential ?? true,
        requireAllSigners: tpl.workflow.requireAllSigners ?? true,
        allowDelegation: tpl.workflow.allowDelegation ?? false,
      });
    }
  };

  /* ─── Signer helpers ───────────────────────────────────────────────────── */
  const addSigner = () => setSigners(prev => [...prev, { ...emptySigner }]);
  const removeSigner = i => setSigners(prev => prev.filter((_, idx) => idx !== i));
  const updateSigner = (i, field, value) => {
    setSigners(prev => prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));
  };

  /* ─── Tags ─────────────────────────────────────────────────────────────── */
  const addTag = () => {
    if (form.tagInput.trim() && !form.tags.includes(form.tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, prev.tagInput.trim()], tagInput: '' }));
    }
  };

  /* ─── Validation ───────────────────────────────────────────────────────── */
  const validateStep = () => {
    if (activeStep === 0) {
      if (!form.documentTitle.trim()) {
        showSnackbar('عنوان المستند مطلوب', 'warning');
        return false;
      }
    }
    if (activeStep === 1) {
      if (signers.length === 0) {
        showSnackbar('يجب إضافة موقع واحد على الأقل', 'warning');
        return false;
      }
      for (const s of signers) {
        if (!s.name.trim() || !s.email.trim()) {
          showSnackbar('الاسم والبريد مطلوبان لكل موقع', 'warning');
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setActiveStep(prev => prev + 1);
  };
  const handleBack = () => setActiveStep(prev => prev - 1);

  /* ─── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        documentTitle: form.documentTitle,
        documentType: form.documentType,
        description: form.description,
        department: form.department,
        priority: form.priority,
        expiresAt: form.expiresAt || undefined,
        tags: form.tags,
        signers: signers.map((s, i) => ({ ...s, order: i + 1 })),
        workflow,
        templateId: selectedTemplate?._id,
        templateCode: selectedTemplate?.templateCode,
      };

      const res = await eSignatureService.create(payload);
      showSnackbar('تم إنشاء طلب التوقيع بنجاح', 'success');
      navigate(`/e-signature/sign/${res?.data?.data?._id || ''}`);
    } catch {
      showSnackbar('خطأ في إنشاء طلب التوقيع', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <SignIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              إنشاء طلب توقيع جديد
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              معالج متعدد الخطوات لإنشاء وإرسال طلبات التوقيع
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/e-signature')}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            رجوع
          </Button>
        </Box>
      </Box>

      {/* ─── Stepper ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* ═══ Step 0: Document Info ═════════════════════════════════════════ */}
      {activeStep === 0 && (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Description color="primary" />
            <Typography variant="h6" fontWeight="bold">
              بيانات المستند
            </Typography>
          </Box>

          {/* Template selector */}
          {templates.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                options={templates}
                getOptionLabel={opt => opt.name_ar || opt.templateCode}
                value={selectedTemplate}
                onChange={(_, val) => applyTemplate(val)}
                renderInput={params => <TextField {...params} label="اختر قالب (اختياري)" />}
                sx={{ mb: 2 }}
              />
              {selectedTemplate && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  تم تطبيق القالب: {selectedTemplate.name_ar}
                </Alert>
              )}
            </Box>
          )}

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="عنوان المستند"
                value={form.documentTitle}
                onChange={e => setForm({ ...form, documentTitle: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="نوع المستند"
                value={form.documentType}
                onChange={e => setForm({ ...form, documentType: e.target.value })}
              >
                {docTypes.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="الأولوية"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                {priorities.map(p => (
                  <MenuItem key={p.value} value={p.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: p.color }} />
                      {p.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القسم"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="وصف المستند"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="أضف وسم"
                  value={form.tagInput}
                  onChange={e => setForm({ ...form, tagInput: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button size="small" onClick={addTag}>
                  إضافة
                </Button>
                {form.tags.map((t, i) => (
                  <Chip
                    key={i}
                    label={t}
                    onDelete={() =>
                      setForm(prev => ({
                        ...prev,
                        tags: prev.tags.filter((_, idx) => idx !== i),
                      }))
                    }
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ═══ Step 1: Signers ═══════════════════════════════════════════════ */}
      {activeStep === 1 && (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Person color="primary" />
              <Typography variant="h6" fontWeight="bold">
                الموقعون
              </Typography>
              <Chip label={`${signers.length} موقع`} size="small" color="primary" />
            </Box>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={addSigner}>
              إضافة موقع
            </Button>
          </Box>

          {signers.map((signer, i) => (
            <Card key={i} sx={{ mb: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DragIndicator color="disabled" />
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                      {i + 1}
                    </Avatar>
                    <Typography variant="subtitle1" fontWeight="bold">
                      الموقع {i + 1}
                    </Typography>
                  </Box>
                  {signers.length > 1 && (
                    <Tooltip title="حذف">
                      <IconButton color="error" onClick={() => removeSigner(i)}>
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label="الاسم"
                      value={signer.name}
                      onChange={e => updateSigner(i, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label="البريد الإلكتروني"
                      type="email"
                      value={signer.email}
                      onChange={e => updateSigner(i, 'email', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="الهاتف"
                      value={signer.phone}
                      onChange={e => updateSigner(i, 'phone', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="القسم"
                      value={signer.department}
                      onChange={e => updateSigner(i, 'department', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="الدور"
                      value={signer.role}
                      onChange={e => updateSigner(i, 'role', e.target.value)}
                    >
                      {roles.map(r => (
                        <MenuItem key={r.value} value={r.value}>
                          {r.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Paper>
      )}

      {/* ═══ Step 2: Workflow Settings ═════════════════════════════════════ */}
      {activeStep === 2 && (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Settings color="primary" />
            <Typography variant="h6" fontWeight="bold">
              إعدادات سير العمل
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 3,
                  border: workflow.sequential ? '2px solid' : '1px solid #e0e0e0',
                  borderColor: workflow.sequential ? 'primary.main' : undefined,
                  borderRadius: 2,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflow.sequential}
                      onChange={e => setWorkflow({ ...workflow, sequential: e.target.checked })}
                    />
                  }
                  label={<Typography fontWeight="bold">توقيع تسلسلي</Typography>}
                />
                <Typography variant="body2" color="text.secondary">
                  يتم التوقيع بالترتيب — كل موقع ينتظر الذي قبله
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card
                sx={{
                  p: 3,
                  border: !workflow.sequential ? '2px solid' : '1px solid #e0e0e0',
                  borderColor: !workflow.sequential ? 'info.main' : undefined,
                  borderRadius: 2,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={!workflow.sequential}
                      onChange={e => setWorkflow({ ...workflow, sequential: !e.target.checked })}
                    />
                  }
                  label={<Typography fontWeight="bold">توقيع متوازي</Typography>}
                />
                <Typography variant="body2" color="text.secondary">
                  جميع الموقعين يمكنهم التوقيع في نفس الوقت
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflow.requireAllSigners}
                      onChange={e =>
                        setWorkflow({ ...workflow, requireAllSigners: e.target.checked })
                      }
                    />
                  }
                  label={<Typography fontWeight="bold">يتطلب جميع الموقعين</Typography>}
                />
                <Typography variant="body2" color="text.secondary">
                  يجب أن يوقع جميع الموقعين لإكمال المستند
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card sx={{ p: 3, borderRadius: 2, border: '1px solid #e0e0e0' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={workflow.allowDelegation}
                      onChange={e =>
                        setWorkflow({ ...workflow, allowDelegation: e.target.checked })
                      }
                    />
                  }
                  label={<Typography fontWeight="bold">السماح بالتفويض</Typography>}
                />
                <Typography variant="body2" color="text.secondary">
                  يمكن للموقع تفويض شخص آخر للتوقيع بدلاً منه
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ═══ Step 3: Review & Submit ═══════════════════════════════════════ */}
      {activeStep === 3 && (
        <Paper sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Preview color="primary" />
            <Typography variant="h6" fontWeight="bold">
              المراجعة والإرسال
            </Typography>
          </Box>

          {/* Document Summary */}
          <Card sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              بيانات المستند
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  العنوان
                </Typography>
                <Typography fontWeight="bold">{form.documentTitle}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  النوع
                </Typography>
                <Typography>{docTypes.find(t => t.value === form.documentType)?.label}</Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="text.secondary">
                  الأولوية
                </Typography>
                <Chip
                  label={priorities.find(p => p.value === form.priority)?.label}
                  sx={{
                    bgcolor: priorities.find(p => p.value === form.priority)?.color,
                    color: 'white',
                  }}
                  size="small"
                />
              </Grid>
              {form.description && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    الوصف
                  </Typography>
                  <Typography variant="body2">{form.description}</Typography>
                </Grid>
              )}
            </Grid>
          </Card>

          {/* Signers Summary */}
          <Card sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              الموقعون ({signers.length})
            </Typography>
            {signers.map((s, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1,
                  borderBottom: i < signers.length - 1 ? '1px solid #e0e0e0' : 'none',
                }}
              >
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32, fontSize: 14 }}>
                  {i + 1}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {s.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.email}
                  </Typography>
                </Box>
                <Chip
                  label={roles.find(r => r.value === s.role)?.label}
                  size="small"
                  variant="outlined"
                />
              </Box>
            ))}
          </Card>

          {/* Workflow Summary */}
          <Card sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              سير العمل
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={workflow.sequential ? 'تسلسلي' : 'متوازي'}
                color={workflow.sequential ? 'primary' : 'info'}
                size="small"
              />
              <Chip
                label={workflow.requireAllSigners ? 'جميع الموقعين مطلوبون' : 'بعض الموقعين'}
                color="default"
                size="small"
                variant="outlined"
              />
              {workflow.allowDelegation && (
                <Chip label="التفويض مسموح" color="warning" size="small" />
              )}
            </Box>
          </Card>

          <Alert severity="info" sx={{ mb: 2 }}>
            سيتم إرسال إشعار لجميع الموقعين فور إنشاء الطلب
          </Alert>
        </Paper>
      )}

      {/* ─── Navigation Buttons ──────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={activeStep === 0 ? () => navigate('/e-signature') : handleBack}
          startIcon={<ArrowForward />}
        >
          {activeStep === 0 ? 'إلغاء' : 'السابق'}
        </Button>
        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext} endIcon={<ArrowBack />}>
            التالي
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={<Send />}
          >
            {submitting ? 'جاري الإرسال...' : 'إنشاء وإرسال'}
          </Button>
        )}
      </Box>
    </Box>
  );
}
