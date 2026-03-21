import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';
import WalletIcon from '@mui/icons-material/Wallet';
import ReportIcon from '@mui/icons-material/Report';
import WarningIcon from '@mui/icons-material/Warning';

const StatCard = ({ title, value, icon, color, subtitle, trend }) => (
  <Card
    sx={{
      borderRadius: 2.5,
      border: `1px solid ${surfaceColors.border}`,
      height: '100%',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' },
    }}
  >
    <CardContent sx={{ p: 2.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography
            variant="body2"
            sx={{ color: neutralColors.textSecondary, mb: 0.5, fontWeight: 500 }}
          >
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color: neutralColors.textPrimary }}>
            {value}
          </Typography>
          {subtitle && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {trend === 'up' ? (
                <ArrowUpward sx={{ fontSize: 14, color: statusColors.success }} />
              ) : trend === 'down' ? (
                <ArrowDownward sx={{ fontSize: 14, color: statusColors.error }} />
              ) : null}
              <Typography
                variant="caption"
                sx={{ color: trend === 'up' ? statusColors.success : statusColors.error }}
              >
                {subtitle}
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}15`, width: 48, height: 48 }}>{icon}</Avatar>
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
            sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, height: '100%' }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                الإيرادات الشهرية
              </Typography>
              {data.revenueByMonth?.map((item, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {item.month}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: statusColors.success }}
                    >
                      {item.amount?.toLocaleString()} ر.س
                    </Typography>
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
                      height: 10,
                      borderRadius: 5,
                      bgcolor: `${statusColors.success}15`,
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                        background: gradients.primary,
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
            sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}`, height: '100%' }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                المصروفات حسب الفئة
              </Typography>
              {data.expensesByCategory?.map((cat, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {cat.category}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip
                        label={`${cat.percentage}%`}
                        size="small"
                        sx={{
                          bgcolor: `${statusColors.error}15`,
                          color: statusColors.error,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                        }}
                      />
                      <Typography variant="body2" fontWeight={600}>
                        {cat.amount?.toLocaleString()} ر.س
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={cat.percentage}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: `${statusColors.error}12`,
                      '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: statusColors.error },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Transactions */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <CardContent>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  آخر المعاملات
                </Typography>
                <Chip
                  label="عرض الكل"
                  size="small"
                  clickable
                  onClick={() => navigate('/accounting/journal-entries')}
                  sx={{
                    bgcolor: `${brandColors.primary}15`,
                    color: brandColors.primary,
                    fontWeight: 600,
                  }}
                />
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الوصف</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="left">
                        المبلغ
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentTransactions?.map(tx => (
                      <TableRow key={tx.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {tx.date}
                          </Typography>
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Chip
                            label={tx.type === 'income' ? 'إيراد' : 'مصروف'}
                            size="small"
                            sx={{
                              bgcolor:
                                tx.type === 'income'
                                  ? `${statusColors.success}15`
                                  : `${statusColors.error}15`,
                              color:
                                tx.type === 'income' ? statusColors.success : statusColors.error,
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="left">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{
                              color:
                                tx.type === 'income' ? statusColors.success : statusColors.error,
                            }}
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
          <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                الوصول السريع
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {[
                  {
                    label: 'دليل الحسابات',
                    path: '/accounting/chart-of-accounts',
                    icon: <AccountIcon />,
                    color: brandColors.primary,
                  },
                  {
                    label: 'القيود اليومية',
                    path: '/accounting/journal-entries',
                    icon: <ReportIcon />,
                    color: statusColors.info,
                  },
                  {
                    label: 'الفواتير',
                    path: '/accounting/invoices',
                    icon: <InvoiceIcon />,
                    color: statusColors.success,
                  },
                  {
                    label: 'المصروفات',
                    path: '/accounting/expenses',
                    icon: <ExpenseIcon />,
                    color: statusColors.error,
                  },
                  {
                    label: 'الموازنات',
                    path: '/accounting/budgets',
                    icon: <WalletIcon />,
                    color: statusColors.warning,
                  },
                  {
                    label: 'التقارير المالية',
                    path: '/accounting/reports',
                    icon: <ReportIcon />,
                    color: brandColors.accentTeal,
                  },
                ].map((item, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <Card
                      sx={{
                        cursor: 'pointer',
                        textAlign: 'center',
                        p: 2,
                        borderRadius: 2,
                        border: `1px solid ${surfaceColors.border}`,
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: item.color,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 4px 12px ${item.color}30`,
                        },
                      }}
                      onClick={() => navigate(item.path)}
                    >
                      <Avatar sx={{ bgcolor: `${item.color}15`, mx: 'auto', mb: 1 }}>
                        {item.icon}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>
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
