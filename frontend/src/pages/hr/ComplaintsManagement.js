/**
 * Complaints Management — إدارة الشكاوى والتظلمات
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
  Tooltip,
  Card,
  CardContent,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Pending as PendingIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import {
  getComplaints,
  createComplaint,
  getComplaintById,
  updateComplaintStatus,
  getComplaintStats,
} from '../../services/hr/employeeAffairsExpandedService';

const TYPES = [
  'شكوى إدارية',
  'تظلم من قرار',
  'تحرش أو تنمر',
  'بيئة عمل',
  'تمييز',
  'مخالفة نظام',
  'راتب ومستحقات',
  'ترقية',
  'نقل',
  'أخرى',
];

const PRIORITIES = ['عاجل', 'مرتفع', 'متوسط', 'منخفض'];
const STATUSES = ['مقدمة', 'قيد المراجعة', 'قيد التحقيق', 'تم الحل', 'مرفوضة', 'مغلقة'];

const statusColor = {
  مقدمة: 'info',
  'قيد المراجعة': 'warning',
  'قيد التحقيق': 'secondary',
  'تم الحل': 'success',
  مرفوضة: 'error',
  مغلقة: 'default',
};

const priorityColor = {
  عاجل: 'error',
  مرتفع: 'warning',
  متوسط: 'info',
  منخفض: 'default',
};

export default function ComplaintsManagement() {
  const [complaints, setComplaints] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', type: '', priority: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    type: '',
    subject: '',
    description: '',
    priority: 'متوسط',
    isConfidential: false,
    isAnonymous: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [complaintsRes, statsRes] = await Promise.all([
        getComplaints({ ...filters, page: page + 1, limit: rowsPerPage }),
        getComplaintStats(),
      ]);
      setComplaints(complaintsRes?.complaints || complaintsRes?.data?.complaints || []);
      setTotal(complaintsRes?.total || 0);
      setStats(statsRes?.data || statsRes);
    } catch (e) {
      console.error('Error fetching complaints:', e);
    }
    setLoading(false);
  }, [filters, page, rowsPerPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      await createComplaint(form);
      setOpenDialog(false);
      setForm({
        type: '',
        subject: '',
        description: '',
        priority: 'متوسط',
        isConfidential: false,
        isAnonymous: false,
      });
      setSnackbar({ open: true, message: 'تم تقديم الشكوى بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getComplaintById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateComplaintStatus(id, { status });
      setSnackbar({ open: true, message: 'تم تحديث حالة الشكوى', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'حدث خطأ', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        🗣️ إدارة الشكاوى والتظلمات
      </Typography>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ bgcolor: '#e3f2fd' }}>
              <CardContent>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {stats.total || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إجمالي الشكاوى
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          {(stats.byStatus || []).slice(0, 3).map((s, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Typography variant="h3" fontWeight="bold">
                    {s.count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s._id}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

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
              {STATUSES.map(s => (
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
              {TYPES.map(t => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              size="small"
              label="الأولوية"
              value={filters.priority}
              onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {PRIORITIES.map(p => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              fullWidth
            >
              تقديم شكوى جديدة
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
                  <TableCell>رقم الشكوى</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الموضوع</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {complaints.map(c => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <strong>{c.complaintNumber}</strong>
                    </TableCell>
                    <TableCell>
                      {c.employeeId?.firstName} {c.employeeId?.lastName}
                    </TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell>
                      <Chip
                        label={c.priority}
                        color={priorityColor[c.priority] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.status}
                        color={statusColor[c.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{new Date(c.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => handleView(c._id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {complaints.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      لا توجد شكاوى
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
        <DialogTitle>تقديم شكوى جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="نوع الشكوى"
                value={form.type}
                required
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {TYPES.map(t => (
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
                label="الأولوية"
                value={form.priority}
                onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
              >
                {PRIORITIES.map(p => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الموضوع"
                value={form.subject}
                required
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="التفاصيل"
                value={form.description}
                required
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.type || !form.subject || !form.description}
          >
            تقديم الشكوى
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل الشكوى: {viewDialog?.complaintNumber}</DialogTitle>
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
                  <strong>الأولوية:</strong>{' '}
                  <Chip
                    label={viewDialog.priority}
                    color={priorityColor[viewDialog.priority]}
                    size="small"
                  />
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>الموضوع:</strong> {viewDialog.subject}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>التفاصيل:</strong> {viewDialog.description}
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
                <Typography variant="subtitle2" sx={{ mt: 2 }}>
                  تغيير الحالة:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                  {STATUSES.filter(s => s !== viewDialog.status).map(s => (
                    <Button
                      key={s}
                      variant="outlined"
                      size="small"
                      onClick={() => handleStatusChange(viewDialog._id, s)}
                    >
                      {s}
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
