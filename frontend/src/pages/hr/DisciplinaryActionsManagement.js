/**
 * Disciplinary Actions Management — إدارة الإنذارات والإجراءات التأديبية
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import {
  getDisciplinaryActions,
  createDisciplinaryAction,
  getDisciplinaryActionById,
  approveDisciplinaryAction,} from '../../services/hr/employeeAffairsExpandedService';

const ACTION_TYPES = [
  'تنبيه شفهي',
  'إنذار كتابي أول',
  'إنذار كتابي ثاني',
  'إنذار نهائي',
  'خصم من الراتب',
  'إيقاف عن العمل',
  'تخفيض الدرجة',
  'فصل مع مكافأة',
  'فصل بدون مكافأة',
];

const SEVERITIES = ['بسيطة', 'متوسطة', 'جسيمة', 'خطيرة'];

const VIOLATION_TYPES = [
  'تأخر متكرر',
  'غياب بدون إذن',
  'إهمال في العمل',
  'سوء سلوك',
  'مخالفة أنظمة السلامة',
  'إفشاء أسرار',
  'تزوير مستندات',
  'سرقة',
  'اعتداء',
  'أخرى',
];

const statusColor = {
  مسودة: 'default',
  'بانتظار الموافقة': 'warning',
  معتمد: 'primary',
  'تم التنفيذ': 'success',
  'تم الاعتراض': 'secondary',
  ملغي: 'error',
};

const severityColor = {
  بسيطة: 'info',
  متوسطة: 'warning',
  جسيمة: 'error',
  خطيرة: 'error',
};

export default function DisciplinaryActionsManagement() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', type: '', severity: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    type: '',
    severity: '',
    violationType: '',
    violationDescription: '',
    violationDate: '',
    employeeId: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDisciplinaryActions({ ...filters, page: page + 1, limit: rowsPerPage });
      setActions(res?.actions || res?.data?.actions || []);
      setTotal(res?.total || 0);
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
      await createDisciplinaryAction({
        ...form,
        violation: {
          type: form.violationType,
          description: form.violationDescription,
          date: form.violationDate,
        },
      });
      setOpenDialog(false);
      setForm({
        type: '',
        severity: '',
        violationType: '',
        violationDescription: '',
        violationDate: '',
        employeeId: '',
      });
      setSnackbar({ open: true, message: 'تم إنشاء الإجراء التأديبي بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getDisciplinaryActionById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await approveDisciplinaryAction(id, { approved });
      setSnackbar({
        open: true,
        message: approved ? 'تم الاعتماد' : 'تم الإلغاء',
        severity: approved ? 'success' : 'warning',
      });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        ⚖️ إدارة الإنذارات والإجراءات التأديبية
      </Typography>

      {/* Filters & Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
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
              {Object.keys(statusColor).map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="الجسامة"
              value={filters.severity}
              onChange={e => setFilters(p => ({ ...p, severity: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {SEVERITIES.map(s => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="النوع"
              value={filters.type}
              onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {ACTION_TYPES.map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              color="warning"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              fullWidth
            >
              إجراء تأديبي جديد
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
                  <TableCell>المخالفة</TableCell>
                  <TableCell>الجسامة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {actions.map(a => (
                  <TableRow key={a._id} hover>
                    <TableCell>
                      <strong>{a.actionNumber}</strong>
                    </TableCell>
                    <TableCell>
                      {a.employeeId?.firstName} {a.employeeId?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip label={a.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {a.violation?.type || a.violation?.description?.slice(0, 40)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.severity}
                        color={severityColor[a.severity] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={a.status}
                        color={statusColor[a.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(a.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => handleView(a._id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {actions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      لا توجد إجراءات تأديبية
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
        <DialogTitle>إنشاء إجراء تأديبي جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="نوع الإجراء"
                value={form.type}
                required
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {ACTION_TYPES.map(t => (
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
                label="درجة الجسامة"
                value={form.severity}
                required
                onChange={e => setForm(p => ({ ...p, severity: e.target.value }))}
              >
                {SEVERITIES.map(s => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="نوع المخالفة"
                value={form.violationType}
                required
                onChange={e => setForm(p => ({ ...p, violationType: e.target.value }))}
              >
                {VIOLATION_TYPES.map(v => (
                  <MenuItem key={v} value={v}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ المخالفة"
                value={form.violationDate}
                required
                onChange={e => setForm(p => ({ ...p, violationDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="وصف المخالفة"
                value={form.violationDescription}
                required
                onChange={e => setForm(p => ({ ...p, violationDescription: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleCreate}
            disabled={
              !form.type || !form.severity || !form.violationType || !form.violationDescription
            }
          >
            إنشاء الإجراء
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل الإجراء التأديبي: {viewDialog?.actionNumber}</DialogTitle>
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
                  <strong>الجسامة:</strong>{' '}
                  <Chip
                    label={viewDialog.severity}
                    color={severityColor[viewDialog.severity]}
                    size="small"
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>المخالفة:</strong> {viewDialog.violation?.description}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>نوع المخالفة:</strong> {viewDialog.violation?.type}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>تاريخ المخالفة:</strong>{' '}
                  {viewDialog.violation?.date &&
                    new Date(viewDialog.violation.date).toLocaleDateString('ar-SA')}
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
                    اعتماد
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleApprove(viewDialog._id, false)}
                  >
                    إلغاء
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
