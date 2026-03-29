import { useState, useEffect, useCallback } from 'react';
import { getToken } from '../../utils/tokenStorage';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  TextField,
  Button,
  Chip,} from '@mui/material';
import {
  TrendingUp,  Assessment,
  CalendarMonth,
  ArrowUpward,
  ArrowDownward,
} from '@mui/icons-material';
import { surfaceColors, neutralColors, brandColors } from 'theme/palette';

const API = process.env.REACT_APP_API_URL || '/api';

const ProfitLoss = () => {
  const [data, setData] = useState(null);
  const [comparative, setComparative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [showComparative, setShowComparative] = useState(false);

  const headers = { Authorization: `Bearer ${getToken()}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [plRes, compRes] = await Promise.all([
        fetch(`${API}/finance/pro/profit-loss?startDate=${startDate}&endDate=${endDate}`, {
          headers,
        }),
        fetch(`${API}/finance/pro/profit-loss/comparative`, { headers }),
      ]);
      const plJson = await plRes.json();
      const compJson = await compRes.json();
      if (plJson.success) setData(plJson.data);
      if (compJson.success) setComparative(compJson.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const SectionRow = ({ label, amount, bold, indent, color, isTotal }) => (
    <TableRow sx={{ bgcolor: isTotal ? `${brandColors.primary}08` : 'transparent' }}>
      <TableCell
        sx={{
          fontWeight: bold ? 800 : 400,
          pl: indent ? 4 : 2,
          fontSize: isTotal ? 15 : 14,
          color: color || 'inherit',
        }}
      >
        {label}
      </TableCell>
      <TableCell
        align="right"
        sx={{
          fontWeight: bold ? 800 : 600,
          fontSize: isTotal ? 15 : 14,
          color: color || (amount < 0 ? '#F44336' : 'inherit'),
        }}
      >
        {fc(amount)}
      </TableCell>
    </TableRow>
  );

  if (loading)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  if (!data) return null;

  const {
    revenue,
    costOfRevenue,
    grossProfit,
    operatingExpenses,
    operatingIncome,
    otherIncomeExpenses,
    incomeBeforeTax,
    incomeTax,
    zakatExpense,
    netIncome,
  } = data;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            قائمة الأرباح والخسائر
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Profit & Loss Statement - Income Statement
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            label="من"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            type="date"
            size="small"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            label="إلى"
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={fetchData}
            sx={{
              bgcolor: brandColors.primary,
              fontWeight: 700,
              '&:hover': { bgcolor: brandColors.primaryDark },
            }}
          >
            عرض
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          {
            label: 'إجمالي الإيرادات',
            value: fc(revenue.total),
            icon: <TrendingUp />,
            color: '#4CAF50',
          },
          {
            label: 'مجمل الربح',
            value: fc(grossProfit),
            sub: `${data.grossProfitMargin}%`,
            icon: <Assessment />,
            color: '#2196F3',
          },
          {
            label: 'الربح التشغيلي',
            value: fc(operatingIncome),
            icon: <TrendingUp />,
            color: '#FF9800',
          },
          {
            label: 'صافي الربح',
            value: fc(netIncome),
            sub: `${data.netProfitMargin}%`,
            icon: <TrendingUp />,
            color: netIncome >= 0 ? '#4CAF50' : '#F44336',
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              flex: 1,
              minWidth: 200,
              borderRadius: 2,
              border: `1px solid ${surfaceColors.border}`,
            }}
          >
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Box sx={{ color: item.color, mb: 0.5 }}>{item.icon}</Box>
              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>
                {item.value}
              </Typography>
              {item.sub && (
                <Chip size="small" label={`هامش ${item.sub}`} sx={{ mt: 0.5, fontWeight: 600 }} />
              )}
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* P&L Statement */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              p: 2.5,
              bgcolor: surfaceColors.card,
              borderBottom: `1px solid ${surfaceColors.border}`,
            }}
          >
            <Typography variant="h6" fontWeight={700}>
              <CalendarMonth sx={{ fontSize: 20, verticalAlign: 'middle', mr: 1 }} />
              قائمة الدخل للفترة من {new Date(startDate).toLocaleDateString('ar-SA')} إلى{' '}
              {new Date(endDate).toLocaleDateString('ar-SA')}
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: surfaceColors.card }}>
                  <TableCell sx={{ fontWeight: 700, width: '60%' }}>البند</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    المبلغ (ر.س)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Revenue */}
                <TableRow>
                  <TableCell
                    colSpan={2}
                    sx={{ fontWeight: 800, bgcolor: '#4CAF5008', color: '#4CAF50' }}
                  >
                    الإيرادات
                  </TableCell>
                </TableRow>
                {revenue.items.map((r, i) => (
                  <SectionRow key={i} label={r.accountName} amount={r.amount} indent />
                ))}
                <SectionRow
                  label="إجمالي الإيرادات"
                  amount={revenue.total}
                  bold
                  isTotal
                  color="#4CAF50"
                />

                <TableRow>
                  <TableCell colSpan={2} sx={{ p: 0.5 }} />
                </TableRow>

                {/* Cost of Revenue */}
                <TableRow>
                  <TableCell
                    colSpan={2}
                    sx={{ fontWeight: 800, bgcolor: '#F4433608', color: '#F44336' }}
                  >
                    تكلفة الإيرادات
                  </TableCell>
                </TableRow>
                {costOfRevenue.items.map((c, i) => (
                  <SectionRow key={i} label={c.accountName} amount={c.amount} indent />
                ))}
                <SectionRow
                  label="إجمالي تكلفة الإيرادات"
                  amount={costOfRevenue.total}
                  bold
                  isTotal
                  color="#F44336"
                />

                <SectionRow label="مجمل الربح" amount={grossProfit} bold isTotal color="#2196F3" />

                <TableRow>
                  <TableCell colSpan={2} sx={{ p: 0.5 }} />
                </TableRow>

                {/* Operating Expenses */}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: '#FF980008' }}>
                    المصاريف التشغيلية
                  </TableCell>
                </TableRow>
                <SectionRow label="رواتب وأجور" amount={operatingExpenses.salaries} indent />
                <SectionRow label="إيجارات" amount={operatingExpenses.rent} indent />
                <SectionRow label="خدمات ومرافق" amount={operatingExpenses.utilities} indent />
                <SectionRow label="إهلاك" amount={operatingExpenses.depreciation} indent />
                <SectionRow label="تسويق وإعلان" amount={operatingExpenses.marketing} indent />
                <SectionRow label="تأمين" amount={operatingExpenses.insurance} indent />
                <SectionRow
                  label="مصاريف إدارية"
                  amount={operatingExpenses.administrative}
                  indent
                />
                <SectionRow label="أتعاب مهنية" amount={operatingExpenses.professional} indent />
                <SectionRow label="مصاريف أخرى" amount={operatingExpenses.other} indent />
                <SectionRow
                  label="إجمالي المصاريف التشغيلية"
                  amount={operatingExpenses.total}
                  bold
                  isTotal
                />

                <SectionRow
                  label="الربح التشغيلي"
                  amount={operatingIncome}
                  bold
                  isTotal
                  color="#FF9800"
                />

                <TableRow>
                  <TableCell colSpan={2} sx={{ p: 0.5 }} />
                </TableRow>

                {/* Other Income/Expenses */}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontWeight: 800, bgcolor: '#9C27B008' }}>
                    إيرادات ومصاريف أخرى
                  </TableCell>
                </TableRow>
                <SectionRow
                  label="إيرادات فوائد"
                  amount={otherIncomeExpenses.interestIncome}
                  indent
                />
                <SectionRow
                  label="مصاريف فوائد"
                  amount={otherIncomeExpenses.interestExpense}
                  indent
                />
                <SectionRow
                  label="فروقات عملات"
                  amount={otherIncomeExpenses.foreignExchangeGainLoss}
                  indent
                />
                <SectionRow
                  label="صافي إيرادات/مصاريف أخرى"
                  amount={otherIncomeExpenses.total}
                  bold
                  isTotal
                />

                <SectionRow
                  label="الربح قبل الضريبة والزكاة"
                  amount={incomeBeforeTax}
                  bold
                  isTotal
                  color="#9C27B0"
                />

                <SectionRow label="ضريبة الدخل" amount={-incomeTax} indent />
                <SectionRow label="الزكاة" amount={-zakatExpense} indent />

                {/* Net Income */}
                <TableRow sx={{ bgcolor: netIncome >= 0 ? '#4CAF5012' : '#F4433612' }}>
                  <TableCell
                    sx={{
                      fontWeight: 900,
                      fontSize: 16,
                      color: netIncome >= 0 ? '#4CAF50' : '#F44336',
                    }}
                  >
                    {netIncome >= 0 ? '🟢' : '🔴'} صافي الربح / (الخسارة)
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 900,
                      fontSize: 16,
                      color: netIncome >= 0 ? '#4CAF50' : '#F44336',
                    }}
                  >
                    {fc(netIncome)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Comparative Analysis */}
      {comparative && (
        <Card sx={{ mt: 3, borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
          <CardContent>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              <Button
                size="small"
                onClick={() => setShowComparative(!showComparative)}
                sx={{ fontWeight: 700 }}
              >
                {showComparative ? 'إخفاء' : 'عرض'} المقارنة السنوية
              </Button>
            </Typography>
            {showComparative && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: surfaceColors.card }}>
                      <TableCell sx={{ fontWeight: 700 }}>البند</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {comparative.periods[0]?.label}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {comparative.periods[1]?.label}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        التغيير %
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comparative.comparison.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.item}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {fc(row.current)}
                        </TableCell>
                        <TableCell align="right">{fc(row.previous)}</TableCell>
                        <TableCell align="right">
                          <Chip
                            size="small"
                            icon={
                              row.change >= 0 ? (
                                <ArrowUpward sx={{ fontSize: 14 }} />
                              ) : (
                                <ArrowDownward sx={{ fontSize: 14 }} />
                              )
                            }
                            label={`${Math.abs(row.change)}%`}
                            sx={{
                              fontWeight: 700,
                              bgcolor: row.change >= 0 ? '#4CAF5015' : '#F4433615',
                              color: row.change >= 0 ? '#4CAF50' : '#F44336',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default ProfitLoss;
