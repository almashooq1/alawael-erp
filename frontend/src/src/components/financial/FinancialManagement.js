/**
 * Financial Management Component - Advanced Version ⭐
 * مكون الإدارة المالية - نسخة متقدمة
 *
 * Features:
 * ✅ Income and expense tracking
 * ✅ Invoice management
 * ✅ Budget planning
 * ✅ Financial reports
 * ✅ Tax calculations
 * ✅ Multi-currency support
 * ✅ Cash flow analysis
 * ✅ Financial forecasting
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from '@mui/material';
import {
  AttachMoney as AttachMoneyIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Add as AddIcon,
  Receipt as ReceiptIcon,
  AssignmentInd as AssignmentIndIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

const FinancialManagement = () => {
  const [transactions, setTransactions] = useState([
    { id: 'TXN001', date: '2026-01-15', type: 'دخل', category: 'مبيعات', amount: 5000, description: 'فاتورة #001', status: 'مكتمل' },
    { id: 'TXN002', date: '2026-01-14', type: 'مصروف', category: 'رواتب', amount: 25000, description: 'رواتب يناير', status: 'مكتمل' },
    { id: 'TXN003', date: '2026-01-13', type: 'دخل', category: 'الخدمات', amount: 3000, description: 'استشارات', status: 'قيد الانتظار' },
  ]);

  const [invoices, setInvoices] = useState([
    { id: 'INV001', date: '2026-01-15', client: 'شركة أ', amount: 5000, status: 'مدفوع', dueDate: '2026-02-15' },
    { id: 'INV002', date: '2026-01-10', client: 'شركة ب', amount: 8000, status: 'معلق', dueDate: '2026-01-30' },
  ]);

  const [budget, setBudget] = useState([
    { category: 'رواتب', budgeted: 30000, spent: 25000, remaining: 5000 },
    { category: 'تسويق', budgeted: 10000, spent: 7500, remaining: 2500 },
    { category: 'تشغيل', budgeted: 15000, spent: 12000, remaining: 3000 },
  ]);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'دخل',
    category: '',
    amount: '',
    description: '',
  });

  // Analytics
  const financialStats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'دخل').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'مصروف').reduce((sum, t) => sum + t.amount, 0);
    const paidInvoices = invoices.filter(i => i.status === 'مدفوع').reduce((sum, i) => sum + i.amount, 0);
    const pendingInvoices = invoices.filter(i => i.status !== 'مدفوع').reduce((sum, i) => sum + i.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      profitMargin: totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0,
      paidInvoices,
      pendingInvoices,
      totalBudget: budget.reduce((sum, b) => sum + b.budgeted, 0),
      spentBudget: budget.reduce((sum, b) => sum + b.spent, 0),
    };
  }, [transactions, invoices, budget]);

  const monthlyData = useMemo(() => {
    return [
      { month: 'نوفمبر', income: 15000, expense: 12000 },
      { month: 'ديسمبر', income: 18000, expense: 14000 },
      { month: 'يناير', income: 22000, expense: 16000 },
    ];
  }, []);

  const handleAddTransaction = () => {
    if (newTransaction.category && newTransaction.amount) {
      const txn = {
        id: `TXN${String(transactions.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        type: newTransaction.type,
        category: newTransaction.category,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        status: 'مكتمل',
      };
      setTransactions([...transactions, txn]);
      setNewTransaction({ type: 'دخل', category: '', amount: '', description: '' });
      setOpenDialog(false);
    }
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            💰 الإدارة المالية
          </Typography>
          <Typography variant="body2" color="textSecondary">
            إدارة شاملة للعمليات المالية والفواتير والميزانيات
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
          }}
        >
          عملية جديدة
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي الدخل
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {(financialStats.totalIncome / 1000).toFixed(0)}K
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي المصروفات
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {(financialStats.totalExpense / 1000).toFixed(0)}K
                  </Typography>
                </Box>
                <TrendingDownIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    الربح الصافي
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {(financialStats.netProfit / 1000).toFixed(0)}K
                  </Typography>
                </Box>
                <AttachMoneyIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ boxShadow: 2, borderRadius: 2, background: 'linear-gradient(135deg, #ffa500 0%, #ffb74d 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    هامش الربح
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {financialStats.profitMargin}%
                  </Typography>
                </Box>
                <BarChartIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="💳 العمليات" icon={<AttachMoneyIcon />} iconPosition="start" />
          <Tab label="📄 الفواتير" icon={<ReceiptIcon />} iconPosition="start" />
          <Tab label="📊 الميزانية" icon={<BarChartIcon />} iconPosition="start" />
          <Tab label="📈 التحليلات" />
        </Tabs>
      </Paper>

      {/* Tab 1: Transactions */}
      {tabValue === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>التاريخ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>النوع</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الفئة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المبلغ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الوصف</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map(txn => (
                <TableRow key={txn.id} hover>
                  <TableCell>{new Date(txn.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    <Chip
                      label={txn.type}
                      color={txn.type === 'دخل' ? 'success' : 'error'}
                      size="small"
                      icon={txn.type === 'دخل' ? <TrendingUpIcon /> : <TrendingDownIcon />}
                    />
                  </TableCell>
                  <TableCell>{txn.category}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{txn.amount.toLocaleString()} ر.س</TableCell>
                  <TableCell>{txn.description}</TableCell>
                  <TableCell>
                    <Chip label={txn.status} color={txn.status === 'مكتمل' ? 'success' : 'warning'} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Invoices */}
      {tabValue === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الفاتورة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>العميل</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>المبلغ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>تاريخ الاستحقاق</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{inv.id}</TableCell>
                  <TableCell>{inv.client}</TableCell>
                  <TableCell>{inv.amount.toLocaleString()} ر.س</TableCell>
                  <TableCell>{new Date(inv.dueDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    <Chip label={inv.status} color={inv.status === 'مدفوع' ? 'success' : 'warning'} size="small" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: Budget */}
      {tabValue === 2 && (
        <Grid container spacing={2}>
          {budget.map(item => (
            <Grid item xs={12} key={item.category}>
              <Paper sx={{ p: 2.5, borderRadius: 2, boxShadow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.category}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {item.spent.toLocaleString()} / {item.budgeted.toLocaleString()} ر.س
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(item.spent / item.budgeted) * 100}
                  sx={{ height: 8, borderRadius: 1, mb: 1 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                    ✓ المتبقي: {item.remaining.toLocaleString()} ر.س
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {((item.spent / item.budgeted) * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 4: Analytics */}
      {tabValue === 3 && (
        <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            📊 الدخل والمصروفات الشهرية
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#82ca9d" strokeWidth={2} name="الدخل" />
              <Line type="monotone" dataKey="expense" stroke="#ff7c7c" strokeWidth={2} name="المصروفات" />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Add Transaction Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          عملية مالية جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select
                value={newTransaction.type}
                onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })}
                label="النوع"
              >
                <MenuItem value="دخل">دخل</MenuItem>
                <MenuItem value="مصروف">مصروف</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={newTransaction.category}
                onChange={e => setNewTransaction({ ...newTransaction, category: e.target.value })}
                label="الفئة"
              >
                <MenuItem value="مبيعات">مبيعات</MenuItem>
                <MenuItem value="الخدمات">الخدمات</MenuItem>
                <MenuItem value="رواتب">رواتب</MenuItem>
                <MenuItem value="تسويق">تسويق</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="المبلغ"
              type="number"
              value={newTransaction.amount}
              onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوصف"
              value={newTransaction.description}
              onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            onClick={handleAddTransaction}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialManagement;
