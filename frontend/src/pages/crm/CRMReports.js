/**
 * 📊 تقارير CRM — CRM Reports
 * AlAwael ERP — CRM Module
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
  Assessment as AssessIcon,
  PieChart as PieIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { crmReportsService, MOCK_CONVERSION_REPORT, MOCK_CRM_DASHBOARD } from 'services/crmService';

const COLORS = ['#4FC3F7', '#81C784', '#FFB74D', '#E57373', '#BA68C8', '#4DB6AC'];

const formatCurrency = v =>
  new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(v);

export default function CRMReports() {
  const _theme = useTheme();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [dashData, setDashData] = useState(MOCK_CRM_DASHBOARD);
  const [conversionData, setConversionData] = useState(MOCK_CONVERSION_REPORT);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [d1, d2] = await Promise.all([
        crmReportsService.getDashboardStats(),
        crmReportsService.getConversionReport(),
      ]);
      if (d1) setDashData(d1);
      if (d2) setConversionData(d2);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}

      {/* Header */}
      <Card
        sx={{
          mb: 3,
          background: 'linear-gradient(135deg, #00897B 0%, #00695C 100%)',
          color: 'white',
          borderRadius: 3,
        }}
      >
        <CardContent
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              📊 تقارير إدارة علاقات العملاء
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.85, mt: 0.5 }}>
              تحليلات شاملة لأداء المبيعات ومعدلات التحويل
            </Typography>
          </Box>
          <Tooltip title="تحديث البيانات">
            <IconButton onClick={refresh} sx={{ color: 'white' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<TrendIcon />} iconPosition="start" label="أداء المبيعات" />
          <Tab icon={<AssessIcon />} iconPosition="start" label="معدلات التحويل" />
          <Tab icon={<PieIcon />} iconPosition="start" label="تحليل المصادر" />
          <Tab icon={<TimelineIcon />} iconPosition="start" label="الاتجاهات الشهرية" />
        </Tabs>
      </Paper>

      {/* Tab 0: Sales Performance */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* KPI Row */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                {
                  label: 'إجمالي الإيرادات',
                  value: formatCurrency(dashData.totalRevenue),
                  color: '#FFB74D',
                },
                { label: 'الصفقات المكتسبة', value: dashData.wonDeals, color: '#81C784' },
                {
                  label: 'متوسط حجم الصفقة',
                  value: formatCurrency(dashData.avgDealSize),
                  color: '#4FC3F7',
                },
                { label: 'معدل التحويل', value: `${dashData.conversionRate}%`, color: '#BA68C8' },
              ].map((k, i) => (
                <Grid item xs={6} md={3} key={i}>
                  <Card sx={{ borderRadius: 2, borderRight: `4px solid ${k.color}` }}>
                    <CardContent sx={{ py: 2 }}>
                      <Typography variant="h5" fontWeight={700} color={k.color}>
                        {k.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {k.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Revenue Chart */}
          <Grid item xs={12} md={8}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  الإيرادات الشهرية والصفقات
                </Typography>
                <ResponsiveContainer width="100%" height={330}>
                  <BarChart data={dashData.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <ReTooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="won"
                      fill="#81C784"
                      name="صفقات ناجحة"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="lost"
                      fill="#E57373"
                      name="صفقات خاسرة"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FFB74D"
                      strokeWidth={2}
                      name="الإيرادات"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Performers */}
          <Grid item xs={12} md={4}>
            <Card sx={{ borderRadius: 2, height: 400 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  أفضل المندوبين
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الصفقات</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الإيرادات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashData.topPerformers.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Chip
                              size="small"
                              label={i + 1}
                              sx={{
                                bgcolor: i < 3 ? COLORS[i] + '22' : 'action.hover',
                                fontWeight: 700,
                                width: 28,
                                height: 24,
                              }}
                            />
                          </TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.deals}</TableCell>
                          <TableCell>{formatCurrency(p.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 1: Conversion Rates */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, p: 3, textAlign: 'center', mb: 2 }}>
              <Typography variant="h3" fontWeight={700} color="primary">
                {conversionData.overall.rate}%
              </Typography>
              <Typography variant="body1" color="text.secondary">
                معدل التحويل الإجمالي ({conversionData.overall.converted} من{' '}
                {conversionData.overall.total})
              </Typography>
              <Typography variant="caption" color="text.disabled">
                متوسط وقت التحويل: {conversionData.avgTimeToConvert}
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  معدل التحويل حسب المصدر
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={conversionData.bySource} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis dataKey="source" type="category" width={120} />
                    <ReTooltip formatter={v => `${v}%`} />
                    <Bar dataKey="rate" fill="#4FC3F7" radius={[0, 6, 6, 0]} name="معدل التحويل" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  تفاصيل التحويل حسب المصدر
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>المصدر</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الإجمالي</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المحول</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المعدل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conversionData.bySource.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell>{s.source}</TableCell>
                          <TableCell>{s.total}</TableCell>
                          <TableCell>{s.converted}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={s.rate}
                                sx={{
                                  flex: 1,
                                  height: 8,
                                  borderRadius: 4,
                                  '& .MuiLinearProgress-bar': { borderRadius: 4 },
                                }}
                              />
                              <Typography variant="caption" fontWeight={600}>
                                {s.rate}%
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Source Analysis */}
      {tab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  توزيع مصادر العملاء
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={dashData.sourceDistribution}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={130}
                      label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dashData.sourceDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <ReTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  فعالية المصادر
                </Typography>
                {dashData.sourceDistribution.map((s, i) => {
                  const total = dashData.sourceDistribution.reduce((a, b) => a + b.count, 0);
                  const pct = ((s.count / total) * 100).toFixed(1);
                  return (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>
                          {s.source}
                        </Typography>
                        <Typography variant="body2">
                          {s.count} عميل ({pct}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={+pct}
                        sx={{
                          height: 10,
                          borderRadius: 5,
                          bgcolor: COLORS[i % COLORS.length] + '22',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: COLORS[i % COLORS.length],
                            borderRadius: 5,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Monthly Trends */}
      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, height: 420 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  اتجاهات الإيرادات الشهرية
                </Typography>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={dashData.monthlyTrend}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFB74D" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FFB74D" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ReTooltip formatter={v => formatCurrency(v)} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#FFB74D"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="الإيرادات"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  اتجاه معدلات التحويل
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={conversionData.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <ReTooltip formatter={v => `${v}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      stroke="#4FC3F7"
                      strokeWidth={2}
                      name="معدل التحويل"
                      dot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#BA68C8"
                      strokeWidth={2}
                      name="الإجمالي"
                      dot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="converted"
                      stroke="#81C784"
                      strokeWidth={2}
                      name="المحول"
                      dot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
