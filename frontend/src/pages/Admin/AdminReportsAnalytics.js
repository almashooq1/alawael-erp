import { useState, useEffect } from 'react';
// Statistics Cards Section






import { adminService } from 'services/adminService';
import exportService from 'services/exportService';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, brandColors, statusColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';

const AdminReportsAnalytics = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [timeRange, setTimeRange] = useState('month');
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await adminService.getAdminReports(userId);
        setReportsData(data);
      } catch (err) {
        logger.error('Failed to load reports:', err);
        setError(err.message || 'حدث خطأ في تحميل التقارير');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [userId]);

  const handleTimeRangeChange = (event, newTimeRange) => {
    if (newTimeRange) {
      setTimeRange(newTimeRange);
    }
  };

  const handleExportPDF = () => {
    try {
      const summaryData = reportsData?.summary || [];
      exportService.toExcel(
        summaryData.map(s => ({ المؤشر: s.metric, القيمة: s.value, التغيير: s.change })),
        `admin_report_${new Date().toISOString().slice(0, 10)}`,
        { sheetName: 'Report' }
      );
      showSnackbar('تم تصدير التقرير بنجاح', 'success');
    } catch (err) {
      logger.error('Export report failed:', err);
      showSnackbar('حدث خطأ أثناء تصدير التقرير', 'error');
    }
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

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  const colors = [
    brandColors.primaryStart,
    brandColors.accentPink,
    brandColors.accentSky,
    brandColors.accentGreen,
    statusColors.warning,
    statusColors.error,
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.primary,
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
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={handleTimeRangeChange}
          sx={{ backgroundColor: 'white', borderRadius: 2 }}
        >
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
              background: gradients.primary,
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
              background: gradients.warning,
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
              background: gradients.info,
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
              background: gradients.success,
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
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke={brandColors.primaryStart}
                    strokeWidth={2}
                    dot={{ fill: brandColors.primaryStart }}
                    name="مكتملة"
                  />
                  <Line
                    type="monotone"
                    dataKey="scheduled"
                    stroke={brandColors.accentCoral}
                    strokeWidth={2}
                    dot={{ fill: brandColors.accentCoral }}
                    name="مجدولة"
                  />
                  <Line
                    type="monotone"
                    dataKey="cancelled"
                    stroke={statusColors.warning}
                    strokeWidth={2}
                    dot={{ fill: statusColors.warning }}
                    name="ملغاة"
                  />
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
                  <Bar dataKey="active" fill={statusColors.success} name="نشط" />
                  <Bar dataKey="inactive" fill={statusColors.error} name="معطل" />
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
                    fill={brandColors.primaryStart}
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
                  <Scatter
                    name="الأداء"
                    data={reportsData?.performanceMetrics || []}
                    fill={brandColors.primaryStart}
                  />
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
              <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
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
                        color: item.percentage > 0 ? statusColors.success : statusColors.error,
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
                        color: item.percentage > 0 ? statusColors.success : statusColors.error,
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
