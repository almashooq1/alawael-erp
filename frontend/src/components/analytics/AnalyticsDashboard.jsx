/**
 * Analytics Dashboard — لوحة التحليلات
 */

import { useState, useEffect } from 'react';




import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { statusColors } from '../../theme/palette';

const kpiCards = [
  { label: 'إجمالي المستفيدين', value: '2,847', change: '+12%', icon: <PeopleIcon />, color: statusColors.primaryBlue, trend: 'up' },
  { label: 'الجلسات هذا الشهر', value: '1,284', change: '+8%', icon: <AssessmentIcon />, color: statusColors.successDark, trend: 'up' },
  { label: 'معدل التحسن', value: '76%', change: '+5%', icon: <TrendIcon />, color: statusColors.warningDark, trend: 'up' },
  { label: 'رضا المستفيدين', value: '4.6/5', change: '+0.3', icon: <TimelineIcon />, color: statusColors.purpleDark, trend: 'up' },
];

const monthlyData = [
  { month: 'يناير', sessions: 120, beneficiaries: 45 },
  { month: 'فبراير', sessions: 145, beneficiaries: 52 },
  { month: 'مارس', sessions: 168, beneficiaries: 58 },
  { month: 'أبريل', sessions: 190, beneficiaries: 63 },
  { month: 'مايو', sessions: 210, beneficiaries: 71 },
  { month: 'يونيو', sessions: 185, beneficiaries: 67 },
];

const AnalyticsDashboard = () => {
  const [period, setPeriod] = useState('month');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [, setAnalyticsData] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const data = await apiClient.get('/analytics/system');
        setAnalyticsData(data);
      } catch (err) {
        logger.warn('Analytics fetch failed, using defaults:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [period]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            لوحة التحليلات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحليلات شاملة لأداء النظام والخدمات
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>الفترة</InputLabel>
            <Select value={period} label="الفترة" onChange={e => setPeriod(e.target.value)}>
              <MenuItem value="week">أسبوع</MenuItem>
              <MenuItem value="month">شهر</MenuItem>
              <MenuItem value="quarter">ربع سنة</MenuItem>
              <MenuItem value="year">سنة</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<RefreshIcon />}>
            تحديث
          </Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            تصدير
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ transition: 'all 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 } }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: kpi.color + '15', color: kpi.color, width: 48, height: 48 }}>
                  {kpi.icon}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight={700}>{kpi.value}</Typography>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                </Box>
                <Chip
                  label={kpi.change}
                  size="small"
                  color={kpi.trend === 'up' ? 'success' : 'error'}
                  sx={{ fontWeight: 600 }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Card sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<BarChartIcon />} label="الجلسات" iconPosition="start" />
          <Tab icon={<PeopleIcon />} label="المستفيدون" iconPosition="start" />
          <Tab icon={<TrendIcon />} label="الاتجاهات" iconPosition="start" />
          <Tab icon={<CalendarIcon />} label="التقويم" iconPosition="start" />
        </Tabs>

        <CardContent>
          {activeTab === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>إحصائيات الجلسات الشهرية</Typography>
              <Grid container spacing={1} sx={{ mt: 2 }}>
                {monthlyData.map((d, i) => (
                  <Grid item xs={2} key={i}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Box
                        sx={{
                          height: `${(d.sessions / 210) * 120}px`,
                          minHeight: 20,
                          bgcolor: 'primary.main',
                          borderRadius: '4px 4px 0 0',
                          mx: 'auto',
                          width: '60%',
                          transition: 'height 0.3s',
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>{d.sessions}</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {d.month}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
          {activeTab === 1 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">تحليلات المستفيدين</Typography>
              <Typography color="text.secondary">
                توزيع المستفيدين حسب الفئة والمنطقة والحالة
              </Typography>
            </Box>
          )}
          {activeTab === 2 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <TrendIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">اتجاهات الأداء</Typography>
              <Typography color="text.secondary">
                تحليل الاتجاهات والتوقعات المستقبلية
              </Typography>
            </Box>
          )}
          {activeTab === 3 && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CalendarIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6">التقويم التحليلي</Typography>
              <Typography color="text.secondary">
                عرض البيانات حسب التقويم الزمني
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AnalyticsDashboard;
