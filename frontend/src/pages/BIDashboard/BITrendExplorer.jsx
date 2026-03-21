/**
 * BI Trend Explorer — مستكشف الاتجاهات
 *
 * Interactive trend analysis with metric selection,
 * time range controls, trend lines, and predictions.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  useTheme,
  alpha,
} from '@mui/material';

import { getTrends } from '../../services/biDashboard.service';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography
} from '@mui/material';
import TrendingUp from '@mui/icons-material/TrendingUp';
import TrendingDown from '@mui/icons-material/TrendingDown';
import Refresh from '@mui/icons-material/Refresh';

const METRICS = [
  { value: 'revenue', label: 'الإيرادات', color: '#4CAF50', icon: '💰' },
  { value: 'beneficiaries', label: 'المستفيدون الجدد', color: '#2196F3', icon: '👥' },
  { value: 'sessions', label: 'الجلسات', color: '#9C27B0', icon: '📋' },
  { value: 'complaints', label: 'الشكاوى', color: '#F44336', icon: '⚠️' },
  { value: 'attendance', label: 'نسبة الحضور', color: '#00BCD4', icon: '✅' },
];

const PERIODS = [
  { value: 3, label: '3 أشهر' },
  { value: 6, label: '6 أشهر' },
  { value: 12, label: 'سنة' },
  { value: 24, label: 'سنتين' },
];

export default function BITrendExplorer() {
  const theme = useTheme();
  const [metric, setMetric] = useState('revenue');
  const [months, setMonths] = useState(12);
  const [chartType, setChartType] = useState('area');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const currentMetric = METRICS.find((m) => m.value === metric);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTrends(metric, months);
      setData(result);
    } catch {
      setError('خطأ في تحميل بيانات الاتجاهات');
    } finally {
      setLoading(false);
    }
  }, [metric, months]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const points = data?.points || [];
  const trend = data?.trend || {};
  const summary = data?.summary || {};

  const avgValue = points.length > 0 ? points.reduce((s, p) => s + p.value, 0) / points.length : 0;

  const trendIcon =
    trend.direction === 'increasing' ? (
      <TrendingUp />
    ) : trend.direction === 'decreasing' ? (
      <TrendingDown />
    ) : (
      <TrendingFlat />
    );

  const trendColor =
    trend.direction === 'increasing'
      ? theme.palette.success.main
      : trend.direction === 'decreasing'
        ? theme.palette.error.main
        : theme.palette.grey[500];

  const trendLabel =
    trend.direction === 'increasing' ? 'تصاعدي' : trend.direction === 'decreasing' ? 'تنازلي' : 'مستقر';

  // Render chart based on type
  const renderChart = () => {
    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartTooltip />
            <ReferenceLine y={avgValue} stroke="#FF9800" strokeDasharray="5 5" label={{ value: 'المتوسط', position: 'right', fontSize: 11 }} />
            <Bar dataKey="value" fill={currentMetric?.color} name={currentMetric?.label} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={points}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartTooltip />
            <ReferenceLine y={avgValue} stroke="#FF9800" strokeDasharray="5 5" />
            <Line
              type="monotone"
              dataKey="value"
              stroke={currentMetric?.color}
              strokeWidth={3}
              dot={{ r: 5, fill: currentMetric?.color }}
              name={currentMetric?.label}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={points}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={currentMetric?.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={currentMetric?.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <RechartTooltip />
          <ReferenceLine y={avgValue} stroke="#FF9800" strokeDasharray="5 5" label={{ value: 'المتوسط', position: 'right', fontSize: 11 }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={currentMetric?.color}
            fill="url(#trendGrad)"
            strokeWidth={2}
            name={currentMetric?.label}
          />
        </AreaChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            مستكشف الاتجاهات
          </Typography>
          <Typography variant="body2" color="text.secondary">
            تحليل الاتجاهات الزمنية والتنبؤات
          </Typography>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchData} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>المقياس</InputLabel>
              <Select value={metric} label="المقياس" onChange={(e) => setMetric(e.target.value)}>
                {METRICS.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.icon} {m.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>الفترة</InputLabel>
              <Select value={months} label="الفترة" onChange={(e) => setMonths(e.target.value)}>
                {PERIODS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>
                    {p.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[
                { type: 'area', icon: <ShowChart />, label: 'مساحة' },
                { type: 'line', icon: <Timeline />, label: 'خطي' },
                { type: 'bar', icon: <ShowChart sx={{ transform: 'rotate(90deg)' }} />, label: 'أعمدة' },
              ].map((ct) => (
                <Tooltip title={ct.label} key={ct.type}>
                  <IconButton
                    onClick={() => setChartType(ct.type)}
                    color={chartType === ct.type ? 'primary' : 'default'}
                    sx={{
                      bgcolor: chartType === ct.type ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    }}
                  >
                    {ct.icon}
                  </IconButton>
                </Tooltip>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={60} />
        </Box>
      ) : (
        <>
          {/* Summary Strip */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  القيمة الحالية
                </Typography>
                <Typography variant="h5" fontWeight={700} color={currentMetric?.color}>
                  {(summary.current || 0).toLocaleString('ar-SA')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  القيمة السابقة
                </Typography>
                <Typography variant="h5" fontWeight={700}>
                  {(summary.previous || 0).toLocaleString('ar-SA')}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  التغيير
                </Typography>
                <Typography variant="h5" fontWeight={700} color={parseFloat(summary.change) >= 0 ? 'success.main' : 'error.main'}>
                  {summary.change > 0 ? '+' : ''}
                  {summary.change || 0}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  الاتجاه
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ color: trendColor }}>{trendIcon}</Box>
                  <Chip label={trendLabel} size="small" sx={{ bgcolor: alpha(trendColor, 0.1), color: trendColor, fontWeight: 600 }} />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Chart */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              {currentMetric?.icon} {currentMetric?.label} — آخر {months} شهر
            </Typography>
            {renderChart()}
          </Paper>
        </>
      )}
    </Box>
  );
}
