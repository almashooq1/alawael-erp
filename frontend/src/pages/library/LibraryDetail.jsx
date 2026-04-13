import { useState, useEffect, useCallback } from 'react';


import { useParams, useNavigate } from 'react-router-dom';
import libraryService from '../../services/libraryService';

const TYPE_LABELS = {
  book: 'كتاب', therapeutic_tool: 'أداة علاجية', educational: 'مورد تعليمي',
  media: 'وسائط', assistive_device: 'جهاز مساعد', game: 'لعبة تطويرية',
  periodical: 'مجلة/دورية', template: 'نموذج',
};
const TYPE_ICONS = {
  book: <MenuBook />, therapeutic_tool: <Healing />, educational: <School />,
  media: <VideoLibrary />, assistive_device: <Accessibility />,
  game: <SportsEsports />, periodical: <Article />, template: <Description />,
};
const CONDITION_LABELS = { new: 'جديد', good: 'جيد', fair: 'مقبول', poor: 'ضعيف' };
const CONDITION_COLORS = { new: 'success', good: 'primary', fair: 'warning', poor: 'error' };

export default function LibraryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resource, setResource] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [tab, setTab] = useState(0);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resData, revData, maintData] = await Promise.all([
        libraryService.getResourceById(id),
        libraryService.getResourceReviews(id),
        libraryService.getMaintenanceRecords({ resourceId: id }),
      ]);
      setResource(resData.data?.data || resData.data);
      setReviews(revData.data?.data || []);
      setMaintenance(maintData.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddReview = async () => {
    try {
      await libraryService.addReview(id, reviewForm);
      setSnackbar({ open: true, message: 'تم إضافة التقييم بنجاح', severity: 'success' });
      setReviewDialog(false);
      setReviewForm({ rating: 5, comment: '' });
      loadData();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'خطأ', severity: 'error' });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress size={48} /><Typography sx={{ mr: 2 }}>جاري التحميل...</Typography>
      </Box>
    );
  }

  if (error || !resource) {
    return (
      <Box sx={{ p: 3, direction: 'rtl' }}>
        <Alert severity="error" action={<Button onClick={() => navigate('/library')}>العودة</Button>}>
          {error || 'المورد غير موجود'}
        </Alert>
      </Box>
    );
  }

  const r = resource;
  const cat = r.category;
  const utilization = r.quantity > 0 ? ((r.quantity - r.availableQty) / r.quantity) * 100 : 0;

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => navigate('/library')}><ArrowBack /></IconButton>
        <Avatar sx={{ bgcolor: cat?.color || '#1976d2', width: 56, height: 56 }}>
          {TYPE_ICONS[r.type] || <MenuBook />}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight="bold">{r.name}</Typography>
          <Typography variant="body2" color="text.secondary">{r.nameEn}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip size="small" label={TYPE_LABELS[r.type]} color="primary" variant="outlined" />
            {cat && <Chip size="small" label={cat.name} sx={{ bgcolor: cat.color + '20', color: cat.color }} />}
            <Chip size="small" label={CONDITION_LABELS[r.condition] || r.condition} color={CONDITION_COLORS[r.condition] || 'default'} />
            <Chip size="small" label={r.status === 'available' ? 'متاح' : 'غير متاح'} color={r.status === 'available' ? 'success' : 'error'} />
          </Stack>
        </Box>
        <Button variant="outlined" startIcon={<Star />} onClick={() => setReviewDialog(true)}>إضافة تقييم</Button>
      </Box>

      {/* ── Info Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>معلومات المورد</Typography>
            <Grid container spacing={2}>
              {r.author && <Grid item xs={6}><Typography variant="caption" color="text.secondary">المؤلف / المصنع</Typography><Typography>{r.author}</Typography></Grid>}
              {r.publisher && <Grid item xs={6}><Typography variant="caption" color="text.secondary">الناشر</Typography><Typography>{r.publisher}</Typography></Grid>}
              {r.isbn && <Grid item xs={6}><Typography variant="caption" color="text.secondary">ISBN</Typography><Typography>{r.isbn}</Typography></Grid>}
              {r.publishYear && <Grid item xs={6}><Typography variant="caption" color="text.secondary">سنة النشر</Typography><Typography>{r.publishYear}</Typography></Grid>}
              {r.edition && <Grid item xs={6}><Typography variant="caption" color="text.secondary">الطبعة</Typography><Typography>{r.edition}</Typography></Grid>}
              {r.pages && <Grid item xs={6}><Typography variant="caption" color="text.secondary">الصفحات</Typography><Typography>{r.pages}</Typography></Grid>}
              {r.language && <Grid item xs={6}><Typography variant="caption" color="text.secondary">اللغة</Typography><Typography>{r.language}</Typography></Grid>}
              {r.location && <Grid item xs={6}><Typography variant="caption" color="text.secondary">الموقع</Typography><Typography>{r.location}</Typography></Grid>}
              {r.barcode && <Grid item xs={6}><Typography variant="caption" color="text.secondary">الباركود</Typography><Typography><QrCode sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />{r.barcode}</Typography></Grid>}
              {r.cost > 0 && <Grid item xs={6}><Typography variant="caption" color="text.secondary">التكلفة</Typography><Typography>{r.cost} {r.currency}</Typography></Grid>}
            </Grid>
            {r.description && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">الوصف</Typography>
                <Typography>{r.description}</Typography>
              </>
            )}
            {r.tags && r.tags.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {r.tags.map(t => <Chip key={t} label={t} size="small" sx={{ mr: 0.5, mb: 0.5 }} />)}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">المخزون والإتاحة</Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="h3" fontWeight="bold" color={r.availableQty > 0 ? 'success.main' : 'error.main'}>
                {r.availableQty} / {r.quantity}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>متاح / إجمالي</Typography>
              <LinearProgress variant="determinate" value={utilization} sx={{ height: 8, borderRadius: 4, mb: 1 }} />
              <Typography variant="caption">نسبة الاستخدام: {utilization.toFixed(0)}%</Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">التقييم</Typography>
              <Divider sx={{ my: 1 }} />
              <Rating value={r.rating || 0} readOnly precision={0.1} size="large" />
              <Typography variant="h5" fontWeight="bold">{r.rating || 0}</Typography>
              <Typography variant="body2" color="text.secondary">{r.reviewCount || 0} تقييم</Typography>
            </Paper>

            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h6">إحصائيات</Typography>
              <Divider sx={{ my: 1 }} />
              <Grid container>
                <Grid item xs={6}><Typography variant="h5" fontWeight="bold">{r.timesLoaned}</Typography><Typography variant="caption">مرات الإعارة</Typography></Grid>
                <Grid item xs={6}><Typography variant="h5" fontWeight="bold">{r.views}</Typography><Typography variant="caption">المشاهدات</Typography></Grid>
              </Grid>
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* ── Tabs: Reviews & Maintenance ── */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={`التقييمات (${reviews.length})`} />
          <Tab label={`سجل الصيانة (${maintenance.length})`} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2 }}>
          {reviews.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>لا توجد تقييمات بعد</Typography>
          ) : (
            reviews.map(rv => (
              <Box key={rv.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Avatar sx={{ width: 32, height: 32 }}><Person /></Avatar>
                  <Typography fontWeight="bold">{rv.userName}</Typography>
                  <Rating value={rv.rating} readOnly size="small" />
                  <Typography variant="caption" color="text.secondary">{new Date(rv.createdAt).toLocaleDateString('ar-SA')}</Typography>
                </Box>
                {rv.comment && <Typography variant="body2" sx={{ pr: 5 }}>{rv.comment}</Typography>}
              </Box>
            ))
          )}
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          {maintenance.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>لا توجد سجلات صيانة</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell>النوع</TableCell>
                    <TableCell>الوصف</TableCell>
                    <TableCell>التكلفة</TableCell>
                    <TableCell>بواسطة</TableCell>
                    <TableCell>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenance.map(m => (
                    <TableRow key={m.id}>
                      <TableCell><Chip size="small" label={m.type} /></TableCell>
                      <TableCell>{m.description}</TableCell>
                      <TableCell>{m.cost > 0 ? `${m.cost} ر.س` : '—'}</TableCell>
                      <TableCell>{m.performedBy || '—'}</TableCell>
                      <TableCell>{new Date(m.performedAt).toLocaleDateString('ar-SA')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ── Review Dialog ── */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة تقييم</DialogTitle>
        <DialogContent sx={{ direction: 'rtl' }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ mb: 1 }}>التقييم</Typography>
              <Rating value={reviewForm.rating} onChange={(_, v) => setReviewForm({ ...reviewForm, rating: v })} size="large" />
            </Box>
            <TextField label="تعليق (اختياري)" multiline rows={3} fullWidth value={reviewForm.comment} onChange={e => setReviewForm({ ...reviewForm, comment: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddReview}>إرسال</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
