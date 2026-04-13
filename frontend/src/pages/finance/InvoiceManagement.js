import { useState, useEffect, useCallback } from 'react';




import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const InvoiceManagement = () => {
  const showSnackbar = useSnackbar();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filterStatus] = useState('all');
  const [tabValue, setTabValue] = useState(0);
  const [viewDialog, setViewDialog] = useState(false);
  const [createDialog, setCreateDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    customerEmail: '',
    dueDate: '',
    notes: '',
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
  });

  const loadInvoices = useCallback(async () => {
    try {
      const data = await accountingService.getInvoices();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      logger.error('Invoices error:', err);
      showSnackbar('حدث خطأ في تحميل الفواتير', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const statusConfig = {
    paid: { label: 'مدفوعة', color: 'success', icon: '✓' },
    sent: { label: 'مرسلة', color: 'info', icon: '→' },
    overdue: { label: 'متأخرة', color: 'error', icon: '!' },
    draft: { label: 'مسودة', color: 'warning', icon: '○' },
    cancelled: { label: 'ملغاة', color: 'default', icon: '✗' },
  };

  const tabFilters = ['all', 'draft', 'sent', 'overdue', 'paid'];
  const filtered = invoices.filter(inv => {
    const tabStatus = tabFilters[tabValue];
    const matchTab = tabStatus === 'all' || inv.status === tabStatus;
    const matchFilter = filterStatus === 'all' || inv.status === filterStatus;
    const matchSearch =
      !searchText ||
      inv.invoiceNumber?.includes(searchText) ||
      inv.customerName?.includes(searchText);
    return matchTab && matchFilter && matchSearch;
  });

  const summaryData = {
    total: invoices.length,
    totalAmount: invoices.reduce((s, i) => s + (i.total || 0), 0),
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || 0), 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total || 0), 0),
  };

  const addItem = () =>
    setNewInvoice(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, unitPrice: 0 }],
    }));

  const removeItem = idx => {
    if (newInvoice.items.length <= 1) return;
    setNewInvoice(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    }));
  };

  const subtotal = newInvoice.items.reduce(
    (s, i) => s + (Number(i.quantity) * Number(i.unitPrice) || 0),
    0
  );
  const vat = subtotal * 0.15;
  const total = subtotal + vat;

  const handleCreate = async () => {
    if (!newInvoice.customerName) {
      showSnackbar('يرجى إدخال اسم العميل', 'error');
      return;
    }
    try {
      await accountingService.createInvoice({ ...newInvoice, subtotal, vat, total });
      showSnackbar('تم إنشاء الفاتورة بنجاح', 'success');
      setCreateDialog(false);
      loadInvoices();
    } catch {
      showSnackbar('فشل إنشاء الفاتورة', 'error');
    }
  };

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل الفواتير...
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
                <InvoiceIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  إدارة الفواتير
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  إنشاء وتتبع الفواتير والمدفوعات
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
              فاتورة جديدة
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الفواتير',
            value: summaryData.total,
            sub: `${summaryData.totalAmount.toLocaleString()} ر.س`,
            color: brandColors.primary,
          },
          {
            label: 'المحصّل',
            value: '',
            sub: `${summaryData.paid.toLocaleString()} ر.س`,
            color: statusColors.success,
          },
          {
            label: 'المتأخر',
            value: '',
            sub: `${summaryData.overdue.toLocaleString()} ر.س`,
            color: statusColors.error,
          },
          {
            label: 'صافي المستحقات',
            value: '',
            sub: `${(summaryData.totalAmount - summaryData.paid).toLocaleString()} ر.س`,
            color: statusColors.warning,
          },
        ].map((s, i) => (
          <Grid item xs={3} key={i}>
            <Card
              sx={{
                borderRadius: 2.5,
                border: `1px solid ${surfaceColors.border}`,
                textAlign: 'center',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                {s.value && (
                  <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>
                    {s.value}
                  </Typography>
                )}
                <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>
                  {s.sub}
                </Typography>
                <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                  {s.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs & Search */}
      <Card sx={{ mb: 3, borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: `1px solid ${surfaceColors.border}`, px: 2 }}
        >
          <Tab label={`الكل (${invoices.length})`} />
          <Tab label={`مسودات (${invoices.filter(i => i.status === 'draft').length})`} />
          <Tab label={`مرسلة (${invoices.filter(i => i.status === 'sent').length})`} />
          <Tab label={`متأخرة (${invoices.filter(i => i.status === 'overdue').length})`} />
          <Tab label={`مدفوعة (${invoices.filter(i => i.status === 'paid').length})`} />
        </Tabs>
        <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="بحث بالرقم أو اسم العميل..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: neutralColors.textDisabled }} />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.background }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم الفاتورة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>العميل</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ الاستحقاق</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  المبلغ الفرعي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  ضريبة (15%)
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="left">
                  الإجمالي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map(inv => (
                <TableRow
                  key={inv._id}
                  hover
                  sx={{
                    ...(inv.status === 'overdue' && { bgcolor: 'rgba(244,67,54,0.04)' }),
                  }}
                >
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: brandColors.primary }}
                    >
                      {inv.invoiceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {inv.customerName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                      {inv.customerEmail}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{inv.dueDate}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2">{(inv.subtotal || 0).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2">{(inv.vat || 0).toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={700}>
                      {(inv.total || 0).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusConfig[inv.status]?.label || inv.status}
                      color={statusConfig[inv.status]?.color || 'default'}
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
                            setSelectedInvoice(inv);
                            setViewDialog(true);
                          }}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {inv.status === 'draft' && (
                        <Tooltip title="إرسال">
                          <IconButton size="small" color="info">
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="طباعة">
                        <IconButton size="small">
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography sx={{ color: neutralColors.textDisabled }}>
                      لا توجد فواتير مطابقة
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* View Invoice Dialog */}
      <Dialog
        open={viewDialog}
        onClose={() => setViewDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InvoiceIcon /> فاتورة {selectedInvoice?.invoiceNumber}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          {selectedInvoice && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    العميل
                  </Typography>
                  <Typography fontWeight={700} variant="h6">
                    {selectedInvoice.customerName}
                  </Typography>
                  <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                    {selectedInvoice.customerEmail}
                  </Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">
                    تاريخ الإصدار
                  </Typography>
                  <Typography fontWeight={600}>{selectedInvoice.issueDate}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="textSecondary">
                    تاريخ الاستحقاق
                  </Typography>
                  <Typography fontWeight={600}>{selectedInvoice.dueDate}</Typography>
                </Grid>
              </Grid>
              <Divider sx={{ mb: 2 }} />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell sx={{ fontWeight: 700 }}>البند</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">
                        الكمية
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="left">
                        سعر الوحدة
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="left">
                        الإجمالي
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedInvoice.items?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="left">{item.unitPrice?.toLocaleString()}</TableCell>
                        <TableCell align="left">
                          {(item.quantity * item.unitPrice).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ mt: 2, p: 2, bgcolor: surfaceColors.background, borderRadius: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={8}>
                    <Typography align="left">المبلغ الفرعي</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography align="left" fontWeight={600}>
                      {selectedInvoice.subtotal?.toLocaleString()} ر.س
                    </Typography>
                  </Grid>
                  <Grid item xs={8}>
                    <Typography align="left">ضريبة القيمة المضافة (15%)</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography align="left" fontWeight={600}>
                      {selectedInvoice.vat?.toLocaleString()} ر.س
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Divider />
                  </Grid>
                  <Grid item xs={8}>
                    <Typography align="left" variant="h6" fontWeight={700}>
                      الإجمالي
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography
                      align="left"
                      variant="h6"
                      fontWeight={800}
                      sx={{ color: brandColors.primary }}
                    >
                      {selectedInvoice.total?.toLocaleString()} ر.س
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ borderRadius: 2 }}>
            طباعة
          </Button>
          <Button onClick={() => setViewDialog(false)} variant="contained" sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog
        open={createDialog}
        onClose={() => setCreateDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: gradients.primary, color: '#fff', fontWeight: 700 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MoneyIcon /> إنشاء فاتورة جديدة
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3, mt: 1 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم العميل"
                value={newInvoice.customerName}
                onChange={e => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="البريد الإلكتروني"
                value={newInvoice.customerEmail}
                onChange={e => setNewInvoice({ ...newInvoice, customerEmail: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الاستحقاق"
                type="date"
                value={newInvoice.dueDate}
                onChange={e => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={newInvoice.notes}
                onChange={e => setNewInvoice({ ...newInvoice, notes: e.target.value })}
              />
            </Grid>
          </Grid>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            بنود الفاتورة
          </Typography>
          <TableContainer sx={{ mb: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.background }}>
                  <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 90 }}>الكمية</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }}>سعر الوحدة</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 100 }}>الإجمالي</TableCell>
                  <TableCell sx={{ width: 50 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {newInvoice.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                        placeholder="وصف البند"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={item.unitPrice || ''}
                        onChange={e => updateItem(i, 'unitPrice', e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {(Number(item.quantity) * Number(item.unitPrice) || 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => removeItem(i)}
                        disabled={newInvoice.items.length <= 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button size="small" startIcon={<AddIcon />} onClick={addItem} sx={{ mb: 2 }}>
            إضافة بند
          </Button>
          <Box sx={{ p: 2, bgcolor: surfaceColors.background, borderRadius: 2 }}>
            <Grid container spacing={1}>
              <Grid item xs={8}>
                <Typography>المبلغ الفرعي</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography fontWeight={600}>{subtotal.toLocaleString()} ر.س</Typography>
              </Grid>
              <Grid item xs={8}>
                <Typography>ض.ق.م (15%)</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography fontWeight={600}>{vat.toLocaleString()} ر.س</Typography>
              </Grid>
              <Grid item xs={12}>
                <Divider />
              </Grid>
              <Grid item xs={8}>
                <Typography fontWeight={700}>الإجمالي</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography fontWeight={800} sx={{ color: brandColors.primary }}>
                  {total.toLocaleString()} ر.س
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateDialog(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newInvoice.customerName || subtotal <= 0}
            sx={{ borderRadius: 2 }}
          >
            إنشاء الفاتورة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default InvoiceManagement;
