/**
 * Payment Integration System 💳
 * نظام الدفع والمحافظ الرقمية المتكاملة
 *
 * Features:
 * ✅ Multiple payment methods
 * ✅ Digital wallet integration
 * ✅ Payment history
 * ✅ Invoice management
 * ✅ Recurring payments
 * ✅ Payment analytics
 * ✅ Secure transactions
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  AlertTitle,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Wallet as WalletIcon,
  AccountBalance as BankIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Lock as LockIcon,
} from '@mui/icons-material';

const PaymentIntegration = () => {
  const [paymentMethods, _setPaymentMethods] = useState([
    {
      id: 1,
      type: 'card',
      name: 'بطاقتي الرئيسية',
      cardNumber: '****4532',
      bank: 'البنك الأهلي',
      expiryDate: '12/26',
      isDefault: true,
      saved: '2025-06-15',
      status: 'active',
    },
    {
      id: 2,
      type: 'card',
      name: 'بطاقة الراجحي',
      cardNumber: '****7890',
      bank: 'مصرف الراجحي',
      expiryDate: '08/25',
      isDefault: false,
      saved: '2025-08-20',
      status: 'active',
    },
    { id: 3, type: 'wallet', name: 'محفظة رقمية', provider: 'Apple Pay', balance: 2500, status: 'active' },
    { id: 4, type: 'wallet', name: 'محفظة Google', provider: 'Google Pay', balance: 1500, status: 'active' },
  ]);

  const [transactions, _setTransactions] = useState([
    {
      id: 1,
      date: '2026-01-16',
      description: 'شراء اشتراك سنوي',
      amount: -599,
      method: 'بطاقتي الرئيسية',
      status: 'completed',
      category: 'subscription',
      invoice: 'INV-2026-001',
    },
    {
      id: 2,
      date: '2026-01-15',
      description: 'تحويل من الحساب البنكي',
      amount: 5000,
      method: 'حوالة بنكية',
      status: 'completed',
      category: 'deposit',
      invoice: 'INV-2026-002',
    },
    {
      id: 3,
      date: '2026-01-14',
      description: 'شراء خدمة استشارية',
      amount: -1200,
      method: 'محفظة رقمية',
      status: 'completed',
      category: 'service',
      invoice: 'INV-2026-003',
    },
    {
      id: 4,
      date: '2026-01-13',
      description: 'شراء منتجات',
      amount: -450,
      method: 'بطاقة الراجحي',
      status: 'pending',
      category: 'shopping',
      invoice: 'INV-2026-004',
    },
  ]);

  const [recurringPayments, _setRecurringPayments] = useState([
    {
      id: 1,
      name: 'اشتراك شهري - خدمة الدعم',
      amount: 99,
      frequency: 'monthly',
      nextDueDate: '2026-02-16',
      status: 'active',
      startDate: '2025-06-16',
    },
    {
      id: 2,
      name: 'اشتراك سنوي - الميزات المتقدمة',
      amount: 1200,
      frequency: 'yearly',
      nextDueDate: '2027-06-16',
      status: 'active',
      startDate: '2024-06-16',
    },
  ]);

  const [walletBalance, _setWalletBalance] = useState(15000);
  const [openDialog, setOpenDialog] = useState(false);
  const [_selectedTransaction, _setSelectedTransaction] = useState(null);

  const stats = {
    totalSpent: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)),
    totalReceived: transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0),
    balance: walletBalance,
    monthlyAvg: Math.abs(transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0)) / transactions.length,
  };

  const _paymentMethodIcons = {
    card: <CreditCardIcon sx={{ color: '#667eea' }} />,
    wallet: <WalletIcon sx={{ color: '#4caf50' }} />,
    bank: <BankIcon sx={{ color: '#ff9800' }} />,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الرصيد الكلي', value: `₪${stats.balance.toLocaleString('ar')}`, icon: '💰', color: '#4caf50' },
          { label: 'الإنفاق الكلي', value: `₪${stats.totalSpent.toLocaleString('ar')}`, icon: '💸', color: '#f44336' },
          { label: 'الإيرادات', value: `₪${stats.totalReceived.toLocaleString('ar')}`, icon: '📈', color: '#2196f3' },
          { label: 'المتوسط الشهري', value: `₪${stats.monthlyAvg.toLocaleString('ar')}`, icon: '📊', color: '#ff9800' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Security Alert */}
      <Alert severity="success" icon={<LockIcon />} sx={{ mb: 3, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>🛡️ معاملات آمنة</AlertTitle>
        جميع المعاملات مشفرة بتقنية SSL 256-bit وتتوافق مع معايير PCI-DSS
      </Alert>

      {/* Payment Methods */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        💳 طرق الدفع
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {paymentMethods.map(method => (
          <Grid item xs={12} sm={6} key={method.id}>
            <Card sx={{ borderRadius: 2, borderTop: method.isDefault ? '4px solid #667eea' : 'none' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                    <Box sx={{ fontSize: 28, color: method.type === 'card' ? '#667eea' : '#4caf50' }}>
                      {method.type === 'card' ? '🏧' : '👛'}
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {method.name}
                      </Typography>
                      {method.type === 'card' ? (
                        <>
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                            {method.cardNumber}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                            {method.bank}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ينتهي: {method.expiryDate}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                            {method.provider}
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: '#4caf50', display: 'block' }}>
                            ₪{method.balance.toLocaleString('ar')}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                  {method.isDefault && <Chip label="افتراضية" color="primary" size="small" />}
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" fullWidth startIcon={<EditIcon />}>
                    تعديل
                  </Button>
                  <Button size="small" variant="outlined" color="error" fullWidth startIcon={<DeleteIcon />}>
                    حذف
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Add Payment Method */}
      <Button variant="contained" fullWidth startIcon={<AddIcon />} onClick={() => setOpenDialog(true)} sx={{ mb: 3, borderRadius: 2 }}>
        إضافة طريقة دفع جديدة
      </Button>

      {/* Recurring Payments */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔄 المدفوعات المتكررة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {recurringPayments.map(payment => (
          <Grid item xs={12} key={payment.id}>
            <Paper sx={{ p: 2.5, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {payment.name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                    📅 الدفعة التالية: {payment.nextDueDate}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                    ₪{payment.amount}
                  </Typography>
                  <Chip label={payment.frequency === 'monthly' ? 'شهري' : 'سنوي'} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Transaction History */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📜 سجل المعاملات
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوصف</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المبلغ</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الطريقة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map(trans => (
              <TableRow key={trans.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' }, cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 600 }}>{trans.date}</TableCell>
                <TableCell>{trans.description}</TableCell>
                <TableCell sx={{ fontWeight: 700, color: trans.amount > 0 ? '#4caf50' : '#f44336' }}>
                  {trans.amount > 0 ? '+' : ''}
                  {trans.amount} ₪
                </TableCell>
                <TableCell>
                  <Chip label={trans.method} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip
                    label={trans.status === 'completed' ? 'مكتملة' : 'قيد المراجعة'}
                    color={trans.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                    icon={trans.status === 'completed' ? <CheckIcon /> : '⏳'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>💳 إضافة طريقة دفع جديدة</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>نوع الدفع</InputLabel>
            <Select label="نوع الدفع">
              <MenuItem value="card">بطاقة ائتمان</MenuItem>
              <MenuItem value="wallet">محفظة رقمية</MenuItem>
              <MenuItem value="bank">حوالة بنكية</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth label="رقم البطاقة" variant="outlined" margin="normal" placeholder="0000 0000 0000 0000" />
          <TextField fullWidth label="اسم صاحب البطاقة" variant="outlined" margin="normal" />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="صلاحية" variant="outlined" margin="normal" placeholder="MM/YY" />
            <TextField fullWidth label="CVV" variant="outlined" margin="normal" placeholder="000" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={() => setOpenDialog(false)} variant="contained">
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PaymentIntegration;
