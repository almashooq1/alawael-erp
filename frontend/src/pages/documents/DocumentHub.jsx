import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Pagination,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
} from '@mui/icons-material';
import documentHubApi from '../../services/documentHubApi';
import logger from '../../utils/logger';

const CATEGORIES = [
  'الكل',
  'تقارير',
  'عقود',
  'سياسات',
  'تدريب',
  'مالي',
  'شهادات',
  'مراسلات',
  'أخرى',
];

export default function DocumentHub() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('الكل');
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { page, limit: 15 };
      if (search.trim()) filters.search = search.trim();
      if (category !== 'الكل') filters.category = category;

      const res = await documentHubApi.getDocuments(filters);
      setDocuments(res.documents || []);
      setTotalPages(res.pages || 1);
    } catch (err) {
      logger.error('خطأ في جلب المستندات:', err);
      setError('فشل تحميل المستندات');
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFileUpload = async event => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      await documentHubApi.upload(file, {
        title: file.name,
        category: category !== 'الكل' ? category : 'أخرى',
      });
      fetchDocuments();
    } catch (err) {
      logger.error('خطأ في رفع الملف:', err);
      setError('فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async doc => {
    try {
      await documentHubApi.download(doc._id, doc.originalFileName || doc.fileName);
    } catch (err) {
      logger.error('خطأ في التنزيل:', err);
      setError('فشل تنزيل الملف');
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    try {
      await documentHubApi.delete(id);
      fetchDocuments();
    } catch (err) {
      logger.error('خطأ في الحذف:', err);
      setError('فشل حذف المستند');
    }
  };

  const formatSize = bytes => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        مركز المستندات
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          component="label"
          startIcon={<UploadIcon />}
          disabled={uploading}
        >
          رفع مستند
          <input type="file" hidden onChange={handleFileUpload} />
        </Button>

        <TextField
          label="بحث"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && setPage(1)}
          size="small"
        />

        <TextField
          select
          label="الفئة"
          value={category}
          onChange={e => setCategory(e.target.value)}
          size="small"
          sx={{ minWidth: 150 }}
        >
          {CATEGORIES.map(c => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </TextField>

        <Button variant="outlined" onClick={() => setPage(1)}>
          بحث
        </Button>
      </Box>

      {uploading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography>جاري الرفع...</Typography>
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell>الحجم</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا توجد مستندات
                </TableCell>
              </TableRow>
            ) : (
              documents.map(doc => (
                <TableRow key={doc._id}>
                  <TableCell>{doc.title || doc.originalFileName}</TableCell>
                  <TableCell>{doc.fileType}</TableCell>
                  <TableCell>{doc.category}</TableCell>
                  <TableCell>{formatSize(doc.fileSize)}</TableCell>
                  <TableCell>
                    <Chip
                      label={doc.status}
                      color={doc.status === 'نشط' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      href={documentHubApi.previewUrl(doc._id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ViewIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDownload(doc)}>
                      <DownloadIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(doc._id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, value) => setPage(value)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
}
