import { useState, useEffect, useCallback } from 'react';
import knowledgeCenterService from '../../services/knowledgeCenter.service';




import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

/* ── Constants ──────────────────────────────────────────────────────── */
const STATUS_MAP = {
  draft: { label: 'مسودة', color: 'default', icon: <DraftIcon fontSize="small" /> },
  pending_review: {
    label: 'قيد المراجعة',
    color: 'warning',
    icon: <PendingIcon fontSize="small" />,
  },
  approved: { label: 'مُعتمد', color: 'info', icon: <ApprovedIcon fontSize="small" /> },
  published: { label: 'منشور', color: 'success', icon: <ApprovedIcon fontSize="small" /> },
  archived: { label: 'مؤرشف', color: 'default', icon: <ArchiveIcon fontSize="small" /> },
};

const CATEGORY_ICONS = {
  therapeutic_protocols: '🏥',
  case_studies: '📋',
  research_experiments: '🔬',
  best_practices: '⭐',
  other: '📄',
};

const EMPTY_FORM = {
  title: '',
  description: '',
  content: '',
  category: 'best_practices',
  tags: '',
  isPublic: true,
};

/* ══════════════════════════════════════════════════════════════════════
   KnowledgeCenter — مركز المعرفة المتقدم
   ══════════════════════════════════════════════════════════════════════ */
export default function KnowledgeCenter() {
  const showSnackbar = useSnackbar();

  /* ── Core state ──────────────────────────────────────── */
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalArticles, setTotalArticles] = useState(0);

  /* ── Filters ─────────────────────────────────────────── */
  const [mainTab, setMainTab] = useState(0); // 0=articles, 1=bookmarks, 2=analytics
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  /* ── Dialogs ─────────────────────────────────────────── */
  const [detailArticle, setDetailArticle] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState(null);

  /* ── Detail page state ───────────────────────────────── */
  const [commentText, setCommentText] = useState('');
  const [userRating, setUserRating] = useState(0);

  /* ── Bookmarks ───────────────────────────────────────── */
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());

  /* ── Analytics ───────────────────────────────────────── */
  const [analytics, setAnalytics] = useState(null);
  const [trending, setTrending] = useState([]);
  const [topRated, setTopRated] = useState([]);

  /* ══════════════════════════════════════════════════════════════════
     Data Loading
     ══════════════════════════════════════════════════════════════════ */
  const loadArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, sort: sortBy };
      if (searchTerm) params.search = searchTerm;
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await knowledgeCenterService.getArticles(params);
      const d = res?.data || res;
      const list = d?.articles || d?.data || d;
      setArticles(Array.isArray(list) ? list : []);
      setTotalArticles(d?.pagination?.total || d?.total || 0);
    } catch {
      showSnackbar('خطأ في تحميل المقالات', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, searchTerm, categoryFilter, statusFilter, showSnackbar]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await knowledgeCenterService.getCategories();
      setCategories(res?.data || res || []);
    } catch {
      /* silent */
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await knowledgeCenterService.getStats();
      setStats(res?.data || res || null);
    } catch {
      /* silent */
    }
  }, []);

  const loadBookmarks = useCallback(async () => {
    try {
      const res = await knowledgeCenterService.getBookmarks();
      const bk = res?.data || res || [];
      setBookmarks(bk);
      setBookmarkedIds(new Set(bk.map(b => b.article?._id || b.article)));
    } catch {
      /* silent */
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const [aRes, tRes, trRes] = await Promise.all([
        knowledgeCenterService.getAnalytics(),
        knowledgeCenterService.getTrending(5),
        knowledgeCenterService.getTopRated(5),
      ]);
      setAnalytics(aRes?.data || aRes || null);
      setTrending(tRes?.data || tRes || []);
      setTopRated(trRes?.data || trRes || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  useEffect(() => {
    loadCategories();
    loadStats();
    loadBookmarks();
  }, [loadCategories, loadStats, loadBookmarks]);

  useEffect(() => {
    if (mainTab === 2) loadAnalytics();
  }, [mainTab, loadAnalytics]);

  /* ── Debounced search ────────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /* ══════════════════════════════════════════════════════════════════
     Handlers
     ══════════════════════════════════════════════════════════════════ */
  const openCreate = () => {
    setEditingArticle(null);
    setForm({ ...EMPTY_FORM });
    setFormOpen(true);
  };

  const openEdit = article => {
    setEditingArticle(article);
    setForm({
      title: article.title || '',
      description: article.description || '',
      content: article.content || '',
      category: article.category || 'best_practices',
      tags: (article.tags || []).join(', '),
      isPublic: article.isPublic !== false,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.content) {
      showSnackbar('العنوان والمحتوى مطلوبان', 'warning');
      return;
    }
    const payload = {
      ...form,
      tags: form.tags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    };
    try {
      if (editingArticle) {
        await knowledgeCenterService.updateArticle(editingArticle._id, payload);
        showSnackbar('تم تحديث المقال بنجاح', 'success');
      } else {
        await knowledgeCenterService.createArticle(payload);
        showSnackbar('تم إنشاء المقال بنجاح', 'success');
      }
      setFormOpen(false);
      loadArticles();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في حفظ المقال', 'error');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await knowledgeCenterService.deleteArticle(confirmDelete._id);
      showSnackbar('تم حذف المقال', 'success');
      setConfirmDelete(null);
      loadArticles();
      loadStats();
    } catch {
      showSnackbar('خطأ في حذف المقال', 'error');
    }
  };

  const handleStatusChange = async (articleId, newStatus) => {
    try {
      await knowledgeCenterService.changeStatus(articleId, newStatus);
      showSnackbar('تم تغيير حالة المقال', 'success');
      loadArticles();
      if (detailArticle?._id === articleId) {
        const res = await knowledgeCenterService.getArticleById(articleId);
        setDetailArticle(res?.data || res);
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في تغيير الحالة', 'error');
    }
  };

  const handleRate = async (articleId, value) => {
    try {
      await knowledgeCenterService.rateArticle(articleId, value);
      showSnackbar('شكراً لتقييمك!', 'success');
      const res = await knowledgeCenterService.getArticleById(articleId);
      setDetailArticle(res?.data || res);
    } catch {
      showSnackbar('خطأ في التقييم', 'error');
    }
  };

  const handleComment = async articleId => {
    if (!commentText.trim()) return;
    try {
      await knowledgeCenterService.addComment(articleId, commentText);
      showSnackbar('تم إضافة التعليق', 'success');
      setCommentText('');
      const res = await knowledgeCenterService.getArticleById(articleId);
      setDetailArticle(res?.data || res);
    } catch {
      showSnackbar('خطأ في إضافة التعليق', 'error');
    }
  };

  const handleDeleteComment = async (articleId, commentId) => {
    try {
      await knowledgeCenterService.deleteComment(articleId, commentId);
      showSnackbar('تم حذف التعليق', 'success');
      const res = await knowledgeCenterService.getArticleById(articleId);
      setDetailArticle(res?.data || res);
    } catch {
      showSnackbar('خطأ في حذف التعليق', 'error');
    }
  };

  const handleToggleBookmark = async articleId => {
    try {
      await knowledgeCenterService.toggleBookmark(articleId);
      loadBookmarks();
      showSnackbar('تم تحديث المفضلة', 'success');
    } catch {
      showSnackbar('خطأ في تحديث المفضلة', 'error');
    }
  };

  const openDetail = async article => {
    try {
      const res = await knowledgeCenterService.getArticleById(article._id);
      const d = res?.data || res;
      setDetailArticle(d);
      setUserRating(d?.userRating || 0);
    } catch {
      setDetailArticle(article);
    }
  };

  const handleSeed = async () => {
    try {
      await knowledgeCenterService.seed();
      showSnackbar('تم إنشاء البيانات التجريبية', 'success');
      loadArticles();
      loadCategories();
      loadStats();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'خطأ في إنشاء البيانات التجريبية', 'error');
    }
  };

  /* ── Derived ─────────────────────────────────────────── */
  const totalPages = Math.ceil(totalArticles / pageSize);

  /* ══════════════════════════════════════════════════════════════════
     Render helpers
     ══════════════════════════════════════════════════════════════════ */
  const StatusChip = ({ status }) => {
    const s = STATUS_MAP[status] || STATUS_MAP.draft;
    return <Chip icon={s.icon} label={s.label} color={s.color} size="small" />;
  };

  /* ── Stats cards row ─────────────────────────────────── */
  const renderStats = () =>
    stats && (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المقالات',
            value: stats.total || 0,
            icon: <ArticleIcon />,
            color: '#1976d2',
          },
          {
            label: 'منشورة',
            value: stats.published || 0,
            icon: <ApprovedIcon />,
            color: '#2e7d32',
          },
          { label: 'مسودات', value: stats.draft || 0, icon: <DraftIcon />, color: '#ed6c02' },
          {
            label: 'قيد المراجعة',
            value: stats.pendingReview || 0,
            icon: <PendingIcon />,
            color: '#9c27b0',
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={3} key={i}>
            <Paper sx={{ p: 2, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <Box sx={{ color: s.color, mb: 0.5 }}>{s.icon}</Box>
              <Typography variant="h5" fontWeight="bold">
                {s.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );

  /* ── Category cards ──────────────────────────────────── */
  const renderCategories = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {categories.map((cat, i) => (
        <Grid item xs={6} sm={4} md={2.4} key={i}>
          <Card
            sx={{
              cursor: 'pointer',
              '&:hover': { boxShadow: 4 },
              border: categoryFilter === cat.name ? '2px solid' : 'none',
              borderColor: 'primary.main',
            }}
            onClick={() => {
              setCategoryFilter(prev => (prev === cat.name ? '' : cat.name));
              setPage(1);
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5">{CATEGORY_ICONS[cat.name] || cat.icon || '📄'}</Typography>
              <Typography variant="body2" fontWeight="bold" noWrap>
                {cat.label || cat.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cat.count || 0} مقال
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  /* ── Article card ────────────────────────────────────── */
  const ArticleCard = ({ article }) => {
    const isBookmarked = bookmarkedIds.has(article._id);
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ flex: 1 }}>
              {article.title}
            </Typography>
            <IconButton size="small" onClick={() => handleToggleBookmark(article._id)}>
              {isBookmarked ? <BookmarkIcon color="primary" /> : <BookmarkBorderIcon />}
            </IconButton>
          </Box>

          <Box sx={{ mb: 1 }}>
            <StatusChip status={article.status} />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {(article.description || article.content || '').slice(0, 100)}
            {(article.description || article.content || '').length > 100 ? '...' : ''}
          </Typography>

          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {(article.tags || []).slice(0, 3).map(tag => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
            {(article.tags || []).length > 3 && (
              <Chip label={`+${article.tags.length - 3}`} size="small" />
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Rating value={article.ratings?.average || 0} precision={0.5} size="small" readOnly />
            <Typography variant="caption" color="text.secondary">
              ({article.ratings?.count || 0})
            </Typography>
          </Box>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title="مشاهدات">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <ViewIcon fontSize="small" color="action" />
                <Typography variant="caption">{article.views || 0}</Typography>
              </Box>
            </Tooltip>
            <Tooltip title="تعليقات">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CommentIcon fontSize="small" color="action" />
                <Typography variant="caption">{article.comments?.length || 0}</Typography>
              </Box>
            </Tooltip>
          </Box>
          <Box>
            <Tooltip title="تعديل">
              <IconButton size="small" onClick={() => openEdit(article)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف">
              <IconButton size="small" color="error" onClick={() => setConfirmDelete(article)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button size="small" onClick={() => openDetail(article)}>
              قراءة المزيد
            </Button>
          </Box>
        </CardActions>
      </Card>
    );
  };

  /* ── Articles tab content ────────────────────────────── */
  const renderArticlesTab = () => (
    <>
      {/* Filters row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="ابحث في المقالات..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 250, flex: 1 }}
        />
        <TextField
          select
          size="small"
          label="الحالة"
          value={statusFilter}
          onChange={e => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">الكل</MenuItem>
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="ترتيب"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="latest">الأحدث</MenuItem>
          <MenuItem value="oldest">الأقدم</MenuItem>
          <MenuItem value="views">الأكثر مشاهدة</MenuItem>
          <MenuItem value="rating">الأعلى تقييماً</MenuItem>
          <MenuItem value="title">أبجدي</MenuItem>
        </TextField>
      </Box>

      {renderCategories()}

      {loading ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Grid item xs={12} md={6} lg={4} key={i}>
              <Skeleton variant="rounded" height={220} />
            </Grid>
          ))}
        </Grid>
      ) : articles.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <BookIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            لا توجد مقالات
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ابدأ بإنشاء مقال جديد أو استعرض البيانات التجريبية
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              مقال جديد
            </Button>
            <Button variant="outlined" startIcon={<SeedIcon />} onClick={handleSeed}>
              بيانات تجريبية
            </Button>
          </Box>
        </Paper>
      ) : (
        <>
          <Grid container spacing={2}>
            {articles.map(article => (
              <Grid item xs={12} md={6} lg={4} key={article._id}>
                <ArticleCard article={article} />
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => setPage(v)}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </>
      )}
    </>
  );

  /* ── Bookmarks tab content ───────────────────────────── */
  const renderBookmarksTab = () => (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        <BookmarkIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        المقالات المحفوظة ({bookmarks.length})
      </Typography>
      {bookmarks.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          لم تقم بحفظ أي مقالات بعد. اضغط على أيقونة 🔖 في بطاقة المقال لحفظه.
        </Alert>
      ) : (
        <List>
          {bookmarks.map((bk, i) => {
            const art = bk.article || {};
            return (
              <React.Fragment key={bk._id || i}>
                <ListItem button onClick={() => openDetail({ _id: art._id || bk.article })}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <ArticleIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={art.title || 'مقال محفوظ'}
                    secondary={
                      <>
                        {art.category && <Chip label={art.category} size="small" sx={{ mr: 1 }} />}
                        {bk.note && `📝 ${bk.note}`}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={e => {
                        e.stopPropagation();
                        handleToggleBookmark(art._id || bk.article);
                      }}
                    >
                      <BookmarkIcon color="primary" />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {i < bookmarks.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      )}
    </Paper>
  );

  /* ── Analytics tab content ───────────────────────────── */
  const renderAnalyticsTab = () => {
    if (!analytics)
      return (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );

    return (
      <Grid container spacing={3}>
        {/* Summary cards */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {[
              { label: 'إجمالي المقالات', value: analytics.totalArticles || 0, color: '#1976d2' },
              {
                label: 'إجمالي المشاهدات',
                value: analytics.totalViews || 0,
                color: '#2e7d32',
              },
              {
                label: 'متوسط التقييم',
                value: (analytics.avgRating || 0).toFixed(1),
                color: '#ed6c02',
              },
            ].map((s, i) => (
              <Grid item xs={12} sm={4} key={i}>
                <Paper sx={{ p: 2, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
                  <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* By Category */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <CategoryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              المقالات حسب الفئة
            </Typography>
            {(analytics.byCategory || []).map((c, i) => (
              <Box key={i} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">
                    {CATEGORY_ICONS[c._id] || '📄'} {c._id}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {c.count}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(
                    100,
                    ((c.count / (analytics.totalArticles || 1)) * 100).toFixed(0)
                  )}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            ))}
          </Paper>
        </Grid>

        {/* By Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <FilterIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              المقالات حسب الحالة
            </Typography>
            {(analytics.byStatus || []).map((s, i) => {
              const st = STATUS_MAP[s._id] || { label: s._id, color: 'default' };
              return (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={st.label} color={st.color} size="small" />
                  <Typography variant="body2" fontWeight="bold">
                    {s.count}
                  </Typography>
                </Box>
              );
            })}
          </Paper>
        </Grid>

        {/* Trending */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <TrendingIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              المقالات الرائجة
            </Typography>
            <List dense>
              {trending.map((a, i) => (
                <ListItem key={a._id} button onClick={() => openDetail(a)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.main', width: 32, height: 32, fontSize: 14 }}>
                      {i + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={a.title} secondary={`👁️ ${a.views || 0} مشاهدة`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Rated */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <StarIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              الأعلى تقييماً
            </Typography>
            <List dense>
              {topRated.map((a, i) => (
                <ListItem key={a._id} button onClick={() => openDetail(a)}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32, fontSize: 14 }}>
                      {i + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={a.title}
                    secondary={
                      <Rating
                        value={a.ratings?.average || 0}
                        size="small"
                        readOnly
                        precision={0.5}
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Recent Searches */}
        {analytics.recentSearches?.length > 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                <SearchIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                عمليات البحث الأخيرة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {analytics.recentSearches.map((s, i) => (
                  <Chip key={i} label={s.query} variant="outlined" size="small" />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    );
  };

  /* ══════════════════════════════════════════════════════════════════
     MAIN RENDER
     ══════════════════════════════════════════════════════════════════ */
  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* ── Header ─────────────────────────────────────── */}
      <Box sx={{ background: gradients.info, borderRadius: 2, p: 3, mb: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BookIcon sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                مركز المعرفة
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                قاعدة المعرفة والمقالات التعليمية — {totalArticles} مقال
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="تحديث">
              <IconButton
                sx={{ color: 'white' }}
                onClick={() => {
                  loadArticles();
                  loadCategories();
                  loadStats();
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="بيانات تجريبية">
              <IconButton sx={{ color: 'white' }} onClick={handleSeed}>
                <SeedIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
              }}
            >
              مقال جديد
            </Button>
          </Box>
        </Box>
      </Box>

      {/* ── Stats ──────────────────────────────────────── */}
      {renderStats()}

      {/* ── Main tabs ──────────────────────────────────── */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)}>
          <Tab icon={<ArticleIcon />} label="المقالات" iconPosition="start" />
          <Tab
            icon={
              <Badge badgeContent={bookmarks.length} color="primary" max={99}>
                <BookmarkIcon />
              </Badge>
            }
            label="المحفوظات"
            iconPosition="start"
          />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" iconPosition="start" />
        </Tabs>
      </Paper>

      {mainTab === 0 && renderArticlesTab()}
      {mainTab === 1 && renderBookmarksTab()}
      {mainTab === 2 && renderAnalyticsTab()}

      {/* ══════════════════════════════════════════════════
          DIALOGS
          ══════════════════════════════════════════════════ */}

      {/* ── Article detail dialog ────────────────────── */}
      <Dialog
        open={!!detailArticle}
        onClose={() => setDetailArticle(null)}
        maxWidth="md"
        fullWidth
        scroll="paper"
      >
        {detailArticle && (
          <>
            <DialogTitle
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="h6" fontWeight="bold">
                {detailArticle.title}
              </Typography>
              <IconButton onClick={() => setDetailArticle(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {/* Meta row */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <StatusChip status={detailArticle.status} />
                <Chip
                  label={
                    CATEGORY_ICONS[detailArticle.category] + ' ' + (detailArticle.category || '')
                  }
                  size="small"
                  variant="outlined"
                />
                <Typography variant="caption" color="text.secondary">
                  👁️ {detailArticle.views || 0} مشاهدة
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  💬 {detailArticle.comments?.length || 0} تعليق
                </Typography>
              </Box>

              {/* Rating */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Typography variant="body2">التقييم العام:</Typography>
                <Rating value={detailArticle.ratings?.average || 0} precision={0.5} readOnly />
                <Typography variant="caption" color="text.secondary">
                  ({detailArticle.ratings?.count || 0} تقييم)
                </Typography>
              </Box>

              {/* Tags */}
              {detailArticle.tags?.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                  {detailArticle.tags.map(tag => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" color="primary" />
                  ))}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Content */}
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, mb: 3 }}>
                {detailArticle.content}
              </Typography>

              <Divider sx={{ my: 2 }} />

              {/* User Rating */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  قيّم هذا المقال:
                </Typography>
                <Rating
                  value={userRating}
                  onChange={(_, val) => {
                    if (val) {
                      setUserRating(val);
                      handleRate(detailArticle._id, val);
                    }
                  }}
                  size="large"
                />
              </Box>

              {/* Status change */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  تغيير الحالة:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_MAP).map(([key, val]) => (
                    <Button
                      key={key}
                      size="small"
                      variant={detailArticle.status === key ? 'contained' : 'outlined'}
                      color={val.color === 'default' ? 'inherit' : val.color}
                      disabled={detailArticle.status === key}
                      onClick={() => handleStatusChange(detailArticle._id, key)}
                      startIcon={val.icon}
                    >
                      {val.label}
                    </Button>
                  ))}
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Comments */}
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                <CommentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                التعليقات ({detailArticle.comments?.length || 0})
              </Typography>

              {(detailArticle.comments || []).map((c, idx) => (
                <Paper key={c._id || idx} sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="body2">{c.text}</Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteComment(detailArticle._id, c._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : ''}
                  </Typography>
                </Paper>
              ))}

              {/* Add comment */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="أضف تعليقاً..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleComment(detailArticle._id);
                    }
                  }}
                />
                <IconButton color="primary" onClick={() => handleComment(detailArticle._id)}>
                  <SendIcon />
                </IconButton>
              </Box>

              {/* Related articles */}
              {detailArticle.relatedArticles?.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    مقالات ذات صلة:
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {detailArticle.relatedArticles.map(r => (
                      <Chip key={r._id} label={r.title} clickable onClick={() => openDetail(r)} />
                    ))}
                  </Box>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<EditIcon />}
                onClick={() => {
                  setDetailArticle(null);
                  openEdit(detailArticle);
                }}
              >
                تعديل
              </Button>
              <Button
                startIcon={
                  bookmarkedIds.has(detailArticle._id) ? <BookmarkIcon /> : <BookmarkBorderIcon />
                }
                onClick={() => handleToggleBookmark(detailArticle._id)}
              >
                {bookmarkedIds.has(detailArticle._id) ? 'إزالة من المحفوظات' : 'حفظ'}
              </Button>
              <Button onClick={() => setDetailArticle(null)}>إغلاق</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Create / Edit article dialog ─────────────── */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingArticle ? 'تعديل المقال' : 'مقال جديد'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="عنوان المقال *"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            sx={{ mt: 2, mb: 2 }}
          />
          <TextField
            fullWidth
            label="وصف مختصر"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <TextField
            select
            fullWidth
            label="الفئة"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            sx={{ mb: 2 }}
          >
            <MenuItem value="therapeutic_protocols">بروتوكولات علاجية</MenuItem>
            <MenuItem value="case_studies">دراسات حالة</MenuItem>
            <MenuItem value="research_experiments">أبحاث وتجارب</MenuItem>
            <MenuItem value="best_practices">أفضل الممارسات</MenuItem>
            <MenuItem value="other">أخرى</MenuItem>
          </TextField>
          <TextField
            fullWidth
            multiline
            rows={6}
            label="المحتوى *"
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="الوسوم (مفصولة بفاصلة)"
            value={form.tags}
            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            placeholder="علاج, تأهيل, دليل"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingArticle ? 'حفظ التعديلات' : 'نشر'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirmation dialog ───────────────── */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} maxWidth="xs">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف المقال &quot;{confirmDelete?.title}&quot;؟ لا يمكن التراجع عن هذا
            الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
