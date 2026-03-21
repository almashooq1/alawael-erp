/**
 * BI Financial Analytics — التحليلات المالية المتقدمة
 *
 * Revenue/expense trends, cashflow analysis, profit margins,
 * monthly comparisons, and financial KPIs.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  IconButton,
  Tooltip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  MoneyOff,
  Refresh,
  AttachMoney,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartTooltip,
  Legend,
  ComposedChart,
} from 'recharts';
import { motion } from 'framer-motion';
import { getFinanceAnalytics, getCashflow } from '../../services/biDashboard.service';

function formatCurrency(amount) {
  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(
    amount || 0
  );
}

// ── Finance KPI Card ──────────────────────────────────────────────
function FinanceCard({ title, value, change, icon: Icon, color, format = 'currency' }) {
  const theme = useTheme();
  const isPositive = parseFloat(change) >= 0;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          height: '100%',
          background: `linear-gradient(135deg, ${alpha(color, 0.05)} 0%, transparent 100%)`,
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              {title}
            </Typography>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon sx={{ color, fontSize: 20 }} />
            </Box>
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {format === 'currency' ? formatCurrency(value) : `${value}%`}
          </Typography>
          {change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              {isPositive ? (
                <TrendingUp fontSize="small" sx={{ color: theme.palette.success.main }} />
              ) : (
                <TrendingDown fontSize="small" sx={{ color: theme.palette.error.main }} />
              )}
              <Typography
                variant="caption"
                fontWeight={600}
                color={isPositive ? 'success.main' : 'error.main'}
              >
                {change > 0 ? '+' : ''}
                {change}%
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function BIFinanceAnalytics() {
  const theme = useTheme();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [finance, setFinance] = useState(null);
  const [cashflow, setCashflow] = useState([]);
  const [error, setError] = useState(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [finData, cfData] = await Promise.all([
        getFinanceAnalytics({ year }),
        getCashflow(12),
      ]);
      setFinance(finData);
      setCashflow(cfData.cashflow || []);
    } catch {
      setError('خطأ في تحميل التحليلات المالية');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  const totals = finance?.totals || {};
  const monthly = finance?.monthly || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            التحليلات المالية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تقارير الإيرادات والمصروفات والتدفق النقدي
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup value={year} exclusive onChange={(_, v) => v && setYear(v)} size="small">
            {yearOptions.map((y) => (
              <ToggleButton key={y} value={y}>
                {y}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <FinanceCard
            title="إجمالي الإيرادات"
            value={totals.revenue}
            icon={AccountBalance}
            color="#4CAF50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FinanceCard
            title="إجمالي المصروفات"
            value={totals.expenses}
            icon={MoneyOff}
            color="#F44336"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FinanceCard
            title="صافي الدخل"
            value={totals.netIncome}
            icon={AttachMoney}
            color={totals.netIncome >= 0 ? '#2196F3' : '#F44336'}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FinanceCard
            title="هامش الربح"
            value={finance?.profitMargin || 0}
            icon={Receipt}
            color="#FF9800"
            format="percentage"
          />
        </Grid>
      </Grid>

      {/* Revenue vs Expenses Chart */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              الإيرادات مقابل المصروفات — {year}
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip formatter={(val) => formatCurrency(val)} />
                <Legend />
                <Bar dataKey="revenue" fill="#4CAF50" name="الإيرادات" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#F44336" name="المصروفات" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="netIncome" stroke="#2196F3" strokeWidth={3} name="صافي الدخل" dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Cashflow */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              التدفق النقدي
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={cashflow}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F44336" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#F44336" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <RechartTooltip formatter={(val) => formatCurrency(val)} />
                <Area type="monotone" dataKey="inflow" stroke="#4CAF50" fill="url(#inflowGrad)" name="وارد" />
                <Area type="monotone" dataKey="outflow" stroke="#F44336" fill="url(#outflowGrad)" name="صادر" />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Monthly Detail Table */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h6" fontWeight={600}>
            التفاصيل الشهرية — {year}
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 600 }}>الشهر</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">الإيرادات</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">المصروفات</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">صافي الدخل</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="right">الفواتير</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthly.map((row, idx) => (
                <TableRow key={idx} hover>
                  <TableCell>{row.month}</TableCell>
                  <TableCell align="right" sx={{ color: theme.palette.success.main, fontWeight: 500 }}>
                    {formatCurrency(row.revenue)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: theme.palette.error.main, fontWeight: 500 }}>
                    {formatCurrency(row.expenses)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: row.netIncome >= 0 ? theme.palette.info.main : theme.palette.error.main, fontWeight: 600 }}
                  >
                    {formatCurrency(row.netIncome)}
                  </TableCell>
                  <TableCell align="right">{row.invoices}</TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <TableCell sx={{ fontWeight: 700 }}>الإجمالي</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  {formatCurrency(totals.revenue)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: theme.palette.error.main }}>
                  {formatCurrency(totals.expenses)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {formatCurrency(totals.netIncome)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  {totals.invoices}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
