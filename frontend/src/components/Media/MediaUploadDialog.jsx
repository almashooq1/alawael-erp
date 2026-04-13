/**
 * MediaUploadDialog — حوار رفع الوسائط
 *
 * Drag-and-drop upload dialog with:
 *  - Drag zone
 *  - File browser
 *  - Upload progress tracking (per-file)
 *  - Category / album / tags input
 *  - Bulk upload (max 20 files)
 */

import React, { useState, useCallback, useRef } from 'react';



import { brandColors, statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import mediaService from '../../services/mediaService';

const MAX_FILES = 20;
const MAX_SIZE = 100 * 1024 * 1024; // 100 MB per file

const CATEGORIES = [
  'عام', 'صور المؤسسة', 'صور الفعاليات', 'صور الموظفين',
  'فيديوهات تعليمية', 'فيديوهات توعوية', 'تسجيلات صوتية',
  'مستندات رسمية', 'عروض تقديمية', 'تصاميم', 'شعارات', 'أخرى',
];

const TYPE_ICONS = {
  image: <ImageIcon />,
  video: <VideoIcon />,
  audio: <AudioIcon />,
  document: <DocIcon />,
  archive: <ArchiveIcon />,
  other: <FileIcon />,
};

function getFileType(file) {
  const mime = file.type || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('spreadsheet') || mime.includes('document') || mime.includes('text'))
    return 'document';
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar') || mime.includes('gzip') || mime.includes('7z'))
    return 'archive';
  return 'other';
}

function getFileTypeColor(type) {
  const colors = { image: '#2196f3', video: '#f44336', audio: '#ff9800', document: '#4caf50', archive: '#9c27b0', other: '#607d8b' };
  return colors[type] || colors.other;
}

export default function MediaUploadDialog({ open, onClose, onUploaded, albumId }) {
  const [files, setFiles] = useState([]);
  const [category, setCategory] = useState('عام');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]); // { name, status: 'success'|'error', message }
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  /* ── Drag handlers ──────────────────────────────────────────────────── */
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, []);

  const addFiles = (newFiles) => {
    setFiles(prev => {
      const combined = [...prev];
      for (const f of newFiles) {
        if (combined.length >= MAX_FILES) break;
        if (f.size > MAX_SIZE) continue;
        if (combined.some(ef => ef.name === f.name && ef.size === f.size)) continue;
        combined.push(f);
      }
      return combined;
    });
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  /* ── Upload ─────────────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);

    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await mediaService.upload(file, {
          category,
          album: albumId || undefined,
          tags: tags || undefined,
          onProgress: () => {},
        });
        uploadResults.push({ name: file.name, status: 'success', message: 'تم الرفع بنجاح' });
      } catch (err) {
        uploadResults.push({ name: file.name, status: 'error', message: err.message || 'خطأ في الرفع' });
      }
      setResults([...uploadResults]);
    }

    setUploading(false);

    // If all succeeded, auto-close after delay
    const allOk = uploadResults.every(r => r.status === 'success');
    if (allOk) {
      setTimeout(() => { handleClose(true); }, 1200);
    }
  };

  const handleClose = (uploaded = false) => {
    setFiles([]);
    setResults([]);
    setCategory('عام');
    setTags('');
    setDragOver(false);
    setUploading(false);
    if (uploaded && onUploaded) onUploaded();
    onClose();
  };

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <Dialog open={open} onClose={() => !uploading && handleClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon sx={{ color: brandColors.primary }} />
          <Typography variant="h6" fontWeight={700}>رفع ملفات</Typography>
        </Box>
        <IconButton onClick={() => !uploading && handleClose()} disabled={uploading}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Drag & Drop zone */}
        {results.length === 0 && (
          <>
            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? brandColors.primary : surfaceColors.border}`,
                borderRadius: 3,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: dragOver ? `${brandColors.primary}08` : surfaceColors.background,
                transition: 'all 0.2s',
                mb: 2,
                '&:hover': { borderColor: brandColors.primary, bgcolor: `${brandColors.primary}05` },
              }}
            >
              <UploadIcon sx={{ fontSize: 48, color: dragOver ? brandColors.primary : neutralColors.textSecondary, mb: 1 }} />
              <Typography variant="body1" fontWeight={600}>
                اسحب الملفات هنا أو انقر للاختيار
              </Typography>
              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                الحد الأقصى: {MAX_FILES} ملف، {MAX_SIZE / (1024 * 1024)} ميجابايت لكل ملف
              </Typography>
              <input
                ref={inputRef}
                type="file"
                hidden
                multiple
                accept={mediaService.getAcceptedTypes('all')}
                onChange={(e) => { addFiles(Array.from(e.target.files)); e.target.value = ''; }}
              />
            </Box>

            {/* File List */}
            {files.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {files.length} ملف ({mediaService.formatFileSize(totalSize)})
                  </Typography>
                  <Button size="small" color="error" onClick={() => setFiles([])}>مسح الكل</Button>
                </Box>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${surfaceColors.border}`, borderRadius: 2 }}>
                  {files.map((file, i) => {
                    const type = getFileType(file);
                    const color = getFileTypeColor(type);
                    return (
                      <Box
                        key={`${file.name}-${i}`}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
                          borderBottom: i < files.length - 1 ? `1px solid ${surfaceColors.border}` : 'none',
                        }}
                      >
                        <Avatar sx={{ width: 32, height: 32, bgcolor: `${color}15`, color }}>
                          {React.cloneElement(TYPE_ICONS[type] || TYPE_ICONS.other, { sx: { fontSize: 16 } })}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="caption" fontWeight={600} noWrap display="block">
                            {file.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: neutralColors.textSecondary, fontSize: '0.65rem' }}>
                            {mediaService.formatFileSize(file.size)}
                          </Typography>
                        </Box>
                        <IconButton size="small" onClick={() => removeFile(i)} disabled={uploading}>
                          <RemoveIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* Options */}
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>التصنيف</InputLabel>
                <Select value={category} label="التصنيف" onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="الوسوم (مفصولة بفاصلة)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="صورة, فعالية"
                sx={{ flex: 1, minWidth: 180 }}
              />
            </Box>
          </>
        )}

        {/* Upload Results */}
        {results.length > 0 && (
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>نتائج الرفع</Typography>
            {results.map((r, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1, py: 1,
                  borderBottom: i < results.length - 1 ? `1px solid ${surfaceColors.border}` : 'none',
                }}
              >
                {r.status === 'success'
                  ? <SuccessIcon sx={{ color: statusColors.success, fontSize: 20 }} />
                  : <ErrorIcon sx={{ color: statusColors.error, fontSize: 20 }} />}
                <Typography variant="body2" sx={{ flex: 1 }} noWrap>{r.name}</Typography>
                <Chip
                  size="small"
                  label={r.message}
                  sx={{
                    bgcolor: r.status === 'success' ? `${statusColors.success}15` : `${statusColors.error}15`,
                    color: r.status === 'success' ? statusColors.success : statusColors.error,
                  }}
                />
              </Box>
            ))}
            {uploading && (
              <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={() => handleClose(results.some(r => r.status === 'success'))} disabled={uploading}>
          {results.length > 0 ? 'إغلاق' : 'إلغاء'}
        </Button>
        {results.length === 0 && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            startIcon={uploading ? null : <UploadIcon />}
            sx={{ borderRadius: 2 }}
          >
            {uploading ? 'جاري الرفع...' : `رفع ${files.length} ملف`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
