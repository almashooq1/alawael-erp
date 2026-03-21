/**
 * 📈 DashboardCharts v2 — Professional Chart Components
 * الرسوم البيانية الاحترافية للوحة التحكم — الإصدار الثاني
 */

import React, { useState } from 'react';
import { useTheme } from '@mui/material';


import { chartColors, brandColors, surfaceColors, surfaceColorsDark, neutralColors } from 'theme/palette';

const COLORS = chartColors.main;

/** Theme-aware axis tick color hook */
const useAxisColor = () => {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.45)' : neutralColors.textMuted;
};

/** Theme-aware grid stroke */
const useGridStroke = () => {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
};

/** Theme-aware chart legend color */
const useLegendColor = () => {
  const theme = useTheme();
  return theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined;
};

const ChartWrapper = ({ title, subtitle, children, delay = 0, minHeight }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      style={{ height: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          height: '100%',
          minHeight: minHeight || 'auto',
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#fff',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.3s',
          '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'text.primary' }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Tooltip title="تكبير الرسم البياني" arrow placement="top">
            <IconButton
              size="small"
              onClick={() => setExpanded(true)}
              sx={{
                opacity: 0.5,
                transition: 'opacity 0.2s',
                '&:hover': { opacity: 1, background: 'rgba(102,126,234,0.08)' },
              }}
              aria-label="تكبير الرسم البياني"
            >
              <FullscreenIcon sx={{ fontSize: 18, color: brandColors.primaryStart }} />
            </IconButton>
          </Tooltip>
        </Box>
        {children}
      </Paper>
    </motion.div>

    {/* Fullscreen Dialog */}
    <Dialog
      open={expanded}
      onClose={() => setExpanded(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          minHeight: '60vh',
          background: theme.palette.mode === 'dark' ? surfaceColorsDark.paper : '#fff',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>{title}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{subtitle}</Typography>}
        </Box>
        <IconButton size="small" onClick={() => setExpanded(false)} aria-label="إغلاق">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ minHeight: 400 }}>
        {children}
      </DialogContent>
    </Dialog>
    </>
  );
};

/* CustomTooltip extracted to shared/ChartTooltip.jsx */

/**
 * تسجيلات شهرية — مخطط مساحي
 */
export const RegistrationChart = React.memo(({ data = [], delay = 0 }) => {
  const hasData = data.length > 0 && data.some(d => d.value > 0);
  const axisColor = useAxisColor();
  const gridStroke = useGridStroke();
  return (
  <ChartWrapper title="التسجيلات الشهرية" subtitle="آخر 6 أشهر" delay={delay}>
    {!hasData ? (
      <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.disabled">لا توجد بيانات تسجيل</Typography>
      </Box>
    ) : (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="regGrad-registration" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={brandColors.primaryStart} stopOpacity={0.3} />
            <stop offset="95%" stopColor={brandColors.primaryStart} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <RechartsTooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={brandColors.primaryStart}
          strokeWidth={3}
          fill="url(#regGrad-registration)"
          name="التسجيلات"
          dot={{ r: 4, fill: brandColors.primaryStart, strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 6, fill: brandColors.primaryEnd }}
        />
      </AreaChart>
    </ResponsiveContainer>
    )}
  </ChartWrapper>
  );
});

/**
 * النشاط الأسبوعي — مخطط أعمدة
 */
export const ActivityChart = React.memo(({ data = [], delay = 0 }) => {
  const hasData = data.length > 0 && data.some(d => d.value > 0);
  const axisColor = useAxisColor();
  const gridStroke = useGridStroke();
  return (
  <ChartWrapper title="النشاط الأسبوعي" subtitle="آخر 7 أيام" delay={delay}>
    {!hasData ? (
      <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.disabled">لا توجد بيانات نشاط</Typography>
      </Box>
    ) : (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
        <RechartsTooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="الأنشطة" radius={[8, 8, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    )}
  </ChartWrapper>
  );
});

/**
 * توزيع الأدوار — مخطط دائري
 */
export const RoleDistributionChart = React.memo(({ data = [], delay = 0 }) => {
  const legendColor = useLegendColor();
  return (
  <ChartWrapper title="توزيع المستخدمين" subtitle="حسب الدور" delay={delay}>
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data.length > 0 ? data : [{ name: 'لا توجد بيانات', value: 1 }]}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {(data.length > 0 ? data : [{ name: 'لا توجد بيانات', value: 1 }]).map((_, i) => (
            <Cell key={i} fill={data.length > 0 ? COLORS[i % COLORS.length] : surfaceColors.divider} />
          ))}
        </Pie>
        <RechartsTooltip content={<ChartTooltip />} />
        {data.length > 0 && (
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10, color: legendColor }} />
        )}
      </PieChart>
    </ResponsiveContainer>
  </ChartWrapper>
  );
});

/**
 * حالة الجلسات — مخطط دائري
 */
export const SessionStatusChart = React.memo(({ data = [], delay = 0 }) => {
  const legendColor = useLegendColor();
  return (
  <ChartWrapper title="حالة الجلسات" subtitle="توزيع الحالات" delay={delay}>
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data.length > 0 ? data : [{ name: 'لا توجد بيانات', value: 1 }]}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {(data.length > 0 ? data : [{ name: 'لا توجد بيانات', value: 1 }]).map((_, i) => (
            <Cell key={i} fill={data.length > 0 ? COLORS[(i + 2) % COLORS.length] : surfaceColors.divider} />
          ))}
        </Pie>
        <RechartsTooltip content={<ChartTooltip />} />
        {data.length > 0 && (
          <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 10, color: legendColor }} />
        )}
      </PieChart>
    </ResponsiveContainer>
  </ChartWrapper>
  );
});

const DashboardCharts = {
  RegistrationChart,
  ActivityChart,
  RoleDistributionChart,
  SessionStatusChart,
};
export default DashboardCharts;
