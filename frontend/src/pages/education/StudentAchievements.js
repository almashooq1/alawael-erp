/**
 * Student Achievements Page
 * صفحة إنجازات الطالب — XP, levels, badges, lifetime stats
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Avatar,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  LocalFireDepartment as FireIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  Whatshot as StreakIcon,
} from '@mui/icons-material';
import studentPortalService from 'services/studentPortalService';
import logger from 'utils/logger';
import { gradients } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const StudentAchievements = () => {
  const showSnackbar = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await studentPortalService.getAchievements();
      setData(payload);
    } catch (error) {
      logger.error('Error loading achievements:', error);
      showSnackbar('تعذّر تحميل صفحة الإنجازات', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !data) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  const xpPct = data.xpToNext > 0 ? Math.min(100, (data.xp / data.xpToNext) * 100) : 0;
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const stats = data.stats || {};

  return (
    <Box sx={{ p: 3 }}>
      {/* Hero */}
      <Paper
        sx={{
          background: gradients.primary,
          color: 'white',
          borderRadius: 3,
          p: 4,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item>
            <Avatar
              sx={{
                width: 96,
                height: 96,
                fontSize: '40px',
                bgcolor: 'rgba(255,255,255,0.2)',
                border: '4px solid white',
              }}
            >
              <TrophyIcon sx={{ fontSize: 48 }} />
            </Avatar>
          </Grid>
          <Grid item xs>
            <Typography variant="overline" sx={{ opacity: 0.9, fontWeight: 600 }}>
              المستوى الحالي
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
              المستوى {data.level}
            </Typography>
            <Box sx={{ maxWidth: 420 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">{data.xp} XP</Typography>
                <Typography variant="caption">
                  {data.xpToNext - data.xp} XP حتى المستوى {data.level + 1}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={xpPct}
                sx={{
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': { backgroundColor: 'white' },
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Streak + Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <StreakIcon color="warning" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {data.streakDays}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    أيام متتالية
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <FireIcon color="error" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {data.longestStreak}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    أطول سلسلة
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <CheckIcon color="success" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.sessionsAttended || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    جلسة مكتملة
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center">
                <StarIcon color="primary" sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.activitiesCompleted || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    نشاط منجز
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Badges */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrophyIcon color="warning" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            شارات الإنجاز
          </Typography>
          <Chip label={`${badges.length} شارة`} size="small" sx={{ ml: 'auto' }} />
        </Box>
        <Divider sx={{ mb: 2 }} />
        {badges.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
            <TrophyIcon sx={{ fontSize: 56, opacity: 0.4, mb: 1 }} />
            <Typography variant="body2">
              لم تحصل على أي شارات بعد — أكمل جلساتك واحرص على الانتظام لتفتح أول شاراتك! ✨
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2}>
            {badges.map((b, i) => (
              <Grid item xs={6} sm={4} md={3} key={b.id || i}>
                <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ fontSize: 48 }}>{b.icon || '🏅'}</Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, mt: 1 }}>
                    {b.titleAr || b.title || 'شارة'}
                  </Typography>
                  {b.descriptionAr && (
                    <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
                      {b.descriptionAr}
                    </Typography>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>
    </Box>
  );
};

export default StudentAchievements;
