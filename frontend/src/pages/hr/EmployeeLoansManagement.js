/**
 * Employee Loans Management — إدارة السلف والقروض
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  getLoans,
  createLoan,
  getLoanById,
  approveLoanStep,
  getLoanStats,
} from '../../services/hr/employeeAffairsExpandedService';

const LOAN_TYPES = ['سلفة راتب', 'قرض شخصي', 'سلفة طوارئ', 'قرض سكني', 'قرض تعليمي', 'قرض طبي'];

const statusColor = {
  مقدم: 'info',
  'موافقة المدير': 'warning',
  'موافقة الموارد البشرية': 'warning',
  'موافقة المالية': 'warning',
  معتمد: 'primary',
  'تم الصرف': 'secondary',
  'قيد السداد': 'default',
  مكتمل: 'success',
  مرفوض: 'error',
};

export default function EmployeeLoansManagement() {
  const [loans, setLoans] = useState([]);
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
    amount: '',
    reason: '',
    numberOfInstallments: 12,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [loansRes, statsRes] = await Promise.all([
        getLoans({ ...filters, page: page + 1, limit: rowsPerPage }),
        getLoanStats(),
      ]);
      setLoans(loansRes?.loans || loansRes?.data?.loans || []);
      setTotal(loansRes?.total || 0);
      setStats(statsRes?.data || statsRes);
    } catch (e) {
      console.error('Error fetching loans:', e);
    }
    setLoading(false);
  }, [filters, page, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const amount = Number(form.amount);
      const installments = Number(form.numberOfInstallments);
      await createLoan({
        ...form,
        amount,
        numberOfInstallments: installments,
        monthlyInstallment: amount / installments,
      });
      setOpenDialog(false);
      setForm({ type: '', amount: '', reason: '', numberOfInstallments: 12 });
      setSnackbar({ open: true, message: 'تم تقديم طلب السلفة بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getLoanById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await approveLoanStep(id, { approved });
      setSnackbar({
        open: true,
        message: approved ? 'تمت الموافقة' : 'تم الرفض',
        severity: approved ? 'success' : 'warning',
      });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const formatCurrency = val =>
    new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(val || 0);

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        💰 إدارة السلف والقروض
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e8f5e9' }}>
              <CardContent>
                <Typography variant="h3" fontWeight="bold" color="success.main">
                  {stats.total || 0}
                </Typography>
                <Typography variant="body2">إجمالي الطلبات</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#fff3e0' }}>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" color="warning.main">
                  {formatCurrency(stats.totalDisbursed)}
                </Typography>
                <Typography variant="body2">إجمالي المصروف</Typography>
              </CardContent>
            </Card>
          </Grid>
          {(stats.byStatus || []).slice(0, 2).map((s, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Typography variant="h4" fontWeight="bold">
                    {s.count}
                  </Typography>
                  <Typography variant="body2">{s._id}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Filters & Actions */}
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
              label="النوع"
              value={filters.type}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {LOAN_TYPES.map(t => (
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
              طلب سلفة / قرض جديد
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
                  <TableCell>رقم الطلب</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>القسط الشهري</TableCell>
                  <TableCell>المتبقي</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map(l => (
                  <TableRow key={l._id} hover>
                    <TableCell>
                      <strong>{l.loanNumber}</strong>
                    </TableCell>
                    <TableCell>
                      {l.employeeId?.firstName} {l.employeeId?.lastName}
                    </TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell>{formatCurrency(l.amount)}</TableCell>
                    <TableCell>{formatCurrency(l.monthlyInstallment)}</TableCell>
                    <TableCell>
                      <Box>
                        {formatCurrency(l.remainingBalance)}
                        <LinearProgress
                          variant="determinate"
                          value={
                            l.amount ? ((l.amount - (l.remainingBalance || 0)) / l.amount) * 100 : 0
                          }
                          sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                          color="success"
                        />
                      </Box>
                    </TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
                {loans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      لا توجد طلبات
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
        <DialogTitle>طلب سلفة / قرض جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="نوع السلفة / القرض"
                value={form.type}
                required
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {LOAN_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="المبلغ (ريال)"
                type="number"
                value={form.amount}
                required
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="عدد الأقساط"
                type="number"
                value={form.numberOfInstallments}
                onChange={e => setForm(p => ({ ...p, numberOfInstallments: e.target.value }))}
                inputProps={{ min: 1, max: 60 }}
              />
            </Grid>
            {form.amount && form.numberOfInstallments && (
              <Grid item xs={12}>
                <Alert severity="info">
                  القسط الشهري:{' '}
                  {formatCurrency(Number(form.amount) / Number(form.numberOfInstallments))}
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="سبب الطلب"
                value={form.reason}
                required
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.type || !form.amount || !form.reason}
          >
            تقديم الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل القرض: {viewDialog?.loanNumber}</DialogTitle>
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
                  <strong>المبلغ:</strong> {formatCurrency(viewDialog.amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>القسط الشهري:</strong> {formatCurrency(viewDialog.monthlyInstallment)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>المتبقي:</strong> {formatCurrency(viewDialog.remainingBalance)}
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
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={() => handleApprove(viewDialog._id, true)}
                  >
                    موافقة
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleApprove(viewDialog._id, false)}
                  >
                    رفض
                  </Button>
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
