/**
 * Overtime Management — إدارة العمل الإضافي
 * Saudi Labor Law Article 107 compliant
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  getOvertimeRequests,
  createOvertimeRequest,
  getOvertimeRequestById,
  approveOvertimeStep,
  getOvertimeStats,
} from '../../services/hr/employeeAffairsExpandedService';

const OVERTIME_TYPES = [
  { value: 'عادي', label: 'عادي (×1.5)', multiplier: 1.5, icon: <ClockIcon />, color: '#1976d2' },
  {
    value: 'يوم راحة',
    label: 'يوم راحة (×2.0)',
    multiplier: 2.0,
    icon: <WeekendIcon />,
    color: '#ed6c02',
  },
  {
    value: 'إجازة رسمية',
    label: 'إجازة رسمية (×2.5)',
    multiplier: 2.5,
    icon: <HolidayIcon />,
    color: '#d32f2f',
  },
  { value: 'ليلي', label: 'ليلي (×1.75)', multiplier: 1.75, icon: <NightIcon />, color: '#7b1fa2' },
];

const statusColor = {
  مقدم: 'info',
  'موافقة المدير': 'warning',
  'موافقة HR': 'warning',
  معتمد: 'success',
  مرفوض: 'error',
  ملغي: 'default',
  'تم الصرف': 'success',
};

const fmtCurrency = v => (v !== null ? `${Number(v).toLocaleString('ar-SA')} ر.س` : '-');

export default function OvertimeManagement() {
  const [requests, setRequests] = useState([]);
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
    date: '',
    startTime: '',
    endTime: '',
    hours: '',
    reason: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        getOvertimeRequests({ ...filters, page: page + 1, limit: rowsPerPage }),
        getOvertimeStats(),
      ]);
      setRequests(res?.requests || res?.data?.requests || []);
      setTotal(res?.total || 0);
      setStats(st?.data || st);
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
      await createOvertimeRequest({
        type: form.type,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        hours: Number(form.hours),
        reason: form.reason,
      });
      setOpenDialog(false);
      setForm({ type: '', date: '', startTime: '', endTime: '', hours: '', reason: '' });
      setSnackbar({ open: true, message: 'تم تقديم طلب العمل الإضافي بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getOvertimeRequestById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await approveOvertimeStep(id, { approved });
      setSnackbar({
        open: true,
        message: approved ? 'تمت الموافقة' : 'تم الرفض',
        severity: approved ? 'success' : 'warning',
      });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const getTypeInfo = type => OVERTIME_TYPES.find(t => t.value === type) || OVERTIME_TYPES[0];

  const statCards = [
    { label: 'إجمالي الطلبات', value: stats?.totalRequests || 0, color: '#1976d2', icon: '📋' },
    {
      label: 'ساعات هذا الشهر',
      value: stats?.totalHoursThisMonth || 0,
      color: '#2e7d32',
      icon: '⏱️',
    },
    { label: 'قيد الانتظار', value: stats?.pending || 0, color: '#ed6c02', icon: '⏳' },
    {
      label: 'المبلغ الإجمالي',
      value: fmtCurrency(stats?.totalAmount || 0),
      color: '#9c27b0',
      icon: '💰',
    },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        ⏰ إدارة العمل الإضافي
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        وفقاً لنظام العمل السعودي — المادة 107: أجر ساعة العمل الإضافي = أجر الساعة + 50% من الأجر
        الأساسي
      </Typography>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5">{s.icon}</Typography>
                <Typography variant="h5" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="caption">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Overtime Rate Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {OVERTIME_TYPES.map(t => (
          <Grid item xs={6} md={3} key={t.value}>
            <Paper
              sx={{
                p: 1.5,
                textAlign: 'center',
                border: `1px solid ${t.color}20`,
                bgcolor: `${t.color}08`,
              }}
            >
              <Box sx={{ color: t.color }}>{t.icon}</Box>
              <Typography variant="body2" fontWeight="bold">
                {t.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

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
              label="النوع"
              value={filters.type}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {OVERTIME_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
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
              طلب عمل إضافي جديد
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
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell>الرقم</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الساعات</TableCell>
                  <TableCell>المعامل</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map(r => {
                  const typeInfo = getTypeInfo(r.type);
                  return (
                    <TableRow key={r._id} hover>
                      <TableCell>
                        <strong>{r.requestNumber}</strong>
                      </TableCell>
                      <TableCell>
                        {r.employeeId?.firstName} {r.employeeId?.lastName}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.type}
                          size="small"
                          sx={{
                            bgcolor: `${typeInfo.color}15`,
                            color: typeInfo.color,
                            fontWeight: 'bold',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {r.date && new Date(r.date).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{r.hours} ساعة</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`×${r.calculation?.multiplier || typeInfo.multiplier}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold" color="success.main">
                          {fmtCurrency(r.calculation?.totalAmount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          color={statusColor[r.status] || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => handleView(r._id)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      لا توجد طلبات عمل إضافي
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
        <DialogTitle>طلب عمل إضافي جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="نوع العمل الإضافي"
                value={form.type}
                required
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {OVERTIME_TYPES.map(t => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={form.date}
                required
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت البداية"
                value={form.startTime}
                onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت النهاية"
                value={form.endTime}
                onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="number"
                label="عدد الساعات"
                value={form.hours}
                required
                onChange={e => setForm(p => ({ ...p, hours: e.target.value }))}
                inputProps={{ min: 0.5, max: 12, step: 0.5 }}
              />
            </Grid>
            {form.type && form.hours && (
              <Grid item xs={12}>
                <Alert severity="info">
                  المعامل: ×{getTypeInfo(form.type).multiplier} | المبلغ التقريبي: يتم حسابه بناءً
                  على الراتب الأساسي
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="سبب العمل الإضافي"
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
            disabled={!form.type || !form.date || !form.hours || !form.reason}
          >
            تقديم الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل طلب العمل الإضافي: {viewDialog?.requestNumber}</DialogTitle>
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
                  <strong>التاريخ:</strong>{' '}
                  {viewDialog.date && new Date(viewDialog.date).toLocaleDateString('ar-SA')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>من:</strong> {viewDialog.startTime}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>إلى:</strong> {viewDialog.endTime}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الساعات:</strong> {viewDialog.hours} ساعة
                </Typography>
              </Grid>
              <Grid item xs={6}>
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
                <Divider />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold">
                  حساب المبلغ:
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption">أجر الساعة</Typography>
                  <Typography fontWeight="bold">
                    {fmtCurrency(viewDialog.calculation?.hourlyRate)}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                  <Typography variant="caption">المعامل</Typography>
                  <Typography fontWeight="bold" color="warning.main">
                    ×{viewDialog.calculation?.multiplier}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                  <Typography variant="caption">المبلغ الإجمالي</Typography>
                  <Typography fontWeight="bold" color="success.main">
                    {fmtCurrency(viewDialog.calculation?.totalAmount)}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Typography>
                  <strong>السبب:</strong> {viewDialog.reason}
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
