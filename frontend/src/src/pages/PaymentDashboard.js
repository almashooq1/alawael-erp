import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Box,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import { CreditCard, Description, History as HistoryIcon, Dashboard as DashboardIcon, AttachMoney } from '@mui/icons-material';

function PaymentDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });

  // Payment Form State
  const [amount, setAmount] = useState(100);
  const [currency, setCurrency] = useState('SAR');
  const [method, setMethod] = useState('card');
  const [description, setDescription] = useState('');
  const [months, setMonths] = useState(3); // For installments

  // Stats (Mock for now, or loaded from API)
  const [stats, setStats] = useState({
    totalSpent: 0,
    activePlan: 'Free',
    nextBill: 'N/A',
  });

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/payments/history');
      if (res.data.success) {
        setHistory(res.data.data);
        const total = res.data.data
          .filter(p => p.status === 'completed' || p.status === 'succeeded' || p.status === 'processing')
          .reduce((sum, p) => sum + p.amount, 0);
        setStats(prev => ({ ...prev, totalSpent: total }));
      }
    } catch (error) {
      console.error(error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setLoading(true);
    setNotification({ show: false, message: '', type: 'info' });
    try {
      let res;
      if (method === 'card') {
        res = await axios.post('/api/payments/stripe', { amount, currency });
      } else if (method === 'paypal') {
        res = await axios.post('/api/payments/paypal', { amount, description: description || 'Payment' });
        if (res.data.data.redirectUrl) {
          window.open(res.data.data.redirectUrl, '_blank');
          setNotification({ show: true, message: 'Redirecting to PayPal...', type: 'info' });
          setLoading(false);
          return;
        }
      } else if (method === 'installment') {
        res = await axios.post('/api/payments/installment', { amount, months });
      }

      if (res.data.success) {
        setNotification({ show: true, message: 'Payment Initiated Successfully', type: 'success' });
        loadHistory();
        setActiveTab(2); // Switch to history
      }
    } catch (err) {
      setNotification({ show: true, message: err.response?.data?.message || 'Payment failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async plan => {
    setLoading(true);
    try {
      const res = await axios.post('/api/payments/subscriptions/create', { plan, billingCycle: 'monthly' });
      if (res.data.success) {
        setStats(prev => ({ ...prev, activePlan: plan }));
        setNotification({ show: true, message: `Subscribed to ${plan} successfully`, type: 'success' });
      }
    } catch (err) {
      setNotification({ show: true, message: 'Subscription failed', type: 'error' });
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
              <Typography color="textSecondary">Total Spent</Typography>
            </Box>
            <Typography variant="h4">{stats.totalSpent.toFixed(2)} SAR</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Description color="secondary" sx={{ mr: 1 }} />
              <Typography color="textSecondary">Active Subscription</Typography>
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
              <Typography color="textSecondary">Last Payment Date</Typography>
            </Box>
            <Typography variant="h6">{history.length > 0 ? new Date(history[0].createdAt).toLocaleDateString() : 'No payments'}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPaymentForm = () => (
    <Container maxWidth="sm">
      <Paper sx={{ p: 4, mt: 2 }}>
        <Typography variant="h5" gutterBottom>
          Make a Payment
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            label="Amount"
            type="number"
            fullWidth
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            InputProps={{ inputProps: { min: 1 } }}
          />
          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select value={currency} onChange={e => setCurrency(e.target.value)}>
              <MenuItem value="SAR">SAR</MenuItem>
              <MenuItem value="USD">USD</MenuItem>
              <MenuItem value="EUR">EUR</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Payment Method</InputLabel>
          <Select value={method} onChange={e => setMethod(e.target.value)}>
            <MenuItem value="card">Credit/Debit Card (Stripe)</MenuItem>
            <MenuItem value="paypal">PayPal</MenuItem>
            <MenuItem value="installment">Installments (Tabby/Tamara)</MenuItem>
          </Select>
        </FormControl>

        {method === 'installment' && (
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Installment Period</InputLabel>
            <Select value={months} onChange={e => setMonths(e.target.value)}>
              <MenuItem value={3}>3 Months</MenuItem>
              <MenuItem value={6}>6 Months (Interest Free)</MenuItem>
              <MenuItem value={12}>12 Months</MenuItem>
            </Select>
          </FormControl>
        )}

        {method === 'card' && (
          <Box sx={{ p: 2, border: '1px solid #ddd', borderRadius: 1, mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Mock Card Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth placeholder="4242 4242 4242 4242" label="Card Number" size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth placeholder="MM/YY" label="Expiry" size="small" />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth placeholder="CVC" label="CVC" size="small" />
              </Grid>
            </Grid>
          </Box>
        )}

        <TextField
          label="Description (Optional)"
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
          {loading ? 'Processing...' : `Pay ${amount} ${currency}`}
        </Button>
      </Paper>
    </Container>
  );

  const renderHistory = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Transaction ID</TableCell>
            <TableCell>Method</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map(row => (
            <TableRow key={row._id || row.transactionId}>
              <TableCell>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell>{row.transactionId}</TableCell>
              <TableCell sx={{ textTransform: 'capitalize' }}>{row.paymentMethod}</TableCell>
              <TableCell>
                {row.amount} {row.currency}
              </TableCell>
              <TableCell>
                <Chip
                  label={row.status}
                  color={row.status === 'completed' || row.status === 'succeeded' || row.status === 'processing' ? 'success' : 'default'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          ))}
          {history.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No transactions found
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
          <Card sx={{ textAlign: 'center', p: 2, border: stats.activePlan.toLowerCase() === plan ? '2px solid green' : undefined }}>
            <CardContent>
              <Typography variant="h5" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                {plan}
              </Typography>
              <Typography variant="h4" color="primary" sx={{ my: 2 }}>
                {plan === 'basic' ? '99' : plan === 'professional' ? '299' : '999'} SAR
                <Typography variant="caption" color="textSecondary">
                  /mo
                </Typography>
              </Typography>
              <Box sx={{ textAlign: 'left', mb: 3 }}>
                <Typography variant="body2">✓ Feature 1 Included</Typography>
                <Typography variant="body2">✓ Feature 2 Included</Typography>
                <Typography variant="body2">✓ Feature 3 Included</Typography>
              </Box>
              <Button
                variant={stats.activePlan.toLowerCase() === plan ? 'outlined' : 'contained'}
                fullWidth
                onClick={() => handleSubscribe(plan)}
                disabled={loading || stats.activePlan.toLowerCase() === plan}
              >
                {stats.activePlan.toLowerCase() === plan ? 'Current Plan' : 'Upgrade'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AttachMoney fontSize="large" /> Financial Dashboard
      </Typography>

      {notification.show && (
        <Alert severity={notification.type} onClose={() => setNotification({ ...notification, show: false })} sx={{ mb: 3 }}>
          {notification.message}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} centered variant="fullWidth">
          <Tab label="Overview" icon={<DashboardIcon />} iconPosition="start" />
          <Tab label="Make Payment" icon={<CreditCard />} iconPosition="start" />
          <Tab label="History" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Subscriptions" icon={<Description />} iconPosition="start" />
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
