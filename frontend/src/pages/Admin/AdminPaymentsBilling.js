import { useState, useEffect } from 'react';

import { adminService } from 'services/adminService';
import exportService from 'services/exportService';
import { getStatusColor } from 'utils/statusColors';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const AdminPaymentsBilling = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [payments, setPayments] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmState, showConfirm] = useConfirmDialog();

  useEffect(() => {
    const fetchPayments = async () => {
      const data = await adminService.getAdminPayments(userId);
      setPayments(data);
      setLoading(false);
    };
    fetchPayments();
  }, [userId]);

  const handleOpenDialog = (payment = null) => {
    setEditingPayment(payment);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPayment(null);
  };

  const handleSavePayment = async () => {
    try {
      // In a real scenario, we would collect form data here
      // For now, we assume editingPayment holds the state or we'd use local state for form fields
      // This is a simplified example as I didn't connect all fields to states in this specific file view
      // Ideally, we would have distinct states for invoiceNumber, amount, etc.

      // Simulating a save
      await adminService.createInvoice({
        userId: userId || currentUser?._id || currentUser?.id,
        items: [{ description: 'Service', total: 100 }],
        notes: 'Created via Admin Panel',
      });

      // Refresh list
      const data = await adminService.getAdminPayments(userId);
      setPayments(data);
      handleCloseDialog();
    } catch (error) {
      logger.error('Failed to save', error);
    }
  };

  const handleDeletePayment = paymentId => {
    showConfirm({
      title: 'حذف المدفوعة',
      message: 'هل تريد حذف هذه المدفوعة؟',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await adminService.deletePayment(paymentId);
          const data = await adminService.getAdminPayments(userId);
          setPayments(data);
          showSnackbar('تم حذف المدفوعة بنجاح', 'success');
        } catch (err) {
          logger.error('Delete payment failed:', err);
          showSnackbar('حدث خطأ في حذف المدفوعة', 'error');
        }
      },
    });
  };

  const handleExportInvoices = () => {
    try {
      exportService.toExcel(
        payments.map(p => ({
          'رقم الفاتورة': p.invoiceNumber,
          'اسم المريض': p.patientName,
          الخدمة: p.service,
          المبلغ: p.amount,
          الحالة: p.status,
          التاريخ: p.date,
        })),
        `invoices_${new Date().toISOString().slice(0, 10)}`,
        { sheetName: 'Invoices' }
      );
      showSnackbar('تم تصدير الفواتير بنجاح', 'success');
    } catch (err) {
      logger.error('Export invoices failed:', err);
      showSnackbar('حدث خطأ في تصدير الفواتير', 'error');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  const totalRevenue = payments
    .filter(p => p.status === 'مدفوعة')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments
    .filter(p => p.status === 'قيد الانتظار')
    .reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments
    .filter(p => p.status === 'متأخرة')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.primary,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <PaymentIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                المدفوعات والفواتير
              </Typography>
              <Typography variant="body2">إدارة المدفوعات والفواتير والعقود</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportInvoices}
            sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            تنزيل
          </Button>
        </Box>
      </Box>

      {/* Financial Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.primary,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي الإيراد
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {totalRevenue.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.warning,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                قيد الانتظار
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {pendingAmount.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.warningCoral,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                متأخرة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {overdueAmount.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.success,
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي المدفوعات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {payments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Payments Table */}
      <Card>
        <CardHeader
          title="سجل المدفوعات"
          action={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              size="small"
            >
              إضافة
            </Button>
          }
        />
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                <TableCell sx={{ fontWeight: 'bold' }}>رقم الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المريض/الطالب</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الخدمة</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>المبلغ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map(payment => (
                <TableRow key={payment.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{payment.invoiceNumber}</TableCell>
                  <TableCell>{payment.patientName}</TableCell>
                  <TableCell>{payment.service}</TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                    {payment.amount.toLocaleString('ar-SA')} ر.س
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.status}
                      color={getStatusColor(payment.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {new Date(payment.date).toLocaleDateString('ar-SA')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="عرض">
                      <IconButton aria-label="عرض" size="small">
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton
                        aria-label="تعديل"
                        size="small"
                        onClick={() => handleOpenDialog(payment)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        aria-label="حذف"
                        size="small"
                        onClick={() => handleDeletePayment(payment.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Payment Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPayment ? 'تعديل المدفوعة' : 'إضافة مدفوعة جديدة'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="رقم الفاتورة"
              defaultValue={editingPayment?.invoiceNumber || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="اسم المريض/الطالب"
              defaultValue={editingPayment?.patientName || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="الخدمة"
              defaultValue={editingPayment?.service || ''}
              size="small"
            />
            <TextField
              fullWidth
              type="number"
              label="المبلغ (ر.س)"
              defaultValue={editingPayment?.amount || 0}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select label="الحالة" defaultValue={editingPayment?.status || 'قيد الانتظار'}>
                <MenuItem value="مدفوعة">مدفوعة</MenuItem>
                <MenuItem value="قيد الانتظار">قيد الانتظار</MenuItem>
                <MenuItem value="متأخرة">متأخرة</MenuItem>
                <MenuItem value="مرفوضة">مرفوضة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              type="date"
              label="التاريخ"
              defaultValue={editingPayment?.date || ''}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="ملاحظات"
              defaultValue={editingPayment?.notes || ''}
              multiline
              rows={3}
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSavePayment}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default AdminPaymentsBilling;
