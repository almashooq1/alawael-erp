/**
 * Work Permits & Iqama Management — إدارة تصاريح العمل والإقامات
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  getWorkPermits,
  createWorkPermit,
  getWorkPermitById,
  renewWorkPermit,
  getExpiringPermits,
  getWorkPermitStats,
} from '../../services/hr/employeeAffairsPhase2Service';

const DOC_TYPES = [
  'إقامة',
  'تصريح عمل',
  'جواز سفر',
  'تأشيرة خروج وعودة',
  'تأشيرة خروج نهائي',
  'رخصة قيادة',
  'تأمين طبي',
  'بطاقة هوية',
  'شهادة مهنية',
  'تصريح أمني',
];
const STATUSES = ['ساري', 'منتهي', 'قيد التجديد', 'ملغي', 'قيد المعالجة'];
const statusColor = {
  ساري: 'success',
  منتهي: 'error',
  'قيد التجديد': 'warning',
  ملغي: 'default',
  'قيد المعالجة': 'info',
};
const fmtCurrency = v => (v != null && v > 0 ? `${Number(v).toLocaleString('ar-SA')} ر.س` : '-');
const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '-');

const daysUntilExpiry = d => {
  if (!d) return null;
  return Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
};

export default function WorkPermitsManagement() {
  const [permits, setPermits] = useState([]);
  const [stats, setStats] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ documentType: '', status: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    documentType: '',
    documentNumber: '',
    issueDate: '',
    expiryDate: '',
    issuePlace: '',
    governmentFee: '',
    serviceFee: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st, exp] = await Promise.all([
        getWorkPermits({ ...filters, page: page + 1, limit: rowsPerPage }),
        getWorkPermitStats(),
        getExpiringPermits(60),
      ]);
      setPermits(res?.permits || res?.data?.permits || []);
      setTotal(res?.total || res?.data?.total || 0);
      setStats(st?.data || st);
      setExpiring(exp?.data || exp || []);
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
      await createWorkPermit({
        ...form,
        governmentFee: Number(form.governmentFee),
        serviceFee: Number(form.serviceFee),
      });
      setOpenDialog(false);
      setForm({
        documentType: '',
        documentNumber: '',
        issueDate: '',
        expiryDate: '',
        issuePlace: '',
        governmentFee: '',
        serviceFee: '',
      });
      setSnackbar({ open: true, message: 'تم تسجيل المستند بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getWorkPermitById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRenew = async id => {
    try {
      await renewWorkPermit(id, {
        newExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fees: 0,
      });
      setSnackbar({ open: true, message: 'تم طلب التجديد', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const expiryChip = expiryDate => {
    const d = daysUntilExpiry(expiryDate);
    if (d === null) return null;
    if (d <= 0) return <Chip icon={<WarningIcon />} label="منتهي" color="error" size="small" />;
    if (d <= 30)
      return (
        <Chip
          icon={<WarningIcon />}
          label={`${d} يوم`}
          color="error"
          size="small"
          variant="outlined"
        />
      );
    if (d <= 90) return <Chip label={`${d} يوم`} color="warning" size="small" variant="outlined" />;
    return (
      <Chip
        icon={<ValidIcon />}
        label={`${d} يوم`}
        color="success"
        size="small"
        variant="outlined"
      />
    );
  };

  const statCards = [
    { label: 'إجمالي المستندات', value: stats?.total || 0, color: '#1976d2', icon: '📄' },
    { label: 'سارية', value: stats?.active || 0, color: '#4caf50', icon: '✅' },
    { label: 'منتهية', value: stats?.expired || 0, color: '#d32f2f', icon: '❌' },
    { label: 'قريبة الانتهاء', value: stats?.expiringSoon || 0, color: '#ff9800', icon: '⚠️' },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📄 إدارة تصاريح العمل والإقامات
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {statCards.map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${s.color}` }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h5">{s.icon}</Typography>
                <Typography variant="h4" fontWeight="bold" color={s.color}>
                  {s.value}
                </Typography>
                <Typography variant="caption">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Expiring alerts */}
      {expiring.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>تنبيه:</strong> يوجد {expiring.length} مستند(ات) قريبة الانتهاء خلال 60 يوم
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="نوع المستند"
              value={filters.documentType}
              onChange={e => setFilters(p => ({ ...p, documentType: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {DOC_TYPES.map(d => (
                <MenuItem key={d} value={d}>
                  {d}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="الحالة"
              value={filters.status}
              onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {STATUSES.map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3} />
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              fullWidth
            >
              تسجيل مستند
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell>الرقم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>رقم المستند</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>الإصدار</TableCell>
                  <TableCell>الانتهاء</TableCell>
                  <TableCell>المدة المتبقية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permits.map(p => (
                  <TableRow
                    key={p._id}
                    hover
                    sx={daysUntilExpiry(p.expiryDate) <= 30 ? { bgcolor: '#fff3e0' } : {}}
                  >
                    <TableCell>
                      <strong>{p.recordNumber}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip label={p.documentType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{p.documentNumber}</TableCell>
                    <TableCell>
                      {p.employeeId?.firstName} {p.employeeId?.lastName}
                    </TableCell>
                    <TableCell>{fmtDate(p.issueDate)}</TableCell>
                    <TableCell>{fmtDate(p.expiryDate)}</TableCell>
                    <TableCell>{expiryChip(p.expiryDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={p.status}
                        color={statusColor[p.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => handleView(p._id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {daysUntilExpiry(p.expiryDate) <= 90 && p.status !== 'قيد التجديد' && (
                        <Tooltip title="تجديد">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={() => handleRenew(p._id)}
                          >
                            <RenewIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {permits.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      لا توجد مستندات
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
        <DialogTitle>تسجيل مستند جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="نوع المستند"
                required
                value={form.documentType}
                onChange={e => setForm(p => ({ ...p, documentType: e.target.value }))}
              >
                {DOC_TYPES.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="رقم المستند"
                required
                value={form.documentNumber}
                onChange={e => setForm(p => ({ ...p, documentNumber: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الإصدار"
                InputLabelProps={{ shrink: true }}
                value={form.issueDate}
                onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                InputLabelProps={{ shrink: true }}
                value={form.expiryDate}
                onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="مكان الإصدار"
                value={form.issuePlace}
                onChange={e => setForm(p => ({ ...p, issuePlace: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الرسوم الحكومية"
                value={form.governmentFee}
                onChange={e => setForm(p => ({ ...p, governmentFee: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="رسوم الخدمة"
                value={form.serviceFee}
                onChange={e => setForm(p => ({ ...p, serviceFee: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.documentType || !form.documentNumber}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog?.documentType} — {viewDialog?.recordNumber}
        </DialogTitle>
        <DialogContent>
          {viewDialog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography>
                  <strong>النوع:</strong> {viewDialog.documentType}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>رقم المستند:</strong> {viewDialog.documentNumber}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الموظف:</strong> {viewDialog.employeeId?.firstName}{' '}
                  {viewDialog.employeeId?.lastName}
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
              <Grid item xs={6}>
                <Typography>
                  <strong>تاريخ الإصدار:</strong> {fmtDate(viewDialog.issueDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>تاريخ الانتهاء:</strong> {fmtDate(viewDialog.expiryDate)}{' '}
                  {expiryChip(viewDialog.expiryDate)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>مكان الإصدار:</strong> {viewDialog.issuePlace}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الرسوم:</strong>{' '}
                  {fmtCurrency((viewDialog.governmentFee || 0) + (viewDialog.serviceFee || 0))}
                </Typography>
              </Grid>
              {viewDialog.muqeemNumber && (
                <Grid item xs={6}>
                  <Typography>
                    <strong>رقم مقيم:</strong> {viewDialog.muqeemNumber}
                  </Typography>
                </Grid>
              )}
              {viewDialog.renewalHistory?.length > 0 && (
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    سجل التجديدات:
                  </Typography>
                  {viewDialog.renewalHistory.map((r, i) => (
                    <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#f5f5f5' }}>
                      <Typography variant="body2">
                        <strong>تجديد #{i + 1}</strong> — الانتهاء الجديد:{' '}
                        {fmtDate(r.newExpiryDate)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        الرسوم: {fmtCurrency(r.fees)} — {fmtDate(r.renewedAt)}
                      </Typography>
                    </Paper>
                  ))}
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {viewDialog.status !== 'قيد التجديد' && (
                    <Button
                      variant="contained"
                      color="warning"
                      startIcon={<RenewIcon />}
                      onClick={() => handleRenew(viewDialog._id)}
                    >
                      تجديد
                    </Button>
                  )}
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
