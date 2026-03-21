import { useEffect, useState, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';
import apiClient from 'services/api.client';


import logger from 'utils/logger';
import { gradients } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

// بيانات تجريبية
const demoHistory = [
  {
    _id: '1',
    description: 'رسوم الفصل الدراسي',
    amount: 5000,
    currency: 'SAR',
    method: 'card',
    status: 'completed',
    createdAt: '2026-02-15T10:30:00Z',
  },
  {
    _id: '2',
    description: 'رسوم العلاج الطبيعي',
    amount: 2500,
    currency: 'SAR',
    method: 'card',
    status: 'completed',
    createdAt: '2026-02-20T14:00:00Z',
  },
  {
    _id: '3',
    description: 'رسوم النقل',
    amount: 800,
    currency: 'SAR',
    method: 'paypal',
    status: 'completed',
    createdAt: '2026-03-01T09:15:00Z',
  },
  {
    _id: '4',
    description: 'رسوم المواد التعليمية',
    amount: 350,
    currency: 'SAR',
    method: 'card',
    status: 'processing',
    createdAt: '2026-03-05T11:45:00Z',
  },
];

function PaymentDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const showSnackbar = useSnackbar();

  // Payment Form State
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState('SAR');
  const [method, setMethod] = useState('card');
  const [description, setDescription] = useState('');
  const [months, setMonths] = useState(3); // For installments

  // Stats (Mock for now, or loaded from API)
  const [stats, setStats] = useState({
    totalSpent: 0,
    activePlan: 'مجاني',
    nextBill: 'غير متوفر',
  });

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payments/history');
      if (res.success) {
        setHistory(res.data);
        const total = res.data
          .filter(
            p => p.status === 'completed' || p.status === 'succeeded' || p.status === 'processing'
          )
          .reduce((sum, p) => sum + p.amount, 0);
        setStats(prev => ({ ...prev, totalSpent: total }));
      } else {
        throw new Error('No data');
      }
    } catch (error) {
      logger.error(error);
      showSnackbar('تعذر تحميل سجل المدفوعات، تم استخدام بيانات تجريبية', 'warning');
      setHistory(demoHistory);
      const total = demoHistory
        .filter(p => p.status === 'completed' || p.status === 'processing')
        .reduce((sum, p) => sum + p.amount, 0);
      setStats(prev => ({ ...prev, totalSpent: total, activePlan: 'متميز' }));
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadHistory();
    // Load active subscription status
    const loadSubscription = async () => {
      try {
        const res = await apiClient.get('/payments/subscriptions/active');
        if (res.success && res.data) {
          setStats(prev => ({
            ...prev,
            activePlan: res.data.plan || prev.activePlan,
            nextBill: res.data.nextBillingDate
              ? new Date(res.data.nextBillingDate).toLocaleDateString('ar')
              : prev.nextBill,
          }));
        }
      } catch {
        // Keep defaults
      }
    };
    loadSubscription();
  }, [loadHistory]);

  const handlePayment = async () => {
    setLoading(true);
    setNotification({ show: false, message: '', type: 'info' });
    try {
      let res;
      if (method === 'card') {
        res = await apiClient.post('/payments/stripe', { amount, currency });
      } else if (method === 'paypal') {
        res = await apiClient.post('/payments/paypal', {
          amount,
          description: description || 'دفعة',
        });
        if (res.data.redirectUrl) {
          window.open(res.data.redirectUrl, '_blank');
          setNotification({ show: true, message: 'جاري التحويل إلى PayPal...', type: 'info' });
          setLoading(false);
          return;
        }
      } else if (method === 'installment') {
        res = await apiClient.post('/payments/installment', { amount, months });
      }

      if (res.success) {
        setNotification({ show: true, message: 'تم بدء عملية الدفع بنجاح', type: 'success' });
        showSnackbar('تم بدء عملية الدفع بنجاح', 'success');
        loadHistory();
        setActiveTab(2); // Switch to history
      }
    } catch (err) {
      setNotification({ show: true, message: 'فشلت عملية الدفع', type: 'error' });
      showSnackbar('فشلت عملية الدفع', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async plan => {
    setLoading(true);
    try {
      const res = await apiClient.post('/payments/subscriptions/create', {
        plan,
        billingCycle: 'monthly',
      });
      if (res.success) {
        setStats(prev => ({ ...prev, activePlan: plan }));
        setNotification({
          show: true,
          message: `تم الاشتراك في باقة ${plan} بنجاح`,
          type: 'success',
        });
        showSnackbar(`تم الاشتراك في باقة ${plan} بنجاح`, 'success');
      }
    } catch (err) {
      setNotification({ show: true, message: 'فشل الاشتراك', type: 'error' });
      showSnackbar('فشل الاشتراك', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderOverview = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AttachMoney color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary">إجمالي الإنفاق</Typography>
            </Box>
            <Typography variant="h4">{stats.totalSpent.toFixed(2)} ر.س</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Description color="secondary" sx={{ mr: 1 }} />
              <Typography color="textSecondary">الاشتراك الحالي</Typography>
            </Box>
            <Typography variant="h4" sx={{ textTransform: 'capitalize' }}>
              {stats.activePlan}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <HistoryIcon color="action" sx={{ mr: 1 }} />
              <Typography color="textSecondary">تاريخ آخر دفعة</Typography>
            </Box>
            <Typography variant="h6">
              {history.length > 0
                ? new Date(history[0].createdAt).toLocaleDateString('ar')
                : 'لا توجد مدفوعات'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPaymentForm = () => (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 2 }}>
        <Typography variant="h5" gutterBottom>
          إجراء دفعة
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="المبلغ"
            type="number"
            fullWidth
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            InputProps={{ inputProps: { min: 1 } }}
          />
          <FormControl fullWidth>
            <InputLabel>العملة</InputLabel>
            <Select value={currency} onChange={e => setCurrency(e.target.value)}>
              <MenuItem value="SAR">ر.س</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>طريقة الدفع</InputLabel>
          <Select value={method} onChange={e => setMethod(e.target.value)}>
            <MenuItem value="card">بطاقة ائتمان/خصم (Stripe)</MenuItem>
            <MenuItem value="paypal">PayPal</MenuItem>
            <MenuItem value="installment">تقسيط (Tabby/Tamara)</MenuItem>
          </Select>
        </FormControl>

        {method === 'installment' && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>فترة التقسيط</InputLabel>
            <Select value={months} onChange={e => setMonths(e.target.value)}>
              <MenuItem value={3}>3 أشهر</MenuItem>
              <MenuItem value={6}>6 أشهر (بدون فوائد)</MenuItem>
              <MenuItem value={12}>12 شهر</MenuItem>
            </Select>
          </FormControl>
        )}

        {method === 'card' && (
          <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              بيانات البطاقة
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  placeholder="4242 4242 4242 4242"
                  label="رقم البطاقة"
                  size="small"
                />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth placeholder="MM/YY" label="الانتهاء" size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth placeholder="CVC" label="CVC" size="small" />
              </Grid>
            </Grid>
          </Box>
        )}

        <TextField
          label="الوصف (اختياري)"
          fullWidth
          multiline
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          sx={{ mb: 3 }}
        />

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handlePayment}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CreditCard />}
        >
          {loading ? 'جاري المعالجة...' : `دفع ${amount} ${currency === 'SAR' ? 'ر.س' : currency}`}
        </Button>
      </Paper>
    </Container>
  );

  const renderHistory = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>التاريخ</TableCell>
            <TableCell>رقم العملية</TableCell>
            <TableCell>الطريقة</TableCell>
            <TableCell>المبلغ</TableCell>
            <TableCell>الحالة</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map(row => (
            <TableRow key={row._id || row.transactionId}>
              <TableCell>
                {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'غير متوفر'}
              </TableCell>
              <TableCell>{row.transactionId}</TableCell>
              <TableCell>
                {{ card: 'بطاقة', paypal: 'PayPal', installment: 'تقسيط' }[
                  row.paymentMethod || row.method
                ] ||
                  row.paymentMethod ||
                  row.method ||
                  '-'}
              </TableCell>
              <TableCell>
                {row.amount} {row.currency === 'SAR' ? 'ر.س' : row.currency}
              </TableCell>
              <TableCell>
                <Chip
                  label={
                    row.status === 'completed' || row.status === 'succeeded'
                      ? 'مكتمل'
                      : row.status === 'processing'
                        ? 'قيد المعالجة'
                        : row.status === 'failed'
                          ? 'فشل'
                          : row.status
                  }
                  color={
                    row.status === 'completed' ||
                    row.status === 'succeeded' ||
                    row.status === 'processing'
                      ? 'success'
                      : 'default'
                  }
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
          {history.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                لا توجد عمليات
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderSubscriptions = () => (
    <Grid container spacing={3}>
      {['basic', 'professional', 'enterprise'].map(plan => (
        <Grid item xs={12} md={4} key={plan}>
          <Card
            sx={{
              textAlign: 'center',
              p: 2,
              border: stats.activePlan.toLowerCase() === plan ? '2px solid green' : undefined,
            }}
          >
            <CardContent>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {plan === 'basic' ? 'أساسية' : plan === 'professional' ? 'احترافية' : 'مؤسسية'}
              </Typography>
              <Typography variant="h4" color="primary" sx={{ my: 2 }}>
                {plan === 'basic' ? '99' : plan === 'professional' ? '299' : '999'} ر.س
                <Typography variant="caption" color="textSecondary">
                  /شهرياً
                </Typography>
              </Typography>
              <Box sx={{ textAlign: 'left', mb: 3 }}>
                {plan === 'basic' && (
                  <>
                    <Typography variant="body2">✓ إدارة الطلاب الأساسية</Typography>
                    <Typography variant="body2">✓ تقارير شهرية</Typography>
                    <Typography variant="body2">✓ دعم بالبريد الإلكتروني</Typography>
                  </>
                )}
                {plan === 'professional' && (
                  <>
                    <Typography variant="body2">✓ كل ميزات الباقة الأساسية</Typography>
                    <Typography variant="body2">✓ خطط الرعاية المتكاملة</Typography>
                    <Typography variant="body2">✓ تحليلات متقدمة</Typography>
                    <Typography variant="body2">✓ دعم أولوية</Typography>
                  </>
                )}
                {plan === 'enterprise' && (
                  <>
                    <Typography variant="body2">✓ كل ميزات الباقة الاحترافية</Typography>
                    <Typography variant="body2">✓ تكامل API كامل</Typography>
                    <Typography variant="body2">✓ تحليلات AI</Typography>
                    <Typography variant="body2">✓ مدير حساب مخصص</Typography>
                    <Typography variant="body2">✓ دعم 24/7</Typography>
                  </>
                )}
              </Box>
              <Button
                variant={stats.activePlan.toLowerCase() === plan ? 'outlined' : 'contained'}
                fullWidth
                onClick={() => handleSubscribe(plan)}
                disabled={loading || stats.activePlan.toLowerCase() === plan}
              >
                {stats.activePlan.toLowerCase() === plan ? 'الباقة الحالية' : 'ترقية'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AttachMoney sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة المدفوعات
            </Typography>
            <Typography variant="body2">متابعة وإدارة المعاملات المالية</Typography>
          </Box>
        </Box>
      </Box>

      {notification.show && (
        <Alert
          severity={notification.type}
          onClose={() => setNotification({ ...notification, show: false })}
          sx={{ mb: 3 }}
        >
          {notification.message}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} centered variant="fullWidth">
          <Tab label="نظرة عامة" icon={<DashboardIcon />} iconPosition="start" />
          <Tab label="إجراء دفعة" icon={<CreditCard />} iconPosition="start" />
          <Tab label="السجل" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="الاشتراكات" icon={<Description />} iconPosition="start" />
        </Tabs>
      </Paper>

      <Box sx={{ minHeight: 400 }}>
        {activeTab === 0 && renderOverview()}
        {activeTab === 1 && renderPaymentForm()}
        {activeTab === 2 && renderHistory()}
        {activeTab === 3 && renderSubscriptions()}
      </Box>
    </Container>
  );
}

export default PaymentDashboard;
