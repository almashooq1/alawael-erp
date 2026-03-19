import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import eStampService from '../../services/eStamp.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  Avatar,
  FormControlLabel,
  Switch,
  IconButton,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Save,
  Send,
  Delete,
  Verified,
  Circle,
  Square,
  Palette,
  Add as AddIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ═══ Constants ══════════════════════════════════════════════════════════════ */
const stampTypes = [
  { value: 'official', label: 'ختم رسمي', icon: '🏛️' },
  { value: 'department', label: 'ختم إدارة', icon: '🏢' },
  { value: 'personal', label: 'ختم شخصي', icon: '👤' },
  { value: 'temporary', label: 'ختم مؤقت', icon: '⏳' },
  { value: 'project', label: 'ختم مشروع', icon: '📋' },
  { value: 'confidential', label: 'ختم سري', icon: '🔒' },
  { value: 'received', label: 'ختم وارد', icon: '📥' },
  { value: 'approved', label: 'ختم معتمد', icon: '✅' },
  { value: 'rejected', label: 'ختم مرفوض', icon: '❌' },
  { value: 'draft', label: 'ختم مسودة', icon: '📝' },
  { value: 'copy', label: 'ختم نسخة', icon: '📋' },
  { value: 'urgent', label: 'ختم عاجل', icon: '🚨' },
];

const categories = [
  { value: 'administrative', label: 'إداري' },
  { value: 'financial', label: 'مالي' },
  { value: 'medical', label: 'طبي' },
  { value: 'legal', label: 'قانوني' },
  { value: 'hr', label: 'موارد بشرية' },
  { value: 'academic', label: 'أكاديمي' },
  { value: 'technical', label: 'تقني' },
  { value: 'general', label: 'عام' },
];

const authorityLevels = [
  { value: 'institution', label: 'مؤسسة' },
  { value: 'department', label: 'إدارة' },
  { value: 'section', label: 'قسم' },
  { value: 'individual', label: 'فردي' },
];

const steps = ['معلومات الختم', 'التصميم', 'الصلاحيات والأمان', 'المراجعة والإرسال'];

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EStampCreate() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const canvasRef = useRef(null);

  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    description: '',
    stampType: 'official',
    category: 'administrative',
    department: '',
    organization: 'مركز الأوائل للتأهيل',
    authorityLevel: 'department',
    stampShape: 'circle',
    colorScheme: { primary: '#1a237e', secondary: '#c62828', text: '#1a237e', border: '#1a237e' },
    size: { width: 150, height: 150 },
    includeDate: true,
    includeNumber: true,
    includeQR: false,
    stampImage: '',
    isExpirable: false,
    validUntil: '',
    maxUsageCount: 0,
    requireApprovalPerUse: false,
    requireOTP: false,
    watermarkText: '',
    tags: [],
    priority: 'medium',
    authorizedUsers: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', department: '', role: 'user' });

  /* ─── Canvas Stamp Preview ──────────────────────────────────────────────── */
  const drawStampPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = form.size.width || 150;
    const h = form.size.height || 150;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 8;

    ctx.lineWidth = 3;
    ctx.strokeStyle = form.colorScheme.border;

    if (form.stampShape === 'circle' || form.stampShape === 'oval') {
      ctx.beginPath();
      if (form.stampShape === 'oval') {
        ctx.ellipse(cx, cy, r, r * 0.7, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.stroke();

      // Inner circle
      ctx.beginPath();
      if (form.stampShape === 'oval') {
        ctx.ellipse(cx, cy, r - 8, r * 0.7 - 8, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(cx, cy, r - 8, 0, Math.PI * 2);
      }
      ctx.stroke();
    } else {
      const pad = 8;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.strokeRect(pad + 5, pad + 5, w - pad * 2 - 10, h - pad * 2 - 10);
    }

    // Organization name (top arc or straight)
    ctx.fillStyle = form.colorScheme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (form.stampShape === 'circle') {
      ctx.font = `bold ${Math.max(9, r / 5)}px Cairo, Tajawal, Arial`;
      // Top text
      const orgText = form.organization || 'المؤسسة';
      ctx.save();
      const arcR = r - 18;
      const startAngle = -Math.PI / 2 - orgText.length * 0.08;
      for (let i = 0; i < orgText.length; i++) {
        const angle = startAngle + i * 0.16;
        ctx.save();
        ctx.translate(cx + arcR * Math.cos(angle), cy + arcR * Math.sin(angle));
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(orgText[i], 0, 0);
        ctx.restore();
      }
      ctx.restore();
    } else {
      ctx.font = `bold ${Math.max(10, w / 12)}px Cairo, Tajawal, Arial`;
      ctx.fillText(form.organization || 'المؤسسة', cx, 24);
    }

    // Center: stamp name
    ctx.font = `bold ${Math.max(11, r / 4)}px Cairo, Tajawal, Arial`;
    ctx.fillStyle = form.colorScheme.secondary;
    const name = form.name_ar || 'اسم الختم';
    ctx.fillText(name, cx, cy);

    // Department below
    if (form.department) {
      ctx.font = `${Math.max(8, r / 6)}px Cairo, Tajawal, Arial`;
      ctx.fillStyle = form.colorScheme.text;
      ctx.fillText(form.department, cx, cy + 18);
    }

    // Star in center-bottom
    ctx.fillStyle = form.colorScheme.secondary;
    ctx.font = `${Math.max(10, r / 4)}px Arial`;
    ctx.fillText('★', cx, cy + (form.stampShape === 'circle' ? r - 22 : h - 32));

    return canvas.toDataURL('image/png');
  };

  useEffect(() => {
    if (activeStep === 1 || activeStep === 3) {
      const timeout = setTimeout(() => {
        const img = drawStampPreview();
        if (img) setForm(prev => ({ ...prev, stampImage: img }));
      }, 100);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeStep,
    form.name_ar,
    form.organization,
    form.department,
    form.stampShape,
    form.colorScheme,
    form.size,
  ]);

  /* ─── Submit ────────────────────────────────────────────────────────────── */
  const handleSubmit = async (asDraft = false) => {
    if (!form.name_ar) {
      showSnackbar('اسم الختم مطلوب', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (asDraft) payload.status = 'draft';
      const res = await eStampService.create(payload);
      showSnackbar('تم إنشاء الختم بنجاح', 'success');
      navigate('/e-stamp');
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في إنشاء الختم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ─── Tags helper ───────────────────────────────────────────────────────── */
  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const addAuthorizedUser = () => {
    if (!newUser.name) return;
    setForm(prev => ({ ...prev, authorizedUsers: [...prev.authorizedUsers, { ...newUser }] }));
    setNewUser({ name: '', email: '', department: '', role: 'user' });
  };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}>
            <Verified sx={{ fontSize: 28 }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              إنشاء ختم جديد
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              تصميم وإعداد ختم إلكتروني
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={() => navigate('/e-stamp')}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
          >
            رجوع
          </Button>
        </Box>
      </Box>

      {/* Stepper */}
      <Paper sx={{ p: 2, mb: 4, borderRadius: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* ─── Step 0: Basic Info ────────────────────────────────────────────── */}
      {activeStep === 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
            معلومات الختم الأساسية
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="اسم الختم (عربي)"
                value={form.name_ar}
                onChange={e => setForm({ ...form, name_ar: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم الختم (إنجليزي)"
                value={form.name_en}
                onChange={e => setForm({ ...form, name_en: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="نوع الختم"
                value={form.stampType}
                onChange={e => setForm({ ...form, stampType: e.target.value })}
              >
                {stampTypes.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.icon} {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="التصنيف"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
              >
                {categories.map(c => (
                  <MenuItem key={c.value} value={c.value}>
                    {c.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="مستوى الصلاحية"
                value={form.authorityLevel}
                onChange={e => setForm({ ...form, authorityLevel: e.target.value })}
              >
                {authorityLevels.map(a => (
                  <MenuItem key={a.value} value={a.value}>
                    {a.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القسم / الإدارة"
                value={form.department}
                onChange={e => setForm({ ...form, department: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المؤسسة"
                value={form.organization}
                onChange={e => setForm({ ...form, organization: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="الأولوية"
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
              >
                <MenuItem value="low">🟢 منخفضة</MenuItem>
                <MenuItem value="medium">🟡 متوسطة</MenuItem>
                <MenuItem value="high">🟠 عالية</MenuItem>
                <MenuItem value="critical">🔴 حرجة</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                  size="small"
                  label="الوسوم"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button size="small" onClick={addTag}>
                  إضافة
                </Button>
                {form.tags.map((tag, i) => (
                  <Chip
                    key={i}
                    label={tag}
                    size="small"
                    onDelete={() =>
                      setForm(prev => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))
                    }
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* ─── Step 1: Design ────────────────────────────────────────────────── */}
      {activeStep === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                تصميم الختم
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                الشكل
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={form.stampShape}
                onChange={(_, v) => v && setForm({ ...form, stampShape: v })}
                sx={{ mb: 3 }}
              >
                <ToggleButton value="circle">
                  <Circle sx={{ ml: 1 }} /> دائري
                </ToggleButton>
                <ToggleButton value="oval">بيضاوي</ToggleButton>
                <ToggleButton value="rectangle">
                  <Square sx={{ ml: 1 }} /> مستطيل
                </ToggleButton>
                <ToggleButton value="square">مربع</ToggleButton>
              </ToggleButtonGroup>

              <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                الألوان
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  { key: 'primary', label: 'أساسي' },
                  { key: 'secondary', label: 'ثانوي' },
                  { key: 'text', label: 'نص' },
                  { key: 'border', label: 'إطار' },
                ].map(c => (
                  <Grid item xs={3} key={c.key}>
                    <Typography variant="caption">{c.label}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        type="color"
                        value={form.colorScheme[c.key]}
                        onChange={e =>
                          setForm({
                            ...form,
                            colorScheme: { ...form.colorScheme, [c.key]: e.target.value },
                          })
                        }
                        style={{ width: 40, height: 32, border: 'none', cursor: 'pointer' }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {form.colorScheme[c.key]}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                الحجم: {form.size.width} × {form.size.height}
              </Typography>
              <Slider
                value={form.size.width}
                min={80}
                max={250}
                step={10}
                onChange={(_, v) => setForm({ ...form, size: { width: v, height: v } })}
                sx={{ mb: 3 }}
              />

              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.includeDate}
                        onChange={e => setForm({ ...form, includeDate: e.target.checked })}
                      />
                    }
                    label="تضمين التاريخ"
                  />
                </Grid>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.includeNumber}
                        onChange={e => setForm({ ...form, includeNumber: e.target.checked })}
                      />
                    }
                    label="تضمين الرقم"
                  />
                </Grid>
                <Grid item xs={4}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.includeQR}
                        onChange={e => setForm({ ...form, includeQR: e.target.checked })}
                      />
                    }
                    label="تضمين QR"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Preview */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                معاينة
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <canvas
                  ref={canvasRef}
                  style={{
                    width: form.size.width,
                    height: form.size.height,
                    border: '1px dashed #ccc',
                    borderRadius: 8,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                هذه معاينة تقريبية — يمكن تعديل التصميم لاحقاً
              </Typography>
            </Paper>

            {/* Quick templates */}
            <Paper sx={{ p: 2, borderRadius: 2, mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                أنماط سريعة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {[
                  {
                    name: 'رسمي أزرق',
                    primary: '#1a237e',
                    secondary: '#c62828',
                    text: '#1a237e',
                    border: '#1a237e',
                  },
                  {
                    name: 'أخضر رسمي',
                    primary: '#1b5e20',
                    secondary: '#1b5e20',
                    text: '#1b5e20',
                    border: '#1b5e20',
                  },
                  {
                    name: 'أحمر رسمي',
                    primary: '#b71c1c',
                    secondary: '#b71c1c',
                    text: '#b71c1c',
                    border: '#b71c1c',
                  },
                  {
                    name: 'ذهبي',
                    primary: '#bf360c',
                    secondary: '#f57f17',
                    text: '#bf360c',
                    border: '#bf360c',
                  },
                  {
                    name: 'أسود',
                    primary: '#212121',
                    secondary: '#212121',
                    text: '#212121',
                    border: '#212121',
                  },
                ].map((preset, i) => (
                  <Chip
                    key={i}
                    label={preset.name}
                    size="small"
                    clickable
                    sx={{ borderRight: `4px solid ${preset.primary}` }}
                    onClick={() =>
                      setForm({
                        ...form,
                        colorScheme: {
                          primary: preset.primary,
                          secondary: preset.secondary,
                          text: preset.text,
                          border: preset.border,
                        },
                      })
                    }
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ─── Step 2: Security & Authorization ─────────────────────────────── */}
      {activeStep === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                إعدادات الأمان
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.requireApprovalPerUse}
                        onChange={e =>
                          setForm({ ...form, requireApprovalPerUse: e.target.checked })
                        }
                      />
                    }
                    label="موافقة قبل كل استخدام"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.requireOTP}
                        onChange={e => setForm({ ...form, requireOTP: e.target.checked })}
                      />
                    }
                    label="يتطلب رمز OTP"
                  />
                </Grid>
                <Grid item xs={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={form.isExpirable}
                        onChange={e => setForm({ ...form, isExpirable: e.target.checked })}
                      />
                    }
                    label="محدود المدة"
                  />
                </Grid>
                {form.isExpirable && (
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="تاريخ الانتهاء"
                      InputLabelProps={{ shrink: true }}
                      value={form.validUntil}
                      onChange={e => setForm({ ...form, validUntil: e.target.value })}
                    />
                  </Grid>
                )}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="حد الاستخدام (0 = غير محدود)"
                    value={form.maxUsageCount}
                    onChange={e => setForm({ ...form, maxUsageCount: +e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="نص العلامة المائية"
                    value={form.watermarkText}
                    onChange={e => setForm({ ...form, watermarkText: e.target.value })}
                    placeholder="سري / نسخة / مسودة"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 3 }}>
                المستخدمون المفوّضون
              </Typography>
              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <TextField
                    size="small"
                    fullWidth
                    label="الاسم"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </Grid>
                <Grid item xs={3}>
                  <TextField
                    size="small"
                    fullWidth
                    label="البريد"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    size="small"
                    fullWidth
                    label="القسم"
                    value={newUser.department}
                    onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                  />
                </Grid>
                <Grid item xs={2}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="الدور"
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <MenuItem value="admin">مسؤول</MenuItem>
                    <MenuItem value="user">مستخدم</MenuItem>
                    <MenuItem value="viewer">مشاهد</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={2} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={addAuthorizedUser}
                    disabled={!newUser.name}
                  >
                    إضافة
                  </Button>
                </Grid>
              </Grid>

              {form.authorizedUsers.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ textAlign: 'center', py: 3 }}
                >
                  لم يتم إضافة مستخدمين — المنشئ يُضاف تلقائياً كمالك
                </Typography>
              ) : (
                form.authorizedUsers.map((u, i) => (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{u.name[0]}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="600">
                        {u.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {u.email} — {u.department}
                      </Typography>
                    </Box>
                    <Chip
                      label={
                        u.role === 'admin' ? 'مسؤول' : u.role === 'viewer' ? 'مشاهد' : 'مستخدم'
                      }
                      size="small"
                    />
                    <IconButton
                      size="small"
                      onClick={() =>
                        setForm(prev => ({
                          ...prev,
                          authorizedUsers: prev.authorizedUsers.filter((_, idx) => idx !== i),
                        }))
                      }
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ─── Step 3: Review ────────────────────────────────────────────────── */}
      {activeStep === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                معاينة الختم
              </Typography>
              {form.stampImage ? (
                <Box
                  component="img"
                  src={form.stampImage}
                  sx={{
                    width: form.size.width,
                    height: form.size.height,
                    mx: 'auto',
                    display: 'block',
                    mb: 2,
                  }}
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  style={{
                    width: form.size.width,
                    height: form.size.height,
                    border: '1px dashed #ccc',
                    borderRadius: 8,
                  }}
                />
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                ملخص البيانات
              </Typography>
              <Grid container spacing={2}>
                {[
                  { label: 'اسم الختم', value: form.name_ar },
                  {
                    label: 'النوع',
                    value: stampTypes.find(t => t.value === form.stampType)?.label,
                  },
                  {
                    label: 'التصنيف',
                    value: categories.find(c => c.value === form.category)?.label,
                  },
                  { label: 'المؤسسة', value: form.organization },
                  { label: 'القسم', value: form.department || '—' },
                  {
                    label: 'مستوى الصلاحية',
                    value: authorityLevels.find(a => a.value === form.authorityLevel)?.label,
                  },
                  {
                    label: 'الشكل',
                    value:
                      form.stampShape === 'circle'
                        ? 'دائري'
                        : form.stampShape === 'rectangle'
                          ? 'مستطيل'
                          : form.stampShape,
                  },
                  {
                    label: 'محدود المدة',
                    value: form.isExpirable ? `نعم — حتى ${form.validUntil}` : 'لا',
                  },
                  {
                    label: 'حد الاستخدام',
                    value: form.maxUsageCount > 0 ? form.maxUsageCount : 'غير محدود',
                  },
                  { label: 'يتطلب OTP', value: form.requireOTP ? 'نعم' : 'لا' },
                  { label: 'المفوّضون', value: `${form.authorizedUsers.length} مستخدم` },
                ].map((item, i) => (
                  <Grid item xs={6} key={i}>
                    <Typography variant="caption" color="text.secondary">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" fontWeight="600">
                      {item.value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
              {form.tags.length > 0 && (
                <Box sx={{ mt: 2, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {form.tags.map((tag, i) => (
                    <Chip key={i} label={tag} size="small" />
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ─── Navigation Buttons ────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(s => s - 1)}
          startIcon={<ArrowForward />}
        >
          السابق
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {activeStep === steps.length - 1 ? (
            <>
              <Button
                variant="outlined"
                onClick={() => handleSubmit(true)}
                disabled={submitting}
                startIcon={<Save />}
              >
                حفظ كمسودة
              </Button>
              <Button
                variant="contained"
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : <Send />}
              >
                إنشاء وتقديم للاعتماد
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={() => setActiveStep(s => s + 1)}
              endIcon={<ArrowBack />}
            >
              التالي
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
