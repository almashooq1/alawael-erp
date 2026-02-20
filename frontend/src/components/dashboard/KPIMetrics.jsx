/**
 * KPI Metrics Component
 * Displays detailed KPI metrics with charts
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Box,
  Grid,
  Typography,
  LinearProgress,
  Chip,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const KPIMetrics = ({ branchId, kpis, loading = false, error = null }) => {
  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            فشل في تحميل مقاييس الأداء: {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title={<Skeleton width="40%" />} />
        <CardContent>
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} key={i}>
                <Skeleton height={100} />
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    );
  }

  if (!kpis) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">لا توجد بيانات متاحة</Typography>
        </CardContent>
      </Card>
    );
  }

  const { overallScore = 0, trend = 'stable', kpis: metrics = {} } = kpis;

  const getScoreColor = (score) => {
    if (score >= 80) return '#4caf50';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const MetricCard = ({ label, value, unit = '', benchmark = 100, showTrend = false }) => (
    <Card sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        {unit && (
          <Typography variant="body2" color="textSecondary">
            {unit}
          </Typography>
        )}
      </Box>
      {showTrend && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
          {trend === 'upward' ? (
            <>
              <TrendingUp sx={{ fontSize: '16px', color: '#4caf50' }} />
              <Typography variant="caption" sx={{ color: '#4caf50' }}>
                تصاعدي
              </Typography>
            </>
          ) : (
            <>
              <TrendingDown sx={{ fontSize: '16px', color: '#f44336' }} />
              <Typography variant="caption" sx={{ color: '#f44336' }}>
                تنازلي
              </Typography>
            </>
          )}
        </Box>
      )}
      {benchmark && (
        <LinearProgress
          variant="determinate"
          value={Math.min((value / benchmark) * 100, 100)}
          sx={{
            mt: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#e0e0e0',
            '& .MuiLinearProgress-bar': {
              backgroundColor: getScoreColor((value / benchmark) * 100),
            },
          }}
        />
      )}
    </Card>
  );

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 2 }}>
      {/* Overall Score Card */}
      <Card sx={{ gridColumn: 'span 1', background: `linear-gradient(135deg, ${getScoreColor(overallScore)} 0%, ${getScoreColor(overallScore)}cc 100%)`, color: 'white' }}>
        <CardContent sx={{ textAlign: 'center', py: 3 }}>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            درجة الأداء الإجمالية
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
            {overallScore}%
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {trend === 'upward' && (
              <>
                <TrendingUp />
                <Chip label="تحسن مستمر" size="small" variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
              </>
            )}
            {trend === 'downward' && (
              <>
                <TrendingDown />
                <Chip label="انخفاض" size="small" variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
              </>
            )}
            {trend === 'stable' && (
              <>
                <CheckCircle />
                <Chip label="مستقر" size="small" variant="outlined" sx={{ color: 'white', borderColor: 'white' }} />
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Individual Metrics */}
      {Object.entries(metrics).map(([key, value]) => (
        <MetricCard
          key={key}
          label={formatMetricLabel(key)}
          value={value}
          unit={getMetricUnit(key)}
          benchmark={getMetricBenchmark(key)}
        />
      ))}

      {/* Sample Chart */}
      {metrics?.revenue && (
        <Card sx={{ gridColumn: 'span 1' }}>
          <CardHeader title="اتجاه الإيرادات (عينة)" />
          <CardContent sx={{ height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={generateTrendData()}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#2196f3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

// Helper Functions
const formatMetricLabel = (key) => {
  const labels = {
    revenue: 'الإيرادات',
    efficiency: 'الكفاءة',
    quality: 'الجودة',
    productivity: 'الإنتاجية',
    customerSatisfaction: 'رضا العملاء',
    operationalCost: 'التكاليف التشغيلية',
  };
  return labels[key] || key;
};

const getMetricUnit = (key) => {
  const units = {
    revenue: 'ريال',
    efficiency: '%',
    quality: '%',
    productivity: '%',
    customerSatisfaction: '%',
    operationalCost: 'ريال',
  };
  return units[key] || '';
};

const getMetricBenchmark = (key) => {
  const benchmarks = {
    revenue: 1000000,
    efficiency: 100,
    quality: 100,
    productivity: 100,
    customerSatisfaction: 100,
    operationalCost: 500000,
  };
  return benchmarks[key] || 100;
};

const generateTrendData = () => {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
  return months.map((month, i) => ({
    name: month,
    value: 50000 + Math.random() * 100000 + i * 10000,
  }));
};

export default KPIMetrics;
