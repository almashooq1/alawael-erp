/**
 * Documents Page - صفحة إدارة المستندات الرئيسية
 * Enhanced with rich formatting, dashboard analytics, charts, drag-drop,
 * category visualization, storage breakdown, grid/list toggle, and modern UX
 * @updated 2026-03-13 — Major UI overhaul
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  alpha,
  useTheme,
} from '@mui/material';

import documentService from 'services/documentService';
import logger from 'utils/logger';
import { gradients, brandColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
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
  Divider,
  Fade,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SecurityIcon from '@mui/icons-material/Security';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import FolderIcon from '@mui/icons-material/Folder';
import ImageIcon from '@mui/icons-material/Image';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HomeIcon from '@mui/icons-material/Home';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScannerIcon from '@mui/icons-material/Scanner';
import StorageIcon from '@mui/icons-material/Storage';
import PendingIcon from '@mui/icons-material/Pending';
import DownloadIcon from '@mui/icons-material/Download';
import SpeedIcon from '@mui/icons-material/Speed';
import CategoryIcon from '@mui/icons-material/Category';
import SearchIcon from '@mui/icons-material/Search';
import GridViewIcon from '@mui/icons-material/GridView';
import ShareIcon from '@mui/icons-material/Share';
import { AudioIcon, ChartIcon, ExcelIcon, FileIcon, ListViewIcon, NewFolderIcon, PdfIcon, PptIcon, RecentIcon, SharedIcon, TextIcon, TrendIcon, VideoIcon, ViewIcon, ZipIcon } from 'utils/iconAliases';

/* ──── Constants ──── */
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

const CATEGORY_ICONS = {
  تقارير: <AnalyticsIcon />,
  عقود: <FileIcon />,
  سياسات: <SecurityIcon />,
  تدريب: <FilePresentIcon />,
  مالي: <ChartIcon />,
  شهادات: <CloudDoneIcon />,
  مراسلات: <SharedIcon />,
  أخرى: <FolderIcon />,
};

const FILE_TYPE_DATA = [
  { name: 'PDF', icon: <PdfIcon />, color: '#E53E3E', key: 'pdf' },
  { name: 'Word', icon: <FileIcon />, color: '#3182CE', key: 'doc' },
  { name: 'Excel', icon: <ExcelIcon />, color: '#38A169', key: 'xls' },
  { name: 'صور', icon: <ImageIcon />, color: '#D69E2E', key: 'img' },
  { name: 'PowerPoint', icon: <PptIcon />, color: '#DD6B20', key: 'ppt' },
  { name: 'فيديو', icon: <VideoIcon />, color: '#805AD5', key: 'video' },
  { name: 'صوت', icon: <AudioIcon />, color: '#D53F8C', key: 'audio' },
  { name: 'مضغوط', icon: <ZipIcon />, color: '#718096', key: 'zip' },
  { name: 'نصي', icon: <TextIcon />, color: '#4A5568', key: 'txt' },
];

const CHART_COLORS = [
  '#667eea',
  '#43e97b',
  '#f5576c',
  '#4facfe',
  '#fa709a',
  '#f5af19',
  '#38f9d7',
  '#805AD5',
  '#FF9800',
];

const MOCK_MONTHLY_TREND = [
  { month: 'يناير', uploads: 45, downloads: 120, shared: 15 },
  { month: 'فبراير', uploads: 62, downloads: 145, shared: 22 },
  { month: 'مارس', uploads: 78, downloads: 198, shared: 31 },
  { month: 'أبريل', uploads: 55, downloads: 167, shared: 18 },
  { month: 'مايو', uploads: 89, downloads: 210, shared: 42 },
  { month: 'يونيو', uploads: 71, downloads: 185, shared: 28 },
];

const MOCK_STORAGE_BREAKDOWN = [
  { name: 'PDF', value: 35, size: '2.1 GB', color: '#E53E3E' },
  { name: 'Word', value: 22, size: '890 MB', color: '#3182CE' },
  { name: 'Excel', value: 15, size: '560 MB', color: '#38A169' },
  { name: 'صور', value: 12, size: '1.8 GB', color: '#D69E2E' },
  { name: 'فيديو', value: 8, size: '3.2 GB', color: '#805AD5' },
  { name: 'أخرى', value: 8, size: '420 MB', color: '#718096' },
];

const MOCK_TOP_DOCS = [
  { title: 'سياسة الخصوصية 2026', downloads: 342, category: 'سياسات' },
  { title: 'التقرير المالي Q1', downloads: 289, category: 'مالي' },
  { title: 'عقد التوظيف النموذجي', downloads: 256, category: 'عقود' },
  { title: 'دليل الموظف الجديد', downloads: 198, category: 'تدريب' },
  { title: 'كشف الرواتب - فبراير', downloads: 187, category: 'مالي' },
];

/* ──── Helpers ──── */
const formatFileSize = bytes => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/* ──── Sub-Components ──── */

/** Animated Stat Card with gradient or bordered style */
const StatCard = ({ icon, label, value, gradient, color, trend, subtitle }) => {
  const theme = useTheme();
  return (
    <Card
      sx={{
        background:
          gradient ||
          `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.03)} 100%)`,
        color: gradient ? 'white' : 'inherit',
        borderRadius: 3,
        border: gradient ? 'none' : `1px solid ${alpha(color, 0.2)}`,
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: gradient
            ? `0 12px 28px ${alpha(color, 0.3)}`
            : `0 8px 24px ${alpha(color, 0.15)}`,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: gradient ? 'rgba(255,255,255,0.06)' : alpha(color, 0.04),
          transform: 'translate(20px, -20px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: gradient ? 'rgba(255,255,255,0.2)' : alpha(color, 0.12),
                color: gradient ? 'white' : color,
                width: 48,
                height: 48,
                boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
              }}
            >
              {icon}
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                sx={{ opacity: 0.75, display: 'block', fontSize: '0.7rem', fontWeight: 500 }}
              >
                {label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={<TrendIcon sx={{ fontSize: 14 }} />}
              label={trend}
              sx={{
                bgcolor: gradient ? 'rgba(255,255,255,0.15)' : alpha('#43A047', 0.1),
                color: gradient ? 'white' : '#43A047',
                fontWeight: 700,
                fontSize: '0.65rem',
                height: 22,
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

/** Category Card */
const CategoryCard = ({ name, count, totalDocs, isSelected, onClick }) => {
  const color = CATEGORY_COLORS[name] || '#607D8B';
  const icon = CATEGORY_ICONS[name] || <FolderIcon />;
  const pct = totalDocs > 0 ? ((count / totalDocs) * 100).toFixed(0) : 0;
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 3,
        border: isSelected ? `2px solid ${color}` : '1px solid',
        borderColor: isSelected ? color : 'divider',
        transition: 'all 0.3s',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': { boxShadow: 6, transform: 'translateY(-3px)' },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: color,
          opacity: isSelected ? 1 : 0.4,
        },
      }}
    >
      <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
        <Avatar
          sx={{
            bgcolor: alpha(color, 0.12),
            color,
            mx: 'auto',
            mb: 1.5,
            width: 52,
            height: 52,
            transition: 'transform 0.3s',
            ...(isSelected && { transform: 'scale(1.1)' }),
          }}
        >
          {icon}
        </Avatar>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {name}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, color, mb: 0.5 }}>
          {count}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(pct, 100)}
            sx={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              bgcolor: alpha(color, 0.1),
              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
            }}
          />
          <Typography variant="caption" sx={{ fontWeight: 600, color, minWidth: 30 }}>
            {pct}%
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

/** Drag & Drop Upload Zone */
const DropZone = ({ onOpenUploader }) => {
  const [dragOver, setDragOver] = useState(false);
  return (
    <Paper
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        onOpenUploader();
      }}
      onClick={onOpenUploader}
      sx={{
        p: 4,
        textAlign: 'center',
        cursor: 'pointer',
        borderRadius: 3,
        border: '2px dashed',
        borderColor: dragOver ? 'primary.main' : 'divider',
        bgcolor: dragOver ? alpha('#667eea', 0.04) : 'transparent',
        transition: 'all 0.3s',
        '&:hover': { borderColor: 'primary.main', bgcolor: alpha('#667eea', 0.02) },
      }}
    >
      <CloudUploadIcon
        sx={{
          fontSize: 56,
          color: dragOver ? 'primary.main' : 'text.disabled',
          mb: 1,
          transition: 'all 0.3s',
        }}
      />
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
        {dragOver ? 'أفلت الملفات هنا' : 'اسحب وأفلت الملفات هنا'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        أو اضغط لاختيار الملفات • يدعم PDF, Word, Excel, صور, فيديو وأكثر
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mt: 2, flexWrap: 'wrap' }}>
        {FILE_TYPE_DATA.slice(0, 6).map(ft => (
          <Chip
            key={ft.key}
            icon={ft.icon}
            label={ft.name}
            size="small"
            variant="outlined"
            sx={{
              borderColor: alpha(ft.color, 0.4),
              color: ft.color,
              '& .MuiChip-icon': { color: ft.color },
            }}
          />
        ))}
      </Box>
    </Paper>
  );
};

/** Tab Panel */
function TabPanel({ children, value, index }) {
  return value === index ? (
    <Fade in timeout={400}>
      <Box sx={{ py: 2 }}>{children}</Box>
    </Fade>
  ) : null;
}

/* ════════════════════════════════════════════════ */
/* ══ MAIN: Documents Page                       ══ */
/* ════════════════════════════════════════════════ */
const Documents = () => {
  const theme = useTheme();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedDocForShare, setSelectedDocForShare] = useState(null);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState('view');
  const [activeTab, setActiveTab] = useState(0);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  const showSnackbar = useSnackbar();
  const searchTimerRef = useRef(null);
  const searchQueryRef = useRef('');

  const categories = ['تقارير', 'عقود', 'سياسات', 'تدريب', 'مالي', 'شهادات', 'مراسلات', 'أخرى'];

  /* ──── Data Loaders ──── */
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        search: searchQueryRef.current,
        category: selectedCategory,
        folder: selectedFolder,
        limit: 500,
      };
      const result = await documentService.getAllDocuments(filters);
      setDocuments(result.documents || []);
    } catch (err) {
      showSnackbar('خطأ في تحميل المستندات', 'error');
      logger.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedFolder, showSnackbar]);

  const loadStats = useCallback(async () => {
    try {
      const result = await documentService.getStats();
      setStats(result);
    } catch (err) {
      logger.error('خطأ في تحميل الإحصائيات:', err);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const result = await documentService.getDashboard();
      setDashboard(result?.data || result);
    } catch (err) {
      logger.error('خطأ في تحميل لوحة المعلومات:', err);
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const result = await documentService.getFolders();
      setFolders(result);
    } catch (err) {
      logger.error('خطأ في تحميل المجلدات:', err);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    loadStats();
    loadDashboard();
    loadFolders();
  }, [loadDocuments, loadStats, loadDashboard, loadFolders]);

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  /* ──── Derived Stats ──── */
  const dashStats = dashboard?.stats || {};
  const totalDocs = stats?.totalDocuments ?? dashStats.totalDocuments ?? 0;
  const totalSize = stats?.totalSize || dashStats.totalSize || 0;

  const categoryStats = useMemo(() => {
    const counts = {};
    categories.forEach(c => {
      counts[c] = 0;
    });
    documents.forEach(d => {
      const cat = d.category || 'أخرى';
      if (counts[cat] !== undefined) counts[cat]++;
      else counts['أخرى']++;
    });
    return categories.map(c => ({ name: c, count: counts[c] }));
  }, [documents]);

  const fileTypeDistribution = useMemo(() => {
    const groups = {
      pdf: 0,
      doc: 0,
      xls: 0,
      img: 0,
      ppt: 0,
      video: 0,
      audio: 0,
      zip: 0,
      txt: 0,
      other: 0,
    };
    documents.forEach(d => {
      const t = (d.fileType || '').toLowerCase();
      if (t === 'pdf') groups.pdf++;
      else if (['doc', 'docx', 'odt', 'rtf'].includes(t)) groups.doc++;
      else if (['xls', 'xlsx', 'csv', 'ods'].includes(t)) groups.xls++;
      else if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'].includes(t))
        groups.img++;
      else if (['ppt', 'pptx', 'odp'].includes(t)) groups.ppt++;
      else if (['mp4', 'webm', 'avi', 'mkv', 'mov'].includes(t)) groups.video++;
      else if (['mp3', 'wav', 'ogg', 'm4a'].includes(t)) groups.audio++;
      else if (['zip', 'rar', '7z', 'gz', 'tar'].includes(t)) groups.zip++;
      else if (t === 'txt') groups.txt++;
      else groups.other++;
    });
    return FILE_TYPE_DATA.map(ft => ({ ...ft, count: groups[ft.key] || 0 })).filter(
      d => d.count > 0
    );
  }, [documents]);

  const storageQuota = useMemo(() => {
    const quota = 10 * 1024 * 1024 * 1024; // 10 GB mock
    const used = totalSize || 0;
    const pct = quota > 0 ? Math.min((used / quota) * 100, 100) : 0;
    return { used, quota, pct, usedStr: formatFileSize(used), quotaStr: formatFileSize(quota) };
  }, [totalSize]);

  /* ──── Handlers ──── */
  const handleSearchChange = e => {
    const val = e.target.value;
    setSearchQuery(val);
    searchQueryRef.current = val;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadDocuments(), 400);
  };

  const handleUploadSuccess = _result => {
    showSnackbar('تم تحميل المستند بنجاح', 'success');
    setUploaderOpen(false);
    loadDocuments();
    loadStats();
    loadDashboard();
  };

  const handleShareClick = doc => {
    setSelectedDocForShare(doc);
    setShareDialogOpen(true);
  };

  const handleShare = async () => {
    if (!shareEmail.trim()) {
      showSnackbar('البريد الإلكتروني مطلوب', 'warning');
      return;
    }
    try {
      await documentService.shareDocument(selectedDocForShare._id, shareEmail, sharePermission);
      showSnackbar('تم مشاركة المستند بنجاح', 'success');
      setShareDialogOpen(false);
      setShareEmail('');
      setSharePermission('view');
      loadDocuments();
    } catch (_err) {
      showSnackbar('فشل في مشاركة المستند', 'error');
    }
  };

  const handleCategoryClick = cat => {
    setSelectedCategory(prev => (prev === cat ? '' : cat));
  };

  const refreshAll = () => {
    loadDocuments();
    loadStats();
    loadDashboard();
  };

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ═══ Breadcrumbs ═══ */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon sx={{ fontSize: 18 }} /> الرئيسية
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          إدارة المستندات
        </Typography>
      </Breadcrumbs>

      {/* ═══ Gradient Header (Enhanced) ═══ */}
      <Card
        sx={{
          mb: 3,
          background: gradients.primary,
          color: 'white',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -60,
            left: '30%',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 52, height: 52 }}>
                  <FolderOpenIcon sx={{ fontSize: 28 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                    إدارة المستندات
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85 }}>
                    قم بتنظيم وإدارة ومشاركة جميع مستنداتك في مكان واحد
                  </Typography>
                </Box>
              </Box>
              {/* Storage Progress */}
              <Box sx={{ mt: 1.5, maxWidth: 350 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    السعة التخزينية
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {storageQuota.usedStr} / {storageQuota.quotaStr}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={storageQuota.pct}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor:
                        storageQuota.pct > 80
                          ? '#F44336'
                          : storageQuota.pct > 60
                            ? '#FF9800'
                            : 'rgba(255,255,255,0.8)',
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Tooltip title="تحديث البيانات">
                <IconButton
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                  onClick={refreshAll}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                onClick={() => setUploaderOpen(true)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2.5,
                  px: 3,
                }}
              >
                تحميل مستند
              </Button>
              <Button
                variant="contained"
                startIcon={<ScannerIcon />}
                onClick={() => setScannerOpen(true)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)',
                  fontWeight: 700,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                  borderRadius: 2.5,
                  px: 3,
                }}
              >
                مسح ضوئي
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* ═══ Stats Cards (6 cards) ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<FileIcon />}
            label="إجمالي المستندات"
            value={totalDocs || '—'}
            color={brandColors?.primaryStart || '#667eea'}
            trend="+12%"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<StorageIcon />}
            label="حجم التخزين"
            value={formatFileSize(totalSize)}
            color="#38A169"
            subtitle={`من ${storageQuota.quotaStr}`}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<SharedIcon />}
            label="مستندات مشتركة"
            value={dashStats.sharedDocuments ?? '—'}
            color="#D69E2E"
            trend="+5"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<PendingIcon />}
            label="بانتظار الموافقة"
            value={dashStats.pendingApproval ?? '—'}
            color="#E53E3E"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<DownloadIcon />}
            label="التنزيلات اليوم"
            value={dashStats.todayDownloads ?? '—'}
            color="#805AD5"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard
            icon={<SpeedIcon />}
            label="معدل الاستخدام"
            value={`${storageQuota.pct.toFixed(0)}%`}
            color="#DD6B20"
            gradient={storageQuota.pct > 80 ? gradients.fire : undefined}
          />
        </Grid>
      </Grid>

      {/* ═══ Main Tabs ═══ */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          mb: 3,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            '& .MuiTab-root': {
              minHeight: 56,
              fontWeight: 600,
              fontSize: '0.9rem',
              transition: 'all 0.2s',
              '&.Mui-selected': { color: theme.palette.primary.main },
            },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<FolderOpenIcon />} label="المستندات" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="لوحة التحليلات" iconPosition="start" />
          <Tab icon={<CategoryIcon />} label="الفئات" iconPosition="start" />
          <Tab icon={<RecentIcon />} label="النشاط الأخير" iconPosition="start" />
          <Tab icon={<CloudUploadIcon />} label="منطقة الرفع" iconPosition="start" />
        </Tabs>

        {/* ═══ TAB 0: Documents ═══ */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            {/* Filters + View Toggle */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.background.default, 0.5),
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    placeholder="ابحث في المستندات..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    size="small"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>المجلد</InputLabel>
                    <Select
                      value={selectedFolder}
                      onChange={e => setSelectedFolder(e.target.value)}
                      label="المجلد"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">جميع المجلدات</MenuItem>
                      <MenuItem value="root">الرئيسية</MenuItem>
                      {(Array.isArray(folders) ? folders : []).map(folder => (
                        <MenuItem key={folder._id} value={folder._id}>
                          {folder._id} ({folder.count})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>الفئة</InputLabel>
                    <Select
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      label="الفئة"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">جميع الفئات</MenuItem>
                      {categories.map(c => (
                        <MenuItem key={c} value={c}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: CATEGORY_COLORS[c],
                              }}
                            />
                            {c}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs="auto">
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      p: 0.3,
                    }}
                  >
                    <Tooltip title="عرض قائمة">
                      <IconButton
                        size="small"
                        onClick={() => setViewMode('list')}
                        sx={{
                          bgcolor:
                            viewMode === 'list'
                              ? alpha(theme.palette.primary.main, 0.12)
                              : 'transparent',
                          borderRadius: 1.5,
                        }}
                      >
                        <ListViewIcon
                          fontSize="small"
                          color={viewMode === 'list' ? 'primary' : 'action'}
                        />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="عرض شبكي">
                      <IconButton
                        size="small"
                        onClick={() => setViewMode('grid')}
                        sx={{
                          bgcolor:
                            viewMode === 'grid'
                              ? alpha(theme.palette.primary.main, 0.12)
                              : 'transparent',
                          borderRadius: 1.5,
                        }}
                      >
                        <GridViewIcon
                          fontSize="small"
                          color={viewMode === 'grid' ? 'primary' : 'action'}
                        />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
                <Grid item xs="auto">
                  <Badge badgeContent={documents.length} color="primary" max={999}>
                    <Chip
                      label={selectedCategory || 'جميع المستندات'}
                      variant="outlined"
                      color="primary"
                      sx={{ fontWeight: 600 }}
                    />
                  </Badge>
                </Grid>
              </Grid>

              {/* Category Chips */}
              <Box
                sx={{ display: 'flex', gap: 0.75, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.6, ml: 0.5 }}>
                  تصفية سريعة:
                </Typography>
                <Chip
                  label="الكل"
                  clickable
                  size="small"
                  variant={selectedCategory === '' ? 'filled' : 'outlined'}
                  color={selectedCategory === '' ? 'primary' : 'default'}
                  onClick={() => setSelectedCategory('')}
                  sx={{ fontWeight: 600 }}
                />
                {categories.map(cat => {
                  const c = CATEGORY_COLORS[cat] || '#607D8B';
                  const catCount = categoryStats.find(cs => cs.name === cat)?.count || 0;
                  return (
                    <Chip
                      key={cat}
                      label={`${cat} (${catCount})`}
                      clickable
                      size="small"
                      variant={selectedCategory === cat ? 'filled' : 'outlined'}
                      onClick={() => handleCategoryClick(cat)}
                      sx={{
                        bgcolor: selectedCategory === cat ? c : 'transparent',
                        color: selectedCategory === cat ? 'white' : c,
                        borderColor: alpha(c, 0.5),
                        fontWeight: 600,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: selectedCategory === cat ? c : alpha(c, 0.08) },
                      }}
                    />
                  );
                })}
              </Box>
            </Paper>

            {/* Document List */}
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={48} />
                <Typography sx={{ mt: 2 }} color="text.secondary" fontWeight={500}>
                  جاري تحميل المستندات...
                </Typography>
              </Box>
            ) : documents.length === 0 ? (
              <Paper
                sx={{
                  textAlign: 'center',
                  py: 10,
                  px: 4,
                  borderRadius: 3,
                  border: '2px dashed',
                  borderColor: 'divider',
                  background: `linear-gradient(135deg, ${alpha('#667eea', 0.02)} 0%, ${alpha('#764ba2', 0.02)} 100%)`,
                }}
              >
                <FolderOpenIcon sx={{ fontSize: 100, color: alpha('#667eea', 0.2), mb: 2 }} />
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                  لا توجد مستندات بعد
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
                >
                  ابدأ بتحميل مستندك الأول. يمكنك تحميل ملفات PDF، Word، Excel، صور، وأكثر
                </Typography>
                <Stack direction="row" spacing={1.5} justifyContent="center">
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => setUploaderOpen(true)}
                    sx={{ borderRadius: 2.5, px: 4 }}
                  >
                    تحميل مستند
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<ScannerIcon />}
                    onClick={() => setScannerOpen(true)}
                    sx={{ borderRadius: 2.5, px: 4 }}
                  >
                    مسح ضوئي
                  </Button>
                </Stack>
              </Paper>
            ) : (
              <DocumentList
                documents={documents}
                onRefresh={loadDocuments}
                onShare={handleShareClick}
              />
            )}
          </Box>
        </TabPanel>

        {/* ═══ TAB 1: Analytics Dashboard ═══ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Grid container spacing={3}>
              {/* File Type Distribution (PieChart) */}
              <Grid item xs={12} md={5}>
                <Card
                  sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع أنواع الملفات
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {fileTypeDistribution.length > 0 ? (
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={fileTypeDistribution}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={95}
                            paddingAngle={3}
                            label={({ name, count }) => `${name} (${count})`}
                          >
                            {fileTypeDistribution.map((d, i) => (
                              <Cell key={i} fill={d.color} stroke="none" />
                            ))}
                          </Pie>
                          <RTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }}>
                        <ChartIcon sx={{ fontSize: 48, opacity: 0.2, mb: 1 }} />
                        <Typography color="text.secondary">لا توجد بيانات كافية</Typography>
                      </Box>
                    )}
                    {/* Legend chips */}
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                      {fileTypeDistribution.map(d => (
                        <Chip
                          key={d.key}
                          size="small"
                          icon={d.icon}
                          label={`${d.name}: ${d.count}`}
                          sx={{
                            bgcolor: alpha(d.color, 0.08),
                            color: d.color,
                            fontWeight: 600,
                            '& .MuiChip-icon': { color: d.color },
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Monthly Trend (AreaChart) */}
              <Grid item xs={12} md={7}>
                <Card
                  sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      الاتجاه الشهري
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={dashboard?.monthlyTrend || MOCK_MONTHLY_TREND}>
                        <defs>
                          <linearGradient id="fillUploads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="fillDownloads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#43e97b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} />
                        <RTooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="uploads"
                          name="التحميلات"
                          stroke="#667eea"
                          fill="url(#fillUploads)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="downloads"
                          name="التنزيلات"
                          stroke="#43e97b"
                          fill="url(#fillDownloads)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="shared"
                          name="المشاركات"
                          stroke="#fa709a"
                          fill="none"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Storage Breakdown */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        توزيع التخزين
                      </Typography>
                      <Chip
                        size="small"
                        label={`${storageQuota.usedStr} / ${storageQuota.quotaStr}`}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    {(dashboard?.storageBreakdown || MOCK_STORAGE_BREAKDOWN).map((item, i) => (
                      <Box key={i} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: item.color }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {item.name}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {item.size} ({item.value}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={item.value}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: alpha(item.color, 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 5 },
                          }}
                        />
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Downloaded Documents */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      الأكثر تنزيلاً
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {(dashboard?.mostDownloaded || MOCK_TOP_DOCS).map((doc, i) => {
                      const catColor = CATEGORY_COLORS[doc.category] || '#607D8B';
                      return (
                        <Box
                          key={i}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            py: 1.5,
                            px: 1.5,
                            mb: 1,
                            borderRadius: 2,
                            bgcolor: alpha(catColor, 0.04),
                            border: '1px solid',
                            borderColor: alpha(catColor, 0.1),
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: alpha(catColor, 0.08),
                              transform: 'translateX(-4px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                bgcolor: alpha(catColor, 0.12),
                                color: catColor,
                                fontWeight: 800,
                                fontSize: 14,
                              }}
                            >
                              {i + 1}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {doc.title}
                              </Typography>
                              <Chip
                                size="small"
                                label={doc.category}
                                sx={{
                                  height: 18,
                                  fontSize: '0.6rem',
                                  mt: 0.3,
                                  bgcolor: alpha(catColor, 0.1),
                                  color: catColor,
                                  fontWeight: 600,
                                }}
                              />
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: catColor }}>
                              {doc.downloads}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              تنزيل
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </CardContent>
                </Card>
              </Grid>

              {/* Category Distribution Bar Chart */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع المستندات حسب الفئة
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={categoryStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={11} />
                        <RTooltip />
                        <Bar dataKey="count" name="عدد المستندات" radius={[6, 6, 0, 0]}>
                          {categoryStats.map((d, i) => (
                            <Cell
                              key={i}
                              fill={
                                CATEGORY_COLORS[d.name] || CHART_COLORS[i % CHART_COLORS.length]
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* ═══ TAB 2: Categories ═══ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  تصنيف المستندات
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  اضغط على أي فئة لعرض المستندات الخاصة بها
                </Typography>
              </Box>
              <Chip
                label={`${categories.length} فئات • ${totalDocs} مستند`}
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>
            <Grid container spacing={2.5}>
              {categoryStats.map(cat => (
                <Grid item xs={6} sm={4} md={3} key={cat.name}>
                  <CategoryCard
                    name={cat.name}
                    count={cat.count}
                    totalDocs={totalDocs || 1}
                    isSelected={selectedCategory === cat.name}
                    onClick={() => {
                      handleCategoryClick(cat.name);
                      if (selectedCategory !== cat.name) setActiveTab(0);
                    }}
                  />
                </Grid>
              ))}
            </Grid>

            {/* Category Summary Table */}
            <Card sx={{ mt: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                  ملخص الفئات
                </Typography>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box
                    component="table"
                    sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px' }}
                  >
                    <Box component="thead">
                      <Box component="tr">
                        {['الفئة', 'العدد', 'النسبة', 'المؤشر'].map(h => (
                          <Box
                            component="th"
                            key={h}
                            sx={{
                              py: 1,
                              px: 2,
                              textAlign: 'right',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: 'text.secondary',
                            }}
                          >
                            {h}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {categoryStats.map((cat, i) => {
                        const c = CATEGORY_COLORS[cat.name] || '#607D8B';
                        const pct = totalDocs > 0 ? ((cat.count / totalDocs) * 100).toFixed(1) : 0;
                        return (
                          <Box
                            component="tr"
                            key={cat.name}
                            sx={{
                              bgcolor: alpha(c, 0.04),
                              borderRadius: 2,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { bgcolor: alpha(c, 0.1) },
                            }}
                            onClick={() => {
                              setSelectedCategory(cat.name);
                              setActiveTab(0);
                            }}
                          >
                            <Box
                              component="td"
                              sx={{ py: 1.5, px: 2, borderRadius: '8px 0 0 8px' }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar
                                  sx={{ width: 32, height: 32, bgcolor: alpha(c, 0.12), color: c }}
                                >
                                  {CATEGORY_ICONS[cat.name] || <FolderIcon />}
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {cat.name}
                                </Typography>
                              </Box>
                            </Box>
                            <Box component="td" sx={{ py: 1.5, px: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: c }}>
                                {cat.count}
                              </Typography>
                            </Box>
                            <Box component="td" sx={{ py: 1.5, px: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {pct}%
                              </Typography>
                            </Box>
                            <Box
                              component="td"
                              sx={{ py: 1.5, px: 2, borderRadius: '0 8px 8px 0', minWidth: 150 }}
                            >
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(pct, 100)}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: alpha(c, 0.1),
                                  '& .MuiLinearProgress-bar': { bgcolor: c, borderRadius: 4 },
                                }}
                              />
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </TabPanel>

        {/* ═══ TAB 3: Recent Activity ═══ */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                سجل النشاطات
              </Typography>
              <Button size="small" startIcon={<RefreshIcon />} onClick={refreshAll}>
                تحديث
              </Button>
            </Box>

            {(dashboard?.recentActivities || []).length > 0 ? (
              <Box>
                {(dashboard.recentActivities || []).map((act, i) => {
                  const actionConfig = {
                    تحميل: {
                      color: '#43A047',
                      icon: <CloudUploadIcon fontSize="small" />,
                      chip: 'success',
                    },
                    تنزيل: {
                      color: '#1E88E5',
                      icon: <DownloadIcon fontSize="small" />,
                      chip: 'info',
                    },
                    حذف: { color: '#E53935', icon: <FileIcon fontSize="small" />, chip: 'error' },
                    مشاركة: {
                      color: '#FF9800',
                      icon: <ShareIcon fontSize="small" />,
                      chip: 'warning',
                    },
                    عرض: { color: '#7B1FA2', icon: <ViewIcon fontSize="small" />, chip: 'default' },
                  };
                  const cfg = actionConfig[act.action] || {
                    color: '#607D8B',
                    icon: <FileIcon fontSize="small" />,
                    chip: 'default',
                  };

                  return (
                    <Paper
                      key={i}
                      elevation={0}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        py: 1.5,
                        px: 2.5,
                        mb: 1.5,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: alpha(cfg.color, 0.15),
                        bgcolor: alpha(cfg.color, 0.02),
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: alpha(cfg.color, 0.06),
                          borderColor: alpha(cfg.color, 0.3),
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar
                          sx={{
                            width: 38,
                            height: 38,
                            bgcolor: alpha(cfg.color, 0.12),
                            color: cfg.color,
                          }}
                        >
                          {cfg.icon}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={act.action}
                              size="small"
                              color={cfg.chip}
                              sx={{ fontSize: '0.7rem', fontWeight: 600, height: 22 }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {act.documentTitle}
                            </Typography>
                          </Box>
                          {act.performedByName && (
                            <Typography variant="caption" color="text.secondary">
                              بواسطة: {act.performedByName}
                              {act.details ? ` — ${act.details}` : ''}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {act.performedAt
                          ? new Date(act.performedAt).toLocaleDateString('ar-SA', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            ) : (
              <Paper
                sx={{
                  textAlign: 'center',
                  py: 8,
                  borderRadius: 3,
                  border: '2px dashed',
                  borderColor: 'divider',
                }}
              >
                <RecentIcon sx={{ fontSize: 64, color: alpha('#667eea', 0.15), mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  لا يوجد نشاط بعد
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ستظهر هنا جميع العمليات التي تتم على المستندات
                </Typography>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* ═══ TAB 4: Upload Zone ═══ */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <DropZone onOpenUploader={() => setUploaderOpen(true)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Card
                  sx={{ borderRadius: 3, height: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                      إجراءات سريعة
                    </Typography>
                    <Stack spacing={1.5}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => setUploaderOpen(true)}
                        sx={{ borderRadius: 2, justifyContent: 'flex-start', fontWeight: 600 }}
                      >
                        تحميل ملف جديد
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<ScannerIcon />}
                        onClick={() => setScannerOpen(true)}
                        sx={{ borderRadius: 2, justifyContent: 'flex-start', fontWeight: 600 }}
                      >
                        مسح ضوئي
                      </Button>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<NewFolderIcon />}
                        onClick={() => showSnackbar('ميزة إنشاء مجلد قادمة قريباً', 'info')}
                        sx={{ borderRadius: 2, justifyContent: 'flex-start', fontWeight: 600 }}
                      >
                        إنشاء مجلد جديد
                      </Button>
                    </Stack>

                    <Divider sx={{ my: 2.5 }} />

                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, opacity: 0.7 }}>
                      الأنواع المدعومة
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {FILE_TYPE_DATA.map(ft => (
                        <Tooltip key={ft.key} title={ft.name}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: alpha(ft.color, 0.1),
                              color: ft.color,
                              transition: 'transform 0.2s',
                              '&:hover': { transform: 'scale(1.15)' },
                            }}
                          >
                            {ft.icon}
                          </Avatar>
                        </Tooltip>
                      ))}
                    </Box>

                    <Divider sx={{ my: 2.5 }} />

                    {/* Storage Meter */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, opacity: 0.7 }}>
                      استخدام التخزين
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">{storageQuota.usedStr}</Typography>
                        <Typography variant="caption">{storageQuota.quotaStr}</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={storageQuota.pct}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          bgcolor: alpha('#667eea', 0.08),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 6,
                            background:
                              storageQuota.pct > 80
                                ? 'linear-gradient(90deg, #F44336, #E53935)'
                                : storageQuota.pct > 60
                                  ? 'linear-gradient(90deg, #FF9800, #F57C00)'
                                  : gradients.primary,
                          },
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 0.5, display: 'block' }}
                      >
                        {storageQuota.pct.toFixed(1)}% مستخدم
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* ═══ Upload / Scanner Dialogs ═══ */}
      {uploaderOpen && (
        <DocumentUploader onSuccess={handleUploadSuccess} onClose={() => setUploaderOpen(false)} />
      )}
      {scannerOpen && (
        <DocumentScanner
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onSuccess={() => {
            setScannerOpen(false);
            refreshAll();
            showSnackbar('تم رفع المستند الممسوح بنجاح', 'success');
          }}
        />
      )}

      {/* ═══ Share Dialog ═══ */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{ bgcolor: alpha('#D69E2E', 0.12), color: '#D69E2E', width: 36, height: 36 }}
            >
              <ShareIcon fontSize="small" />
            </Avatar>
            مشاركة المستند
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          {selectedDocForShare && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2.5,
                borderRadius: 2,
                bgcolor: alpha('#667eea', 0.04),
                border: '1px solid',
                borderColor: alpha('#667eea', 0.1),
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {selectedDocForShare.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedDocForShare.fileType?.toUpperCase()} •{' '}
                {formatFileSize(selectedDocForShare.fileSize)}
              </Typography>
            </Paper>
          )}
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            value={shareEmail}
            onChange={e => setShareEmail(e.target.value)}
            placeholder="مثال: user@example.com"
            sx={{ mb: 2 }}
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>الصلاحية</InputLabel>
            <Select
              value={sharePermission}
              onChange={e => setSharePermission(e.target.value)}
              label="الصلاحية"
            >
              <MenuItem value="view">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewIcon fontSize="small" color="action" /> عرض فقط
                </Box>
              </MenuItem>
              <MenuItem value="edit">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FileIcon fontSize="small" color="action" /> تعديل
                </Box>
              </MenuItem>
              <MenuItem value="download">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DownloadIcon fontSize="small" color="action" /> تنزيل
                </Box>
              </MenuItem>
              <MenuItem value="share">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SharedIcon fontSize="small" color="action" /> مشاركة
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShareDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleShare}
            variant="contained"
            startIcon={<ShareIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            مشاركة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Documents;
