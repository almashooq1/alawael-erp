/**
 * TherapistProDashboard — لوحة المعالج المتكاملة (بريميوم)
 * Glassmorphism premium therapist dashboard
 * Gradient: #06b6d4 → #6366f1
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Paper, Avatar, Chip, LinearProgress,
  List, ListItem, ListItemAvatar, ListItemText, Divider,
  useTheme, alpha, AvatarGroup,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  PsychologyOutlined,
  CalendarTodayOutlined,
  PeopleAltOutlined,
  TrendingUpOutlined,
  CheckCircleOutlined,
  AccessTimeOutlined,
  FavoriteBorderOutlined,
  AssignmentOutlined,
  EmojiEventsOutlined,
  NotificationsActiveOutlined,
} from '@mui/icons-material';
import {
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const GRAD = 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)';
const G1 = '#06b6d4';
const G2 = '#6366f1';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const SESSION_TREND = [
  { day: 'الأحد', sessions: 8, completed: 7 },
  { day: 'الاثنين', sessions: 10, completed: 9 },
  { day: 'الثلاثاء', sessions: 7, completed: 7 },
  { day: 'الأربعاء', sessions: 11, completed: 10 },
  { day: 'الخميس', sessions: 9, completed: 8 },
  { day: 'الجمعة', sessions: 5, completed: 5 },
];

const PROGRESS_DATA = [
  { name: 'التواصل', value: 82, fill: '#06b6d4' },
  { name: 'الحركي', value: 74, fill: '#6366f1' },
  { name: 'المعرفي', value: 68, fill: '#8b5cf6' },
  { name: 'الاجتماعي', value: 91, fill: '#10b981' },
];

const TODAY_SESSIONS = [
  { time: '٨:٠٠', name: 'أحمد الغامدي', type: 'علاج نطق', status: 'completed', avatar: 'أ' },
  { time: '٩:٣٠', name: 'سارة العمري', type: 'علاج وظيفي', status: 'completed', avatar: 'س' },
  { time: '١١:٠٠', name: 'خالد الزهراني', type: 'علاج حركي', status: 'active', avatar: 'خ' },
  { time: '١٢:٣٠', name: 'نورة البقمي', type: 'علاج نفسي', status: 'upcoming', avatar: 'ن' },
  { time: '٢:٠٠', name: 'فيصل المطيري', type: 'علاج نطق', status: 'upcoming', avatar: 'ف' },
  { time: '٣:٣٠', name: 'هيا العسيري', type: 'علاج حركي', status: 'upcoming', avatar: 'ه' },
];

const PATIENTS = [
  { name: 'أحمد الغامدي', age: 8, progress: 78, sessions: 24, diagnosis: 'تأخر نطقي', color: '#06b6d4' },
  { name: 'سارة العمري', age: 12, progress: 65, sessions: 18, diagnosis: 'صعوبات تعلم', color: '#6366f1' },
  { name: 'خالد الزهراني', age: 6, progress: 91, sessions: 32, diagnosis: 'تأخر حركي', color: '#10b981' },
  { name: 'نورة البقمي', age: 10, progress: 54, sessions: 12, diagnosis: 'توحد خفيف', color: '#f59e0b' },
  { name: 'فيصل المطيري', age: 7, progress: 83, sessions: 28, diagnosis: 'فرط حركة', color: '#8b5cf6' },
];

const STATUS_COLORS = {
  completed: { bg: '#ecfdf5', color: '#10b981', label: 'مكتمل' },
  active: { bg: '#eff6ff', color: '#3b82f6', label: 'جارٍ الآن' },
  upcoming: { bg: '#faf5ff', color: '#8b5cf6', label: 'قادم' },
};

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, index, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: '18px',
          background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : `${color}18`}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : `0 4px 24px ${color}14`,
          position: 'relative',
          overflow: 'hidden',
          '&:hover': { transform: 'translateY(-4px)', transition: 'transform 0.3s ease' },
          transition: 'transform 0.3s ease',
        }}
      >
        <Box
          sx={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100, borderRadius: '50%',
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
          }}
        />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8', mb: 0.5 }}>
              {label}
            </Typography>
            <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A', lineHeight: 1 }}>
              {value}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', mt: 0.5 }}>
              {sub}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44, height: 44, borderRadius: '12px',
              background: `linear-gradient(135deg, ${color}22, ${color}33)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${color}33`,
            }}
          >
            <Icon sx={{ fontSize: 22, color }} />
          </Box>
        </Box>
      </Paper>
    </motion.div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function TherapistProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeSession] = useState(TODAY_SESSIONS.find((s) => s.status === 'active'));

  const cardBg = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)';
  const borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(6,182,212,0.1)';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box
          sx={{
            p: { xs: 3, md: 4 }, mb: 4, borderRadius: '24px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(99,102,241,0.2) 100%)'
              : 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(99,102,241,0.08) 100%)',
            border: `1px solid ${borderColor}`,
            backdropFilter: 'blur(20px)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Glow blobs */}
          {[
            { r: '10%', t: '-10%', c: 'rgba(6,182,212,0.2)', s: 200 },
            { l: '60%', b: '-15%', c: 'rgba(99,102,241,0.15)', s: 180 },
          ].map((b, i) => (
            <motion.div key={i}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 7 + i * 3, repeat: Infinity }}
              style={{
                position: 'absolute', right: b.r, left: b.l, top: b.t, bottom: b.b,
                width: b.s, height: b.s, borderRadius: '50%',
                background: `radial-gradient(circle, ${b.c} 0%, transparent 70%)`,
              }}
            />
          ))}

          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 72, height: 72, borderRadius: '20px',
                background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(6,182,212,0.4)',
              }}
            >
              <PsychologyOutlined sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.75rem' },
                background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة المعالج المتكاملة
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                مرحباً، م. خالد العنزي — الأثنين ٣١ مارس ٢٠٢٦
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                {[
                  { label: 'علاج نطقي', color: G1 },
                  { label: '٥ مرضى اليوم', color: G2 },
                  { label: 'المستوى: متقدم', color: '#10b981' },
                ].map((c) => (
                  <Chip key={c.label} label={c.label} size="small"
                    sx={{ height: 24, fontSize: '0.72rem', fontWeight: 600,
                      backgroundColor: `${c.color}18`, color: c.color,
                      border: `1px solid ${c.color}30` }}
                  />
                ))}
              </Box>
            </Box>
            {/* Active session indicator */}
            {activeSession && (
              <Box
                sx={{
                  p: 2, borderRadius: '16px',
                  background: isDark ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  textAlign: 'center', minWidth: 160,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center', mb: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6',
                    animation: 'pulse 2s infinite', '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.4 }
                    }}} />
                  <Typography sx={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700 }}>جلسة نشطة</Typography>
                </Box>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  {activeSession.name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>
                  {activeSession.type}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </motion.div>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { icon: PeopleAltOutlined, label: 'المرضى النشطون', value: '٣٤', sub: '+٣ هذا الشهر', color: G1 },
          { icon: CalendarTodayOutlined, label: 'جلسات اليوم', value: '٦', sub: '٢ مكتملة — ١ نشطة', color: G2 },
          { icon: CheckCircleOutlined, label: 'معدل الإنجاز', value: '٩٢٪', sub: 'أعلى بـ ٤٪ من الشهر الماضي', color: '#10b981' },
          { icon: TrendingUpOutlined, label: 'متوسط التقدم', value: '٧٣٪', sub: 'عبر جميع مرضاي', color: '#f59e0b' },
          { icon: AssignmentOutlined, label: 'تقارير معلقة', value: '٧', sub: '٣ للمراجعة', color: '#8b5cf6' },
          { icon: EmojiEventsOutlined, label: 'أهداف محققة', value: '٤٨', sub: 'هذا الشهر', color: '#f43f5e' },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <StatCard {...s} index={i} isDark={isDark} />
          </Grid>
        ))}
      </Grid>

      {/* ── Charts + Sessions ─────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>

        {/* Session Trend */}
        <Grid item xs={12} md={7}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px',
              background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(6,182,212,0.06)',
            }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 2.5 }}>
                📈 اتجاه الجلسات الأسبوعية
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={SESSION_TREND}>
                  <defs>
                    <linearGradient id="gradSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={G1} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={G1} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={G2} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={G2} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="sessions" name="المجدولة" stroke={G1} fill="url(#gradSessions)" strokeWidth={2.5} dot={{ fill: G1, strokeWidth: 2, r: 4 }} />
                  <Area type="monotone" dataKey="completed" name="المكتملة" stroke={G2} fill="url(#gradCompleted)" strokeWidth={2.5} dot={{ fill: G2, strokeWidth: 2, r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>

        {/* Radial Progress Chart */}
        <Grid item xs={12} md={5}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px',
              background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(6,182,212,0.06)',
              height: '100%',
            }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 1 }}>
                🎯 تقدم مجالات التأهيل
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={PROGRESS_DATA}>
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: isDark ? 'rgba(255,255,255,0.05)' : '#F8FAFC' }} />
                  <Tooltip formatter={(v) => [`${v}٪`, 'التقدم']} contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend iconType="circle" iconSize={10} />
                </RadialBarChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Today's Sessions + Patients ─────────────────────────── */}
      <Grid container spacing={3}>

        {/* Today's Sessions */}
        <Grid item xs={12} md={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px',
              background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(6,182,212,0.06)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  🗓️ جلسات اليوم
                </Typography>
                <Chip label="٦ جلسات" size="small" sx={{ height: 22, fontSize: '0.7rem', background: `${G1}18`, color: G1, border: `1px solid ${G1}30` }} />
              </Box>
              <List dense sx={{ '& .MuiListItem-root': { px: 0 } }}>
                {TODAY_SESSIONS.map((s, i) => {
                  const sc = STATUS_COLORS[s.status];
                  return (
                    <Box key={i}>
                      <ListItem
                        sx={{
                          borderRadius: '12px', mb: 0.5, py: 1,
                          background: s.status === 'active' ? (isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)') : 'transparent',
                          border: s.status === 'active' ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
                          transition: 'all 0.2s',
                          '&:hover': { background: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC' },
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 42 }}>
                          <Avatar sx={{ width: 34, height: 34, fontSize: '0.8rem', fontWeight: 700,
                            background: `linear-gradient(135deg, ${G1}, ${G2})` }}>
                            {s.avatar}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.83rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                                {s.name}
                              </Typography>
                              <Chip label={sc.label} size="small"
                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700,
                                  backgroundColor: sc.bg, color: sc.color,
                                  border: `1px solid ${sc.color}33`, '& .MuiChip-label': { px: 0.75 } }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                              <AccessTimeOutlined sx={{ fontSize: 12, color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }} />
                              <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>
                                {s.time} · {s.type}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {i < TODAY_SESSIONS.length - 1 && (
                        <Divider sx={{ opacity: 0.07, my: 0.25 }} />
                      )}
                    </Box>
                  );
                })}
              </List>
            </Paper>
          </motion.div>
        </Grid>

        {/* Patient Progress */}
        <Grid item xs={12} md={6}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px',
              background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${borderColor}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(6,182,212,0.06)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  👥 تقدم المرضى
                </Typography>
                <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 26, height: 26, fontSize: '0.65rem', fontWeight: 700 } }}>
                  {PATIENTS.map((p) => (
                    <Avatar key={p.name} sx={{ background: p.color }}>{p.name[0]}</Avatar>
                  ))}
                </AvatarGroup>
              </Box>
              {PATIENTS.map((p, i) => (
                <motion.div key={p.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  <Box sx={{ mb: 2.25 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{ width: 30, height: 30, fontSize: '0.75rem', fontWeight: 700, background: p.color }}>
                          {p.name[0]}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: isDark ? '#F1F5F9' : '#0F172A', lineHeight: 1.2 }}>
                            {p.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>
                            {p.diagnosis} · {p.age} سنوات
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 800, fontSize: '0.88rem', color: p.color }}>{p.progress}٪</Typography>
                        <Typography sx={{ fontSize: '0.6rem', color: isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1' }}>{p.sessions} جلسة</Typography>
                      </Box>
                    </Box>
                    <LinearProgress variant="determinate" value={p.progress}
                      sx={{
                        height: 5, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: `linear-gradient(90deg, ${p.color}, ${p.color}cc)`,
                        },
                      }}
                    />
                  </Box>
                </motion.div>
              ))}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Notifications banner ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Paper elevation={0}
          sx={{
            mt: 3, p: 2.5, borderRadius: '18px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(99,102,241,0.1))'
              : 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(99,102,241,0.04))',
            border: `1px solid ${isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.12)'}`,
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}
        >
          <NotificationsActiveOutlined sx={{ fontSize: 22, color: G1 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
              ٣ تقارير تنتظر مراجعتك
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }}>
              يرجى مراجعة تقارير الجلسات الأسبوعية وإرسالها لمدير القسم قبل نهاية اليوم
            </Typography>
          </Box>
          <Chip label="مراجعة الآن" size="small"
            sx={{ height: 28, fontSize: '0.75rem', fontWeight: 700,
              background: GRAD, color: '#fff',
              boxShadow: '0 4px 12px rgba(6,182,212,0.3)',
              cursor: 'pointer' }}
          />
        </Paper>
      </motion.div>
    </Box>
  );
}
