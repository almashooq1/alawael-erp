/**
 * 🏥 ClinicalOverview — Rehabilitation & Therapy Summary
 * نظرة شاملة على العمليات السريرية والتأهيلية
 */

import React from 'react';
import { useTheme } from '@mui/material';
import { chartColors, brandColors } from 'theme/palette';

const COLORS = chartColors.main;

const ClinicalCard = ({ icon, label, value, subtitle, color, progress, index = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 15, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay: index * 0.07, duration: 0.4, ease: 'easeOut' }}
    whileHover={{ y: -3, scale: 1.02 }}
  >
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        background: `${color}08`,
        border: `1px solid ${color}15`,
        transition: 'all 0.3s',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': { boxShadow: `0 6px 20px ${color}20` },
      }}
    >
      {/* Decorative corner gradient */}
      <Box sx={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, borderRadius: '50%', background: color, opacity: 0.06 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            '& svg': { fontSize: 20 },
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem', display: 'block' }}>
            {label}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem', lineHeight: 1.2 }}>
            {value}
          </Typography>
        </Box>
      </Box>
      {subtitle && (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.7rem' }}>
          {subtitle}
        </Typography>
      )}
      {progress !== undefined && (
        <Box sx={{ mt: 1 }}>
          <MuiTooltip title={`${progress}% مكتمل`} arrow placement="top">
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${color}15`,
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                  transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                },
              }}
            />
          </MuiTooltip>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem', mt: 0.5, display: 'block', textAlign: 'left' }}>
            {progress}%
          </Typography>
        </Box>
      )}
    </Box>
  </motion.div>
);

const ClinicalOverview = ({ clinical = {}, charts = {}, delay = 0 }) => {
  const theme = useTheme();
  const legendColor = theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : undefined;
  const sessionStatusData = charts.sessionStatus || [];

  const cards = [
    {
      icon: <LocalHospitalIcon />,
      label: clinical.programs?.label || 'البرامج العلاجية',
      value: clinical.programs?.active || 0,
      subtitle: `${clinical.programs?.total || 0} إجمالي`,
      color: brandColors.primaryStart,
    },
    {
      icon: <AssignmentIcon />,
      label: clinical.carePlans?.label || 'خطط الرعاية',
      value: clinical.carePlans?.active || 0,
      subtitle: `${clinical.carePlans?.total || 0} إجمالي`,
      color: brandColors.accentGreen,
    },
    {
      icon: <FlagIcon />,
      label: clinical.goals?.label || 'الأهداف',
      value: `${clinical.goals?.completed || 0} / ${clinical.goals?.total || 0}`,
      progress: clinical.goals?.progress || 0,
      color: brandColors.accentSky,
    },
    {
      icon: <HourglassEmptyIcon />,
      label: clinical.waitlist?.label || 'قائمة الانتظار',
      value: clinical.waitlist?.count || 0,
      color: brandColors.orangeGlow,
    },
    {
      icon: <StarIcon />,
      label: clinical.feedback?.label || 'رضا المستفيدين',
      value: clinical.feedback?.average ? `${clinical.feedback.average}/10` : 'N/A',
      subtitle: `${clinical.feedback?.count || 0} تقييم`,
      color: brandColors.accentPink,
    },
    {
      icon: <AccessibilityNewIcon />,
      label: clinical.disabilityPrograms?.label || 'برامج الإعاقة',
      value: clinical.disabilityPrograms?.active || 0,
      color: brandColors.accentRose,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
    >
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          p: 3,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'white',
          border: '1px solid',
          borderColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.3s',
          '&:hover': { boxShadow: '0 8px 32px rgba(0,0,0,0.08)' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
              العمليات السريرية
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              البرامج والتقييمات والأهداف العلاجية
            </Typography>
          </Box>
          {clinical.assessments?.total > 0 && (
            <Chip
              icon={<AssessmentIcon sx={{ fontSize: '14px !important' }} />}
              label={`${clinical.assessments.total} تقييم`}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>

        <Grid container spacing={2}>
          {/* Clinical metric cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={1.5}>
              {cards.map((card, i) => (
                <Grid item xs={6} sm={4} key={i}>
                  <ClinicalCard {...card} index={i} />
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Session Status Pie */}
          <Grid item xs={12} md={4}>
            <Box sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                حالة الجلسات
              </Typography>
            </Box>
            {sessionStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={sessionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {sessionStatusData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltip />} />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10, paddingTop: 8, color: legendColor }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.disabled">لا توجد بيانات</Typography>
              </Box>
            )}
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default React.memo(ClinicalOverview);
