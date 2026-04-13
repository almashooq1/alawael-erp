/**
 * 🗂️ نظام الأرشفة الإلكترونية — Electronic Archiving System
 * AlAwael ERP — Document archiving, classification, retention, versions, search & analytics
 * @created 2026-03-13
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Paper,
  alpha,
  useTheme,
} from '@mui/material';




import archivingService from 'services/archivingService';
import logger from 'utils/logger';
import { gradients } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

/* ═══ Helpers ═══ */
const STATUS_MAP = {
  مسودة: { color: '#9E9E9E', chip: 'default', icon: <EditIcon fontSize="small" /> },
  نشط: { color: '#43A047', chip: 'success', icon: <CheckIcon fontSize="small" /> },
  مؤرشف: { color: '#1E88E5', chip: 'info', icon: <ArchiveIcon fontSize="small" /> },
  معلق: { color: '#FF9800', chip: 'warning', icon: <WarningIcon fontSize="small" /> },
  مستعاد: { color: '#9C27B0', chip: 'secondary', icon: <RestoreIcon fontSize="small" /> },
  محذوف: { color: '#E53935', chip: 'error', icon: <DeleteIcon fontSize="small" /> },
};

const CLASSIFICATION_COLORS = {
  public: '#43A047',
  internal: '#1E88E5',
  confidential: '#FF9800',
  secret: '#E53935',
};

const FILE_ICON_MAP = {
  pdf: <PdfIcon />,
  doc: <DocIcon />,
  docx: <DocIcon />,
  xls: <ExcelIcon />,
  xlsx: <ExcelIcon />,
  ppt: <PptIcon />,
  pptx: <PptIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  jpeg: <ImageIcon />,
  zip: <ZipIcon />,
  rar: <ZipIcon />,
  txt: <TxtIcon />,
};

const CHART_COLORS = [
  '#667eea',
  '#43e97b',
  '#f5576c',
  '#4facfe',
  '#fa709a',
  '#f5af19',
  '#38f9d7',
  '#805AD5',
  '#E53935',
  '#00BCD4',
  '#795548',
  '#607D8B',
];

/* ═══ Sub-Components ═══ */
const StatCard = ({ icon, label, value, color, trend, subtitle, gradient: grad }) => (
  <Card
    sx={{
      background:
        grad || `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
      color: grad ? 'white' : 'inherit',
      borderRadius: 3,
      border: grad ? 'none' : `1px solid ${alpha(color, 0.15)}`,
      height: '100%',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 28px ${alpha(color, 0.2)}` },
      '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        right: 0,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: grad ? 'rgba(255,255,255,0.06)' : alpha(color, 0.04),
        transform: 'translate(20px, -20px)',
      },
    }}
  >
    <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            sx={{
              bgcolor: grad ? 'rgba(255,255,255,0.2)' : alpha(color, 0.12),
              color: grad ? 'white' : color,
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
              bgcolor: grad ? 'rgba(255,255,255,0.15)' : alpha('#43A047', 0.1),
              color: grad ? 'white' : '#43A047',
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

function TabPanel({ children, value, index }) {
  return value === index ? (
    <Fade in timeout={400}>
      <Box sx={{ py: 2 }}>{children}</Box>
    </Fade>
  ) : null;
}

const StyledChip = ({ status }) => {
  const cfg = STATUS_MAP[status] || { color: '#757575', chip: 'default' };
  return (
    <Chip
      label={status}
      size="small"
      color={cfg.chip}
      icon={cfg.icon}
      sx={{ fontWeight: 600, fontSize: '0.72rem' }}
    />
  );
};

const ClassificationBadge = ({ level, label }) => {
  const color = CLASSIFICATION_COLORS[level] || '#757575';
  return (
    <Chip
      size="small"
      icon={
        level === 'secret' || level === 'confidential' ? (
          <LockIcon sx={{ fontSize: 13 }} />
        ) : (
          <LockOpenIcon sx={{ fontSize: 13 }} />
        )
      }
      label={label}
      sx={{
        bgcolor: alpha(color, 0.1),
        color,
        fontWeight: 600,
        fontSize: '0.7rem',
        border: `1px solid ${alpha(color, 0.2)}`,
      }}
    />
  );
};

/* ════════════════════════════════════════════════════ */
/* ═══ MAIN: ElectronicArchiving Component           ═══ */
/* ════════════════════════════════════════════════════ */
const ElectronicArchiving = () => {
  const theme = useTheme();
  const showSnackbar = useSnackbar();

  /* ─── State ─── */
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [storageStats, setStorageStats] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Upload form
  const emptyForm = {
    title: '',
    description: '',
    category: 'other',
    classification: 'internal',
    department: '',
    tags: '',
    author: '',
    referenceNumber: '',
    retentionPolicy: 'default',
    documentDate: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [editMode, setEditMode] = useState(false);

  /* ─── Data Loading ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, log, stats] = await Promise.all([
        archivingService.getDocuments(),
        archivingService.getActivityLog(),
        archivingService.getStorageStats(),
      ]);
      setDocuments(Array.isArray(docs) ? docs : []);
      setActivityLog(Array.isArray(log) ? log : []);
      setStorageStats(stats);
    } catch (err) {
      logger.error('ElectronicArchiving load error:', err);
      showSnackbar('خطأ في تحميل بيانات الأرشفة', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ─── Derived Stats ─── */
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const activeDocs = documents.filter(d => d.status === 'نشط').length;
    const archivedDocs = documents.filter(d => d.status === 'مؤرشف').length;
    const draftDocs = documents.filter(d => d.status === 'مسودة').length;
    const totalSize = documents.reduce((s, d) => s + (d.fileSize || 0), 0);
    const totalVersions = documents.reduce((s, d) => s + (d.version || 1), 0);
    const categories = new Set(documents.map(d => d.category)).size;
    return { totalDocs, activeDocs, archivedDocs, draftDocs, totalSize, totalVersions, categories };
  }, [documents]);

  const categoryDistribution = useMemo(() => {
    const map = {};
    documents.forEach(d => {
      const cat = d.categoryLabel || d.category || 'أخرى';
      map[cat] = (map[cat] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [documents]);

  const statusDistribution = useMemo(() => {
    const map = {};
    documents.forEach(d => {
      const s = d.status || 'أخرى';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
      color: STATUS_MAP[name]?.color || '#757575',
    }));
  }, [documents]);

  /* ─── Filter ─── */
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        [
          doc.title,
          doc.documentNumber,
          doc.description,
          doc.author,
          doc.department,
          ...(doc.tags || []),
        ].some(v =>
          String(v || '')
            .toLowerCase()
            .includes(q)
        );
      const matchCat = !categoryFilter || doc.category === categoryFilter;
      const matchStatus = !statusFilter || doc.status === statusFilter;
      const matchClass = !classificationFilter || doc.classification === classificationFilter;
      const matchDept = !departmentFilter || doc.department === departmentFilter;
      return matchSearch && matchCat && matchStatus && matchClass && matchDept;
    });
  }, [
    documents,
    searchQuery,
    categoryFilter,
    statusFilter,
    classificationFilter,
    departmentFilter,
  ]);

  /* ─── Handlers ─── */
  const handleUpload = async () => {
    if (!form.title.trim()) {
      showSnackbar('عنوان المستند مطلوب', 'warning');
      return;
    }
    try {
      if (editMode && selectedDoc) {
        await archivingService.updateDocument(selectedDoc._id, form);
        showSnackbar('تم تحديث المستند بنجاح', 'success');
      } else {
        const formData = new FormData();
        if (selectedFile) formData.append('file', selectedFile);
        Object.entries(form).forEach(([k, v]) => formData.append(k, v));
        await archivingService.createDocument(formData);
        showSnackbar('تم رفع المستند بنجاح', 'success');
      }
      setUploadDialogOpen(false);
      setForm(emptyForm);
      setSelectedFile(null);
      setEditMode(false);
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في حفظ المستند', 'error');
    }
  };

  const handleArchiveDoc = async doc => {
    try {
      await archivingService.archiveDocument(doc._id);
      showSnackbar('تمت أرشفة المستند بنجاح', 'success');
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في الأرشفة', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await archivingService.deleteDocument(deleteTarget._id);
      showSnackbar('تم حذف المستند بنجاح', 'success');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في الحذف', 'error');
    }
  };

  const openEdit = doc => {
    setForm({
      title: doc.title,
      description: doc.description || '',
      category: doc.category,
      classification: doc.classification,
      department: doc.department || '',
      tags: (doc.tags || []).join(', '),
      author: doc.author || '',
      referenceNumber: doc.referenceNumber || '',
      retentionPolicy: doc.retentionPolicy || 'default',
      documentDate: doc.documentDate || new Date().toISOString().slice(0, 10),
    });
    setSelectedDoc(doc);
    setEditMode(true);
    setUploadDialogOpen(true);
  };

  const openDetail = doc => {
    setSelectedDoc(doc);
    setDetailDialogOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setClassificationFilter('');
    setDepartmentFilter('');
    setPage(0);
  };

  const storagePercent = storageStats
    ? ((storageStats.usedStorage / storageStats.totalStorage) * 100).toFixed(1)
    : 0;

  /* ═══ RENDER ═══ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon sx={{ fontSize: 18 }} /> الرئيسية
        </Link>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <DocIcon sx={{ fontSize: 18 }} /> المستندات
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          الأرشفة الإلكترونية
        </Typography>
      </Breadcrumbs>

      {/* ═══ Gradient Header ═══ */}
      <Card
        sx={{
          mb: 3,
          background: gradients.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 56, height: 56 }}>
                <ArchiveIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  نظام الأرشفة الإلكترونية
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                  إدارة شاملة للمستندات — التصنيف والفهرسة والاسترجاع والاحتفاظ والتحليلات
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              {/* Storage bar mini */}
              <Box sx={{ minWidth: 180, mr: 1, textAlign: 'center' }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                  مساحة التخزين
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={+storagePercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.15)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      bgcolor:
                        +storagePercent > 80
                          ? '#f5576c'
                          : +storagePercent > 60
                            ? '#f5af19'
                            : '#43e97b',
                    },
                  }}
                />
                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.65rem' }}>
                  {archivingService.formatFileSize(storageStats?.usedStorage || 0)} /{' '}
                  {archivingService.formatFileSize(storageStats?.totalStorage || 0)} (
                  {storagePercent}%)
                </Typography>
              </Box>
              <Tooltip title="تحديث البيانات">
                <IconButton
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                  onClick={loadAll}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* ═══ Stats Cards (8) ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            icon: <DocIcon />,
            label: 'إجمالي المستندات',
            value: stats.totalDocs,
            color: '#667eea',
            trend: '+15%',
          },
          { icon: <CheckIcon />, label: 'مستندات نشطة', value: stats.activeDocs, color: '#43A047' },
          { icon: <ArchiveIcon />, label: 'مؤرشفة', value: stats.archivedDocs, color: '#1E88E5' },
          { icon: <EditIcon />, label: 'مسودات', value: stats.draftDocs, color: '#9E9E9E' },
          {
            icon: <StorageIcon />,
            label: 'حجم التخزين',
            value: archivingService.formatFileSize(stats.totalSize),
            color: '#FF9800',
          },
          {
            icon: <HistoryIcon />,
            label: 'إجمالي النسخ',
            value: stats.totalVersions,
            color: '#9C27B0',
          },
          { icon: <CategoryIcon />, label: 'التصنيفات', value: stats.categories, color: '#00BCD4' },
          {
            icon: <SecurityIcon />,
            label: 'مستوى الحماية',
            value: 'متقدم',
            color: '#E53935',
            subtitle: 'مشفر AES-256',
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={3} lg key={i}>
            <StatCard {...s} />
          </Grid>
        ))}
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
          onChange={(_e, v) => {
            setActiveTab(v);
            resetFilters();
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            '& .MuiTab-root': {
              minHeight: 56,
              fontWeight: 600,
              fontSize: '0.85rem',
              '&.Mui-selected': { color: theme.palette.primary.main },
            },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<DocIcon />} label="المستندات" iconPosition="start" />
          <Tab icon={<CategoryIcon />} label="التصنيفات" iconPosition="start" />
          <Tab icon={<HistoryIcon />} label="سجل النشاط" iconPosition="start" />
          <Tab icon={<SecurityIcon />} label="سياسات الاحتفاظ" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" iconPosition="start" />
          <Tab icon={<UploadIcon />} label="منطقة الرفع" iconPosition="start" />
        </Tabs>

        {/* ═══ TAB 0: Documents ═══ */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            {/* Advanced Filters */}
            <Paper
              sx={{
                p: 2,
                borderRadius: 2.5,
                mb: 2.5,
                bgcolor: alpha(theme.palette.background.default, 0.5),
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <FilterIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  بحث وتصفية متقدم
                </Typography>
                {(searchQuery ||
                  categoryFilter ||
                  statusFilter ||
                  classificationFilter ||
                  departmentFilter) && (
                  <Button
                    size="small"
                    onClick={resetFilters}
                    sx={{ ml: 'auto', fontSize: '0.72rem' }}
                  >
                    مسح الفلترة
                  </Button>
                )}
              </Box>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="بحث بالعنوان، الرقم، الوصف، الكلمات المفتاحية..."
                    size="small"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>التصنيف</InputLabel>
                    <Select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      label="التصنيف"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {archivingService.getCategories().map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.icon} {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>الحالة</InputLabel>
                    <Select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      label="الحالة"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {archivingService.getDocumentStatuses().map(s => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>السرية</InputLabel>
                    <Select
                      value={classificationFilter}
                      onChange={e => setClassificationFilter(e.target.value)}
                      label="السرية"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {archivingService.getClassificationLevels().map(c => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>القسم</InputLabel>
                    <Select
                      value={departmentFilter}
                      onChange={e => setDepartmentFilter(e.target.value)}
                      label="القسم"
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {archivingService.getDepartments().map(d => (
                        <MenuItem key={d} value={d}>
                          {d}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {/* Action Bar */}
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Chip
                label={`${filteredDocs.length} مستند`}
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => {
                  setForm(emptyForm);
                  setEditMode(false);
                  setUploadDialogOpen(true);
                }}
                sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
              >
                رفع مستند جديد
              </Button>
            </Box>

            {/* Documents Table */}
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }} color="text.secondary">
                  جاري التحميل...
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer
                  component={Paper}
                  sx={{ borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        {[
                          '',
                          'رقم المستند',
                          'العنوان',
                          'التصنيف',
                          'السرية',
                          'القسم',
                          'المؤلف',
                          'الحجم',
                          'النسخة',
                          'التاريخ',
                          'الحالة',
                          'إجراءات',
                        ].map(h => (
                          <TableCell
                            key={h}
                            sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDocs
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map(doc => {
                          const catDef = archivingService
                            .getCategories()
                            .find(c => c.id === doc.category);
                          return (
                            <TableRow
                              key={doc._id}
                              hover
                              sx={{
                                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                              }}
                            >
                              <TableCell>
                                <Avatar
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: alpha(catDef?.color || '#757575', 0.1),
                                    color: catDef?.color || '#757575',
                                  }}
                                >
                                  {FILE_ICON_MAP[doc.fileType] || <FileIcon fontSize="small" />}
                                </Avatar>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={doc.documentNumber}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: 600,
                                    fontSize: '0.68rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell
                                sx={{
                                  fontWeight: 600,
                                  maxWidth: 220,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {doc.title}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={`${catDef?.icon || '📁'} ${doc.categoryLabel}`}
                                  sx={{
                                    bgcolor: alpha(catDef?.color || '#757575', 0.08),
                                    color: catDef?.color || '#757575',
                                    fontWeight: 600,
                                    fontSize: '0.7rem',
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <ClassificationBadge
                                  level={doc.classification}
                                  label={doc.classificationLabel}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">{doc.department}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption">{doc.author}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                  {archivingService.formatFileSize(doc.fileSize)}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Badge
                                  badgeContent={`v${doc.version}`}
                                  color="info"
                                  sx={{
                                    '& .MuiBadge-badge': {
                                      fontSize: '0.6rem',
                                      height: 16,
                                      minWidth: 16,
                                    },
                                  }}
                                >
                                  <HistoryIcon color="action" fontSize="small" />
                                </Badge>
                              </TableCell>
                              <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                {doc.documentDate}
                              </TableCell>
                              <TableCell>
                                <StyledChip status={doc.status} />
                              </TableCell>
                              <TableCell>
                                <Stack direction="row" spacing={0.3}>
                                  <Tooltip title="عرض">
                                    <IconButton size="small" onClick={() => openDetail(doc)}>
                                      <ViewIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="تعديل">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => openEdit(doc)}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  {doc.status !== 'مؤرشف' && (
                                    <Tooltip title="أرشفة">
                                      <IconButton
                                        size="small"
                                        color="info"
                                        onClick={() => handleArchiveDoc(doc)}
                                      >
                                        <ArchiveIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                  <Tooltip title="حذف">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => {
                                        setDeleteTarget(doc);
                                        setDeleteDialogOpen(true);
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      {filteredDocs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={12} sx={{ textAlign: 'center', py: 6 }}>
                            <ArchiveIcon sx={{ fontSize: 56, opacity: 0.12, mb: 1 }} />
                            <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
                              لا توجد مستندات مطابقة لمعايير البحث
                            </Typography>
                            <Button size="small" onClick={resetFilters} sx={{ mt: 1 }}>
                              مسح الفلترة
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filteredDocs.length}
                  page={page}
                  onPageChange={(_e, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => {
                    setRowsPerPage(+e.target.value);
                    setPage(0);
                  }}
                  labelRowsPerPage="الصفوف:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
              </>
            )}
          </Box>
        </TabPanel>

        {/* ═══ TAB 1: Categories ═══ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              تصنيفات الأرشيف الإلكتروني
            </Typography>
            <Grid container spacing={2.5}>
              {archivingService.getCategories().map(cat => {
                const count = documents.filter(d => d.category === cat.id).length;
                const totalSize = documents
                  .filter(d => d.category === cat.id)
                  .reduce((s, d) => s + (d.fileSize || 0), 0);
                return (
                  <Grid item xs={6} sm={4} md={3} key={cat.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        height: '100%',
                        transition: 'all 0.3s',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: alpha(cat.color, 0.15),
                        overflow: 'hidden',
                        position: 'relative',
                        '&:hover': {
                          boxShadow: `0 8px 24px ${alpha(cat.color, 0.15)}`,
                          transform: 'translateY(-4px)',
                          borderColor: alpha(cat.color, 0.3),
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: cat.color,
                        },
                      }}
                      onClick={() => {
                        setCategoryFilter(cat.id);
                        setActiveTab(0);
                      }}
                    >
                      <CardContent sx={{ p: 2.5, textAlign: 'center' }}>
                        <Typography variant="h3" sx={{ mb: 0.5 }}>
                          {cat.icon}
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                          {cat.label}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                          <Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: cat.color }}>
                              {count}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              مستند
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'left' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {archivingService.formatFileSize(totalSize)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              الحجم
                            </Typography>
                          </Box>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={stats.totalDocs ? (count / stats.totalDocs) * 100 : 0}
                          sx={{
                            mt: 1.5,
                            height: 5,
                            borderRadius: 3,
                            bgcolor: alpha(cat.color, 0.08),
                            '& .MuiLinearProgress-bar': { bgcolor: cat.color, borderRadius: 3 },
                          }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </TabPanel>

        {/* ═══ TAB 2: Activity Log ═══ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2.5,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                سجل النشاط والمتابعة
              </Typography>
              <Chip
                label={`${activityLog.length} نشاط`}
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            {activityLog.map(log => {
              const actionColors = {
                'رفع مستند': '#43A047',
                'تحديث بيانات': '#1E88E5',
                تحميل: '#00BCD4',
                أرشفة: '#9C27B0',
                استعادة: '#FF9800',
                حذف: '#E53935',
                مشاركة: '#3F51B5',
                طباعة: '#795548',
                تعليق: '#607D8B',
                'إنشاء نسخة': '#009688',
              };
              const color = actionColors[log.action] || '#757575';
              const time = new Date(log.timestamp);
              const timeStr = `${time.toLocaleDateString('ar-SA')} ${time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <Paper
                  key={log._id}
                  sx={{
                    p: 2,
                    mb: 1.5,
                    borderRadius: 2.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    border: '1px solid',
                    borderColor: alpha(color, 0.1),
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: alpha(color, 0.02), borderColor: alpha(color, 0.2) },
                  }}
                >
                  <Avatar sx={{ bgcolor: alpha(color, 0.1), color, width: 40, height: 40 }}>
                    {log.action === 'رفع مستند' ? (
                      <UploadIcon fontSize="small" />
                    ) : log.action === 'تحميل' ? (
                      <DownloadIcon fontSize="small" />
                    ) : log.action === 'أرشفة' ? (
                      <ArchiveIcon fontSize="small" />
                    ) : log.action === 'حذف' ? (
                      <DeleteIcon fontSize="small" />
                    ) : log.action === 'مشاركة' ? (
                      <ShareIcon fontSize="small" />
                    ) : log.action === 'طباعة' ? (
                      <PrintIcon fontSize="small" />
                    ) : (
                      <EditIcon fontSize="small" />
                    )}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={log.action}
                        size="small"
                        sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 600 }}
                      />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {log.user}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}
                    >
                      <DocIcon sx={{ fontSize: 12 }} /> {log.document}
                      <Chip
                        label={log.documentNumber}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 0.5, height: 18, fontFamily: 'monospace', fontSize: '0.6rem' }}
                      />
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'left', minWidth: 130 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {timeStr}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: alpha('#000', 0.3),
                        fontFamily: 'monospace',
                        fontSize: '0.6rem',
                      }}
                    >
                      {log.ip}
                    </Typography>
                  </Box>
                </Paper>
              );
            })}
            {activityLog.length === 0 && (
              <Paper
                sx={{
                  textAlign: 'center',
                  py: 8,
                  borderRadius: 3,
                  border: '2px dashed',
                  borderColor: 'divider',
                }}
              >
                <HistoryIcon sx={{ fontSize: 48, opacity: 0.15, mb: 1 }} />
                <Typography color="text.secondary">لا يوجد سجل نشاط</Typography>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* ═══ TAB 3: Retention Policies ═══ */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              سياسات الاحتفاظ بالمستندات
            </Typography>

            <Grid container spacing={2.5} sx={{ mb: 4 }}>
              {archivingService.getRetentionPolicies().map(policy => {
                const count = documents.filter(d => d.retentionPolicy === policy.id).length;
                const colors = {
                  default: '#1E88E5',
                  compliance: '#FF9800',
                  legal: '#E53935',
                  permanent: '#9C27B0',
                  temporary: '#9E9E9E',
                };
                const col = colors[policy.id] || '#757575';
                return (
                  <Grid item xs={12} sm={6} md key={policy.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${alpha(col, 0.15)}`,
                        transition: 'all 0.3s',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                          boxShadow: `0 8px 20px ${alpha(col, 0.12)}`,
                          transform: 'translateY(-3px)',
                        },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: col,
                        },
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 2.5 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(col, 0.1),
                            color: col,
                            mx: 'auto',
                            mb: 1,
                            width: 48,
                            height: 48,
                          }}
                        >
                          {policy.id === 'legal' ? (
                            <LegalIcon />
                          ) : policy.id === 'permanent' ? (
                            <ShieldIcon />
                          ) : (
                            <TimerIcon />
                          )}
                        </Avatar>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {policy.label}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: col, my: 0.5 }}>
                          {count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          مستند
                        </Typography>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" color="text.secondary">
                          {policy.days === -1
                            ? 'احتفاظ دائم'
                            : `مدة الاحتفاظ: ${Math.round(policy.days / 365)} سنوات`}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Classification Levels */}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              مستويات التصنيف الأمني
            </Typography>
            <Grid container spacing={2.5}>
              {archivingService.getClassificationLevels().map(cl => {
                const count = documents.filter(d => d.classification === cl.id).length;
                return (
                  <Grid item xs={6} sm={3} key={cl.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${alpha(cl.color, 0.15)}`,
                        bgcolor: alpha(cl.color, 0.02),
                        textAlign: 'center',
                        transition: 'all 0.3s',
                        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(cl.color, 0.12),
                            color: cl.color,
                            mx: 'auto',
                            mb: 1,
                          }}
                        >
                          {cl.id === 'secret' || cl.id === 'confidential' ? (
                            <LockIcon />
                          ) : (
                            <LockOpenIcon />
                          )}
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: cl.color }}>
                          {cl.label}
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 800, my: 0.5 }}>
                          {count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          مستند
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </TabPanel>

        {/* ═══ TAB 4: Analytics ═══ */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Grid container spacing={3}>
              {/* Monthly Uploads Trend */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      اتجاه الرفع الشهري — المستندات والحجم
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={storageStats?.monthlyUploads || []}>
                        <defs>
                          <linearGradient id="aFillUploads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="aFillSize" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#43e97b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#43e97b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis yAxisId="left" fontSize={11} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} />
                        <RTooltip />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="uploads"
                          name="المستندات"
                          stroke="#667eea"
                          fill="url(#aFillUploads)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="size"
                          name="الحجم (GB)"
                          stroke="#43e97b"
                          fill="url(#aFillSize)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Category Pie */}
              <Grid item xs={12} md={4}>
                <Card
                  sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: '100%' }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع التصنيفات
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={categoryDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {categoryDistribution.map((d, i) => (
                            <Cell key={i} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                      {categoryDistribution.slice(0, 6).map(d => (
                        <Chip
                          key={d.name}
                          size="small"
                          label={`${d.name}: ${d.value}`}
                          sx={{
                            bgcolor: alpha(d.color, 0.1),
                            color: d.color,
                            fontWeight: 600,
                            fontSize: '0.65rem',
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* File Type Distribution */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع أنواع الملفات
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={storageStats?.fileTypeDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis fontSize={11} />
                        <RTooltip />
                        <Bar dataKey="value" name="عدد الملفات" radius={[4, 4, 0, 0]}>
                          {(storageStats?.fileTypeDistribution || []).map((d, i) => (
                            <Cell key={i} fill={d.color || CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status Distribution */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع حالات المستندات
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {statusDistribution.map((d, i) => (
                            <Cell key={i} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Classification Pie */}
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      التصنيف الأمني
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={storageStats?.classificationDistribution || []}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {(storageStats?.classificationDistribution || []).map((d, i) => (
                            <Cell key={i} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Storage Usage */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                      استخدام التخزين حسب التصنيف
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    {storageStats &&
                      Object.values(storageStats.categoryCounts)
                        .sort((a, b) => b.size - a.size)
                        .map(cat => {
                          const pct = ((cat.size / storageStats.usedStorage) * 100).toFixed(1);
                          return (
                            <Box key={cat.label} sx={{ mb: 2 }}>
                              <Box
                                sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {cat.icon} {cat.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {archivingService.formatFileSize(cat.size)} ({pct}%) — {cat.count}{' '}
                                  مستند
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={+pct}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: alpha(cat.color, 0.08),
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: cat.color,
                                    borderRadius: 4,
                                  },
                                }}
                              />
                            </Box>
                          );
                        })}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        {/* ═══ TAB 5: Upload Zone ═══ */}
        <TabPanel value={activeTab} index={5}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                {/* Drag/Drop Zone */}
                <Paper
                  sx={{
                    p: 6,
                    textAlign: 'center',
                    borderRadius: 3,
                    border: '2px dashed',
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                    bgcolor: alpha(theme.palette.primary.main, 0.02),
                    transition: 'all 0.3s',
                    cursor: 'pointer',
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                  onClick={() => {
                    setForm(emptyForm);
                    setEditMode(false);
                    setUploadDialogOpen(true);
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      setSelectedFile(files[0]);
                      setForm(prev => ({ ...prev, title: files[0].name.split('.')[0] }));
                      setEditMode(false);
                      setUploadDialogOpen(true);
                    }
                  }}
                >
                  <UploadIcon
                    sx={{ fontSize: 64, color: theme.palette.primary.main, opacity: 0.4, mb: 2 }}
                  />
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                    اسحب الملفات وأفلتها هنا
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    أو انقر لاختيار ملف — يدعم PDF, Word, Excel, PowerPoint, صور, مضغوطات
                  </Typography>
                  <Chip label="الحد الأقصى: 50 ميجابايت" variant="outlined" />
                </Paper>

                {/* Allowed File Types */}
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    أنواع الملفات المدعومة
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {archivingService.getFileTypes().map(ft => (
                      <Chip
                        key={ft.ext}
                        label={`.${ft.ext}`}
                        size="small"
                        avatar={
                          <Avatar sx={{ bgcolor: alpha(ft.color, 0.15), color: ft.color }}>
                            {ft.icon}
                          </Avatar>
                        }
                        sx={{
                          bgcolor: alpha(ft.color, 0.05),
                          fontFamily: 'monospace',
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={5}>
                {/* Quick Upload Stats */}
                <Card sx={{ borderRadius: 3, mb: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                      إحصائيات سريعة
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack spacing={2}>
                      {[
                        {
                          label: 'إجمالي المستندات',
                          value: stats.totalDocs,
                          icon: <DocIcon />,
                          color: '#667eea',
                        },
                        {
                          label: 'مساحة مستخدمة',
                          value: archivingService.formatFileSize(stats.totalSize),
                          icon: <StorageIcon />,
                          color: '#FF9800',
                        },
                        {
                          label: 'آخر رفع',
                          value: activityLog.find(l => l.action === 'رفع مستند')?.user || '—',
                          icon: <PersonIcon />,
                          color: '#43A047',
                        },
                        {
                          label: 'أكثر تصنيف',
                          value: categoryDistribution[0]?.name || '—',
                          icon: <CategoryIcon />,
                          color: '#9C27B0',
                        },
                      ].map((item, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              bgcolor: alpha(item.color, 0.1),
                              color: item.color,
                              width: 36,
                              height: 36,
                            }}
                          >
                            {item.icon}
                          </Avatar>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">
                              {item.label}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {item.value}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>

                {/* Recent Searches */}
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                      عمليات البحث الأخيرة
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      {(storageStats?.recentSearches || []).map((s, i) => (
                        <Chip
                          key={i}
                          label={s}
                          size="small"
                          variant="outlined"
                          clickable
                          icon={<SearchIcon sx={{ fontSize: 14 }} />}
                          onClick={() => {
                            setSearchQuery(s);
                            setActiveTab(0);
                          }}
                          sx={{ fontWeight: 500 }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* ═══════════════ DIALOGS ═══════════════ */}

      {/* Upload/Edit Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: alpha('#667eea', 0.12), color: '#667eea', width: 36, height: 36 }}>
            {editMode ? <EditIcon fontSize="small" /> : <UploadIcon fontSize="small" />}
          </Avatar>
          {editMode ? 'تعديل بيانات المستند' : 'رفع مستند جديد'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            {!editMode && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<UploadIcon />}
                  sx={{ borderRadius: 2, py: 1.5, borderStyle: 'dashed' }}
                >
                  {selectedFile ? selectedFile.name : 'اختر ملف للرفع'}
                  <input
                    type="file"
                    hidden
                    onChange={e => {
                      if (e.target.files?.[0]) {
                        setSelectedFile(e.target.files[0]);
                        if (!form.title)
                          setForm(prev => ({
                            ...prev,
                            title: e.target.files[0].name.split('.')[0],
                          }));
                      }
                    }}
                  />
                </Button>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان المستند *"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                size="small"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف *</InputLabel>
                <Select
                  value={form.category}
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  label="التصنيف *"
                >
                  {archivingService.getCategories().map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>مستوى السرية</InputLabel>
                <Select
                  value={form.classification}
                  onChange={e => setForm(p => ({ ...p, classification: e.target.value }))}
                  label="مستوى السرية"
                >
                  {archivingService.getClassificationLevels().map(c => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>القسم</InputLabel>
                <Select
                  value={form.department}
                  onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                  label="القسم"
                >
                  <MenuItem value="">—</MenuItem>
                  {archivingService.getDepartments().map(d => (
                    <MenuItem key={d} value={d}>
                      {d}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>سياسة الاحتفاظ</InputLabel>
                <Select
                  value={form.retentionPolicy}
                  onChange={e => setForm(p => ({ ...p, retentionPolicy: e.target.value }))}
                  label="سياسة الاحتفاظ"
                >
                  {archivingService.getRetentionPolicies().map(p => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المؤلف"
                value={form.author}
                onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الرقم المرجعي"
                value={form.referenceNumber}
                onChange={e => setForm(p => ({ ...p, referenceNumber: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ المستند"
                value={form.documentDate}
                onChange={e => setForm(p => ({ ...p, documentDate: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الكلمات المفتاحية (مفصولة بفاصلة)"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setUploadDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            startIcon={editMode ? <SaveIcon /> : <UploadIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {editMode ? 'تحديث' : 'رفع'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{ bgcolor: alpha('#667eea', 0.12), color: '#667eea', width: 36, height: 36 }}
            >
              <ViewIcon fontSize="small" />
            </Avatar>
            تفاصيل المستند
          </Box>
          <IconButton onClick={() => setDetailDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        {selectedDoc && (
          <DialogContent sx={{ pt: 2 }}>
            <Grid container spacing={3}>
              {/* Main Info */}
              <Grid item xs={12} md={8}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {selectedDoc.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  <Chip
                    label={selectedDoc.documentNumber}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace' }}
                  />
                  <StyledChip status={selectedDoc.status} />
                  <ClassificationBadge
                    level={selectedDoc.classification}
                    label={selectedDoc.classificationLabel}
                  />
                </Box>
                {selectedDoc.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {selectedDoc.description}
                  </Typography>
                )}
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  {[
                    {
                      label: 'التصنيف',
                      value: `${selectedDoc.categoryIcon} ${selectedDoc.categoryLabel}`,
                    },
                    { label: 'القسم', value: selectedDoc.department },
                    { label: 'المؤلف', value: selectedDoc.author },
                    { label: 'الرقم المرجعي', value: selectedDoc.referenceNumber },
                    { label: 'تاريخ المستند', value: selectedDoc.documentDate },
                    {
                      label: 'نوع الملف',
                      value: `${selectedDoc.fileIcon} ${selectedDoc.fileTypeLabel} (.${selectedDoc.fileType})`,
                    },
                    {
                      label: 'الحجم',
                      value: archivingService.formatFileSize(selectedDoc.fileSize),
                    },
                    { label: 'النسخة الحالية', value: `v${selectedDoc.version}` },
                    { label: 'سياسة الاحتفاظ', value: selectedDoc.retentionLabel },
                    { label: 'عدد الوصول', value: selectedDoc.accessCount },
                  ].map(item => (
                    <Grid item xs={6} key={item.label}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {item.value || '—'}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              {/* Versions & Tags */}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(theme.palette.primary.main, 0.02) }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    الكلمات المفتاحية
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {(selectedDoc.tags || []).map(t => (
                      <Chip
                        key={t}
                        label={t}
                        size="small"
                        icon={<TagIcon sx={{ fontSize: 13 }} />}
                        sx={{ fontWeight: 500 }}
                      />
                    ))}
                  </Box>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    سجل النسخ
                  </Typography>
                  {(selectedDoc.versions || []).map(v => (
                    <Box
                      key={v.version}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        mb: 0.5,
                        borderRadius: 1.5,
                        bgcolor:
                          v.version === selectedDoc.version
                            ? alpha('#667eea', 0.06)
                            : 'transparent',
                        border:
                          v.version === selectedDoc.version
                            ? `1px solid ${alpha('#667eea', 0.15)}`
                            : '1px solid transparent',
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          bgcolor: alpha('#667eea', 0.1),
                          color: '#667eea',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        v{v.version}
                      </Avatar>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                          {v.uploadedBy}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {v.date} — {v.notes}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Paper>
                {/* Physical Location */}
                {selectedDoc.physicalLocation && (
                  <Paper
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      mt: 2,
                      bgcolor: alpha('#FF9800', 0.03),
                      border: '1px solid',
                      borderColor: alpha('#FF9800', 0.1),
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                      }}
                    >
                      <FolderIcon sx={{ fontSize: 16 }} /> الموقع الفعلي
                    </Typography>
                    {Object.entries(selectedDoc.physicalLocation).map(([k, v]) => (
                      <Box
                        key={k}
                        sx={{ display: 'flex', justifyContent: 'space-between', py: 0.3 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {k}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {v}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>
            </Grid>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{ fontWeight: 700, color: '#E53935', display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Avatar sx={{ bgcolor: alpha('#E53935', 0.12), color: '#E53935', width: 36, height: 36 }}>
            <DeleteIcon fontSize="small" />
          </Avatar>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف المستند <strong>{deleteTarget?.title}</strong>؟
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            سيتم نقل المستند إلى سلة المحذوفات ويمكن استعادته خلال 30 يوماً.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ElectronicArchiving;
