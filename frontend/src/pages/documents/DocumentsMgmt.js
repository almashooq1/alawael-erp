/**
 * Documents Management Page - إدارة المستندات المتقدمة
 * صفحة شاملة لإدارة المستندات مع لوحة معلومات وتحليلات
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  TablePagination,
  LinearProgress,
  Avatar,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Search as SearchIcon,
  Folder as FolderIcon,
  Description as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  TableChart as ExcelIcon,
  TextSnippet as TextIcon,
  Slideshow as PptxIcon,
  Archive as ZipIcon,
  InsertDriveFile as OtherFileIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Share as ShareIcon,
  Category as CategoryIcon,
  Assessment as AnalyticsIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  PeopleAlt as SharedIcon,
  HourglassEmpty as PendingIcon,
  FolderOpen as FolderOpenIcon,
  Scanner as ScannerIcon,
  AudioFile as AudioFileIcon,
  VideoLibrary as VideoFileIcon,
  DataObject as DataIcon,
} from '@mui/icons-material';
import documentService from 'services/documentService';
import DocumentUploader from 'components/documents/DocumentUploader';
import DocumentScanner from 'components/documents/DocumentScanner';
import logger from 'utils/logger';
import { gradients, brandColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ──── helpers ──── */
const formatFileSize = bytes => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = type => {
  const t = (type || '').toLowerCase();
  // PDF
  if (t === 'pdf') return <PdfIcon sx={{ color: '#E53E3E' }} />;
  // Word
  if (['doc', 'docx', 'docm', 'odt', 'rtf'].includes(t))
    return <FileIcon sx={{ color: '#3182CE' }} />;
  // Excel / Spreadsheets
  if (['xls', 'xlsx', 'xlsm', 'ods', 'csv'].includes(t))
    return <ExcelIcon sx={{ color: '#38A169' }} />;
  // PowerPoint
  if (['ppt', 'pptx', 'pptm', 'odp'].includes(t)) return <PptxIcon sx={{ color: '#DD6B20' }} />;
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif', 'svg', 'ico'].includes(t))
    return <ImageIcon sx={{ color: '#D69E2E' }} />;
  // Audio
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(t))
    return <AudioFileIcon sx={{ color: '#805AD5' }} />;
  // Video
  if (['mp4', 'webm', 'ogv', 'avi', 'mkv', 'mov'].includes(t))
    return <VideoFileIcon sx={{ color: '#DD6B20' }} />;
  // Archives
  if (['zip', 'rar', '7z', 'gz', 'tar'].includes(t)) return <ZipIcon sx={{ color: '#805AD5' }} />;
  // Text
  if (t === 'txt') return <TextIcon sx={{ color: '#718096' }} />;
  // Code / Data
  if (['json', 'xml', 'html', 'htm'].includes(t)) return <DataIcon sx={{ color: '#319795' }} />;
  // Default
  return <OtherFileIcon sx={{ color: '#A0AEC0' }} />;
};

const formatDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const STATUS_COLORS = {
  نشط: 'success',
  مؤرشف: 'warning',
  محذوف: 'error',
  'قيد المراجعة': 'info',
};

const CATEGORY_COLORS = {
  تقارير: '#FF9800',
  عقود: '#2196F3',
  سياسات: '#F44336',
  تدريب: '#9C27B0',
  مالي: '#4CAF50',
  شهادات: '#E91E63',
  مراسلات: '#00BCD4',
  أخرى: '#607D8B',
};

/* ──── Stats Card ──── */
const StatCard = ({ icon, label, value, color, gradient }) => (
  <Card
    sx={{
      background: gradient || `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
      border: `1px solid ${color}33`,
      borderRadius: 3,
      height: '100%',
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ bgcolor: color + '22', color, width: 44, height: 44 }}>{icon}</Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {label}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color }}>
            {value}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

/* ──── Main Component ──── */
const DocumentsMgmt = () => {
  const showSnackbar = useSnackbar();

  // State
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [_categories, setCategories] = useState([]);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [_showFilters, _setShowFilters] = useState(false);

  // Share dialog
  const [shareDialog, setShareDialog] = useState({ open: false, doc: null });
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');

  // Preview dialog
  const [previewDialog, setPreviewDialog] = useState({ open: false, doc: null });
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const previewBlobUrlRef = useRef(null);

  // Secure preview: fetch via Authorization header → blob URL (no token in query string)
  useEffect(() => {
    if (!previewDialog.open || !previewDialog.doc) {
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
        setPreviewBlobUrl(null);
      }
      return;
    }
    let cancelled = false;
    const fetchPreview = async () => {
      try {
        const url = documentService.getPreviewUrl(previewDialog.doc._id);
        const token = localStorage.getItem('token');
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) throw new Error('Preview fetch failed');
        const blob = await resp.blob();
        if (!cancelled) {
          const blobUrl = URL.createObjectURL(blob);
          previewBlobUrlRef.current = blobUrl;
          setPreviewBlobUrl(blobUrl);
        }
      } catch (err) {
        logger.error('Preview fetch error:', err);
      }
    };
    fetchPreview();
    return () => {
      cancelled = true;
      // Revoke blob URL on cleanup using ref to avoid stale closure
      if (previewBlobUrlRef.current) {
        URL.revokeObjectURL(previewBlobUrlRef.current);
        previewBlobUrlRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewDialog.open, previewDialog.doc?._id]);

  // Delete confirmation dialog
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, doc: null });

  // Version dialog
  const [versionDialog, setVersionDialog] = useState({ open: false, doc: null, versions: [] });

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState({ open: false, doc: null });

  const searchTimerRef = useRef(null);
  const searchQueryRef = useRef('');

  /* ──── Data Loading ──── */
  const loadDashboard = useCallback(async () => {
    try {
      const result = await documentService.getDashboard();
      const data = result?.data || result;
      setDashboard(data);
      // Extract categories from dashboard to avoid a duplicate API call
      setCategories(data?.categories || []);
    } catch (err) {
      logger.error('Dashboard load error:', err);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const result = await documentService.getAnalytics();
      setAnalytics(result?.data || result);
    } catch (err) {
      logger.error('Analytics load error:', err);
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        search: searchQueryRef.current,
        category: selectedCategory,
        status: selectedStatus,
        sortBy,
        page: page + 1,
        limit: rowsPerPage,
      };
      const result = await documentService.getAllDocuments(params);
      setDocuments(result.documents || []);
      setTotalDocuments(result.total || result.documents?.length || 0);
    } catch (err) {
      logger.error('Documents load error:', err);
      showSnackbar('خطأ في تحميل المستندات', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedStatus, sortBy, page, rowsPerPage, showSnackbar]);

  useEffect(() => {
    loadDashboard();
    loadAnalytics();
    loadDocuments();
  }, [loadDashboard, loadAnalytics, loadDocuments]);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  /* ──── Handlers ──── */
  const handleSearchChange = e => {
    const val = e.target.value;
    setSearchQuery(val);
    searchQueryRef.current = val;
    // Debounced reload
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (page === 0) {
        // page is already 0, setPage(0) is a no-op — call directly
        loadDocuments();
      } else {
        setPage(0); // triggers useEffect → loadDocuments via dependency
      }
    }, 400);
  };

  const handleUploadSuccess = () => {
    setUploaderOpen(false);
    showSnackbar('تم تحميل المستند بنجاح', 'success');
    loadDocuments();
    loadDashboard();
  };

  const handleDelete = async doc => {
    // If called directly from the confirm dialog (doc is already set)
    try {
      await documentService.deleteDocument(doc._id);
      showSnackbar('تم حذف المستند', 'success');
      setDeleteConfirm({ open: false, doc: null });
      loadDocuments();
      loadDashboard();
    } catch (_e) {
      showSnackbar('خطأ في حذف المستند', 'error');
    }
  };

  const handleDeleteClick = doc => {
    setDeleteConfirm({ open: true, doc });
  };

  const handlePreview = doc => {
    setPreviewDialog({ open: true, doc });
  };

  const handleRestore = async doc => {
    try {
      await documentService.restoreDocument(doc._id);
      showSnackbar('تم استرجاع المستند', 'success');
      loadDocuments();
      loadDashboard();
    } catch (_e) {
      showSnackbar('خطأ في استرجاع المستند', 'error');
    }
  };

  const handleDownload = async doc => {
    try {
      await documentService.downloadDocument(doc._id, doc.originalFileName || doc.title);
      showSnackbar('جاري التنزيل...', 'info');
    } catch (_e) {
      showSnackbar('خطأ في التنزيل', 'error');
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      showSnackbar('البريد الإلكتروني مطلوب', 'warning');
      return;
    }
    try {
      await documentService.shareDocument(shareDialog.doc._id, shareEmail, sharePermission);
      showSnackbar('تم مشاركة المستند بنجاح', 'success');
      setShareDialog({ open: false, doc: null });
      setShareEmail('');
      loadDocuments();
    } catch (_e) {
      showSnackbar('خطأ في المشاركة', 'error');
    }
  };

  const handleViewVersions = async doc => {
    try {
      const data = await documentService.getVersions(doc._id);
      setVersionDialog({
        open: true,
        doc,
        versions: data.versions || [],
      });
    } catch (_e) {
      showSnackbar('خطأ في جلب النسخ', 'error');
    }
  };

  const refreshAll = () => {
    loadDashboard();
    loadAnalytics();
    loadDocuments();
  };

  const stats = dashboard?.stats || {};

  /* ──── RENDER ──── */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ═══ Header ═══ */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: gradients.primary,
          color: 'white',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
              إدارة المستندات المتقدمة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              نظام شامل لتنظيم وإدارة ومشاركة المستندات
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="تحديث">
              <IconButton sx={{ color: 'white' }} onClick={refreshAll}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<UploadIcon />}
              onClick={() => setUploaderOpen(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              تحميل مستند
            </Button>
            <Button
              variant="contained"
              startIcon={<ScannerIcon />}
              onClick={() => setScannerOpen(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
                borderRadius: 2,
              }}
            >
              مسح ضوئي
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ═══ Stats Cards ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<FileIcon />}
            label="إجمالي المستندات"
            value={stats.totalDocuments ?? '—'}
            color={brandColors?.primary || '#667eea'}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<StorageIcon />}
            label="حجم التخزين"
            value={formatFileSize(stats.totalSize || 0)}
            color="#38A169"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<SharedIcon />}
            label="مستندات مشتركة"
            value={stats.sharedDocuments ?? '—'}
            color="#D69E2E"
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            icon={<PendingIcon />}
            label="بانتظار الموافقة"
            value={stats.pendingApproval ?? '—'}
            color="#E53E3E"
          />
        </Grid>
      </Grid>

      {/* ═══ Tabs ═══ */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            '& .MuiTab-root': { minHeight: 56, fontWeight: 600 },
          }}
        >
          <Tab icon={<FolderIcon />} label="جميع المستندات" iconPosition="start" />
          <Tab icon={<CategoryIcon />} label="حسب الفئة" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="النشاط الأخير" iconPosition="start" />
        </Tabs>

        {/* ═══ TAB 0: All Documents ═══ */}
        {activeTab === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Filters Row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="بحث في المستندات..."
                size="small"
                value={searchQuery}
                onChange={handleSearchChange}
                sx={{ minWidth: 250 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={e => {
                    setSelectedCategory(e.target.value);
                    setPage(0);
                  }}
                  label="الفئة"
                >
                  <MenuItem value="">الكل</MenuItem>
                  {['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'].map(
                    c => (
                      <MenuItem key={c} value={c}>
                        {c}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={e => {
                    setSelectedStatus(e.target.value);
                    setPage(0);
                  }}
                  label="الحالة"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="نشط">نشط</MenuItem>
                  <MenuItem value="مؤرشف">مؤرشف</MenuItem>
                  <MenuItem value="قيد المراجعة">قيد المراجعة</MenuItem>
                  <MenuItem value="محذوف">محذوف</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الترتيب</InputLabel>
                <Select value={sortBy} onChange={e => setSortBy(e.target.value)} label="الترتيب">
                  <MenuItem value="-createdAt">الأحدث أولاً</MenuItem>
                  <MenuItem value="createdAt">الأقدم أولاً</MenuItem>
                  <MenuItem value="title">الاسم (أ-ي)</MenuItem>
                  <MenuItem value="-title">الاسم (ي-أ)</MenuItem>
                  <MenuItem value="-fileSize">الأكبر حجماً</MenuItem>
                  <MenuItem value="-downloadCount">الأكثر تنزيلاً</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Documents Table */}
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }} color="text.secondary">
                  جاري التحميل...
                </Typography>
              </Box>
            ) : documents.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <FolderOpenIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  لا توجد مستندات
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  onClick={() => setUploaderOpen(true)}
                  sx={{ mt: 2 }}
                >
                  تحميل أول مستند
                </Button>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'grey.50' }}>
                        <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>العنوان</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحجم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الإصدار</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التنزيلات</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          الإجراءات
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {documents.map(doc => (
                        <TableRow
                          key={doc._id || doc.id}
                          hover
                          sx={{
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <TableCell>{getFileIcon(doc.fileType)}</TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {doc.title}
                              </Typography>
                              {doc.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  noWrap
                                  sx={{ maxWidth: 200, display: 'block' }}
                                >
                                  {doc.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={doc.category || 'أخرى'}
                              size="small"
                              sx={{
                                bgcolor: (CATEGORY_COLORS[doc.category] || '#607D8B') + '22',
                                color: CATEGORY_COLORS[doc.category] || '#607D8B',
                                fontWeight: 600,
                                fontSize: '0.7rem',
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {formatFileSize(doc.fileSize)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`v${doc.version || 1}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={doc.status || 'نشط'}
                              size="small"
                              color={STATUS_COLORS[doc.status] || 'default'}
                              sx={{ fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{formatDate(doc.createdAt)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">{doc.downloadCount || 0}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.3, justifyContent: 'center' }}>
                              <Tooltip title="معاينة">
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() => handlePreview(doc)}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="عرض التفاصيل">
                                <IconButton
                                  size="small"
                                  onClick={() => setDetailDialog({ open: true, doc })}
                                >
                                  <FileIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="تنزيل">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="مشاركة">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => setShareDialog({ open: true, doc })}
                                >
                                  <ShareIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="النسخ">
                                <IconButton
                                  size="small"
                                  color="secondary"
                                  onClick={() => handleViewVersions(doc)}
                                >
                                  <HistoryIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {doc.status === 'محذوف' ? (
                                <Tooltip title="استرجاع">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleRestore(doc)}
                                  >
                                    <RestoreIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteClick(doc)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={totalDocuments}
                  page={page}
                  onPageChange={(_e, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[10, 15, 25, 50]}
                  labelRowsPerPage="عدد الصفوف:"
                  labelDisplayedRows={({ from, to }) => `${from}–${to}`}
                />
              </>
            )}
          </Box>
        )}

        {/* ═══ TAB 1: By Category ═══ */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              تصنيف المستندات حسب الفئة
            </Typography>
            <Grid container spacing={2}>
              {(dashboard?.categoryBreakdown || []).map(cat => (
                <Grid item xs={6} sm={4} md={3} key={cat.id || cat.name}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      borderRadius: 3,
                      border: selectedCategory === cat.id ? '2px solid' : '1px solid',
                      borderColor:
                        selectedCategory === cat.id ? cat.color || brandColors?.primary : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                    }}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setActiveTab(0);
                      setPage(0);
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                      <Avatar
                        sx={{
                          bgcolor: (cat.color || '#607D8B') + '22',
                          color: cat.color || '#607D8B',
                          mx: 'auto',
                          mb: 1,
                          width: 48,
                          height: 48,
                        }}
                      >
                        <FolderIcon />
                      </Avatar>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {cat.name || cat.id}
                      </Typography>
                      <Chip
                        label={`${cat.count || 0} مستند`}
                        size="small"
                        sx={{ bgcolor: (cat.color || '#607D8B') + '22', fontWeight: 600 }}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ═══ TAB 2: Analytics ═══ */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
              تحليلات المستندات
            </Typography>

            {analytics ? (
              <Grid container spacing={3}>
                {/* Overview Cards */}
                <Grid item xs={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <FileIcon sx={{ fontSize: 36, color: '#667eea', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {analytics.overview?.totalDocuments || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي المستندات
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <DownloadIcon sx={{ fontSize: 36, color: '#38A169', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {analytics.overview?.totalDownloads || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي التنزيلات
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <ViewIcon sx={{ fontSize: 36, color: '#D69E2E', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {analytics.overview?.totalViews || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      إجمالي المشاهدات
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <StorageIcon sx={{ fontSize: 36, color: '#805AD5', mb: 1 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                      {analytics.overview?.storageUsage || '0 B'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      حجم التخزين
                    </Typography>
                  </Card>
                </Grid>

                {/* Category Distribution */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      التوزيع حسب الفئة
                    </Typography>
                    {(analytics.documentsByCategory || []).map(cat => (
                      <Box key={cat.category} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {cat.category}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {cat.count} ({cat.percentage}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={parseFloat(cat.percentage) || 0}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: (CATEGORY_COLORS[cat.category] || '#607D8B') + '22',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: CATEGORY_COLORS[cat.category] || '#607D8B',
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                    ))}
                  </Card>
                </Grid>

                {/* Most Downloaded */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      الأكثر تنزيلاً
                    </Typography>
                    {(analytics.mostDownloaded || []).map((doc, i) => (
                      <Box
                        key={doc._id || i}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          py: 1,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              bgcolor: '#667eea22',
                              color: '#667eea',
                              fontSize: 14,
                            }}
                          >
                            {i + 1}
                          </Avatar>
                          <Typography variant="body2">{doc.title}</Typography>
                        </Box>
                        <Chip
                          label={`${doc.downloadCount || 0} تنزيل`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </Box>
                    ))}
                    {(!analytics.mostDownloaded || analytics.mostDownloaded.length === 0) && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: 'center', py: 3 }}
                      >
                        لا تتوفر بيانات
                      </Typography>
                    )}
                  </Card>
                </Grid>

                {/* Status Distribution */}
                <Grid item xs={12}>
                  <Card sx={{ p: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      التوزيع حسب الحالة
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      {Object.entries(analytics.documentsByStatus || {}).map(([status, count]) => (
                        <Chip
                          key={status}
                          label={`${status}: ${count}`}
                          color={STATUS_COLORS[status] || 'default'}
                          sx={{ fontWeight: 600, px: 1 }}
                        />
                      ))}
                    </Box>
                  </Card>
                </Grid>
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        )}

        {/* ═══ TAB 3: Recent Activity ═══ */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              النشاط الأخير
            </Typography>
            {(dashboard?.recentActivities || []).length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>الإجراء</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>المستند</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>بواسطة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>التفاصيل</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dashboard.recentActivities || []).map((act, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Chip
                            label={act.action}
                            size="small"
                            color={
                              act.action === 'تحميل'
                                ? 'success'
                                : act.action === 'تنزيل'
                                  ? 'info'
                                  : act.action === 'حذف'
                                    ? 'error'
                                    : act.action === 'مشاركة'
                                      ? 'warning'
                                      : 'default'
                            }
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{act.documentTitle}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{act.performedByName || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{formatDate(act.performedAt)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {act.details || '—'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <HistoryIcon sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                <Typography color="text.secondary">لا يوجد نشاط حتى الآن</Typography>
              </Box>
            )}
          </Box>
        )}
      </Paper>

      {/* ═══ DIALOGS ═══ */}

      {/* Upload Dialog */}
      {uploaderOpen && (
        <DocumentUploader onSuccess={handleUploadSuccess} onClose={() => setUploaderOpen(false)} />
      )}

      {/* Scanner Dialog */}
      <DocumentScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onSuccess={() => {
          setScannerOpen(false);
          refreshAll();
          showSnackbar('تم رفع المستند الممسوح بنجاح', 'success');
        }}
      />

      {/* Share Dialog */}
      <Dialog
        open={shareDialog.open}
        onClose={() => setShareDialog({ open: false, doc: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>مشاركة: {shareDialog.doc?.title}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            value={shareEmail}
            onChange={e => setShareEmail(e.target.value)}
            placeholder="user@example.com"
            sx={{ mb: 2, mt: 1 }}
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>الصلاحية</InputLabel>
            <Select
              value={sharePermission}
              onChange={e => setSharePermission(e.target.value)}
              label="الصلاحية"
            >
              <MenuItem value="view">عرض فقط</MenuItem>
              <MenuItem value="edit">تعديل</MenuItem>
              <MenuItem value="download">تنزيل</MenuItem>
              <MenuItem value="share">مشاركة</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog({ open: false, doc: null })}>إلغاء</Button>
          <Button onClick={handleShare} variant="contained">
            مشاركة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, doc: null })}
        maxWidth="sm"
        fullWidth
      >
        {detailDialog.doc && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getFileIcon(detailDialog.doc.fileType)}
                <Typography variant="h6">{detailDialog.doc.title}</Typography>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الفئة
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {detailDialog.doc.category || 'أخرى'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الحجم
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatFileSize(detailDialog.doc.fileSize)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الحالة
                  </Typography>
                  <Typography variant="body2">
                    <Chip
                      label={detailDialog.doc.status || 'نشط'}
                      size="small"
                      color={STATUS_COLORS[detailDialog.doc.status] || 'default'}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    الإصدار
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    v{detailDialog.doc.version || 1}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    تاريخ الإنشاء
                  </Typography>
                  <Typography variant="body2">{formatDate(detailDialog.doc.createdAt)}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    رفع بواسطة
                  </Typography>
                  <Typography variant="body2">{detailDialog.doc.uploadedByName || '—'}</Typography>
                </Grid>
                {detailDialog.doc.description && (
                  <Grid item xs={12}>
                    <Typography variant="caption" color="text.secondary">
                      الوصف
                    </Typography>
                    <Typography variant="body2">{detailDialog.doc.description}</Typography>
                  </Grid>
                )}
                {detailDialog.doc.tags?.length > 0 && (
                  <Grid item xs={12}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      الوسوم
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {detailDialog.doc.tags.map((t, i) => (
                        <Chip key={i} label={t} size="small" variant="outlined" />
                      ))}
                    </Box>
                  </Grid>
                )}
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    مشاهدات
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {detailDialog.doc.viewCount || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    تنزيلات
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {detailDialog.doc.downloadCount || 0}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary">
                    مشتركون
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {detailDialog.doc.sharedWith?.length || 0}
                  </Typography>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => handleDownload(detailDialog.doc)} startIcon={<DownloadIcon />}>
                تنزيل
              </Button>
              <Button
                onClick={() => setShareDialog({ open: true, doc: detailDialog.doc })}
                startIcon={<ShareIcon />}
              >
                مشاركة
              </Button>
              <Button onClick={() => setDetailDialog({ open: false, doc: null })}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Versions Dialog */}
      <Dialog
        open={versionDialog.open}
        onClose={() => setVersionDialog({ open: false, doc: null, versions: [] })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>سجل الإصدارات: {versionDialog.doc?.title}</DialogTitle>
        <DialogContent>
          {versionDialog.versions.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>الإصدار</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحجم</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versionDialog.versions.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Chip
                          label={`v${v.versionNumber}`}
                          size="small"
                          color={v.isCurrent ? 'primary' : 'default'}
                          variant={v.isCurrent ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{formatDate(v.uploadedAt)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {v.fileSize ? formatFileSize(v.fileSize) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {v.changes || (v.isCurrent ? 'الإصدار الحالي' : '—')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              لا توجد إصدارات سابقة
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionDialog({ open: false, doc: null, versions: [] })}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog — عرض المستند */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, doc: null })}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '85vh' } }}
      >
        {previewDialog.doc && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getFileIcon(previewDialog.doc.fileType)}
                <Typography variant="h6" sx={{ flex: 1 }}>
                  {previewDialog.doc.title}
                </Typography>
                <Chip
                  label={previewDialog.doc.fileType?.toUpperCase() || 'ملف'}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', flex: 1 }}>
              {(() => {
                const ft = (previewDialog.doc.fileType || '').toLowerCase();

                // Show loading while blob is being fetched
                if (!previewBlobUrl) {
                  return (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CircularProgress />
                      <Typography sx={{ ml: 2 }}>جاري تحميل المعاينة...</Typography>
                    </Box>
                  );
                }

                // Images
                if (
                  [
                    'jpg',
                    'jpeg',
                    'png',
                    'gif',
                    'bmp',
                    'webp',
                    'svg',
                    'ico',
                    'tiff',
                    'tif',
                  ].includes(ft)
                ) {
                  return (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                        overflow: 'auto',
                      }}
                    >
                      <img
                        src={previewBlobUrl}
                        alt={previewDialog.doc.title}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: 8,
                        }}
                      />
                    </Box>
                  );
                }

                // PDF
                if (ft === 'pdf') {
                  return (
                    <iframe
                      src={previewBlobUrl}
                      title={previewDialog.doc.title}
                      style={{ width: '100%', flex: 1, border: 'none' }}
                    />
                  );
                }

                // Audio
                if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ft)) {
                  return (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 4,
                      }}
                    >
                      <Box sx={{ textAlign: 'center', width: '100%', maxWidth: 500 }}>
                        <AudioFileIcon sx={{ fontSize: 80, color: '#805AD5', mb: 2 }} />
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          {previewDialog.doc.title}
                        </Typography>
                        <audio controls style={{ width: '100%' }} src={previewBlobUrl}>
                          المتصفح لا يدعم تشغيل الصوت
                        </audio>
                      </Box>
                    </Box>
                  );
                }

                // Video
                if (['mp4', 'webm', 'ogv'].includes(ft)) {
                  return (
                    <Box
                      sx={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 2,
                      }}
                    >
                      <video
                        controls
                        style={{ maxWidth: '100%', maxHeight: '100%' }}
                        src={previewBlobUrl}
                      >
                        المتصفح لا يدعم تشغيل الفيديو
                      </video>
                    </Box>
                  );
                }

                // Text files
                if (['txt', 'csv', 'json', 'xml', 'html', 'htm', 'rtf'].includes(ft)) {
                  return (
                    <iframe
                      src={previewBlobUrl}
                      title={previewDialog.doc.title}
                      style={{ width: '100%', flex: 1, border: 'none' }}
                      sandbox=""
                    />
                  );
                }

                // Unsupported — show info card
                return (
                  <Box
                    sx={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      p: 4,
                    }}
                  >
                    <Box sx={{ textAlign: 'center' }}>
                      {getFileIcon(ft)}
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                        لا يمكن معاينة هذا النوع من الملفات
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        نوع الملف: {ft.toUpperCase()} — حجم:{' '}
                        {formatFileSize(previewDialog.doc.fileSize)}
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownload(previewDialog.doc)}
                      >
                        تنزيل الملف
                      </Button>
                    </Box>
                  </Box>
                );
              })()}
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => handleDownload(previewDialog.doc)}
                startIcon={<DownloadIcon />}
              >
                تنزيل
              </Button>
              <Button onClick={() => setPreviewDialog({ open: false, doc: null })}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirmation Dialog — تأكيد الحذف */}
      <Dialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, doc: null })}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>تأكيد حذف المستند</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف المستند <strong>&quot;{deleteConfirm.doc?.title}&quot;</strong>؟
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            يمكنك استرجاع المستند لاحقًا من قسم المستندات المحذوفة.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, doc: null })}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => handleDelete(deleteConfirm.doc)}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DocumentsMgmt;
