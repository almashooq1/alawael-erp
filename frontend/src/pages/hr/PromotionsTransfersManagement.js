/**
 * Promotions & Transfers Management — إدارة الترقيات والتنقلات
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Tooltip,  Alert,
  Snackbar,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  TrendingUp as PromoteIcon,
  SwapHoriz as TransferIcon,
  ThumbUp as ApproveIcon,
  PlayArrow as ExecuteIcon,
} from '@mui/icons-material';
import {
  getPromotionTransfers,
  createPromotionTransfer,
  getPromotionTransferById,
  approvePromotionTransferStep,
  executePromotionTransfer,
} from '../../services/hr/employeeAffairsExpandedService';

const REQUEST_TYPES = ['ترقية', 'نقل داخلي', 'نقل خارجي', 'انتداب', 'إعارة', 'تكليف'];

const DEPARTMENTS = [
  'تقنية المعلومات',
  'الموارد البشرية',
  'المالية',
  'المبيعات',
  'التسويق',
  'الإدارة',
  'العمليات',
  'خدمة العملاء',
  'الجودة',
  'المشتريات',
];

const statusColor = {
  مقترح: 'info',
  'موافقة المدير المباشر': 'warning',
  'موافقة الموارد البشرية': 'warning',
  'موافقة الإدارة العليا': 'warning',
  معتمد: 'primary',
  'تم التنفيذ': 'success',
  مرفوض: 'error',
  ملغي: 'default',
};

const approvalSteps = ['المدير المباشر', 'الموارد البشرية', 'الإدارة العليا'];

export default function PromotionsTransfersManagement() {
  const [requests, setRequests] = useState([]);
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
    reason: '',
    effectiveDate: '',
    currentDepartment: '',
    currentPosition: '',
    currentGrade: '',
    proposedDepartment: '',
    proposedPosition: '',
    proposedGrade: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPromotionTransfers({ ...filters, page: page + 1, limit: rowsPerPage });
      setRequests(res?.requests || res?.data?.requests || []);
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
      await createPromotionTransfer({
        type: form.type,
        reason: form.reason,
        effectiveDate: form.effectiveDate,
        current: {
          department: form.currentDepartment,
          position: form.currentPosition,
          grade: form.currentGrade,
        },
        proposed: {
          department: form.proposedDepartment,
          position: form.proposedPosition,
          grade: form.proposedGrade,
        },
      });
      setOpenDialog(false);
      setForm({
        type: '',
        reason: '',
        effectiveDate: '',
        currentDepartment: '',
        currentPosition: '',
        currentGrade: '',
        proposedDepartment: '',
        proposedPosition: '',
        proposedGrade: '',
      });
      setSnackbar({ open: true, message: 'تم تقديم الطلب بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getPromotionTransferById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id, approved) => {
    try {
      await approvePromotionTransferStep(id, { approved });
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

  const handleExecute = async id => {
    try {
      await executePromotionTransfer(id);
      setSnackbar({ open: true, message: 'تم تنفيذ القرار بنجاح', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const getActiveStep = workflow => {
    if (!workflow) return 0;
    const approved = workflow.filter(s => s.status === 'موافق').length;
    return approved;
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📈 إدارة الترقيات والتنقلات
      </Typography>

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
              {REQUEST_TYPES.map(t => (
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
              طلب ترقية / نقل جديد
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
                <TableRow sx={{ bgcolor: '#e8f5e9' }}>
                  <TableCell>الرقم</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>من</TableCell>
                  <TableCell>إلى</TableCell>
                  <TableCell>التاريخ الفعلي</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <strong>{r.requestNumber}</strong>
                    </TableCell>
                    <TableCell>
                      {r.employeeId?.firstName} {r.employeeId?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={r.type === 'ترقية' ? <PromoteIcon /> : <TransferIcon />}
                        label={r.type}
                        size="small"
                        variant="outlined"
                        color={r.type === 'ترقية' ? 'success' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{r.current?.department}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.current?.position}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {r.proposed?.department}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {r.proposed?.position}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {r.effectiveDate && new Date(r.effectiveDate).toLocaleDateString('ar-SA')}
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
                ))}
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>طلب ترقية / نقل جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.type}
                required
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {REQUEST_TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ الفعلي"
                value={form.effectiveDate}
                required
                onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Current Position */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="error">
                الوضع الحالي:
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="القسم الحالي"
                value={form.currentDepartment}
                onChange={e => setForm(p => ({ ...p, currentDepartment: e.target.value }))}
              >
                {DEPARTMENTS.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="المسمى الحالي"
                value={form.currentPosition}
                onChange={e => setForm(p => ({ ...p, currentPosition: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الدرجة الحالية"
                value={form.currentGrade}
                onChange={e => setForm(p => ({ ...p, currentGrade: e.target.value }))}
              />
            </Grid>

            {/* Proposed Position */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                الوضع المقترح:
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                select
                fullWidth
                label="القسم المقترح"
                value={form.proposedDepartment}
                onChange={e => setForm(p => ({ ...p, proposedDepartment: e.target.value }))}
              >
                {DEPARTMENTS.map(d => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="المسمى المقترح"
                value={form.proposedPosition}
                onChange={e => setForm(p => ({ ...p, proposedPosition: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="الدرجة المقترحة"
                value={form.proposedGrade}
                onChange={e => setForm(p => ({ ...p, proposedGrade: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="المبررات"
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
            disabled={!form.type || !form.reason || !form.effectiveDate}
          >
            تقديم الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog?.type}: {viewDialog?.requestNumber}
        </DialogTitle>
        <DialogContent>
          {viewDialog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Stepper activeStep={getActiveStep(viewDialog.approvalWorkflow)} alternativeLabel>
                  {approvalSteps.map(label => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                  <Typography variant="subtitle2" color="error">
                    الوضع الحالي
                  </Typography>
                  <Typography>
                    {viewDialog.current?.department} - {viewDialog.current?.position}
                  </Typography>
                  <Typography variant="caption">الدرجة: {viewDialog.current?.grade}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                  <Typography variant="subtitle2" color="success.main">
                    الوضع المقترح
                  </Typography>
                  <Typography>
                    {viewDialog.proposed?.department} - {viewDialog.proposed?.position}
                  </Typography>
                  <Typography variant="caption">الدرجة: {viewDialog.proposed?.grade}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>المبررات:</strong> {viewDialog.reason}
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
                  {viewDialog.status === 'معتمد' && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<ExecuteIcon />}
                      onClick={() => handleExecute(viewDialog._id)}
                    >
                      تنفيذ
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
