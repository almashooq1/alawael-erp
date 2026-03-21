/**
 * Document Upload Component
 * مكون تحميل المستندات
 */

import { useState, useRef } from 'react';

import { statusColors, surfaceColors } from '../../theme/palette';
import documentService from 'services/documentService';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const DocumentUploader = ({ onSuccess, onClose }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('أخرى');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const categories = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];

  const handleFileSelect = event => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // التحقق من الحجم
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('حجم الملف كبير جداً. الحد الأقصى 50 MB');
        return;
      }

      // التحقق من نوع الملف — accept both MIME and extension
      const allowedTypes = [
        // PDF
        'application/pdf',
        // Microsoft Office (modern)
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        // Microsoft Office (legacy)
        'application/msword',
        'application/vnd.ms-excel',
        'application/vnd.ms-powerpoint',
        // Microsoft Office (macro-enabled)
        'application/vnd.ms-word.document.macroEnabled.12',
        'application/vnd.ms-excel.sheet.macroEnabled.12',
        'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
        // OpenDocument
        'application/vnd.oasis.opendocument.text',
        'application/vnd.oasis.opendocument.spreadsheet',
        'application/vnd.oasis.opendocument.presentation',
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/bmp',
        'image/webp',
        'image/tiff',
        'image/svg+xml',
        // Text & Data
        'text/plain',
        'text/csv',
        'text/html',
        'text/xml',
        'application/xml',
        'application/json',
        'application/rtf',
        'text/rtf',
        // Archives
        'application/zip',
        'application/x-zip-compressed',
        'application/x-rar-compressed',
        'application/vnd.rar',
        'application/x-7z-compressed',
        'application/gzip',
        'application/x-tar',
        // Audio
        'audio/mpeg',
        'audio/wav',
        'audio/ogg',
        // Video
        'video/mp4',
        'video/webm',
        'video/ogg',
      ];

      const allowedExts = [
        '.pdf',
        '.doc',
        '.docx',
        '.docm',
        '.xls',
        '.xlsx',
        '.xlsm',
        '.ppt',
        '.pptx',
        '.pptm',
        '.odt',
        '.ods',
        '.odp',
        '.txt',
        '.csv',
        '.rtf',
        '.html',
        '.htm',
        '.xml',
        '.json',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.bmp',
        '.webp',
        '.tiff',
        '.tif',
        '.svg',
        '.zip',
        '.rar',
        '.7z',
        '.gz',
        '.tar',
        '.mp3',
        '.wav',
        '.ogg',
        '.mp4',
        '.webm',
        '.ogv',
      ];

      const ext = ('.' + selectedFile.name.split('.').pop()).toLowerCase();
      if (!allowedTypes.includes(selectedFile.type) && !allowedExts.includes(ext)) {
        setError(`نوع الملف غير مدعوم (${ext}). الأنواع المقبولة: مستندات، صور، أرشيف، صوت، فيديو`);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = tagToRemove => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!file || !title) {
      setError('الملف والعنوان مطلوبان');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate incremental progress while upload is in progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 400);

      const result = await documentService.uploadDocument(
        file,
        title,
        description,
        category,
        tags.join(',')
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }
        if (onClose) {
          onClose();
        }
      }, 600);
    } catch (err) {
      setError(err.message || 'خطأ في رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  /* ─── Drag & Drop Handlers ─── */
  const handleDragOver = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = e => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Reuse same validation logic
      const fakeEvent = { target: { files: [droppedFile] } };
      handleFileSelect(fakeEvent);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">تحميل مستند جديد</Typography>
          <Button onClick={onClose} size="small" variant="text">
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* منطقة التحميل */}
          <Card
            variant="outlined"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              p: 3,
              textAlign: 'center',
              border: `2px dashed ${dragOver ? statusColors.success : statusColors.primaryBlue}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.3s',
              backgroundColor: dragOver ? surfaceColors.successLight : 'transparent',
              '&:hover': {
                backgroundColor: surfaceColors.lightGray,
              },
            }}
            onClick={() => fileInputRef.current.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: statusColors.primaryBlue, mb: 1 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              انقر لاختيار ملف أو اسحبه هنا
            </Typography>
            <Typography variant="caption" color="textSecondary">
              الحد الأقصى 50 MB — PDF, Word, Excel, PowerPoint, صور, CSV, أرشيف, صوت, فيديو
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.docm,.xls,.xlsx,.xlsm,.ppt,.pptx,.pptm,.odt,.ods,.odp,.txt,.csv,.rtf,.html,.htm,.xml,.json,.jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.tif,.svg,.zip,.rar,.7z,.gz,.tar,.mp3,.wav,.ogg,.mp4,.webm,.ogv"
              aria-label="رفع ملف"
            />
          </Card>

          {/* الملف المختار */}
          {file && (
            <Box
              sx={{
                p: 2,
                backgroundColor: surfaceColors.lightGray,
                borderRadius: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {documentService.formatFileSize(file.size)}
                </Typography>
              </div>
              <Button size="small" onClick={() => setFile(null)}>
                <CloseIcon />
              </Button>
            </Box>
          )}

          {/* الحقول */}
          <TextField
            label="العنوان"
            fullWidth
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="أدخل عنوان المستند"
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

          {/* الوسوم */}
          <Box>
            <TextField
              label="أضف وسم"
              fullWidth
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              size="small"
            />
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {tags.map((tag, index) => (
                <Chip key={index} label={tag} onDelete={() => handleRemoveTag(tag)} />
              ))}
            </Box>
          </Box>

          {/* شريط التقدم */}
          {uploading && (
            <Box>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                جاري التحميل... {uploadProgress}%
              </Typography>
            </Box>
          )}

          {/* الأخطاء */}
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={uploading}>
          إلغاء
        </Button>
        <Button
          onClick={handleUpload}
          variant="contained"
          disabled={!file || !title || uploading}
          startIcon={uploading && <CircularProgress size={20} />}
        >
          {uploading ? 'جاري التحميل...' : 'تحميل'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentUploader;
