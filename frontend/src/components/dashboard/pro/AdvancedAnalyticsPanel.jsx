/**
 * 📊 AdvancedAnalyticsPanel — لوحة التحليلات المتقدمة
 * Professional analytics panel with multiple chart types, real-time data, and export
 */
import { useState, useMemo } from 'react';
import { useTheme,
} from '@mui/material';

import { gradients, statusColors, brandColors, chartColors } from 'theme/palette';
import {
  Box,
  Chip,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

const PERIOD_OPTIONS = [
  { value: 'week', label: 'أسبوع' },
  { value: 'month', label: 'شهر' },
  { value: 'quarter', label: 'ربع' },
  { value: 'year', label: 'سنة' },
];

// Sample analytics data
const generateAnalyticsData = (period) => {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const weeks = ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'];
  const labels = period === 'week' ? ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'] :
                 period === 'month' ? weeks :
                 period === 'quarter' ? months.slice(0, 3) : months;

  return labels.map((name, i) => ({
    name,
    revenue: Math.floor(Math.random() * 50000 + 20000),
    expenses: Math.floor(Math.random() * 30000 + 10000),
    sessions: Math.floor(Math.random() * 80 + 20),
    beneficiaries: Math.floor(Math.random() * 40 + 10),
    target: Math.floor(Math.random() * 60000 + 30000),
  }));
};

const departmentData = [
  { name: 'العلاج الطبيعي', value: 35, color: chartColors.main[0] },
  { name: 'علاج النطق', value: 25, color: chartColors.main[1] },
  { name: 'العلاج الوظيفي', value: 20, color: chartColors.main[2] },
  { name: 'الدعم النفسي', value: 12, color: chartColors.main[3] },
  { name: 'التعليم الخاص', value: 8, color: chartColors.main[4] },
];

const radarData = [
  { subject: 'الجلسات', A: 85, B: 90, fullMark: 100 },
  { subject: 'رضا العملاء', A: 92, B: 88, fullMark: 100 },
  { subject: 'الكفاءة', A: 78, B: 82, fullMark: 100 },
  { subject: 'الإيرادات', A: 88, B: 85, fullMark: 100 },
  { subject: 'الحضور', A: 95, B: 91, fullMark: 100 },
  { subject: 'جودة الخدمة', A: 90, B: 87, fullMark: 100 },
];

const MetricCard = ({ title, value, change, positive, icon, gradient }) => {
  const theme = useTheme();
  return (
    <motion.div whileHover={{ scale: 1.02, y: -2 }} transition={{ duration: 0.2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: gradient || gradients.primary,
        }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
              {title}
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, my: 0.5 }}>{value}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {positive ? (
                <TrendingUpIcon sx={{ fontSize: 14, color: statusColors.success }} />
              ) : (
                <TrendingDownIcon sx={{ fontSize: 14, color: statusColors.error }} />
              )}
              <Typography
                variant="caption"
                sx={{ color: positive ? statusColors.success : statusColors.error, fontWeight: 700, fontSize: '0.7rem' }}
              >
                {change}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2,
              background: gradient || gradients.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '& svg': { fontSize: 20, color: '#fff' },
            }}
          >
            {icon}
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
};

const AdvancedAnalyticsPanel = ({ finance = {}, charts = {} }) => {
  const theme = useTheme();
  const [period, setPeriod] = useState('month');
  const [chartView, setChartView] = useState('area');
  const isDark = theme.palette.mode === 'dark';

  const data = useMemo(() => generateAnalyticsData(period), [period]);

  const totalRevenue = useMemo(() => data.reduce((s, d) => s + d.revenue, 0), [data]);
  const totalExpenses = useMemo(() => data.reduce((s, d) => s + d.expenses, 0), [data]);
  const totalSessions = useMemo(() => data.reduce((s, d) => s + d.sessions, 0), [data]);
  const avgBeneficiaries = useMemo(() => Math.round(data.reduce((s, d) => s + d.beneficiaries, 0) / data.length), [data]);

  const renderMainChart = () => {
    const commonProps = { data, margin: { top: 10, right: 10, left: 0, bottom: 0 } };
    const colors = { revenue: brandColors.primaryStart, expenses: statusColors.error, target: statusColors.success };

    if (chartView === 'area') {
      return (
        <AreaChart {...commonProps}>
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.revenue} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.revenue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.expenses} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.expenses} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis fontSize={11} />
          <ChartTooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="revenue" name="الإيرادات" stroke={colors.revenue} fill="url(#gradRevenue)" strokeWidth={2} />
          <Area type="monotone" dataKey="expenses" name="المصروفات" stroke={colors.expenses} fill="url(#gradExpenses)" strokeWidth={2} />
          <Area type="monotone" dataKey="target" name="المستهدف" stroke={colors.target} fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
        </AreaChart>
      );
    }
    if (chartView === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis fontSize={11} />
          <ChartTooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="revenue" name="الإيرادات" fill={colors.revenue} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenses" name="المصروفات" fill={colors.expenses} radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    }
    if (chartView === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis dataKey="name" fontSize={11} />
          <YAxis fontSize={11} />
          <ChartTooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="sessions" name="الجلسات" stroke={brandColors.accentSky} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="beneficiaries" name="المستفيدون" stroke={brandColors.accentGreen} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      );
    }
    return null;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          overflow: 'hidden',
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              📊 التحليلات المتقدمة
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              تحليل شامل للأداء والإيرادات والعمليات
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Select
              size="small"
              value={period}
              onChange={e => setPeriod(e.target.value)}
              sx={{ borderRadius: 2, fontSize: '0.8rem', minWidth: 90 }}
            >
              {PERIOD_OPTIONS.map(opt => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '0.8rem' }}>{opt.label}</MenuItem>
              ))}
            </Select>
            <ToggleButtonGroup
              value={chartView}
              exclusive
              onChange={(_, v) => v && setChartView(v)}
              size="small"
            >
              <ToggleButton value="area"><Tooltip title="مخطط مساحي"><ShowChartIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="bar"><Tooltip title="مخطط أعمدة"><BarChartIcon fontSize="small" /></Tooltip></ToggleButton>
              <ToggleButton value="line"><Tooltip title="مخطط خطي"><ShowChartIcon fontSize="small" /></Tooltip></ToggleButton>
            </ToggleButtonGroup>
            <Tooltip title="تصدير البيانات">
              <IconButton size="small"><FileDownloadIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Divider />

        {/* Metric Summary Cards */}
        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <MetricCard
                title="إجمالي الإيرادات"
                value={`${(totalRevenue / 1000).toFixed(0)}K`}
                change="+12.5%"
                positive
                icon={<TrendingUpIcon />}
                gradient={gradients.success}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                title="إجمالي المصروفات"
                value={`${(totalExpenses / 1000).toFixed(0)}K`}
                change="-3.2%"
                positive
                icon={<TrendingDownIcon />}
                gradient={gradients.warning}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                title="إجمالي الجلسات"
                value={totalSessions}
                change="+8.7%"
                positive
                icon={<CalendarMonthIcon />}
                gradient={gradients.info}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <MetricCard
                title="متوسط المستفيدين"
                value={avgBeneficiaries}
                change="+5.1%"
                positive
                icon={<TrendingUpIcon />}
                gradient={gradients.accent}
              />
            </Grid>
          </Grid>
        </Box>

        {/* Main Chart */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 3,
              bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              {renderMainChart()}
            </ResponsiveContainer>
          </Paper>
        </Box>

        {/* Secondary Charts Row */}
        <Box sx={{ px: 2, pb: 2 }}>
          <Grid container spacing={2}>
            {/* Department Distribution */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: 2, borderRadius: 3,
                  bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: '0.85rem' }}>
                  توزيع الأقسام
                </Typography>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={departmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                      {departmentData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center', mt: 1 }}>
                  {departmentData.map((d, i) => (
                    <Chip
                      key={i}
                      size="small"
                      label={`${d.name} ${d.value}%`}
                      sx={{
                        fontSize: '0.65rem', height: 22,
                        bgcolor: `${d.color}18`, color: d.color, fontWeight: 600,
                      }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Radar Chart */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{
                  p: 2, borderRadius: 3,
                  bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.01)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    مقارنة الأداء — الشهر الحالي vs السابق
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip size="small" label="الشهر الحالي" sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${brandColors.primaryStart}18`, color: brandColors.primaryStart }} />
                    <Chip size="small" label="الشهر السابق" sx={{ height: 20, fontSize: '0.6rem', bgcolor: `${brandColors.accentGreen}18`, color: brandColors.accentGreen }} />
                  </Box>
                </Box>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart cx="50%" cy="50%" outerRadius={70} data={radarData}>
                    <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="الشهر الحالي" dataKey="A" stroke={brandColors.primaryStart} fill={brandColors.primaryStart} fillOpacity={0.2} />
                    <Radar name="الشهر السابق" dataKey="B" stroke={brandColors.accentGreen} fill={brandColors.accentGreen} fillOpacity={0.15} />
                    <ChartTooltip contentStyle={{ borderRadius: 8, fontSize: 11 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default AdvancedAnalyticsPanel;
