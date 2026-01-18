import { useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  Download,
  Print,
  Share,
  DateRange,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#0288d1'];

const StatCard = ({ title, value, icon: Icon, color, change }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {change && (
            <Typography variant="caption" color={change > 0 ? 'success.main' : 'error.main'}>
              {change > 0 ? '+' : ''}{change}% مقارنة بالشهر السابق
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function ReportsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [reportType, setReportType] = useState('sales');
  const [period, setPeriod] = useState('month');
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState('2026-01-16');

  // Sales data
  const salesData = [
    { month: 'يوليو', revenue: 45000, expenses: 32000, profit: 13000 },
    { month: 'أغسطس', revenue: 52000, expenses: 35000, profit: 17000 },
    { month: 'سبتمبر', revenue: 48000, expenses: 33000, profit: 15000 },
    { month: 'أكتوبر', revenue: 61000, expenses: 38000, profit: 23000 },
    { month: 'نوفمبر', revenue: 55000, expenses: 36000, profit: 19000 },
    { month: 'ديسمبر', revenue: 68000, expenses: 40000, profit: 28000 },
    { month: 'يناير', revenue: 72000, expenses: 42000, profit: 30000 },
  ];

  // Department performance
  const departmentData = [
    { name: 'المبيعات', performance: 92, target: 85 },
    { name: 'الموارد البشرية', performance: 87, target: 80 },
    { name: 'التسويق', performance: 85, target: 82 },
    { name: 'التطوير', performance: 95, target: 90 },
    { name: 'الدعم الفني', performance: 89, target: 85 },
    { name: 'المالية', performance: 91, target: 88 },
  ];

  // Revenue by category
  const revenueByCategory = [
    { name: 'المنتجات', value: 45000 },
    { name: 'الخدمات', value: 28000 },
    { name: 'الاستشارات', value: 18000 },
    { name: 'التدريب', value: 12000 },
    { name: 'الصيانة', value: 8000 },
  ];

  // Employee stats
  const employeeData = [
    { month: 'يوليو', active: 118, new: 5, left: 2 },
    { month: 'أغسطس', active: 121, new: 4, left: 1 },
    { month: 'سبتمبر', active: 124, new: 6, left: 3 },
    { month: 'أكتوبر', active: 127, new: 7, left: 4 },
    { month: 'نوفمبر', active: 130, new: 5, left: 2 },
    { month: 'ديسمبر', active: 133, new: 6, left: 3 },
    { month: 'يناير', active: 136, new: 8, left: 5 },
  ];

  const stats = [
    { title: 'إجمالي الإيرادات', value: '₪72,000', icon: TrendingUp, color: 'success', change: 5.9 },
    { title: 'صافي الربح', value: '₪30,000', icon: Assessment, color: 'primary', change: 7.1 },
    { title: 'معدل النمو', value: '18.5%', icon: BarChartIcon, color: 'info', change: 2.3 },
    { title: 'رضا العملاء', value: '94%', icon: PieChartIcon, color: 'warning', change: 3.5 },
  ];

  const handleExport = (format) => {
    console.log(`Exporting report as ${format}`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          التقارير والتحليلات
        </Typography>
        <Box display="flex" gap={1}>
          <Button startIcon={<Download />} variant="outlined" onClick={() => handleExport('pdf')}>
            تصدير PDF
          </Button>
          <Button startIcon={<Print />} variant="outlined">
            طباعة
          </Button>
          <Button startIcon={<Share />} variant="outlined">
            مشاركة
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>نوع التقرير</InputLabel>
              <Select value={reportType} label="نوع التقرير" onChange={(e) => setReportType(e.target.value)}>
                <MenuItem value="sales">المبيعات</MenuItem>
                <MenuItem value="hr">الموارد البشرية</MenuItem>
                <MenuItem value="financial">المالية</MenuItem>
                <MenuItem value="performance">الأداء</MenuItem>
                <MenuItem value="customer">العملاء</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>الفترة</InputLabel>
              <Select value={period} label="الفترة" onChange={(e) => setPeriod(e.target.value)}>
                <MenuItem value="day">يومي</MenuItem>
                <MenuItem value="week">أسبوعي</MenuItem>
                <MenuItem value="month">شهري</MenuItem>
                <MenuItem value="quarter">ربع سنوي</MenuItem>
                <MenuItem value="year">سنوي</MenuItem>
                <MenuItem value="custom">مخصص</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {period === 'custom' && (
            <>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="من"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <TextField
                  fullWidth
                  type="date"
                  label="إلى"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </>
          )}
          <Grid item xs={12} md={period === 'custom' ? 3 : 7}>
            <Button variant="contained" fullWidth startIcon={<Assessment />}>
              إنشاء التقرير
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
          <Tab label="الإيرادات والأرباح" />
          <Tab label="أداء الأقسام" />
          <Tab label="الموارد البشرية" />
        </Tabs>

        {tabValue === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                اتجاه الإيرادات والمصروفات
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stackId="1"
                    stroke="#1976d2"
                    fill="#1976d2"
                    name="الإيرادات"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stackId="2"
                    stroke="#d32f2f"
                    fill="#d32f2f"
                    name="المصروفات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                توزيع الإيرادات حسب الفئة
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={revenueByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                صافي الربح الشهري
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#2e7d32"
                    strokeWidth={3}
                    name="صافي الربح"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        )}

        {tabValue === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                أداء الأقسام مقابل الأهداف
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="performance" fill="#2e7d32" name="الأداء الفعلي" />
                  <Bar dataKey="target" fill="#ed6c02" name="الهدف" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        )}

        {tabValue === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                إحصائيات الموظفين
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={employeeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="active"
                    stroke="#1976d2"
                    fill="#1976d2"
                    name="الموظفون النشطون"
                  />
                  <Area
                    type="monotone"
                    dataKey="new"
                    stroke="#2e7d32"
                    fill="#2e7d32"
                    name="موظفون جدد"
                  />
                  <Area
                    type="monotone"
                    dataKey="left"
                    stroke="#d32f2f"
                    fill="#d32f2f"
                    name="موظفون مغادرون"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        )}
      </Paper>
    </Container>
  );
}
