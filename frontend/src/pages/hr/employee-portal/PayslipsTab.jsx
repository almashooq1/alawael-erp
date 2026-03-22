import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Print as PrintIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendIcon,
  Receipt as ReceiptIcon,
} from '@mui/icons-material';

const MONTH_NAMES = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const fmt = (v) => Number(v || 0).toLocaleString('ar-SA');

/**
 * PayslipsTab – Payroll summary + payslips list with view / print actions.
 */
export default function PayslipsTab({
  payslips = [],
  payrollSummary = {},
  onViewPayslip,
  onPrint,
}) {
  const summaryCards = [
    {
      icon: <WalletIcon fontSize="large" />,
      title: 'آخر راتب صافي',
      value: payrollSummary.latest ? `${fmt(payrollSummary.latest)} ر.س` : '—',
      color: '#2e7d32',
    },
    {
      icon: <TrendIcon fontSize="large" />,
      title: 'متوسط الصافي',
      value: payrollSummary.avgNet ? `${fmt(payrollSummary.avgNet)} ر.س` : '—',
      color: '#1565c0',
    },
    {
      icon: <ReceiptIcon fontSize="large" />,
      title: 'عدد الكشوفات',
      value: payrollSummary.monthCount ?? payslips.length,
      color: '#7b1fa2',
    },
  ];

  return (
    <Box>
      {/* ─── Summary Cards ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {summaryCards.map((s, i) => (
          <Grid item xs={12} sm={4} key={i}>
            <Card variant="outlined" sx={{ borderColor: s.color, borderWidth: 1.5 }}>
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  pb: '12px !important',
                }}
              >
                <Box sx={{ color: s.color }}>{s.icon}</Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    {s.title}
                  </Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {s.value}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ─── Payslips Table ─── */}
      <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
        كشوفات الرواتب
      </Typography>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>الشهر</TableCell>
              <TableCell align="right">الأساسي</TableCell>
              <TableCell align="right">البدلات</TableCell>
              <TableCell align="right">الخصومات</TableCell>
              <TableCell align="right">الصافي</TableCell>
              <TableCell align="center">إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    لا توجد كشوفات
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>
                    <Chip
                      label={`${MONTH_NAMES[p.month] || p.month} ${p.year}`}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{fmt(p.basic)}</TableCell>
                  <TableCell align="right" sx={{ color: 'success.main' }}>
                    +{fmt(p.allowances)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'error.main' }}>
                    -{fmt(p.deductions)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight={700}>{fmt(p.net)} ر.س</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onViewPayslip?.(p)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="طباعة">
                      <IconButton
                        size="small"
                        onClick={() => onPrint?.(p)}
                      >
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
