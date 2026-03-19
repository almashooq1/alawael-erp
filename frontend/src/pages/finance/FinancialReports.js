import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  LinearProgress,
  Tabs,
  Tab,
  Divider,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  AccountBalance as BalanceIcon,
  BarChart as ChartIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import accountingService from 'services/accountingService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, surfaceColors, neutralColors } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const FinancialReports = () => {
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [reportData, setReportData] = useState(null);
  const [period, setPeriod] = useState('yearly');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await accountingService.getFinancialReports();
        setReportData(data);
      } catch (err) {
        logger.error('Financial reports error:', err);
        showSnackbar('حدث خطأ في تحميل التقارير', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showSnackbar]);

  if (loading)
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography align="center" sx={{ mt: 2, color: neutralColors.textSecondary }}>
          جاري تحميل التقارير...
        </Typography>
      </Container>
    );

  const rawBs = reportData?.balanceSheet || {};
  const rawIs = reportData?.incomeStatement || {};

  // Normalize balance sheet: flatten nested assets/liabilities/equity into arrays
  const bsAssets = [
    ...(rawBs.assets?.current || []).map(a => ({ ...a, indent: true })),
    { name: 'إجمالي الأصول المتداولة', amount: rawBs.assets?.totalCurrent, isTotal: true },
    ...(rawBs.assets?.fixed || []).map(a => ({ ...a, indent: true })),
    { name: 'إجمالي الأصول الثابتة', amount: rawBs.assets?.totalFixed, isTotal: true },
  ];
  const bsLiabilities = [
    ...(rawBs.liabilities?.current || []).map(a => ({ ...a, indent: true })),
    { name: 'إجمالي الخصوم المتداولة', amount: rawBs.liabilities?.totalCurrent, isTotal: true },
    ...(rawBs.liabilities?.longTerm || []).map(a => ({ ...a, indent: true })),
    { name: 'إجمالي الخصوم طويلة الأجل', amount: rawBs.liabilities?.totalLongTerm, isTotal: true },
  ];
  const bsEquity = rawBs.equity?.items || [];

  const bs = {
    ...rawBs,
    assets: bsAssets,
    liabilities: bsLiabilities,
    equity: bsEquity,
    totalAssets: rawBs.assets?.total || 0,
    totalLiabilities: rawBs.liabilities?.total || 0,
    totalEquity: rawBs.equity?.total || 0,
  };

  const is = {
    ...rawIs,
    netProfit: rawIs.netProfit ?? rawIs.netIncome ?? rawIs.operatingProfit ?? 0,
  };

  const BalanceSheetTab = () => (
    <Box>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <BalanceIcon sx={{ color: brandColors.primary }} /> الميزانية العمومية
      </Typography>
      <Grid container spacing={3}>
        {/* Assets */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{ borderRadius: 2.5, border: `2px solid ${statusColors.info}`, height: '100%' }}
          >
            <CardContent>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: statusColors.info,
                  mb: 2,
                  borderBottom: `2px solid ${statusColors.info}`,
                  pb: 1,
                }}
              >
                الأصول
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {bs.assets?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ border: 0, py: 0.8 }}>
                          <Typography
                            variant="body2"
                            sx={{ pl: item.indent ? 2 : 0, fontWeight: item.isTotal ? 700 : 400 }}
                          >
                            {item.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="left" sx={{ border: 0, py: 0.8 }}>
                          <Typography
                            variant="body2"
                            fontWeight={item.isTotal ? 800 : 600}
                            sx={{ color: item.isTotal ? statusColors.info : neutralColors.text }}
                          >
                            {item.amount?.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell sx={{ fontWeight: 800, fontSize: '1rem' }}>
                        إجمالي الأصول
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{ fontWeight: 800, fontSize: '1.1rem', color: statusColors.info }}
                      >
                        {bs.totalAssets?.toLocaleString()} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
        {/* Liabilities & Equity */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2.5, border: `2px solid ${statusColors.error}`, mb: 2 }}>
            <CardContent>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: statusColors.error,
                  mb: 2,
                  borderBottom: `2px solid ${statusColors.error}`,
                  pb: 1,
                }}
              >
                الخصوم
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {bs.liabilities?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ border: 0, py: 0.8 }}>
                          <Typography
                            variant="body2"
                            sx={{ pl: item.indent ? 2 : 0, fontWeight: item.isTotal ? 700 : 400 }}
                          >
                            {item.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="left" sx={{ border: 0, py: 0.8 }}>
                          <Typography variant="body2" fontWeight={item.isTotal ? 800 : 600}>
                            {item.amount?.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell sx={{ fontWeight: 800 }}>إجمالي الخصوم</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: statusColors.error }}>
                        {bs.totalLiabilities?.toLocaleString()} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
          <Card sx={{ borderRadius: 2.5, border: `2px solid ${statusColors.success}` }}>
            <CardContent>
              <Typography
                variant="subtitle1"
                fontWeight={700}
                sx={{
                  color: statusColors.success,
                  mb: 2,
                  borderBottom: `2px solid ${statusColors.success}`,
                  pb: 1,
                }}
              >
                حقوق الملكية
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    {bs.equity?.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell sx={{ border: 0, py: 0.8 }}>
                          <Typography variant="body2" fontWeight={item.isTotal ? 700 : 400}>
                            {item.name}
                          </Typography>
                        </TableCell>
                        <TableCell align="left" sx={{ border: 0, py: 0.8 }}>
                          <Typography variant="body2" fontWeight={item.isTotal ? 800 : 600}>
                            {item.amount?.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow sx={{ bgcolor: surfaceColors.background }}>
                      <TableCell sx={{ fontWeight: 800 }}>إجمالي حقوق الملكية</TableCell>
                      <TableCell align="left" sx={{ fontWeight: 800, color: statusColors.success }}>
                        {bs.totalEquity?.toLocaleString()} ر.س
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* Balance Check */}
      <Card sx={{ mt: 2, borderRadius: 2, bgcolor: surfaceColors.background }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                إجمالي الأصول
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: statusColors.info }}>
                {bs.totalAssets?.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={800}>
                =
              </Typography>
            </Grid>
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                الخصوم + حقوق الملكية
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ color: statusColors.success }}>
                {((bs.totalLiabilities || 0) + (bs.totalEquity || 0)).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  const IncomeStatementTab = () => (
    <Box>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <ChartIcon sx={{ color: brandColors.primary }} /> قائمة الدخل
      </Typography>
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <CardContent>
          {/* Revenue */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ color: statusColors.success, mb: 1 }}
          >
            الإيرادات
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {is.revenue?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ pl: 1 }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="left" sx={{ border: 0, py: 0.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: statusColors.success }}
                      >
                        {item.amount?.toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'rgba(76,175,80,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>إجمالي الإيرادات</TableCell>
                  <TableCell
                    align="left"
                    sx={{ fontWeight: 800, color: statusColors.success, fontSize: '1.05rem' }}
                  >
                    {is.totalRevenue?.toLocaleString()} ر.س
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ my: 2 }} />

          {/* Expenses */}
          <Typography
            variant="subtitle1"
            fontWeight={700}
            sx={{ color: statusColors.error, mb: 1 }}
          >
            المصروفات
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {is.expenses?.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ border: 0, py: 0.5 }}>
                      <Typography variant="body2" sx={{ pl: 1 }}>
                        {item.name}
                      </Typography>
                    </TableCell>
                    <TableCell align="left" sx={{ border: 0, py: 0.5 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: statusColors.error }}
                      >
                        ({item.amount?.toLocaleString()})
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'rgba(244,67,54,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>إجمالي المصروفات</TableCell>
                  <TableCell
                    align="left"
                    sx={{ fontWeight: 800, color: statusColors.error, fontSize: '1.05rem' }}
                  >
                    ({is.totalExpenses?.toLocaleString()}) ر.س
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ my: 2 }} />

          {/* Net Profit */}
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background: is.netProfit >= 0 ? 'rgba(76,175,80,0.12)' : 'rgba(244,67,54,0.12)',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" color="textSecondary">
              صافي الربح
            </Typography>
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                color: is.netProfit >= 0 ? statusColors.success : statusColors.error,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
              }}
            >
              {is.netProfit >= 0 ? <TrendUpIcon /> : <TrendDownIcon />}
              {is.netProfit?.toLocaleString()} ر.س
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: neutralColors.textSecondary }}>
              هامش الربح:{' '}
              {is.totalRevenue > 0 ? ((is.netProfit / is.totalRevenue) * 100).toFixed(1) : 0}%
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );

  const CashFlowTab = () => (
    <Box>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <TrendUpIcon sx={{ color: brandColors.primary }} /> قائمة التدفقات النقدية
      </Typography>
      <Grid container spacing={3}>
        {[
          {
            title: 'أنشطة تشغيلية',
            color: statusColors.success,
            items: [
              { name: 'صافي الدخل', amount: is.netProfit || 285000 },
              { name: 'استهلاك وإطفاء', amount: 45000 },
              { name: 'تغير في الذمم المدينة', amount: -25000 },
              { name: 'تغير في الذمم الدائنة', amount: 15000 },
            ],
            total: 320000,
          },
          {
            title: 'أنشطة استثمارية',
            color: statusColors.warning,
            items: [
              { name: 'شراء أصول ثابتة', amount: -120000 },
              { name: 'بيع استثمارات', amount: 50000 },
            ],
            total: -70000,
          },
          {
            title: 'أنشطة تمويلية',
            color: statusColors.info,
            items: [
              { name: 'سداد قروض', amount: -80000 },
              { name: 'توزيعات أرباح', amount: -50000 },
            ],
            total: -130000,
          },
        ].map((section, si) => (
          <Grid item xs={12} md={4} key={si}>
            <Card sx={{ borderRadius: 2.5, border: `2px solid ${section.color}`, height: '100%' }}>
              <CardContent>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{
                    color: section.color,
                    mb: 2,
                    borderBottom: `2px solid ${section.color}`,
                    pb: 1,
                  }}
                >
                  {section.title}
                </Typography>
                {section.items.map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{item.name}</Typography>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ color: item.amount >= 0 ? statusColors.success : statusColors.error }}
                    >
                      {item.amount >= 0 ? '' : '('}
                      {Math.abs(item.amount).toLocaleString()}
                      {item.amount >= 0 ? '' : ')'}
                    </Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography fontWeight={700}>الصافي</Typography>
                  <Typography
                    fontWeight={800}
                    sx={{ color: section.total >= 0 ? statusColors.success : statusColors.error }}
                  >
                    {section.total.toLocaleString()} ر.س
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Card sx={{ mt: 2, borderRadius: 2, bgcolor: surfaceColors.background }}>
        <CardContent sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="body2" color="textSecondary">
            صافي التغير في النقد
          </Typography>
          <Typography variant="h5" fontWeight={800} sx={{ color: brandColors.primary }}>
            120,000 ر.س
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: gradients.primary, color: '#fff', borderRadius: 3 }}>
        <CardContent sx={{ py: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <ReportIcon sx={{ fontSize: 30 }} />
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  التقارير المالية
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  الميزانية العمومية وقائمة الدخل والتدفقات النقدية
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.15)',
                    color: '#fff',
                    '& .MuiSelect-icon': { color: '#fff' },
                  }}
                >
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                  <MenuItem value="yearly">سنوي</MenuItem>
                </Select>
              </FormControl>
              <Button
                startIcon={<PdfIcon />}
                variant="contained"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                PDF
              </Button>
              <Button
                startIcon={<ExcelIcon />}
                variant="contained"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  borderRadius: 2,
                }}
              >
                Excel
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            label: 'إجمالي الأصول',
            value: bs.totalAssets,
            color: statusColors.info,
            icon: <BalanceIcon />,
          },
          {
            label: 'إجمالي الإيرادات',
            value: is.totalRevenue,
            color: statusColors.success,
            icon: <TrendUpIcon />,
          },
          {
            label: 'إجمالي المصروفات',
            value: is.totalExpenses,
            color: statusColors.error,
            icon: <TrendDownIcon />,
          },
          {
            label: 'صافي الربح',
            value: is.netProfit,
            color: is.netProfit >= 0 ? statusColors.success : statusColors.error,
            icon: <ChartIcon />,
          },
        ].map((kpi, i) => (
          <Grid item xs={3} key={i}>
            <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
              <CardContent sx={{ py: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: `${kpi.color}15`, color: kpi.color }}>{kpi.icon}</Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={800} sx={{ color: kpi.color }}>
                    {kpi.value?.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textSecondary }}>
                    {kpi.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Report Tabs */}
      <Card sx={{ borderRadius: 3, border: `1px solid ${surfaceColors.border}` }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{ borderBottom: `1px solid ${surfaceColors.border}`, px: 2 }}
        >
          <Tab label="الميزانية العمومية" />
          <Tab label="قائمة الدخل" />
          <Tab label="التدفقات النقدية" />
        </Tabs>
        <CardContent sx={{ pt: 3 }}>
          {tabValue === 0 && <BalanceSheetTab />}
          {tabValue === 1 && <IncomeStatementTab />}
          {tabValue === 2 && <CashFlowTab />}
        </CardContent>
      </Card>
    </Container>
  );
};

export default FinancialReports;
