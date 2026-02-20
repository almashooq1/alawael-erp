/**
 * Executive Dashboard Component
 * لوحة التحكم التنفيذية
 * 
 * Features:
 * - Real-time KPIs display
 * - Interactive charts
 * - Performance metrics
 * - Quick actions
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Assessment as AssessmentIcon,
  MonetizationOn as MoneyIcon,
  People as PeopleIcon,
  ThumbUp as SatisfactionIcon,
  Speed as PerformanceIcon
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
  Area
} from 'recharts';
import axios from 'axios';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const STATUS_COLORS = {
  excellent: '#4caf50',
  good: '#2196f3',
  warning: '#ff9800',
  critical: '#f44336'
};

const STATUS_LABELS = {
  excellent: 'ممتاز',
  good: 'جيد',
  warning: 'تحذير',
  critical: 'حرج'
};

function ExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [timeRange, setTimeRange] = useState('month');
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboard();
  }, [timeRange]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.get('/api/analytics/dashboard/executive', {
        params: { timeRange }
      });

      setDashboardData(response.data.data);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.error || 'خطأ في تحميل لوحة التحكم');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export dashboard');
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
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={loadDashboard} sx={{ mt: 2 }}>
          إعادة المحاولة
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          لوحة التحكم التنفيذية
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>الفترة الزمنية</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="الفترة الزمنية"
            >
              <MenuItem value="week">أسبوع</MenuItem>
              <MenuItem value="month">شهر</MenuItem>
              <MenuItem value="quarter">ربع سنة</MenuItem>
              <MenuItem value="year">سنة</MenuItem>
            </Select>
          </FormControl>

          <IconButton 
            onClick={handleRefresh} 
            disabled={refreshing}
            color="primary"
          >
            <RefreshIcon />
          </IconButton>

          <IconButton onClick={handleExport} color="primary">
            <DownloadIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(e, newValue) => setSelectedTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="نظرة عامة" icon={<AssessmentIcon />} />
          <Tab label="الكفاءة التشغيلية" icon={<PerformanceIcon />} />
          <Tab label="الجودة والرضا" icon={<SatisfactionIcon />} />
          <Tab label="المالية" icon={<MoneyIcon />} />
        </Tabs>
      </Paper>

      {/* Content based on selected tab */}
      {selectedTab === 0 && <OverviewTab data={dashboardData} />}
      {selectedTab === 1 && <OperationalTab data={dashboardData} />}
      {selectedTab === 2 && <QualityTab data={dashboardData} />}
      {selectedTab === 3 && <FinancialTab data={dashboardData} />}
    </Container>
  );
}

/**
 * Overview Tab - النظرة العامة
 */
function OverviewTab({ data }) {
  const allKPIs = [
    ...(data?.operational || []),
    ...(data?.quality || []),
    ...(data?.satisfaction || []),
    ...(data?.financial || [])
  ];

  return (
    <Grid container spacing={3}>
      {/* Summary Cards */}
      <Grid item xs={12} md={3}>
        <SummaryCard
          title="المؤشرات الممتازة"
          value={allKPIs.filter(k => k.status === 'excellent').length}
          total={allKPIs.length}
          color="#4caf50"
          icon={<TrendingUpIcon />}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <SummaryCard
          title="المؤشرات الجيدة"
          value={allKPIs.filter(k => k.status === 'good').length}
          total={allKPIs.length}
          color="#2196f3"
          icon={<TrendingUpIcon />}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <SummaryCard
          title="تحذيرات"
          value={allKPIs.filter(k => k.status === 'warning').length}
          total={allKPIs.length}
          color="#ff9800"
          icon={<TrendingDownIcon />}
        />
      </Grid>
      
      <Grid item xs={12} md={3}>
        <SummaryCard
          title="حرجة"
          value={allKPIs.filter(k => k.status === 'critical').length}
          total={allKPIs.length}
          color="#f44336"
          icon={<TrendingDownIcon />}
        />
      </Grid>

      {/* Top KPIs */}
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            المؤشرات الرئيسية
          </Typography>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            {allKPIs.slice(0, 6).map((kpi) => (
              <Grid item xs={12} sm={6} md={4} key={kpi._id}>
                <KPICard kpi={kpi} />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Grid>

      {/* Status Distribution Chart */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            توزيع حالة المؤشرات
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'ممتاز', value: allKPIs.filter(k => k.status === 'excellent').length },
                  { name: 'جيد', value: allKPIs.filter(k => k.status === 'good').length },
                  { name: 'تحذير', value: allKPIs.filter(k => k.status === 'warning').length },
                  { name: 'حرج', value: allKPIs.filter(k => k.status === 'critical').length }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(STATUS_COLORS)[index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>

      {/* Category Distribution */}
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            المؤشرات حسب الفئة
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'تشغيلية', value: data?.operational?.length || 0 },
                { name: 'جودة', value: data?.quality?.length || 0 },
                { name: 'رضا', value: data?.satisfaction?.length || 0 },
                { name: 'مالية', value: data?.financial?.length || 0 }
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#2196f3" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Grid>
    </Grid>
  );
}

/**
 * Operational Tab - الكفاءة التشغيلية
 */
function OperationalTab({ data }) {
  const kpis = data?.operational || [];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          مؤشرات الكفاءة التشغيلية
        </Typography>
      </Grid>

      {kpis.map((kpi) => (
        <Grid item xs={12} md={6} lg={4} key={kpi._id}>
          <KPIDetailCard kpi={kpi} />
        </Grid>
      ))}

      {kpis.length === 0 && (
        <Grid item xs={12}>
          <Alert severity="info">لا توجد مؤشرات تشغيلية متاحة</Alert>
        </Grid>
      )}
    </Grid>
  );
}

/**
 * Quality Tab - الجودة والرضا
 */
function QualityTab({ data }) {
  const qualityKpis = data?.quality || [];
  const satisfactionKpis = data?.satisfaction || [];

  return (
    <Grid container spacing={3}>
      {/* Quality KPIs */}
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          مؤشرات الجودة
        </Typography>
      </Grid>

      {qualityKpis.map((kpi) => (
        <Grid item xs={12} md={6} lg={4} key={kpi._id}>
          <KPIDetailCard kpi={kpi} />
        </Grid>
      ))}

      {/* Satisfaction KPIs */}
      <Grid item xs={12} sx={{ mt: 3 }}>
        <Typography variant="h5" gutterBottom>
          مؤشرات الرضا
        </Typography>
      </Grid>

      {satisfactionKpis.map((kpi) => (
        <Grid item xs={12} md={6} lg={4} key={kpi._id}>
          <KPIDetailCard kpi={kpi} />
        </Grid>
      ))}

      {qualityKpis.length === 0 && satisfactionKpis.length === 0 && (
        <Grid item xs={12}>
          <Alert severity="info">لا توجد مؤشرات جودة أو رضا متاحة</Alert>
        </Grid>
      )}
    </Grid>
  );
}

/**
 * Financial Tab - المالية
 */
function FinancialTab({ data }) {
  const kpis = data?.financial || [];

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" gutterBottom>
          المؤشرات المالية
        </Typography>
      </Grid>

      {kpis.map((kpi) => (
        <Grid item xs={12} md={6} lg={4} key={kpi._id}>
          <KPIDetailCard kpi={kpi} />
        </Grid>
      ))}

      {/* Trend Chart */}
      {kpis.length > 0 && kpis[0].history && kpis[0].history.length > 0 && (
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              اتجاه المؤشرات المالية
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={kpis[0].history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString('ar-SA')}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(date) => new Date(date).toLocaleDateString('ar-SA')}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#2196f3" 
                  name="القيمة"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      )}

      {kpis.length === 0 && (
        <Grid item xs={12}>
          <Alert severity="info">لا توجد مؤشرات مالية متاحة</Alert>
        </Grid>
      )}
    </Grid>
  );
}

/**
 * Summary Card Component
 */
function SummaryCard({ title, value, total, color, icon }) {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ 
            bgcolor: color + '22', 
            p: 1, 
            borderRadius: 1, 
            mr: 2,
            color: color 
          }}>
            {icon}
          </Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h3" component="div">
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {percentage}% من الإجمالي
        </Typography>
      </CardContent>
    </Card>
  );
}

/**
 * KPI Card Component - Compact
 */
function KPICard({ kpi }) {
  const change = kpi.value.current - kpi.value.previous;
  const changePercent = kpi.value.previous > 0 
    ? ((change / kpi.value.previous) * 100).toFixed(1)
    : 0;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1 }}>
            {kpi.nameAr}
          </Typography>
          <Chip 
            label={STATUS_LABELS[kpi.status]} 
            size="small" 
            sx={{ 
              bgcolor: STATUS_COLORS[kpi.status] + '22',
              color: STATUS_COLORS[kpi.status]
            }} 
          />
        </Box>

        <Typography variant="h5" component="div" sx={{ mb: 1 }}>
          {kpi.value.current.toLocaleString('ar-SA')}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {kpi.unit}
          </Typography>
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {change !== 0 && (
            <>
              {change > 0 ? (
                <TrendingUpIcon sx={{ color: '#4caf50', fontSize: 20 }} />
              ) : (
                <TrendingDownIcon sx={{ color: '#f44336', fontSize: 20 }} />
              )}
              <Typography 
                variant="body2" 
                sx={{ color: change > 0 ? '#4caf50' : '#f44336' }}
              >
                {changePercent}%
              </Typography>
            </>
          )}
          <Typography variant="caption" color="text.secondary">
            الهدف: {kpi.value.target.toLocaleString('ar-SA')}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

/**
 * KPI Detail Card Component - Detailed
 */
function KPIDetailCard({ kpi }) {
  const progress = kpi.value.target > 0 
    ? (kpi.value.current / kpi.value.target) * 100 
    : 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {kpi.nameAr}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {kpi.code}
            </Typography>
          </Box>
          <Chip 
            label={STATUS_LABELS[kpi.status]} 
            sx={{ 
              bgcolor: STATUS_COLORS[kpi.status] + '22',
              color: STATUS_COLORS[kpi.status]
            }} 
          />
        </Box>

        <Typography variant="h3" component="div" sx={{ mb: 1 }}>
          {kpi.value.current.toLocaleString('ar-SA')}
          <Typography variant="body1" color="text.secondary" component="span" sx={{ ml: 1 }}>
            {kpi.unit}
          </Typography>
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">التقدم</Typography>
            <Typography variant="body2">{progress.toFixed(0)}%</Typography>
          </Box>
          <Box sx={{ 
            width: '100%', 
            height: 8, 
            bgcolor: 'grey.200', 
            borderRadius: 1,
            overflow: 'hidden'
          }}>
            <Box sx={{ 
              width: `${Math.min(progress, 100)}%`, 
              height: '100%', 
              bgcolor: STATUS_COLORS[kpi.status],
              transition: 'width 0.3s ease'
            }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            الهدف: {kpi.value.target.toLocaleString('ar-SA')}
          </Typography>
          {kpi.calculation?.lastCalculated && (
            <Typography variant="caption" color="text.secondary">
              آخر تحديث: {new Date(kpi.calculation.lastCalculated).toLocaleDateString('ar-SA')}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default ExecutiveDashboard;
