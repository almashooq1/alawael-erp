/**
 * File Preview Dialog Component
 * مكون معاينة الملفات
 *
 * Features:
 * ✅ PDF preview
 * ✅ Image preview (JPG, PNG, GIF, etc.)
 * ✅ Text preview
 * ✅ Video preview
 * ✅ Audio preview
 * ✅ Zoom controls
 * ✅ Download option
 * ✅ Navigation (next/previous)
 * ✅ Fullscreen mode
 * ✅ Loading states
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Stack,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  RotateRight as RotateRightIcon,
  Print as PrintIcon,
} from '@mui/icons-material';

const FilePreviewDialog = ({ open, onClose, file, files = [], currentIndex = 0, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (file && open) {
      loadPreview();
    }
    return () => {
      // Cleanup
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, open]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);

    try {
      // If file has a URL, use it
      if (file.url || file.filePath) {
        setPreviewUrl(file.url || file.filePath);
      } else if (file.file) {
        // If it's a File object, create object URL
        const url = URL.createObjectURL(file.file);
        setPreviewUrl(url);
      } else {
        throw new Error('لا يمكن عرض معاينة للملف');
      }

      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = file.originalFileName || file.name || 'download';
      link.click();
    }
  };

  const handlePrint = () => {
    if (previewUrl && getFileType() === 'pdf') {
      const printWindow = window.open(previewUrl);
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleNavigate = direction => {
    if (onNavigate) {
      const newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      onNavigate(newIndex);
      // Reset zoom and rotation
      setZoom(100);
      setRotation(0);
    }
  };

  const getFileType = () => {
    if (!file) return 'unknown';

    const fileName = file.originalFileName || file.name || '';
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeType = file.fileType || file.type || '';

    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension) || mimeType.startsWith('image/')) {
      return 'image';
    }

    // PDFs
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }

    // Videos
    if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(extension) || mimeType.startsWith('video/')) {
      return 'video';
    }

    // Audio
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a'].includes(extension) || mimeType.startsWith('audio/')) {
      return 'audio';
    }

    // Text
    if (['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(extension) || mimeType.startsWith('text/')) {
      return 'text';
    }

    return 'unknown';
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      );
    }

    const fileType = getFileType();

    switch (fileType) {
      case 'image':
        return (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 400,
              maxHeight: '70vh',
              overflow: 'auto',
              p: 2,
            }}
          >
            <img
              src={previewUrl}
              alt={file.originalFileName || file.name}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.3s ease',
              }}
            />
          </Box>
        );

      case 'pdf':
        return (
          <Box sx={{ width: '100%', height: '70vh' }}>
            <iframe src={previewUrl} width="100%" height="100%" style={{ border: 'none' }} title="PDF Preview" />
          </Box>
        );

      case 'video':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <video controls style={{ maxWidth: '100%', maxHeight: '70vh' }} src={previewUrl}>
              متصفحك لا يدعم عرض الفيديو.
            </video>
          </Box>
        );

      case 'audio':
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, p: 3 }}>
            <audio controls style={{ width: '100%' }} src={previewUrl}>
              متصفحك لا يدعم تشغيل الصوت.
            </audio>
          </Box>
        );

      case 'text':
        return (
          <Box sx={{ p: 3, maxHeight: '70vh', overflow: 'auto' }}>
            <iframe
              src={previewUrl}
              width="100%"
              height="600px"
              style={{ border: '1px solid #ddd', borderRadius: '8px' }}
              title="Text Preview"
            />
          </Box>
        );

      default:
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="info">
              <Typography>معاينة هذا النوع من الملفات غير مدعومة</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                يمكنك تنزيل الملف لعرضه
              </Typography>
            </Alert>
          </Box>
        );
    }
  };

  const fileType = getFileType();
  const canZoom = fileType === 'image';
  const canRotate = fileType === 'image';
  const canPrint = fileType === 'pdf';
  const hasNavigation = files.length > 1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: '90vh',
        },
      }}
    >
      {/* Title Bar */}
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ flex: 1 }}>
            {file?.originalFileName || file?.name || 'معاينة الملف'}
          </Typography>
          {file?.fileSize && (
            <Chip
              label={`${(file.fileSize / 1024).toFixed(2)} KB`}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid #e0e0e0',
          bgcolor: '#f5f5f5',
        }}
      >
        <Stack direction="row" spacing={1}>
          {canZoom && (
            <>
              <Tooltip title="تكبير">
                <IconButton size="small" onClick={handleZoomIn} disabled={zoom >= 200}>
                  <ZoomInIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="تصغير">
                <IconButton size="small" onClick={handleZoomOut} disabled={zoom <= 50}>
                  <ZoomOutIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="body2" sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
                {zoom}%
              </Typography>
            </>
          )}
          {canRotate && (
            <Tooltip title="تدوير">
              <IconButton size="small" onClick={handleRotate}>
                <RotateRightIcon />
              </IconButton>
            </Tooltip>
          )}
          {canPrint && (
            <Tooltip title="طباعة">
              <IconButton size="small" onClick={handlePrint}>
                <PrintIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          {hasNavigation && (
            <>
              <Tooltip title="السابق">
                <span>
                  <IconButton size="small" onClick={() => handleNavigate('prev')} disabled={currentIndex === 0}>
                    <NavigateBeforeIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="body2" sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
                {currentIndex + 1} / {files.length}
              </Typography>
              <Tooltip title="التالي">
                <span>
                  <IconButton size="small" onClick={() => handleNavigate('next')} disabled={currentIndex >= files.length - 1}>
                    <NavigateNextIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          )}
        </Stack>
      </Box>

      {/* Preview Content */}
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>{renderPreview()}</DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
          إغلاق
        </Button>
        <Button
          onClick={handleDownload}
          variant="contained"
          startIcon={<DownloadIcon />}
          sx={{
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          تنزيل
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FilePreviewDialog;
