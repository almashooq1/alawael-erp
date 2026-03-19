/**
 * Drag and Drop Upload Component
 * مكون رفع الملفات بالسحب والإفلات
 *
 * Features:
 * ✅ Drag and drop interface
 * ✅ Click to browse
 * ✅ Multiple file upload
 * ✅ File type validation
 * ✅ File size validation
 * ✅ Upload progress
 * ✅ Preview thumbnails
 * ✅ Remove files before upload
 * ✅ Batch upload
 * ✅ Beautiful animations
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Button,
  LinearProgress,
  Chip,
  Stack,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Tooltip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Description as DocIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
} from '@mui/icons-material';

const DragDropUpload = ({
  onUpload,
  maxFiles = 10,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['*/*'],
  multiple = true,
  title = 'اسحب الملفات هنا أو انقر للتصفح',
  subtitle = 'يدعم جميع أنواع الملفات',
}) => {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const getFileIcon = file => {
    const type = file.type;
    if (type.startsWith('image/')) return <ImageIcon />;
    if (type === 'application/pdf') return <PdfIcon />;
    if (type.startsWith('video/')) return <VideoIcon />;
    if (type.startsWith('audio/')) return <AudioIcon />;
    if (type.includes('document') || type.includes('word')) return <DocIcon />;
    return <FileIcon />;
  };

  const validateFile = file => {
    const errors = [];

    // Check file size
    if (file.size > maxFileSize) {
      errors.push(`الملف ${file.name} أكبر من الحد المسموح (${(maxFileSize / 1024 / 1024).toFixed(2)} MB)`);
    }

    // Check file type if specified
    if (acceptedTypes.length > 0 && !acceptedTypes.includes('*/*')) {
      const fileType = file.type;
      const fileExtension = `.${file.name.split('.').pop()}`;
      const isAccepted = acceptedTypes.some(
        type => type === fileType || type === fileExtension || (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/'))),
      );

      if (!isAccepted) {
        errors.push(`نوع الملف ${file.name} غير مدعوم`);
      }
    }

    return errors;
  };

  const handleFiles = newFiles => {
    const fileArray = Array.from(newFiles);
    const validationErrors = [];

    // Check max files limit
    if (files.length + fileArray.length > maxFiles) {
      validationErrors.push(`لا يمكن رفع أكثر من ${maxFiles} ملف`);
      setErrors(validationErrors);
      return;
    }

    // Validate each file
    fileArray.forEach(file => {
      const fileErrors = validateFile(file);
      if (fileErrors.length > 0) {
        validationErrors.push(...fileErrors);
      }
    });

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Add files with preview URLs
    const filesWithPreviews = fileArray.map(file => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      status: 'pending', // pending, uploading, success, error
    }));

    setFiles(prev => [...prev, ...filesWithPreviews]);
    setErrors([]);
  };

  const handleDrag = useCallback(e => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    e => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files],
  );

  const handleChange = e => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveFile = fileId => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });

    // Remove from upload progress
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const updatedFiles = [...files];

    try {
      for (let i = 0; i < updatedFiles.length; i++) {
        const fileItem = updatedFiles[i];
        if (fileItem.status !== 'pending') continue;

        // Update status to uploading
        fileItem.status = 'uploading';
        setFiles([...updatedFiles]);

        try {
          // Simulate upload progress
          for (let progress = 0; progress <= 100; progress += 10) {
            setUploadProgress(prev => ({ ...prev, [fileItem.id]: progress }));
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Call onUpload callback
          if (onUpload) {
            await onUpload(fileItem.file);
          }

          fileItem.status = 'success';
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 100 }));
        } catch (error) {
          fileItem.status = 'error';
          fileItem.error = error.message || 'فشل الرفع';
        }

        setFiles([...updatedFiles]);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClearAll = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setFiles([]);
    setUploadProgress({});
    setErrors([]);
  };

  const formatFileSize = bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const pendingFiles = files.filter(f => f.status === 'pending').length;
  const successFiles = files.filter(f => f.status === 'success').length;
  const errorFiles = files.filter(f => f.status === 'error').length;

  return (
    <Box>
      {/* Drop Zone */}
      <Paper
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        sx={{
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: dragActive ? 'primary.main' : 'grey.300',
          bgcolor: dragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.3s ease',
          borderRadius: 2,
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover',
          },
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
          style={{ display: 'none' }}
        />

        <CloudUploadIcon
          sx={{
            fontSize: 64,
            color: dragActive ? 'primary.main' : 'grey.400',
            mb: 2,
            transition: 'all 0.3s ease',
          }}
        />

        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          {subtitle}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          الحد الأقصى: {maxFiles} ملف، {(maxFileSize / 1024 / 1024).toFixed(0)} MB لكل ملف
        </Typography>
      </Paper>

      {/* Errors */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((error, index) => (
            <Alert key={index} severity="error" sx={{ mb: 1 }}>
              {error}
            </Alert>
          ))}
        </Box>
      )}

      {/* File List */}
      {files.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">الملفات المحددة ({files.length})</Typography>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={handleClearAll} disabled={uploading}>
                مسح الكل
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleUpload}
                disabled={uploading || pendingFiles === 0}
                startIcon={<CloudUploadIcon />}
                sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
              >
                رفع {pendingFiles > 0 ? `(${pendingFiles})` : ''}
              </Button>
            </Stack>
          </Box>

          {/* Statistics */}
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Chip label={`قيد الانتظار: ${pendingFiles}`} size="small" color="default" variant="outlined" />
            {successFiles > 0 && <Chip label={`نجح: ${successFiles}`} size="small" color="success" variant="outlined" />}
            {errorFiles > 0 && <Chip label={`فشل: ${errorFiles}`} size="small" color="error" variant="outlined" />}
          </Stack>

          {/* Files Grid */}
          <Grid container spacing={2}>
            {files.map(fileItem => (
              <Grid item xs={12} sm={6} md={4} key={fileItem.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s',
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ flex: 1, pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Box sx={{ color: 'primary.main', fontSize: 40 }}>{getFileIcon(fileItem.file)}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Tooltip title={fileItem.name}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {fileItem.name}
                          </Typography>
                        </Tooltip>
                        <Typography variant="caption" color="textSecondary">
                          {formatFileSize(fileItem.size)}
                        </Typography>
                      </Box>
                      <Box>
                        {fileItem.status === 'success' && <CheckCircleIcon color="success" fontSize="small" />}
                        {fileItem.status === 'error' && <ErrorIcon color="error" fontSize="small" />}
                      </Box>
                    </Box>

                    {/* Preview Image */}
                    {fileItem.preview && (
                      <Box
                        component="img"
                        src={fileItem.preview}
                        alt={fileItem.name}
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover',
                          borderRadius: 1,
                          mb: 1,
                        }}
                      />
                    )}

                    {/* Upload Progress */}
                    {fileItem.status === 'uploading' && uploadProgress[fileItem.id] !== undefined && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress[fileItem.id]} sx={{ mb: 0.5 }} />
                        <Typography variant="caption" color="textSecondary">
                          {uploadProgress[fileItem.id]}%
                        </Typography>
                      </Box>
                    )}

                    {/* Error Message */}
                    {fileItem.status === 'error' && fileItem.error && (
                      <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                        <Typography variant="caption">{fileItem.error}</Typography>
                      </Alert>
                    )}
                  </CardContent>

                  <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveFile(fileItem.id)}
                        disabled={uploading && fileItem.status === 'uploading'}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default DragDropUpload;
