/* eslint-disable no-console */
import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';




import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const statusLabels = { draft: 'مسودة', approved: 'معتمد', posted: 'مرحّل', cancelled: 'ملغي' };
const statusChipColors = {
  draft: '#FF9800',
  approved: '#2196F3',
  posted: '#4CAF50',
  cancelled: '#9E9E9E',
};
const methodLabels = {
  cash: 'نقدي',
  cheque: 'شيك',
  bank_transfer: 'حوالة بنكية',
  credit_card: 'بطاقة ائتمان',
  other: 'أخرى',
};

const PaymentVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm] = useState({
    type: 'payment',
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    paymentMethod: 'cash',
    partyType: 'vendor',
    partyName: '',
    description: '',
    reference: '',
    taxRate: 15,
    taxAmount: 0,
    notes: '',
  });

  const headers = { Authorization: `Bearer ${getToken()}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const type = activeTab === 0 ? '' : activeTab === 1 ? 'receipt' : 'payment';
      const params = type ? `?type=${type}` : '';
      const [vRes, sRes] = await Promise.all([
        fetch(`${API}/finance/extended/payment-vouchers${params}`, { headers }),
        fetch(`${API}/finance/extended/payment-vouchers/summary`, { headers }),
      ]);
      const vJson = await vRes.json();
      const sJson = await sRes.json();
      if (vJson.success) setVouchers(vJson.data);
      if (sJson.success) setSummary(sJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    fetchData();
   
  }, [fetchData]);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/extended/payment-vouchers`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        setForm({
          type: 'payment',
          date: new Date().toISOString().slice(0, 10),
          amount: 0,
          paymentMethod: 'cash',
          partyType: 'vendor',
          partyName: '',
          description: '',
          reference: '',
          taxRate: 15,
          taxAmount: 0,
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await fetch(`${API}/finance/extended/payment-vouchers/${id}/${action}`, {
        method: 'PATCH',
        headers,
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    try {
      await fetch(`${API}/finance/extended/payment-vouchers/${id}`, { method: 'DELETE', headers });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const updateTax = newForm => {
    const taxAmount = (newForm.amount * newForm.taxRate) / 100;
    setForm({ ...newForm, taxAmount: Math.round(taxAmount * 100) / 100 });
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            سندات الصرف والقبض
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Payment & Receipt Vouchers - إدارة المدفوعات والمقبوضات
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: brandColors.primary,
            borderRadius: 2,
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: brandColors.primaryDark },
          }}
        >
          إضافة سند
        </Button>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          {[
            {
              label: 'إجمالي المقبوضات',
              value: fc(summary.totalReceipts),
              count: summary.receiptCount,
              color: '#4CAF50',
              icon: <TrendingUp />,
            },
            {
              label: 'إجمالي المدفوعات',
              value: fc(summary.totalPayments),
              count: summary.paymentCount,
              color: '#F44336',
              icon: <TrendingDown />,
            },
            {
              label: 'صافي الرصيد',
              value: fc(summary.netBalance),
              color: summary.netBalance >= 0 ? '#4CAF50' : '#F44336',
              icon: <AccountBalanceWallet />,
            },
            {
              label: 'بانتظار الاعتماد',
              value: summary.pendingApproval,
              color: '#FF9800',
              icon: <PostAdd />,
            },
          ].map((item, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                minWidth: 180,
                borderRadius: 2,
                border: `1px solid ${surfaceColors.border}`,
              }}
            >
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  {item.label}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>
                  {item.value}
                </Typography>
                {item.count !== undefined && (
                  <Typography variant="caption">{item.count} سند</Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
        <Tab label="الكل" />
        <Tab label="سندات القبض" icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label="سندات الصرف" icon={<Payment sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {/* Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>رقم السند</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الطرف</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الضريبة
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الصافي
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>طريقة الدفع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vouchers.map((v, idx) => (
                <TableRow key={v._id || idx} hover>
                  <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {v.voucherNumber}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={v.type === 'receipt' ? 'قبض' : 'صرف'}
                      icon={
                        v.type === 'receipt' ? (
                          <TrendingUp sx={{ fontSize: 14 }} />
                        ) : (
                          <TrendingDown sx={{ fontSize: 14 }} />
                        )
                      }
                      sx={{
                        bgcolor: v.type === 'receipt' ? '#4CAF5015' : '#F4433615',
                        color: v.type === 'receipt' ? '#4CAF50' : '#F44336',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>{new Date(v.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {v.partyName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                        {v.partyType === 'customer'
                          ? 'عميل'
                          : v.partyType === 'vendor'
                            ? 'مورد'
                            : v.partyType === 'employee'
                              ? 'موظف'
                              : 'أخرى'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {fc(v.amount)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#FF9800' }}>
                    {fc(v.taxAmount)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: brandColors.primary }}>
                    {fc(v.netAmount || v.amount)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={methodLabels[v.paymentMethod] || v.paymentMethod}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusLabels[v.status] || v.status}
                      sx={{
                        bgcolor: `${statusChipColors[v.status] || '#9E9E9E'}15`,
                        color: statusChipColors[v.status] || '#9E9E9E',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {v.status === 'draft' && (
                        <Tooltip title="اعتماد">
                          <IconButton
                            size="small"
                            onClick={() => handleAction(v._id, 'approve')}
                            sx={{ color: '#2196F3' }}
                          >
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {v.status === 'approved' && (
                        <Tooltip title="ترحيل">
                          <IconButton
                            size="small"
                            onClick={() => handleAction(v._id, 'post')}
                            sx={{ color: '#4CAF50' }}
                          >
                            <PostAdd fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {v.status === 'draft' && (
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(v._id)}
                            sx={{ color: '#F44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {vouchers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد سندات مسجلة
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إضافة سند جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="نوع السند"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                fullWidth
              >
                <MenuItem value="receipt">سند قبض</MenuItem>
                <MenuItem value="payment">سند صرف</MenuItem>
              </TextField>
              <TextField
                label="التاريخ"
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="نوع الطرف"
                value={form.partyType}
                onChange={e => setForm({ ...form, partyType: e.target.value })}
                sx={{ minWidth: 140 }}
              >
                <MenuItem value="customer">عميل</MenuItem>
                <MenuItem value="vendor">مورد</MenuItem>
                <MenuItem value="employee">موظف</MenuItem>
                <MenuItem value="other">أخرى</MenuItem>
              </TextField>
              <TextField
                label="اسم الطرف"
                value={form.partyName}
                onChange={e => setForm({ ...form, partyName: e.target.value })}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="المبلغ"
                type="number"
                value={form.amount}
                onChange={e => updateTax({ ...form, amount: +e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="طريقة الدفع"
                value={form.paymentMethod}
                onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                fullWidth
              >
                {Object.entries(methodLabels).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="نسبة الضريبة %"
                type="number"
                value={form.taxRate}
                onChange={e => updateTax({ ...form, taxRate: +e.target.value })}
                sx={{ width: 140 }}
              />
              <TextField label="مبلغ الضريبة" value={form.taxAmount} disabled fullWidth />
              <TextField
                label="الصافي"
                value={Math.round((form.amount + form.taxAmount) * 100) / 100}
                disabled
                fullWidth
              />
            </Box>
            <Divider />
            <TextField
              label="الوصف"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            <TextField
              label="المرجع"
              value={form.reference}
              onChange={e => setForm({ ...form, reference: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.amount || !form.partyName}
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PaymentVouchers;
