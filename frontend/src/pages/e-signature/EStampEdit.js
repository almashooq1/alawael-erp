/**
 * EStampEdit — تعديل الختم الإلكتروني
 * Loads existing stamp and allows editing basic info, design, and security settings.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eStampService from '../../services/eStamp.service';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Slider,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Delete,
  Circle,
  Square,
  CloudUpload,
  DesignServices,
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

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function EStampEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const canvasRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stamp, setStamp] = useState(null);
  const [designMode, setDesignMode] = useState('auto');
  const [customImagePreview, setCustomImagePreview] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [form, setForm] = useState({
    name_ar: '',
    name_en: '',
    description: '',
    stampType: 'official',
    category: 'administrative',
    department: '',
    organization: '',
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
  });

  /* ─── Load Stamp ───────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const res = await eStampService.getById(id);
        const s = res?.data?.data;
        if (!s) throw new Error('not found');
        setStamp(s);
        setForm({
          name_ar: s.name_ar || '',
          name_en: s.name_en || '',
          description: s.description || '',
          stampType: s.stampType || 'official',
          category: s.category || 'administrative',
          department: s.department || '',
          organization: s.organization || '',
          authorityLevel: s.authorityLevel || 'department',
          stampShape: s.stampShape || 'circle',
          colorScheme: s.colorScheme || {
            primary: '#1a237e',
            secondary: '#c62828',
            text: '#1a237e',
            border: '#1a237e',
          },
          size: s.size || { width: 150, height: 150 },
          includeDate: s.includeDate ?? true,
          includeNumber: s.includeNumber ?? true,
          includeQR: s.includeQR ?? false,
          stampImage: s.stampImage || '',
          isExpirable: s.isExpirable ?? false,
          validUntil: s.validUntil ? s.validUntil.slice(0, 10) : '',
          maxUsageCount: s.maxUsageCount || 0,
          requireApprovalPerUse: s.requireApprovalPerUse ?? false,
          requireOTP: s.requireOTP ?? false,
          watermarkText: s.watermarkText || '',
          tags: s.tags || [],
          priority: s.priority || 'medium',
        });
        // If stamp has a custom uploaded image (not canvas-generated), show it
        if (s.stampImage && !s.stampImage.startsWith('data:image/png;base64,iVBOR')) {
          setDesignMode('upload');
          setCustomImagePreview(s.stampImage);
        }
      } catch {
        showSnackbar('لم يتم العثور على الختم', 'error');
        navigate('/e-stamp');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ─── Canvas Stamp Preview ─────────────────────────────────────────────── */
  const drawStampPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    const w = form.size.width || 150;
    const h = form.size.height || 150;
    canvas.width = w * 2;
    canvas.height = h * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) / 2 - 4;
    const { primary, secondary, text: textColor, border: borderColor } = form.colorScheme;

    ctx.lineWidth = 3;
    ctx.strokeStyle = borderColor;
    if (form.stampShape === 'circle' || form.stampShape === 'oval') {
      ctx.beginPath();
      const rx = form.stampShape === 'oval' ? r : r * 0.9;
      const ry = r * 0.9;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx - 6, ry - 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const pad = 4;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
      ctx.lineWidth = 1;
      ctx.strokeRect(pad + 6, pad + 6, w - (pad + 6) * 2, h - (pad + 6) * 2);
    }

    // Organization name arc
    if (form.organization) {
      ctx.save();
      ctx.font = `bold ${Math.max(10, r / 5)}px "Cairo", sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      const orgR = r - 16;
      const chars = form.organization.split('');
      const totalAngle = Math.min(Math.PI * 0.9, chars.length * 0.14);
      let startAngle = -Math.PI / 2 - totalAngle / 2;
      chars.forEach(ch => {
        const angle = startAngle;
        ctx.save();
        ctx.translate(cx + Math.cos(angle) * orgR, cy + Math.sin(angle) * orgR);
        ctx.rotate(angle + Math.PI / 2);
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        startAngle += totalAngle / chars.length;
      });
      ctx.restore();
    }

    // Star icon
    ctx.save();
    ctx.fillStyle = secondary;
    ctx.font = `${r / 3}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy - r / 6);
    ctx.restore();

    // Stamp name
    ctx.save();
    ctx.font = `bold ${Math.max(9, r / 6)}px "Cairo", sans-serif`;
    ctx.fillStyle = primary;
    ctx.textAlign = 'center';
    ctx.fillText(form.name_ar || 'ختم', cx, cy + r / 5);
    ctx.restore();

    // Department
    if (form.department) {
      ctx.save();
      ctx.font = `${Math.max(8, r / 7)}px "Cairo", sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.fillText(form.department, cx, cy + r / 2.5);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }, [form]);

  useEffect(() => {
    if (designMode === 'auto' && !loading) {
      const timeout = setTimeout(() => {
        const img = drawStampPreview();
        if (img) setForm(prev => ({ ...prev, stampImage: img }));
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [designMode, loading, drawStampPreview]);

  /* ─── Custom Image Upload ──────────────────────────────────────────────── */
  const handleCustomImageSelect = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showSnackbar('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      setCustomImagePreview(dataUrl);
      setForm(prev => ({ ...prev, stampImage: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const clearCustomImage = () => {
    setCustomImagePreview('');
    setForm(prev => ({ ...prev, stampImage: '' }));
  };

  /* ─── Save ─────────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.name_ar) {
      showSnackbar('اسم الختم مطلوب', 'warning');
      return;
    }
    setSaving(true);
    try {
      await eStampService.update(id, form);
      showSnackbar('تم تحديث الختم بنجاح', 'success');
      navigate(`/e-stamp/${id}`);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في تحديث الختم', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, t] }));
      setTagInput('');
    }
  };

  /* ─── Loading / Not Found ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stamp) return null;

  const isLocked = !['draft', 'active', 'suspended'].includes(stamp.status);

  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', py: 3, px: 2 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients?.primary || 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
          borderRadius: 3,
          p: 3,
          color: 'white',
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              تعديل الختم: {stamp.name_ar}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {stamp.stampId} — الحالة: {stamp.status}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(`/e-stamp/${id}`)}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            >
              رجوع
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving || isLocked}
              sx={{ bgcolor: 'white', color: 'primary.main' }}
            >
              حفظ التعديلات
            </Button>
          </Box>
        </Box>
      </Box>

      {isLocked && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          لا يمكن تعديل الختم في الحالة الحالية ({stamp.status}). يُسمح بالتعديل فقط للأختام في حالة
          مسودة أو مفعّل أو معلّق.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* ─── Basic Info ──────────────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              معلومات أساسية
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="اسم الختم (عربي)"
                  value={form.name_ar}
                  onChange={e => setForm({ ...form, name_ar: e.target.value })}
                  disabled={isLocked}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="اسم الختم (إنجليزي)"
                  value={form.name_en}
                  onChange={e => setForm({ ...form, name_en: e.target.value })}
                  disabled={isLocked}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="الوصف"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  disabled={isLocked}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="النوع"
                  value={form.stampType}
                  onChange={e => setForm({ ...form, stampType: e.target.value })}
                  disabled={isLocked}
                >
                  {stampTypes.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="التصنيف"
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  disabled={isLocked}
                >
                  {categories.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="الإدارة / القسم"
                  value={form.department}
                  onChange={e => setForm({ ...form, department: e.target.value })}
                  disabled={isLocked}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="مستوى الصلاحية"
                  value={form.authorityLevel}
                  onChange={e => setForm({ ...form, authorityLevel: e.target.value })}
                  disabled={isLocked}
                >
                  {authorityLevels.map(l => (
                    <MenuItem key={l.value} value={l.value}>
                      {l.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  label="الأولوية"
                  value={form.priority}
                  onChange={e => setForm({ ...form, priority: e.target.value })}
                  disabled={isLocked}
                >
                  <MenuItem value="low">منخفضة</MenuItem>
                  <MenuItem value="medium">متوسطة</MenuItem>
                  <MenuItem value="high">عالية</MenuItem>
                  <MenuItem value="critical">حرجة</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="المنظمة"
                  value={form.organization}
                  onChange={e => setForm({ ...form, organization: e.target.value })}
                  disabled={isLocked}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                  <TextField
                    size="small"
                    label="الوسوم"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    disabled={isLocked}
                  />
                  <Button size="small" onClick={addTag} disabled={isLocked}>
                    إضافة
                  </Button>
                  {form.tags.map((tag, i) => (
                    <Chip
                      key={i}
                      label={tag}
                      size="small"
                      onDelete={
                        isLocked
                          ? undefined
                          : () =>
                              setForm(prev => ({
                                ...prev,
                                tags: prev.tags.filter((_, idx) => idx !== i),
                              }))
                      }
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* ─── Design ─────────────────────────────────────────────────────── */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              التصميم
            </Typography>

            <ToggleButtonGroup
              exclusive
              value={designMode}
              onChange={(_, v) => {
                if (!v || isLocked) return;
                setDesignMode(v);
                if (v === 'auto') clearCustomImage();
              }}
              sx={{ mb: 2, width: '100%' }}
              fullWidth
              disabled={isLocked}
            >
              <ToggleButton value="auto">
                <DesignServices sx={{ ml: 1 }} /> تصميم تلقائي
              </ToggleButton>
              <ToggleButton value="upload">
                <CloudUpload sx={{ ml: 1 }} /> رفع صورة مخصصة
              </ToggleButton>
            </ToggleButtonGroup>

            {designMode === 'upload' && (
              <Box
                sx={{
                  border: '2px dashed',
                  borderColor: customImagePreview ? 'success.main' : 'divider',
                  borderRadius: 2,
                  p: 3,
                  textAlign: 'center',
                  cursor: isLocked ? 'default' : 'pointer',
                  bgcolor: customImagePreview ? 'success.50' : 'action.hover',
                  mb: 2,
                }}
                onClick={() =>
                  !isLocked && document.getElementById('edit-stamp-image-upload').click()
                }
              >
                <input
                  id="edit-stamp-image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  hidden
                  onChange={handleCustomImageSelect}
                />
                {customImagePreview ? (
                  <Box>
                    <Box
                      component="img"
                      src={customImagePreview}
                      alt="معاينة الختم"
                      sx={{ maxWidth: 180, maxHeight: 180, borderRadius: 2, mb: 1 }}
                    />
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      ✓ انقر لتغيير الصورة
                    </Typography>
                    {!isLocked && (
                      <Button
                        size="small"
                        color="error"
                        onClick={e => {
                          e.stopPropagation();
                          clearCustomImage();
                        }}
                        sx={{ mt: 1 }}
                      >
                        <Delete sx={{ ml: 0.5 }} /> إزالة
                      </Button>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <CloudUpload sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body2">انقر لرفع صورة الختم</Typography>
                    <Typography variant="caption" color="text.secondary">
                      PNG, JPG, SVG, WebP — الحد 2MB
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {designMode === 'auto' && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  الشكل
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  value={form.stampShape}
                  onChange={(_, v) => v && setForm({ ...form, stampShape: v })}
                  sx={{ mb: 2 }}
                  disabled={isLocked}
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

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  الألوان
                </Typography>
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {[
                    { key: 'primary', label: 'أساسي' },
                    { key: 'secondary', label: 'ثانوي' },
                    { key: 'text', label: 'نص' },
                    { key: 'border', label: 'إطار' },
                  ].map(c => (
                    <Grid item xs={3} key={c.key}>
                      <Typography variant="caption">{c.label}</Typography>
                      <input
                        type="color"
                        value={form.colorScheme[c.key]}
                        onChange={e =>
                          setForm({
                            ...form,
                            colorScheme: { ...form.colorScheme, [c.key]: e.target.value },
                          })
                        }
                        disabled={isLocked}
                        style={{ width: 36, height: 28, border: 'none', cursor: 'pointer' }}
                      />
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
                  disabled={isLocked}
                  sx={{ mb: 2 }}
                />
              </>
            )}

            <Divider sx={{ my: 1 }} />
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.includeDate}
                      onChange={e => setForm({ ...form, includeDate: e.target.checked })}
                      disabled={isLocked}
                    />
                  }
                  label="التاريخ"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.includeNumber}
                      onChange={e => setForm({ ...form, includeNumber: e.target.checked })}
                      disabled={isLocked}
                    />
                  }
                  label="الرقم"
                />
              </Grid>
              <Grid item xs={4}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.includeQR}
                      onChange={e => setForm({ ...form, includeQR: e.target.checked })}
                      disabled={isLocked}
                    />
                  }
                  label="QR"
                />
              </Grid>
            </Grid>

            {/* Preview */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                معاينة
              </Typography>
              {designMode === 'upload' && customImagePreview ? (
                <Box
                  component="img"
                  src={customImagePreview}
                  alt="معاينة"
                  sx={{ maxWidth: 160, maxHeight: 160, borderRadius: 2, border: '1px dashed #ccc' }}
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  style={{
                    width: form.size.width > 160 ? 160 : form.size.width,
                    height: form.size.height > 160 ? 160 : form.size.height,
                    border: '1px dashed #ccc',
                    borderRadius: 8,
                  }}
                />
              )}
            </Box>
          </Paper>
        </Grid>

        {/* ─── Security Settings ──────────────────────────────────────────── */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
              إعدادات الأمان
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.requireApprovalPerUse}
                      onChange={e => setForm({ ...form, requireApprovalPerUse: e.target.checked })}
                      disabled={isLocked}
                    />
                  }
                  label="موافقة قبل كل استخدام"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.requireOTP}
                      onChange={e => setForm({ ...form, requireOTP: e.target.checked })}
                      disabled={isLocked}
                    />
                  }
                  label="يتطلب OTP"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={form.isExpirable}
                      onChange={e => setForm({ ...form, isExpirable: e.target.checked })}
                      disabled={isLocked}
                    />
                  }
                  label="قابل للانتهاء"
                />
              </Grid>
              {form.isExpirable && (
                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="تاريخ الانتهاء"
                    value={form.validUntil}
                    onChange={e => setForm({ ...form, validUntil: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    disabled={isLocked}
                  />
                </Grid>
              )}
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  type="number"
                  label="الحد الأقصى للاستخدام"
                  value={form.maxUsageCount}
                  onChange={e => setForm({ ...form, maxUsageCount: Number(e.target.value) })}
                  helperText="0 = بلا حدود"
                  disabled={isLocked}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="نص العلامة المائية"
                  value={form.watermarkText}
                  onChange={e => setForm({ ...form, watermarkText: e.target.value })}
                  disabled={isLocked}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
