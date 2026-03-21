/**
 * Employee Letters Management — إدارة الشهادات والخطابات الرسمية
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  getLetters,
  createLetterRequest,
  getLetterById,
  updateLetterStatus,
  getLetterStats,
} from '../../services/hr/employeeAffairsExpandedService';

const LETTER_TYPES = [
  'تعريف بالراتب',
  'تعريف بالعمل',
  'شهادة خبرة',
  'خطاب لمن يهمه الأمر',
  'خطاب تفويض',
  'خطاب تأشيرة خروج وعودة',
  'خطاب نقل كفالة',
  'خطاب تأشيرة زيارة',
  'شهادة حسن سيرة وسلوك',
  'خطاب بنكي',
  'خطاب جهات حكومية',
  'خطاب تأمين طبي',
  'شهادة مباشرة عمل',
  'خطاب إنهاء خدمة',
  'أخرى',
];

const LANGUAGES = ['عربي', 'إنجليزي', 'كلاهما'];

const statusColor = {
  مطلوب: 'info',
  'قيد الإعداد': 'warning',
  'بانتظار التوقيع': 'secondary',
  جاهز: 'success',
  'تم التسليم': 'default',
  ملغي: 'error',
};

const statusIcon = {
  مطلوب: '📝',
  'قيد الإعداد': '⏳',
  'بانتظار التوقيع': '✍️',
  جاهز: '✅',
  'تم التسليم': '📬',
  ملغي: '❌',
};

export default function EmployeeLettersManagement() {
  const [letters, setLetters] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    type: '',
    language: 'عربي',
    purpose: '',
    addressedTo: '',
    copies: 1,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lettersRes, statsRes] = await Promise.all([
        getLetters({ ...filters, page: page + 1, limit: rowsPerPage }),
        getLetterStats(),
      ]);
      setLetters(lettersRes?.letters || lettersRes?.data?.letters || []);
      setTotal(lettersRes?.total || 0);
      setStats(statsRes?.data || statsRes);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [filters, page, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      await createLetterRequest(form);
      setOpenDialog(false);
      setForm({ type: '', language: 'عربي', purpose: '', addressedTo: '', copies: 1 });
      setSnackbar({ open: true, message: 'تم تقديم طلب الخطاب بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getLetterById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateLetterStatus(id, { status });
      setSnackbar({ open: true, message: `تم تحديث الحالة إلى: ${status}`, severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📄 إدارة الشهادات والخطابات الرسمية
      </Typography>

      {/* Stats */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {(stats.byStatus || []).slice(0, 4).map((s, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" fontWeight="bold">
                    {s.count}
                  </Typography>
                  <Typography variant="body2">
                    {statusIcon[s._id] || '📋'} {s._id}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="الحالة"
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {Object.keys(statusColor).map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              size="small"
              label="نوع الخطاب"
              value={filters.type}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {LETTER_TYPES.map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              fullWidth
            >
              طلب خطاب جديد
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                  <TableCell>رقم الخطاب</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>نوع الخطاب</TableCell>
                  <TableCell>اللغة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {letters.map(l => (
                  <TableRow key={l._id} hover>
                    <TableCell>
                      <strong>{l.letterNumber}</strong>
                    </TableCell>
                    <TableCell>
                      {l.employeeId?.firstName} {l.employeeId?.lastName}
                    </TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell>{l.language}</TableCell>
                    <TableCell>
                      <Chip
                        label={l.status}
                        color={statusColor[l.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(l.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => handleView(l._id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {l.status === 'جاهز' && (
                        <Tooltip title="طباعة">
                          <IconButton size="small">
                            <PrintIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {letters.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      لا توجد خطابات
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={e => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              labelRowsPerPage="عدد الصفوف:"
              dir="ltr"
            />
          </>
        )}
      </TableContainer>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>طلب خطاب / شهادة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="نوع الخطاب"
                value={form.type}
                required
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {LETTER_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="اللغة"
                value={form.language}
                onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
              >
                {LANGUAGES.map(l => (
                  <MenuItem key={l} value={l}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="عدد النسخ"
                value={form.copies}
                onChange={e => setForm(p => ({ ...p, copies: e.target.value }))}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="موجه إلى"
                value={form.addressedTo}
                onChange={e => setForm(p => ({ ...p, addressedTo: e.target.value }))}
                placeholder="مثال: البنك الأهلي، السفارة الأمريكية..."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الغرض"
                value={form.purpose}
                onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.type}>
            تقديم الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل الخطاب: {viewDialog?.letterNumber}</DialogTitle>
        <DialogContent>
          {viewDialog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography>
                  <strong>النوع:</strong> {viewDialog.type}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>اللغة:</strong> {viewDialog.language}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>موجه إلى:</strong> {viewDialog.addressedTo || '-'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>عدد النسخ:</strong> {viewDialog.copies}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>الحالة:</strong>{' '}
                  <Chip
                    label={viewDialog.status}
                    color={statusColor[viewDialog.status]}
                    size="small"
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  تحديث الحالة:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {Object.keys(statusColor)
                    .filter(s => s !== viewDialog.status)
                    .map(s => (
                      <Button
                        key={s}
                        variant="outlined"
                        size="small"
                        onClick={() => handleStatusUpdate(viewDialog._id, s)}
                      >
                        {statusIcon[s]} {s}
                      </Button>
                    ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(null)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(p => ({ ...p, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(p => ({ ...p, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
