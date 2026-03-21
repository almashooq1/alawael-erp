import { useState, useEffect } from 'react';




import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const BADGE_TYPES = [
  {
    value: 'gold',
    label: 'ذهبي',
    icon: '🥇',
    color: '#ca8a04',
    bg: 'linear-gradient(135deg, #fef3c7, #fde68a)',
  },
  {
    value: 'silver',
    label: 'فضي',
    icon: '🥈',
    color: '#71717a',
    bg: 'linear-gradient(135deg, #f4f4f5, #d4d4d8)',
  },
  {
    value: 'bronze',
    label: 'برونزي',
    icon: '🥉',
    color: '#b45309',
    bg: 'linear-gradient(135deg, #fef3c7, #fed7aa)',
  },
  {
    value: 'platinum',
    label: 'بلاتيني',
    icon: '💎',
    color: '#6366f1',
    bg: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)',
  },
  {
    value: 'special',
    label: 'مميز',
    icon: '🌟',
    color: '#be185d',
    bg: 'linear-gradient(135deg, #fce7f3, #fbcfe8)',
  },
];

const CATEGORIES = [
  { value: 'clinical-excellence', label: 'تميز سريري', icon: '🏥' },
  { value: 'patient-outcomes', label: 'نتائج المرضى', icon: '📈' },
  { value: 'research', label: 'بحث علمي', icon: '🔬' },
  { value: 'training', label: 'تدريب', icon: '🎓' },
  { value: 'teamwork', label: 'عمل جماعي', icon: '🤝' },
  { value: 'innovation', label: 'ابتكار', icon: '💡' },
  { value: 'milestone', label: 'إنجاز مرحلي', icon: '🎯' },
  { value: 'community', label: 'خدمة مجتمعية', icon: '🌍' },
];

const TherapistAchievements = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const [achievements, setAchievements] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form, setForm] = useState({
    therapistName: '',
    badgeType: 'gold',
    title: '',
    titleEn: '',
    description: '',
    icon: '🏆',
    category: 'clinical-excellence',
    points: '',
    earnedDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await therapistService.getAchievements();
      setAchievements(res?.data || []);
      setStats(res?.stats || {});
    } catch (err) {
      logger.error('fetchAchievements error:', err);
      showSnackbar('خطأ في تحميل الإنجازات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title || !form.therapistName) {
      showSnackbar('يرجى إدخال البيانات المطلوبة', 'warning');
      return;
    }
    try {
      const payload = { ...form, points: Number(form.points) || 0 };
      if (editData) {
        await therapistService.updateAchievement(editData.id, payload);
        showSnackbar('تم التحديث', 'success');
      } else {
        await therapistService.createAchievement(payload);
        showSnackbar('تم الإنشاء', 'success');
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await therapistService.deleteAchievement(id);
      showSnackbar('تم الحذف', 'success');
      fetchData();
    } catch (err) {
      showSnackbar('خطأ', 'error');
    }
  };

  const resetForm = () => {
    setForm({
      therapistName: '',
      badgeType: 'gold',
      title: '',
      titleEn: '',
      description: '',
      icon: '🏆',
      category: 'clinical-excellence',
      points: '',
      earnedDate: '',
    });
    setEditData(null);
  };

  const openEdit = a => {
    setEditData(a);
    setForm({
      therapistName: a.therapistName,
      badgeType: a.badgeType,
      title: a.title,
      titleEn: a.titleEn || '',
      description: a.description || '',
      icon: a.icon || '🏆',
      category: a.category,
      points: String(a.points || ''),
      earnedDate: a.earnedDate ? new Date(a.earnedDate).toISOString().split('T')[0] : '',
    });
    setDialogOpen(true);
  };

  const filtered = achievements.filter(a => {
    const matchSearch =
      !search ||
      a.title?.includes(search) ||
      a.therapistName?.includes(search) ||
      a.titleEn?.toLowerCase().includes(search.toLowerCase());
    const matchBadge = badgeFilter === 'all' || a.badgeType === badgeFilter;
    const matchCat = catFilter === 'all' || a.category === catFilter;
    return matchSearch && matchBadge && matchCat;
  });

  const getBadge = v => BADGE_TYPES.find(b => b.value === v) || BADGE_TYPES[0];
  const getCat = v => CATEGORIES.find(c => c.value === v) || CATEGORIES[0];

  const EMOJI_OPTIONS = ['🏆', '⭐', '🎖️', '🏅', '💪', '🚀', '🧠', '❤️', '🎉', '🌈', '📊', '🔥'];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #ca8a04 0%, #fde68a 100%)',
          color: '#fff',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
            <TrophyIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
            >
              لوحة الإنجازات
            </Typography>
            <Typography
              variant="body2"
              sx={{ opacity: 0.9, textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
            >
              تكريم الإنجازات والشارات والمعالم المهنية
            </Typography>
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الإنجازات', value: stats.total || 0, color: '#ca8a04' },
          { label: 'إجمالي النقاط', value: stats.totalPoints || 0, color: '#6366f1' },
          { label: 'شارات ذهبية', value: stats.gold || 0, color: '#eab308' },
          { label: 'شارات بلاتينية', value: stats.platinum || 0, color: '#8b5cf6' },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper
              sx={{ p: 2, textAlign: 'center', borderRadius: 2, border: `2px solid ${s.color}20` }}
            >
              <Typography variant="h4" fontWeight={800} color={s.color}>
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <TextField
          size="small"
          placeholder="بحث..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>نوع الشارة</InputLabel>
          <Select
            value={badgeFilter}
            onChange={e => setBadgeFilter(e.target.value)}
            label="نوع الشارة"
          >
            <MenuItem value="all">الكل</MenuItem>
            {BADGE_TYPES.map(b => (
              <MenuItem key={b.value} value={b.value}>
                {b.icon} {b.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>الفئة</InputLabel>
          <Select value={catFilter} onChange={e => setCatFilter(e.target.value)} label="الفئة">
            <MenuItem value="all">الكل</MenuItem>
            {CATEGORIES.map(c => (
              <MenuItem key={c.value} value={c.value}>
                {c.icon} {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm();
            setDialogOpen(true);
          }}
          sx={{ bgcolor: '#ca8a04', '&:hover': { bgcolor: '#a16207' } }}
        >
          إنجاز جديد
        </Button>
      </Paper>

      {loading ? (
        <Typography textAlign="center" color="text.secondary" py={4}>
          جاري التحميل...
        </Typography>
      ) : filtered.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
          <TrophyIcon sx={{ fontSize: 48, color: '#ca8a04', opacity: 0.4, mb: 1 }} />
          <Typography color="text.secondary">لا توجد إنجازات بعد</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(a => {
            const badge = getBadge(a.badgeType);
            const cat = getCat(a.category);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={a.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
                    transition: '0.3s',
                  }}
                >
                  <Box
                    sx={{ background: badge.bg, p: 2.5, textAlign: 'center', position: 'relative' }}
                  >
                    <Box
                      sx={{
                        fontSize: '3rem',
                        mb: 0.5,
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                      }}
                    >
                      {a.icon || '🏆'}
                    </Box>
                    <Chip
                      label={badge.icon + ' ' + badge.label}
                      size="small"
                      sx={{ bgcolor: 'rgba(255,255,255,0.7)', fontWeight: 700, color: badge.color }}
                    />
                    {a.points > 0 && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          bgcolor: 'rgba(255,255,255,0.85)',
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" fontWeight={800} color={badge.color}>
                          {a.points}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography fontWeight={700} sx={{ mb: 0.3 }}>
                      {a.title}
                    </Typography>
                    {a.titleEn && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5, fontStyle: 'italic' }}
                      >
                        {a.titleEn}
                      </Typography>
                    )}
                    <Chip
                      icon={
                        <Typography sx={{ fontSize: '0.7rem !important' }}>{cat.icon}</Typography>
                      }
                      label={cat.label}
                      size="small"
                      sx={{ mb: 1, fontSize: '0.65rem' }}
                    />
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {a.therapistName}
                    </Typography>
                    {a.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {a.description}
                      </Typography>
                    )}
                    {a.earnedDate && (
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 0.5,
                          mt: 1,
                        }}
                      >
                        <DateIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(a.earnedDate).toLocaleDateString('ar-SA')}
                        </Typography>
                      </Box>
                    )}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => openEdit(a)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => handleDelete(a.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {editData ? 'تعديل الإنجاز' : 'إنجاز جديد'}
          <IconButton onClick={() => setDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="عنوان الإنجاز"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان بالإنجليزية"
                value={form.titleEn}
                onChange={e => setForm({ ...form, titleEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم المعالج"
                value={form.therapistName}
                onChange={e => setForm({ ...form, therapistName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={3}>
              <FormControl fullWidth>
                <InputLabel>نوع الشارة</InputLabel>
                <Select
                  value={form.badgeType}
                  onChange={e => setForm({ ...form, badgeType: e.target.value })}
                  label="نوع الشارة"
                >
                  {BADGE_TYPES.map(b => (
                    <MenuItem key={b.value} value={b.value}>
                      {b.icon} {b.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={3}>
              <TextField
                fullWidth
                type="number"
                label="النقاط"
                value={form.points}
                onChange={e => setForm({ ...form, points: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  label="الفئة"
                >
                  {CATEGORIES.map(c => (
                    <MenuItem key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الحصول"
                value={form.earnedDate}
                onChange={e => setForm({ ...form, earnedDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>الأيقونة</InputLabel>
                <Select
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                  label="الأيقونة"
                >
                  {EMOJI_OPTIONS.map(e => (
                    <MenuItem key={e} value={e} sx={{ fontSize: '1.5rem' }}>
                      {e}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ bgcolor: '#ca8a04', '&:hover': { bgcolor: '#a16207' } }}
          >
            {editData ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistAchievements;
