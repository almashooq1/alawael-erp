import { useState, useEffect, useCallback } from 'react';
import { triggerBlobDownload } from 'utils/downloadHelper';






import { getToken } from 'utils/tokenStorage';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { statusColors, neutralColors, assessmentColors, chartColors } from '../../theme/palette';

const COLORS = chartColors.analytics;

const AnalyticsDashboard = () => {
  const showSnackbar = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [monthlyTrends, setMonthlyTrends] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [dateRange, setDateRange] = useState('all');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = dateRange !== 'all' ? `?dateRange=${dateRange}` : '';
      const response = await fetch(`/api/analytics/dashboard${params}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('فشل في تحميل البيانات');

      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const fetchMonthlyTrends = useCallback(async () => {
    try {
      const params = dateRange !== 'all' ? `?dateRange=${dateRange}` : '';
      const response = await fetch(`/api/analytics/trends/monthly${params}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('فشل في تحميل الاتجاهات');

      const data = await response.json();
      setMonthlyTrends(data);
    } catch (err) {
      logger.error('Monthly trends error:', err);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchDashboardData();
    fetchMonthlyTrends();
  }, [fetchDashboardData, fetchMonthlyTrends]);

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/analytics/export?format=json', {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) throw new Error('فشل في تصدير التقرير');

      const blob = await response.blob();
      triggerBlobDownload(blob, `analytics-report-${new Date().toISOString()}.json`);
    } catch (err) {
      showSnackbar('فشل في تصدير التقرير: ' + err.message, 'error');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!dashboardData) {
    return (
      <Container>
        <Alert severity="info">لا توجد بيانات متاحة</Alert>
      </Container>
    );
  }

  const { summary, distribution, _trends, goals, attendance, budget } = dashboardData;

  // Prepare chart data
  const disabilityTypeData = distribution.byDisabilityType.map(item => ({
    name: item._id,
    value: item.count,
  }));

  const statusData = distribution.byStatus.map(item => ({
    name: item._id,
    value: item.count,
  }));

  const goalAchievementData = goals.categoryBreakdown.map(item => ({
    category: item.category,
    achievementRate: item.achievementRate,
  }));

  const attendanceData = [
    { name: 'حضور', value: attendance.attendanceRate },
    { name: 'غياب', value: 100 - attendance.attendanceRate },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          📊 لوحة التحليلات المتقدمة
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>الفترة الزمنية</InputLabel>
            <Select
              value={dateRange}
              label="الفترة الزمنية"
              onChange={e => setDateRange(e.target.value)}
            >
              <MenuItem value="all">كل الفترات</MenuItem>
              <MenuItem value="last30days">آخر 30 يوم</MenuItem>
              <MenuItem value="last90days">آخر 90 يوم</MenuItem>
              <MenuItem value="last6months">آخر 6 أشهر</MenuItem>
              <MenuItem value="lastYear">السنة الماضية</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" color="primary" onClick={handleExportReport}>
            تصدير التقرير
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(e, newValue) => setSelectedTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="نظرة عامة" />
        <Tab label="الاتجاهات" />
        <Tab label="الأهداف" />
        <Tab label="الحضور" />
        <Tab label="الميزانية" />
      </Tabs>

      {/* Tab Content */}
      {selectedTab === 0 && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={3} mb={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Assessment sx={{ fontSize: 40, color: statusColors.primaryBlue, mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summary.total}</Typography>
                      <Typography color="textSecondary">إجمالي البرامج</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <PeopleAlt sx={{ fontSize: 40, color: assessmentColors.normal, mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summary.active}</Typography>
                      <Typography color="textSecondary">برامج نشطة</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <CheckCircle sx={{ fontSize: 40, color: assessmentColors.moderate, mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summary.completed}</Typography>
                      <Typography color="textSecondary">برامج مكتملة</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <TrendingUp sx={{ fontSize: 40, color: statusColors.purple, mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summary.successRate.toFixed(1)}%</Typography>
                      <Typography color="textSecondary">معدل النجاح</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Schedule sx={{ fontSize: 40, color: assessmentColors.severe, mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{summary.averageDuration}</Typography>
                      <Typography color="textSecondary">متوسط المدة (أيام)</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card elevation={3}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <AttachMoney sx={{ fontSize: 40, color: statusColors.tealDark, mr: 2 }} />
                    <Box>
                      <Typography variant="h4">{budget.utilizationRate.toFixed(1)}%</Typography>
                      <Typography color="textSecondary">معدل استخدام الميزانية</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    التوزيع حسب نوع الإعاقة
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={disabilityTypeData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {disabilityTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    التوزيع حسب الحالة
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill={chartColors.purple} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {selectedTab === 1 && monthlyTrends && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الاتجاهات الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyTrends.trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke={chartColors.purple}
                      name="إجمالي البرامج"
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke={chartColors.green}
                      name="مكتملة"
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke={chartColors.amber}
                      name="معدل النجاح %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  معدلات تحقيق الأهداف حسب الفئة
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={goalAchievementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="achievementRate" fill={chartColors.green} name="معدل التحقيق %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إحصائيات الأهداف
                </Typography>
                <Box mt={2}>
                  <Typography variant="body1" gutterBottom>
                    إجمالي الأهداف: {goals.totalGoals}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    محققة: {goals.achieved}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    قيد التنفيذ: {goals.inProgress}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    معلقة: {goals.pending}
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                    معدل الإنجاز: {goals.achievementRate.toFixed(1)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  معدل الحضور
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      <Cell fill={statusColors.success} />
                      <Cell fill={statusColors.error} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إحصائيات الجلسات
                </Typography>
                <Box mt={2}>
                  <Typography variant="body1" gutterBottom>
                    إجمالي الجلسات: {attendance.totalSessions}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: statusColors.success }}>
                    حضور: {attendance.attended}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: statusColors.warning }}>
                    غياب بعذر: {attendance.excusedAbsent}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: statusColors.error }}>
                    غياب: {attendance.absent}
                  </Typography>
                  <Typography variant="body1" gutterBottom sx={{ color: neutralColors.inactive }}>
                    ملغاة: {attendance.cancelled}
                  </Typography>
                  <Typography variant="h5" color="primary" sx={{ mt: 2 }}>
                    معدل الحضور: {attendance.attendanceRate.toFixed(1)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {selectedTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  تحليل الميزانية
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { name: 'مخصص', value: budget.allocated },
                      { name: 'مصروف', value: budget.spent },
                      { name: 'متبقي', value: budget.remaining },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={chartColors.purple} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إحصائيات الميزانية
                </Typography>
                <Box mt={2}>
                  <Typography variant="body1" gutterBottom>
                    إجمالي المخصص: {budget.allocated.toLocaleString()} ريال
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    إجمالي المصروف: {budget.spent.toLocaleString()} ريال
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    المتبقي: {budget.remaining.toLocaleString()} ريال
                  </Typography>
                  <Typography
                    variant="h5"
                    color={budget.utilizationRate > 90 ? 'error' : 'primary'}
                    sx={{ mt: 2 }}
                  >
                    معدل الاستخدام: {budget.utilizationRate.toFixed(1)}%
                  </Typography>
                  {budget.utilizationRate > 90 && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                      ⚠️ تحذير: تم تجاوز 90% من الميزانية
                    </Alert>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default AnalyticsDashboard;
