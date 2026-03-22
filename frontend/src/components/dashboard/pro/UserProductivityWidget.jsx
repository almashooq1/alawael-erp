/**
 * 👤 UserProductivityWidget — ويدجت إنتاجية المستخدم
 * Professional user productivity tracker with goals, streaks, and achievements
 */
import React, { useState, useMemo } from 'react';
import {
  Box, Paper, Typography, Grid, LinearProgress, Chip, Avatar,
  IconButton, Tooltip, useTheme, Divider, Badge,
} from '@mui/material';
import { motion } from 'framer-motion';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import StarIcon from '@mui/icons-material/Star';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { useAuth } from 'contexts/AuthContext';
import { gradients, statusColors, brandColors, rankColors } from 'theme/palette';

const DAILY_GOALS = [
  { id: 'sessions', label: 'الجلسات المنجزة', current: 8, target: 10, icon: '📋', color: brandColors.primaryStart },
  { id: 'reports', label: 'التقارير المرسلة', current: 5, target: 5, icon: '📊', color: statusColors.success },
  { id: 'calls', label: 'المكالمات', current: 12, target: 15, icon: '📞', color: brandColors.accentSky },
  { id: 'reviews', label: 'المراجعات', current: 3, target: 4, icon: '✅', color: statusColors.warning },
];

const ACHIEVEMENTS = [
  { id: 1, title: 'منجز الأسبوع', desc: 'أكمل جميع المهام لمدة 5 أيام متتالية', icon: <EmojiEventsIcon />, earned: true, color: rankColors?.gold || '#FFD700' },
  { id: 2, title: 'نجم الفريق', desc: 'حقق أعلى إنتاجية في الفريق', icon: <StarIcon />, earned: true, color: brandColors.accentAmber },
  { id: 3, title: 'سلسلة مشتعلة', desc: '30 يوم متواصل بدون انقطاع', icon: <WhatshotIcon />, earned: false, color: statusColors.error },
  { id: 4, title: 'خبير التقارير', desc: 'أنشئ 100 تقرير هذا الشهر', icon: <WorkspacePremiumIcon />, earned: false, color: brandColors.primaryStart },
];

const WEEKLY_ACTIVITY = [
  { day: 'سبت', hours: 7.5, tasks: 12 },
  { day: 'أحد', hours: 8, tasks: 15 },
  { day: 'اثنين', hours: 6.5, tasks: 10 },
  { day: 'ثلاثاء', hours: 8.5, tasks: 18 },
  { day: 'أربعاء', hours: 7, tasks: 14 },
  { day: 'خميس', hours: 4, tasks: 8 },
  { day: 'جمعة', hours: 0, tasks: 0 },
];

const GoalProgress = ({ goal }) => {
  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
  const completed = goal.current >= goal.target;

  return (
    <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.15 }}>
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography fontSize="1rem">{goal.icon}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
              {goal.label}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: completed ? statusColors.success : 'text.primary' }}>
              {goal.current}/{goal.target}
            </Typography>
            {completed && <TaskAltIcon sx={{ fontSize: 14, color: statusColors.success }} />}
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={percent}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: `${goal.color}15`,
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: completed ? gradients.success : `linear-gradient(90deg, ${goal.color}80, ${goal.color})`,
            },
          }}
        />
      </Box>
    </motion.div>
  );
};

const ActivityBar = ({ day, hours, tasks, maxHours = 9 }) => {
  const theme = useTheme();
  const percent = Math.round((hours / maxHours) * 100);
  const isToday = new Date().getDay() === ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].indexOf(day);

  return (
    <Tooltip title={`${day}: ${hours} ساعة، ${tasks} مهمة`}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
        <Box
          sx={{
            width: 24,
            height: 80,
            borderRadius: 2,
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${percent}%` }}
            transition={{ duration: 0.8, delay: 0.1 }}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              borderRadius: 8,
              background: isToday ? gradients.primary : gradients.success,
              opacity: hours === 0 ? 0.2 : 1,
            }}
          />
        </Box>
        <Typography variant="caption" sx={{
          fontSize: '0.6rem',
          fontWeight: isToday ? 800 : 500,
          color: isToday ? brandColors.primaryStart : 'text.secondary',
        }}>
          {day}
        </Typography>
      </Box>
    </Tooltip>
  );
};

const UserProductivityWidget = () => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const isDark = theme.palette.mode === 'dark';

  const overallProgress = useMemo(() => {
    const totalCurrent = DAILY_GOALS.reduce((s, g) => s + g.current, 0);
    const totalTarget = DAILY_GOALS.reduce((s, g) => s + g.target, 0);
    return Math.round((totalCurrent / totalTarget) * 100);
  }, []);

  const weeklyHours = useMemo(() => WEEKLY_ACTIVITY.reduce((s, d) => s + d.hours, 0), []);
  const weeklyTasks = useMemo(() => WEEKLY_ACTIVITY.reduce((s, d) => s + d.tasks, 0), []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          background: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
        }}
      >
        {/* Header with user info */}
        <Box sx={{ background: gradients.accent, p: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Box sx={{
                  width: 20, height: 20, borderRadius: '50%', bgcolor: rankColors?.gold || '#FFD700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid white',
                }}>
                  <Typography sx={{ fontSize: 10 }}>🔥</Typography>
                </Box>
              }
            >
              <Avatar
                sx={{ width: 50, height: 50, bgcolor: 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '1.2rem' }}
              >
                {currentUser?.name?.[0] || 'م'}
              </Avatar>
            </Badge>
            <Box>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                {currentUser?.name || 'المدير'} — لوحة الإنتاجية
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip
                  size="small"
                  icon={<LocalFireDepartmentIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                  label="سلسلة 12 يوم"
                  sx={{ height: 22, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
                <Chip
                  size="small"
                  icon={<AutoGraphIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                  label={`إنتاجية ${overallProgress}%`}
                  sx={{ height: 22, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            {/* Daily Goals */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontSize: '0.85rem' }}>
                🎯 الأهداف اليومية
              </Typography>
              {DAILY_GOALS.map(goal => (
                <GoalProgress key={goal.id} goal={goal} />
              ))}
              <Box sx={{
                mt: 1, p: 1.5, borderRadius: 2,
                bgcolor: overallProgress >= 100 ? `${statusColors.success}10` : `${brandColors.primaryStart}08`,
                border: '1px solid',
                borderColor: overallProgress >= 100 ? `${statusColors.success}30` : `${brandColors.primaryStart}15`,
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>التقدم الإجمالي</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: overallProgress >= 100 ? statusColors.success : brandColors.primaryStart }}>
                    {overallProgress}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, overallProgress)}
                  sx={{
                    height: 8, borderRadius: 4,
                    bgcolor: 'rgba(0,0,0,0.05)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 4,
                      background: overallProgress >= 100 ? gradients.success : gradients.primary,
                    },
                  }}
                />
              </Box>
            </Grid>

            {/* Weekly Activity */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontSize: '0.85rem' }}>
                📅 نشاط الأسبوع
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', mb: 2 }}>
                {WEEKLY_ACTIVITY.map((d, i) => (
                  <ActivityBar key={i} {...d} />
                ))}
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Box sx={{
                    p: 1.5, borderRadius: 2, textAlign: 'center',
                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}>
                    <AccessTimeIcon sx={{ fontSize: 20, color: brandColors.primaryStart, mb: 0.3 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{weeklyHours} ساعة</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>إجمالي الساعات</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box sx={{
                    p: 1.5, borderRadius: 2, textAlign: 'center',
                    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  }}>
                    <TaskAltIcon sx={{ fontSize: 20, color: statusColors.success, mb: 0.3 }} />
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{weeklyTasks} مهمة</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>إجمالي المهام</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Achievements */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, fontSize: '0.85rem' }}>
            🏆 الإنجازات
          </Typography>
          <Grid container spacing={1}>
            {ACHIEVEMENTS.map(ach => (
              <Grid item xs={6} sm={3} key={ach.id}>
                <motion.div whileHover={{ scale: 1.03 }} transition={{ duration: 0.15 }}>
                  <Box
                    sx={{
                      p: 1.5, borderRadius: 2.5, textAlign: 'center',
                      border: '1px solid',
                      borderColor: ach.earned ? `${ach.color}30` : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                      bgcolor: ach.earned ? `${ach.color}08` : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                      opacity: ach.earned ? 1 : 0.5,
                      transition: 'all 0.3s',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 36, height: 36, mx: 'auto', mb: 0.5,
                        bgcolor: ach.earned ? `${ach.color}18` : 'rgba(0,0,0,0.05)',
                        color: ach.earned ? ach.color : 'text.disabled',
                        '& svg': { fontSize: 18 },
                      }}
                    >
                      {ach.icon}
                    </Avatar>
                    <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', fontSize: '0.7rem' }}>
                      {ach.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.55rem', display: 'block', lineHeight: 1.3 }}>
                      {ach.desc}
                    </Typography>
                  </Box>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default UserProductivityWidget;
