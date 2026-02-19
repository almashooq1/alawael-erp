/**
 * Financial CashFlow Dashboard Component
 * Real-time cash position monitoring, forecasting, and reserves management
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Tab,
  Tabs,
  LinearProgress,
  Dialog,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Waterfall,
  Cell
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { toast } from 'react-toastify';

const CashFlowDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [cashFlowData, setCashFlowData] = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [reserves, setReserves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showForecastDialog, setShowForecastDialog] = useState(false);
  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [selectedReserve, setSelectedReserve] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    inflows: [],
    outflows: [],
    openingBalance: 0
  });

  const [forecastForm, setForecastForm] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    assumptions: []
  });

  const [transactionForm, setTransactionForm] = useState({
    type: 'deposit',
    amount: 0,
    description: ''
  });

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [summaryRes, forecastsRes, reservesRes] = await Promise.all([
        fetch('/api/cashflow/summary?startDate=2025-01-01&endDate=2025-02-28', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/cashflow/forecasts/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/cashflow/reserves/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!summaryRes.ok || !forecastsRes.ok || !reservesRes.ok) {
        throw new Error('Failed to load data');
      }

      const summaryData = await summaryRes.json();
      const forecastsData = await forecastsRes.json();
      const reservesData = await reservesRes.json();

      setCashFlowData(summaryData.data);
      setForecasts(forecastsData.data || []);
      setReserves(reservesData.data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('Failed to load cash flow data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCashFlow = async () => {
    try {
      const response = await fetch('/api/cashflow/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });

      if (!response.ok) throw new Error('Failed to create cash flow');

      toast.success('Cash flow created successfully');
      setShowCreateDialog(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGenerateForecast = async () => {
    try {
      const response = await fetch('/api/cashflow/forecasts/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(forecastForm)
      });

      if (!response.ok) throw new Error('Failed to generate forecast');

      toast.success('Forecast generated successfully');
      setShowForecastDialog(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRecordTransaction = async () => {
    try {
      const response = await fetch(`/api/cashflow/reserves/${selectedReserve._id}/transaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionForm)
      });

      if (!response.ok) throw new Error('Failed to record transaction');

      toast.success('Transaction recorded successfully');
      setShowReserveDialog(false);
      loadData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getReserveStatusColor = (status) => {
    switch (status) {
      case 'below_minimum': return '#d32f2f';
      case 'insufficient': return '#f57c00';
      case 'adequate': return '#388e3c';
      case 'surplus': return '#1976d2';
      default: return '#666';
    }
  };

  const getReserveStatusLabel = (status) => {
    const labels = {
      below_minimum: 'Below Minimum',
      insufficient: 'Insufficient',
      adequate: 'Adequate',
      surplus: 'Surplus'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          Cash Flow Dashboard
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Real-time cash position, forecasting, and reserves management
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Action Buttons */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={() => setShowCreateDialog(true)} startIcon={<AddIcon />}>
          Add Cash Flow Entry
        </Button>
        <Button variant="outlined" onClick={() => setShowForecastDialog(true)}>
          Generate Forecast
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Inflows
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#388e3c' }}>
                    ${cashFlowData?.totalInflows?.toFixed(2) || '0'}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#388e3c', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Outflows
                  </Typography>
                  <Typography variant="h5" sx={{ color: '#d32f2f' }}>
                    ${cashFlowData?.totalOutflows?.toFixed(2) || '0'}
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ fontSize: 40, color: '#d32f2f', opacity: 0.6 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Net Cash Flow
                  </Typography>
                  <Typography variant="h5" sx={{
                    color: (cashFlowData?.netCashFlow || 0) >= 0 ? '#388e3c' : '#d32f2f'
                  }}>
                    ${cashFlowData?.netCashFlow?.toFixed(2) || '0'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Closing Balance
                  </Typography>
                  <Typography variant="h5">
                    ${(cashFlowData?.periods?.[0]?.closingBalance || 0).toFixed(2)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Cash Flow Analysis" />
          <Tab label="Forecasts" />
          <Tab label="Reserves Management" />
          <Tab label="Advanced Analysis" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Cash Flow Trend Chart */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Cash Flow Trend</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashFlowData?.periods || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value?.toFixed(2)}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="inflows"
                    stroke="#388e3c"
                    name="Inflows"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="outflows"
                    stroke="#d32f2f"
                    name="Outflows"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="netFlow"
                    stroke="#1976d2"
                    name="Net Flow"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Period Summary */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Period Summary</Typography>
              {cashFlowData?.periods?.slice(0, 3).map((period, idx) => (
                <Box key={idx} sx={{ mb: 2, pb: 1.5, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Period {idx + 1}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2">Inflows:</Typography>
                    <Typography variant="body2" sx={{ color: '#388e3c' }}>
                      ${period.inflows?.toFixed(2) || '0'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">Outflows:</Typography>
                    <Typography variant="body2" sx={{ color: '#d32f2f' }}>
                      ${period.outflows?.toFixed(2) || '0'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Net:</Typography>
                    <Typography variant="body2" sx={{
                      fontWeight: 'bold',
                      color: period.netFlow >= 0 ? '#388e3c' : '#d32f2f'
                    }}>
                      ${period.netFlow?.toFixed(2) || '0'}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>

          {/* Inflows/Outflows Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Inflows Breakdown</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={cashFlowData?.periods || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="inflows" fill="#388e3c" stroke="#2e7d32" />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Outflows Trend</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={cashFlowData?.periods || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="outflows" fill="#d32f2f" stroke="#b71c1c" />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {forecasts.map((forecast) => (
            <Grid item xs={12} key={forecast._id}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Forecast: {new Date(forecast.forecastPeriod.startDate).toLocaleDateString()} - {new Date(forecast.forecastPeriod.endDate).toLocaleDateString()}
                  </Typography>
                  <Chip label={forecast.status} color="primary" variant="outlined" />
                </Box>

                {/* Scenarios */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Scenarios
                  </Typography>
                  <Grid container spacing={2}>
                    {forecast.scenarios?.map((scenario, idx) => (
                      <Grid item xs={12} sm={6} md={4} key={idx}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                              {scenario.name?.charAt(0).toUpperCase() + scenario.name?.slice(1)}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                              Probability: {scenario.probability}%
                            </Typography>
                            <Box sx={{ mt: 1.5 }}>
                              <Typography variant="caption" color="textSecondary">
                                Month 1: ${scenario.month1?.inflows?.toFixed(0)} / ${scenario.month1?.outflows?.toFixed(0)}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Confidence Intervals */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Confidence Intervals
                  </Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={[
                      { name: 'Month 1', lower: forecast.confidenceIntervals?.lower?.month1?.inflows || 0, upper: forecast.confidenceIntervals?.upper?.month1?.inflows || 0 },
                      { name: 'Month 2', lower: forecast.confidenceIntervals?.lower?.month2?.inflows || 0, upper: forecast.confidenceIntervals?.upper?.month2?.inflows || 0 },
                      { name: 'Month 3', lower: forecast.confidenceIntervals?.lower?.month3?.inflows || 0, upper: forecast.confidenceIntervals?.upper?.month3?.inflows || 0 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="lower" fill="#e3f2fd" />
                      <Area type="monotone" dataKey="upper" fill="#e3f2fd" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {reserves.map((reserve) => (
            <Grid item xs={12} sm={6} md={4} key={reserve._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      {reserve.name?.replace(/_/g, ' ')}
                    </Typography>
                    <Chip
                      label={getReserveStatusLabel(reserve.adequacyRatio?.status)}
                      sx={{
                        backgroundColor: getReserveStatusColor(reserve.adequacyRatio?.status),
                        color: '#fff'
                      }}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">${reserve.currentAmount?.toFixed(2)}</Typography>
                      <Typography variant="body2">${reserve.targetAmount?.toFixed(2)}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min((reserve.currentAmount / reserve.targetAmount) * 100, 100)}
                      sx={{ height: 8, borderRadius: 1 }}
                    />
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                      Adequacy Ratio: {(reserve.adequacyRatio?.actual * 100)?.toFixed(1)}%
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Recent Transactions
                    </Typography>
                    {reserve.transactions?.slice(0, 2).map((tx, idx) => (
                      <Box key={idx} sx={{ fontSize: '0.85rem', color: '#666', mb: 0.5 }}>
                        <Typography variant="caption">
                          {tx.type}: ${tx.amount?.toFixed(2)} - {new Date(tx.date).toLocaleDateString()}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setSelectedReserve(reserve);
                      setShowReserveDialog(true);
                    }}
                  >
                    Record Transaction
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Advanced Cash Flow Analysis</Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Advanced analysis features including pattern detection, anomaly alerts, and AI-powered recommendations coming soon.
              </Alert>
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Key Metrics</Typography>
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">• Seasonal Pattern Analysis</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">• Cyclical Trend Detection</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">• Anomaly Detection (Z-score)</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2">• What-If Simulations</Typography>
                  </Grid>
                </Grid>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Create Cash Flow Dialog */}
      <Dialog open={showCreateDialog} onClose={() => setShowCreateDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Add Cash Flow Entry</Typography>
            <IconButton onClick={() => setShowCreateDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={createForm.startDate}
              onChange={(e) => setCreateForm(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={createForm.endDate}
              onChange={(e) => setCreateForm(prev => ({ ...prev, endDate: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Opening Balance"
              type="number"
              value={createForm.openingBalance}
              onChange={(e) => setCreateForm(prev => ({ ...prev, openingBalance: parseFloat(e.target.value) }))}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleCreateCashFlow}>
                Create
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Generate Forecast Dialog */}
      <Dialog open={showForecastDialog} onClose={() => setShowForecastDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Generate Forecast</Typography>
            <IconButton onClick={() => setShowForecastDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={forecastForm.startDate}
              onChange={(e) => setForecastForm(prev => ({ ...prev, startDate: e.target.value }))}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={forecastForm.endDate}
              onChange={(e) => setForecastForm(prev => ({ ...prev, endDate: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowForecastDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleGenerateForecast}>
                Generate
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>

      {/* Reserve Transaction Dialog */}
      <Dialog open={showReserveDialog} onClose={() => setShowReserveDialog(false)} maxWidth="sm" fullWidth>
        <Box sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Record Reserve Transaction</Typography>
            <IconButton onClick={() => setShowReserveDialog(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Transaction type selector */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={transactionForm.type === 'deposit' ? 'contained' : 'outlined'}
                onClick={() => setTransactionForm(prev => ({ ...prev, type: 'deposit' }))}
              >
                Deposit
              </Button>
              <Button
                variant={transactionForm.type === 'withdrawal' ? 'contained' : 'outlined'}
                onClick={() => setTransactionForm(prev => ({ ...prev, type: 'withdrawal' }))}
              >
                Withdrawal
              </Button>
            </Box>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={transactionForm.amount}
              onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
            />
            <TextField
              fullWidth
              label="Description"
              multiline
              rows={2}
              value={transactionForm.description}
              onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowReserveDialog(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleRecordTransaction}>
                Record
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </Container>
  );
};

export default CashFlowDashboard;
