/**
 * 💰 FinanceOverview — Financial Summary & Revenue Charts
 * نظرة مالية شاملة مع رسوم بيانية للإيرادات والمصروفات
 */

import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, Grid, Chip, useTheme, Tooltip as MuiTooltip } from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';
import MoneyOffIcon from '@mui/icons-material/MoneyOff';
import { formatCurrency } from 'services/dashboardService';
import { FinanceChartTooltip } from './shared/ChartTooltip';
import { chartColors, brandColors, statusColors, gradients, neutralColors } from 'theme/palette';

const EXPENSE_COLORS = chartColors.expense;

/* ── Animated Currency Value ────────────────────────────── */
const useAnimatedValue = (end, duration = 1000) => {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  const prevEnd = useRef(end);

  useEffect(() => {
    // Reset when value changes so counter re-animates
    if (prevEnd.current !== end) {
      started.current = false;
      prevEnd.current = end;
    }
    const numEnd = typeof end === 'number' ? end : parseFloat(String(end).replace(/[^0-9.-]/g, '')) || 0;
    if (numEnd === 0) { setVal(0); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setVal(Math.round(numEnd * ease));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { val, ref };
};

const FinanceCard = ({ icon, label, value, trend, color, bg, index = 0 }) => {
  const rawNum = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.-]/g, '')) || 0;
  const isCurrency = typeof value === 'string' && (value.includes('ر.س') || value.includes('SAR'));
  const { val: anim, ref } = useAnimatedValue(rawNum, 1200);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      whileHover={{ y: -3, scale: 1.02 }}
    >
      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          background: bg || 'rgba(102,126,234,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          transition: 'all 0.3s',
          cursor: 'default',
          '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.08)' },
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            background: color || gradients.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {label}
          </Typography>
          <MuiTooltip title={value} arrow placement="top">
            <Typography variant="body1" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              {isCurrency ? formatCurrency(anim) : typeof value === 'number' ? anim.toLocaleString('ar-SA') : value}
            </Typography>
          </MuiTooltip>
        </Box>
        {trend !== undefined && trend !== 0 && (
          <Chip
            icon={
              trend >= 0
                ? <TrendingUpIcon sx={{ fontSize: '14px !important' }} />
                : <TrendingDownIcon sx={{ fontSize: '14px !important' }} />
            }
            label={`${Math.abs(trend)}%`}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.7rem',
              height: 24,
              background: trend >= 0 ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)',
              color: trend >= 0 ? statusColors.success : statusColors.error,
              border: 'none',
            }}
          />
        )}
      </Box>
    </motion.div>
  );
};

/* CustomTooltip extracted to shared/ChartTooltip.jsx → FinanceChartTooltip */

const FinanceOverview = ({ finance = {}, charts = {}, delay = 0 }) => {
  const theme = useTheme();
  const axisColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.45)' : neutralColors.textMuted;
  const gridStroke = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const legendColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined;
  const revenueData = charts.revenueChart || [];
  const expenseData = charts.expenseCategories || [];
  const hasRevenueData = revenueData.length > 0 && revenueData.some(d => (d.revenue || 0) > 0);
  const _hasFinanceCards = finance.monthlyRevenue > 0 || finance.monthExpenses > 0 || finance.monthNetIncome > 0 || finance.pendingInvoices > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.3s',
          '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            النظرة المالية
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            ملخص الإيرادات والمصروفات والأرباح
          </Typography>
        </Box>

        {/* Finance KPI Cards */}
        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <FinanceCard
              icon={<AccountBalanceIcon />}
              label="إيرادات الشهر"
              value={formatCurrency(finance.monthlyRevenue)}
              trend={finance.revenueTrend}
              color={gradients.success}
              bg="rgba(67,233,123,0.06)"
              index={0}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FinanceCard
              icon={<MoneyOffIcon />}
              label="مصروفات الشهر"
              value={formatCurrency(finance.monthExpenses)}
              color={gradients.warning}
              bg="rgba(240,147,251,0.06)"
              index={1}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FinanceCard
              icon={<SavingsIcon />}
              label="صافي الربح"
              value={formatCurrency(finance.monthNetIncome)}
              color={gradients.primary}
              bg="rgba(102,126,234,0.06)"
              index={2}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <FinanceCard
              icon={<ReceiptLongIcon />}
              label="فواتير معلقة"
              value={finance.pendingInvoices || 0}
              color={gradients.orange}
              bg="rgba(255,179,71,0.06)"
              index={3}
            />
          </Grid>
        </Grid>

        {/* Charts Row */}
        <Grid container spacing={2.5}>
          {/* Revenue Trend Chart */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                اتجاه الإيرادات — آخر 6 أشهر
              </Typography>
            </Box>
            {hasRevenueData ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={brandColors.accentGreen} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={brandColors.accentGreen} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <Tooltip content={<FinanceChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="الإيرادات"
                  stroke={brandColors.accentGreen}
                  strokeWidth={3}
                  fill="url(#finRevGrad)"
                  dot={{ r: 4, fill: brandColors.accentGreen, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: brandColors.accentTeal }}
                />
              </AreaChart>
            </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.disabled">لا توجد بيانات إيرادات</Typography>
              </Box>
            )}
          </Grid>

          {/* Expense Categories Pie */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                توزيع المصروفات
              </Typography>
            </Box>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {expenseData.map((_, i) => (
                      <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<FinanceChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8, color: legendColor }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.disabled">
                  لا توجد بيانات مصروفات
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default React.memo(FinanceOverview);
