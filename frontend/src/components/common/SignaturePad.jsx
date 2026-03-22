/**
 * SignaturePad — لوحة التوقيع الإلكتروني
 *
 * Reusable canvas-based signature pad with:
 * - Draw mode (freehand)
 * - Type mode (text with font selection)
 * - Upload mode (image file)
 * - Undo/clear/color/thickness controls
 * - Export as base64 PNG
 *
 * Props:
 *   onSave(data)     → { type, image, text, font }
 *   width            → canvas width (default 500)
 *   height           → canvas height (default 200)
 *   initialMode      → 'draw' | 'type' | 'upload' (default 'draw')
 *   disabled         → boolean
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  Button,
  ButtonGroup,
  TextField,
  Typography,
  Slider,
  IconButton,
  Tooltip,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Draw,
  TextFields,
  CloudUpload,
  Undo,
  Delete,
  Save,
  Palette,
  LineWeight,
} from '@mui/icons-material';

/* ─── Signature Fonts ────────────────────────────────────────────────────── */
const SIGNATURE_FONTS = [
  { label: 'كلاسيكي', value: "'Dancing Script', cursive" },
  { label: 'رسمي', value: "'Great Vibes', cursive" },
  { label: 'عصري', value: "'Satisfy', cursive" },
  { label: 'خط عربي', value: "'Amiri', serif" },
  { label: 'نسخ', value: "'Noto Naskh Arabic', serif" },
  { label: 'بسيط', value: "'Caveat', cursive" },
];

const COLORS = ['#000000', '#1a237e', '#1565c0', '#2e7d32', '#c62828', '#4a148c'];

export default function SignaturePad({
  onSave,
  width = 500,
  height = 200,
  initialMode = 'draw',
  disabled = false,
}) {
  const canvasRef = useRef(null);
  const [mode, setMode] = useState(initialMode);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#1a237e');
  const [lineWidth, setLineWidth] = useState(2.5);
  const [typedText, setTypedText] = useState('');
  const [selectedFont, setSelectedFont] = useState(SIGNATURE_FONTS[0].value);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [paths, setPaths] = useState([]); // For undo
  const [currentPath, setCurrentPath] = useState([]);

  /* ─── Canvas initialization ────────────────────────────────────────────── */
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // High DPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw guide line
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(20, height * 0.75);
    ctx.lineTo(width - 20, height * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [width, height]);

  useEffect(() => {
    if (mode === 'draw') {
      initCanvas();
      redrawPaths();
    }
    // eslint-disable-next-line
  }, [mode, initCanvas]);

  /* ─── Redraw all saved paths ───────────────────────────────────────────── */
  const redrawPaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    for (const p of paths) {
      if (p.points.length < 2) continue;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.stroke();
    }
  }, [paths]);

  /* ─── Drawing handlers ─────────────────────────────────────────────────── */
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const startDrawing = (e) => {
    if (disabled || mode !== 'draw') return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    setCurrentPath([pos]);

    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!isDrawing || mode !== 'draw') return;
    e.preventDefault();
    const pos = getPos(e);
    setCurrentPath(prev => [...prev, pos]);

    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    e?.preventDefault();
    setIsDrawing(false);

    if (currentPath.length > 1) {
      setPaths(prev => [...prev, { points: currentPath, color, lineWidth }]);
    }
    setCurrentPath([]);
  };

  /* ─── Undo ─────────────────────────────────────────────────────────────── */
  const handleUndo = () => {
    if (paths.length === 0) return;
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    initCanvas();
    // Redraw remaining paths after init
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      for (const p of newPaths) {
        if (p.points.length < 2) continue;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(p.points[0].x, p.points[0].y);
        for (let i = 1; i < p.points.length; i++) {
          ctx.lineTo(p.points[i].x, p.points[i].y);
        }
        ctx.stroke();
      }
    }, 0);
  };

  /* ─── Clear ────────────────────────────────────────────────────────────── */
  const handleClear = () => {
    setPaths([]);
    setCurrentPath([]);
    setTypedText('');
    setUploadedImage(null);
    if (mode === 'draw') initCanvas();
  };

  /* ─── Upload handler ───────────────────────────────────────────────────── */
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadedImage(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  /* ─── Export signature ─────────────────────────────────────────────────── */
  const handleSave = () => {
    let imageData = null;

    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || paths.length === 0) return;
      imageData = canvas.toDataURL('image/png');
    } else if (mode === 'type') {
      if (!typedText.trim()) return;
      // Render typed text to a canvas for consistent output
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width * 2;
      tempCanvas.height = height * 2;
      const ctx = tempCanvas.getContext('2d');
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = color;
      ctx.font = `48px ${selectedFont}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedText, 20, height / 2);
      imageData = tempCanvas.toDataURL('image/png');
    } else if (mode === 'upload') {
      if (!uploadedImage) return;
      imageData = uploadedImage;
    }

    if (onSave && imageData) {
      onSave({
        type: mode,
        image: imageData,
        text: mode === 'type' ? typedText : undefined,
        font: mode === 'type' ? selectedFont : undefined,
      });
    }
  };

  /* ─── Has content check ────────────────────────────────────────────────── */
  const hasContent =
    (mode === 'draw' && paths.length > 0) ||
    (mode === 'type' && typedText.trim().length > 0) ||
    (mode === 'upload' && uploadedImage);

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        opacity: disabled ? 0.5 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {/* ── Mode Tabs ──────────────────────────────────────────────────── */}
      <Tabs
        value={mode}
        onChange={(_, v) => setMode(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<Draw />} iconPosition="start" label="رسم" value="draw" />
        <Tab icon={<TextFields />} iconPosition="start" label="كتابة" value="type" />
        <Tab icon={<CloudUpload />} iconPosition="start" label="رفع صورة" value="upload" />
      </Tabs>

      {/* ── Draw Mode ──────────────────────────────────────────────────── */}
      {mode === 'draw' && (
        <Box>
          {/* Controls */}
          <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap">
            <Tooltip title="تراجع">
              <IconButton onClick={handleUndo} disabled={paths.length === 0} size="small">
                <Undo />
              </IconButton>
            </Tooltip>
            <Tooltip title="مسح الكل">
              <IconButton onClick={handleClear} disabled={paths.length === 0} size="small" color="error">
                <Delete />
              </IconButton>
            </Tooltip>
            <Box sx={{ mx: 1, display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Palette sx={{ color: 'text.secondary', fontSize: 18 }} />
              {COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    bgcolor: c,
                    border: color === c ? '2px solid #1976d2' : '1px solid #ccc',
                    cursor: 'pointer',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
              <LineWeight sx={{ color: 'text.secondary', fontSize: 18 }} />
              <Slider
                value={lineWidth}
                onChange={(_, v) => setLineWidth(v)}
                min={1}
                max={6}
                step={0.5}
                size="small"
                sx={{ width: 80 }}
              />
            </Box>
          </Stack>

          {/* Canvas */}
          <Box
            sx={{
              border: '2px dashed',
              borderColor: isDrawing ? 'primary.main' : '#ccc',
              borderRadius: 2,
              cursor: 'crosshair',
              overflow: 'hidden',
              transition: 'border-color 0.2s',
              bgcolor: '#fff',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{ display: 'block', touchAction: 'none' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" mt={0.5}>
            وقّع باستخدام الماوس أو اللمس على المنطقة أعلاه
          </Typography>
        </Box>
      )}

      {/* ── Type Mode ──────────────────────────────────────────────────── */}
      {mode === 'type' && (
        <Box>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الخط</InputLabel>
              <Select
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                label="نوع الخط"
              >
                {SIGNATURE_FONTS.map(f => (
                  <MenuItem key={f.value} value={f.value} sx={{ fontFamily: f.value }}>
                    {f.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              placeholder="اكتب توقيعك هنا..."
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              variant="outlined"
              inputProps={{
                style: {
                  fontFamily: selectedFont,
                  fontSize: '32px',
                  textAlign: 'center',
                  padding: '20px',
                  color,
                },
              }}
            />

            {/* Preview */}
            {typedText && (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  bgcolor: '#fafafa',
                  borderStyle: 'dashed',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: selectedFont,
                    fontSize: 48,
                    color,
                    lineHeight: 1.5,
                  }}
                >
                  {typedText}
                </Typography>
              </Paper>
            )}

            {/* Color picker */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="text.secondary">اللون:</Typography>
              {COLORS.map(c => (
                <Box
                  key={c}
                  onClick={() => setColor(c)}
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: c,
                    border: color === c ? '2px solid #1976d2' : '1px solid #ccc',
                    cursor: 'pointer',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'transform 0.15s',
                  }}
                />
              ))}
            </Stack>
          </Stack>
        </Box>
      )}

      {/* ── Upload Mode ────────────────────────────────────────────────── */}
      {mode === 'upload' && (
        <Box>
          <Box
            sx={{
              border: '2px dashed #ccc',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: '#fafafa',
              cursor: 'pointer',
              '&:hover': { borderColor: 'primary.main', bgcolor: '#f5f5ff' },
              transition: 'all 0.2s',
            }}
            onClick={() => document.getElementById('sig-upload-input').click()}
          >
            {uploadedImage ? (
              <Box>
                <img
                  src={uploadedImage}
                  alt="uploaded signature"
                  style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain' }}
                />
                <Typography variant="caption" display="block" mt={1} color="text.secondary">
                  اضغط لاستبدال الصورة
                </Typography>
              </Box>
            ) : (
              <Box>
                <CloudUpload sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  اضغط أو اسحب صورة التوقيع هنا
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  PNG, JPG — حد أقصى 5 ميجابايت
                </Typography>
              </Box>
            )}
          </Box>
          <input
            id="sig-upload-input"
            type="file"
            accept="image/png,image/jpeg"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </Box>
      )}

      {/* ── Action Buttons ─────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={handleClear}
          disabled={!hasContent}
          size="small"
        >
          مسح
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={!hasContent}
          size="small"
          sx={{
            background: 'linear-gradient(45deg, #1a237e 30%, #1565c0 90%)',
            '&:hover': { background: 'linear-gradient(45deg, #0d1642 30%, #0d47a1 90%)' },
          }}
        >
          اعتماد التوقيع
        </Button>
      </Stack>
    </Paper>
  );
}
