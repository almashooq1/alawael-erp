/**
 * Document Scanner Component
 * مكون مسح المستندات — يستخدم كاميرا المتصفح لالتقاط صور المستندات
 * مع معالجة وتحسين الصورة + رفع تلقائي
 */

import { useState, useRef, useCallback, useEffect } from 'react';

import { statusColors, surfaceColors } from '../../theme/palette';
import documentService from 'services/documentService';
import logger from 'utils/logger';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ScannerIcon from '@mui/icons-material/Scanner';
import CloseIcon from '@mui/icons-material/Close';
import CameraIcon from '@mui/icons-material/Camera';
import FlipIcon from '@mui/icons-material/Flip';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ImageIcon from '@mui/icons-material/Image';
import UploadIcon from '@mui/icons-material/Upload';

/* ─── Filter Presets ─── */
const FILTER_PRESETS = [
  {
    id: 'original',
    label: 'أصلي',
    icon: '🖼️',
    filters: { brightness: 100, contrast: 100, grayscale: 0, sharpen: false },
  },
  {
    id: 'document',
    label: 'مستند',
    icon: '📄',
    filters: { brightness: 110, contrast: 130, grayscale: 100, sharpen: true },
  },
  {
    id: 'enhanced',
    label: 'محسّن',
    icon: '✨',
    filters: { brightness: 105, contrast: 120, grayscale: 0, sharpen: true },
  },
  {
    id: 'bw',
    label: 'أبيض وأسود',
    icon: '🔲',
    filters: { brightness: 115, contrast: 140, grayscale: 100, sharpen: false },
  },
  {
    id: 'bright',
    label: 'ساطع',
    icon: '☀️',
    filters: { brightness: 130, contrast: 110, grayscale: 0, sharpen: false },
  },
];

const DocumentScanner = ({ open, onClose, onSuccess }) => {
  /* ─── State ─── */
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('camera'); // camera | preview | details
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // environment | user
  const [zoom, setZoom] = useState(1);

  // Image processing
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    grayscale: 0,
    sharpen: false,
  });
  const [activePreset, setActivePreset] = useState('original');
  const [showFilters, setShowFilters] = useState(false);

  // Multiple pages
  const [scannedPages, setScannedPages] = useState([]);

  // Upload form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('أخرى');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const categories = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];

  /* ─── Camera Management ─── */
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      setCameraReady(false);

      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraReady(true);
        };
      }
    } catch (err) {
      logger.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setCameraError('تم رفض إذن الكاميرا. يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('لم يتم العثور على كاميرا. يرجى توصيل كاميرا والمحاولة مرة أخرى.');
      } else {
        setCameraError(`خطأ في الكاميرا: ${err.message}`);
      }
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (open && step === 'camera') {
      startCamera();
    }
    return () => stopCamera();
  }, [open, step, startCamera, stopCamera]);

  const flipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  /* ─── Capture & Process ─── */
  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply zoom via transform
    const zoomScale = zoom;
    const dx = (canvas.width - canvas.width / zoomScale) / 2;
    const dy = (canvas.height - canvas.height / zoomScale) / 2;

    ctx.save();
    ctx.translate(dx * zoomScale, dy * zoomScale);
    ctx.scale(zoomScale, zoomScale);
    ctx.drawImage(video, 0, 0);
    ctx.restore();

    const imageData = canvas.toDataURL('image/png', 1.0);
    setCapturedImage(imageData);
    setStep('preview');
    stopCamera();
  }, [zoom, stopCamera]);

  const applyFiltersToCanvas = useCallback(() => {
    if (!capturedImage || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        // Apply CSS-like filters
        const filterStr = [
          `brightness(${filters.brightness}%)`,
          `contrast(${filters.contrast}%)`,
          filters.grayscale > 0 ? `grayscale(${filters.grayscale}%)` : '',
        ]
          .filter(Boolean)
          .join(' ');

        ctx.filter = filterStr;
        ctx.drawImage(img, 0, 0);

        // Simple sharpen using unsharp mask
        if (filters.sharpen) {
          ctx.filter = 'none';
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const sharpened = applySharpen(imageData);
          ctx.putImageData(sharpened, 0, 0);
        }

        resolve(canvas.toDataURL('image/png', 1.0));
      };
      img.src = capturedImage;
    });
  }, [capturedImage, filters]);

  /* ─── Simple Sharpen Filter ─── */
  const applySharpen = imageData => {
    const { data, width, height } = imageData;
    const output = new Uint8ClampedArray(data);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let val = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              val += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          output[(y * width + x) * 4 + c] = val;
        }
      }
    }

    return new ImageData(output, width, height);
  };

  /* ─── Retake / Add Page ─── */
  const retake = () => {
    setCapturedImage(null);
    setFilters({ brightness: 100, contrast: 100, grayscale: 0, sharpen: false });
    setActivePreset('original');
    setStep('camera');
  };

  const addPage = async () => {
    const processedImage = await applyFiltersToCanvas();
    if (processedImage) {
      setScannedPages(prev => [...prev, processedImage]);
    }
    retake();
  };

  const removePage = index => {
    setScannedPages(prev => prev.filter((_, i) => i !== index));
  };

  /* ─── Apply Preset ─── */
  const applyPreset = preset => {
    setFilters(preset.filters);
    setActivePreset(preset.id);
  };

  /* ─── Proceed to Details ─── */
  const proceedToDetails = async () => {
    const processedImage = await applyFiltersToCanvas();
    if (processedImage) {
      setScannedPages(prev => [...prev, processedImage]);
    }
    setStep('details');
  };

  /* ─── Upload ─── */
  const handleUpload = async () => {
    if (!title) {
      setError('العنوان مطلوب');
      return;
    }

    if (scannedPages.length === 0) {
      setError('لا توجد صفحات ممسوحة');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Convert each page data URL to a file and upload
      const results = [];
      for (let i = 0; i < scannedPages.length; i++) {
        const pageDataUrl = scannedPages[i];
        const blob = await dataUrlToBlob(pageDataUrl);

        const pageTitle = scannedPages.length > 1 ? `${title} - صفحة ${i + 1}` : title;

        const fileName = `scan_${Date.now()}_page${i + 1}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        const result = await documentService.uploadDocument(
          file,
          pageTitle,
          description,
          category,
          [...tags, 'مسح ضوئي'].join(',')
        );
        results.push(result);
      }

      if (onSuccess) {
        onSuccess(results.length === 1 ? results[0] : results);
      }
      handleClose();
    } catch (err) {
      setError(err.message || 'خطأ في رفع المستند الممسوح');
      logger.error('Scan upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const dataUrlToBlob = async dataUrl => {
    const res = await fetch(dataUrl);
    return res.blob();
  };

  /* ─── Cleanup ─── */
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setScannedPages([]);
    setStep('camera');
    setFilters({ brightness: 100, contrast: 100, grayscale: 0, sharpen: false });
    setTitle('');
    setDescription('');
    setCategory('أخرى');
    setTags([]);
    setError(null);
    setZoom(1);
    if (onClose) onClose();
  };

  /* ─── Tag Helpers ─── */
  const handleAddTag = () => {
    if (tagInput.trim()) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = tagToRemove => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  /* ─── Filter style for preview image ─── */
  const previewFilterStyle = {
    filter: [
      `brightness(${filters.brightness}%)`,
      `contrast(${filters.contrast}%)`,
      filters.grayscale > 0 ? `grayscale(${filters.grayscale}%)` : '',
    ]
      .filter(Boolean)
      .join(' '),
  };

  /* ─── Render ─── */
  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh', maxHeight: '90vh' },
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <ScannerIcon sx={{ color: statusColors.primaryBlue }} />
            <Typography variant="h6">
              {step === 'camera' && 'مسح مستند'}
              {step === 'preview' && 'معاينة ومعالجة'}
              {step === 'details' && 'تفاصيل المستند'}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {scannedPages.length > 0 && (
              <Chip label={`${scannedPages.length} صفحة`} size="small" color="primary" />
            )}
            <IconButton onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {/* ════════════════ STEP 1: CAMERA ════════════════ */}
        {step === 'camera' && (
          <Box
            sx={{ position: 'relative', height: '100%', minHeight: 400, backgroundColor: '#000' }}
          >
            {cameraError ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: 400,
                  p: 3,
                  backgroundColor: surfaceColors.lightGray,
                }}
              >
                <CameraIcon sx={{ fontSize: 64, color: statusColors.error, mb: 2 }} />
                <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}>
                  {cameraError}
                </Alert>
                <Button variant="contained" onClick={startCamera}>
                  إعادة المحاولة
                </Button>
              </Box>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: 400,
                    objectFit: 'cover',
                    transform: `scale(${zoom})`,
                    transition: 'transform 0.3s',
                  }}
                />

                {/* Camera overlay guide */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: '8%',
                    left: '5%',
                    right: '5%',
                    bottom: '15%',
                    border: '2px dashed rgba(255,255,255,0.5)',
                    borderRadius: 2,
                    pointerEvents: 'none',
                  }}
                />

                {!cameraReady && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <CircularProgress sx={{ color: '#fff' }} />
                  </Box>
                )}

                {/* Camera controls */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 2,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                  }}
                >
                  <Tooltip title="تبديل الكاميرا">
                    <IconButton onClick={flipCamera} sx={{ color: '#fff' }}>
                      <FlipIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="تصغير">
                    <IconButton
                      onClick={() => setZoom(z => Math.max(1, z - 0.2))}
                      sx={{ color: '#fff' }}
                      disabled={zoom <= 1}
                    >
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>

                  {/* Capture Button */}
                  <IconButton
                    onClick={captureImage}
                    disabled={!cameraReady}
                    sx={{
                      width: 64,
                      height: 64,
                      backgroundColor: '#fff',
                      border: '3px solid',
                      borderColor: statusColors.primaryBlue,
                      '&:hover': { backgroundColor: '#e0e0e0' },
                      '&:disabled': { opacity: 0.5 },
                    }}
                  >
                    <SnapIcon sx={{ fontSize: 32, color: statusColors.primaryBlue }} />
                  </IconButton>

                  <Tooltip title="تكبير">
                    <IconButton
                      onClick={() => setZoom(z => Math.min(3, z + 0.2))}
                      sx={{ color: '#fff' }}
                      disabled={zoom >= 3}
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title="رفع صورة من الجهاز">
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ color: '#fff' }}
                    >
                      <ImageIcon />
                    </IconButton>
                  </Tooltip>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setCapturedImage(ev.target.result);
                          setStep('preview');
                          stopCamera();
                        };
                        reader.readAsDataURL(f);
                      }
                    }}
                  />
                </Box>
              </>
            )}
          </Box>
        )}

        {/* ════════════════ STEP 2: PREVIEW ════════════════ */}
        {step === 'preview' && capturedImage && (
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Preview Image */}
            <Box
              sx={{
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: 2,
                overflow: 'hidden',
                maxHeight: 350,
              }}
            >
              <img
                src={capturedImage}
                alt="Scanned document"
                style={{
                  maxWidth: '100%',
                  maxHeight: 350,
                  objectFit: 'contain',
                  ...previewFilterStyle,
                }}
              />
            </Box>

            {/* Filter Presets */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                تصفية سريعة
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                {FILTER_PRESETS.map(preset => (
                  <Chip
                    key={preset.id}
                    label={`${preset.icon} ${preset.label}`}
                    onClick={() => applyPreset(preset)}
                    color={activePreset === preset.id ? 'primary' : 'default'}
                    variant={activePreset === preset.id ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Stack>
            </Box>

            {/* Advanced Filters */}
            <Box>
              <Button
                size="small"
                startIcon={<FiltersIcon />}
                onClick={() => setShowFilters(prev => !prev)}
                sx={{ mb: 1 }}
              >
                {showFilters ? 'إخفاء التعديلات المتقدمة' : 'تعديلات متقدمة'}
              </Button>

              {showFilters && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      السطوع: {filters.brightness}%
                    </Typography>
                    <Slider
                      value={filters.brightness}
                      onChange={(_, v) => {
                        setFilters(f => ({ ...f, brightness: v }));
                        setActivePreset('custom');
                      }}
                      min={50}
                      max={200}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      التباين: {filters.contrast}%
                    </Typography>
                    <Slider
                      value={filters.contrast}
                      onChange={(_, v) => {
                        setFilters(f => ({ ...f, contrast: v }));
                        setActivePreset('custom');
                      }}
                      min={50}
                      max={200}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      تدرج رمادي: {filters.grayscale}%
                    </Typography>
                    <Slider
                      value={filters.grayscale}
                      onChange={(_, v) => {
                        setFilters(f => ({ ...f, grayscale: v }));
                        setActivePreset('custom');
                      }}
                      min={0}
                      max={100}
                      size="small"
                    />
                  </Box>

                  <Button
                    size="small"
                    variant={filters.sharpen ? 'contained' : 'outlined'}
                    startIcon={<EnhanceIcon />}
                    onClick={() => {
                      setFilters(f => ({ ...f, sharpen: !f.sharpen }));
                      setActivePreset('custom');
                    }}
                  >
                    {filters.sharpen ? 'حِدّة مُفعّلة' : 'تفعيل الحِدّة'}
                  </Button>
                </Paper>
              )}
            </Box>

            {/* Previously scanned pages */}
            {scannedPages.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  الصفحات الممسوحة ({scannedPages.length})
                </Typography>
                <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                  {scannedPages.map((page, idx) => (
                    <Box key={idx} sx={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={page}
                        alt={`صفحة ${idx + 1}`}
                        style={{
                          width: 60,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 4,
                          border: '1px solid #ccc',
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => removePage(idx)}
                        sx={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          backgroundColor: '#fff',
                          boxShadow: 1,
                          width: 20,
                          height: 20,
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 12 }} />
                      </IconButton>
                      <Typography
                        variant="caption"
                        sx={{ display: 'block', textAlign: 'center', mt: 0.5 }}
                      >
                        {idx + 1}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Box>
        )}

        {/* ════════════════ STEP 3: DETAILS ════════════════ */}
        {step === 'details' && (
          <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Pages preview strip */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                الصفحات الممسوحة ({scannedPages.length})
              </Typography>
              <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1 }}>
                {scannedPages.map((page, idx) => (
                  <Box key={idx} sx={{ flexShrink: 0 }}>
                    <img
                      src={page}
                      alt={`صفحة ${idx + 1}`}
                      style={{
                        width: 50,
                        height: 65,
                        objectFit: 'cover',
                        borderRadius: 4,
                        border: '1px solid #ccc',
                      }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'center' }}>
                      {idx + 1}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            <Divider />

            <TextField
              label="العنوان"
              fullWidth
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="أدخل عنوان المستند الممسوح"
              required
            />

            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="أدخل وصفاً للمستند"
            />

            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select value={category} onChange={e => setCategory(e.target.value)} label="الفئة">
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Tags */}
            <Box>
              <TextField
                label="أضف وسم"
                fullWidth
                size="small"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                <Chip label="مسح ضوئي" size="small" color="info" variant="outlined" />
                {tags.map((tag, idx) => (
                  <Chip key={idx} label={tag} size="small" onDelete={() => handleRemoveTag(tag)} />
                ))}
              </Box>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
          </Box>
        )}

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === 'camera' && <Button onClick={handleClose}>إلغاء</Button>}

        {step === 'preview' && (
          <>
            <Button onClick={retake} startIcon={<RetakeIcon />}>
              إعادة التقاط
            </Button>
            <Button onClick={addPage} variant="outlined" startIcon={<CameraIcon />}>
              إضافة صفحة أخرى
            </Button>
            <Button onClick={proceedToDetails} variant="contained" startIcon={<UploadIcon />}>
              متابعة ({scannedPages.length + 1} صفحة)
            </Button>
          </>
        )}

        {step === 'details' && (
          <>
            <Button onClick={() => setStep('camera')} startIcon={<CameraIcon />}>
              مسح المزيد
            </Button>
            <Button
              onClick={handleUpload}
              variant="contained"
              disabled={!title || uploading || scannedPages.length === 0}
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {uploading ? 'جاري الرفع...' : `رفع ${scannedPages.length} صفحة`}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default DocumentScanner;
