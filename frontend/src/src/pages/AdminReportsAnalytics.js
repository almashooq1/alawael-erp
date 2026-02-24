import React, { useState } from 'react';
// Statistics Cards Section
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  QueryStats as QueryStatsIcon,
  TrendingUp as TrendingUpIcon,
  FileDownload as FileDownloadIcon,
  Print as PrintIcon,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';

const AdminReportsAnalytics = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchReports = async () => {
      const data = await adminService.getAdminReports('admin001');
      setReportsData(data);
      setLoading(false);
    };
    fetchReports();
  }, []);

  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange) {
      setTimeRange(newTimeRange);
    }
  };

  const handleExportPDF = () => {
    alert('تنزيل التقرير بصيغة PDF');
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#FF9800', '#F44336'];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <QueryStatsIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                التقارير والتحليلات
              </Typography>
              <Typography variant="body2">تحليل شامل لأداء النظام</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportPDF}
              sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              تنزيل
            </Button>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              طباعة
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Time Range Toggle */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup value={timeRange} exclusive onChange={handleTimeRangeChange} sx={{ backgroundColor: 'white', borderRadius: 2 }}>
          <ToggleButton value="week">أسبوع</ToggleButton>
          <ToggleButton value="month">شهر</ToggleButton>
          <ToggleButton value="quarter">ربع سنة</ToggleButton>
          <ToggleButton value="year">سنة</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي الجلسات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {reportsData?.totalSessions}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                هذا الشهر
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(245, 87, 108, 0.4)',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                معدل الإكمال
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {reportsData?.completionRate}%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                من الجلسات المخطط لها
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(79, 172, 254, 0.4)',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                متوسط رضا المستخدمين
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {reportsData?.averageRating}/5
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                من الآراء
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(67, 233, 123, 0.4)',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                معدل تحسن المرضى
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {reportsData?.improvementRate}%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                تحسن ملحوظ
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Line Chart - Monthly Trends */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="اتجاهات الجلسات الشهرية" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportsData?.monthlyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#667eea" strokeWidth={2} dot={{ fill: '#667eea' }} name="مكتملة" />
                  <Line type="monotone" dataKey="scheduled" stroke="#f5576c" strokeWidth={2} dot={{ fill: '#f5576c' }} name="مجدولة" />
                  <Line type="monotone" dataKey="cancelled" stroke="#FF9800" strokeWidth={2} dot={{ fill: '#FF9800' }} name="ملغاة" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Bar Chart - User Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="توزيع المستخدمين حسب الدور" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportsData?.userDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="active" fill="#4CAF50" name="نشط" />
                  <Bar dataKey="inactive" fill="#F44336" name="معطل" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Pie Chart - Session Types */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="توزيع أنواع الجلسات" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportsData?.sessionTypes || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reportsData?.sessionTypes?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Scatter Chart - Performance Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="مؤشرات الأداء" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="الوقت" />
                  <YAxis type="number" dataKey="y" name="الأداء" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="الأداء" data={reportsData?.performanceMetrics || []} fill="#667eea" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Summary Table */}
      <Card>
        <CardHeader title="ملخص الإحصائيات الشهرية" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>المقياس</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>القيمة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التغيير</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>النسبة المئوية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الاتجاه</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reportsData?.summary?.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{item.metric}</TableCell>
                  <TableCell>{item.value}</TableCell>
                  <TableCell>{item.change}</TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        color: item.percentage > 0 ? '#4CAF50' : '#F44336',
                        fontWeight: 'bold',
                      }}
                    >
                      {item.percentage > 0 ? '+' : ''}
                      {item.percentage}%
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TrendingUpIcon
                      sx={{
                        color: item.percentage > 0 ? '#4CAF50' : '#F44336',
                        transform: item.percentage > 0 ? 'rotate(0deg)' : 'rotate(180deg)',
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Container>
  );
};

export default AdminReportsAnalytics;
