import { useState, useEffect, useCallback } from 'react';


import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const statusMap = {
  active: { label: 'نشط', color: '#4CAF50' },
  inactive: { label: 'غير نشط', color: '#9E9E9E' },
  frozen: { label: 'مجمّد', color: '#F44336' },
  closed: { label: 'مغلق', color: '#795548' },
};
const typeMap = {
  current: 'جاري',
  savings: 'توفير',
  deposit: 'وديعة',
  investment: 'استثمار',
  escrow: 'ضمان',
  payroll: 'رواتب',
};
const currencies = ['SAR', 'USD', 'EUR', 'GBP', 'AED'];

const emptyForm = {
  accountName: '',
  bankName: '',
  branchName: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
  currency: 'SAR',
  accountType: 'current',
  status: 'active',
  openingBalance: 0,
  currentBalance: 0,
  isPrimary: false,
  notes: '',
};

const BankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [editId, setEditId] = useState(null);

  const headers = {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, sumRes] = await Promise.all([
        fetch(`${API}/finance/pro/bank-accounts`, { headers }),
        fetch(`${API}/finance/pro/bank-accounts/summary`, { headers }),
      ]);
      const accJson = await accRes.json();
      const sumJson = await sumRes.json();
      if (accJson.success) setAccounts(accJson.data);
      if (sumJson.success) setSummary(sumJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const fc = (v, c = 'SAR') =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: c,
      minimumFractionDigits: 0,
    }).format(v || 0);

  const handleOpen = acc => {
    if (acc) {
      setForm({ ...acc });
      setEditId(acc._id);
    } else {
      setForm({ ...emptyForm });
      setEditId(null);
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editId
        ? `${API}/finance/pro/bank-accounts/${editId}`
        : `${API}/finance/pro/bank-accounts`;
      const method = editId ? 'PUT' : 'POST';
      await fetch(url, { method, headers, body: JSON.stringify(form) });
      setOpen(false);
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل تريد حذف هذا الحساب البنكي؟')) return;
    try {
      await fetch(`${API}/finance/pro/bank-accounts/${id}`, { method: 'DELETE', headers });
      fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            الحسابات البنكية
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Bank Accounts Register / Treasury
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={fetchAll} startIcon={<Refresh />}>
            تحديث
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpen(null)}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            إضافة حساب
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card
            sx={{
              flex: 1,
              minWidth: 170,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                عدد الحسابات
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: brandColors.primary }}>
                {summary.totalAccounts}
              </Typography>
            </CardContent>
          </Card>
          {summary.byCurrency?.map((c, i) => (
            <Card
              key={i}
              sx={{
                flex: 1,
                minWidth: 170,
                borderRadius: 2,
                border: `1px solid ${surfaceColors.border}`,
              }}
            >
              <CardContent sx={{ textAlign: 'center', p: 2 }}>
                <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                  إجمالي {c._id}
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#4CAF50' }}>
                  {fc(c.totalBalance, c._id)}
                </Typography>
                <Typography variant="caption">{c.count} حساب</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {/* Accounts Table */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}></TableCell>
                <TableCell sx={{ fontWeight: 700 }}>اسم الحساب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>البنك</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>رقم الحساب</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>IBAN</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>العملة</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  الرصيد
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accounts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    align="center"
                    sx={{ py: 4, color: neutralColors.textSecondary }}
                  >
                    لا توجد حسابات بنكية
                  </TableCell>
                </TableRow>
              ) : (
                accounts.map(acc => (
                  <TableRow key={acc._id} hover>
                    <TableCell>
                      {acc.isPrimary ? (
                        <Star sx={{ color: '#FFC107', fontSize: 20 }} />
                      ) : (
                        <StarBorder sx={{ color: '#9E9E9E', fontSize: 20 }} />
                      )}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{acc.accountName}</TableCell>
                    <TableCell>{acc.bankName}</TableCell>
                    <TableCell sx={{ direction: 'ltr', fontFamily: 'monospace' }}>
                      {acc.accountNumber}
                    </TableCell>
                    <TableCell sx={{ direction: 'ltr', fontFamily: 'monospace', fontSize: 12 }}>
                      {acc.iban}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={typeMap[acc.accountType] || acc.accountType} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={acc.currency} variant="outlined" />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        color: acc.currentBalance >= 0 ? '#4CAF50' : '#F44336',
                      }}
                    >
                      {fc(acc.currentBalance, acc.currency)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusMap[acc.status]?.label || acc.status}
                        sx={{
                          bgcolor: `${statusMap[acc.status]?.color}15`,
                          color: statusMap[acc.status]?.color,
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleOpen(acc)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(acc._id)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          <AccountBalance sx={{ verticalAlign: 'middle', mr: 1 }} />
          {editId ? 'تعديل الحساب البنكي' : 'إضافة حساب بنكي جديد'}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="اسم الحساب"
              value={form.accountName}
              onChange={e => setForm({ ...form, accountName: e.target.value })}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="اسم البنك"
                value={form.bankName}
                onChange={e => setForm({ ...form, bankName: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="الفرع"
                value={form.branchName}
                onChange={e => setForm({ ...form, branchName: e.target.value })}
                fullWidth
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="رقم الحساب"
                value={form.accountNumber}
                onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="IBAN"
                value={form.iban}
                onChange={e => setForm({ ...form, iban: e.target.value })}
                fullWidth
                placeholder="SA0000000000000000000000"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="SWIFT Code"
                value={form.swiftCode}
                onChange={e => setForm({ ...form, swiftCode: e.target.value })}
                fullWidth
              />
              <TextField
                select
                label="العملة"
                value={form.currency}
                onChange={e => setForm({ ...form, currency: e.target.value })}
                fullWidth
              >
                {currencies.map(c => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                select
                label="نوع الحساب"
                value={form.accountType}
                onChange={e => setForm({ ...form, accountType: e.target.value })}
                fullWidth
              >
                {Object.entries(typeMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="الحالة"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                fullWidth
              >
                {Object.entries(statusMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                type="number"
                label="الرصيد الافتتاحي"
                value={form.openingBalance}
                onChange={e => setForm({ ...form, openingBalance: +e.target.value })}
                fullWidth
              />
              <TextField
                type="number"
                label="الرصيد الحالي"
                value={form.currentBalance}
                onChange={e => setForm({ ...form, currentBalance: +e.target.value })}
                fullWidth
              />
            </Box>
            <TextField
              label="ملاحظات"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            {editId ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BankAccounts;
