import { useState, useEffect, useCallback } from 'react';




import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const ExpenseManagement = () => {
  const showSnackbar = useSnackbar();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: '',
    vendor: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  const loadExpenses = useCallback(async () => {
    try {
      const data = await accountingService.getExpenses();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Expenses error:', err);
      showSnackbar('حدث خطأ في تحميل المصروفات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const categories = [...new Set(expenses.map(e => e.category).filter(Boolean))];

  const statusConfig = {
    approved: { label: 'معتمد', color: 'success' },
    pending: { label: 'قيد المراجعة', color: 'warning' },
    rejected: { label: 'مرفوض', color: 'error' },
  };

  const categoryColors = {
    رواتب: '#1976d2',
    إيجار: '#9c27b0',
    مرافق: '#ff9800',
    'لوازم مكتبية': '#4caf50',
    صيانة: '#f44336',
    تدريب: '#00bcd4',
  };

  const filtered = expenses.filter(e => {
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    const matchStatus = filterStatus === 'all' || e.status === filterStatus;
    const matchSearch =
      !searchText ||
      e.description?.includes(searchText) ||
      e.vendor?.includes(searchText) ||
      e.category?.includes(searchText);
    return matchCat && matchStatus && matchSearch;
  });

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const approvedTotal = expenses
    .filter(e => e.status === 'approved')
    .reduce((s, e) => s + (e.amount || 0), 0);
  const pendingTotal = expenses
    .filter(e => e.status === 'pending')
    .reduce((s, e) => s + (e.amount || 0), 0);

  const expenseByCategory = categories.map(cat => ({
    category: cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0),
    count: expenses.filter(e => e.category === cat).length,
    color: categoryColors[cat] || brandColors.primary,
  }));

  const handleCreate = async () => {
    if (!newExpense.description || !newExpense.amount) {
      showSnackbar('يرجى ملء جميع الحقول المطلوبة', 'error');
      return;
    }
    try {
      await accountingService.createExpense(newExpense);
      showSnackbar('تم إنشاء المصروف بنجاح', 'success');
      setCreateDialog(false);
      setNewExpense({
        description: '',
        amount: '',
        category: '',
        vendor: '',
        date: new Date().toISOString().slice(0, 10),
        paymentMethod: 'bank_transfer',
        notes: '',
      });
      loadExpenses();
    } catch {
      showSnackbar('فشل إنشاء المصروف', 'error');
    }
  };

  const handleApprove = async id => {
    try {
      await accountingService.approveExpense(id);
      showSnackbar('تم اعتماد المصروف', 'success');
      setExpenses(prev => prev.map(e => (e._id === id ? { ...e, status: 'approved' } : e)));
    } catch {
      showSnackbar('فشل اعتماد المصروف', 'error');
    }
  };

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل المصروفات...
        </Typography>
      </Container>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <ExpenseIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة المصروفات
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  تتبع واعتماد المصروفات التشغيلية
                </Typography>
              </Box>
            </Box>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => setCreateDialog(true)}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                borderRadius: 2,
              }}
            >
              مصروف جديد
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي المصروفات',
            value: `${totalExpenses.toLocaleString()} ر.س`,
            sub: `${expenses.length} مصروف`,
            color: brandColors.primary,
          },
          {
            label: 'المعتمدة',
            value: `${approvedTotal.toLocaleString()} ر.س`,
            sub: `${expenses.filter(e => e.status === 'approved').length} مصروف`,
            color: statusColors.success,
          },
          {
            label: 'قيد المراجعة',
            value: `${pendingTotal.toLocaleString()} ر.س`,
            sub: `${expenses.filter(e => e.status === 'pending').length} مصروف`,
            color: statusColors.warning,
          },
        ].map((s, i) => (
          <Grid item xs={4} key={i}>
            <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
              <CardContent sx={{ py: 2 }}>
                <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>
                  {s.value}
                </Typography>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {s.label}
                </Typography>
                <Typography variant="caption" sx={{ color: neutralColors.textDisabled }}>
                  {s.sub}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Category Breakdown */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CategoryIcon sx={{ color: brandColors.primary }} /> توزيع المصروفات حسب الفئة
          </Typography>
          <Grid container spacing={2}>
            {expenseByCategory.map((cat, i) => (
              <Grid item xs={6} md={4} key={i}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: surfaceColors.background }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {cat.category}
                    </Typography>
                    <Typography variant="body2" fontWeight={700}>
                      {cat.total.toLocaleString()} ر.س
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min((cat.total / totalExpenses) * 100, 100)}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: neutralColors.divider,
                      '& .MuiLinearProgress-bar': { bgcolor: cat.color, borderRadius: 3 },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: neutralColors.textDisabled }}>
                    {cat.count} معاملة — {((cat.total / totalExpenses) * 100).toFixed(1)}%
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالوصف أو المورد..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الفئة</InputLabel>
            <Select
              value={filterCategory}
              label="الفئة"
              onChange={e => setFilterCategory(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              {categories.map(cat => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={filterStatus}
              label="الحالة"
              onChange={e => setFilterStatus(e.target.value)}
            >
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="approved">معتمد</MenuItem>
              <MenuItem value="pending">قيد المراجعة</MenuItem>
              <MenuItem value="rejected">مرفوض</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المورد</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  المبلغ
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(exp => (
                <TableRow key={exp._id} hover>
                  <TableCell>
                    <Typography variant="body2">{exp.date}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {exp.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={exp.category}
                      size="small"
                      sx={{
                        bgcolor: categoryColors[exp.category] || brandColors.primary,
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{exp.vendor}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={700}>
                      {(exp.amount || 0).toLocaleString()} ر.س
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig[exp.status]?.label || exp.status}
                      color={statusConfig[exp.status]?.color || 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="عرض">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedExpense(exp);
                            setViewDialog(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {exp.status === 'pending' && (
                        <Tooltip title="اعتماد">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleApprove(exp._id)}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد مصروفات مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          تفاصيل المصروف
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedExpense && (
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الوصف
                </Typography>
                <Typography fontWeight={700}>{selectedExpense.description}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المبلغ
                </Typography>
                <Typography fontWeight={800} variant="h6" sx={{ color: brandColors.primary }}>
                  {selectedExpense.amount?.toLocaleString()} ر.س
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الفئة
                </Typography>
                <Chip
                  label={selectedExpense.category}
                  size="small"
                  sx={{
                    bgcolor: categoryColors[selectedExpense.category],
                    color: '#fff',
                    fontWeight: 600,
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  الحالة
                </Typography>
                <Chip
                  label={statusConfig[selectedExpense.status]?.label}
                  color={statusConfig[selectedExpense.status]?.color}
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  المورد
                </Typography>
                <Typography fontWeight={600}>{selectedExpense.vendor}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  التاريخ
                </Typography>
                <Typography fontWeight={600}>{selectedExpense.date}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  طريقة الدفع
                </Typography>
                <Typography fontWeight={600}>
                  {selectedExpense.paymentMethod === 'bank_transfer'
                    ? 'تحويل بنكي'
                    : selectedExpense.paymentMethod === 'cash'
                      ? 'نقدي'
                      : selectedExpense.paymentMethod}
                </Typography>
              </Grid>
              {selectedExpense.approvedBy && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    المعتمد
                  </Typography>
                  <Typography fontWeight={600}>{selectedExpense.approvedBy}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          إضافة مصروف جديد
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف *"
                value={newExpense.description}
                onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المبلغ *"
                type="number"
                value={newExpense.amount}
                onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                InputProps={{ endAdornment: <InputAdornment position="end">ر.س</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={newExpense.category}
                  label="الفئة"
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                >
                  {['رواتب', 'إيجار', 'مرافق', 'لوازم مكتبية', 'صيانة', 'تدريب', 'أخرى'].map(
                    cat => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    )
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المورد"
                value={newExpense.vendor}
                onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="التاريخ"
                type="date"
                value={newExpense.date}
                onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>طريقة الدفع</InputLabel>
                <Select
                  value={newExpense.paymentMethod}
                  label="طريقة الدفع"
                  onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                >
                  <MenuItem value="bank_transfer">تحويل بنكي</MenuItem>
                  <MenuItem value="cash">نقدي</MenuItem>
                  <MenuItem value="check">شيك</MenuItem>
                  <MenuItem value="credit_card">بطاقة ائتمان</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={newExpense.notes}
                onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newExpense.description || !newExpense.amount}
            sx={{ borderRadius: 2 }}
          >
            إنشاء المصروف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ExpenseManagement;
