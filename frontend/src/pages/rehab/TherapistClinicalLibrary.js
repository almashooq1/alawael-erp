import { useState, useEffect } from 'react';




import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { statusColors, neutralColors, surfaceColors } from '../../theme/palette';

const CATEGORIES = [
  { value: 'speech_therapy', label: 'علاج النطق', color: '#3b82f6', icon: '🗣️' },
  { value: 'occupational_therapy', label: 'العلاج الوظيفي', color: '#10b981', icon: '🖐️' },
  { value: 'physical_therapy', label: 'العلاج الطبيعي', color: '#f59e0b', icon: '🏃' },
  { value: 'behavioral_therapy', label: 'العلاج السلوكي', color: '#8b5cf6', icon: '🧠' },
  { value: 'autism_spectrum', label: 'طيف التوحد', color: '#ec4899', icon: '🧩' },
  { value: 'learning_disabilities', label: 'صعوبات التعلم', color: '#ef4444', icon: '📚' },
  { value: 'assessment_tools', label: 'أدوات التقييم', color: '#06b6d4', icon: '📋' },
  { value: 'general_rehabilitation', label: 'التأهيل العام', color: '#84cc16', icon: '🏥' },
];

const TYPES = [
  { value: 'protocol', label: 'بروتوكول', color: '#3b82f6' },
  { value: 'guideline', label: 'دليل إرشادي', color: '#10b981' },
  { value: 'research', label: 'بحث علمي', color: '#8b5cf6' },
  { value: 'tool', label: 'أداة', color: '#f59e0b' },
  { value: 'article', label: 'مقال', color: '#06b6d4' },
];

const TherapistClinicalLibrary = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'general_rehabilitation',
    type: 'article',
    content: '',
    tags: '',
    author: '',
    featured: false,
  });

  useEffect(() => {
    loadItems();
  }, []); // eslint-disable-line

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getLibraryItems();
      setItems(res?.items || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('Error loading library:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ...form,
        tags: form.tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      };
      await therapistService.addLibraryItem(payload);
      showSnackbar('تم إضافة المادة العلمية بنجاح', 'success');
      setCreateOpen(false);
      setForm({
        title: '',
        description: '',
        category: 'general_rehabilitation',
        type: 'article',
        content: '',
        tags: '',
        author: '',
        featured: false,
      });
      loadItems();
    } catch {
      showSnackbar('خطأ في الإضافة', 'error');
    }
  };

  const handleViewDetail = async id => {
    try {
      const res = await therapistService.getLibraryItem(id);
      setSelectedItem(res?.item || res);
      setDetailOpen(true);
    } catch {
      showSnackbar('خطأ في تحميل التفاصيل', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteLibraryItem(id);
      showSnackbar('تم حذف المادة', 'success');
      loadItems();
    } catch {
      showSnackbar('خطأ في الحذف', 'error');
    }
  };

  const filtered = items.filter(item => {
    const matchSearch =
      !search ||
      item.title?.includes(search) ||
      item.description?.includes(search) ||
      item.tags?.some(t => t.includes(search));
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchCat && matchType;
  });

  const featured = filtered.filter(i => i.featured);
  const regular = filtered.filter(i => !i.featured);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <LibraryIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                المكتبة العلمية
              </Typography>
              <Typography variant="body2">
                المراجع والبروتوكولات والأدلة الإرشادية السريرية
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            إضافة مادة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المواد',
            value: stats.totalItems || 0,
            color: statusColors.info,
            icon: <LibraryIcon />,
          },
          {
            label: 'البروتوكولات',
            value: stats.protocols || 0,
            color: '#3b82f6',
            icon: <ArticleIcon />,
          },
          { label: 'الأبحاث', value: stats.research || 0, color: '#8b5cf6', icon: <ScienceIcon /> },
          {
            label: 'الأدلة الإرشادية',
            value: stats.guidelines || 0,
            color: '#10b981',
            icon: <GuideIcon />,
          },
          { label: 'المميزة', value: stats.featured || 0, color: '#f59e0b', icon: <StarIcon /> },
          {
            label: 'التصنيفات',
            value: stats.categories || 0,
            color: '#ec4899',
            icon: <CategoryIcon />,
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Category Chips */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label="الكل"
          onClick={() => setCategoryFilter('all')}
          variant={categoryFilter === 'all' ? 'filled' : 'outlined'}
          color="primary"
        />
        {CATEGORIES.map(c => (
          <Chip
            key={c.value}
            label={`${c.icon} ${c.label}`}
            onClick={() => setCategoryFilter(c.value)}
            variant={categoryFilter === c.value ? 'filled' : 'outlined'}
            sx={categoryFilter === c.value ? { bgcolor: c.color, color: 'white' } : {}}
          />
        ))}
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="بحث في المكتبة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>النوع</InputLabel>
          <Select value={typeFilter} label="النوع" onChange={e => setTypeFilter(e.target.value)}>
            <MenuItem value="all">الكل</MenuItem>
            {TYPES.map(t => (
              <MenuItem value={t.value} key={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="textSecondary" sx={{ py: 4 }}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <LibraryIcon sx={{ fontSize: 60, color: neutralColors.divider, mb: 2 }} />
          <Typography color="textSecondary">لا توجد مواد علمية</Typography>
        </Paper>
      ) : (
        <>
          {/* Featured Section */}
          {featured.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <StarIcon color="warning" /> المواد المميزة
              </Typography>
              <Grid container spacing={2}>
                {featured.map(item => {
                  const cat = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[7];
                  const tp = TYPES.find(t => t.value === item.type) || TYPES[4];
                  return (
                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                      <Card
                        sx={{
                          borderRadius: 2,
                          border: `2px solid #f59e0b`,
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        <Box sx={{ bgcolor: cat.color + '15', p: 2, textAlign: 'center' }}>
                          <Typography variant="h3">{cat.icon}</Typography>
                        </Box>
                        <CardContent sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                            <Chip
                              label={cat.label}
                              size="small"
                              sx={{ bgcolor: cat.color + '20', color: cat.color }}
                            />
                            <Chip
                              label={tp.label}
                              size="small"
                              sx={{ bgcolor: tp.color + '20', color: tp.color }}
                            />
                            <StarIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                            {item.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                            {item.description?.slice(0, 100)}...
                          </Typography>
                          {item.tags?.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {item.tags.slice(0, 3).map((tag, idx) => (
                                <Chip key={idx} label={tag} size="small" variant="outlined" />
                              ))}
                            </Box>
                          )}
                        </CardContent>
                        <CardActions sx={{ px: 2, pb: 2 }}>
                          <Button
                            size="small"
                            startIcon={<ViewIcon />}
                            onClick={() => handleViewDetail(item.id)}
                          >
                            عرض
                          </Button>
                          <Box sx={{ flex: 1 }} />
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(item.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* Regular Items */}
          <Grid container spacing={2}>
            {regular.map(item => {
              const cat = CATEGORIES.find(c => c.value === item.category) || CATEGORIES[7];
              const tp = TYPES.find(t => t.value === item.type) || TYPES[4];
              return (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CardContent sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
                        <Typography sx={{ mr: 0.5 }}>{cat.icon}</Typography>
                        <Chip
                          label={cat.label}
                          size="small"
                          sx={{ bgcolor: cat.color + '20', color: cat.color }}
                        />
                        <Chip
                          label={tp.label}
                          size="small"
                          sx={{ bgcolor: tp.color + '20', color: tp.color }}
                        />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {item.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {item.description?.slice(0, 80)}
                      </Typography>
                      {item.author && (
                        <Typography variant="caption" color="textSecondary">
                          ✍️ {item.author}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2 }}>
                      <Button
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewDetail(item.id)}
                      >
                        عرض
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      <IconButton size="small" color="error" onClick={() => handleDelete(item.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Typography variant="h6">{selectedItem?.title}</Typography>
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={
                    CATEGORIES.find(c => c.value === selectedItem.category)?.label ||
                    selectedItem.category
                  }
                  color="primary"
                />
                <Chip
                  label={TYPES.find(t => t.value === selectedItem.type)?.label || selectedItem.type}
                  variant="outlined"
                />
                {selectedItem.featured && <Chip label="مميز" icon={<StarIcon />} color="warning" />}
              </Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedItem.description}
              </Typography>
              {selectedItem.content && (
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: surfaceColors?.background || '#f5f5f5',
                    borderRadius: 2,
                    mb: 2,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedItem.content}
                  </Typography>
                </Paper>
              )}
              {selectedItem.author && (
                <Typography variant="body2" color="textSecondary">
                  الكاتب: {selectedItem.author}
                </Typography>
              )}
              {selectedItem.tags?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 2, flexWrap: 'wrap' }}>
                  {selectedItem.tags.map((tag, idx) => (
                    <Chip key={idx} label={tag} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
              <Typography variant="caption" color="textSecondary" sx={{ mt: 2, display: 'block' }}>
                عدد المشاهدات: {selectedItem.views || 0}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LibraryIcon color="primary" />
            <Typography variant="h6">إضافة مادة علمية</Typography>
          </Box>
          <IconButton onClick={() => setCreateOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="العنوان"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={form.category}
                  label="التصنيف"
                  onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <MenuItem value={c.value} key={c.value}>
                      {c.icon} {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  value={form.type}
                  label="النوع"
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                >
                  {TYPES.map(t => (
                    <MenuItem value={t.value} key={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={4}
                label="المحتوى"
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="الكاتب"
                value={form.author}
                onChange={e => setForm(p => ({ ...p, author: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label="الوسوم (مفصولة بفاصلة)"
                value={form.tags}
                onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.title}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistClinicalLibrary;
