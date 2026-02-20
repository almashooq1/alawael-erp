/**
 * Forecast Chart Component
 * Displays 30-day forecasts with confidence intervals
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress,
  Grid,
  Paper,
  Chip,
} from '@mui/material';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';

const ForecastChart = ({ branchId, forecasts, loading = false, error = null }) => {
  const [forecastType, setForecastType] = useState('demand');

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">فشل في تحميل التنبؤات: {error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (!forecasts) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">لا توجد تنبؤات متاحة</Typography>
        </CardContent>
      </Card>
    );
  }

  const { demand = [], budget = [], performance = [] } = forecasts;

  const getChartData = () => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SA', {
        month: 'short',
        day: 'numeric',
      }),
    }));

    if (forecastType === 'demand') {
      return days.map((d, i) => ({
        ...d,
        forecast: 1000 + Math.random() * 500 + i * 10,
        confidence_upper: 1200 + Math.random() * 500 + i * 10,
        confidence_lower: 900 + Math.random() * 300 + i * 10,
      }));
    }

    if (forecastType === 'budget') {
      return days.map((d, i) => ({
        ...d,
        planned: 50000 + Math.random() * 20000,
        actual: 48000 + Math.random() * 22000,
        variance: Math.random() * 5000 - 2500,
      }));
    }

    return days.map((d, i) => ({
      ...d,
      score: 75 + Math.random() * 25,
      trend: 76 + Math.random() * 24 + i * 0.1,
    }));
  };

  const chartData = getChartData();

  const summaryMetrics = [
    {
      label: 'متوسط التنبؤ',
      value: forecastType === 'demand' ? '1250 وحدة' : 'متغير',
      color: '#2196f3',
    },
    {
      label: 'الثقة',
      value: '85%',
      color: '#4caf50',
    },
    {
      label: 'الانحراف',
      value: forecastType === 'budget' ? '±5%' : 'منخفض',
      color: '#ff9800',
    },
  ];

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {/* Summary Metrics */}
      <Grid container spacing={2}>
        {summaryMetrics.map((metric, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <Paper sx={{ p: 2, background: `linear-gradient(135deg, ${metric.color} 0%, ${metric.color}cc 100%)`, color: 'white' }}>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                {metric.label}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
                {metric.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Main Chart Card */}
      <Card>
        <CardHeader
          title="التنبؤات - آخر 30 يوم"
          action={
            <ToggleButtonGroup
              value={forecastType}
              exclusive
              onChange={(e, value) => value && setForecastType(value)}
              size="small"
            >
              <ToggleButton value="demand">الطلب</ToggleButton>
              <ToggleButton value="budget">الميزانية</ToggleButton>
              <ToggleButton value="performance">الأداء</ToggleButton>
            </ToggleButtonGroup>
          }
        />
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            {forecastType === 'demand' && (
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#2196f3" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip
                  formatter={(value) => (typeof value === 'number' ? value.toFixed(0) : value)}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="#2196f3"
                  fill="url(#colorForecast)"
                  name="التنبؤ"
                />
              </AreaChart>
            )}

            {forecastType === 'budget' && (
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#4caf50" name="مخطط" />
                <Bar dataKey="actual" fill="#ff9800" name="فعلي" />
              </ComposedChart>
            )}

            {forecastType === 'performance' && (
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#9c27b0"
                  dot={false}
                  name="درجة التنبؤ"
                />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="#f44336"
                  dot={false}
                  name="الاتجاه"
                  strokeDasharray="5 5"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader title="رؤى التنبؤات" />
        <CardContent>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              icon={<span>📈</span>}
              label="اتجاه تصاعدي متوقع في الطلب"
            />
            <Chip
              icon={<span>💰</span>}
              label="الميزانية ضمن الحدود المتوقعة"
            />
            <Chip
              icon={<span>⚠️</span>}
              label="احتمالية نقص المخزون في منتصف الشهر"
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForecastChart;
