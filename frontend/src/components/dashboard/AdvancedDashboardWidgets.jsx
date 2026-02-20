/**
 * Advanced Dashboard Widgets
 * Professional visualization components with real-time updates
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  CircularProgress,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Edit,
  Delete,
  MoreVert,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Cell,
  Pie,
  PieChart,
  HeatMapChart,
} from 'recharts';

/**
 * KPI Trend Widget
 */
export const KPITrendWidget = ({ kpi, historicalData = [] }) => {
  const formatValue = (value) => {
    if (value > 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value > 1000) return `${(value / 1000).toFixed(1)}K`;
    return value;
  };

  const trend = kpi.changePercent > 0 ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#4caf50' : '#f44336';

  return (
    <Card sx={{ h: '100%' }}>
      <CardHeader
        title={kpi.name}
        subheader={kpi.description}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {trend === 'up' ? (
              <TrendingUp sx={{ color: '#4caf50' }} />
            ) : (
              <TrendingDown sx={{ color: '#f44336' }} />
            )}
            <Typography variant="body2" sx={{ color: trendColor }}>
              {kpi.changePercent > 0 ? '+' : ''}{kpi.changePercent}%
            </Typography>
          </Box>
        }
      />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            {formatValue(kpi.current)}
            <span style={{ fontSize: '0.6em', marginLeft: '8px', color: '#999' }}>
              {kpi.unit}
            </span>
          </Typography>
          <Typography variant="caption" color="textSecondary">
            الهدف: {formatValue(kpi.target)}
          </Typography>
        </Box>

        {/* Mini chart */}
        {historicalData.length > 0 && (
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={historicalData}>
              <Area
                type="monotone"
                dataKey="value"
                fill={trendColor}
                stroke={trendColor}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* Progress bar */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="textSecondary">
              التقدم لـ الهدف
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {((kpi.current / kpi.target) * 100).toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min((kpi.current / kpi.target) * 100, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: trendColor,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

/**
 * Performance Gauge Widget
 */
export const PerformanceGaugeWidget = ({ title, value, max = 100, status = 'healthy' }) => {
  const getGaugeColor = () => {
    if (value >= max * 0.9) return '#4caf50';
    if (value >= max * 0.7) return '#ff9800';
    return '#f44336';
  };

  const percentage = (value / max) * 100;

  return (
    <Card sx={{ textAlign: 'center' }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
          <CircularProgress
            variant="determinate"
            value={percentage}
            size={120}
            sx={{
              color: getGaugeColor(),
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              },
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {value}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              من {max}
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" sx={{ color: getGaugeColor(), fontWeight: 'bold' }}>
          {status}
        </Typography>
      </CardContent>
    </Card>
  );
};

/**
 * Comparative Analysis Widget
 */
export const ComparativeAnalysisWidget = ({ data = [], compareBy = 'department' }) => {
  return (
    <Card>
      <CardHeader title={`تحليل مقارن - ${compareBy}`} />
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="actual" fill="#2196f3" />
            <Bar dataKey="target" fill="#4caf50" />
            <Bar dataKey="variance" fill="#ff9800" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Anomaly Detection Widget
 */
export const AnomalyDetectionWidget = ({ anomalies = [] }) => {
  const getAnomalySeverity = (severity) => {
    switch (severity) {
      case 'critical':
        return { color: '#f44336', label: 'حرج' };
      case 'warning':
        return { color: '#ff9800', label: 'تحذير' };
      default:
        return { color: '#2196f3', label: 'معلومة' };
    }
  };

  return (
    <Card>
      <CardHeader title="كشف الحالات الشاذة" />
      <CardContent>
        {anomalies.length === 0 ? (
          <Typography color="textSecondary">لا توجد حالات شاذة في البيانات</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {anomalies.map((anomaly, idx) => {
              const { color, label } = getAnomalySeverity(anomaly.severity);
              return (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    border: `1px solid ${color}`,
                    borderRadius: 1,
                    backgroundColor: `${color}15`,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {anomaly.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ 
                        backgroundColor: color, 
                        color: 'white', 
                        px: 1, 
                        borderRadius: 1 
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(anomaly.timestamp).toLocaleString('ar-SA')}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Forecast Widget
 */
export const ForecastWidget = ({ kpiName, forecast = null }) => {
  if (!forecast) {
    return (
      <Card>
        <CardContent>
          <Typography color="textSecondary">بيانات التنبؤ غير متاحة</Typography>
        </CardContent>
      </Card>
    );
  }

  const forecastData = [
    { period: 'الحالي', value: forecast.lastObservedValue },
    ...forecast.predictions.map(p => ({
      period: `الفترة +${p.period}`,
      value: p.predictedValue,
    })),
  ];

  return (
    <Card>
      <CardHeader
        title={`التنبؤ - ${kpiName}`}
        subheader={`الثقة: ${forecast.predictions[0]?.confidence || 0}%`}
      />
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={forecastData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" name="القيمة المتنبأ بها" stroke="#2196f3" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

/**
 * Heatmap Widget - Summary of multiple KPIs
 */
export const HeatmapWidget = ({ kpis = [] }) => {
  const getHeatColor = (value) => {
    if (value > 80) return '#4caf50';
    if (value > 60) return '#8bc34a';
    if (value > 40) return '#ff9800';
    if (value > 20) return '#ff7043';
    return '#f44336';
  };

  const heatmapData = kpis.map(kpi => ({
    name: kpi.name,
    value: Math.min((kpi.current / kpi.target) * 100, 100),
  }));

  return (
    <Card>
      <CardHeader title="خريطة حرارية لأداء المؤشرات" />
      <CardContent>
        <Grid container spacing={2}>
          {heatmapData.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.name}>
              <Box
                sx={{
                  p: 2,
                  backgroundColor: getHeatColor(item.value),
                  borderRadius: 1,
                  color: 'white',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption">{item.name}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
                  {item.value.toFixed(0)}%
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * Recommendations Widget
 */
export const RecommendationsWidget = ({ recommendations = [] }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'low':
        return '#4caf50';
      default:
        return '#2196f3';
    }
  };

  return (
    <Card>
      <CardHeader title="التوصيات الذكية" />
      <CardContent>
        {recommendations.length === 0 ? (
          <Typography color="textSecondary">لا توجد توصيات متاحة</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recommendations.map((rec, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  border: `2px solid ${getPriorityColor(rec.priority)}`,
                  borderRadius: 1,
                  backgroundColor: `${getPriorityColor(rec.priority)}10`,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {rec.action}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      backgroundColor: getPriorityColor(rec.priority),
                      color: 'white',
                      px: 1,
                      borderRadius: 0.5,
                      textTransform: 'uppercase',
                    }}
                  >
                    {rec.priority}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {rec.details}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  <strong>التأثير المتوقع:</strong> {rec.estimatedImpact}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Multi-metric Radar Chart
 */
export const RadarAnalysisWidget = ({ metrics = [] }) => {
  return (
    <Card>
      <CardHeader title="تحليل الأداء متعدد المقاييس" />
      <CardContent>
        {metrics.length === 0 ? (
          <Typography color="textSecondary">لا توجد مقاييس متاحة</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={metrics}>
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="الأداء الفعلي"
                dataKey="actual"
                stroke="#2196f3"
                fill="#2196f3"
                fillOpacity={0.5}
              />
              <Radar
                name="الهدف"
                dataKey="target"
                stroke="#4caf50"
                fill="#4caf50"
                fillOpacity={0.5}
              />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default {
  KPITrendWidget,
  PerformanceGaugeWidget,
  ComparativeAnalysisWidget,
  AnomalyDetectionWidget,
  ForecastWidget,
  HeatmapWidget,
  RecommendationsWidget,
  RadarAnalysisWidget,
};
