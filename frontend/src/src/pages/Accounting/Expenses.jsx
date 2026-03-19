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
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Search as SearchIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expense categories
  const categories = [
    { value: 'salaries', label: 'الرواتب والأجور' },
    { value: 'rent', label: 'الإيجار' },
    { value: 'utilities', label: 'المرافق (كهرباء، ماء، إنترنت)' },
    { value: 'supplies', label: 'المستلزمات المكتبية' },
    { value: 'marketing', label: 'التسويق والإعلان' },
    { value: 'transportation', label: 'المواصلات' },
    { value: 'maintenance', label: 'الصيانة' },
    { value: 'insurance', label: 'التأمينات' },
    { value: 'professional', label: 'الخدمات المهنية' },
    { value: 'training', label: 'التدريب والتطوير' },
    { value: 'travel', label: 'السفر والتنقل' },
    { value: 'meals', label: 'وجبات العمل' },
    { value: 'depreciation', label: 'الاستهلاك' },
    { value: 'other', label: 'أخرى' },
  ];

  // Statistics
  const [stats, setStats] = useState({
    totalExpenses: 0,
    totalAmount: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0,
    thisMonthAmount: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    description: '',
    amount: 0,
    paymentMethod: 'cash', // cash, bank, credit, cheque
    reference: '',
    vendor: '',
    status: 'pending', // pending, approved, rejected
    approvedBy: '',
    approvalDate: '',
    notes: '',
    receiptUrl: '',
  });

  useEffect(() => {
    fetchExpenses();
    fetchStatistics();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3001/api/accounting/expenses');
      setExpenses(response.data.data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/accounting/expenses/stats');
      setStats(response.data.data || stats);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleOpenDialog = (expense = null) => {
    if (expense) {
      setSelectedExpense(expense);
      setFormData({
        ...expense,
        date: format(new Date(expense.date), 'yyyy-MM-dd'),
        approvalDate: expense.approvalDate
          ? format(new Date(expense.approvalDate), 'yyyy-MM-dd')
          : '',
      });
    } else {
      setSelectedExpense(null);
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedExpense(null);
    resetForm();
  };

  const handleViewExpense = (expense) => {
    setSelectedExpense(expense);
    setOpenViewDialog(true);
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category: '',
      description: '',
      amount: 0,
      paymentMethod: 'cash',
      reference: '',
      vendor: '',
      status: 'pending',
      approvedBy: '',
      approvalDate: '',
      notes: '',
      receiptUrl: '',
    });
  };

  const handleSubmit = async () => {
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (selectedExpense) {
        await axios.put(
          `http://localhost:3001/api/accounting/expenses/${selectedExpense._id}`,
          expenseData
        );
      } else {
        await axios.post('http://localhost:3001/api/accounting/expenses', expenseData);
      }

      fetchExpenses();
      fetchStatistics();
      handleCloseDialog();
      alert('تم حفظ المصروف بنجاح');
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('حدث خطأ أثناء حفظ المصروف');
    }
  };

  const handleApprove = async (expenseId) => {
    if (window.confirm('هل أنت متأكد من الموافقة على هذا المصروف؟')) {
      try {
        await axios.post(`http://localhost:3001/api/accounting/expenses/${expenseId}/approve`, {
          approvedBy: 'المدير المالي', // Should come from auth context
        });
        fetchExpenses();
        fetchStatistics();
        alert('تم الموافقة على المصروف');
      } catch (error) {
        console.error('Error approving expense:', error);
        alert('حدث خطأ أثناء الموافقة على المصروف');
      }
    }
  };

  const handleReject = async (expenseId) => {
    const reason = window.prompt('الرجاء إدخال سبب الرفض:');
    if (reason) {
      try {
        await axios.post(`http://localhost:3001/api/accounting/expenses/${expenseId}/reject`, {
          rejectedBy: 'المدير المالي', // Should come from auth context
          rejectionReason: reason,
        });
        fetchExpenses();
        fetchStatistics();
        alert('تم رفض المصروف');
      } catch (error) {
        console.error('Error rejecting expense:', error);
        alert('حدث خطأ أثناء رفض المصروف');
      }
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) {
      try {
        await axios.delete(`http://localhost:3001/api/accounting/expenses/${expenseId}`);
        fetchExpenses();
        fetchStatistics();
        alert('تم حذف المصروف بنجاح');
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('حدث خطأ أثناء حذف المصروف');
      }
    }
  };

  const getCategoryLabel = (category) => {
    const cat = categories.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'معلق',
      approved: 'موافق عليه',
      rejected: 'مرفوض',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      approved: 'success',
      rejected: 'error',
    };
    return colors[status] || 'default';
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: 'نقدي',
      bank: 'تحويل بنكي',
      credit: 'بطاقة ائتمان',
      cheque: 'شيك',
    };
    return labels[method] || method;
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.reference?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;

    let matchesDateRange = true;
    if (dateFrom) {
      matchesDateRange = matchesDateRange && new Date(expense.date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDateRange = matchesDateRange && new Date(expense.date) <= new Date(dateTo);
    }

    return matchesSearch && matchesCategory && matchesStatus && matchesDateRange;
  });

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المصروفات
              </Typography>
              <Typography variant="h4">{stats.totalExpenses}</Typography>
              <Typography variant="body2" color="error.main">
                {stats.totalAmount?.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                هذا الشهر
              </Typography>
              <Typography variant="h4" color="primary.main">
                {stats.thisMonth}
              </Typography>
              <Typography variant="body2">
                {stats.thisMonthAmount?.toLocaleString('ar-SA')} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                معلقة
              </Typography>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                تحتاج موافقة
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الموافق عليها
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.approved}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                معتمدة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث بالوصف أو المورد..."
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
                label="الفئة"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="all">الكل</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
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
                <MenuItem value="pending">معلق</MenuItem>
                <MenuItem value="approved">موافق عليه</MenuItem>
                <MenuItem value="rejected">مرفوض</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="من"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6} sm={3} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="إلى"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={2} sx={{ textAlign: 'left' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                fullWidth
              >
                مصروف جديد
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>التاريخ</TableCell>
                <TableCell>الفئة</TableCell>
                <TableCell>الوصف</TableCell>
                <TableCell>المورد</TableCell>
                <TableCell>المبلغ</TableCell>
                <TableCell>طريقة الدفع</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    لا توجد مصروفات
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((expense) => (
                    <TableRow key={expense._id} hover>
                      <TableCell>
                        {format(new Date(expense.date), 'dd/MM/yyyy', { locale: ar })}
                      </TableCell>
                      <TableCell>{getCategoryLabel(expense.category)}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.vendor || '-'}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="error.main">
                          {expense.amount?.toLocaleString('ar-SA')} ر.س
                        </Typography>
                      </TableCell>
                      <TableCell>{getPaymentMethodLabel(expense.paymentMethod)}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(expense.status)}
                          color={getStatusColor(expense.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="عرض">
                          <IconButton size="small" onClick={() => handleViewExpense(expense)}>
                            <ViewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {expense.status === 'pending' && (
                          <>
                            <Tooltip title="موافقة">
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleApprove(expense._id)}
                              >
                                <ApproveIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="رفض">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleReject(expense._id)}
                              >
                                <RejectIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تعديل">
                              <IconButton size="small" onClick={() => handleOpenDialog(expense)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {expense.status === 'pending' && (
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteExpense(expense._id)}
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
          count={filteredExpenses.length}
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

      {/* Create/Edit Expense Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedExpense ? 'تعديل مصروف' : 'مصروف جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* Expense Details */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                {categories.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
                multiline
                rows={2}
              />
            </Grid>

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
                <MenuItem value="cheque">شيك</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم المورد"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم المرجع"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رابط الإيصال/الفاتورة"
                value={formData.receiptUrl}
                onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                placeholder="https://example.com/receipt.pdf"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AttachIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

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
            {selectedExpense ? 'تحديث' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Expense Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تفاصيل المصروف</DialogTitle>
        <DialogContent>
          {selectedExpense && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity={selectedExpense.status === 'approved' ? 'success' : selectedExpense.status === 'rejected' ? 'error' : 'warning'}>
                    <Typography variant="subtitle2">
                      الحالة: {getStatusLabel(selectedExpense.status)}
                    </Typography>
                  </Alert>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    المبلغ:
                  </Typography>
                  <Typography variant="h5" color="error">
                    {selectedExpense.amount?.toLocaleString('ar-SA')} ر.س
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    التاريخ:
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(selectedExpense.date), 'dd/MM/yyyy', { locale: ar })}
                  </Typography>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    الفئة:
                  </Typography>
                  <Typography variant="body1">{getCategoryLabel(selectedExpense.category)}</Typography>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    الوصف:
                  </Typography>
                  <Typography variant="body1">{selectedExpense.description}</Typography>
                </Grid>

                {selectedExpense.vendor && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">
                      المورد:
                    </Typography>
                    <Typography variant="body1">{selectedExpense.vendor}</Typography>
                  </Grid>
                )}

                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="textSecondary">
                    طريقة الدفع:
                  </Typography>
                  <Typography variant="body1">
                    {getPaymentMethodLabel(selectedExpense.paymentMethod)}
                  </Typography>
                </Grid>

                {selectedExpense.reference && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      المرجع:
                    </Typography>
                    <Typography variant="body1">{selectedExpense.reference}</Typography>
                  </Grid>
                )}

                {selectedExpense.status === 'approved' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }}>بيانات الموافقة</Divider>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        تمت الموافقة بواسطة:
                      </Typography>
                      <Typography variant="body1">{selectedExpense.approvedBy || '-'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="textSecondary">
                        تاريخ الموافقة:
                      </Typography>
                      <Typography variant="body1">
                        {selectedExpense.approvalDate
                          ? format(new Date(selectedExpense.approvalDate), 'dd/MM/yyyy', { locale: ar })
                          : '-'}
                      </Typography>
                    </Grid>
                  </>
                )}

                {selectedExpense.status === 'rejected' && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }}>بيانات الرفض</Divider>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        سبب الرفض:
                      </Typography>
                      <Typography variant="body1" color="error">
                        {selectedExpense.rejectionReason || 'لم يتم تحديد السبب'}
                      </Typography>
                    </Grid>
                  </>
                )}

                {selectedExpense.receiptUrl && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        الإيصال:
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AttachIcon />}
                        href={selectedExpense.receiptUrl}
                        target="_blank"
                        sx={{ mt: 1 }}
                      >
                        عرض الإيصال
                      </Button>
                    </Grid>
                  </>
                )}

                {selectedExpense.notes && (
                  <>
                    <Grid item xs={12}>
                      <Divider sx={{ my: 1 }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">
                        ملاحظات:
                      </Typography>
                      <Typography variant="body2">{selectedExpense.notes}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>إغلاق</Button>
          {selectedExpense?.status === 'pending' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => {
                  setOpenViewDialog(false);
                  handleApprove(selectedExpense._id);
                }}
              >
                موافقة
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => {
                  setOpenViewDialog(false);
                  handleReject(selectedExpense._id);
                }}
              >
                رفض
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
