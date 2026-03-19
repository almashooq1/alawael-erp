/**
 * Executive Dashboard Component ⭐⭐⭐
 * لوحة التحكم التنفيذية المتقدمة
 *
 * Features:
 * ✅ Real-time KPIs
 * ✅ Advanced analytics
 * ✅ Predictive insights
 * ✅ Trend analysis
 * ✅ Performance metrics
 * ✅ Cost optimization
 * ✅ Risk indicators
 * ✅ Interactive charts
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  IconButton,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Avatar,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  LocalAtm as MoneyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Refresh as RefreshIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from 'recharts';

const ExecutiveDashboard = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadDashboardData = () => {
    setLoading(true);
    setTimeout(() => {
      setDashboardData(getMockDashboardData());
      setLoading(false);
    }, 500);
  };

  const getMockDashboardData = () => ({
    kpis: {
      totalLicenses: { value: 245, change: 12, trend: 'up' },
      activeLicenses: { value: 198, change: 8, trend: 'up' },
      expiringThisMonth: { value: 23, change: -5, trend: 'down' },
      complianceRate: { value: 94.5, change: 2.3, trend: 'up' },
      totalCost: { value: 456789, change: 5.2, trend: 'up' },
      avgRenewalTime: { value: 4.2, change: -0.8, trend: 'down' },
      riskScore: { value: 12, change: -3, trend: 'down' },
      automation: { value: 78, change: 15, trend: 'up' },
    },
    trends: {
      licenses: [
        { month: 'يناير', total: 220, active: 185, expiring: 15 },
        { month: 'فبراير', total: 225, active: 190, expiring: 18 },
        { month: 'مارس', total: 230, active: 192, expiring: 20 },
        { month: 'أبريل', total: 235, active: 195, expiring: 22 },
        { month: 'مايو', total: 240, active: 196, expiring: 25 },
        { month: 'يونيو', total: 245, active: 198, expiring: 23 },
      ],
      costs: [
        { month: 'يناير', total: 380000, renewal: 280000, penalties: 25000 },
        { month: 'فبراير', total: 395000, renewal: 290000, penalties: 22000 },
        { month: 'مارس', total: 410000, renewal: 305000, penalties: 20000 },
        { month: 'أبريل', total: 425000, renewal: 315000, penalties: 18000 },
        { month: 'مايو', total: 440000, renewal: 325000, penalties: 15000 },
        { month: 'يونيو', total: 456789, renewal: 340000, penalties: 12000 },
      ],
    },
    distribution: {
      byType: [
        { name: 'السجل التجاري', value: 45, color: '#667eea' },
        { name: 'الرخصة البلدية', value: 38, color: '#764ba2' },
        { name: 'رخصة القيادة', value: 52, color: '#f093fb' },
        { name: 'استمارة المركبة', value: 48, color: '#4facfe' },
        { name: 'الإقامة', value: 32, color: '#43e97b' },
        { name: 'أخرى', value: 30, color: '#fa709a' },
      ],
      byStatus: [
        { name: 'نشط', value: 198, color: '#4caf50' },
        { name: 'منتهي', value: 18, color: '#f44336' },
        { name: 'معلق', value: 12, color: '#ff9800' },
        { name: 'قيد التجديد', value: 17, color: '#2196f3' },
      ],
      byAuthority: [
        { name: 'وزارة التجارة', value: 58 },
        { name: 'البلدية', value: 45 },
        { name: 'المرور', value: 62 },
        { name: 'الجوازات', value: 38 },
        { name: 'الزكاة والضريبة', value: 42 },
      ],
    },
    risks: [
      {
        id: 1,
        title: 'رخص منتهية بدون تجديد',
        severity: 'high',
        count: 8,
        impact: 'عالي',
        action: 'تتطلب إجراء فوري',
      },
      {
        id: 2,
        title: 'تجاوز SLA للموافقات',
        severity: 'medium',
        count: 5,
        impact: 'متوسط',
        action: 'مراجعة العمليات',
      },
      {
        id: 3,
        title: 'تكاليف غرامات متزايدة',
        severity: 'high',
        count: 12,
        impact: 'مالي',
        action: 'تحسين التنبيهات',
      },
      {
        id: 4,
        title: 'مستندات ناقصة',
        severity: 'low',
        count: 15,
        impact: 'منخفض',
        action: 'متابعة روتينية',
      },
    ],
    performance: {
      complianceScore: 94.5,
      efficiencyScore: 87.3,
      costOptimization: 76.8,
      riskManagement: 82.4,
      customerSatisfaction: 91.2,
      automationLevel: 78.5,
    },
    predictions: {
      nextMonthExpiring: 28,
      nextMonthCost: 485000,
      complianceTrend: 'improving',
      riskTrend: 'decreasing',
      recommendations: [
        'تفعيل التجديد التلقائي لـ 15 رخصة',
        'جدولة مراجعة شاملة للرخص المنتهية',
        'تحديث معلومات الاتصال لـ 8 موظفين',
        'تطبيق سياسة جديدة لإدارة المستندات',
      ],
    },
  });

  const KPICard = ({ title, value, subtitle, change, trend, icon, color, format = 'number' }) => {
    const formattedValue =
      format === 'currency'
        ? `${value.toLocaleString('ar-SA')} ر.س`
        : format === 'percentage'
          ? `${value}%`
          : format === 'decimal'
            ? `${value} يوم`
            : value.toLocaleString('ar-SA');

    return (
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 3,
          background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
          border: `2px solid ${color}20`,
          transition: 'all 0.3s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                {title}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: color, mt: 0.5 }}>
                {formattedValue}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="textSecondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            {trend === 'up' ? (
              <TrendingUp sx={{ color: change >= 0 ? '#4caf50' : '#f44336', fontSize: 20 }} />
            ) : (
              <TrendingDown sx={{ color: change >= 0 ? '#4caf50' : '#f44336', fontSize: 20 }} />
            )}
            <Typography
              variant="body2"
              sx={{ color: change >= 0 ? '#4caf50' : '#f44336', fontWeight: 600 }}
            >
              {change >= 0 ? '+' : ''}
              {change}
              {format === 'percentage' ? '%' : ''}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              عن الشهر السابق
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const RiskIndicator = ({ risk }) => {
    const severityColors = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50',
    };

    return (
      <Card
        sx={{
          borderRadius: 2,
          border: `2px solid ${severityColors[risk.severity]}`,
          mb: 2,
        }}
      >
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <WarningIcon sx={{ color: severityColors[risk.severity] }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {risk.title}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Chip
                  label={`${risk.count} حالة`}
                  size="small"
                  sx={{ bgcolor: severityColors[risk.severity], color: 'white' }}
                />
                <Chip label={`التأثير: ${risk.impact}`} size="small" variant="outlined" />
              </Stack>
            </Box>
            <Button
              variant="contained"
              size="small"
              sx={{
                bgcolor: severityColors[risk.severity],
                '&:hover': { bgcolor: severityColors[risk.severity] },
              }}
            >
              {risk.action}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  if (!dashboardData) return null;

  const { kpis, trends, distribution, risks, performance, predictions } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            📊 لوحة التحكم التنفيذية
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Executive Dashboard - Real-time Insights
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>الفترة الزمنية</InputLabel>
            <Select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              label="الفترة الزمنية"
            >
              <MenuItem value="week">أسبوع</MenuItem>
              <MenuItem value="month">شهر</MenuItem>
              <MenuItem value="quarter">ربع سنة</MenuItem>
              <MenuItem value="year">سنة</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={loadDashboardData} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            تصدير التقرير
          </Button>
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <KPICard
            title="إجمالي الرخص"
            value={kpis.totalLicenses.value}
            change={kpis.totalLicenses.change}
            trend={kpis.totalLicenses.trend}
            icon={<AssessmentIcon />}
            color="#667eea"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KPICard
            title="نسبة الالتزام"
            value={kpis.complianceRate.value}
            change={kpis.complianceRate.change}
            trend={kpis.complianceRate.trend}
            icon={<CheckCircleIcon />}
            color="#4caf50"
            format="percentage"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KPICard
            title="إجمالي التكاليف"
            value={kpis.totalCost.value}
            change={kpis.totalCost.change}
            trend={kpis.totalCost.trend}
            icon={<MoneyIcon />}
            color="#ff9800"
            format="currency"
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <KPICard
            title="متوسط وقت التجديد"
            value={kpis.avgRenewalTime.value}
            subtitle="أيام"
            change={kpis.avgRenewalTime.change}
            trend={kpis.avgRenewalTime.trend}
            icon={<SpeedIcon />}
            color="#2196f3"
            format="decimal"
          />
        </Grid>
      </Grid>

      {/* Secondary KPIs */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الرخص النشطة
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#4caf50' }}>
                    {kpis.activeLicenses.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#4caf5020' }}>
                  <CheckCircleIcon sx={{ color: '#4caf50' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    تنتهي هذا الشهر
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#f44336' }}>
                    {kpis.expiringThisMonth.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#f4433620' }}>
                  <ScheduleIcon sx={{ color: '#f44336' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    مؤشر المخاطر
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#ff9800' }}>
                    {kpis.riskScore.value}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#ff980020' }}>
                  <SecurityIcon sx={{ color: '#ff9800' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    معدل الأتمتة
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#2196f3' }}>
                    {kpis.automation.value}%
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#2196f320' }}>
                  <SpeedIcon sx={{ color: '#2196f3' }} />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                📈 اتجاهات الرخص والتكاليف
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={trends.costs}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RechartsTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="renewal" fill="#667eea" name="تكلفة التجديد" />
                  <Bar yAxisId="left" dataKey="penalties" fill="#f44336" name="الغرامات" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="total"
                    stroke="#ff9800"
                    strokeWidth={3}
                    name="الإجمالي"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                📊 توزيع الحالات
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={distribution.byStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => `${entry.name}: ${entry.value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribution.byStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                🎯 مؤشرات الأداء
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart
                  data={Object.entries(performance).map(([key, value]) => ({
                    metric:
                      key === 'complianceScore'
                        ? 'الامتثال'
                        : key === 'efficiencyScore'
                          ? 'الكفاءة'
                          : key === 'costOptimization'
                            ? 'تحسين التكلفة'
                            : key === 'riskManagement'
                              ? 'إدارة المخاطر'
                              : key === 'customerSatisfaction'
                                ? 'رضا العملاء'
                                : 'الأتمتة',
                    value,
                  }))}
                >
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="الأداء"
                    dataKey="value"
                    stroke="#667eea"
                    fill="#667eea"
                    fillOpacity={0.6}
                  />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                🏛️ التوزيع حسب الجهة
              </Typography>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={distribution.byAuthority} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="#764ba2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Risks and Predictions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                ⚠️ مؤشرات المخاطر
              </Typography>
              {risks.map(risk => (
                <RiskIndicator key={risk.id} risk={risk} />
              ))}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" mb={3} sx={{ fontWeight: 600 }}>
                🔮 التنبؤات والتوصيات
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  التوقعات للشهر القادم
                </Typography>
                <Typography variant="body2">
                  • {predictions.nextMonthExpiring} رخصة ستنتهي
                </Typography>
                <Typography variant="body2">
                  • التكلفة المتوقعة: {predictions.nextMonthCost.toLocaleString('ar-SA')} ر.س
                </Typography>
              </Alert>

              <Typography variant="subtitle2" mb={2} sx={{ fontWeight: 600 }}>
                💡 التوصيات
              </Typography>
              <List>
                {predictions.recommendations.map((rec, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <CheckCircleIcon sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Stack direction="row" spacing={2}>
                <Chip
                  label={`الامتثال: ${predictions.complianceTrend === 'improving' ? '⬆️ يتحسن' : '⬇️ يتراجع'}`}
                  color="success"
                />
                <Chip
                  label={`المخاطر: ${predictions.riskTrend === 'decreasing' ? '⬇️ تتناقص' : '⬆️ تتزايد'}`}
                  color="success"
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExecutiveDashboard;
