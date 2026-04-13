import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eStampService from '../../services/eStamp.service';




import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

const documentTypes = [
  { value: 'letter', label: 'خطاب رسمي' },
  { value: 'contract', label: 'عقد' },
  { value: 'invoice', label: 'فاتورة' },
  { value: 'report', label: 'تقرير' },
  { value: 'certificate', label: 'شهادة' },
  { value: 'memo', label: 'مذكرة' },
  { value: 'approval', label: 'قرار / موافقة' },
  { value: 'authorization', label: 'تفويض' },
  { value: 'policy', label: 'سياسة' },
  { value: 'medical_report', label: 'تقرير طبي' },
  { value: 'legal_document', label: 'وثيقة قانونية' },
  { value: 'financial_document', label: 'وثيقة مالية' },
  { value: 'hr_document', label: 'وثيقة موارد بشرية' },
  { value: 'other', label: 'أخرى' },
];

const steps = ['بيانات المستند', 'موضع الختم', 'المراجعة والتأكيد'];

export default function EStampApply() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [stamp, setStamp] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  /* Result */
  const [result, setResult] = useState(null);
  const [successDialog, setSuccessDialog] = useState(false);

  /* Form */
  const [form, setForm] = useState({
    documentId: '',
    documentTitle: '',
    documentType: 'letter',
    notes: '',
    position: { x: 50, y: 90, page: 1, scale: 1, rotation: 0 },
  });

  /* ── Load ──────────────────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await eStampService.getById(id);
      if (res?.data?.data) setStamp(res.data.data);
    } catch {
      showSnackbar('خطأ في تحميل الختم', 'error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setPos = (key, val) => setForm(f => ({ ...f, position: { ...f.position, [key]: val } }));

  /* ── Submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!form.documentTitle.trim()) {
      showSnackbar('أدخل عنوان المستند', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const res = await eStampService.apply(id, {
        documentId: form.documentId || `DOC-${Date.now()}`,
        documentTitle: form.documentTitle,
        documentType: form.documentType,
        notes: form.notes,
        position: form.position,
      });
      if (res?.data?.data) {
        setResult(res.data.data);
        setSuccessDialog(true);
        showSnackbar('تم تطبيق الختم بنجاح', 'success');
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في تطبيق الختم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={48} />
      </Box>
    );
  if (!stamp)
    return (
      <Alert severity="error" sx={{ m: 3 }}>
        الختم غير موجود
      </Alert>
    );
  if (stamp.status !== 'active') {
    return (
      <Box sx={{ m: 3 }} dir="rtl">
        <Alert severity="warning" sx={{ mb: 2 }}>
          هذا الختم غير مفعّل حالياً ولا يمكن تطبيقه.
        </Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/e-stamp')}>
          رجوع
        </Button>
      </Box>
    );
  }

  const canNext = activeStep === 0 ? form.documentTitle.trim().length > 0 : true;

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {stamp.stampImage ? (
            <Avatar
              src={stamp.stampImage}
              variant="rounded"
              sx={{
                width: 56,
                height: 56,
                border: '2px solid rgba(255,255,255,0.5)',
                bgcolor: 'white',
              }}
            />
          ) : (
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
              <Verified sx={{ fontSize: 30 }} />
            </Avatar>
          )}
          <Box>
            <Typography variant="h5" fontWeight="bold">
              تطبيق الختم
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {stamp.name_ar} — {stamp.stampId}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stepper */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* ── Step 0: Document Info ─────────────────────────────────────────── */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Description color="primary" />
            <Typography variant="h6" fontWeight="bold">
              بيانات المستند
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="عنوان المستند"
                value={form.documentTitle}
                onChange={e => set('documentTitle', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="رقم المستند (اختياري)"
                value={form.documentId}
                onChange={e => set('documentId', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="نوع المستند"
                value={form.documentType}
                onChange={e => set('documentType', e.target.value)}
              >
                {documentTypes.map(d => (
                  <MenuItem key={d.value} value={d.value}>
                    {d.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ملاحظات"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Step 1: Position ──────────────────────────────────────────────── */}
      {activeStep === 1 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Place color="primary" />
            <Typography variant="h6" fontWeight="bold">
              موضع الختم على المستند
            </Typography>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={7}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" gutterBottom>
                    الموضع الأفقي (X): {form.position.x}%
                  </Typography>
                  <Slider
                    value={form.position.x}
                    onChange={(_, v) => setPos('x', v)}
                    min={0}
                    max={100}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" gutterBottom>
                    الموضع الرأسي (Y): {form.position.y}%
                  </Typography>
                  <Slider
                    value={form.position.y}
                    onChange={(_, v) => setPos('y', v)}
                    min={0}
                    max={100}
                  />
                </Grid>
                <Grid item xs={4}>
                  <TextField
                    fullWidth
                    type="number"
                    size="small"
                    label="الصفحة"
                    inputProps={{ min: 1 }}
                    value={form.position.page}
                    onChange={e => setPos('page', parseInt(e.target.value) || 1)}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" gutterBottom>
                    الحجم: {(form.position.scale * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={form.position.scale}
                    onChange={(_, v) => setPos('scale', v)}
                    min={0.3}
                    max={2}
                    step={0.1}
                  />
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="body2" gutterBottom>
                    الدوران: {form.position.rotation}°
                  </Typography>
                  <Slider
                    value={form.position.rotation}
                    onChange={(_, v) => setPos('rotation', v)}
                    min={0}
                    max={360}
                    step={5}
                  />
                </Grid>
              </Grid>

              {/* Quick positions */}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                مواضع سريعة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  { label: 'أسفل يمين', x: 80, y: 90 },
                  { label: 'أسفل يسار', x: 20, y: 90 },
                  { label: 'أسفل وسط', x: 50, y: 90 },
                  { label: 'أعلى يمين', x: 80, y: 10 },
                  { label: 'أعلى يسار', x: 20, y: 10 },
                  { label: 'وسط', x: 50, y: 50 },
                ].map(pos => (
                  <Chip
                    key={pos.label}
                    label={pos.label}
                    size="small"
                    variant="outlined"
                    clickable
                    onClick={() =>
                      setForm(f => ({ ...f, position: { ...f.position, x: pos.x, y: pos.y } }))
                    }
                  />
                ))}
              </Box>
            </Grid>

            {/* Live preview */}
            <Grid item xs={12} md={5}>
              <Paper
                variant="outlined"
                sx={{ height: 340, position: 'relative', bgcolor: '#fafafa', overflow: 'hidden' }}
              >
                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                  <Typography variant="caption" color="text.secondary">
                    معاينة الموضع
                  </Typography>
                </Box>
                {/* Document lines */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      top: 30 + i * 24,
                      left: 16,
                      right: 16,
                      height: 6,
                      bgcolor: '#e0e0e0',
                      borderRadius: 1,
                    }}
                  />
                ))}
                {/* Stamp indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${form.position.x}%`,
                    top: `${form.position.y}%`,
                    transform: `translate(-50%, -50%) rotate(${form.position.rotation}deg) scale(${form.position.scale})`,
                    transition: 'all 0.2s',
                  }}
                >
                  {stamp.stampImage ? (
                    <Box
                      component="img"
                      src={stamp.stampImage}
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: '2px dashed red',
                        opacity: 0.8,
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        border: '2px dashed red',
                        bgcolor: 'rgba(211,47,47,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Verified sx={{ color: 'error.main', fontSize: 24 }} />
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ── Step 2: Review ────────────────────────────────────────────────── */}
      {activeStep === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
            مراجعة البيانات والتأكيد
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  بيانات المستند
                </Typography>
                {[
                  ['عنوان المستند', form.documentTitle],
                  ['رقم المستند', form.documentId || 'تلقائي'],
                  ['نوع المستند', documentTypes.find(d => d.value === form.documentType)?.label],
                ].map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {k}
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {v}
                    </Typography>
                  </Box>
                ))}
                {form.notes && (
                  <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                    {form.notes}
                  </Typography>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  بيانات الختم
                </Typography>
                {[
                  ['اسم الختم', stamp.name_ar],
                  ['رقم الختم', stamp.stampId],
                  ['النوع', stamp.stampType],
                  [
                    'الاستخدامات',
                    `${stamp.usageCount || 0}${stamp.maxUsageCount > 0 ? ` / ${stamp.maxUsageCount}` : ''}`,
                  ],
                ].map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {k}
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {v}
                    </Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  موضع الختم
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Chip label={`X: ${form.position.x}%`} size="small" />
                  <Chip label={`Y: ${form.position.y}%`} size="small" />
                  <Chip label={`صفحة: ${form.position.page}`} size="small" />
                  <Chip label={`حجم: ${(form.position.scale * 100).toFixed(0)}%`} size="small" />
                  <Chip label={`دوران: ${form.position.rotation}°`} size="small" />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {stamp.requireOTP && (
            <Alert severity="info" sx={{ mt: 2 }}>
              سيتم طلب رمز تحقق (OTP) لإتمام عملية تطبيق الختم.
            </Alert>
          )}
          {stamp.requireApprovalPerUse && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              سيتم إرسال طلب موافقة قبل تطبيق الختم.
            </Alert>
          )}
        </Paper>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate(`/e-stamp/${id}`)}
          >
            رجوع
          </Button>
          {activeStep > 0 && <Button onClick={() => setActiveStep(s => s - 1)}>السابق</Button>}
        </Box>
        {activeStep < 2 ? (
          <Button
            variant="contained"
            endIcon={<ArrowForward />}
            disabled={!canNext}
            onClick={() => setActiveStep(s => s + 1)}
          >
            التالي
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : 'تطبيق الختم'}
          </Button>
        )}
      </Box>

      {/* ═══ Success Dialog ══════════════════════════════════════════════════ */}
      <Dialog
        open={successDialog}
        maxWidth="sm"
        fullWidth
        onClose={() => {
          setSuccessDialog(false);
          navigate(`/e-stamp/${id}`);
        }}
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 1 }} />
          <br />
          تم تطبيق الختم بنجاح
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          {result?.verificationCode && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                كود التحقق
              </Typography>
              <Chip
                label={result.verificationCode}
                sx={{ fontSize: 16, fontFamily: 'monospace', py: 2, px: 1 }}
                icon={<ContentCopy />}
                onClick={() => {
                  navigator.clipboard.writeText(result.verificationCode);
                  showSnackbar('تم النسخ', 'info');
                }}
                clickable
              />
            </Box>
          )}
          {result?.verificationHash && (
            <Box sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                هاش التحقق
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  wordBreak: 'break-all',
                  color: 'text.secondary',
                }}
              >
                {result.verificationHash}
              </Typography>
            </Box>
          )}
          <Alert severity="info" sx={{ mt: 2, textAlign: 'right' }}>
            احتفظ بكود التحقق لمراجعة صحة الختم لاحقاً
          </Alert>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button variant="outlined" onClick={() => navigate(`/e-stamp/${id}`)}>
            عرض الختم
          </Button>
          <Button variant="contained" onClick={() => navigate('/e-stamp/verify')}>
            التحقق
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
