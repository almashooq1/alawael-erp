import { useState, useEffect, useCallback, useRef } from 'react';

import { therapistService } from 'services/therapistService';
import documentService from 'services/documentService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ScannerIcon from '@mui/icons-material/Scanner';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

const TherapistDocuments = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const showSnackbar = useSnackbar();
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadPatient, setUploadPatient] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('تقارير');
  const [uploadTags, setUploadTags] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, doc: null });
  const uploadFileInputRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await therapistService.getTherapistDocuments(userId);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.error('Error loading documents:', error);
      showSnackbar('حدث خطأ في تحميل المستندات', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, showSnackbar]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Helper to categorize file types for filtering
  const getFileCategory = t => {
    const lower = (t || '').toLowerCase();
    if (lower === 'pdf') return 'pdf';
    if (
      ['image', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg', 'ico'].includes(
        lower
      )
    )
      return 'image';
    if (['audio', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(lower)) return 'audio';
    if (['video', 'mp4', 'webm', 'ogv', 'avi', 'mkv', 'mov'].includes(lower)) return 'video';
    return 'other';
  };

  const filteredDocuments = documents.filter(
    doc =>
      (filterType === 'all' || getFileCategory(doc.type || doc.fileType) === filterType) &&
      ((doc.name || doc.title || '').includes(searchText) ||
        (doc.patientName || '').includes(searchText))
  );

  const getDocumentIcon = type => {
    const t = (type || '').toLowerCase();
    // PDF
    if (t === 'pdf') return <PictureAsPdfIcon sx={{ color: statusColors.error }} />;
    // Images
    if (['image', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg'].includes(t))
      return <ImageIcon sx={{ color: statusColors.success }} />;
    // Audio
    if (['audio', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(t))
      return <AudioFileIcon sx={{ color: statusColors.info }} />;
    // Video
    if (['video', 'mp4', 'webm', 'ogv', 'avi', 'mkv', 'mov'].includes(t))
      return <VideoLibraryIcon sx={{ color: statusColors.warning }} />;
    // Word / Spreadsheet / Presentation
    if (
      [
        'doc',
        'docx',
        'docm',
        'odt',
        'rtf',
        'xls',
        'xlsx',
        'xlsm',
        'ods',
        'csv',
        'ppt',
        'pptx',
        'pptm',
        'odp',
        'txt',
        'json',
        'xml',
        'html',
        'htm',
      ].includes(t)
    )
      return <DescriptionIcon sx={{ color: statusColors.info }} />;
    // Archives
    if (['zip', 'rar', '7z', 'gz', 'tar'].includes(t))
      return <DescriptionIcon sx={{ color: neutralColors.textMuted }} />;
    // Default
    return <DescriptionIcon sx={{ color: neutralColors.textMuted }} />;
  };

  const getTypeColor = type => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') return 'error';
    if (['image', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(t)) return 'success';
    if (['audio', 'mp3', 'wav', 'ogg'].includes(t)) return 'primary';
    if (['video', 'mp4', 'webm', 'ogv'].includes(t)) return 'warning';
    if (['doc', 'docx', 'odt', 'rtf'].includes(t)) return 'info';
    if (['xls', 'xlsx', 'ods', 'csv'].includes(t)) return 'success';
    if (['ppt', 'pptx', 'odp'].includes(t)) return 'warning';
    if (['zip', 'rar', '7z'].includes(t)) return 'secondary';
    return 'default';
  };

  /* ─── Action Handlers ─── */
  const handleView = async doc => {
    const docId = doc._id || doc.id;
    if (!docId) {
      showSnackbar('لا يمكن عرض هذا المستند', 'warning');
      return;
    }
    try {
      const url = documentService.getPreviewUrl(docId);
      const token = localStorage.getItem('token');
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) throw new Error('Preview fetch failed');
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      // Revoke after 60s to prevent memory leak (new tab has loaded by then)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      logger.error('Preview error:', err);
      showSnackbar('خطأ في عرض المستند', 'error');
    }
  };

  const handleDownload = async doc => {
    const docId = doc._id || doc.id;
    const fileName = doc.originalFileName || doc.name || doc.title || 'document';
    try {
      await documentService.downloadDocument(docId, fileName);
      showSnackbar('تم تنزيل المستند بنجاح', 'success');
    } catch (error) {
      logger.error('Download error:', error);
      showSnackbar('خطأ في تنزيل المستند', 'error');
    }
  };

  const handleDeleteClick = doc => {
    setDeleteConfirm({ open: true, doc });
  };

  const handleDeleteConfirm = async () => {
    const doc = deleteConfirm.doc;
    if (!doc) return;
    const docId = doc._id || doc.id;
    setDeleteConfirm({ open: false, doc: null });
    try {
      await documentService.deleteDocument(docId);
      showSnackbar('تم حذف المستند بنجاح', 'success');
      loadDocuments();
    } catch (error) {
      logger.error('Delete error:', error);
      showSnackbar('خطأ في حذف المستند', 'error');
    }
  };

  /* ─── Upload Handlers ─── */
  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadPatient('');
    setUploadDescription('');
    setUploadCategory('تقارير');
    setUploadTags('');
    setUploadProgress(0);
  };

  const handleCloseUpload = () => {
    setOpenUploadDialog(false);
    resetUploadForm();
  };

  const handleFileChange = file => {
    if (!file) return;
    // Block dangerous file types
    const blockedExts = [
      'exe',
      'bat',
      'cmd',
      'msi',
      'dll',
      'scr',
      'ps1',
      'vbs',
      'wsf',
      'com',
      'pif',
      'reg',
      'inf',
      'hta',
      'cpl',
      'js',
      'jse',
      'vbe',
      'wsh',
    ];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (blockedExts.includes(ext)) {
      showSnackbar('نوع الملف غير مسموح به لأسباب أمنية', 'error');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      showSnackbar('حجم الملف كبير جداً. الحد الأقصى 50 MB', 'error');
      return;
    }
    setUploadFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

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
    if (droppedFile) handleFileChange(droppedFile);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle) {
      showSnackbar('الملف والعنوان مطلوبان', 'warning');
      return;
    }
    setUploading(true);
    setUploadProgress(10);
    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 15, 90));
      }, 300);

      await documentService.uploadDocument(
        uploadFile,
        uploadTitle,
        uploadDescription + (uploadPatient ? ` | المريض: ${uploadPatient}` : ''),
        uploadCategory,
        uploadTags
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      showSnackbar('تم رفع الملف بنجاح', 'success');
      setTimeout(() => {
        handleCloseUpload();
        loadDocuments();
      }, 500);
    } catch (error) {
      logger.error('Upload error:', error);
      showSnackbar('خطأ في رفع الملف: ' + (error.message || ''), 'error');
    } finally {
      setUploading(false);
    }
  };

  /* ─── Computed stats ─── */
  const totalSize = documents.reduce((sum, d) => sum + (Number(d.fileSize) || 0), 0);
  const formattedSize =
    totalSize > 1024 * 1024
      ? (totalSize / (1024 * 1024)).toFixed(1) + ' MB'
      : totalSize > 1024
        ? (totalSize / 1024).toFixed(1) + ' KB'
        : totalSize + ' B';

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography>جاري تحميل المستندات...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DescriptionIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              مستندات المعالج
            </Typography>
            <Typography variant="body2">إدارة وأرشفة مستندات العلاج والتقارير</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        {/* الإحصائيات */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي المستندات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.info }}>
                  {documents.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  ملفات PDF
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.error }}>
                  {documents.filter(d => getFileCategory(d.type || d.fileType) === 'pdf').length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  صور وفيديوهات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.success }}>
                  {
                    documents.filter(d => {
                      const cat = getFileCategory(d.type || d.fileType);
                      return cat === 'image' || cat === 'video';
                    }).length
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي الحجم
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.warning }}>
                  {formattedSize}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* البحث والفلترة */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="ابحث عن ملف..."
            variant="outlined"
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { key: 'all', label: 'الكل' },
              { key: 'pdf', label: 'PDF' },
              { key: 'image', label: 'صور' },
              { key: 'audio', label: 'صوت' },
              { key: 'video', label: 'فيديو' },
            ].map(({ key, label }) => (
              <Chip
                key={key}
                label={label}
                onClick={() => setFilterType(key)}
                variant={filterType === key ? 'filled' : 'outlined'}
                color={filterType === key ? 'primary' : 'default'}
              />
            ))}
          </Box>

          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setOpenUploadDialog(true)}
          >
            رفع ملف
          </Button>
          <Button
            variant="outlined"
            startIcon={<ScannerIcon />}
            onClick={() => setScannerOpen(true)}
          >
            مسح ضوئي
          </Button>
        </Box>
      </Box>

      {/* قائمة المستندات */}
      <Grid container spacing={2}>
        {filteredDocuments.map(doc => (
          <Grid item xs={12} sm={6} md={4} key={doc._id || doc.id}>
            <Card
              sx={{
                borderRadius: 2,
                boxShadow: 3,
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'start', gap: 2, mb: 2 }}>
                  <Box sx={{ fontSize: '2rem' }}>{getDocumentIcon(doc.type || doc.fileType)}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      {doc.name || doc.title}
                    </Typography>
                    {doc.patientName && (
                      <Typography
                        variant="caption"
                        sx={{ color: neutralColors.textMuted, display: 'block', mb: 0.5 }}
                      >
                        المريض: {doc.patientName}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      sx={{ color: neutralColors.textMuted, display: 'block', mb: 0.5 }}
                    >
                      {doc.date ||
                        (doc.createdAt && new Date(doc.createdAt).toLocaleDateString('ar-SA'))}
                    </Typography>
                    <Chip
                      label={doc.type || doc.fileType || 'مستند'}
                      size="small"
                      color={getTypeColor(doc.type || doc.fileType)}
                      variant="outlined"
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                </Box>

                <Box sx={{ pb: 1, mb: 2, borderBottom: `1px solid ${surfaceColors.borderSubtle}` }}>
                  <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                    الحجم: {doc.size || documentService.formatFileSize(doc.fileSize || 0)}
                    {doc.access ? ` • الوصول: ${doc.access}` : ''}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={() => handleView(doc)}
                  >
                    عرض
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(doc)}
                  >
                    تحميل
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDeleteClick(doc)}
                  >
                    حذف
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filteredDocuments.length === 0 && !loading && (
        <Card sx={{ borderRadius: 2, textAlign: 'center', py: 6 }}>
          <FolderOpenIcon sx={{ fontSize: 60, color: neutralColors.placeholder, mb: 2 }} />
          <Typography color="textSecondary" variant="h6">
            {searchText || filterType !== 'all' ? 'لا توجد نتائج مطابقة' : 'لا توجد مستندات'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {searchText || filterType !== 'all' ? 'جرب تغيير معايير البحث' : 'ابدأ برفع أول مستند'}
          </Typography>
        </Card>
      )}

      {/* Dialog رفع ملف */}
      <Dialog open={openUploadDialog} onClose={handleCloseUpload} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>رفع ملف جديد</DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Paper
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => uploadFileInputRef.current?.click()}
              sx={{
                border: `2px dashed ${dragOver ? statusColors.info : surfaceColors.borderLight}`,
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backgroundColor: dragOver ? surfaceColors.infoLight : 'transparent',
                '&:hover': {
                  borderColor: statusColors.info,
                  backgroundColor: surfaceColors.infoLight,
                },
              }}
            >
              <CloudUploadIcon sx={{ fontSize: '3rem', color: statusColors.info, mb: 1 }} />
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {uploadFile ? uploadFile.name : 'اسحب الملف هنا أو انقر لاختيار'}
              </Typography>
              {uploadFile && (
                <Typography variant="caption" color="textSecondary">
                  {documentService.formatFileSize(uploadFile.size)}
                </Typography>
              )}
              <input
                ref={uploadFileInputRef}
                type="file"
                hidden
                onChange={e => handleFileChange(e.target.files?.[0])}
              />
            </Paper>

            <TextField
              label="اسم الملف"
              fullWidth
              variant="outlined"
              size="small"
              value={uploadTitle}
              onChange={e => setUploadTitle(e.target.value)}
              required
            />

            <TextField
              label="المريض المرتبط"
              fullWidth
              variant="outlined"
              size="small"
              value={uploadPatient}
              onChange={e => setUploadPatient(e.target.value)}
            />

            <FormControl fullWidth size="small">
              <InputLabel>الفئة</InputLabel>
              <Select
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value)}
                label="الفئة"
              >
                {['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'].map(
                  cat => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  )
                )}
              </Select>
            </FormControl>

            <TextField
              label="الوصف"
              fullWidth
              variant="outlined"
              size="small"
              multiline
              rows={3}
              value={uploadDescription}
              onChange={e => setUploadDescription(e.target.value)}
            />

            <TextField
              label="الوسوم (مفصولة بفاصلة)"
              fullWidth
              variant="outlined"
              size="small"
              value={uploadTags}
              onChange={e => setUploadTags(e.target.value)}
              placeholder="مثال: تقرير, علاج, جلسة"
            />

            {uploading && (
              <Box>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{ borderRadius: 1 }}
                />
                <Typography
                  variant="caption"
                  sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}
                >
                  جاري الرفع... {uploadProgress}%
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseUpload} disabled={uploading}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!uploadFile || !uploadTitle || uploading}
            startIcon={uploading ? <CircularProgress size={18} /> : <CloudUploadIcon />}
          >
            {uploading ? 'جاري الرفع...' : 'رفع الملف'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* مكون المسح الضوئي */}
      <DocumentScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSuccess={() => {
          setScannerOpen(false);
          loadDocuments();
          showSnackbar('تم رفع المستند الممسوح بنجاح', 'success');
        }}
      />

      {/* ═══ Delete Confirmation Dialog ═══ */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, doc: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف المستند &quot;
            {deleteConfirm.doc?.name || deleteConfirm.doc?.title || ''}&quot;؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, doc: null })}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={handleDeleteConfirm}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistDocuments;
