/**
 * MediaLibrary — مكتبة الوسائط
 *
 * Comprehensive media library dashboard with:
 *  - Storage stats & KPIs
 *  - Type distribution chart
 *  - Recent files grid
 *  - Albums overview
 *  - Quick upload
 *  - Navigation to sub-pages
 */

import React, { useState, useEffect, useCallback } from 'react';



import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from '../../theme/palette';
import logger from '../../utils/logger';
import mediaService from '../../services/mediaService';

/* ─── Constants ────────────────────────────────────────────────────────────── */
const TYPE_CONFIG = {
  image: { label: 'صور', icon: <ImageIcon />, color: '#2196f3' },
  video: { label: 'فيديو', icon: <VideoIcon />, color: '#f44336' },
  audio: { label: 'صوت', icon: <AudioIcon />, color: '#ff9800' },
  document: { label: 'مستندات', icon: <DocIcon />, color: '#4caf50' },
  archive: { label: 'أرشيف', icon: <ArchiveIcon />, color: '#9c27b0' },
  other: { label: 'أخرى', icon: <FileIcon />, color: '#607d8b' },
};

const CATEGORIES = [
  'عام', 'صور المؤسسة', 'صور الفعاليات', 'صور الموظفين',
  'فيديوهات تعليمية', 'فيديوهات توعوية', 'تسجيلات صوتية',
  'مستندات رسمية', 'عروض تقديمية', 'تصاميم', 'شعارات', 'أخرى',
];

/* ─── Helper Components ────────────────────────────────────────────────────── */
const MediaTypeIcon = ({ type, size = 24 }) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.other;
  return (
    <Avatar sx={{ width: size, height: size, bgcolor: `${config.color}15`, color: config.color }}>
      {React.cloneElement(config.icon, { sx: { fontSize: size * 0.6 } })}
    </Avatar>
  );
};

const MediaThumbnail = ({ item, onClick, height = 160 }) => {
  const isImg = item.mediaType === 'image';
  const isVid = item.mediaType === 'video';
  const config = TYPE_CONFIG[item.mediaType] || TYPE_CONFIG.other;

  return (
    <Box
      onClick={onClick}
      sx={{
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: `${config.color}08`,
        borderRadius: 2,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'scale(1.02)' },
        position: 'relative',
      }}
    >
      {isImg && item.url ? (
        <Box
          component="img"
          src={item.url}
          alt={item.title || item.originalName}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <Box sx={{ textAlign: 'center' }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: `${config.color}20`, color: config.color, mx: 'auto', mb: 1 }}>
            {React.cloneElement(config.icon, { sx: { fontSize: 28 } })}
          </Avatar>
          <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
            {config.label}
          </Typography>
        </Box>
      )}
      {isVid && (
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <Avatar sx={{ bgcolor: 'rgba(0,0,0,0.6)', width: 40, height: 40 }}>
            <VideoIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Avatar>
        </Box>
      )}
    </Box>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function MediaLibrary() {
  const showSnackbar = useSnackbar();

  /* ── State ───────────────────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [media, setMedia] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 0 });
  const [albums, setAlbums] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [filters, setFilters] = useState({ mediaType: '', category: '', search: '', album: '' });
  const [selected, setSelected] = useState([]);
  const [page, setPage] = useState(1);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editItem, setEditItem] = useState(null);
  const [previewItem, setPreviewItem] = useState(null);
  const [albumDialog, setAlbumDialog] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [newAlbumDesc, setNewAlbumDesc] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [contextItem, setContextItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', category: 'عام', tags: '' });

  /* ── Data Loading ────────────────────────────────────────────────────── */
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await mediaService.getDashboard();
      setDashboard(data);
      setAlbums(data.albums || []);
    } catch (err) {
      logger.error('MediaLibrary loadDashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMedia = useCallback(async (p = 1) => {
    try {
      const params = { page: p, limit: 24 };
      if (filters.mediaType) params.mediaType = filters.mediaType;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.album) params.album = filters.album;
      if (tabValue === 2) params.favorites = 'true';

      const result = await mediaService.list(params);
      setMedia(result.data || []);
      setPagination(result.pagination || { total: 0, page: 1, pages: 0 });
    } catch (err) {
      logger.error('MediaLibrary loadMedia:', err);
    }
  }, [filters, tabValue]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { if (tabValue >= 1) loadMedia(page); }, [loadMedia, page, tabValue]);

  /* ── Upload Handlers ─────────────────────────────────────────────────── */
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      if (files.length === 1) {
        await mediaService.upload(files[0], {
          category: filters.category || 'عام',
          album: filters.album || undefined,
          onProgress: (ev) => setUploadProgress(Math.round((ev.loaded * 100) / ev.total)),
        });
      } else {
        await mediaService.uploadBulk(files, {
          category: filters.category || 'عام',
          album: filters.album || undefined,
          onProgress: (ev) => setUploadProgress(Math.round((ev.loaded * 100) / ev.total)),
        });
      }
      showSnackbar(`تم تحميل ${files.length} ملف بنجاح`, 'success');
      loadDashboard();
      if (tabValue >= 1) loadMedia(1);
    } catch (err) {
      logger.error('Upload error:', err);
      showSnackbar('خطأ في تحميل الملفات', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadOpen(false);
    }
  };

  /* ── CRUD Handlers ───────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    try {
      await mediaService.delete(id);
      showSnackbar('تم حذف الملف بنجاح', 'success');
      loadMedia(page);
      loadDashboard();
    } catch { showSnackbar('خطأ في حذف الملف', 'error'); }
    setAnchorEl(null);
  };

  const handleToggleFavorite = async (id) => {
    try {
      await mediaService.toggleFavorite(id);
      loadMedia(page);
    } catch { showSnackbar('خطأ في تحديث المفضلة', 'error'); }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    try {
      await mediaService.bulkDelete(selected);
      showSnackbar(`تم حذف ${selected.length} ملف`, 'success');
      setSelected([]);
      loadMedia(page);
      loadDashboard();
    } catch { showSnackbar('خطأ في الحذف الجماعي', 'error'); }
  };

  const handleCreateAlbum = async () => {
    if (!newAlbumName) return;
    try {
      await mediaService.createAlbum({ name: newAlbumName, description: newAlbumDesc });
      showSnackbar('تم إنشاء الألبوم بنجاح', 'success');
      setAlbumDialog(false);
      setNewAlbumName('');
      setNewAlbumDesc('');
      loadDashboard();
    } catch { showSnackbar('خطأ في إنشاء الألبوم', 'error'); }
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    try {
      await mediaService.update(editItem._id, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        tags: editForm.tags,
      });
      showSnackbar('تم تحديث البيانات بنجاح', 'success');
      setEditItem(null);
      loadMedia(page);
    } catch { showSnackbar('خطأ في تحديث البيانات', 'error'); }
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'عام',
      tags: (item.tags || []).join(', '),
    });
    setAnchorEl(null);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  /* ── Stats from dashboard ────────────────────────────────────────────── */
  const stats = dashboard?.stats || {};
  const recent = dashboard?.recent || [];
  const favorites = dashboard?.favorites || [];

  /* ── Render ──────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل مكتبة الوسائط...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ═══ Header ═══════════════════════════════════════════════════════ */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <MediaIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>مكتبة الوسائط</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إدارة شاملة للصور والفيديو والصوت والمستندات
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="تحديث">
                <IconButton sx={{ color: '#fff' }} onClick={() => { loadDashboard(); if (tabValue >= 1) loadMedia(page); }}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                component="label"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)', color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                رفع ملفات
                <input type="file" hidden multiple accept={mediaService.getAcceptedTypes('all')} onChange={handleUpload} />
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ═══ KPI Cards ════════════════════════════════════════════════════ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الملفات', value: stats.totalFiles || 0, icon: <CloudIcon />, color: brandColors.primary },
          { label: 'المساحة المستخدمة', value: stats.totalSizeFormatted || '0 B', icon: <StorageIcon />, color: statusColors.info },
          { label: 'نسبة الاستخدام', value: `${stats.usagePercent || 0}%`, icon: <TrendUpIcon />, color: stats.usagePercent > 80 ? statusColors.error : statusColors.success },
          { label: 'الألبومات', value: albums.length, icon: <FolderIcon />, color: statusColors.warning },
        ].map((kpi, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
              <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: kpi.color }}>{kpi.value}</Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>{kpi.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ═══ Storage Bar ══════════════════════════════════════════════════ */}
      <Card sx={{ mb: 3, borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight={600}>المساحة التخزينية</Typography>
            <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
              {stats.totalSizeFormatted || '0 B'} / {stats.quotaFormatted || '5.0 GB'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(stats.usagePercent || 0, 100)}
            sx={{
              height: 10, borderRadius: 5,
              bgcolor: surfaceColors.background,
              '& .MuiLinearProgress-bar': {
                borderRadius: 5,
                background: (stats.usagePercent || 0) > 80 ? statusColors.error : gradients.primary,
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 2, mt: 1.5, flexWrap: 'wrap' }}>
            {(stats.byType || []).map((t) => {
              const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.other;
              return (
                <Chip
                  key={t.type}
                  size="small"
                  icon={React.cloneElement(cfg.icon, { style: { color: cfg.color, fontSize: 16 } })}
                  label={`${cfg.label}: ${t.count} (${t.sizeFormatted})`}
                  sx={{ bgcolor: `${cfg.color}10`, color: cfg.color, fontWeight: 600 }}
                />
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* ═══ Main Tabs ════════════════════════════════════════════════════ */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => { setTabValue(v); setPage(1); setSelected([]); }}
          sx={{ borderBottom: `1px solid ${surfaceColors.border}`, px: 2 }}
        >
          <Tab label="نظرة عامة" />
          <Tab label="جميع الملفات" />
          <Tab label="المفضلة" />
          <Tab label="الألبومات" />
        </Tabs>

        <CardContent sx={{ pt: 3, minHeight: 400 }}>
          {/* ─── Tab 0: Overview ──────────────────────────────────────── */}
          {tabValue === 0 && (
            <Box>
              {/* Type Distribution */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                توزيع الوسائط حسب النوع
              </Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                  const typeData = (stats.byType || []).find(t => t.type === type) || { count: 0, sizeFormatted: '0 B' };
                  return (
                    <Grid item xs={6} sm={4} md={2} key={type}>
                      <Paper
                        sx={{
                          p: 2, textAlign: 'center', borderRadius: 2.5,
                          border: `1px solid ${surfaceColors.border}`,
                          cursor: 'pointer', transition: 'all 0.2s',
                          '&:hover': { borderColor: cfg.color, transform: 'translateY(-2px)', boxShadow: 2 },
                        }}
                        onClick={() => { setFilters(f => ({ ...f, mediaType: type })); setTabValue(1); }}
                      >
                        <Avatar sx={{ bgcolor: `${cfg.color}15`, color: cfg.color, mx: 'auto', mb: 1, width: 48, height: 48 }}>
                          {React.cloneElement(cfg.icon, { sx: { fontSize: 24 } })}
                        </Avatar>
                        <Typography variant="h6" fontWeight={800} sx={{ color: cfg.color }}>
                          {typeData.count}
                        </Typography>
                        <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                          {cfg.label}
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ color: neutralColors.textSecondary, fontSize: '0.7rem' }}>
                          {typeData.sizeFormatted}
                        </Typography>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Recent Files */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                آخر الملفات المرفوعة
              </Typography>
              <Grid container spacing={2} sx={{ mb: 4 }}>
                {(recent.length > 0 ? recent : []).map((item, i) => (
                  <Grid item xs={6} sm={4} md={3} key={item._id || i}>
                    <Card
                      sx={{
                        borderRadius: 2, overflow: 'hidden', cursor: 'pointer',
                        border: `1px solid ${surfaceColors.border}`,
                        transition: 'all 0.2s',
                        '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' },
                      }}
                      onClick={() => setPreviewItem(item)}
                    >
                      <MediaThumbnail item={item} height={140} />
                      <CardContent sx={{ py: 1.5, px: 2 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{item.title || item.originalName}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
                          <Chip
                            size="small"
                            label={(TYPE_CONFIG[item.mediaType] || TYPE_CONFIG.other).label}
                            sx={{ height: 20, fontSize: '0.7rem', bgcolor: `${(TYPE_CONFIG[item.mediaType] || TYPE_CONFIG.other).color}15`, color: (TYPE_CONFIG[item.mediaType] || TYPE_CONFIG.other).color }}
                          />
                          <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                            {item.formattedSize}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {recent.length === 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: surfaceColors.background, borderRadius: 2 }}>
                      <UploadIcon sx={{ fontSize: 48, color: neutralColors.textSecondary, mb: 1 }} />
                      <Typography variant="body1" sx={{ color: neutralColors.textSecondary }}>
                        لا توجد ملفات بعد. ابدأ برفع ملفاتك الأولى!
                      </Typography>
                      <Button variant="contained" startIcon={<UploadIcon />} component="label" sx={{ mt: 2, borderRadius: 2 }}>
                        رفع ملفات
                        <input type="file" hidden multiple accept={mediaService.getAcceptedTypes('all')} onChange={handleUpload} />
                      </Button>
                    </Paper>
                  </Grid>
                )}
              </Grid>

              {/* Albums Preview */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <FolderIcon sx={{ color: statusColors.warning }} /> الألبومات
                <Button size="small" sx={{ mr: 'auto' }} onClick={() => setAlbumDialog(true)} startIcon={<NewFolderIcon />}>
                  ألبوم جديد
                </Button>
              </Typography>
              <Grid container spacing={2}>
                {albums.map((album) => (
                  <Grid item xs={6} sm={4} md={3} key={album._id}>
                    <Paper
                      sx={{
                        p: 2, borderRadius: 2.5, cursor: 'pointer',
                        border: `2px solid ${album.color || surfaceColors.border}`,
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 2 },
                      }}
                      onClick={() => { setFilters(f => ({ ...f, album: album._id })); setTabValue(1); }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Avatar sx={{ bgcolor: `${album.color || brandColors.primary}15`, color: album.color || brandColors.primary }}>
                          <FolderIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{album.name}</Typography>
                          <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                            {album.mediaCount || 0} ملف
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
                {albums.length === 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ color: neutralColors.textSecondary, textAlign: 'center', py: 2 }}>
                      لا توجد ألبومات بعد
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* ─── Tab 1 & 2: All Files / Favorites ────────────────────── */}
          {(tabValue === 1 || tabValue === 2) && (
            <Box>
              {/* Toolbar */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  size="small"
                  placeholder="بحث في الوسائط..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && loadMedia(1)}
                  sx={{ minWidth: 220 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 20 }} /></InputAdornment>,
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>النوع</InputLabel>
                  <Select
                    value={filters.mediaType}
                    label="النوع"
                    onChange={(e) => { setFilters(f => ({ ...f, mediaType: e.target.value })); setPage(1); }}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <MenuItem key={k} value={k}>{v.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>التصنيف</InputLabel>
                  <Select
                    value={filters.category}
                    label="التصنيف"
                    onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
                  >
                    <MenuItem value="">الكل</MenuItem>
                    {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
                <Button
                  size="small"
                  onClick={() => { setFilters({ mediaType: '', category: '', search: '', album: '' }); setPage(1); }}
                >
                  مسح الفلاتر
                </Button>
                <Box sx={{ flex: 1 }} />
                {selected.length > 0 && (
                  <Button color="error" size="small" startIcon={<DeleteIcon />} onClick={handleBulkDelete}>
                    حذف ({selected.length})
                  </Button>
                )}
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)}>
                  <ToggleButton value="grid"><GridViewIcon fontSize="small" /></ToggleButton>
                  <ToggleButton value="list"><ListViewIcon fontSize="small" /></ToggleButton>
                </ToggleButtonGroup>
                <Button variant="contained" size="small" startIcon={<UploadIcon />} component="label" sx={{ borderRadius: 2 }}>
                  رفع
                  <input type="file" hidden multiple accept={mediaService.getAcceptedTypes('all')} onChange={handleUpload} />
                </Button>
              </Box>

              {uploading && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    جاري الرفع... {uploadProgress}%
                  </Typography>
                </Box>
              )}

              {/* Grid View */}
              {viewMode === 'grid' ? (
                <Grid container spacing={2}>
                  {media.map((item) => {
                    const isSelected = selected.includes(item._id);
                    return (
                      <Grid item xs={6} sm={4} md={3} lg={2} key={item._id}>
                        <Card
                          sx={{
                            borderRadius: 2, overflow: 'hidden', position: 'relative',
                            border: isSelected ? `2px solid ${brandColors.primary}` : `1px solid ${surfaceColors.border}`,
                            transition: 'all 0.2s',
                            '&:hover': { boxShadow: 3 },
                            '&:hover .media-actions': { opacity: 1 },
                          }}
                        >
                          <MediaThumbnail item={item} height={120} onClick={() => setPreviewItem(item)} />
                          {/* Overlay actions */}
                          <Box
                            className="media-actions"
                            sx={{
                              position: 'absolute', top: 4, right: 4, left: 4,
                              display: 'flex', justifyContent: 'space-between',
                              opacity: 0, transition: 'opacity 0.2s',
                            }}
                          >
                            <IconButton
                              size="small"
                              sx={{ bgcolor: 'rgba(255,255,255,0.9)', '&:hover': { bgcolor: '#fff' } }}
                              onClick={(e) => { e.stopPropagation(); toggleSelect(item._id); }}
                            >
                              {isSelected ? <CheckIcon color="primary" fontSize="small" /> : <Box sx={{ width: 18, height: 18, border: '2px solid #999', borderRadius: 0.5 }} />}
                            </IconButton>
                            <Box>
                              <IconButton
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.9)', ml: 0.5, '&:hover': { bgcolor: '#fff' } }}
                                onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item._id); }}
                              >
                                {item.isFavorite ? <StarIcon sx={{ color: statusColors.warning, fontSize: 18 }} /> : <StarBorderIcon sx={{ fontSize: 18 }} />}
                              </IconButton>
                              <IconButton
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.9)', ml: 0.5, '&:hover': { bgcolor: '#fff' } }}
                                onClick={(e) => { e.stopPropagation(); setContextItem(item); setAnchorEl(e.currentTarget); }}
                              >
                                <MoreIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Box>
                          </Box>
                          <CardContent sx={{ py: 1, px: 1.5 }}>
                            <Typography variant="caption" fontWeight={600} noWrap display="block">
                              {item.title || item.originalName}
                            </Typography>
                            <Typography variant="caption" sx={{ color: neutralColors.textSecondary, fontSize: '0.65rem' }}>
                              {item.formattedSize}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                  {media.length === 0 && (
                    <Grid item xs={12}>
                      <Paper sx={{ p: 4, textAlign: 'center', bgcolor: surfaceColors.background, borderRadius: 2 }}>
                        <FileIcon sx={{ fontSize: 48, color: neutralColors.textSecondary, mb: 1 }} />
                        <Typography sx={{ color: neutralColors.textSecondary }}>
                          {tabValue === 2 ? 'لا توجد ملفات مفضلة' : 'لا توجد ملفات'}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              ) : (
                /* List View */
                <Box>
                  {media.map((item) => {
                    const cfg = TYPE_CONFIG[item.mediaType] || TYPE_CONFIG.other;
                    const isSelected = selected.includes(item._id);
                    return (
                      <Paper
                        key={item._id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 2, p: 1.5, mb: 1,
                          borderRadius: 2, cursor: 'pointer',
                          border: isSelected ? `2px solid ${brandColors.primary}` : `1px solid ${surfaceColors.border}`,
                          '&:hover': { bgcolor: surfaceColors.background },
                        }}
                        onClick={() => setPreviewItem(item)}
                      >
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); toggleSelect(item._id); }}>
                          {isSelected ? <CheckIcon color="primary" /> : <Box sx={{ width: 18, height: 18, border: '2px solid #ccc', borderRadius: 0.5 }} />}
                        </IconButton>
                        <Avatar sx={{ bgcolor: `${cfg.color}15`, color: cfg.color }}>
                          {cfg.icon}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{item.title || item.originalName}</Typography>
                          <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                            {cfg.label} · {item.formattedSize} · {item.uploadedBy?.name || '-'}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: neutralColors.textSecondary, mx: 1 }}>
                          {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                        </Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item._id); }}>
                          {item.isFavorite ? <StarIcon sx={{ color: statusColors.warning }} /> : <StarBorderIcon />}
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setContextItem(item); setAnchorEl(e.currentTarget); }}>
                          <MoreIcon />
                        </IconButton>
                      </Paper>
                    );
                  })}
                </Box>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={pagination.pages}
                    page={page}
                    onChange={(_, p) => { setPage(p); loadMedia(p); }}
                    color="primary"
                  />
                </Box>
              )}
            </Box>
          )}

          {/* ─── Tab 3: Albums ────────────────────────────────────────── */}
          {tabValue === 3 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>إدارة الألبومات</Typography>
                <Button variant="contained" size="small" startIcon={<NewFolderIcon />} onClick={() => setAlbumDialog(true)} sx={{ borderRadius: 2 }}>
                  ألبوم جديد
                </Button>
              </Box>
              <Grid container spacing={2}>
                {albums.map((album) => (
                  <Grid item xs={12} sm={6} md={4} key={album._id}>
                    <Card
                      sx={{
                        borderRadius: 2.5, border: `2px solid ${album.color || surfaceColors.border}`,
                        cursor: 'pointer', transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                      }}
                      onClick={() => { setFilters(f => ({ ...f, album: album._id })); setTabValue(1); }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ width: 56, height: 56, bgcolor: `${album.color || brandColors.primary}15`, color: album.color || brandColors.primary }}>
                            <FolderIcon sx={{ fontSize: 28 }} />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{album.name}</Typography>
                            <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                              {album.mediaCount || 0} ملف
                            </Typography>
                            {album.description && (
                              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }} noWrap>
                                {album.description}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {albums.length === 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: surfaceColors.background, borderRadius: 2 }}>
                      <FolderIcon sx={{ fontSize: 48, color: neutralColors.textSecondary, mb: 1 }} />
                      <Typography sx={{ color: neutralColors.textSecondary }}>لا توجد ألبومات بعد</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ═══ Context Menu ═════════════════════════════════════════════════ */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem onClick={() => { setPreviewItem(contextItem); setAnchorEl(null); }}>
          <PreviewIcon sx={{ mr: 1, fontSize: 20 }} /> معاينة
        </MenuItem>
        <MenuItem onClick={() => openEdit(contextItem)}>
          <EditIcon sx={{ mr: 1, fontSize: 20 }} /> تعديل
        </MenuItem>
        {contextItem && (
          <MenuItem component="a" href={mediaService.getDownloadUrl(contextItem._id)} target="_blank" onClick={() => setAnchorEl(null)}>
            <DownloadIcon sx={{ mr: 1, fontSize: 20 }} /> تحميل
          </MenuItem>
        )}
        <Divider />
        <MenuItem sx={{ color: statusColors.error }} onClick={() => contextItem && handleDelete(contextItem._id)}>
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} /> حذف
        </MenuItem>
      </Menu>

      {/* ═══ Preview Dialog ═══════════════════════════════════════════════ */}
      <Dialog open={Boolean(previewItem)} onClose={() => setPreviewItem(null)} maxWidth="md" fullWidth>
        {previewItem && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700} noWrap sx={{ flex: 1 }}>
                {previewItem.title || previewItem.originalName}
              </Typography>
              <IconButton onClick={() => setPreviewItem(null)}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                {previewItem.mediaType === 'image' && previewItem.url ? (
                  <Box component="img" src={previewItem.url} alt={previewItem.title} sx={{ maxWidth: '100%', maxHeight: 500, borderRadius: 2 }} />
                ) : previewItem.mediaType === 'video' && previewItem.url ? (
                  <Box component="video" controls src={previewItem.url} sx={{ maxWidth: '100%', maxHeight: 500, borderRadius: 2 }} />
                ) : previewItem.mediaType === 'audio' && previewItem.url ? (
                  <Box component="audio" controls src={previewItem.url} sx={{ width: '100%', mt: 4 }} />
                ) : (
                  <Box sx={{ py: 4 }}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: `${(TYPE_CONFIG[previewItem.mediaType] || TYPE_CONFIG.other).color}15`, color: (TYPE_CONFIG[previewItem.mediaType] || TYPE_CONFIG.other).color, mx: 'auto', mb: 2 }}>
                      {React.cloneElement((TYPE_CONFIG[previewItem.mediaType] || TYPE_CONFIG.other).icon, { sx: { fontSize: 40 } })}
                    </Avatar>
                    <Typography>{previewItem.originalName}</Typography>
                  </Box>
                )}
              </Box>
              <Grid container spacing={2}>
                {[
                  { label: 'النوع', value: (TYPE_CONFIG[previewItem.mediaType] || TYPE_CONFIG.other).label },
                  { label: 'الحجم', value: previewItem.formattedSize },
                  { label: 'الصيغة', value: previewItem.extension || previewItem.mimeType },
                  { label: 'رفع بواسطة', value: previewItem.uploadedBy?.name || '-' },
                  { label: 'تاريخ الرفع', value: new Date(previewItem.createdAt).toLocaleDateString('ar-SA') },
                  { label: 'التصنيف', value: previewItem.category || 'عام' },
                ].map((info, i) => (
                  <Grid item xs={6} sm={4} key={i}>
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>{info.label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{info.value}</Typography>
                  </Grid>
                ))}
              </Grid>
              {previewItem.tags?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>الوسوم</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {previewItem.tags.map((tag, i) => <Chip key={i} label={tag} size="small" />)}
                  </Box>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                component="a"
                href={mediaService.getDownloadUrl(previewItem._id)}
                target="_blank"
                startIcon={<DownloadIcon />}
              >
                تحميل
              </Button>
              <Button onClick={() => { openEdit(previewItem); setPreviewItem(null); }} startIcon={<EditIcon />}>
                تعديل
              </Button>
              <Button onClick={() => setPreviewItem(null)}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ═══ Edit Dialog ══════════════════════════════════════════════════ */}
      <Dialog open={Boolean(editItem)} onClose={() => setEditItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل بيانات الوسيط</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="العنوان"
              value={editForm.title}
              onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
              fullWidth size="small"
            />
            <TextField
              label="الوصف"
              value={editForm.description}
              onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
              fullWidth size="small" multiline rows={2}
            />
            <FormControl fullWidth size="small">
              <InputLabel>التصنيف</InputLabel>
              <Select
                value={editForm.category}
                label="التصنيف"
                onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="الوسوم (مفصولة بفاصلة)"
              value={editForm.tags}
              onChange={(e) => setEditForm(f => ({ ...f, tags: e.target.value }))}
              fullWidth size="small"
              placeholder="صورة, فعالية, 2026"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditItem(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleEditSave} sx={{ borderRadius: 2 }}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* ═══ New Album Dialog ═════════════════════════════════════════════ */}
      <Dialog open={albumDialog} onClose={() => setAlbumDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إنشاء ألبوم جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="اسم الألبوم"
              value={newAlbumName}
              onChange={(e) => setNewAlbumName(e.target.value)}
              fullWidth size="small" autoFocus
            />
            <TextField
              label="الوصف (اختياري)"
              value={newAlbumDesc}
              onChange={(e) => setNewAlbumDesc(e.target.value)}
              fullWidth size="small" multiline rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlbumDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateAlbum} disabled={!newAlbumName} sx={{ borderRadius: 2 }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
