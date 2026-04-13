/**
 * Task Management — إدارة المهام والتكليفات
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
  LinearProgress,} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Flag as FlagIcon,
  } from '@mui/icons-material';
import {
  getTasks,
  createTask,
  getTaskById,
  updateTaskStatus,
  addTaskComment,  getTaskStats,
} from '../../services/hr/employeeAffairsPhase2Service';

const TYPES = ['مهمة عادية', 'تكليف رسمي', 'مشروع', 'مهمة عاجلة', 'متابعة', 'تحسين', 'بحث ودراسة'];
const PRIORITIES = ['منخفضة', 'متوسطة', 'عالية', 'حرجة'];
const STATUSES = ['جديدة', 'قيد التنفيذ', 'في الانتظار', 'مراجعة', 'مكتملة', 'ملغية', 'مؤجلة'];

const priorityColor = { منخفضة: '#4caf50', متوسطة: '#2196f3', عالية: '#ff9800', حرجة: '#f44336' };
const statusColor = {
  جديدة: 'info',
  'قيد التنفيذ': 'primary',
  'في الانتظار': 'warning',
  مراجعة: 'secondary',
  مكتملة: 'success',
  ملغية: 'default',
  مؤجلة: 'warning',
};

export default function TaskManagement() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [comment, setComment] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: '',
    priority: 'متوسطة',
    dueDate: '',
    department: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        getTasks({ ...filters, page: page + 1, limit: rowsPerPage }),
        getTaskStats(filters),
      ]);
      setTasks(res?.tasks || res?.data?.tasks || []);
      setTotal(res?.total || res?.data?.total || 0);
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
      await createTask(form);
      setOpenDialog(false);
      setForm({
        title: '',
        description: '',
        type: '',
        priority: 'متوسطة',
        dueDate: '',
        department: '',
      });
      setSnackbar({ open: true, message: 'تم إنشاء المهمة بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getTaskById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateTaskStatus(id, { status });
      setSnackbar({ open: true, message: 'تم تحديث الحالة', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !viewDialog) return;
    try {
      await addTaskComment(viewDialog._id, { text: comment });
      setComment('');
      setSnackbar({ open: true, message: 'تمت إضافة التعليق', severity: 'success' });
      handleView(viewDialog._id);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const isOverdue = d => d && new Date(d) < new Date();

  const statCards = [
    { label: 'إجمالي المهام', value: stats?.total || 0, color: '#1976d2', icon: '📋' },
    {
      label: 'قيد التنفيذ',
      value: stats?.byStatus?.find(s => s._id === 'قيد التنفيذ')?.count || 0,
      color: '#2e7d32',
      icon: '🔄',
    },
    { label: 'متأخرة', value: stats?.overdue || 0, color: '#d32f2f', icon: '⚠️' },
    {
      label: 'مكتملة',
      value: stats?.byStatus?.find(s => s._id === 'مكتملة')?.count || 0,
      color: '#9c27b0',
      icon: '✅',
    },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📋 إدارة المهام والتكليفات
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
          <Grid item xs={12} sm={3} />
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              fullWidth
            >
              مهمة جديدة
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
                  <TableCell>المهمة</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>المسند إليه</TableCell>
                  <TableCell>التقدم</TableCell>
                  <TableCell>الموعد</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map(t => (
                  <TableRow
                    key={t._id}
                    hover
                    sx={isOverdue(t.dueDate) && t.status !== 'مكتملة' ? { bgcolor: '#fff3e0' } : {}}
                  >
                    <TableCell>
                      <strong>{t.taskNumber}</strong>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {t.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.department}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={t.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<FlagIcon />}
                        label={t.priority}
                        size="small"
                        sx={{
                          bgcolor: `${priorityColor[t.priority]}20`,
                          color: priorityColor[t.priority],
                          fontWeight: 'bold',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {t.assignedTo?.firstName} {t.assignedTo?.lastName}
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={t.progress || 0}
                          sx={{ flex: 1, height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="caption">{t.progress || 0}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color={
                          isOverdue(t.dueDate) && t.status !== 'مكتملة' ? 'error' : 'text.primary'
                        }
                      >
                        {t.dueDate && new Date(t.dueDate).toLocaleDateString('ar-SA')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={t.status}
                        color={statusColor[t.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => handleView(t._id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      لا توجد مهام
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
        <DialogTitle>إنشاء مهمة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="عنوان المهمة"
                required
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الوصف"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="النوع"
                value={form.type}
                onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              >
                {TYPES.map(t => (
                  <MenuItem key={t} value={t}>
                    {t}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
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
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="الموعد النهائي"
                InputLabelProps={{ shrink: true }}
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={form.department}
                onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.title || !form.dueDate}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog?.title} — {viewDialog?.taskNumber}
        </DialogTitle>
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
                    size="small"
                    sx={{
                      bgcolor: `${priorityColor[viewDialog.priority]}20`,
                      color: priorityColor[viewDialog.priority],
                    }}
                  />
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>المسند إليه:</strong> {viewDialog.assignedTo?.firstName}{' '}
                  {viewDialog.assignedTo?.lastName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الموعد:</strong>{' '}
                  {viewDialog.dueDate && new Date(viewDialog.dueDate).toLocaleDateString('ar-SA')}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>
                  <strong>التقدم:</strong> {viewDialog.progress}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={viewDialog.progress || 0}
                  sx={{ height: 10, borderRadius: 5 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>الوصف:</strong> {viewDialog.description}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
              {/* Comments */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight="bold">
                  التعليقات:
                </Typography>
                {viewDialog.comments?.map((c, i) => (
                  <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2">{c.text}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {c.author?.firstName} — {new Date(c.createdAt).toLocaleString('ar-SA')}
                    </Typography>
                  </Paper>
                ))}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="أضف تعليق..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    onClick={handleAddComment}
                    disabled={!comment.trim()}
                  >
                    إرسال
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
