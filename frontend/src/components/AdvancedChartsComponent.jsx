import { useState } from 'react';

import exportService from 'services/exportService';
import logger from 'utils/logger';
import { gradients, brandColors, surfaceColors } from 'theme/palette';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Paper,
  Select,
  Tooltip,
  Typography
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';

/** Shared Recharts tooltip styles (DRY — used across all chart types) */
const TOOLTIP_STYLES = {
  contentStyle: { backgroundColor: surfaceColors.background, border: 'none', borderRadius: '8px' },
  labelStyle: { color: brandColors.primaryStart },
};

/** Custom chart color palette derived from brand */
const COLORS = [
  brandColors.primaryStart,
  brandColors.primaryEnd,
  brandColors.accentPink,
  brandColors.accentCoral,
  brandColors.accentSky,
  brandColors.accentCyan,
  brandColors.accentGreen,
  brandColors.accentRose,
];

/**
 * مكون الرسوم البيانية المتقدمة
 * Advanced Charts Component
 *
 * يوفر رسوم بيانية متقدمة وتفاعلية
 * Provides advanced and interactive charts
 */

const AdvancedChartsComponent = ({ data = [], title = 'التحليلات المتقدمة' }) => {
  const [chartType, setChartType] = useState('line');
  const [loading, setLoading] = useState(false);
  const [dataRange, setDataRange] = useState('monthly');
  const [selectedMetrics, setSelectedMetrics] = useState(['value']);

  // بيانات نموذجية
  const sampleData = data.length > 0 ? data : [
    { name: 'يناير', value: 4000, target: 5000, actual: 4200, forecast: 4500 },
    { name: 'فبراير', value: 3000, target: 4800, actual: 2800, forecast: 3200 },
    { name: 'مارس', value: 2000, target: 5200, actual: 2200, forecast: 2800 },
    { name: 'أبريل', value: 2780, target: 5000, actual: 3000, forecast: 3200 },
    { name: 'مايو', value: 1890, target: 4800, actual: 2100, forecast: 2500 },
    { name: 'يونيو', value: 2390, target: 5500, actual: 2800, forecast: 3100 },
  ];

  const handleExport = async () => {
    try {
      setLoading(true);
      const fileName = `${title}-${new Date().toLocaleDateString('ar-SA')}`;
      await exportService.toExcel(sampleData, fileName);
    } catch (error) {
      logger.error('Error exporting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  // Line Chart
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={sampleData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke={brandColors.primaryStart} />
        <YAxis stroke={brandColors.primaryStart} />
        <Tooltip {...TOOLTIP_STYLES} />
        <Legend />
        <Line type="monotone" dataKey="value" stroke={brandColors.primaryStart} strokeWidth={2} dot={{ fill: brandColors.primaryStart, r: 5 }} />
        {selectedMetrics.includes('actual') && (
          <Line type="monotone" dataKey="actual" stroke={brandColors.primaryEnd} strokeWidth={2} dot={{ fill: brandColors.primaryEnd, r: 5 }} />
        )}
        {selectedMetrics.includes('forecast') && (
          <Line type="monotone" dataKey="forecast" stroke={brandColors.accentPink} strokeWidth={2} strokeDasharray="5 5" />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  // Bar Chart
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={sampleData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke={brandColors.primaryStart} />
        <YAxis stroke={brandColors.primaryStart} />
        <Tooltip {...TOOLTIP_STYLES} />
        <Legend />
        <Bar dataKey="value" fill={brandColors.primaryStart} radius={[8, 8, 0, 0]} />
        {selectedMetrics.includes('actual') && <Bar dataKey="actual" fill={brandColors.primaryEnd} radius={[8, 8, 0, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  );

  // Area Chart
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={sampleData}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={brandColors.primaryStart} stopOpacity={0.8} />
            <stop offset="95%" stopColor={brandColors.primaryStart} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke={brandColors.primaryStart} />
        <YAxis stroke={brandColors.primaryStart} />
        <Tooltip {...TOOLTIP_STYLES} />
        <Legend />
        <Area type="monotone" dataKey="value" stroke={brandColors.primaryStart} fillOpacity={1} fill="url(#colorValue)" />
        {selectedMetrics.includes('actual') && (
          <Area type="monotone" dataKey="actual" stroke={brandColors.primaryEnd} fillOpacity={0.3} fill={brandColors.primaryEnd} />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );

  // Pie Chart
  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie data={sampleData} cx="50%" cy="50%" labelLine={false} label dataKey="value">
          {sampleData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLES} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  // Radar Chart
  const renderRadarChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={sampleData}>
        <PolarGrid />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis />
        <Radar name="القيمة" dataKey="value" stroke={brandColors.primaryStart} fill={brandColors.primaryStart} fillOpacity={0.6} />
        {selectedMetrics.includes('actual') && (
          <Radar name="الفعلي" dataKey="actual" stroke={brandColors.primaryEnd} fill={brandColors.primaryEnd} fillOpacity={0.3} />
        )}
        <Legend />
        <Tooltip {...TOOLTIP_STYLES} />
      </RadarChart>
    </ResponsiveContainer>
  );

  // Composed Chart
  const renderComposedChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={sampleData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke={brandColors.primaryStart} />
        <YAxis stroke={brandColors.primaryStart} />
        <Tooltip {...TOOLTIP_STYLES} />
        <Legend />
        <Bar dataKey="value" fill={brandColors.primaryStart} radius={[8, 8, 0, 0]} />
        <Line type="monotone" dataKey="target" stroke={brandColors.accentPink} strokeWidth={2} />
        {selectedMetrics.includes('forecast') && (
          <Line type="monotone" dataKey="forecast" stroke={brandColors.accentGreen} strokeWidth={2} strokeDasharray="5 5" />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );

  // Scatter Chart
  const renderScatterChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="value" name="المحور الأفقي" stroke={brandColors.primaryStart} />
        <YAxis dataKey="target" name="المحور العمودي" stroke={brandColors.primaryStart} />
        <Tooltip {...TOOLTIP_STYLES} />
        <Scatter name="البيانات" data={sampleData} fill={brandColors.primaryStart} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  const chartConfigs = {
    line: { label: 'رسم بياني خطي', render: renderLineChart },
    bar: { label: 'رسم بياني عمودي', render: renderBarChart },
    area: { label: 'رسم بياني مساحي', render: renderAreaChart },
    pie: { label: 'رسم بياني دائري', render: renderPieChart },
    radar: { label: 'رسم بياني نجمي', render: renderRadarChart },
    composed: { label: 'رسم بياني مركب', render: renderComposedChart },
    scatter: { label: 'رسم بياني نقطي', render: renderScatterChart },
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card sx={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '12px' }}>
        <CardHeader
          title={title}
          subheader="رسوم بيانية متقدمة وتفاعلية"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                variant="outlined"
                size="small"
                disabled={loading}
              >
                تحديث
              </Button>
              <Button
                startIcon={<DownloadIcon />}
                onClick={handleExport}
                variant="contained"
                size="small"
                disabled={loading}
                sx={{
                  background: gradients.primary,
                }}
              >
                تصدير
              </Button>
            </Box>
          }
          sx={{
            background: gradients.primary,
            color: 'white',
          }}
        />
        <CardContent sx={{ p: 3 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={40} sx={{ color: brandColors.primaryStart }} />
            </Box>
          )}

          {!loading && (
            <>
              {/* Controls */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    value={chartType}
                    onChange={(e) => setChartType(e.target.value)}
                    fullWidth
                    sx={{ borderRadius: '8px' }}
                  >
                    {Object.entries(chartConfigs).map(([key, config]) => (
                      <MenuItem key={key} value={key}>
                        {config.label}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Select
                    value={dataRange}
                    onChange={(e) => setDataRange(e.target.value)}
                    fullWidth
                    sx={{ borderRadius: '8px' }}
                  >
                    <MenuItem value="daily">يومي</MenuItem>
                    <MenuItem value="weekly">أسبوعي</MenuItem>
                    <MenuItem value="monthly">شهري</MenuItem>
                    <MenuItem value="yearly">سنوي</MenuItem>
                  </Select>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {['value', 'actual', 'forecast'].map((metric) => (
                      <Chip
                        key={metric}
                        label={{
                          value: 'القيمة المتوقعة',
                          actual: 'القيمة الفعلية',
                          forecast: 'التنبؤ',
                        }[metric]}
                        onClick={() => {
                          setSelectedMetrics((prev) =>
                            prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
                          );
                        }}
                        color={selectedMetrics.includes(metric) ? 'primary' : 'default'}
                        variant={selectedMetrics.includes(metric) ? 'filled' : 'outlined'}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>

              {/* Chart */}
              <Paper
                sx={{
                  p: 2,
                  background: surfaceColors.backgroundLighter,
                  borderRadius: '8px',
                  mb: 2,
                }}
              >
                {chartConfigs[chartType].render()}
              </Paper>

              {/* Statistics */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '8px', background: surfaceColors.brandTintLight }}>
                    <Typography variant="h6" sx={{ color: brandColors.primaryStart, fontWeight: 'bold' }}>
                      {sampleData.reduce((sum, item) => sum + item.value, 0)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      إجمالي القيم
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '8px', background: surfaceColors.purpleTint }}>
                    <Typography variant="h6" sx={{ color: brandColors.primaryEnd, fontWeight: 'bold' }}>
                      {(sampleData.reduce((sum, item) => sum + item.value, 0) / sampleData.length).toFixed(0)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      المتوسط
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '8px', background: surfaceColors.roseTint }}>
                    <Typography variant="h6" sx={{ color: brandColors.accentCoral, fontWeight: 'bold' }}>
                      {Math.max(...sampleData.map((d) => d.value))}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      أقصى قيمة
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: '8px', background: surfaceColors.greenTint }}>
                    <Typography variant="h6" sx={{ color: brandColors.accentGreen, fontWeight: 'bold' }}>
                      {Math.min(...sampleData.map((d) => d.value))}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      أقل قيمة
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdvancedChartsComponent;
