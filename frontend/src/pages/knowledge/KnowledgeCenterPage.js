/**
 * Knowledge Center Page — مركز المعرفة
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  LinearProgress,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  InputAdornment,
  CardActions,
  Rating,
  Divider,
} from '@mui/material';
import {
  MenuBook as BookIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  Visibility as ViewIcon,
  Category as CategoryIcon,
  Star as StarIcon,
  Article as ArticleIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import knowledgeCenterService from '../../services/knowledgeCenter.service';

const DEMO_ARTICLES = [
  {
    _id: '1',
    title: 'دليل برامج التأهيل الشامل',
    category: 'therapeutic_protocols',
    author: 'د. فاطمة الأحمد',
    description: 'دليل شامل لبرامج التأهيل المعتمدة في المركز وكيفية تطبيقها مع المستفيدين.',
    content:
      'يتضمن هذا الدليل برامج التأهيل الشامل المعتمدة في المركز بما في ذلك العلاج الطبيعي والوظيفي والنطق والتخاطب والتأهيل النفسي والاجتماعي.',
    tags: ['تأهيل', 'برامج', 'دليل'],
    views: 234,
    rating: 4.5,
    bookmarks: 18,
    createdAt: '2026-02-15',
    status: 'published',
  },
  {
    _id: '2',
    title: 'أفضل ممارسات التعليم الخاص',
    category: 'best_practices',
    author: 'أ. خالد العمري',
    description: 'مجموعة من أفضل الممارسات في مجال التعليم الخاص وفقاً لأحدث الأبحاث العلمية.',
    content:
      'تستعرض هذه المقالة أفضل الممارسات العالمية في تعليم ذوي الاحتياجات الخاصة بما فيها استراتيجيات التعليم الفردي والتكييف البيئي.',
    tags: ['تعليم', 'أفضل ممارسات'],
    views: 189,
    rating: 4.8,
    bookmarks: 27,
    createdAt: '2026-02-20',
    status: 'published',
  },
  {
    _id: '3',
    title: 'إجراءات السلامة في بيئة العمل',
    category: 'best_practices',
    author: 'م. سعد الشمري',
    description: 'كتيّب إجراءات السلامة والصحة المهنية الخاص بالمركز.',
    content:
      'يشمل هذا الكتيب إجراءات السلامة العامة وخطط الإخلاء وإجراءات الطوارئ ومعدات السلامة والتدريب على الإسعافات الأولية.',
    tags: ['سلامة', 'إجراءات'],
    views: 312,
    rating: 4.2,
    bookmarks: 41,
    createdAt: '2026-01-10',
    status: 'published',
  },
  {
    _id: '4',
    title: 'تقنيات العلاج الوظيفي الحديثة',
    category: 'therapeutic_protocols',
    author: 'د. نوف السعيد',
    description: 'استعراض أحدث التقنيات في العلاج الوظيفي وتطبيقاتها.',
    content:
      'تتناول هذه المقالة أحدث التقنيات المستخدمة في العلاج الوظيفي مثل الواقع الافتراضي والذكاء الاصطناعي والروبوتات المساعدة.',
    tags: ['علاج وظيفي', 'تقنيات'],
    views: 156,
    rating: 4.6,
    bookmarks: 22,
    createdAt: '2026-03-01',
    status: 'published',
  },
  {
    _id: '5',
    title: 'دليل استخدام النظام المالي',
    category: 'other',
    author: 'أ. محمد الحربي',
    description: 'شرح مفصل لاستخدام نظام المالية والمحاسبة في المنصة.',
    content:
      'يشرح هذا الدليل كيفية استخدام النظام المالي بما في ذلك إدارة الفواتير والمدفوعات والتقارير المالية والموازنات.',
    tags: ['مالية', 'دليل'],
    views: 98,
    rating: 3.9,
    bookmarks: 8,
    createdAt: '2026-03-10',
    status: 'draft',
  },
  {
    _id: '6',
    title: 'معايير جودة الخدمات التأهيلية',
    category: 'case_studies',
    author: 'د. ريم القحطاني',
    description: 'المعايير الوطنية والدولية لجودة خدمات التأهيل.',
    content:
      'تتناول هذه الدراسة المعايير الوطنية والدولية لجودة خدمات التأهيل مثل CARF و JCI ومعايير هيئة التخصصات الصحية.',
    tags: ['جودة', 'معايير'],
    views: 267,
    rating: 4.7,
    bookmarks: 33,
    createdAt: '2026-02-28',
    status: 'published',
  },
];

const CATEGORY_CONFIG = {
  therapeutic_protocols: { label: 'بروتوكولات علاجية' },
  case_studies: { label: 'دراسات حالة' },
  research_experiments: { label: 'أبحاث وتجارب' },
  best_practices: { label: 'أفضل الممارسات' },
  other: { label: 'أخرى' },
};
const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG);
const CATEGORIES = ['الكل', ...CATEGORY_KEYS];

export default function KnowledgeCenterPage() {
  const [tab, setTab] = useState(0);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [dialog, setDialog] = useState({ open: false, data: null });
  const [viewDialog, setViewDialog] = useState({ open: false, data: null });
  const [form, setForm] = useState({});
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await knowledgeCenterService.getArticles();
      if (res?.data?.data?.length) {
        setArticles(res.data.data);
        setIsDemo(false);
      } else {
        setArticles(DEMO_ARTICLES);
        setIsDemo(true);
      }
    } catch {
      setArticles(DEMO_ARTICLES);
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    try {
      if (dialog.data?._id) await knowledgeCenterService.updateArticle(dialog.data._id, form);
      else await knowledgeCenterService.createArticle(form);
      setDialog({ open: false, data: null });
      setForm({});
      fetchData();
    } catch {
      setError('حدث خطأ أثناء الحفظ');
    }
  };

  const handleBookmark = async id => {
    try {
      await knowledgeCenterService.toggleBookmark(id);
      fetchData();
    } catch {
      /* ignore */
    }
  };

  const selectedCat = CATEGORIES[tab];
  const filtered = articles
    .filter(a => selectedCat === 'الكل' || a.category === selectedCat)
    .filter(
      a => !searchText || a.title.includes(searchText) || (a.description || '').includes(searchText)
    );

  const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0);
  const avgRating = articles.length
    ? (articles.reduce((s, a) => s + (a.rating || 0), 0) / articles.length).toFixed(1)
    : 0;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #42a5f5 100%)',
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <BookIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  مركز المعرفة
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  قاعدة المعرفة — المقالات والأدلة والوثائق المرجعية
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                startIcon={<AddIcon />}
                variant="contained"
                onClick={() => {
                  setDialog({ open: true, data: null });
                  setForm({});
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                مقال جديد
              </Button>
              <IconButton sx={{ color: '#fff' }} onClick={fetchData}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'عدد المقالات',
            value: articles.length,
            icon: <ArticleIcon />,
            color: '#0d47a1',
          },
          { label: 'إجمالي المشاهدات', value: totalViews, icon: <ViewIcon />, color: '#4CAF50' },
          { label: 'متوسط التقييم', value: avgRating, icon: <StarIcon />, color: '#FF9800' },
          {
            label: 'التصنيفات',
            value: CATEGORIES.length - 1,
            icon: <CategoryIcon />,
            color: '#9C27B0',
          },
        ].map((s, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderRadius: 2.5, textAlign: 'center' }}>
              <CardContent sx={{ py: 2 }}>
                <Avatar
                  sx={{
                    mx: 'auto',
                    mb: 1,
                    bgcolor: s.color + '22',
                    color: s.color,
                    width: 44,
                    height: 44,
                  }}
                >
                  {s.icon}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search + Categories */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }} alignItems="center">
        <TextField
          size="small"
          placeholder="بحث في المقالات..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          sx={{ flex: 1, maxWidth: 400, bgcolor: '#fff', borderRadius: 2 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Stack>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3, bgcolor: '#fff', borderRadius: 2, boxShadow: 1 }}
        variant="scrollable"
      >
        {CATEGORIES.map((c, i) => (
          <Tab key={i} label={c === 'الكل' ? 'الكل' : CATEGORY_CONFIG[c]?.label || c} />
        ))}
      </Tabs>

      {/* Article Cards */}
      <Grid container spacing={3}>
        {filtered.map(article => (
          <Grid item xs={12} sm={6} md={4} key={article._id}>
            <Card
              sx={{
                borderRadius: 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: '0.2s',
                '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
              }}
            >
              <Box
                sx={{
                  height: 6,
                  background:
                    article.status === 'published'
                      ? 'linear-gradient(90deg, #0d47a1, #42a5f5)'
                      : 'linear-gradient(90deg, #ff9800, #ffb74d)',
                }}
              />
              <CardContent sx={{ flex: 1 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="start"
                  sx={{ mb: 1 }}
                >
                  <Chip
                    size="small"
                    label={CATEGORY_CONFIG[article.category]?.label || article.category}
                    color="primary"
                    variant="outlined"
                  />
                  <IconButton size="small" onClick={() => handleBookmark(article._id)}>
                    {article.bookmarks > 10 ? (
                      <BookmarkIcon color="primary" fontSize="small" />
                    ) : (
                      <BookmarkBorderIcon fontSize="small" />
                    )}
                  </IconButton>
                </Stack>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  gutterBottom
                  sx={{ lineHeight: 1.4 }}
                >
                  {article.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mb: 2,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {article.description}
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mb: 1 }}>
                  {article.tags?.map((t, i) => (
                    <Chip
                      key={i}
                      size="small"
                      label={t}
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  ))}
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {article.author}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Rating value={article.rating} precision={0.5} readOnly size="small" />
                    <Typography variant="caption">{article.views} مشاهدة</Typography>
                  </Stack>
                </Stack>
              </CardContent>
              <CardActions sx={{ px: 2, pb: 2, pt: 0 }}>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => setViewDialog({ open: true, data: article })}
                >
                  عرض
                </Button>
                <Button size="small" startIcon={<SchoolIcon />} disabled>
                  تعلم
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* View Article Dialog */}
      <Dialog
        open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{viewDialog.data?.title}</DialogTitle>
        <DialogContent dividers>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <Chip
              label={CATEGORY_CONFIG[viewDialog.data?.category]?.label || viewDialog.data?.category}
              color="primary"
            />
            <Chip
              label={viewDialog.data?.status === 'published' ? 'منشور' : 'مسودة'}
              color={viewDialog.data?.status === 'published' ? 'success' : 'warning'}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            الكاتب: {viewDialog.data?.author}
          </Typography>
          <Rating value={viewDialog.data?.rating} precision={0.5} readOnly sx={{ mb: 2 }} />
          <Typography variant="body1" sx={{ lineHeight: 2 }}>
            {viewDialog.data?.description}
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={1}>
            {viewDialog.data?.tags?.map((t, i) => (
              <Chip key={i} label={t} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog({ open: false, data: null })}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, data: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{dialog.data?._id ? 'تعديل مقال' : 'إضافة مقال جديد'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="عنوان المقال"
              value={form.title || ''}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            />
            <TextField
              fullWidth
              select
              label="التصنيف"
              value={form.category || ''}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                <MenuItem key={key} value={key}>
                  {cfg.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="الوصف"
              multiline
              rows={2}
              value={form.description || ''}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              helperText="20 حرف على الأقل"
            />
            <TextField
              fullWidth
              label="المحتوى"
              multiline
              rows={5}
              value={form.content || ''}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              helperText="100 حرف على الأقل"
            />
            <TextField
              fullWidth
              label="الكلمات المفتاحية (مفصولة بفاصلة)"
              value={form.tags?.join('، ') || ''}
              onChange={e =>
                setForm(p => ({
                  ...p,
                  tags: e.target.value
                    .split('،')
                    .map(t => t.trim())
                    .filter(Boolean),
                }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialog({ open: false, data: null })}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
