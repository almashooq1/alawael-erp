import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Paper, Chip, Skeleton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import performanceService from '../../../services/performance.service';
import { getMetricThresholds, getRatingColor } from '../../../utils/performanceMonitor';

const VITAL_NAMES = [
  { key: 'LCP', label: 'LCP', unit: 'ms' },
  { key: 'INP', label: 'INP', unit: 'ms' },
  { key: 'CLS', label: 'CLS', unit: '' },
  { key: 'FCP', label: 'FCP', unit: 'ms' },
  { key: 'TTFB', label: 'TTFB', unit: 'ms' },
];

function getUnit(name) {
  return VITAL_NAMES.find(v => v.key === name)?.unit || '';
}

export default function WebVitalsSection() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await performanceService.getWebVitals({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          groupBy: 'day',
        });
        setData(response.data?.data || { overall: [], trends: [], distribution: {} });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ mt: 3 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
        <Typography color="error">خطأ في تحميل مقاييس Web Vitals: {error}</Typography>
      </Paper>
    );
  }

  const overallMap =
    data?.overall?.reduce((acc, item) => {
      acc[item.name] = item;
      return acc;
    }, {}) || {};

  const trendMap = {};
  data?.trends?.forEach(item => {
    if (!trendMap[item.date]) trendMap[item.date] = { date: item.date };
    trendMap[item.date][item.name] = item.avg;
  });
  const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Web Vitals — المقاييس الحية
      </Typography>

      <Grid container spacing={2}>
        {VITAL_NAMES.map(({ key, label }) => {
          const metric = overallMap[key];
          const value = metric?.avg ?? '-';
          const thresholds = getMetricThresholds(key);
          const rating = metric
            ? value <= thresholds.good
              ? 'good'
              : value <= thresholds.poor
                ? 'needs-improvement'
                : 'poor'
            : 'unknown';
          const color = getRatingColor(rating);

          return (
            <Grid item xs={12} sm={6} md={4} lg={2.4} key={key}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, borderLeft: `4px solid ${color}` }}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, my: 0.5 }}>
                  {typeof value === 'number'
                    ? `${Math.round(value * 1000) / 1000}${getUnit(key)}`
                    : value}
                </Typography>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Chip
                    size="small"
                    label={
                      rating === 'good'
                        ? 'جيد'
                        : rating === 'needs-improvement'
                          ? 'يحتاج تحسين'
                          : rating === 'poor'
                            ? 'ضعيف'
                            : 'غير معروف'
                    }
                    sx={{ bgcolor: `${color}20`, color, fontWeight: 600 }}
                  />
                  {metric && (
                    <Typography variant="caption" color="text.secondary">
                      {metric.count} قياس
                    </Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {trendData.length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            اتجاهات المقاييس (آخر 7 أيام)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="LCP" stroke="#8884d8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="INP" stroke="#82ca9d" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="FCP" stroke="#ffc658" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="TTFB" stroke="#ff7300" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {data?.distribution && Object.keys(data.distribution).length > 0 && (
        <Paper elevation={0} sx={{ p: 3, mt: 3, borderRadius: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            توزيع التقييمات
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={VITAL_NAMES.map(({ key }) => ({
                name: key,
                good: data.distribution[key]?.good || 0,
                needsImprovement: data.distribution[key]?.['needs-improvement'] || 0,
                poor: data.distribution[key]?.poor || 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="good" stackId="a" fill="#10b981" />
              <Bar dataKey="needsImprovement" stackId="a" fill="#f59e0b" />
              <Bar dataKey="poor" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
