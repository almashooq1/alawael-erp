/* eslint-disable no-console */
import { useState, useEffect } from 'react';
import { getToken } from '../../utils/tokenStorage';


import { surfaceColors, neutralColors, brandColors, statusColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const RecurringTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'expense',
    amount: '',
    frequency: 'monthly',
    category: '',
    startDate: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/advanced/recurring-transactions`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) setTransactions(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/finance/advanced/recurring-transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      });
      const json = await res.json();
      if (json.success) {
        setTransactions(prev => [json.data, ...prev]);
        setOpenDialog(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    const action = currentStatus === 'active' ? 'pause' : 'resume';
    try {
      await fetch(`${API}/finance/advanced/recurring-transactions/${id}/${action}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة المتكررة؟')) return;
    try {
      await fetch(`${API}/finance/advanced/recurring-transactions/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setTransactions(prev => prev.filter(t => t._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecute = async id => {
    try {
      const res = await fetch(`${API}/finance/advanced/recurring-transactions/${id}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const json = await res.json();
      if (json.success) alert('تم تنفيذ المعاملة بنجاح');
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const freqLabels = {
    daily: 'يومي',
    weekly: 'أسبوعي',
    monthly: 'شهري',
    quarterly: 'ربع سنوي',
    semi_annual: 'نصف سنوي',
    annual: 'سنوي',
  };
  const statusConfig = {
    active: { label: 'نشط', color: statusColors.success },
    paused: { label: 'متوقف', color: statusColors.warning },
    cancelled: { label: 'ملغي', color: statusColors.error },
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  const totalMonthly = transactions
    .filter(t => t.status === 'active')
    .reduce((s, t) => {
      const amount = t.amount || 0;
      if (t.frequency === 'monthly') return s + amount;
      if (t.frequency === 'quarterly') return s + amount / 3;
      if (t.frequency === 'annual') return s + amount / 12;
      if (t.frequency === 'weekly') return s + amount * 4.33;
      return s + amount;
    }, 0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            المعاملات المتكررة
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Recurring Transactions - إدارة المعاملات المالية الدورية
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{ bgcolor: brandColors.primary, borderRadius: 2, fontWeight: 700 }}
        >
          معاملة متكررة جديدة
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          { label: 'إجمالي المعاملات', value: transactions.length, color: brandColors.primary },
          {
            label: 'نشطة',
            value: transactions.filter(t => t.status === 'active').length,
            color: statusColors.success,
          },
          {
            label: 'التكلفة الشهرية المقدرة',
            value: formatCurrency(totalMonthly),
            color: '#FF5722',
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 200,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: item.color, mt: 0.5 }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: surfaceColors.card }}>
                <TableCell sx={{ fontWeight: 700 }}>المعاملة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  المبلغ
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التكرار</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التنفيذ القادم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>عدد التنفيذات</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((t, idx) => (
                <TableRow key={idx} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{t.name}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={t.type === 'expense' ? 'مصروف' : 'إيراد'}
                      sx={{
                        bgcolor: t.type === 'expense' ? '#F4433615' : '#4CAF5015',
                        color: t.type === 'expense' ? '#F44336' : '#4CAF50',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell>{freqLabels[t.frequency] || t.frequency}</TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {t.nextExecutionDate?.slice(0, 10)}
                  </TableCell>
                  <TableCell align="center">{t.executionCount || 0}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={statusConfig[t.status]?.label || t.status}
                      sx={{
                        bgcolor: `${statusConfig[t.status]?.color || '#999'}20`,
                        color: statusConfig[t.status]?.color,
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title={t.status === 'active' ? 'إيقاف' : 'تشغيل'}>
                        <IconButton size="small" onClick={() => handleToggle(t._id, t.status)}>
                          {t.status === 'active' ? (
                            <Pause fontSize="small" />
                          ) : (
                            <PlayArrow fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تنفيذ يدوي">
                        <IconButton
                          size="small"
                          onClick={() => handleExecute(t._id)}
                          color="primary"
                        >
                          <Schedule fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" onClick={() => handleDelete(t._id)} color="error">
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>إنشاء معاملة متكررة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="اسم المعاملة"
            fullWidth
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="النوع"
              fullWidth
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
            >
              <MenuItem value="expense">مصروف</MenuItem>
              <MenuItem value="income">إيراد</MenuItem>
            </TextField>
            <TextField
              label="المبلغ"
              type="number"
              fullWidth
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              label="التكرار"
              fullWidth
              value={form.frequency}
              onChange={e => setForm({ ...form, frequency: e.target.value })}
            >
              {Object.entries(freqLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الفئة"
              fullWidth
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            />
          </Box>
          <TextField
            label="تاريخ البداية"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.startDate}
            onChange={e => setForm({ ...form, startDate: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ bgcolor: brandColors.primary }}>
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default RecurringTransactions;
