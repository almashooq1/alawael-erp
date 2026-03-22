import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  AccountBalance,
  Refresh,
  Add,
  AttachMoney,
  SwapHoriz,
  TrendingUp,
  CheckCircle,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';
const fmt = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v || 0);

const typeMap = {
  cash_pool: 'تجميع نقدي',
  fx_spot: 'عمليات فورية',
  fx_forward: 'عقود آجلة',
  fx_swap: 'مبادلة عملات',
  interest_rate_swap: 'مبادلة فائدة',
  money_market: 'سوق نقد',
  deposit: 'ودائع',
  loan_drawdown: 'سحب قرض',
  repayment: 'سداد',
  guarantee: 'ضمانات',
  letter_of_credit: 'اعتمادات مستندية',
};

const statusMap = {
  draft: { label: 'مسودة', color: '#9E9E9E' },
  pending_approval: { label: 'بانتظار الموافقة', color: '#FF9800' },
  approved: { label: 'معتمد', color: '#2196F3' },
  executed: { label: 'منفذ', color: '#4CAF50' },
  settled: { label: 'مسوّى', color: '#8BC34A' },
  cancelled: { label: 'ملغي', color: '#F44336' },
  expired: { label: 'منتهي', color: '#9E9E9E' },
  matured: { label: 'مستحق', color: '#795548' },
};

const TreasuryManagement = () => {
  const [tab, setTab] = useState(0);
  const [operations, setOperations] = useState([]);
  const [positions, setPositions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    operationType: 'deposit',
    tradeDate: new Date().toISOString().split('T')[0],
    'amounts.baseAmount': 0,
    'amounts.baseCurrency': 'SAR',
    'counterparty.name': '',
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchOperations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/finance/elite/treasury`, { headers });
      const json = await res.json();
      if (json.success) setOperations(json.data);
    } catch (e) {
      setError('خطأ في تحميل عمليات الخزينة');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/finance/elite/treasury/dashboard/positions`, { headers });
      const json = await res.json();
      if (json.success) setPositions(json.data);
    } catch (e) {
      /* silent */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchOperations();
    fetchPositions();
  }, [fetchOperations, fetchPositions]);

  const handleCreate = async () => {
    try {
      const payload = {
        operationType: form.operationType,
        tradeDate: form.tradeDate,
        amounts: {
          baseAmount: Number(form['amounts.baseAmount']),
          baseCurrency: form['amounts.baseCurrency'],
        },
        counterparty: { name: form['counterparty.name'] },
      };
      const res = await fetch(`${API}/finance/elite/treasury`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setOpenDialog(false);
        fetchOperations();
        fetchPositions();
      }
    } catch (e) {
      setError('خطأ في إنشاء عملية الخزينة');
    }
  };

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${surfaceColors.background} 0%, #f0f4f8 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AccountBalance sx={{ fontSize: 40, color: brandColors.primary }} />
            <Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: neutralColors.textPrimary, textAlign: 'right' }}
              >
                إدارة الخزينة المتقدمة
              </Typography>
              <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
                Treasury Management — تجميع النقد، التحوط، العلاقات البنكية
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                fetchOperations();
                fetchPositions();
              }}
            >
              تحديث
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setOpenDialog(true)}
              sx={{ bgcolor: brandColors.primary }}
            >
              عملية جديدة
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: `linear-gradient(135deg, ${brandColors.primary} 0%, #1565C0 100%)`,
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <SwapHoriz sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {operations.length}
                </Typography>
                <Typography variant="body2">إجمالي العمليات</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <AttachMoney sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fmt(positions?.totalExposure)}
                </Typography>
                <Typography variant="body2">إجمالي التعرض</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #FF9800 0%, #E65100 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {operations.filter(o => o.status === 'executed').length}
                </Typography>
                <Typography variant="body2">عمليات منفذة</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, #2196F3 0%, #0D47A1 100%)',
                color: '#fff',
              }}
            >
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircle sx={{ fontSize: 36, mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {operations.filter(o => o.status === 'settled').length}
                </Typography>
                <Typography variant="body2">عمليات مسوّاة</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 600 } }}
        >
          <Tab label="كل العمليات" />
          <Tab label="حسب النوع" />
        </Tabs>

        {tab === 0 && (
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: surfaceColors.sectionBg }}>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>رقم العملية</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>النوع</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      الطرف المقابل
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>المبلغ</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>
                      تاريخ التنفيذ
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الاستحقاق</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {operations.map(op => (
                    <TableRow key={op._id} hover>
                      <TableCell sx={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {op.operationNumber}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {typeMap[op.operationType] || op.operationType}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {op.counterparty?.name || '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(op.amounts?.baseAmount)}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {op.tradeDate ? new Date(op.tradeDate).toLocaleDateString('ar-SA') : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        {op.maturityDate
                          ? new Date(op.maturityDate).toLocaleDateString('ar-SA')
                          : '-'}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Chip
                          label={statusMap[op.status]?.label || op.status}
                          sx={{ bgcolor: statusMap[op.status]?.color, color: '#fff' }}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {operations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                        لا توجد عمليات خزينة
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {tab === 1 && positions?.byType && (
          <Grid container spacing={2}>
            {positions.byType.map(t => (
              <Grid item xs={12} sm={6} md={4} key={t._id}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, textAlign: 'right', mb: 1 }}>
                      {typeMap[t._id] || t._id}
                    </Typography>
                    <Typography
                      variant="h3"
                      sx={{ fontWeight: 700, color: brandColors.primary, textAlign: 'center' }}
                    >
                      {t.count}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ textAlign: 'center', color: neutralColors.textSecondary }}
                    >
                      {fmt(t.totalAmount)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ textAlign: 'right', fontWeight: 700 }}>عملية خزينة جديدة</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              select
              label="نوع العملية"
              value={form.operationType}
              onChange={e => setForm({ ...form, operationType: e.target.value })}
              sx={{ mb: 2, mt: 1 }}
            >
              {Object.entries(typeMap).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              label="الطرف المقابل"
              value={form['counterparty.name']}
              onChange={e => setForm({ ...form, 'counterparty.name': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="number"
              label="المبلغ (ر.س)"
              value={form['amounts.baseAmount']}
              onChange={e => setForm({ ...form, 'amounts.baseAmount': e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              type="date"
              label="تاريخ التنفيذ"
              value={form.tradeDate}
              onChange={e => setForm({ ...form, tradeDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              sx={{ bgcolor: brandColors.primary }}
            >
              حفظ
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default TreasuryManagement;
