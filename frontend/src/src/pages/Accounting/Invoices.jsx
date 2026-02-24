import React, { useState, useEffect } from 'react';
import exportService, { setBrandingForExport } from '../../utils/exportService';
import { useOrgBranding } from '../../components/OrgBrandingContext';
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
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const Invoices = () => {
  const { branding } = useOrgBranding();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  // Form state for new/edit invoice
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    type: 'sales', // sales, service
    status: 'draft', // draft, sent, paid, partial, overdue, cancelled
    items: [
      {
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: 15,
        amount: 0,
      },
    ],
    notes: '',
    terms: 'الدفع خلال 30 يوم من تاريخ الفاتورة',
  });

  // Payment form state
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentMethod: 'cash', // cash, bank, credit, transfer
    reference: '',
    notes: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchStatistics();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/accounting/invoices');
      setInvoices(response.data.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/accounting/invoices/stats');
      setStats(response.data.data || stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleOpenDialog = (invoice = null) => {
    if (invoice) {
      setSelectedInvoice(invoice);
      setFormData({
        ...invoice,
        invoiceDate: format(new Date(invoice.invoiceDate), 'yyyy-MM-dd'),
        dueDate: format(new Date(invoice.dueDate), 'yyyy-MM-dd'),
      });
    } else {
      setSelectedInvoice(null);
      generateInvoiceNumber();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInvoice(null);
    resetForm();
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setOpenViewDialog(true);
  };

  const handleOpenPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.remainingAmount || invoice.totalAmount,
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentMethod: 'cash',
      reference: '',
      notes: '',
    });
    setOpenPaymentDialog(true);
  };

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setFormData((prev) => ({
      ...prev,
      invoiceNumber: `INV-${year}-${random}`,
    }));
  };

  const resetForm = () => {
    setFormData({
      invoiceNumber: '',
      invoiceDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      customerAddress: '',
      type: 'sales',
      status: 'draft',
      items: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          vatRate: 15,
          amount: 0,
        },
      ],
      notes: '',
      terms: 'الدفع خلال 30 يوم من تاريخ الفاتورة',
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          vatRate: 15,
          amount: 0,
        },
      ],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    // Calculate amount
    if (field === 'quantity' || field === 'unitPrice' || field === 'vatRate') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const unitPrice = parseFloat(newItems[index].unitPrice) || 0;
      const vatRate = parseFloat(newItems[index].vatRate) || 0;
      const subtotal = quantity * unitPrice;
      const vat = subtotal * (vatRate / 100);
      newItems[index].amount = subtotal + vat;
    }

    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalVat = 0;

    formData.items.forEach((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const vatRate = parseFloat(item.vatRate) || 0;
      const itemSubtotal = quantity * unitPrice;
      const itemVat = itemSubtotal * (vatRate / 100);

      subtotal += itemSubtotal;
      totalVat += itemVat;
    });

    const total = subtotal + totalVat;

    return { subtotal, totalVat, total };
  };

  const handleSubmit = async () => {
    try {
      const totals = calculateTotals();
      const invoiceData = {
        ...formData,
        subtotal: totals.subtotal,
        vatAmount: totals.totalVat,
        totalAmount: totals.total,
        remainingAmount: totals.total,
      };

      if (selectedInvoice) {
        await axios.put(
          `http://localhost:3001/api/accounting/invoices/${selectedInvoice._id}`,
          invoiceData
        );
      } else {
        await axios.post('http://localhost:3001/api/accounting/invoices', invoiceData);
      }

      fetchInvoices();
      fetchStatistics();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('حدث خطأ أثناء حفظ الفاتورة');
    }
  };

  const handleRecordPayment = async () => {
    try {
      await axios.post(
        `http://localhost:3001/api/accounting/invoices/${selectedInvoice._id}/payment`,
        paymentData
      );

      fetchInvoices();
      fetchStatistics();
      setOpenPaymentDialog(false);
      alert('تم تسجيل الدفعة بنجاح');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('حدث خطأ أثناء تسجيل الدفعة');
    }
  };

  const handleSendInvoice = async (invoiceId) => {
    try {
      await axios.post(`http://localhost:3001/api/accounting/invoices/${invoiceId}/send`);
      fetchInvoices();
      alert('تم إرسال الفاتورة بنجاح');
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('حدث خطأ أثناء إرسال الفاتورة');
    }
  };

  // تصدير الفاتورة PDF مع الهوية المؤسسية
  const handleDownloadPDF = (invoiceId) => {
    const invoice = invoices.find(inv => inv._id === invoiceId);
    if (!invoice) return;
    setBrandingForExport(branding);
    // بناء بيانات الفاتورة بشكل مبسط (يمكنك تخصيص الأعمدة)
    const data = [
      { 'رقم الفاتورة': invoice.invoiceNumber, 'التاريخ': invoice.invoiceDate, 'العميل': invoice.customerName, 'الإجمالي': invoice.totalAmount }
    ];
    exportService.exportToPDF(data, `فاتورة_${invoice.invoiceNumber}`, { branding, title: `فاتورة رقم ${invoice.invoiceNumber}` });
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة؟')) {
      try {
        await axios.delete(`http://localhost:3001/api/accounting/invoices/${invoiceId}`);
        fetchInvoices();
        fetchStatistics();
      } catch (error) {
        console.error('Error deleting invoice:', error);
        alert('حدث خطأ أثناء حذف الفاتورة');
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      sent: 'info',
      paid: 'success',
      partial: 'warning',
      overdue: 'error',
      cancelled: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'مسودة',
      sent: 'مرسلة',
      paid: 'مدفوعة',
      partial: 'دفع جزئي',
      overdue: 'متأخرة',
      cancelled: 'ملغاة',
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type) => {
    return type === 'sales' ? 'مبيعات' : 'خدمات';
  };

  // Filter invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesType = typeFilter === 'all' || invoice.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totals = calculateTotals();

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي الفواتير
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
              <Typography variant="body2" color="success.main">
                {stats.totalAmount.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                المدفوعة
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.paid}
              </Typography>
              <Typography variant="body2">
                {stats.paidAmount.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                المعلقة
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.sent}
              </Typography>
              <Typography variant="body2">
                {stats.pendingAmount.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                المتأخرة
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.overdue}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                تحتاج متابعة
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
                placeholder="بحث برقم الفاتورة أو اسم العميل..."
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
                label="الحالة"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="draft">مسودة</MenuItem>
                <MenuItem value="sent">مرسلة</MenuItem>
                <MenuItem value="paid">مدفوعة</MenuItem>
                <MenuItem value="partial">دفع جزئي</MenuItem>
                <MenuItem value="overdue">متأخرة</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="النوع"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="sales">مبيعات</MenuItem>
                <MenuItem value="service">خدمات</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={4} sx={{ textAlign: 'left' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
              >
                فاتورة جديدة
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>رقم الفاتورة</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>العميل</TableCell>
                <TableCell>النوع</TableCell>
                <TableCell>المبلغ الإجمالي</TableCell>
                <TableCell>المدفوع</TableCell>
                <TableCell>المتبقي</TableCell>
                <TableCell>الحالة</TableCell>
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
              ) : filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    لا توجد فواتير
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((invoice) => (
                    <TableRow key={invoice._id} hover>
                      <TableCell>{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoiceDate), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{getTypeLabel(invoice.type)}</TableCell>
                      <TableCell>
                        {invoice.totalAmount?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>
                        {invoice.paidAmount?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>
                        {invoice.remainingAmount?.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(invoice.status)}
                          color={getStatusColor(invoice.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => handleViewInvoice(invoice)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {invoice.status === 'draft' && (
                          <>
                            <Tooltip title="تعديل">
                              <IconButton size="small" onClick={() => handleOpenDialog(invoice)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="إرسال">
                              <IconButton
                                size="small"
                                onClick={() => handleSendInvoice(invoice._id)}
                              >
                                <SendIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {(invoice.status === 'sent' || invoice.status === 'partial') && (
                          <Tooltip title="تسجيل دفعة">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenPaymentDialog(invoice)}
                            >
                              <PaymentIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="تحميل PDF">
                          <IconButton size="small" onClick={() => handleDownloadPDF(invoice._id)}>
                            <PdfIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {invoice.status === 'draft' && (
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteInvoice(invoice._id)}
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
          count={filteredInvoices.length}
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

      {/* Create/Edit Invoice Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedInvoice ? 'تعديل فاتورة' : 'فاتورة جديدة'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Invoice Details */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="رقم الفاتورة"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                disabled={!!selectedInvoice}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الفاتورة"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الاستحقاق"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Customer Details */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>بيانات العميل</Divider>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم العميل"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم الهاتف"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="نوع الفاتورة"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="sales">مبيعات</MenuItem>
                <MenuItem value="service">خدمات</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="العنوان"
                multiline
                rows={2}
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
              />
            </Grid>

            {/* Invoice Items */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }}>بنود الفاتورة</Divider>
            </Grid>
            {formData.items.map((item, index) => (
              <React.Fragment key={index}>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="الوصف"
                    value={item.description}
                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    required
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="الكمية"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="السعر"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={6} md={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="الضريبة %"
                    value={item.vatRate}
                    onChange={(e) => handleItemChange(index, 'vatRate', e.target.value)}
                    inputProps={{ min: 0, max: 100 }}
                  />
                </Grid>
                <Grid item xs={4} md={1.5}>
                  <TextField
                    fullWidth
                    label="المجموع"
                    value={item.amount.toFixed(2)}
                    disabled
                  />
                </Grid>
                <Grid item xs={2} md={0.5}>
                  {formData.items.length > 1 && (
                    <IconButton color="error" onClick={() => handleRemoveItem(index)}>
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Grid>
              </React.Fragment>
            ))}
            <Grid item xs={12}>
              <Button startIcon={<AddIcon />} onClick={handleAddItem}>
                إضافة بند
              </Button>
            </Grid>

            {/* Totals */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1">
                  المجموع الفرعي: {totals.subtotal.toFixed(2)} ر.س
                </Typography>
                <Typography variant="body1">
                  الضريبة: {totals.totalVat.toFixed(2)} ر.س
                </Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>
                  الإجمالي: {totals.total.toFixed(2)} ر.س
                </Typography>
              </Box>
            </Grid>

            {/* Notes and Terms */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                multiline
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="شروط الدفع"
                multiline
                rows={2}
                value={formData.terms}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {selectedInvoice ? 'تحديث' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل الفاتورة</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">رقم الفاتورة:</Typography>
                  <Typography variant="body1">{selectedInvoice.invoiceNumber}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2">التاريخ:</Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedInvoice.invoiceDate), 'dd/MM/yyyy', { locale: ar })}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2">العميل:</Typography>
                  <Typography variant="body1">{selectedInvoice.customerName}</Typography>
                  <Typography variant="body2">{selectedInvoice.customerEmail}</Typography>
                  <Typography variant="body2">{selectedInvoice.customerPhone}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>الوصف</TableCell>
                          <TableCell align="center">الكمية</TableCell>
                          <TableCell align="right">السعر</TableCell>
                          <TableCell align="right">المجموع</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedInvoice.items?.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.description}</TableCell>
                            <TableCell align="center">{item.quantity}</TableCell>
                            <TableCell align="right">{item.unitPrice.toFixed(2)} ر.س</TableCell>
                            <TableCell align="right">{item.amount.toFixed(2)} ر.س</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ textAlign: 'right', mt: 2 }}>
                    <Typography variant="body1">
                      المجموع الفرعي: {selectedInvoice.subtotal?.toFixed(2)} ر.س
                    </Typography>
                    <Typography variant="body1">
                      الضريبة: {selectedInvoice.vatAmount?.toFixed(2)} ر.س
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 1 }}>
                      الإجمالي: {selectedInvoice.totalAmount?.toFixed(2)} ر.س
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>إغلاق</Button>
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={() => handleDownloadPDF(selectedInvoice._id)}
          >
            تحميل PDF
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تسجيل دفعة</DialogTitle>
        <DialogContent>
          {selectedInvoice && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  رقم الفاتورة: {selectedInvoice.invoiceNumber}
                </Typography>
                <Typography variant="body2">
                  المبلغ المتبقي: {selectedInvoice.remainingAmount?.toFixed(2)} ر.س
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="المبلغ المدفوع"
                    value={paymentData.amount}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })
                    }
                    inputProps={{ min: 0, max: selectedInvoice.remainingAmount, step: 0.01 }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="date"
                    label="تاريخ الدفع"
                    value={paymentData.paymentDate}
                    onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="طريقة الدفع"
                    value={paymentData.paymentMethod}
                    onChange={(e) =>
                      setPaymentData({ ...paymentData, paymentMethod: e.target.value })
                    }
                    required
                  >
                    <MenuItem value="cash">نقدي</MenuItem>
                    <MenuItem value="bank">تحويل بنكي</MenuItem>
                    <MenuItem value="credit">بطاقة ائتمان</MenuItem>
                    <MenuItem value="transfer">تحويل إلكتروني</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="رقم المرجع"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({ ...paymentData, reference: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="ملاحظات"
                    multiline
                    rows={2}
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleRecordPayment}>
            تسجيل الدفعة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Invoices;
