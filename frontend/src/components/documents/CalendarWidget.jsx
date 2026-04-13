import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Stack, Chip, Avatar, IconButton, Button,
  CircularProgress, Alert, Paper, Grid, List, ListItem, ListItemAvatar,
  ListItemText, Divider, Tooltip, Badge,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  Event as EventIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Snooze as SnoozeIcon,
  Refresh as RefreshIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { calendarApi } from '../../services/documentProPhase5Service';
import logger from '../../utils/logger';

const PRIORITY_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#3b82f6',
  low:      '#22c55e',
};

const STATUS_ICONS = {
  scheduled:   <ScheduleIcon />,
  in_progress: <TimeIcon />,
  completed:   <CheckIcon color="success" />,
  overdue:     <WarningIcon color="error" />,
  cancelled:   <ScheduleIcon color="disabled" />,
  snoozed:     <SnoozeIcon color="warning" />,
};

const STATUS_LABELS = {
  scheduled: 'مجدول', in_progress: 'قيد التنفيذ', completed: 'مكتمل',
  overdue: 'متأخر', cancelled: 'ملغي', snoozed: 'مؤجل',
};

/**
 * CalendarWidget — ويدجت تقويم المستندات
 * عرض المواعيد النهائية القادمة، المتأخرة، والجدول الزمني
 */
export default function CalendarWidget({ documentId, compact = false }) {
  const [deadlines, setDeadlines] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [
        calendarApi.getDeadlines({ days: 14 }),
        calendarApi.getOverdue(),
      ];
      if (documentId) promises.push(calendarApi.getTimeline(documentId));

      const results = await Promise.all(promises);
      setDeadlines(results[0].data?.deadlines ?? []);
      setOverdue(results[1].data?.overdue ?? []);
      if (results[2]) setTimeline(results[2].data?.timeline ?? []);
    } catch (err) {
      logger.error('Calendar widget error', err);
      setError('فشل تحميل بيانات التقويم');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComplete = async (eventId) => {
    try {
      await calendarApi.completeEvent(eventId);
      loadData();
    } catch (err) { logger.error(err); }
  };

  const handleSnooze = async (eventId) => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    try {
      await calendarApi.snoozeEvent(eventId, tomorrow);
      loadData();
    } catch (err) { logger.error(err); }
  };

  if (loading) return <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />;

  return (
    <Box dir="rtl">
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarIcon color="primary" />
          <Typography variant={compact ? 'subtitle1' : 'h6'} fontWeight={600}>تقويم المستند</Typography>
          <Badge badgeContent={overdue.length} color="error">
            <Chip label={`${deadlines.length + overdue.length} حدث`} size="small" variant="outlined" />
          </Badge>
        </Stack>
        <IconButton size="small" onClick={loadData}><RefreshIcon /></IconButton>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography fontWeight={600}>{overdue.length} حدث متأخر!</Typography>
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Overdue Events */}
        {overdue.length > 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ borderColor: '#ef4444', p: 1.5 }}>
              <Typography variant="subtitle2" color="error" gutterBottom>🔴 متأخرة</Typography>
              <List dense>
                {overdue.slice(0, compact ? 3 : 10).map((evt) => (
                  <ListItem key={evt._id}
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="إكمال"><IconButton size="small" onClick={() => handleComplete(evt._id)}><CheckIcon /></IconButton></Tooltip>
                        <Tooltip title="تأجيل يوم"><IconButton size="small" onClick={() => handleSnooze(evt._id)}><SnoozeIcon /></IconButton></Tooltip>
                      </Stack>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#fef2f2', width: 32, height: 32 }}>
                        <WarningIcon sx={{ color: '#ef4444', fontSize: 18 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={evt.titleAr || evt.title}
                      secondary={new Date(evt.startDate).toLocaleDateString('ar-SA')}
                      primaryTypographyProps={{ fontSize: 13 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Upcoming Deadlines */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" gutterBottom>⏰ المواعيد القادمة (14 يوم)</Typography>
            {deadlines.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={2} fontSize={13}>لا توجد مواعيد قادمة</Typography>
            ) : (
              <List dense>
                {deadlines.slice(0, compact ? 5 : 15).map((evt, i) => {
                  const daysLeft = Math.ceil((new Date(evt.startDate) - Date.now()) / 86400000);
                  return (
                    <React.Fragment key={evt._id}>
                      <ListItem
                        secondaryAction={
                          <Chip
                            label={daysLeft <= 1 ? 'غداً' : `${daysLeft} يوم`}
                            size="small"
                            color={daysLeft <= 2 ? 'error' : daysLeft <= 5 ? 'warning' : 'default'}
                          />
                        }
                      >
                        <ListItemAvatar>
                          <Avatar sx={{
                            bgcolor: (PRIORITY_COLORS[evt.priority] || '#3b82f6') + '20',
                            width: 32, height: 32,
                          }}>
                            {STATUS_ICONS[evt.status] || <EventIcon sx={{ fontSize: 18 }} />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={evt.titleAr || evt.title}
                          secondary={
                            <Stack direction="row" spacing={0.5} component="span" alignItems="center">
                              <Chip label={STATUS_LABELS[evt.status] || evt.status} size="small" sx={{ height: 18 }} />
                              <span>{new Date(evt.startDate).toLocaleDateString('ar-SA')}</span>
                            </Stack>
                          }
                          primaryTypographyProps={{ fontSize: 13 }}
                        />
                      </ListItem>
                      {i < deadlines.length - 1 && <Divider />}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Document Timeline */}
        {timeline.length > 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" gutterBottom>📅 الجدول الزمني للمستند</Typography>
              <List dense>
                {timeline.map((evt, i) => (
                  <ListItem key={evt._id || i}
                    sx={{ opacity: evt.isPast ? 0.6 : 1, bgcolor: evt.isCurrent ? '#eff6ff' : 'transparent' }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{
                        bgcolor: evt.isCurrent ? '#3b82f6' : evt.isPast ? '#e2e8f0' : '#f1f5f9',
                        width: 28, height: 28,
                      }}>
                        {evt.isPast ? <CheckIcon sx={{ fontSize: 16, color: '#22c55e' }} /> :
                         evt.isCurrent ? <TimeIcon sx={{ fontSize: 16, color: '#fff' }} /> :
                         <ScheduleIcon sx={{ fontSize: 16, color: '#94a3b8' }} />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={evt.titleAr || evt.title}
                      secondary={`${new Date(evt.startDate).toLocaleDateString('ar-SA')} — ${evt.daysUntil > 0 ? `بعد ${evt.daysUntil} يوم` : evt.daysUntil === 0 ? 'اليوم' : `قبل ${Math.abs(evt.daysUntil)} يوم`}`}
                      primaryTypographyProps={{ fontSize: 12 }}
                      secondaryTypographyProps={{ fontSize: 11 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
