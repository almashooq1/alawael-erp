import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  AccountBalance as AccountIcon,
  TrendingUp,
  TrendingDown,
  Receipt as InvoiceIcon,
  MoneyOff as ExpenseIcon,
  AccountBalanceWallet as WalletIcon,
  Assessment as ReportIcon,
  Warning as WarningIcon,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
  <Card
    sx={{
      borderRadius: '20px',
      border: '1px solid rgba(0,0,0,0.04)',
      height: '100%',
      overflow: 'hidden',
      boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
      transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' },
    }}
  >
    <Box sx={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
    <CardContent sx={{ p: '20px 24px !important' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography
            variant="caption"
            sx={{ color: neutralColors.textSecondary, fontWeight: 600, letterSpacing: 0.5 }}
          >
            {title}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              mt: 0.5,
              mb: 0.5,
              lineHeight: 1.2,
              color: neutralColors.textPrimary,
            }}
          >
            {value}
          </Typography>
          {subtitle && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend === 'up' ? (
                <ArrowUpward sx={{ fontSize: 14, color: statusColors.success }} />
              ) : trend === 'down' ? (
                <ArrowDownward sx={{ fontSize: 14, color: statusColors.error }} />
              ) : null}
              <Typography
                variant="caption"
                sx={{
                  color: trend === 'up' ? statusColors.success : statusColors.error,
                  fontWeight: 600,
                }}
              >
                {subtitle}
              </Typography>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '16px',
            bgcolor: `${color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${color}20`,
          }}
        >
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const AccountingDashboard = () => {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const d = await accountingService.getDashboard();
        setData(d);
      } catch (err) {
        logger.error('Accounting dashboard error:', err);
        setError('حدث خطأ في تحميل البيانات المالية');
        showSnackbar('حدث خطأ في تحميل لوحة المحاسبة', 'error');
      }
    };
    load();
  }, [showSnackbar]);

  if (error)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );

  if (!data)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل النظام المحاسبي...
        </Typography>
      </Container>
    );

  const s = data.summary || data;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
              <AccountIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={700}>
                النظام المحاسبي
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                إدارة الحسابات والقيود والفواتير والتقارير المالية
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="إجمالي الإيرادات"
            value={`${(s.totalRevenue || 0).toLocaleString()} ر.س`}
            icon={<TrendingUp sx={{ color: statusColors.success }} />}
            color={statusColors.success}
            subtitle="+12% عن الشهر السابق"
            trend="up"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="إجمالي المصروفات"
            value={`${(s.totalExpenses || 0).toLocaleString()} ر.س`}
            icon={<TrendingDown sx={{ color: statusColors.error }} />}
            color={statusColors.error}
            subtitle="+5% عن الشهر السابق"
            trend="up"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="صافي الربح"
            value={`${(s.netIncome || 0).toLocaleString()} ر.س`}
            icon={<WalletIcon sx={{ color: brandColors.primary }} />}
            color={brandColors.primary}
            subtitle="+18% عن الشهر السابق"
            trend="up"
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="الرصيد النقدي"
            value={`${(s.cashBalance || 0).toLocaleString()} ر.س`}
            icon={<AccountIcon sx={{ color: statusColors.info }} />}
            color={statusColors.info}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="إجمالي الأصول"
            value={`${(s.totalAssets || 0).toLocaleString()} ر.س`}
            icon={<ReportIcon sx={{ color: brandColors.accentTeal }} />}
            color={brandColors.accentTeal}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="الذمم المدينة"
            value={`${(s.accountsReceivable || 0).toLocaleString()} ر.س`}
            icon={<InvoiceIcon sx={{ color: statusColors.warning }} />}
            color={statusColors.warning}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="الذمم الدائنة"
            value={`${(s.accountsPayable || 0).toLocaleString()} ر.س`}
            icon={<ExpenseIcon sx={{ color: statusColors.error }} />}
            color={statusColors.error}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={3}>
          <StatCard
            title="فواتير متأخرة"
            value={s.overdueInvoices || 0}
            icon={<WarningIcon sx={{ color: statusColors.error }} />}
            color={statusColors.error}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue by Month */}
        <Grid item xs={12} md={7}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              height: '100%',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              transition: 'all 0.3s',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: '24px !important' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: 'rgba(16,185,129,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TrendingUp sx={{ fontSize: 22, color: statusColors.success }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} fontSize="1rem">
                    الإيرادات الشهرية
                  </Typography>
                </Box>
                <Chip
                  label="سنوي"
                  size="small"
                  variant="outlined"
                  sx={{ borderRadius: '8px', fontWeight: 500 }}
                />
              </Box>
              {data.revenueByMonth?.map((item, i) => (
                <Box
                  key={i}
                  sx={{
                    mb: 2.5,
                    p: 1.5,
                    borderRadius: '12px',
                    bgcolor: 'rgba(0,0,0,0.01)',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.025)' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {item.month}
                    </Typography>
                    <Chip
                      label={`${item.amount?.toLocaleString()} ر.س`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(16,185,129,0.1)',
                        color: '#059669',
                        fontWeight: 700,
                        borderRadius: '8px',
                        height: 24,
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(
                      (item.amount /
                        (Math.max(...(data.revenueByMonth || []).map(r => r.amount)) || 1)) *
                        100,
                      100
                    )}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(0,0,0,0.04)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: 'linear-gradient(90deg, #10b981, #34d399)',
                      },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Expenses by Category */}
        <Grid item xs={12} md={5}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              height: '100%',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              transition: 'all 0.3s',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: '24px !important' }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: 'rgba(239,68,68,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ExpenseIcon sx={{ fontSize: 22, color: statusColors.error }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} fontSize="1rem">
                    المصروفات حسب الفئة
                  </Typography>
                </Box>
              </Box>
              {data.expensesByCategory?.map((cat, i) => (
                <Box
                  key={i}
                  sx={{
                    mb: 2.5,
                    p: 1.5,
                    borderRadius: '12px',
                    bgcolor: 'rgba(0,0,0,0.01)',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.025)' },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {cat.category}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={`${cat.percentage}%`}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(239,68,68,0.08)',
                          color: '#DC2626',
                          fontWeight: 700,
                          fontSize: '11px',
                          borderRadius: '8px',
                          height: 22,
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: '#DC2626', fontSize: '13px' }}
                      >
                        {cat.amount?.toLocaleString()} ر.س
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={cat.percentage}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: 'rgba(0,0,0,0.04)',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 3,
                        background: 'linear-gradient(90deg, #ef4444, #f87171)',
                      },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              transition: 'all 0.3s',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: '24px !important' }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 3,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: 'rgba(99,102,241,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <InvoiceIcon sx={{ fontSize: 22, color: '#6366f1' }} />
                  </Box>
                  <Typography variant="h6" fontWeight={700} fontSize="1rem">
                    آخر المعاملات
                  </Typography>
                </Box>
                <Chip
                  label="عرض الكل"
                  size="small"
                  clickable
                  onClick={() => navigate('/accounting/journal-entries')}
                  sx={{
                    bgcolor: 'rgba(99,102,241,0.08)',
                    color: '#6366f1',
                    fontWeight: 600,
                    borderRadius: '8px',
                  }}
                />
              </Box>
              <TableContainer>
                <Table
                  size="small"
                  sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(0,0,0,0.06)', py: 1.5 } }}
                >
                  <TableHead>
                    <TableRow
                      sx={{
                        '& .MuiTableCell-head': {
                          fontWeight: 700,
                          color: 'text.secondary',
                          fontSize: '12px',
                          letterSpacing: 0.5,
                          bgcolor: 'rgba(0,0,0,0.02)',
                        },
                      }}
                    >
                      <TableCell>التاريخ</TableCell>
                      <TableCell>الوصف</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell align="left">المبلغ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentTransactions?.map(tx => (
                      <TableRow
                        key={tx.id}
                        sx={{ transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.015)' } }}
                      >
                        <TableCell>
                          <Typography
                            variant="body2"
                            fontWeight={600}
                            sx={{ fontFamily: 'monospace', fontSize: '13px' }}
                          >
                            {tx.date}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{tx.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.type === 'income' ? 'إيراد' : 'مصروف'}
                            size="small"
                            sx={{
                              bgcolor:
                                tx.type === 'income'
                                  ? 'rgba(16,185,129,0.1)'
                                  : 'rgba(239,68,68,0.1)',
                              color: tx.type === 'income' ? '#059669' : '#DC2626',
                              fontWeight: 600,
                              borderRadius: '8px',
                            }}
                          />
                        </TableCell>
                        <TableCell align="left">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ color: tx.type === 'income' ? '#059669' : '#DC2626' }}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {tx.amount?.toLocaleString()} ر.س
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Navigation */}
        <Grid item xs={12}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
            }}
          >
            <CardContent sx={{ p: '24px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '12px',
                    bgcolor: 'rgba(139,92,246,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ReportIcon sx={{ fontSize: 22, color: '#8b5cf6' }} />
                </Box>
                <Typography variant="h6" fontWeight={700} fontSize="1rem">
                  الوصول السريع
                </Typography>
              </Box>
              <Grid container spacing={2}>
                {[
                  {
                    label: 'دليل الحسابات',
                    path: '/accounting/chart-of-accounts',
                    icon: <AccountIcon />,
                    color: brandColors.primary,
                    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                  {
                    label: 'القيود اليومية',
                    path: '/accounting/journal-entries',
                    icon: <ReportIcon />,
                    color: statusColors.info,
                    gradient: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  },
                  {
                    label: 'الفواتير',
                    path: '/accounting/invoices',
                    icon: <InvoiceIcon />,
                    color: statusColors.success,
                    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  },
                  {
                    label: 'المصروفات',
                    path: '/accounting/expenses',
                    icon: <ExpenseIcon />,
                    color: statusColors.error,
                    gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  },
                  {
                    label: 'الموازنات',
                    path: '/accounting/budgets',
                    icon: <WalletIcon />,
                    color: statusColors.warning,
                    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                  },
                  {
                    label: 'التقارير المالية',
                    path: '/accounting/reports',
                    icon: <ReportIcon />,
                    color: brandColors.accentTeal,
                    gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                  },
                ].map((item, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        p: 2.5,
                        borderRadius: '16px',
                        border: '1px solid rgba(0,0,0,0.04)',
                        transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
                        '&:hover': {
                          borderColor: `${item.color}40`,
                          transform: 'translateY(-4px)',
                          boxShadow: `0 8px 24px ${item.color}25`,
                        },
                      }}
                      onClick={() => navigate(item.path)}
                    >
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '14px',
                          background: item.gradient,
                          mx: 'auto',
                          mb: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          boxShadow: `0 4px 14px ${item.color}30`,
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Typography variant="body2" fontWeight={700} fontSize="13px">
                        {item.label}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AccountingDashboard;
