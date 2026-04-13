import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import administrationService from '../../services/administration.service';


import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Constants ══════════════════════════════════════════════════════════════ */
const documentTypes = [
  { value: 'decision', label: 'قرار إداري', icon: '⚖️' },
  { value: 'memo', label: 'مذكرة', icon: '📝' },
  { value: 'circular', label: 'تعميم', icon: '📢' },
  { value: 'directive', label: 'توجيه', icon: '📋' },
  { value: 'announcement', label: 'إعلان', icon: '📣' },
  { value: 'policy', label: 'سياسة', icon: '📜' },
  { value: 'procedure', label: 'إجراء', icon: '📑' },
  { value: 'minutes', label: 'محضر اجتماع', icon: '🗒️' },
];

const categories = [
  { value: 'administrative', label: 'إداري' },
  { value: 'financial', label: 'مالي' },
  { value: 'medical', label: 'طبي' },
  { value: 'legal', label: 'قانوني' },
  { value: 'hr', label: 'موارد بشرية' },
  { value: 'academic', label: 'أكاديمي' },
  { value: 'technical', label: 'تقني' },
  { value: 'operational', label: 'تشغيلي' },
  { value: 'general', label: 'عام' },
];

const priorities = [
  { value: 'low', label: 'منخفضة' },
  { value: 'normal', label: 'عادية' },
  { value: 'high', label: 'عالية' },
  { value: 'urgent', label: 'عاجلة' },
  { value: 'critical', label: 'حرجة' },
];

const confidentialityLevels = [
  { value: 'public', label: 'عام' },
  { value: 'internal', label: 'داخلي' },
  { value: 'confidential', label: 'سري' },
  { value: 'top_secret', label: 'سري للغاية' },
];

const departmentOptions = [
  'الإدارة العامة',
  'الموارد البشرية',
  'المالية',
  'تقنية المعلومات',
  'الشؤون الطبية',
  'التأهيل',
  'التعليم',
  'الشؤون القانونية',
  'العلاقات العامة',
  'المشتريات',
  'الصيانة',
  'الجودة',
];

const steps = ['نوع المستند', 'المحتوى', 'التصنيف والأولوية', 'المستلمون', 'المراجعة'];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminDecisionCreate() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    documentType: 'decision',
    title: '',
    title_en: '',
    subject: '',
    body: '',
    summary: '',
    category: 'administrative',
    priority: 'normal',
    confidentiality: 'internal',
    department: '',
    issuingAuthority: '',
    effectiveDate: '',
    expiryDate: '',
    sendToAll: false,
    targetDepartments: [],
    tags: '',
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  /* ─── Save ──────────────────────────────────────────────────────────────── */
  const handleSave = async (submitForReview = false) => {
    if (!form.title.trim()) {
      showSnackbar('يرجى إدخال عنوان المستند', 'error');
      return;
    }
    if (!form.body.trim()) {
      showSnackbar('يرجى إدخال محتوى المستند', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags
          ? form.tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : [],
      };
      const res = await administrationService.createDecision(payload);
      const id = res?.data?.data?._id;

      if (submitForReview && id) {
        await administrationService.submitDecision(id);
        showSnackbar('تم إنشاء المستند وإرساله للمراجعة', 'success');
      } else {
        showSnackbar('تم حفظ المستند كمسودة', 'success');
      }

      navigate(id ? `/administration/decisions/${id}` : '/administration/decisions');
    } catch {
      showSnackbar('خطأ في حفظ المستند', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ─── Step navigation ───────────────────────────────────────────────────── */
  const canNext = () => {
    switch (activeStep) {
      case 0:
        return !!form.documentType;
      case 1:
        return !!form.title.trim() && !!form.body.trim();
      default:
        return true;
    }
  };

  /* ─── Step renderers ────────────────────────────────────────────────────── */
  const renderStep0 = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        اختر نوع المستند
      </Typography>
      <Grid container spacing={2}>
        {documentTypes.map(dt => (
          <Grid item xs={6} sm={4} md={3} key={dt.value}>
            <Card
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                transition: '0.3s',
                border: form.documentType === dt.value ? '2px solid' : '2px solid transparent',
                borderColor: form.documentType === dt.value ? 'primary.main' : 'transparent',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
              }}
              onClick={() => update('documentType', dt.value)}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h3">{dt.icon}</Typography>
                <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                  {dt.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        محتوى المستند
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="العنوان *"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="عنوان المستند بالعربية"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="العنوان بالإنجليزية"
            value={form.title_en}
            onChange={e => update('title_en', e.target.value)}
            placeholder="Document title in English (optional)"
            dir="ltr"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="الموضوع"
            value={form.subject}
            onChange={e => update('subject', e.target.value)}
            placeholder="موضوع المستند"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="المحتوى *"
            value={form.body}
            onChange={e => update('body', e.target.value)}
            multiline
            rows={8}
            placeholder="نص المستند الكامل..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="الملخص"
            value={form.summary}
            onChange={e => update('summary', e.target.value)}
            multiline
            rows={3}
            placeholder="ملخص مختصر للمستند"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        التصنيف والأولوية
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>التصنيف</InputLabel>
            <Select
              value={form.category}
              label="التصنيف"
              onChange={e => update('category', e.target.value)}
            >
              {categories.map(c => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={form.priority}
              label="الأولوية"
              onChange={e => update('priority', e.target.value)}
            >
              {priorities.map(p => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>مستوى السرية</InputLabel>
            <Select
              value={form.confidentiality}
              label="مستوى السرية"
              onChange={e => update('confidentiality', e.target.value)}
            >
              {confidentialityLevels.map(cl => (
                <MenuItem key={cl.value} value={cl.value}>
                  {cl.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>القسم / الإدارة</InputLabel>
            <Select
              value={form.department}
              label="القسم / الإدارة"
              onChange={e => update('department', e.target.value)}
            >
              <MenuItem value="">غير محدد</MenuItem>
              {departmentOptions.map(d => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="جهة الإصدار"
            value={form.issuingAuthority}
            onChange={e => update('issuingAuthority', e.target.value)}
            placeholder="مثال: مدير عام المركز"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="تاريخ السريان"
            type="date"
            value={form.effectiveDate}
            onChange={e => update('effectiveDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="تاريخ الانتهاء"
            type="date"
            value={form.expiryDate}
            onChange={e => update('expiryDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="العلامات (مفصولة بفاصلة)"
            value={form.tags}
            onChange={e => update('tags', e.target.value)}
            placeholder="مثال: إداري, عاجل, موارد بشرية"
          />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
        المستلمون
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Switch
                checked={form.sendToAll}
                onChange={e => update('sendToAll', e.target.checked)}
              />
            }
            label="إرسال للجميع"
          />
        </Grid>
        {!form.sendToAll && (
          <Grid item xs={12}>
            <Autocomplete
              multiple
              options={departmentOptions}
              value={form.targetDepartments}
              onChange={(_, v) => update('targetDepartments', v)}
              renderInput={params => (
                <TextField {...params} label="الأقسام المستهدفة" placeholder="اختر الأقسام..." />
              )}
              renderTags={(value, getTagProps) =>
                value.map((opt, i) => (
                  <Chip label={opt} size="small" {...getTagProps({ index: i })} key={opt} />
                ))
              }
            />
          </Grid>
        )}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <People sx={{ fontSize: 18, verticalAlign: 'middle', ml: 0.5 }} />
              {form.sendToAll
                ? 'سيتم إرسال المستند لجميع الموظفين والأقسام'
                : form.targetDepartments.length > 0
                  ? `سيتم إرسال المستند للأقسام التالية: ${form.targetDepartments.join('، ')}`
                  : 'يرجى تحديد المستلمين أو تفعيل الإرسال للجميع'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep4 = () => {
    const dt = documentTypes.find(d => d.value === form.documentType);
    return (
      <Box>
        <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
          المراجعة والإرسال
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="h4">{dt?.icon || '📄'}</Typography>
                <Box>
                  <Chip label={dt?.label || form.documentType} color="primary" />
                  <Typography variant="h6" fontWeight="bold" sx={{ mt: 0.5 }}>
                    {form.title || '—'}
                  </Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {[
                  { label: 'الموضوع', value: form.subject },
                  {
                    label: 'التصنيف',
                    value: categories.find(c => c.value === form.category)?.label,
                  },
                  {
                    label: 'الأولوية',
                    value: priorities.find(p => p.value === form.priority)?.label,
                  },
                  {
                    label: 'السرية',
                    value: confidentialityLevels.find(c => c.value === form.confidentiality)?.label,
                  },
                  { label: 'القسم', value: form.department },
                  { label: 'جهة الإصدار', value: form.issuingAuthority },
                  { label: 'تاريخ السريان', value: form.effectiveDate },
                  {
                    label: 'المستلمون',
                    value: form.sendToAll
                      ? 'الجميع'
                      : form.targetDepartments.join('، ') || 'غير محدد',
                  },
                ].map((item, i) =>
                  item.value ? (
                    <Grid item xs={12} sm={6} key={i}>
                      <Typography variant="caption" color="text.secondary">
                        {item.label}
                      </Typography>
                      <Typography variant="body1">{item.value}</Typography>
                    </Grid>
                  ) : null
                )}
              </Grid>
              {form.body && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    المحتوى
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, mt: 0.5, maxHeight: 200, overflow: 'auto' }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {form.body}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const stepRenderers = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/administration/decisions')} sx={{ color: 'white' }}>
            <ArrowBack />
          </IconButton>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <Gavel sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" fontWeight="bold">
              إنشاء مستند إداري
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              معالج إنشاء القرارات والمذكرات والتعاميم
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ─── Stepper ─────────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* ─── Step content ────────────────────────────────────────────────── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2, minHeight: 300 }}>
        {stepRenderers[activeStep]()}
      </Paper>

      {/* ─── Navigation buttons ──────────────────────────────────────────── */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowForward />}
            onClick={() => setActiveStep(s => s - 1)}
            disabled={activeStep === 0}
          >
            السابق
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {activeStep === steps.length - 1 ? (
              <>
                <Button
                  variant="outlined"
                  startIcon={<Save />}
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? <CircularProgress size={20} /> : 'حفظ كمسودة'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Send />}
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  color="success"
                >
                  {saving ? <CircularProgress size={20} /> : 'حفظ وإرسال للمراجعة'}
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                endIcon={<ArrowBack />}
                onClick={() => setActiveStep(s => s + 1)}
                disabled={!canNext()}
              >
                التالي
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
