/**
 * 📅 CalendarEventsWidget — ويدجت التقويم والأحداث
 * Professional calendar widget with upcoming events, hijri date, and quick scheduling
 */
import { useState, useMemo } from 'react';
import {
  useTheme, } from '@mui/material';
import { gradients, statusColors, brandColors } from 'theme/palette';

const DAYS_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

const EVENT_TYPES = {
  meeting: { label: 'اجتماع', color: brandColors.primaryStart, icon: <GroupIcon fontSize="small" /> },
  session: { label: 'جلسة', color: statusColors.success, icon: <EventIcon fontSize="small" /> },
  appointment: { label: 'موعد', color: statusColors.info, icon: <AccessTimeIcon fontSize="small" /> },
  reminder: { label: 'تذكير', color: statusColors.warning, icon: <NotificationsIcon fontSize="small" /> },
  virtual: { label: 'اجتماع افتراضي', color: statusColors.purple, icon: <VideoCallIcon fontSize="small" /> },
};

const UPCOMING_EVENTS = [
  { id: 1, title: 'اجتماع مجلس الإدارة', type: 'meeting', time: '09:00', endTime: '10:30', location: 'قاعة المؤتمرات', date: '2026-03-17', attendees: 8 },
  { id: 2, title: 'جلسة علاج طبيعي - أحمد', type: 'session', time: '11:00', endTime: '11:45', location: 'غرفة العلاج 3', date: '2026-03-17', attendees: 2 },
  { id: 3, title: 'مراجعة الميزانية الشهرية', type: 'virtual', time: '13:00', endTime: '14:00', location: 'Zoom', date: '2026-03-17', attendees: 5 },
  { id: 4, title: 'تقييم مستفيد جديد', type: 'appointment', time: '14:30', endTime: '15:30', location: 'عيادة التقييم', date: '2026-03-18', attendees: 3 },
  { id: 5, title: 'تذكير: موعد تجديد الترخيص', type: 'reminder', time: '10:00', endTime: '10:00', location: '', date: '2026-03-19', attendees: 0 },
  { id: 6, title: 'ورشة عمل تطوير المهارات', type: 'meeting', time: '09:30', endTime: '12:00', location: 'القاعة الكبرى', date: '2026-03-20', attendees: 20 },
  { id: 7, title: 'جلسة علاج النطق - سارة', type: 'session', time: '15:00', endTime: '15:45', location: 'غرفة العلاج 1', date: '2026-03-20', attendees: 2 },
];

const getHijriApprox = (date) => {
  // Simplified Hijri approximation
  const hijriMonths = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  // Rough calculation for display
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const m = Math.floor((24 * l3) / 709);
  const d = l3 - Math.floor((709 * m) / 24);
  const y = 30 * n + j - 30;
  return `${d} ${hijriMonths[(m - 1) % 12]} ${y} هـ`;
};

const MiniCalendar = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const calendarDays =  
 useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentMonth, currentYear]);

  const hasEvent = (day) => {
    if (!day) return false;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return UPCOMING_EVENTS.some(e => e.date === dateStr);
  };

  const isToday = (day) => day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  return (
    <Box>
      {/* Month Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <IconButton size="small" onClick={() => {
          if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
          else setCurrentMonth(m => m - 1);
        }}>
          <ChevronRightIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
          {MONTHS_AR[currentMonth]} {currentYear}
        </Typography>
        <IconButton size="small" onClick={() => {
          if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
          else setCurrentMonth(m => m + 1);
        }}>
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Day Headers */}
      <Grid container spacing={0}>
        {DAYS_AR.map(d => (
          <Grid item xs={12 / 7} key={d}>
            <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', fontSize: '0.55rem', fontWeight: 700, color: 'text.secondary', mb: 0.5 }}>
              {d}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* Calendar Grid */}
      <Grid container spacing={0}>
        {calendarDays.map((day, i) => (
          <Grid item xs={12 / 7} key={i}>
            <Box
              sx={{
                width: '100%',
                aspectRatio: '1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: day ? 'pointer' : 'default',
                borderRadius: '50%',
                ...(isToday(day) ? {
                  background: gradients.primary,
                  color: '#fff',
                  fontWeight: 800,
                } : {}),
                '&:hover': day ? {
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                } : {},
              }}
            >
              {day && (
                <>
                  <Typography variant="caption" sx={{
                    fontSize: '0.65rem',
                    fontWeight: isToday(day) ? 800 : 500,
                    color: isToday(day) ? '#fff' : 'text.primary',
                  }}>
                    {day}
                  </Typography>
                  {hasEvent(day) && !isToday(day) && (
                    <Box sx={{
                      position: 'absolute', bottom: 1,
                      width: 4, height: 4, borderRadius: '50%',
                      bgcolor: brandColors.primaryStart,
                    }} />
                  )}
                </>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const CalendarEventsWidget = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const today = new Date();

  const todayEvents = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    return UPCOMING_EVENTS.filter(e => e.date === todayStr);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcomingEvents = useMemo(() => {
    const todayStr = today.toISOString().split('T')[0];
    return UPCOMING_EVENTS.filter(e => e.date > todayStr).slice(0, 4);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
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
        {/* Header */}
        <Box sx={{ background: gradients.ocean, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(255,255,255,0.2)' }}>
                <CalendarTodayIcon sx={{ color: '#fff' }} />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>
                  {DAYS_AR[today.getDay()]}، {today.getDate()} {MONTHS_AR[today.getMonth()]} {today.getFullYear()}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem' }}>
                  {getHijriApprox(today)}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Chip
                size="small"
                icon={<EventIcon sx={{ fontSize: 14, color: '#fff !important' }} />}
                label={`${todayEvents.length} اليوم`}
                sx={{ height: 24, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }}
              />
              <Tooltip title="إضافة حدث">
                <IconButton size="small" sx={{ color: '#fff' }}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Grid container>
          {/* Mini Calendar */}
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2 }}>
              <MiniCalendar />
            </Box>
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />

          {/* Events List */}
          <Grid item xs={12} md sx={{ minWidth: 0 }}>
            <Box sx={{ p: 2 }}>
              {/* Today's Events */}
              {todayEvents.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1 }}>
                    📌 أحداث اليوم
                  </Typography>
                  <List dense sx={{ p: 0 }}>
                    {todayEvents.map(event => {
                      const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.meeting;
                      return (
                        <motion.div key={event.id} whileHover={{ x: -3 }} transition={{ duration: 0.15 }}>
                          <ListItem
                            sx={{
                              px: 1.5, py: 1, mb: 0.5, borderRadius: 2,
                              border: '1px solid',
                              borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              borderRight: `3px solid ${eventType.color}`,
                            }}
                          >
                            <ListItemAvatar sx={{ minWidth: 36 }}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: `${eventType.color}15`, color: eventType.color, '& svg': { fontSize: 14 } }}>
                                {eventType.icon}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                                  {event.title}
                                </Typography>
                              }
                              secondary={
                                <Box sx={{ display: 'flex', gap: 1, mt: 0.3, flexWrap: 'wrap' }}>
                                  <Chip size="small" icon={<AccessTimeIcon sx={{ fontSize: '10px !important' }} />} label={`${event.time} - ${event.endTime}`}
                                    sx={{ height: 18, fontSize: '0.55rem' }} />
                                  {event.location && (
                                    <Chip size="small" icon={<LocationOnIcon sx={{ fontSize: '10px !important' }} />} label={event.location}
                                      sx={{ height: 18, fontSize: '0.55rem' }} />
                                  )}
                                  {event.attendees > 0 && (
                                    <Chip size="small" icon={<GroupIcon sx={{ fontSize: '10px !important' }} />} label={`${event.attendees} حضور`}
                                      sx={{ height: 18, fontSize: '0.55rem' }} />
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        </motion.div>
                      );
                    })}
                  </List>
                </>
              )}

              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1, mt: todayEvents.length > 0 ? 2 : 0 }}>
                    📅 الأحداث القادمة
                  </Typography>
                  <List dense sx={{ p: 0 }}>
                    {upcomingEvents.map(event => {
                      const eventType = EVENT_TYPES[event.type] || EVENT_TYPES.meeting;
                      const eventDate = new Date(event.date);
                      const dayDiff = Math.ceil((eventDate - today) / 86400000);
                      const dayLabel = dayDiff === 1 ? 'غداً' : `بعد ${dayDiff} أيام`;

                      return (
                        <motion.div key={event.id} whileHover={{ x: -3 }} transition={{ duration: 0.15 }}>
                          <ListItem
                            sx={{
                              px: 1.5, py: 0.8, mb: 0.5, borderRadius: 2,
                              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                            }}
                          >
                            <ListItemAvatar sx={{ minWidth: 36 }}>
                              <Avatar sx={{ width: 24, height: 24, bgcolor: `${eventType.color}12`, color: eventType.color, '& svg': { fontSize: 12 } }}>
                                {eventType.icon}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.72rem' }}>
                                    {event.title}
                                  </Typography>
                                  <Chip size="small" label={dayLabel}
                                    sx={{ height: 16, fontSize: '0.5rem', fontWeight: 600 }} />
                                </Box>
                              }
                              secondary={
                                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>
                                  {event.time} — {DAYS_AR[eventDate.getDay()]} {eventDate.getDate()} {MONTHS_AR[eventDate.getMonth()]}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </motion.div>
                      );
                    })}
                  </List>
                </>
              )}

              {todayEvents.length === 0 && upcomingEvents.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, opacity: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body2">لا توجد أحداث قادمة</Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </motion.div>
  );
};

export default CalendarEventsWidget;
