/**
 * WatermarkDesigner — مصمم العلامات المائية
 * مكون لإنشاء وتعديل ملفات العلامات المائية مع معاينة حية
 */
import { useState, useEffect, useRef } from 'react';




/* ─── الإعدادات الافتراضية المسبقة ─── */
const PRESETS = [
  { label: 'سري', value: 'سري', color: '#f44336', opacity: 0.15 },
  { label: 'داخلي فقط', value: 'للاستخدام الداخلي فقط', color: '#ff9800', opacity: 0.12 },
  { label: 'مسودة', value: 'مسودة', color: '#9e9e9e', opacity: 0.2 },
  { label: 'عام', value: 'وثيقة عامة', color: '#4caf50', opacity: 0.1 },
  { label: 'مقيد', value: 'مقيد - لا تنسخ', color: '#9c27b0', opacity: 0.15 },
];

const POSITIONS = [
  { label: 'مركز', value: 'center' },
  { label: 'أعلى يمين', value: 'top-right' },
  { label: 'أعلى يسار', value: 'top-left' },
  { label: 'أسفل يمين', value: 'bottom-right' },
  { label: 'أسفل يسار', value: 'bottom-left' },
  { label: 'تبليط كامل', value: 'tile' },
];

const defaultForm = {
  name: '',
  type: 'text',
  settings: {
    text: '',
    fontSize: 48,
    fontFamily: 'Arial',
    color: '#000000',
    opacity: 0.15,
    rotation: -45,
    position: 'center',
    tiled: false,
    tileSpacing: 100,
    margin: 20,
  },
  isActive: true,
  appliesTo: 'all',
  description: '',
};

export default function WatermarkDesigner({ open, onClose, onSave, profile }) {
  const [form, setForm] = useState(defaultForm);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        type: profile.type || 'text',
        settings: { ...defaultForm.settings, ...profile.settings },
        isActive: profile.isActive !== false,
        appliesTo: profile.appliesTo || 'all',
        description: profile.description || '',
      });
    } else {
      setForm(defaultForm);
    }
  }, [profile, open]);

  // Live canvas preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Simulated document background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Draw fake document lines
    ctx.fillStyle = '#e0e0e0';
    for (let y = 30; y < h - 20; y += 18) {
      const lineW = 20 + Math.random() * (w - 80);
      ctx.fillRect(20, y, lineW, 8);
    }

    // Draw watermark
    const s = form.settings;
    ctx.save();

    if (form.type === 'text' && s.text) {
      ctx.globalAlpha = s.opacity;
      ctx.fillStyle = s.color;
      ctx.font = `bold ${s.fontSize * 0.6}px ${s.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (s.tiled || s.position === 'tile') {
        const spacing = s.tileSpacing * 0.6;
        for (let x = -w; x < w * 2; x += spacing) {
          for (let y = -h; y < h * 2; y += spacing * 0.6) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate((s.rotation * Math.PI) / 180);
            ctx.fillText(s.text, 0, 0);
            ctx.restore();
          }
        }
      } else {
        let cx = w / 2, cy = h / 2;
        if (s.position === 'top-right') { cx = w - 60; cy = 40; }
        else if (s.position === 'top-left') { cx = 60; cy = 40; }
        else if (s.position === 'bottom-right') { cx = w - 60; cy = h - 40; }
        else if (s.position === 'bottom-left') { cx = 60; cy = h - 40; }
        ctx.translate(cx, cy);
        ctx.rotate((s.rotation * Math.PI) / 180);
        ctx.fillText(s.text, 0, 0);
      }
    } else if (form.type === 'qr') {
      // Simulated QR code
      ctx.globalAlpha = s.opacity;
      const qrSize = 60;
      const cx = w / 2 - qrSize / 2;
      const cy = h / 2 - qrSize / 2;
      ctx.fillStyle = s.color;
      const cellSize = qrSize / 8;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (Math.random() > 0.4) {
            ctx.fillRect(cx + c * cellSize, cy + r * cellSize, cellSize - 1, cellSize - 1);
          }
        }
      }
    } else if (form.type === 'invisible') {
      // Invisible watermark indicator
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = '#0000ff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('[ علامة مائية مخفية ]', w / 2, h / 2);
    }

    ctx.restore();
  }, [form, open]);

  const updateSettings = (key, val) => {
    setForm(p => ({ ...p, settings: { ...p.settings, [key]: val } }));
  };

  const applyPreset = (preset) => {
    setForm(p => ({
      ...p,
      type: 'text',
      settings: { ...p.settings, text: preset.value, color: preset.color, opacity: preset.opacity },
    }));
  };

  const handleSave = () => {
    if (!form.name) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>
        {profile ? 'تعديل العلامة المائية' : 'إنشاء علامة مائية جديدة'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          {/* Left — Settings */}
          <Grid item xs={12} md={7}>
            {/* Basic Info */}
            <Stack spacing={2} mb={2}>
              <TextField
                fullWidth label="اسم الملف" value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                required
              />
              <TextField
                fullWidth label="الوصف" multiline rows={2} value={form.description}
                onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Stack>

            {/* Type */}
            <Typography variant="subtitle2" gutterBottom>نوع العلامة المائية</Typography>
            <ToggleButtonGroup
              value={form.type}
              exclusive
              onChange={(_, v) => v && setForm(p => ({ ...p, type: v }))}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="text"><TextIcon sx={{ ml: 1 }} /> نص</ToggleButton>
              <ToggleButton value="image"><ImageIcon sx={{ ml: 1 }} /> صورة</ToggleButton>
              <ToggleButton value="qr"><QrCodeIcon sx={{ ml: 1 }} /> رمز QR</ToggleButton>
              <ToggleButton value="invisible"><InvisibleIcon sx={{ ml: 1 }} /> مخفي</ToggleButton>
            </ToggleButtonGroup>

            {/* Presets */}
            <Typography variant="subtitle2" gutterBottom>قوالب جاهزة</Typography>
            <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
              {PRESETS.map((p) => (
                <Chip
                  key={p.label}
                  label={p.label}
                  onClick={() => applyPreset(p)}
                  sx={{ bgcolor: p.color + '22', color: p.color, fontWeight: 'bold', cursor: 'pointer' }}
                />
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Text Settings */}
            {form.type === 'text' && (
              <Stack spacing={2}>
                <TextField
                  fullWidth label="نص العلامة المائية" value={form.settings.text}
                  onChange={(e) => updateSettings('text', e.target.value)}
                  placeholder="مثال: سري — للاستخدام الداخلي فقط"
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>الخط</InputLabel>
                      <Select value={form.settings.fontFamily} label="الخط"
                        onChange={(e) => updateSettings('fontFamily', e.target.value)}>
                        <MenuItem value="Arial">Arial</MenuItem>
                        <MenuItem value="Tahoma">Tahoma</MenuItem>
                        <MenuItem value="Cairo">Cairo</MenuItem>
                        <MenuItem value="Amiri">Amiri</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth size="small" label="اللون" type="color"
                      value={form.settings.color}
                      onChange={(e) => updateSettings('color', e.target.value)}
                    />
                  </Grid>
                </Grid>
              </Stack>
            )}

            {/* Common Controls */}
            <Box mt={2}>
              <Typography variant="body2" gutterBottom>
                حجم الخط: {form.settings.fontSize}px
              </Typography>
              <Slider
                value={form.settings.fontSize}
                min={12} max={120} step={2}
                onChange={(_, v) => updateSettings('fontSize', v)}
              />

              <Typography variant="body2" gutterBottom>
                الشفافية: {Math.round(form.settings.opacity * 100)}%
              </Typography>
              <Slider
                value={form.settings.opacity}
                min={0.01} max={0.5} step={0.01}
                onChange={(_, v) => updateSettings('opacity', v)}
              />

              <Typography variant="body2" gutterBottom>
                الزاوية: {form.settings.rotation}°
              </Typography>
              <Slider
                value={form.settings.rotation}
                min={-180} max={180} step={5}
                onChange={(_, v) => updateSettings('rotation', v)}
              />

              <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                <InputLabel>الموضع</InputLabel>
                <Select value={form.settings.position} label="الموضع"
                  onChange={(e) => updateSettings('position', e.target.value)}>
                  {POSITIONS.map(p => (
                    <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={<Switch checked={form.settings.tiled} onChange={(e) => updateSettings('tiled', e.target.checked)} />}
                label="تبليط كامل الصفحة"
                sx={{ mt: 1 }}
              />

              {form.settings.tiled && (
                <>
                  <Typography variant="body2" gutterBottom>
                    المسافة بين البلاط: {form.settings.tileSpacing}px
                  </Typography>
                  <Slider
                    value={form.settings.tileSpacing}
                    min={50} max={300} step={10}
                    onChange={(_, v) => updateSettings('tileSpacing', v)}
                  />
                </>
              )}
            </Box>

            {/* Active / AppliesTo */}
            <Stack direction="row" spacing={2} mt={2}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm(p => ({ ...p, isActive: e.target.checked }))} />}
                label="نشط"
              />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>ينطبق على</InputLabel>
                <Select value={form.appliesTo} label="ينطبق على"
                  onChange={(e) => setForm(p => ({ ...p, appliesTo: e.target.value }))}>
                  <MenuItem value="all">جميع المستندات</MenuItem>
                  <MenuItem value="confidential">السرية فقط</MenuItem>
                  <MenuItem value="internal">الداخلية فقط</MenuItem>
                  <MenuItem value="external">الخارجية فقط</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Grid>

          {/* Right — Preview */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f5f5', position: 'sticky', top: 16 }}>
              <Typography variant="subtitle1" fontWeight="bold" textAlign="center" gutterBottom>
                معاينة حية
              </Typography>
              <Box sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden', bgcolor: '#fff' }}>
                <canvas
                  ref={canvasRef}
                  width={340}
                  height={440}
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>

              {form.type === 'invisible' && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  العلامة المائية المخفية غير مرئية ولكن يمكن اكتشافها برمجياً
                </Alert>
              )}

              {/* Settings Summary */}
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  النوع: {form.type === 'text' ? 'نص' : form.type === 'image' ? 'صورة' : form.type === 'qr' ? 'QR' : 'مخفي'} |
                  الشفافية: {Math.round(form.settings.opacity * 100)}% |
                  الزاوية: {form.settings.rotation}°
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={() => setForm(defaultForm)} startIcon={<ResetIcon />}>إعادة تعيين</Button>
        <Button variant="contained" onClick={handleSave} startIcon={<SaveIcon />} disabled={!form.name}>
          {profile ? 'تحديث' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
