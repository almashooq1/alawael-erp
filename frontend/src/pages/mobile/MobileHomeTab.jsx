/**
 * MobileHomeTab.jsx — الرئيسية
 * Quick stats, next session card, weekly progress chart
 */
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Avatar,
  SpeedDial,
  SpeedDialAction,
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  EventNote as SessionIcon,
  Assignment as TaskIcon,
  Notifications as AlertIcon,
  TrendingUp as TrendIcon,
  Add as AddIcon,
  NoteAdd as NoteIcon,
  PersonAdd as PersonAddIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  mockStats,
  mockTodaySessions,
  mockPendingTasks,
  mockWeeklyProgress,
} from './mockData';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const speedDialActions = [
  { icon: <NoteIcon />, name: 'ملاحظة جلسة' },
  { icon: <PersonAddIcon />, name: 'مستفيد جديد' },
  { icon: <CalendarIcon />, name: 'حجز موعد' },
];

export default function MobileHomeTab({ onRefresh, refreshing }) {
  const [speedDialOpen, setSpeedDialOpen] = useState(false);
  const nextSession = mockTodaySessions.find((s) => s.status === 'upcoming');
  const inProgress = mockTodaySessions.find((s) => s.status === 'in-progress');
  const activeSession = inProgress || nextSession;

  return (
    <Box sx={{ px: 2, py: 2, pb: 4 }}>
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Typography
          variant="h5"
          fontWeight={800}
          sx={{ mb: 0.5, fontFamily: 'Tajawal, Cairo, sans-serif', color: 'text.primary' }}
        >
          صباح الخير، أحمد
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
          {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </Typography>
      </motion.div>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        {[
          { label: 'جلسات اليوم', value: mockStats.todaySessions, icon: <SessionIcon />, color: 'primary' },
          { label: 'مهام معلقة', value: mockStats.pendingTasks, icon: <TaskIcon />, color: 'warning' },
          { label: 'تنبيهات', value: mockStats.unreadNotifications, icon: <AlertIcon />, color: 'error' },
          { label: 'إنجاز الأسبوع', value: `${mockStats.completedSessionsThisWeek}`, icon: <TrendIcon />, color: 'success' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            style={{ flexShrink: 0, minWidth: 100 }}
          >
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                minHeight: 96,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                px: 1.5,
              }}
            >
              <Avatar sx={{ bgcolor: `${stat.color}.light`, color: `${stat.color}.main`, width: 32, height: 32, mb: 0.5 }}>
                {React.cloneElement(stat.icon, { fontSize: 'small' })}
              </Avatar>
              <Typography variant="h6" fontWeight={800} color={`${stat.color}.main`} sx={{ lineHeight: 1.2 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                {stat.label}
              </Typography>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* Active / Next Session Card */}
      {activeSession && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.5 }}>
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              mb: 2.5,
              background: (t) =>
                t.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
                  : 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              color: '#fff',
            }}
          >
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } } }>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Chip
                    label={activeSession.status === 'in-progress' ? 'جارية الآن' : 'الجلسة القادمة'}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      mb: 1,
                    }}
                  />
                  <Typography variant="h6" fontWeight={800} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                    {activeSession.beneficiaryName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                    {activeSession.type} · {activeSession.time} · {activeSession.duration} د
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: '#fff', width: 44, height: 44, fontWeight: 800 }}>
                  {activeSession.beneficiaryName.charAt(0)}
                </Avatar>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
                {activeSession.goals.map((g) => (
                  <Chip
                    key={g}
                    label={g}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.15)',
                      color: '#fff',
                      fontSize: '0.7rem',
                      height: 24,
                    }}
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<PlayIcon />}
                  fullWidth
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.95)',
                    color: 'primary.dark',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    minHeight: 48,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#fff' },
                    fontFamily: 'Tajawal, Cairo, sans-serif',
                  }}
                >
                  {activeSession.status === 'in-progress' ? 'استكمال' : 'ابدأ'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pending Tasks */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
        مهام معلقة
      </Typography>
      <Box sx={{ mb: 2.5 }}>
        {mockPendingTasks.map((task, i) => (
          <motion.div
            key={task.id}
            custom={i + 4}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <Card
              sx={{
                borderRadius: 2.5,
                mb: 1.5,
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                minHeight: 64,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {task.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>
                  {task.beneficiary} · قبل {task.due}
                </Typography>
              </Box>
              <Button size="small" variant="outlined" sx={{ minHeight: 36, borderRadius: 2, fontSize: '0.75rem', fontWeight: 700 }}>
                إنجاز
              </Button>
            </Card>
          </motion.div>
        ))}
      </Box>

      {/* Weekly Progress Chart */}
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5, fontFamily: 'Tajawal, Cairo, sans-serif' }}>
        تقدم الجلسات الأسبوعي
      </Typography>
      <Card sx={{ borderRadius: 3, p: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', mb: 2 }}>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={mockWeeklyProgress} barSize={18}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fontFamily: 'Tajawal, Cairo, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
              {mockWeeklyProgress.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.completed >= entry.planned ? '#4caf50' : '#ff9800'} />
              ))}
            </Bar>
            <Bar dataKey="planned" radius={[6, 6, 0, 0]} fill="#e0e0e0" />
          </BarChart>
        </ResponsiveContainer>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <Typography variant="caption" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>منجز</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#e0e0e0' }} />
            <Typography variant="caption" sx={{ fontFamily: 'Tajawal, Cairo, sans-serif' }}>مخطط</Typography>
          </Box>
        </Box>
      </Card>

      {/* SpeedDial FAB */}
      <SpeedDial
        ariaLabel="إجراءات سريعة"
        sx={{
          position: 'fixed',
          bottom: 80,
          left: 16,
          '& .MuiSpeedDial-fab': {
            width: 52,
            height: 52,
            minHeight: 52,
          },
        }}
        icon={<AddIcon />}
        onClose={() => setSpeedDialOpen(false)}
        onOpen={() => setSpeedDialOpen(true)}
        open={speedDialOpen}
        direction="up"
      >
        {speedDialActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipPlacement="right"
            sx={{ '& .MuiSpeedDialAction-staticTooltipLabel': { fontFamily: 'Tajawal, Cairo, sans-serif' } }}
          />
        ))}
      </SpeedDial>
    </Box>
  );
}
