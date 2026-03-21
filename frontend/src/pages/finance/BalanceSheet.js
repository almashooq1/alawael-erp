import { useState, useEffect, useCallback } from 'react';

import { surfaceColors, neutralColors, brandColors } from 'theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Warning from '@mui/icons-material/Warning';
import Assessment from '@mui/icons-material/Assessment';

const API = process.env.REACT_APP_API_URL || '/api';

const BalanceSheet = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/pro/balance-sheet?asOfDate=${asOfDate}`, { headers });
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [asOfDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fc = v =>
    new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(v || 0);

  const SectionRow = ({ label, amount, bold, indent, color, isTotal, level }) => (
    <TableRow
      sx={{
        bgcolor: isTotal ? `${color || brandColors.primary}08` : 'transparent',
        '&:hover': { bgcolor: !isTotal ? surfaceColors.hover : undefined },
      }}
    >
      <TableCell
        sx={{
          fontWeight: bold ? 800 : 400,
          pl: indent ? (level || 1) * 2 + 1 : 2,
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
          color: color || 'inherit',
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

  const { assets, liabilities, equity, isBalanced } = data;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            الميزانية العمومية
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Balance Sheet - Statement of Financial Position
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            type="date"
            size="small"
            value={asOfDate}
            onChange={e => setAsOfDate(e.target.value)}
            label="كما في تاريخ"
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            onClick={fetchData}
            sx={{ bgcolor: brandColors.primary, fontWeight: 700 }}
          >
            عرض
          </Button>
        </Box>
      </Box>

      {/* Balance Check */}
      <Box sx={{ mb: 2 }}>
        <Chip
          icon={isBalanced ? <CheckCircle /> : <Warning />}
          label={isBalanced ? 'الميزانية متوازنة ✓' : 'الميزانية غير متوازنة!'}
          sx={{
            fontWeight: 700,
            fontSize: 14,
            px: 1,
            bgcolor: isBalanced ? '#4CAF5015' : '#F4433615',
            color: isBalanced ? '#4CAF50' : '#F44336',
          }}
        />
      </Box>

      {/* KPI Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        {[
          {
            label: 'إجمالي الأصول',
            value: fc(assets.totalAssets),
            icon: <AccountBalance />,
            color: '#4CAF50',
          },
          { label: 'الأصول المتداولة', value: fc(assets.currentAssets.total), color: '#2196F3' },
          {
            label: 'إجمالي الالتزامات',
            value: fc(liabilities.totalLiabilities),
            icon: <Assessment />,
            color: '#FF9800',
          },
          { label: 'حقوق الملكية', value: fc(equity.totalEquity), color: '#9C27B0' },
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
              <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                {item.label}
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>
                {item.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {/* Assets */}
        <Card
          sx={{
            flex: 1,
            minWidth: 420,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: '#4CAF5008', borderBottom: `2px solid #4CAF50` }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#4CAF50' }}>
                <AccountBalance sx={{ fontSize: 22, verticalAlign: 'middle', mr: 1 }} /> الأصول
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {/* Current Assets */}
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{ fontWeight: 800, bgcolor: '#E3F2FD', color: '#1565C0', fontSize: 14 }}
                    >
                      الأصول المتداولة
                    </TableCell>
                  </TableRow>
                  <SectionRow
                    label="نقد وما يعادله"
                    amount={assets.currentAssets.cashAndBank}
                    indent
                  />
                  <SectionRow
                    label="ذمم مدينة"
                    amount={assets.currentAssets.accountsReceivable}
                    indent
                  />
                  <SectionRow label="مخزون" amount={assets.currentAssets.inventory} indent />
                  <SectionRow
                    label="مصاريف مدفوعة مقدماً"
                    amount={assets.currentAssets.prepaidExpenses}
                    indent
                  />
                  <SectionRow
                    label="أصول متداولة أخرى"
                    amount={assets.currentAssets.otherCurrentAssets}
                    indent
                  />
                  <SectionRow
                    label="إجمالي الأصول المتداولة"
                    amount={assets.currentAssets.total}
                    bold
                    isTotal
                    color="#1565C0"
                  />

                  {/* Non-Current Assets */}
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{
                        fontWeight: 800,
                        bgcolor: '#E8F5E9',
                        color: '#2E7D32',
                        fontSize: 14,
                        pt: 2,
                      }}
                    >
                      الأصول غير المتداولة
                    </TableCell>
                  </TableRow>
                  <SectionRow
                    label="ممتلكات ومعدات (إجمالي)"
                    amount={assets.nonCurrentAssets.propertyPlantEquipment}
                    indent
                  />
                  <SectionRow
                    label="(مجمع الإهلاك)"
                    amount={-assets.nonCurrentAssets.accumulatedDepreciation}
                    indent
                    color="#F44336"
                  />
                  <SectionRow
                    label="أصول غير ملموسة"
                    amount={assets.nonCurrentAssets.intangibleAssets}
                    indent
                  />
                  <SectionRow
                    label="استثمارات طويلة الأجل"
                    amount={assets.nonCurrentAssets.longTermInvestments}
                    indent
                  />
                  <SectionRow
                    label="إجمالي الأصول غير المتداولة"
                    amount={assets.nonCurrentAssets.total}
                    bold
                    isTotal
                    color="#2E7D32"
                  />

                  {/* Total Assets */}
                  <TableRow sx={{ bgcolor: '#4CAF5015' }}>
                    <TableCell sx={{ fontWeight: 900, fontSize: 16, color: '#4CAF50' }}>
                      إجمالي الأصول
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 900, fontSize: 16, color: '#4CAF50' }}
                    >
                      {fc(assets.totalAssets)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Liabilities + Equity */}
        <Card
          sx={{
            flex: 1,
            minWidth: 420,
            borderRadius: 2.5,
            border: `1px solid ${surfaceColors.border}`,
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 2, bgcolor: '#FF980008', borderBottom: `2px solid #FF9800` }}>
              <Typography variant="h6" fontWeight={800} sx={{ color: '#FF9800' }}>
                الالتزامات وحقوق الملكية
              </Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {/* Current Liabilities */}
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{ fontWeight: 800, bgcolor: '#FFF3E0', color: '#E65100', fontSize: 14 }}
                    >
                      الالتزامات المتداولة
                    </TableCell>
                  </TableRow>
                  <SectionRow
                    label="ذمم دائنة"
                    amount={liabilities.currentLiabilities.accountsPayable}
                    indent
                  />
                  <SectionRow
                    label="مصاريف مستحقة"
                    amount={liabilities.currentLiabilities.accruedExpenses}
                    indent
                  />
                  <SectionRow
                    label="قروض قصيرة الأجل"
                    amount={liabilities.currentLiabilities.shortTermLoans}
                    indent
                  />
                  <SectionRow
                    label="ضريبة القيمة المضافة (مستحقة)"
                    amount={liabilities.currentLiabilities.vatPayable}
                    indent
                  />
                  <SectionRow
                    label="زكاة مستحقة"
                    amount={liabilities.currentLiabilities.zakatPayable}
                    indent
                  />
                  <SectionRow
                    label="التزامات متداولة أخرى"
                    amount={liabilities.currentLiabilities.otherCurrentLiabilities}
                    indent
                  />
                  <SectionRow
                    label="إجمالي الالتزامات المتداولة"
                    amount={liabilities.currentLiabilities.total}
                    bold
                    isTotal
                    color="#E65100"
                  />

                  {/* Non-Current Liabilities */}
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{
                        fontWeight: 800,
                        bgcolor: '#FCE4EC',
                        color: '#C62828',
                        fontSize: 14,
                        pt: 2,
                      }}
                    >
                      الالتزامات غير المتداولة
                    </TableCell>
                  </TableRow>
                  <SectionRow
                    label="قروض طويلة الأجل"
                    amount={liabilities.nonCurrentLiabilities.longTermLoans}
                    indent
                  />
                  <SectionRow
                    label="مكافأة نهاية الخدمة"
                    amount={liabilities.nonCurrentLiabilities.endOfServiceBenefits}
                    indent
                  />
                  <SectionRow
                    label="التزامات غير متداولة أخرى"
                    amount={liabilities.nonCurrentLiabilities.otherNonCurrentLiabilities}
                    indent
                  />
                  <SectionRow
                    label="إجمالي الالتزامات غير المتداولة"
                    amount={liabilities.nonCurrentLiabilities.total}
                    bold
                    isTotal
                    color="#C62828"
                  />

                  <SectionRow
                    label="إجمالي الالتزامات"
                    amount={liabilities.totalLiabilities}
                    bold
                    isTotal
                    color="#FF9800"
                  />

                  <TableRow>
                    <TableCell colSpan={2} sx={{ p: 1 }} />
                  </TableRow>

                  {/* Equity */}
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      sx={{ fontWeight: 800, bgcolor: '#F3E5F5', color: '#6A1B9A', fontSize: 14 }}
                    >
                      حقوق الملكية
                    </TableCell>
                  </TableRow>
                  <SectionRow label="رأس المال" amount={equity.capital} indent />
                  <SectionRow label="أرباح مبقاة" amount={equity.retainedEarnings} indent />
                  <SectionRow label="احتياطيات" amount={equity.reserves} indent />
                  <SectionRow
                    label="إجمالي حقوق الملكية"
                    amount={equity.totalEquity}
                    bold
                    isTotal
                    color="#6A1B9A"
                  />

                  {/* Total Liabilities + Equity */}
                  <TableRow sx={{ bgcolor: '#FF980015' }}>
                    <TableCell sx={{ fontWeight: 900, fontSize: 16, color: '#FF9800' }}>
                      إجمالي الالتزامات وحقوق الملكية
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 900, fontSize: 16, color: '#FF9800' }}
                    >
                      {fc(liabilities.totalLiabilities + equity.totalEquity)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>

      {/* Financial Ratios */}
      <Card sx={{ mt: 3, borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            النسب المالية الرئيسية
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {(() => {
              const currentRatio =
                assets.currentAssets.total && liabilities.currentLiabilities.total
                  ? (assets.currentAssets.total / liabilities.currentLiabilities.total).toFixed(2)
                  : 'N/A';
              const debtRatio = assets.totalAssets
                ? ((liabilities.totalLiabilities / assets.totalAssets) * 100).toFixed(1)
                : 'N/A';
              const equityRatio = assets.totalAssets
                ? ((equity.totalEquity / assets.totalAssets) * 100).toFixed(1)
                : 'N/A';
              return [
                {
                  label: 'نسبة التداول',
                  value: currentRatio,
                  desc: 'Current Ratio',
                  good: parseFloat(currentRatio) >= 1.5,
                },
                {
                  label: 'نسبة الدين',
                  value: `${debtRatio}%`,
                  desc: 'Debt Ratio',
                  good: parseFloat(debtRatio) <= 50,
                },
                {
                  label: 'نسبة حقوق الملكية',
                  value: `${equityRatio}%`,
                  desc: 'Equity Ratio',
                  good: parseFloat(equityRatio) >= 50,
                },
              ].map((ratio, i) => (
                <Card
                  key={i}
                  sx={{
                    flex: 1,
                    minWidth: 180,
                    border: `1px solid ${surfaceColors.border}`,
                    borderRadius: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                      {ratio.label}
                    </Typography>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{ color: ratio.good ? '#4CAF50' : '#FF9800' }}
                    >
                      {ratio.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                      {ratio.desc}
                    </Typography>
                  </CardContent>
                </Card>
              ));
            })()}
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default BalanceSheet;
