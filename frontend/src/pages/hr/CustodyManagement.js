/**
 * Custody & Asset Management — إدارة العهد والممتلكات
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
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineDot,
  TimelineContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  AssignmentReturn as ReturnIcon,
  ReportProblem as IssueIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';
import {
  getCustodies,
  createCustody,
  getCustodyById,
  returnCustody,
  reportCustodyIssue,
  getCustodyStats,
} from '../../services/hr/employeeAffairsPhase2Service';

const CATEGORIES = [
  'حاسب محمول',
  'حاسب مكتبي',
  'هاتف جوال',
  'جهاز لوحي',
  'مفاتيح',
  'سيارة',
  'أدوات عمل',
  'أثاث مكتبي',
  'معدات سلامة',
  'بطاقة دخول',
  'أخرى',
];
const CONDITIONS = ['ممتاز', 'جيد', 'متوسط', 'سيء', 'تالف'];
const statusColor = {
  مسلّمة: 'primary',
  مرتجعة: 'success',
  'قيد الصيانة': 'warning',
  مفقودة: 'error',
  تالفة: 'error',
  مستلمة: 'info',
};
const categoryIcon = {
  'حاسب محمول': '💻',
  'حاسب مكتبي': '🖥️',
  'هاتف جوال': '📱',
  'جهاز لوحي': '📟',
  مفاتيح: '🔑',
  سيارة: '🚗',
  'أدوات عمل': '🔧',
  'أثاث مكتبي': '🪑',
  'معدات سلامة': '🦺',
  'بطاقة دخول': '🪪',
};

const fmtCurrency = v => (v != null && v > 0 ? `${Number(v).toLocaleString('ar-SA')} ر.س` : '-');

export default function CustodyManagement() {
  const [custodies, setCustodies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ status: '', assetCategory: '' });
  const [openDialog, setOpenDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [form, setForm] = useState({
    assetName: '',
    assetCategory: '',
    serialNumber: '',
    description: '',
    condition: 'جيد',
    purchaseValue: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        getCustodies({ ...filters, page: page + 1, limit: rowsPerPage }),
        getCustodyStats(),
      ]);
      setCustodies(res?.custodies || res?.data?.custodies || []);
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
      await createCustody({
        ...form,
        purchaseValue: Number(form.purchaseValue),
        currentValue: Number(form.purchaseValue),
      });
      setOpenDialog(false);
      setForm({
        assetName: '',
        assetCategory: '',
        serialNumber: '',
        description: '',
        condition: 'جيد',
        purchaseValue: '',
      });
      setSnackbar({ open: true, message: 'تم تسجيل العهدة بنجاح', severity: 'success' });
      fetchData();
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleView = async id => {
    try {
      const res = await getCustodyById(id);
      setViewDialog(res?.data || res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReturn = async id => {
    try {
      await returnCustody(id, { condition: 'جيد' });
      setSnackbar({ open: true, message: 'تم استلام العهدة', severity: 'success' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const handleIssue = async (id, action) => {
    try {
      await reportCustodyIssue(id, { action, notes: `تم الإبلاغ عن ${action}` });
      setSnackbar({ open: true, message: `تم الإبلاغ عن ${action}`, severity: 'warning' });
      fetchData();
      setViewDialog(null);
    } catch (e) {
      setSnackbar({ open: true, message: e.message, severity: 'error' });
    }
  };

  const statCards = [
    { label: 'إجمالي العهد', value: stats?.total || 0, color: '#1976d2', icon: '📦' },
    {
      label: 'مسلّمة',
      value: stats?.byStatus?.find(s => s._id === 'مسلّمة')?.count || 0,
      color: '#4caf50',
      icon: '✅',
    },
    {
      label: 'مرتجعة',
      value: stats?.byStatus?.find(s => s._id === 'مرتجعة')?.count || 0,
      color: '#ff9800',
      icon: '🔄',
    },
    {
      label: 'إجمالي القيمة',
      value: fmtCurrency(stats?.byCategory?.reduce((a, c) => a + (c.totalValue || 0), 0)),
      color: '#9c27b0',
      icon: '💰',
    },
  ];

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
        📦 إدارة العهد والممتلكات
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
              label="الفئة"
              value={filters.assetCategory}
              onChange={e => setFilters(p => ({ ...p, assetCategory: e.target.value }))}
            >
              <MenuItem value="">الكل</MenuItem>
              {CATEGORIES.map(c => (
                <MenuItem key={c} value={c}>
                  {categoryIcon[c] || '📦'} {c}
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
              تسجيل عهدة جديدة
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
                <TableRow sx={{ bgcolor: '#fff3e0' }}>
                  <TableCell>الرقم</TableCell>
                  <TableCell>الأصل</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>الرقم التسلسلي</TableCell>
                  <TableCell>الموظف</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>القيمة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {custodies.map(c => (
                  <TableRow key={c._id} hover>
                    <TableCell>
                      <strong>{c.custodyNumber}</strong>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {categoryIcon[c.assetCategory] || '📦'} {c.assetName}
                      </Typography>
                    </TableCell>
                    <TableCell>{c.assetCategory}</TableCell>
                    <TableCell>{c.serialNumber || '-'}</TableCell>
                    <TableCell>
                      {c.employeeId?.firstName} {c.employeeId?.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={c.status}
                        color={statusColor[c.status] || 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{fmtCurrency(c.currentValue)}</TableCell>
                    <TableCell>
                      <Tooltip title="عرض">
                        <IconButton size="small" onClick={() => handleView(c._id)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      {c.status === 'مسلّمة' && (
                        <Tooltip title="استلام">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleReturn(c._id)}
                          >
                            <ReturnIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {custodies.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      لا توجد عهد
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
        <DialogTitle>تسجيل عهدة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم الأصل"
                required
                value={form.assetName}
                onChange={e => setForm(p => ({ ...p, assetName: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="الفئة"
                required
                value={form.assetCategory}
                onChange={e => setForm(p => ({ ...p, assetCategory: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الرقم التسلسلي"
                value={form.serialNumber}
                onChange={e => setForm(p => ({ ...p, serialNumber: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={form.condition}
                onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
              >
                {CONDITIONS.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="القيمة (ر.س)"
                value={form.purchaseValue}
                onChange={e => setForm(p => ({ ...p, purchaseValue: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="الوصف"
                value={form.description}
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
            disabled={!form.assetName || !form.assetCategory}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onClose={() => setViewDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          {viewDialog?.assetName} — {viewDialog?.custodyNumber}
        </DialogTitle>
        <DialogContent>
          {viewDialog && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Typography>
                  <strong>الفئة:</strong> {viewDialog.assetCategory}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>الرقم التسلسلي:</strong> {viewDialog.serialNumber || '-'}
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
                  <strong>تاريخ التسليم:</strong>{' '}
                  {viewDialog.assignedDate &&
                    new Date(viewDialog.assignedDate).toLocaleDateString('ar-SA')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography>
                  <strong>القيمة:</strong> {fmtCurrency(viewDialog.currentValue)}
                </Typography>
              </Grid>
              {viewDialog.history?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    سجل العمليات:
                  </Typography>
                  {viewDialog.history.map((h, i) => (
                    <Paper key={i} sx={{ p: 1, mb: 1, bgcolor: '#f5f5f5' }}>
                      <Typography variant="body2">
                        <strong>{h.action}</strong> — {h.condition && `الحالة: ${h.condition}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(h.date).toLocaleString('ar-SA')} — {h.notes}
                      </Typography>
                    </Paper>
                  ))}
                </Grid>
              )}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {viewDialog.status === 'مسلّمة' && (
                    <>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<ReturnIcon />}
                        onClick={() => handleReturn(viewDialog._id)}
                      >
                        استلام العهدة
                      </Button>
                      <Button
                        variant="contained"
                        color="warning"
                        startIcon={<IssueIcon />}
                        onClick={() => handleIssue(viewDialog._id, 'صيانة')}
                      >
                        صيانة
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleIssue(viewDialog._id, 'فقدان')}
                      >
                        فقدان
                      </Button>
                    </>
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
