import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  AccountBalance,
  Assessment,
  PictureAsPdf,
  Description,
  Refresh,
  Download,
} from '@mui/icons-material';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import axios from 'axios';

// تسجيل مكونات Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend
);

/**
 * 📊 لوحة التحكم المالية التفاعلية
 * ====================================
 * 
 * المكونات:
 * - بطاقات الإحصائيات الرئيسية
 * - مخططات تفاعلية للبيانات المالية
 * - قوائم مالية (الميزانية العمومية، قائمة الدخل، التدفقات النقدية)
 * - تقارير مراكز التكلفة
 * - تصدير التقارير (PDF, Excel)
 */

const FinancialDashboard = () => {
  // الحالة
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState(0);

  // البيانات
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    netIncome: 0,
    revenue: 0,
    expenses: 0,
    cashFlow: 0,
  });

  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [cashFlowStatement, setCashFlowStatement] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);

  // جلب البيانات
  useEffect(() => {
    fetchDashboardData();
  }, [selectedPeriod, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // جلب القوائم المالية
      const [balanceRes, incomeRes, cashFlowRes, costCentersRes, assetsRes] = await Promise.all([
        axios.get('/api/accounting/reports/balance-sheet', {
          params: { asOfDate: new Date().toISOString() },
        }),
        axios.get('/api/accounting/reports/income-statement', {
          params: {
            startDate: getStartDate(),
            endDate: new Date().toISOString(),
          },
        }),
        axios.get('/api/accounting/reports/cash-flow', {
          params: {
            startDate: getStartDate(),
            endDate: new Date().toISOString(),
          },
        }),
        axios.get('/api/accounting/cost-centers'),
        axios.get('/api/accounting/fixed-assets?limit=10'),
      ]);

      // تحديث البيانات
      const balance = balanceRes.data.data;
      const income = incomeRes.data.data;
      const cashFlow = cashFlowRes.data.data;

      setBalanceSheet(balance);
      setIncomeStatement(income);
      setCashFlowStatement(cashFlow);
      setCostCenters(costCentersRes.data.data);
      setFixedAssets(assetsRes.data.data);

      // حساب الإحصائيات
      setStats({
        totalAssets: balance.totalAssets,
        totalLiabilities: balance.totalLiabilities,
        totalEquity: balance.totalEquity,
        netIncome: income.netProfit,
        revenue: income.totalRevenue,
        expenses: income.totalExpenses,
        cashFlow: cashFlow.netCashFlow,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const getStartDate = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case 'month':
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      case 'quarter':
        return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).toISOString();
      case 'year':
        return new Date(selectedYear, 0, 1).toISOString();
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }
  };

  // بطاقة إحصائية
  const StatCard = ({ title, value, icon, trend, color }) => (
    <Card sx={{ height: '100%', bgcolor: color }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value.toLocaleString('ar-SA')} ر.س
            </Typography>
            {trend && (
              <Box display="flex" alignItems="center" mt={1}>
                {trend > 0 ? (
                  <TrendingUp color="success" fontSize="small" />
                ) : (
                  <TrendingDown color="error" fontSize="small" />
                )}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'success.main' : 'error.main'}
                  ml={0.5}
                >
                  {Math.abs(trend)}%
                </Typography>
              </Box>
            )}
          </Box>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );

  // مخطط القوائم المالية
  const getFinancialChartData = () => {
    if (!balanceSheet) return null;

    return {
      labels: ['الأصول', 'الالتزامات', 'حقوق الملكية'],
      datasets: [
        {
          label: 'القيمة (ر.س)',
          data: [
            balanceSheet.totalAssets,
            balanceSheet.totalLiabilities,
            balanceSheet.totalEquity,
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  };

  // مخطط قائمة الدخل
  const getIncomeChartData = () => {
    if (!incomeStatement) return null;

    return {
      labels: ['الإيرادات', 'المصروفات', 'صافي الربح'],
      datasets: [
        {
          label: 'القيمة (ر.س)',
          data: [
            incomeStatement.totalRevenue,
            incomeStatement.totalExpenses,
            incomeStatement.netProfit,
          ],
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)',
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
          ],
        },
      ],
    };
  };

  // مخطط مراكز التكلفة
  const getCostCentersChartData = () => {
    if (!costCenters.length) return null;

    return {
      labels: costCenters.map(cc => cc.name),
      datasets: [
        {
          label: 'الميزانية المستخدمة (%)',
          data: costCenters.map(cc => cc.budgetUtilization),
          backgroundColor: costCenters.map(cc =>
            cc.budgetUtilization > 90
              ? 'rgba(255, 99, 132, 0.6)'
              : cc.budgetUtilization > 75
              ? 'rgba(255, 206, 86, 0.6)'
              : 'rgba(75, 192, 192, 0.6)'
          ),
        },
      ],
    };
  };

  // تصدير التقارير
  const exportReport = async (reportType, format) => {
    try {
      const response = await axios.get(`/api/accounting/reports/${reportType}/${format}`, {
        params: {
          startDate: getStartDate(),
          endDate: new Date().toISOString(),
        },
        responseType: 'blob',
      });

      // تنزيل الملف
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}_${new Date().getTime()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>
          جاري تحميل البيانات المالية...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* العنوان وأدوات التحكم */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          📊 لوحة التحكم المالية
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>الفترة</InputLabel>
            <Select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              label="الفترة"
            >
              <MenuItem value="month">شهر</MenuItem>
              <MenuItem value="quarter">ربع سنوي</MenuItem>
              <MenuItem value="year">سنة</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>السنة</InputLabel>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              label="السنة"
            >
              {[2024, 2025, 2026].map(year => (
                <MenuItem key={year} value={year}>{year}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboardData}
          >
            تحديث
          </Button>
        </Box>
      </Box>

      {/* بطاقات الإحصائيات */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الأصول"
            value={stats.totalAssets}
            icon={<AccountBalance fontSize="large" color="primary" />}
            color="background.paper"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="صافي الربح"
            value={stats.netIncome}
            icon={<AttachMoney fontSize="large" color="success" />}
            trend={15}
            color="background.paper"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الإيرادات"
            value={stats.revenue}
            icon={<TrendingUp fontSize="large" color="success" />}
            trend={8}
            color="background.paper"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="التدفق النقدي"
            value={stats.cashFlow}
            icon={<Assessment fontSize="large" color="info" />}
            color="background.paper"
          />
        </Grid>
      </Grid>

      {/* علامات التبويب */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="الميزانية العمومية" />
          <Tab label="قائمة الدخل" />
          <Tab label="التدفقات النقدية" />
          <Tab label="مراكز التكلفة" />
          <Tab label="الأصول الثابتة" />
        </Tabs>
      </Paper>

      {/* محتوى علامات التبويب */}
      {/* الميزانية العمومية */}
      {activeTab === 0 && balanceSheet && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">الميزانية العمومية</Typography>
                <Box>
                  <IconButton size="small" onClick={() => exportReport('balance-sheet', 'pdf')}>
                    <PictureAsPdf />
                  </IconButton>
                  <IconButton size="small" onClick={() => exportReport('balance-sheet', 'excel')}>
                    <Description />
                  </IconButton>
                </Box>
              </Box>
              {getFinancialChartData() && <Bar data={getFinancialChartData()} />}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" mb={2}>تفاصيل الميزانية</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>إجمالي الأصول</strong></TableCell>
                      <TableCell align="right">
                        {balanceSheet.totalAssets.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>إجمالي الالتزامات</strong></TableCell>
                      <TableCell align="right">
                        {balanceSheet.totalLiabilities.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>حقوق الملكية</strong></TableCell>
                      <TableCell align="right">
                        {balanceSheet.totalEquity.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>التوازن</strong></TableCell>
                      <TableCell align="right">
                        <Chip
                          label={balanceSheet.balanceCheck ? 'متوازن ✓' : 'غير متوازن ✗'}
                          color={balanceSheet.balanceCheck ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* قائمة الدخل */}
      {activeTab === 1 && incomeStatement && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box display="flex" justifyContent="space-between" mb={2}>
                <Typography variant="h6">قائمة الدخل</Typography>
                <Box>
                  <IconButton size="small" onClick={() => exportReport('income-statement', 'pdf')}>
                    <PictureAsPdf />
                  </IconButton>
                  <IconButton size="small" onClick={() => exportReport('income-statement', 'excel')}>
                    <Description />
                  </IconButton>
                </Box>
              </Box>
              {getIncomeChartData() && <Bar data={getIncomeChartData()} />}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" mb={2}>تفاصيل الأرباح والخسائر</Typography>
              <TableContainer>
                <Table size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell><strong>إجمالي الإيرادات</strong></TableCell>
                      <TableCell align="right">
                        {incomeStatement.totalRevenue.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>إجمالي المصروفات</strong></TableCell>
                      <TableCell align="right">
                        {incomeStatement.totalExpenses.toLocaleString('ar-SA')} ر.س
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>صافي الربح</strong></TableCell>
                      <TableCell align="right">
                        <Typography
                          color={incomeStatement.netProfit >= 0 ? 'success.main' : 'error.main'}
                          fontWeight="bold"
                        >
                          {incomeStatement.netProfit.toLocaleString('ar-SA')} ر.س
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><strong>هامش الربح</strong></TableCell>
                      <TableCell align="right">
                        {incomeStatement.profitMargin.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* مراكز التكلفة */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" mb={2}>استخدام الميزانية حسب المركز</Typography>
              {getCostCentersChartData() && <Bar data={getCostCentersChartData()} />}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" mb={2}>مراكز التكلفة</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>المركز</TableCell>
                      <TableCell align="right">الميزانية</TableCell>
                      <TableCell align="right">المستخدم</TableCell>
                      <TableCell align="center">الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {costCenters.slice(0, 5).map((cc) => (
                      <TableRow key={cc._id}>
                        <TableCell>{cc.name}</TableCell>
                        <TableCell align="right">
                          {cc.budget?.totalBudget?.toLocaleString('ar-SA')} ر.س
                        </TableCell>
                        <TableCell align="right">
                          {cc.budgetUtilization?.toFixed(1)}%
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={cc.budgetStatus}
                            color={
                              cc.budgetStatus === 'over'
                                ? 'error'
                                : cc.budgetStatus === 'warning'
                                ? 'warning'
                                : 'success'
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* الأصول الثابتة */}
      {activeTab === 4 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" mb={2}>الأصول الثابتة</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الرمز</TableCell>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell align="right">القيمة الأصلية</TableCell>
                  <TableCell align="right">القيمة الدفترية</TableCell>
                  <TableCell align="center">الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {fixedAssets.map((asset) => (
                  <TableRow key={asset._id}>
                    <TableCell>{asset.code}</TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell align="right">
                      {asset.purchaseCost?.toLocaleString('ar-SA')} ر.س
                    </TableCell>
                    <TableCell align="right">
                      {asset.bookValue?.toLocaleString('ar-SA')} ر.س
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={asset.status}
                        color={asset.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Container>
  );
};

export default FinancialDashboard;
