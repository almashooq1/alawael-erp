/**
 * Rewards & Incentives Management — إدارة المكافآت والحوافز
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
  CheckCircle as ApproveIcon,
  Payment as PayIcon,
  EmojiEvents as TrophyIcon,
} from '@mui/icons-material';
import {
  getRewards,
  createReward,
  getRewardById,
  approveReward,
  disburseReward,
  getRewardStats,
} from '../../services/hr/employeeAffairsPhase2Service';

const TYPES = [
  'مكافأة شهرية',
  'مكافأة سنوية',
  'حافز أداء',
  'مكافأة مشروع',
  'بونص',
  'حافز حضور',
  'حافز إنتاجية',
  'مكافأة ابتكار',
  'مكافأة خدمة طويلة',
  'مكافأة تميز',
  'حافز مبيعات',
  'مكافأة إحالة',
  'جائزة',
  'شهادة تقدير',
];
const CATEGORIES = ['مالية', 'نقاط', 'تقديرية', 'عينية'];
const STATUSES = ['مقترحة', 'معتمدة', 'مرفوضة', 'صرفت', 'ملغية'];
const statusColor = {
  مقترحة: 'info',
  معتمدة: 'success',
  مرفوضة: 'error',
  صرفت: 'primary',
  ملغية: 'default',
};
const categoryIcon = { مالية: '💰', نقاط: '⭐', تقديرية: '🏆', عينية: '🎁' };
const fmtCurrency = v => (v !== null && v > 0 ? `${Number(v).toLocaleString('ar-SA')} ر.س` : '-');

export default function RewardsManagement() {
  const [rewards, setRewards] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    type: '',
    category: 'مالية',
    amount: '',
    points: '',
    reason: '',
    description: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        getRewards({ ...filters, page: page + 1, limit: rowsPerPage }),
        getRewardStats(),
      ]);
      setRewards(res?.rewards || res?.data?.rewards || []);
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
      await createReward({ ...form, amount: Number(form.amount), points: Number(form.points) });
      setOpenDialog(false);
      setForm({ type: '', category: 'مالية', amount: '', points: '', reason: '', description: '' });
      setSnackbar({ open: true, message: 'تم تقديم المكافأة للاعتماد', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getRewardById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async id => {
    try {
      await approveReward(id, { decision: 'approved' });
      setSnackbar({ open: true, message: 'تم اعتماد المكافأة', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleDisburse = async id => {
    try {
      await disburseReward(id, { paymentMethod: 'تحويل بنكي' });
      setSnackbar({ open: true, message: 'تم صرف المكافأة', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const hasFinancial = form.category === 'مالية' || form.category === 'عينية';

  const statCards = [
    { label: 'إجمالي المكافآت', value: stats?.total || 0, color: '#1976d2', icon: '🏆' },
    { label: 'تم صرفها', value: stats?.totalDisbursed || 0, color: '#4caf50', icon: '💰' },
    { label: 'قيد الاعتماد', value: stats?.pending || 0, color: '#ff9800', icon: '⏳' },
    {
      label: 'إجمالي المبالغ',
      value: fmtCurrency(stats?.totalAmount || 0),
      color: '#9c27b0',
      icon: '💵',
    },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        🏆 إدارة المكافآت والحوافز
      </Typography>

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
              label="الفئة"
              value={filters.category}
              onChange={e => setFilters(p => ({ ...p, category: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {CATEGORIES.map(c => (
                <MenuItem key={c} value={c}>
                  {categoryIcon[c]} {c}
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
              مكافأة جديدة
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
                <TableRow sx={{ bgcolor: '#fce4ec' }}>
                  <TableCell>الرقم</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>النقاط</TableCell>
                  <TableCell>السبب</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rewards.map(r => (
                  <TableRow key={r._id} hover>
                    <TableCell>
                      <strong>{r.rewardNumber}</strong>
                    </TableCell>
                    <TableCell>
                      {r.employeeId?.firstName} {r.employeeId?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip label={r.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<span>{categoryIcon[r.category]}</span>}
                        label={r.category}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>{fmtCurrency(r.amount)}</TableCell>
                    <TableCell>{r.points > 0 ? `${r.points} ⭐` : '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {r.reason}
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
                      {r.status === 'مقترحة' && (
                        <Tooltip title="اعتماد">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(r._id)}
                          >
                            <ApproveIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {r.status === 'معتمدة' && (
                        <Tooltip title="صرف">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleDisburse(r._id)}
                          >
                            <PayIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {rewards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      لا توجد مكافآت
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
        <DialogTitle>إضافة مكافأة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="نوع المكافأة"
                required
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
                label="الفئة"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>
                    {categoryIcon[c]} {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            {hasFinancial && (
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="المبلغ (ر.س)"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                />
              </Grid>
            )}
            <Grid item xs={hasFinancial ? 6 : 12}>
              <TextField
                fullWidth
                type="number"
                label="النقاط"
                value={form.points}
                onChange={e => setForm(p => ({ ...p, points: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="السبب"
                required
                value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="تفاصيل إضافية"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.type || !form.reason}>
            تقديم
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <TrophyIcon sx={{ mr: 1, verticalAlign: 'middle', color: '#ff9800' }} />
          {viewDialog?.type} — {viewDialog?.rewardNumber}
        </DialogTitle>
        <DialogContent>
          {viewDialog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography>
                  <strong>الموظف:</strong> {viewDialog.employeeId?.firstName}{' '}
                  {viewDialog.employeeId?.lastName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الفئة:</strong> {categoryIcon[viewDialog.category]} {viewDialog.category}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>المبلغ:</strong> {fmtCurrency(viewDialog.amount)}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>النقاط:</strong> {viewDialog.points > 0 ? `${viewDialog.points} ⭐` : '-'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography>
                  <strong>السبب:</strong> {viewDialog.reason}
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
              {viewDialog.approvedBy && (
                <Grid item xs={6}>
                  <Typography>
                    <strong>اعتمد بواسطة:</strong> {viewDialog.approvedBy?.firstName}
                  </Typography>
                </Grid>
              )}
              {viewDialog.disbursedDate && (
                <Grid item xs={6}>
                  <Typography>
                    <strong>تاريخ الصرف:</strong>{' '}
                    {new Date(viewDialog.disbursedDate).toLocaleDateString('ar-SA')}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {viewDialog.status === 'مقترحة' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ApproveIcon />}
                      onClick={() => handleApprove(viewDialog._id)}
                    >
                      اعتماد
                    </Button>
                  )}
                  {viewDialog.status === 'معتمدة' && (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<PayIcon />}
                      onClick={() => handleDisburse(viewDialog._id)}
                    >
                      صرف
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
