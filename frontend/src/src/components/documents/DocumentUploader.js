/**
 * Document Upload Component
 * مكون تحميل المستندات
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  LinearProgress,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Close as CloseIcon } from '@mui/icons-material';
import documentService from '../services/documentService';

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

  const categories = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'أخرى'];

  const handleFileSelect = event => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      // التحقق من الحجم
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError('حجم الملف كبير جداً. الحد الأقصى 50 MB');
        return;
      }

      // التحقق من نوع الملف
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'text/plain',
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('نوع الملف غير مدعوم');
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

    try {
      const result = await documentService.uploadDocument(file, title, description, category, tags.join(','));

      setUploadProgress(100);
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(result);
        }
        if (onClose) {
          onClose();
        }
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
            sx={{
              p: 3,
              textAlign: 'center',
              border: '2px dashed #1976d2',
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.3s',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            }}
            onClick={() => fileInputRef.current.click()}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: '#1976d2', mb: 1 }} />
            <Typography variant="body1" sx={{ mb: 1 }}>
              انقر لاختيار ملف أو اسحبه هنا
            </Typography>
            <Typography variant="caption" color="textSecondary">
              الحد الأقصى 50 MB - PDF, Word, Excel, صور
            </Typography>
            <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} />
          </Card>

          {/* الملف المختار */}
          {file && (
            <Box
              sx={{
                p: 2,
                backgroundColor: '#f5f5f5',
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
          <TextField label="العنوان" fullWidth value={title} onChange={e => setTitle(e.target.value)} placeholder="أدخل عنوان المستند" />

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
              onKeyPress={e => e.key === 'Enter' && handleAddTag()}
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
