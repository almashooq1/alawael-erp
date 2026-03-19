import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Divider,
  Tooltip,
  TablePagination,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Statistics
  const [stats, setStats] = useState({
    totalPayments: 0,
    totalAmount: 0,
    cashPayments: 0,
    bankPayments: 0,
    creditPayments: 0,
    todayPayments: 0,
    todayAmount: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'cash', // cash, bank, credit, transfer, cheque
    reference: '',
    notes: '',
    status: 'completed', // completed, pending, failed, cancelled
    receivedBy: '',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    transactionId: '',
  });

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
    fetchStatistics();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/accounting/payments');
      setPayments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/accounting/invoices?status=sent,partial');
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/accounting/payments/stats');
      setStats(response.data.data || stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleOpenDialog = (payment = null) => {
    if (payment) {
      setSelectedPayment(payment);
      setFormData({
        ...payment,
        invoiceId: payment.invoice?._id || payment.invoiceId,
        paymentDate: format(new Date(payment.paymentDate), 'yyyy-MM-dd'),
        chequeDate: payment.chequeDate
          ? format(new Date(payment.chequeDate), 'yyyy-MM-dd')
          : '',
      });
    } else {
      setSelectedPayment(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPayment(null);
    resetForm();
  };

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);
    setOpenViewDialog(true);
  };

  const resetForm = () => {
    setFormData({
      invoiceId: '',
      amount: 0,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'cash',
      reference: '',
      notes: '',
      status: 'completed',
      receivedBy: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      transactionId: '',
    });
  };

  const handleInvoiceChange = (invoiceId) => {
    const invoice = invoices.find((inv) => inv._id === invoiceId);
    if (invoice) {
      setFormData({
        ...formData,
        invoiceId,
        amount: invoice.remainingAmount || invoice.totalAmount,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const paymentData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (selectedPayment) {
        await axios.put(
          `http://localhost:3001/api/accounting/payments/${selectedPayment._id}`,
          paymentData
        );
      } else {
        await axios.post('http://localhost:3001/api/accounting/payments', paymentData);
      }

      fetchPayments();
      fetchInvoices();
      fetchStatistics();
      handleCloseDialog();
      alert('تم حفظ الدفعة بنجاح');
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('حدث خطأ أثناء حفظ الدفعة');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
      try {
        await axios.delete(`http://localhost:3001/api/accounting/payments/${paymentId}`);
        fetchPayments();
        fetchInvoices();
        fetchStatistics();
        alert('تم حذف الدفعة بنجاح');
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('حدث خطأ أثناء حذف الدفعة');
      }
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/accounting/payments/${paymentId}/receipt`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('حدث خطأ أثناء طباعة الإيصال');
    }
  };

  const getMethodLabel = (method) => {
    const labels = {
      cash: 'نقدي',
      bank: 'تحويل بنكي',
      credit: 'بطاقة ائتمان',
      transfer: 'تحويل إلكتروني',
      cheque: 'شيك',
    };
    return labels[method] || method;
  };

  const getMethodColor = (method) => {
    const colors = {
      cash: 'success',
      bank: 'primary',
      credit: 'info',
      transfer: 'secondary',
      cheque: 'warning',
    };
    return colors[method] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      completed: 'مكتملة',
      pending: 'معلقة',
      failed: 'فشلت',
      cancelled: 'ملغاة',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      completed: 'success',
      pending: 'warning',
      failed: 'error',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice?.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = methodFilter === 'all' || payment.paymentMethod === methodFilter;
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المدفوعات
              </Typography>
              <Typography variant="h4">{stats.totalPayments}</Typography>
              <Typography variant="body2" color="success.main">
                {stats.totalAmount?.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                دفعات اليوم
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.todayPayments}
              </Typography>
              <Typography variant="body2">
                {stats.todayAmount?.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الدفعات النقدية
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.cashPayments}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                نقدي
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                التحويلات البنكية
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.bankPayments}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                تحويل بنكي
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث برقم المرجع أو الفاتورة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="طريقة الدفع"
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="cash">نقدي</MenuItem>
                <MenuItem value="bank">تحويل بنكي</MenuItem>
                <MenuItem value="credit">بطاقة ائتمان</MenuItem>
                <MenuItem value="transfer">تحويل إلكتروني</MenuItem>
                <MenuItem value="cheque">شيك</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="الحالة"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="completed">مكتملة</MenuItem>
                <MenuItem value="pending">معلقة</MenuItem>
                <MenuItem value="failed">فشلت</MenuItem>
                <MenuItem value="cancelled">ملغاة</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4} sx={{ textAlign: 'left' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                دفعة جديدة
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>رقم الفاتورة</TableCell>
                <TableCell>العميل</TableCell>
                <TableCell>المبلغ</TableCell>
                <TableCell>طريقة الدفع</TableCell>
                <TableCell>المرجع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>استلمها</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    لا توجد مدفوعات
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((payment) => (
                    <TableRow key={payment._id} hover>
                      <TableCell>
                        {format(new Date(payment.paymentDate), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{payment.invoice?.invoiceNumber || '-'}</TableCell>
                      <TableCell>{payment.invoice?.customerName || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {payment.amount?.toLocaleString('ar-SA')} ر.س
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getMethodLabel(payment.paymentMethod)}
                          color={getMethodColor(payment.paymentMethod)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{payment.reference || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(payment.status)}
                          color={getStatusColor(payment.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{payment.receivedBy || '-'}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => handleViewPayment(payment)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {payment.status === 'completed' && (
                          <Tooltip title="طباعة الإيصال">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handlePrintReceipt(payment._id)}
                            >
                              <ReceiptIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {payment.status === 'pending' && (
                          <Tooltip title="تعديل">
                            <IconButton size="small" onClick={() => handleOpenDialog(payment)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(payment.status === 'pending' || payment.status === 'failed') && (
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeletePayment(payment._id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filteredPayments.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </Card>

      {/* Create/Edit Payment Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedPayment ? 'تعديل دفعة' : 'دفعة جديدة'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Invoice Selection */}
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="الفاتورة"
                value={formData.invoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                required
                disabled={!!selectedPayment}
              >
                <MenuItem value="">-- اختر الفاتورة --</MenuItem>
                {invoices.map((invoice) => (
                  <MenuItem key={invoice._id} value={invoice._id}>
                    {invoice.invoiceNumber} - {invoice.customerName} ({invoice.remainingAmount?.toFixed(2)} ر.س)
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Payment Details */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الدفع"
                value={formData.paymentDate}
                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="طريقة الدفع"
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                required
              >
                <MenuItem value="cash">نقدي</MenuItem>
                <MenuItem value="bank">تحويل بنكي</MenuItem>
                <MenuItem value="credit">بطاقة ائتمان</MenuItem>
                <MenuItem value="transfer">تحويل إلكتروني</MenuItem>
                <MenuItem value="cheque">شيك</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="الحالة"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                required
              >
                <MenuItem value="completed">مكتملة</MenuItem>
                <MenuItem value="pending">معلقة</MenuItem>
                <MenuItem value="failed">فشلت</MenuItem>
                <MenuItem value="cancelled">ملغاة</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم المرجع"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="استلمها"
                value={formData.receivedBy}
                onChange={(e) => setFormData({ ...formData, receivedBy: e.target.value })}
              />
            </Grid>

            {/* Payment Method Specific Fields */}
            {formData.paymentMethod === 'cheque' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>بيانات الشيك</Divider>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="رقم الشيك"
                    value={formData.chequeNumber}
                    onChange={(e) => setFormData({ ...formData, chequeNumber: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="تاريخ الشيك"
                    value={formData.chequeDate}
                    onChange={(e) => setFormData({ ...formData, chequeDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="اسم البنك"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {(formData.paymentMethod === 'bank' || formData.paymentMethod === 'transfer') && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>بيانات التحويل</Divider>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="رقم المعاملة"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="اسم البنك"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {formData.paymentMethod === 'credit' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>بيانات البطاقة</Divider>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="رقم المعاملة"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  />
                </Grid>
              </>
            )}

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedPayment ? 'تحديث' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Payment Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تفاصيل الدفعة</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity={selectedPayment.status === 'completed' ? 'success' : 'info'}>
                    <Typography variant="subtitle2">
                      الحالة: {getStatusLabel(selectedPayment.status)}
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    المبلغ:
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {selectedPayment.amount?.toLocaleString('ar-SA')} ر.س
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    التاريخ:
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedPayment.paymentDate), 'dd/MM/yyyy', { locale: ar })}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    رقم الفاتورة:
                  </Typography>
                  <Typography variant="body1">
                    {selectedPayment.invoice?.invoiceNumber || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    العميل:
                  </Typography>
                  <Typography variant="body1">
                    {selectedPayment.invoice?.customerName || '-'}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    طريقة الدفع:
                  </Typography>
                  <Chip
                    label={getMethodLabel(selectedPayment.paymentMethod)}
                    color={getMethodColor(selectedPayment.paymentMethod)}
                    size="small"
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    المرجع:
                  </Typography>
                  <Typography variant="body1">{selectedPayment.reference || '-'}</Typography>
                </Grid>

                {selectedPayment.receivedBy && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      استلمها:
                    </Typography>
                    <Typography variant="body1">{selectedPayment.receivedBy}</Typography>
                  </Grid>
                )}

                {selectedPayment.paymentMethod === 'cheque' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }}>بيانات الشيك</Divider>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        رقم الشيك:
                      </Typography>
                      <Typography variant="body1">{selectedPayment.chequeNumber || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        تاريخ الشيك:
                      </Typography>
                      <Typography variant="body1">
                        {selectedPayment.chequeDate
                          ? format(new Date(selectedPayment.chequeDate), 'dd/MM/yyyy', { locale: ar })
                          : '-'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        البنك:
                      </Typography>
                      <Typography variant="body1">{selectedPayment.bankName || '-'}</Typography>
                    </Grid>
                  </>
                )}

                {(selectedPayment.paymentMethod === 'bank' ||
                  selectedPayment.paymentMethod === 'transfer' ||
                  selectedPayment.paymentMethod === 'credit') && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }}>بيانات المعاملة</Divider>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        رقم المعاملة:
                      </Typography>
                      <Typography variant="body1">{selectedPayment.transactionId || '-'}</Typography>
                    </Grid>
                    {selectedPayment.bankName && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="textSecondary">
                          البنك:
                        </Typography>
                        <Typography variant="body1">{selectedPayment.bankName}</Typography>
                      </Grid>
                    )}
                  </>
                )}

                {selectedPayment.notes && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        ملاحظات:
                      </Typography>
                      <Typography variant="body2">{selectedPayment.notes}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>إغلاق</Button>
          {selectedPayment?.status === 'completed' && (
            <Button
              variant="contained"
              startIcon={<ReceiptIcon />}
              onClick={() => handlePrintReceipt(selectedPayment._id)}
            >
              طباعة الإيصال
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Payments;
