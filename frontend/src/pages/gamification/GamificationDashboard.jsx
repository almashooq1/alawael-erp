import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Avatar,
  Chip,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Tooltip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  useTheme,
} from '@mui/material';
import {
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as FireIcon,
  CalendarMonth as CalendarIcon,
  Lock as LockIcon,
  TrendingUp as TrendingUpIcon,
  EmojiEmotions as HappyIcon,
  School as SchoolIcon,
  FitnessCenter as FitnessIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import gamificationService from '../../services/gamificationService';

// ─── Mock Data (for demo / fallback) ───────────────────────────
const MOCK_PROFILE = {
  beneficiaryId: '507f1f77bcf86cd799439011',
  totalPoints: 450,
  level: 5,
  badges: [
    {
      badgeId: 'first_session',
      name: 'الخطوة الأولى',
      description: 'حضور أول جلسة علاجية',
      icon: 'star',
      earnedAt: '2025-01-15T10:00:00Z',
      category: 'session_attendance',
    },
    {
      badgeId: 'regular_attendee',
      name: 'المحاضر المنتظم',
      description: 'حضور 10 جلسات علاجية',
      icon: 'calendar_check',
      earnedAt: '2025-02-20T10:00:00Z',
      category: 'session_attendance',
    },
    {
      badgeId: 'goal_achiever',
      name: 'محقق الأهداف',
      description: 'إنجاز 5 أهداف علاجية',
      icon: 'target',
      earnedAt: '2025-03-10T10:00:00Z',
      category: 'goal_achievement',
    },
    {
      badgeId: 'streak_7',
      name: 'سلسلة 7 أيام',
      description: 'نشاط متواصل لمدة 7 أيام',
      icon: 'fire',
      earnedAt: '2025-03-25T10:00:00Z',
      category: 'streak',
    },
  ],
  challenges: [
    {
      challengeId: 'ch_001',
      name: 'جلسات الأسبوع',
      description: 'حضور 3 جلسات هذا الأسبوع',
      target: 3,
      progress: 2,
      completed: false,
      rewardPoints: 50,
      startedAt: '2025-06-20T10:00:00Z',
      type: 'attend_sessions',
    },
    {
      challengeId: 'ch_002',
      name: 'تحقيق الهدف الشهري',
      description: 'إنجاز الهدف العلاجي للشهر',
      target: 1,
      progress: 1,
      completed: true,
      rewardPoints: 100,
      startedAt: '2025-06-01T10:00:00Z',
      completedAt: '2025-06-25T10:00:00Z',
      type: 'achieve_goals',
    },
    {
      challengeId: 'ch_003',
      name: 'تحسين ICF',
      description: 'رفع درجة ICF بنسبة 10%',
      target: 10,
      progress: 6,
      completed: false,
      rewardPoints: 75,
      startedAt: '2025-06-15T10:00:00Z',
      type: 'improve_icf',
    },
  ],
  streaks: {
    currentStreak: 5,
    longestStreak: 12,
    lastActivityDate: '2025-06-26T10:00:00Z',
  },
  achievements: [
    { type: 'session_attended', description: 'حضور جلسة علاجية', earnedAt: '2025-06-26T10:00:00Z', points: 10 },
    { type: 'goal_achieved', description: 'إنجاز هدف علاجي', earnedAt: '2025-06-25T10:00:00Z', points: 20 },
    { type: 'points_awarded', description: 'نقاط إضافية', earnedAt: '2025-06-24T10:00:00Z', points: 15 },
  ],
  leaderboardRank: 3,
};

const MOCK_LEADERBOARD = [
  { rank: 1, name: 'أحمد سعد', points: 780, level: 8, avatar: '', beneficiaryId: '1' },
  { rank: 2, name: 'ليلى محمد', points: 620, level: 7, avatar: '', beneficiaryId: '2' },
  { rank: 3, name: 'عمر خالد', points: 450, level: 5, avatar: '', beneficiaryId: '3' },
  { rank: 4, name: 'فاطمة عبدالله', points: 380, level: 4, avatar: '', beneficiaryId: '4' },
  { rank: 5, name: 'يوسف إبراهيم', points: 310, level: 4, avatar: '', beneficiaryId: '5' },
  { rank: 6, name: 'نورا سالم', points: 290, level: 3, avatar: '', beneficiaryId: '6' },
  { rank: 7, name: 'سامي علي', points: 250, level: 3, avatar: '', beneficiaryId: '7' },
  { rank: 8, name: 'رنا حسن', points: 210, level: 2, avatar: '', beneficiaryId: '8' },
  { rank: 9, name: 'تامر محمود', points: 180, level: 2, avatar: '', beneficiaryId: '9' },
  { rank: 10, name: 'هند فاروق', points: 150, level: 2, avatar: '', beneficiaryId: '10' },
];

const ALL_BADGES = [
  { badgeId: 'first_session', name: 'الخطوة الأولى', description: 'حضور أول جلسة علاجية', icon: 'star', category: 'session_attendance' },
  { badgeId: 'regular_attendee', name: 'المحاضر المنتظم', description: 'حضور 10 جلسات علاجية', icon: 'calendar_check', category: 'session_attendance' },
  { badgeId: 'goal_achiever', name: 'محقق الأهداف', description: 'إنجاز 5 أهداف علاجية', icon: 'target', category: 'goal_achievement' },
  { badgeId: 'icf_improver', name: 'التقدم الملحوظ', description: 'تحسن في تقييم ICF', icon: 'trending_up', category: 'icf_improvement' },
  { badgeId: 'streak_7', name: 'سلسلة 7 أيام', description: 'نشاط متواصل لمدة 7 أيام', icon: 'fire', category: 'streak' },
  { badgeId: 'streak_30', name: 'الشهر الذهبي', description: 'نشاط متواصل لمدة 30 يوماً', icon: 'crown', category: 'streak' },
  { badgeId: 'level_5', name: 'النجم الصاعد', description: 'الوصول إلى المستوى 5', icon: 'rocket', category: 'special_milestone' },
  { badgeId: 'level_10', name: 'بطل التأهيل', description: 'الوصول إلى المستوى 10', icon: 'trophy', category: 'special_milestone' },
];

const BADGE_COLORS = {
  session_attendance: '#FFD700',
  goal_achievement: '#9C27B0',
  icf_improvement: '#4CAF50',
  streak: '#FF5722',
  special_milestone: '#3F51B5',
};

const BADGE_ICONS = {
  star: StarIcon,
  calendar_check: CalendarIcon,
  target: TrendingUpIcon,
  trending_up: TrendingUpIcon,
  fire: FireIcon,
  crown: TrophyIcon,
  rocket: SchoolIcon,
  trophy: TrophyIcon,
};

// ─── Animation Variants ──────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', bounce: 0.4 } },
};

const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 1.5, repeat: Infinity },
  },
};

const bounceVariants = {
  bounce: {
    y: [0, -10, 0],
    transition: { duration: 0.6, repeat: Infinity, repeatType: 'reverse' },
  },
};

// ─── Component ───────────────────────────────────────────────────
export default function GamificationDashboard() {
  const theme = useTheme();
  const [profile, setProfile] = useState(MOCK_PROFILE);
  const [leaderboard, setLeaderboard] = useState(MOCK_LEADERBOARD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileData, leaderboardData] = await Promise.all([
          gamificationService.getProfile('507f1f77bcf86cd799439011'),
          gamificationService.getLeaderboard(null, 10),
        ]);
        if (profileData) setProfile(profileData);
        if (leaderboardData && leaderboardData.length > 0) setLeaderboard(leaderboardData);
      } catch (err) {
        console.warn('Using mock data for gamification', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const earnedBadgeIds = new Set(profile.badges.map((b) => b.badgeId));
  const pointsToNext = profile.level * 100 + 100 - profile.totalPoints;
  const progressPercent = ((profile.totalPoints % 100) / 100) * 100;

  // Streak calendar (last 14 days)
  const generateStreakDays = () => {
    const days = [];
    const today = new Date();
    const streak = profile.streaks.currentStreak;
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isActive = i < streak;
      days.push({
        day: d.toLocaleDateString('ar-SA', { weekday: 'short' }),
        date: d.getDate(),
        active: isActive,
        isToday: i === 0,
      });
    }
    return days;
  };

  const streakDays = generateStreakDays();

  return (
    <Container maxWidth="xl" dir="rtl" sx={{ py: 3 }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ─── Header ─────────────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Box display="flex" alignItems="center" gap={2} mb={4}>
            <motion.div variants={bounceVariants} animate="bounce">
              <StarIcon sx={{ fontSize: 48, color: '#FFD700' }} />
            </motion.div>
            <Box>
              <Typography variant="h3" fontWeight="bold" color="primary">
                نظام التحفيز والشارات
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                اجمع النقاط، أكمل التحديات، واصعد في لوحة المتصدرين!
              </Typography>
            </Box>
          </Box>
        </motion.div>

        <Grid container spacing={3}>
          {/* ─── Profile Card ─────────────────────────────────── */}
          <Grid item xs={12} md={4}>
            <motion.div variants={itemVariants}>
              <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <Avatar sx={{ width: 80, height: 80, bgcolor: '#FFD700', fontSize: 32 }}>
                      <HappyIcon sx={{ color: '#764ba2' }} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">عمر خالد</Typography>
                      <Chip
                        label={`المستوى ${profile.level}`}
                        size="small"
                        sx={{ bgcolor: '#FFD700', color: '#333', fontWeight: 'bold', mt: 0.5 }}
                      />
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Typography variant="h4" fontWeight="bold" textAlign="center">
                      {profile.totalPoints}
                    </Typography>
                    <Typography variant="body2" textAlign="center" sx={{ opacity: 0.9 }}>
                      نقطة إجمالية
                    </Typography>
                  </Box>

                  <Box mb={1}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2">التقدم للمستوى التالي</Typography>
                      <Typography variant="body2" fontWeight="bold">{pointsToNext} نقطة</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent}
                      sx={{
                        height: 12,
                        borderRadius: 6,
                        bgcolor: 'rgba(255,255,255,0.2)',
                        '& .MuiLinearProgress-bar': { bgcolor: '#FFD700', borderRadius: 6 },
                      }}
                    />
                  </Box>

                  <Box display="flex" justifyContent="space-around" mt={3}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold">{profile.badges.length}</Typography>
                      <Typography variant="caption">شارة</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold">{profile.challenges.filter(c => c.completed).length}</Typography>
                      <Typography variant="caption">تحدٍ مكتمل</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight="bold">{profile.streaks.currentStreak}</Typography>
                      <Typography variant="caption">أيام متتالية</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* ─── Badges Section ─────────────────────────────────── */}
          <Grid item xs={12} md={8}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                    <TrophyIcon color="warning" />
                    الشارات والإنجازات
                  </Typography>
                  <Grid container spacing={2}>
                    {ALL_BADGES.map((badge) => {
                      const earned = earnedBadgeIds.has(badge.badgeId);
                      const IconComponent = BADGE_ICONS[badge.icon] || StarIcon;
                      return (
                        <Grid item xs={6} sm={4} md={3} key={badge.badgeId}>
                          <Tooltip
                            title={earned ? badge.description : 'لم يتم اكتساب هذه الشارة بعد'}
                            arrow
                          >
                            <motion.div
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Paper
                                elevation={earned ? 4 : 1}
                                sx={{
                                  p: 2,
                                  textAlign: 'center',
                                  borderRadius: 3,
                                  opacity: earned ? 1 : 0.5,
                                  border: earned ? `2px solid ${BADGE_COLORS[badge.category]}` : '2px dashed #ccc',
                                  bgcolor: earned ? `${BADGE_COLORS[badge.category]}10` : 'background.paper',
                                  transition: 'all 0.3s',
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    mx: 'auto',
                                    mb: 1,
                                    bgcolor: earned ? BADGE_COLORS[badge.category] : '#e0e0e0',
                                  }}
                                >
                                  {earned ? (
                                    <IconComponent sx={{ color: '#fff', fontSize: 28 }} />
                                  ) : (
                                    <LockIcon sx={{ color: '#999', fontSize: 28 }} />
                                  )}
                                </Box>
                                <Typography variant="body2" fontWeight="bold" noWrap>
                                  {badge.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                  {badge.category === 'session_attendance' && 'حضور'}
                                  {badge.category === 'goal_achievement' && 'أهداف'}
                                  {badge.category === 'icf_improvement' && 'ICF'}
                                  {badge.category === 'streak' && 'سلسلة'}
                                  {badge.category === 'special_milestone' && 'إنجاز'}
                                </Typography>
                              </Paper>
                            </motion.div>
                          </Tooltip>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* ─── Challenges Section ─────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                    <FitnessIcon color="success" />
                    التحديات النشطة
                  </Typography>
                  {profile.challenges.map((challenge) => {
                    const progressPercent = Math.round((challenge.progress / challenge.target) * 100);
                    return (
                      <Box key={challenge.challengeId} mb={2.5}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {challenge.name}
                            {challenge.completed && (
                              <Chip
                                label="مكتمل"
                                size="small"
                                color="success"
                                sx={{ ml: 1, height: 20, fontSize: '0.65rem' }}
                              />
                            )}
                          </Typography>
                          <Typography variant="caption" color="success.main" fontWeight="bold">
                            +{challenge.rewardPoints} نقطة
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                          {challenge.description}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box flexGrow={1}>
                            <LinearProgress
                              variant="determinate"
                              value={progressPercent}
                              sx={{
                                height: 10,
                                borderRadius: 5,
                                bgcolor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: challenge.completed ? '#4CAF50' : '#9C27B0',
                                  borderRadius: 5,
                                },
                              }}
                            />
                          </Box>
                          <Typography variant="caption" fontWeight="bold" minWidth={40} textAlign="left">
                            {challenge.progress}/{challenge.target}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* ─── Leaderboard ──────────────────────────────────── */}
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                    <TrendingUpIcon color="primary" />
                    لوحة المتصدرين
                  </Typography>
                  <TableContainer component={Paper} elevation={0}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">#</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاسم</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">المستوى</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">النقاط</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {leaderboard.map((leader, idx) => (
                          <TableRow
                            key={leader.beneficiaryId || idx}
                            sx={{
                              bgcolor: leader.rank === profile.leaderboardRank ? 'rgba(255, 215, 0, 0.15)' : 'inherit',
                              '&:hover': { bgcolor: 'action.hover' },
                            }}
                          >
                            <TableCell align="center">
                              {leader.rank === 1 && <TrophyIcon sx={{ color: '#FFD700', fontSize: 20 }} />}
                              {leader.rank === 2 && <TrophyIcon sx={{ color: '#C0C0C0', fontSize: 20 }} />}
                              {leader.rank === 3 && <TrophyIcon sx={{ color: '#CD7F32', fontSize: 20 }} />}
                              {leader.rank > 3 && (
                                <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                  {leader.rank}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.light' }}>
                                  {leader.name?.charAt(0) || '?'}
                                </Avatar>
                                <Typography variant="body2" fontWeight={leader.rank <= 3 ? 'bold' : 'normal'}>
                                  {leader.name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={leader.level} size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell align="center">
                              <Typography variant="body2" fontWeight="bold" color="success.main">
                                {leader.points}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* ─── Streak Tracker ─────────────────────────────────── */}
          <Grid item xs={12}>
            <motion.div variants={itemVariants}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" mb={2} display="flex" alignItems="center" gap={1}>
                    <FireIcon sx={{ color: '#FF5722' }} />
                    متتبع السلسلة
                    <Chip
                      label={`الأفضل: ${profile.streaks.longestStreak} يوم`}
                      size="small"
                      color="warning"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                  </Typography>
                  <Box display="flex" justifyContent="space-between" gap={1} flexWrap="wrap">
                    {streakDays.map((day, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        style={{ flex: '1 1 auto', minWidth: 60 }}
                      >
                        <Paper
                          elevation={day.active ? 4 : 1}
                          sx={{
                            p: 1.5,
                            textAlign: 'center',
                            borderRadius: 3,
                            bgcolor: day.isToday
                              ? '#9C27B0'
                              : day.active
                              ? '#4CAF50'
                              : '#f5f5f5',
                            color: day.isToday || day.active ? 'white' : 'text.secondary',
                            border: day.isToday ? '2px solid #FFD700' : 'none',
                            transition: 'all 0.3s',
                          }}
                        >
                          <Typography variant="caption" display="block" fontWeight="bold" sx={{ opacity: 0.9 }}>
                            {day.day}
                          </Typography>
                          <Typography variant="h6" fontWeight="bold" sx={{ my: 0.5 }}>
                            {day.date}
                          </Typography>
                          {day.active && (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                            >
                              <FireIcon sx={{ fontSize: 18, color: day.isToday ? '#FFD700' : '#FF5722' }} />
                            </motion.div>
                          )}
                          {!day.active && (
                            <Box sx={{ height: 18 }} />
                          )}
                        </Paper>
                      </motion.div>
                    ))}
                  </Box>
                  <Box mt={2} display="flex" alignItems="center" justifyContent="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      السلسلة الحالية:
                    </Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">
                      {profile.streaks.currentStreak}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      أيام متتالية من النشاط
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
}
