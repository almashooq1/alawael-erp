/**
 * TelehealthDashboard — لوحة تحكم الطب عن بُعد
 *
 * KPI cards, today's sessions, upcoming week, platform & department stats, quick actions.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Chip, Avatar,
  IconButton, Button, LinearProgress, Divider, Alert, Tooltip,
  List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
} from '@mui/material';
import {
  VideoCall as VideoCallIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  PlayArrow as PlayIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import telehealthService from '../../services/telehealthService';

const statusColors = {
  scheduled: 'info',
  'in-progress': 'warning',
  completed: 'success',
  cancelled: 'error',
};
const statusLabels = {
  scheduled: 'مجدولة',
  'in-progress': 'قيد التنفيذ',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
};

export default function TelehealthDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await telehealthService.getDashboardOverview();
      if (data.success) setDashboard(data.data);
    } catch (err) {
      setError('فشل تحميل لوحة التحكم');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) return <LinearProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!dashboard) return null;

  const kpis = [
    { label: 'إجمالي الجلسات', value: dashboard.total, icon: <VideoCallIcon />, color: '#1976d2' },
    { label: 'مجدولة', value: dashboard.scheduled, icon: <ScheduleIcon />, color: '#0288d1' },
    { label: 'قيد التنفيذ', value: dashboard.inProgress, icon: <PlayIcon />, color: '#ed6c02' },
    { label: 'مكتملة', value: dashboard.completed, icon: <CheckCircleIcon />, color: '#2e7d32' },
    { label: 'جلسات اليوم', value: dashboard.todaySessions, icon: <CalendarIcon />, color: '#9c27b0' },
    { label: 'نسبة الإنجاز', value: `${dashboard.completionRate}%`, icon: <TrendingUpIcon />, color: '#d32f2f' },
    { label: 'متوسط المدة', value: `${dashboard.avgDuration} د`, icon: <TimerIcon />, color: '#0097a7' },
    { label: 'التقييم', value: dashboard.avgRating || '—', icon: <StarIcon />, color: '#f9a825' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight="bold">
          🩺 لوحة تحكم الطب عن بُعد
        </Typography>
        <Box>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchDashboard}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/telehealth/sessions')}
          >
            جلسة جديدة
          </Button>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={6} sm={4} md={3} lg={1.5} key={i}>
            <Card
              sx={{
                textAlign: 'center',
                borderTop: `3px solid ${kpi.color}`,
                minHeight: 100,
              }}
            >
              <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Avatar sx={{ bgcolor: kpi.color, mx: 'auto', mb: 0.5, width: 32, height: 32 }}>
                  {React.cloneElement(kpi.icon, { fontSize: 'small' })}
                </Avatar>
                <Typography variant="h6" fontWeight="bold">
                  {kpi.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {kpi.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Today's sessions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              📅 جلسات اليوم ({dashboard.todaySessions})
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {dashboard.todayList && dashboard.todayList.length > 0 ? (
              <List dense>
                {dashboard.todayList.map((s) => (
                  <ListItem key={s.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: statusColors[s.status] === 'info' ? '#0288d1' : '#ed6c02' }}>
                        <VideoCallIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={s.title}
                      secondary={`${s.patientName} — ${new Date(s.scheduledDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={statusLabels[s.status]}
                        color={statusColors[s.status]}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                لا توجد جلسات مجدولة لليوم
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Upcoming Week */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              📆 الأسبوع القادم
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {dashboard.upcomingWeek && dashboard.upcomingWeek.length > 0 ? (
              <List dense>
                {dashboard.upcomingWeek.map((s) => (
                  <ListItem key={s.id} divider>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#9c27b0' }}>
                        <ScheduleIcon fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={s.title}
                      secondary={`${s.patientName} — ${new Date(s.scheduledDate).toLocaleDateString('ar-SA')} ${new Date(s.scheduledDate).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                    />
                    <ListItemSecondaryAction>
                      <Chip label={`${s.duration} د`} variant="outlined" size="small" />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                لا توجد جلسات قادمة هذا الأسبوع
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Platform Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🖥️ إحصائيات المنصات
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {dashboard.platformStats &&
              Object.entries(dashboard.platformStats).map(([platform, count]) => (
                <Box key={platform} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={platform} variant="outlined" size="small" />
                  <Typography fontWeight="bold">{count} جلسة</Typography>
                </Box>
              ))}
          </Paper>
        </Grid>

        {/* Department Stats */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🏥 إحصائيات الأقسام
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {dashboard.departmentStats &&
              Object.entries(dashboard.departmentStats).map(([dept, count]) => (
                <Box key={dept} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Chip label={dept} color="primary" variant="outlined" size="small" />
                  <Typography fontWeight="bold">{count} جلسة</Typography>
                </Box>
              ))}
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              ⚡ إجراءات سريعة
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/telehealth/sessions')}
                >
                  جدولة جلسة
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="warning"
                  startIcon={<PeopleIcon />}
                  onClick={() => navigate('/telehealth/waiting-room')}
                >
                  غرفة الانتظار
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="success"
                  startIcon={<AssessmentIcon />}
                  onClick={() => navigate('/telehealth/recordings')}
                >
                  التسجيلات
                </Button>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="secondary"
                  startIcon={<VideoCallIcon />}
                  onClick={() => navigate('/telehealth/video-room')}
                >
                  غرفة الفيديو
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
