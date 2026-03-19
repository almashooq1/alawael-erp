/**
 * Documents Page
 * صفحة إدارة المستندات الرئيسية
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Search as SearchIcon, FolderOpen as FolderOpenIcon } from '@mui/icons-material';
import DocumentUploader from '../components/documents/DocumentUploader';
import DocumentList from '../components/documents/DocumentList';
import documentService from '../services/documentService';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const categories = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'أخرى'];

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = {
        search: searchQuery,
        category: selectedCategory,
        folder: selectedFolder,
      };
      const result = await documentService.getAllDocuments(filters);
      setDocuments(result.documents || []);
    } catch (err) {
      setError('خطأ في تحميل المستندات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await documentService.getStats();
      setStats(result);
    } catch (err) {
      console.error('خطأ في تحميل الإحصائيات:', err);
    }
  };

  const loadFolders = async () => {
    try {
      const result = await documentService.getFolders();
      setFolders(result);
    } catch (err) {
      console.error('خطأ في تحميل المجلدات:', err);
    }
  };

  // تحميل البيانات
  useEffect(() => {
    loadDocuments();
    loadStats();
    loadFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory, selectedFolder]);

  const handleUploadSuccess = result => {
    setSuccess('تم تحميل المستند بنجاح');
    setUploaderOpen(false);
    loadDocuments();
    loadStats();
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleShareClick = doc => {
    setSelectedDocForShare(doc);
    setShareDialogOpen(true);
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      setError('البريد الإلكتروني مطلوب');
      return;
    }

    try {
      await documentService.shareDocument(selectedDocForShare._id, shareEmail, sharePermission);
      setSuccess('تم مشاركة المستند بنجاح');
      setShareDialogOpen(false);
      setShareEmail('');
      setSharePermission('view');
      loadDocuments();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* الرأس */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
              📁 إدارة المستندات
            </Typography>
            <Typography variant="body2" color="textSecondary">
              قم بتنظيم وإدارة جميع مستنداتك في مكان واحد
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CloudUploadIcon />}
            onClick={() => setUploaderOpen(true)}
            size="large"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
            }}
          >
            تحميل مستند
          </Button>
        </Box>

        {/* الإحصائيات */}
        {stats && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    إجمالي المستندات
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {stats.totalDocuments || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <CardContent>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    إجمالي الحجم
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 1 }}>
                    {documentService.formatFileSize(stats.totalSize || 0)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* الأخطاء والنجاح */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* عوامل التصفية */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="ابحث عن مستند..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الفئة</InputLabel>
              <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} label="الفئة">
                <MenuItem value="">جميع الفئات</MenuItem>
                {categories.map(cat => (
                  <MenuItem key={cat} value={cat}>
                    {cat}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>المجلد</InputLabel>
              <Select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)} label="المجلد">
                <MenuItem value="">جميع المجلدات</MenuItem>
                <MenuItem value="root">الرئيسية</MenuItem>
                {folders.map(folder => (
                  <MenuItem key={folder._id} value={folder._id}>
                    {folder._id} ({folder.count})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button fullWidth variant="outlined" onClick={loadDocuments} size="small">
              تحديث
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* قائمة المستندات */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : documents.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            backgroundColor: '#f5f5f5',
            borderRadius: 2,
          }}
        >
          <FolderOpenIcon sx={{ fontSize: 64, color: '#999', mb: 2 }} />
          <Typography variant="h6" color="textSecondary" sx={{ mb: 1 }}>
            لا توجد مستندات
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            ابدأ بتحميل مستندك الأول
          </Typography>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setUploaderOpen(true)}>
            تحميل مستند
          </Button>
        </Box>
      ) : (
        <DocumentList documents={documents} onRefresh={loadDocuments} onShare={handleShareClick} />
      )}

      {/* مكون التحميل */}
      {uploaderOpen && <DocumentUploader onSuccess={handleUploadSuccess} onClose={() => setUploaderOpen(false)} />}

      {/* نافذة المشاركة */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>مشاركة المستند</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            value={shareEmail}
            onChange={e => setShareEmail(e.target.value)}
            placeholder="مثال: user@example.com"
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>الصلاحية</InputLabel>
            <Select value={sharePermission} onChange={e => setSharePermission(e.target.value)} label="الصلاحية">
              <MenuItem value="view">عرض فقط</MenuItem>
              <MenuItem value="edit">تعديل</MenuItem>
              <MenuItem value="download">تنزيل</MenuItem>
              <MenuItem value="share">مشاركة</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleShare} variant="contained">
            مشاركة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents;
