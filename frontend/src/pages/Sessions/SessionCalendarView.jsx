/**
 * SessionCalendarView — عرض تقويم الجلسات العلاجية
 *
 * Interactive calendar view for therapy sessions featuring:
 *  - Monthly / Weekly / Day view toggle
 *  - Color-coded events by status
 *  - Filter by therapist, room, session type
 *  - Click event to view session details dialog
 *  - Navigation between months/weeks
 *  - Arabic day & month names
 *
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Typography, Grid, Paper, Box, Card, CardContent,
  Chip, Button, IconButton, Tooltip, TextField, MenuItem,
  LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Avatar, Stack, Divider, ToggleButton, ToggleButtonGroup,
  Badge,
} from '@mui/material';
import {
  CalendarMonth as CalendarIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  ViewWeek as WeekIcon,
  ViewModule as MonthIcon,
  ViewDay as DayIcon,
  FilterList as FilterIcon,
  Close as CloseIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  MeetingRoom as RoomIcon,
  LocalHospital as TypeIcon,
  Info as InfoIcon,
  CheckCircle,
  Cancel,
  HourglassEmpty,
  PersonOff,
  EventAvailable,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import { therapistService } from '../../services/therapistService';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';

/* ──────── Arabic locale data ──────── */
const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const AR_DAYS_SHORT = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const AR_DAYS_FULL = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

/* ──────── Helpers ──────── */
const STATUS_CONFIG = {
  COMPLETED:  { label: 'مكتملة', color: statusColors.success, icon: <CheckCircle fontSize="small" /> },
  SCHEDULED:  { label: 'مجدولة', color: statusColors.primaryBlue || chartColors.category[0], icon: <EventAvailable fontSize="small" /> },
  CONFIRMED:  { label: 'مؤكدة', color: '#1976d2', icon: <EventAvailable fontSize="small" /> },
  IN_PROGRESS:{ label: 'جارية', color: '#0288d1', icon: <HourglassEmpty fontSize="small" /> },
  CANCELLED:  { label: 'ملغاة', color: statusColors.error, icon: <Cancel fontSize="small" /> },
  CANCELLED_BY_PATIENT: { label: 'ملغاة (مريض)', color: statusColors.error, icon: <Cancel fontSize="small" /> },
  CANCELLED_BY_CENTER:  { label: 'ملغاة (مركز)', color: '#d32f2f', icon: <Cancel fontSize="small" /> },
  NO_SHOW:    { label: 'لم يحضر', color: statusColors.warning, icon: <PersonOff fontSize="small" /> },
  PENDING:    { label: 'معلقة', color: '#9e9e9e', icon: <HourglassEmpty fontSize="small" /> },
};

const getStatusConf = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.SCHEDULED;

const isSameDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

/**
 * Generate calendar grid cells for given month.
 * Weeks start on Saturday (index 6 in JS).
 */
function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const grid = [];
  // JS: 0=Sun → shift to start on Sat: (day+1)%7
  const startOffset = (firstDay.getDay() + 1) % 7;

  // Fill leading blanks
  for (let i = 0; i < startOffset; i++) {
    const d = new Date(year, month, 1 - startOffset + i);
    grid.push({ date: d, inMonth: false });
  }
  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push({ date: new Date(year, month, d), inMonth: true });
  }
  // Fill trailing blanks to complete 6×7=42 or nearest 7-multiple
  while (grid.length % 7 !== 0) {
    const last = grid[grid.length - 1].date;
    const next = new Date(last);
    next.setDate(next.getDate() + 1);
    grid.push({ date: next, inMonth: false });
  }
  return grid;
}

/* ──────── Demo data ──────── */
const DEMO_EVENTS = (() => {
  const today = new Date();
  const events = [];
  const types = ['علاج طبيعي', 'علاج نطق', 'علاج وظيفي', 'علاج سلوكي'];
  const therapists = ['أ. محمد العلي', 'أ. فاطمة أحمد', 'أ. سارة الخالد', 'أ. عبدالله الحربي'];
  const rooms = ['غرفة 1', 'غرفة 2', 'غرفة 3', 'غرفة 4'];
  const patients = ['يوسف أحمد', 'ليلى خالد', 'عمر سعيد', 'ريم محمد', 'سلمان ناصر'];
  const statuses = ['COMPLETED', 'SCHEDULED', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'];

  for (let i = -14; i <= 14; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() + i);
    const count = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < count; j++) {
      const hour = 8 + Math.floor(Math.random() * 9);
      events.push({
        _id: `demo-${i}-${j}`,
        date: day.toISOString().slice(0, 10),
        startTime: `${String(hour).padStart(2, '0')}:00`,
        endTime: `${String(hour + 1).padStart(2, '0')}:00`,
        sessionType: types[j % types.length],
        therapistName: therapists[j % therapists.length],
        room: rooms[j % rooms.length],
        patientName: patients[j % patients.length],
        status: i < 0 ? (Math.random() > 0.2 ? 'COMPLETED' : statuses[3 + Math.floor(Math.random() * 2)]) : statuses[Math.floor(Math.random() * 3)],
        duration: 45 + Math.floor(Math.random() * 4) * 15,
      });
    }
  }
  return events;
})();

/* ═══════════════════════════════════════════════════════════════════════ */
/*                          MAIN COMPONENT                               */
/* ═══════════════════════════════════════════════════════════════════════ */
export default function SessionCalendarView() {
  const showSnackbar = useSnackbar();
  const today = useMemo(() => new Date(), []);

  // ─── State ───
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('month'); // month | week | day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(DEMO_EVENTS);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Filters
  const [filterTherapist, setFilterTherapist] = useState('');
  const [filterRoom, setFilterRoom] = useState('');
  const [filterType, setFilterType] = useState('');

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // ─── Derived lists for filters ───
  const therapistOptions = useMemo(() => [...new Set(events.map(e => e.therapistName).filter(Boolean))], [events]);
  const roomOptions = useMemo(() => [...new Set(events.map(e => e.room).filter(Boolean))], [events]);
  const typeOptions = useMemo(() => [...new Set(events.map(e => e.sessionType).filter(Boolean))], [events]);

  // ─── Filtered events ───
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterTherapist && e.therapistName !== filterTherapist) return false;
      if (filterRoom && e.room !== filterRoom) return false;
      if (filterType && e.sessionType !== filterType) return false;
      return true;
    });
  }, [events, filterTherapist, filterRoom, filterType]);

  // ─── Fetch ───
  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, month, 1).toISOString().slice(0, 10);
      const endDate = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const result = await therapistService.getCalendarSessions({ startDate, endDate });
      if (result?.events && Array.isArray(result.events) && result.events.length > 0) {
        setEvents(result.events);
      }
    } catch (err) {
      logger.warn('SessionCalendarView: fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  // ─── Navigation ───
  const goToToday = () => setCurrentDate(new Date());
  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };
  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  // ─── Month grid ───
  const monthGrid = useMemo(() => getMonthGrid(year, month), [year, month]);

  // ─── Events per date lookup ───
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach(e => {
      const key = (e.date || '').slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    // Sort each day by time
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')));
    return map;
  }, [filteredEvents]);

  // ─── Week view days ───
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const dayOfWeek = (start.getDay() + 1) % 7; // Sat=0
    start.setDate(start.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // ─── Event click ───
  const handleEventClick = (evt) => {
    setSelectedEvent(evt);
    setDetailOpen(true);
  };

  /* ─── Title text ─── */
  const headerTitle = viewMode === 'month'
    ? `${AR_MONTHS[month]} ${year}`
    : viewMode === 'week'
    ? `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${AR_MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`
    : `${currentDate.getDate()} ${AR_MONTHS[month]} ${year} — ${AR_DAYS_FULL[(currentDate.getDay() + 1) % 7]}`;

  /* ═════════════════ RENDER ═════════════════ */
  return (
    <DashboardErrorBoundary>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {/* ──── Header ──── */}
        <Box
          sx={{
            background: gradients.info,
            borderRadius: 3, p: 3, mb: 3, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CalendarIcon sx={{ fontSize: 44 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">تقويم الجلسات</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>عرض الجلسات العلاجية على التقويم</Typography>
            </Box>
          </Box>
        </Box>

        {/* ──── Toolbar ──── */}
        <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
          <Grid container spacing={2} alignItems="center">
            {/* Navigation */}
            <Grid item xs={12} md={4}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton onClick={goPrev}><NextIcon /></IconButton>
                <Button variant="outlined" size="small" startIcon={<TodayIcon />} onClick={goToday}>اليوم</Button>
                <IconButton onClick={goNext}><PrevIcon /></IconButton>
                <Typography variant="h6" fontWeight={600} sx={{ mx: 1 }}>
                  {headerTitle}
                </Typography>
              </Stack>
            </Grid>

            {/* View mode */}
            <Grid item xs={12} md={3}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(_, v) => { if (v) setViewMode(v); }}
                size="small"
                fullWidth
              >
                <ToggleButton value="month"><MonthIcon sx={{ mr: 0.5 }} /> شهري</ToggleButton>
                <ToggleButton value="week"><WeekIcon sx={{ mr: 0.5 }} /> أسبوعي</ToggleButton>
                <ToggleButton value="day"><DayIcon sx={{ mr: 0.5 }} /> يومي</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            {/* Filters */}
            <Grid item xs={12} md={5}>
              <Stack direction="row" spacing={1}>
                <TextField
                  select size="small" value={filterTherapist}
                  onChange={(e) => setFilterTherapist(e.target.value)}
                  label="المعالج" sx={{ minWidth: 130 }} SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {therapistOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField
                  select size="small" value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                  label="الغرفة" sx={{ minWidth: 110 }} SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {roomOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
                <TextField
                  select size="small" value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  label="النوع" sx={{ minWidth: 120 }} SelectProps={{ displayEmpty: true }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* ═══════ MONTH VIEW ═══════ */}
        {viewMode === 'month' && (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            {/* Day headers */}
            <Grid container sx={{ bgcolor: 'primary.main', color: 'white' }}>
              {AR_DAYS_SHORT.map(d => (
                <Grid item xs key={d} sx={{ p: 1.5, textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
                  <Typography variant="subtitle2" fontWeight={600}>{d}</Typography>
                </Grid>
              ))}
            </Grid>
            {/* Calendar rows */}
            {Array.from({ length: monthGrid.length / 7 }, (_, row) => (
              <Grid container key={row} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                {monthGrid.slice(row * 7, row * 7 + 7).map((cell, ci) => {
                  const dateKey = cell.date.toISOString().slice(0, 10);
                  const dayEvents = eventsByDate[dateKey] || [];
                  const isToday = isSameDay(cell.date, today);

                  return (
                    <Grid
                      item xs key={ci}
                      sx={{
                        minHeight: 100, p: 0.5,
                        borderLeft: ci > 0 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        bgcolor: isToday ? 'action.selected' : cell.inMonth ? 'background.paper' : 'action.hover',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.focus' },
                      }}
                      onClick={() => { setCurrentDate(new Date(cell.date)); setViewMode('day'); }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 0.5 }}>
                        <Typography
                          variant="body2"
                          fontWeight={isToday ? 700 : cell.inMonth ? 500 : 400}
                          color={isToday ? 'primary.main' : cell.inMonth ? 'text.primary' : 'text.disabled'}
                        >
                          {cell.date.getDate()}
                        </Typography>
                        {dayEvents.length > 0 && (
                          <Badge badgeContent={dayEvents.length} color="primary" max={9} />
                        )}
                      </Box>
                      <Stack spacing={0.3} sx={{ mt: 0.3, maxHeight: 64, overflow: 'hidden' }}>
                        {dayEvents.slice(0, 3).map((evt) => {
                          const sc = getStatusConf(evt.status);
                          return (
                            <Box
                              key={evt._id}
                              onClick={(e) => { e.stopPropagation(); handleEventClick(evt); }}
                              sx={{
                                bgcolor: sc.color, color: '#fff',
                                borderRadius: 1, px: 0.6, py: 0.15,
                                fontSize: '0.65rem', lineHeight: 1.3,
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                cursor: 'pointer',
                                '&:hover': { opacity: 0.85 },
                              }}
                            >
                              {evt.startTime} {evt.patientName || evt.sessionType}
                            </Box>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>
                            +{dayEvents.length - 3} أخرى
                          </Typography>
                        )}
                      </Stack>
                    </Grid>
                  );
                })}
              </Grid>
            ))}
          </Paper>
        )}

        {/* ═══════ WEEK VIEW ═══════ */}
        {viewMode === 'week' && (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Grid container sx={{ bgcolor: 'primary.main', color: 'white' }}>
              {weekDays.map((d, i) => (
                <Grid item xs key={i} sx={{ p: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                  <Typography variant="subtitle2" fontWeight={600}>{AR_DAYS_SHORT[i]}</Typography>
                  <Typography variant="body2">{d.getDate()}</Typography>
                </Grid>
              ))}
            </Grid>
            <Grid container sx={{ minHeight: 400 }}>
              {weekDays.map((d, i) => {
                const dateKey = d.toISOString().slice(0, 10);
                const dayEvents = eventsByDate[dateKey] || [];
                const isToday = isSameDay(d, today);

                return (
                  <Grid item xs key={i} sx={{
                    borderLeft: i > 0 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    bgcolor: isToday ? 'action.selected' : 'background.paper',
                    p: 1,
                  }}>
                    <Stack spacing={0.5}>
                      {dayEvents.map((evt) => {
                        const sc = getStatusConf(evt.status);
                        return (
                          <Card
                            key={evt._id}
                            variant="outlined"
                            sx={{
                              borderLeft: `4px solid ${sc.color}`,
                              borderRadius: 1.5,
                              cursor: 'pointer',
                              '&:hover': { boxShadow: 2 },
                            }}
                            onClick={() => handleEventClick(evt)}
                          >
                            <CardContent sx={{ py: 0.5, px: 1, '&:last-child': { pb: 0.5 } }}>
                              <Typography variant="caption" fontWeight={600} color="primary">{evt.startTime}</Typography>
                              <Typography variant="body2" noWrap sx={{ fontSize: '0.75rem' }}>
                                {evt.patientName || evt.sessionType}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {evt.therapistName}
                              </Typography>
                            </CardContent>
                          </Card>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', mt: 4 }}>
                          لا توجد جلسات
                        </Typography>
                      )}
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        )}

        {/* ═══════ DAY VIEW ═══════ */}
        {viewMode === 'day' && (() => {
          const dateKey = currentDate.toISOString().slice(0, 10);
          const dayEvents = eventsByDate[dateKey] || [];
          const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM

          return (
            <Paper sx={{ borderRadius: 3, p: 2 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {currentDate.getDate()} {AR_MONTHS[month]} — {AR_DAYS_FULL[(currentDate.getDay() + 1) % 7]}
                <Chip label={`${dayEvents.length} جلسة`} size="small" color="primary" sx={{ mr: 1 }} />
              </Typography>
              <Stack spacing={0}>
                {hours.map(h => {
                  const hourStr = `${String(h).padStart(2, '0')}`;
                  const hourEvents = dayEvents.filter(e => (e.startTime || '').startsWith(hourStr));

                  return (
                    <Box
                      key={h}
                      sx={{
                        display: 'flex', borderBottom: '1px solid', borderColor: 'divider',
                        minHeight: 56, '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Box sx={{ width: 70, flexShrink: 0, p: 1, borderLeft: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {hourStr}:00
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1, p: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {hourEvents.map(evt => {
                          const sc = getStatusConf(evt.status);
                          return (
                            <Card
                              key={evt._id}
                              sx={{
                                borderLeft: `4px solid ${sc.color}`,
                                borderRadius: 2, flex: '1 1 auto',
                                maxWidth: 300, cursor: 'pointer',
                                '&:hover': { boxShadow: 3 },
                              }}
                              variant="outlined"
                              onClick={() => handleEventClick(evt)}
                            >
                              <CardContent sx={{ py: 0.5, px: 1.5, '&:last-child': { pb: 0.5 } }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {evt.patientName || 'مريض'}
                                  </Typography>
                                  <Chip
                                    icon={sc.icon}
                                    label={sc.label}
                                    size="small"
                                    sx={{ bgcolor: sc.color, color: '#fff', height: 22, '& .MuiChip-icon': { color: '#fff' } }}
                                  />
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  {evt.startTime} - {evt.endTime} | {evt.therapistName} | {evt.room}
                                </Typography>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            </Paper>
          );
        })()}

        {/* ──── Legend ──── */}
        <Paper sx={{ p: 2, mt: 2, borderRadius: 3 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
            {Object.entries(STATUS_CONFIG).filter(([k]) => !k.includes('BY_')).map(([key, conf]) => (
              <Chip
                key={key}
                icon={conf.icon}
                label={conf.label}
                size="small"
                sx={{ bgcolor: conf.color, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
              />
            ))}
          </Stack>
        </Paper>

        {/* ──── Session Detail Dialog ──── */}
        <Dialog
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {selectedEvent && (() => {
            const sc = getStatusConf(selectedEvent.status);
            return (
              <>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>تفاصيل الجلسة</Typography>
                  </Box>
                  <IconButton onClick={() => setDetailOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <Divider />
                <DialogContent>
                  <Stack spacing={2.5} sx={{ pt: 1 }}>
                    {/* Status badge */}
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        icon={sc.icon}
                        label={sc.label}
                        sx={{ bgcolor: sc.color, color: '#fff', fontSize: '1rem', height: 36, '& .MuiChip-icon': { color: '#fff' } }}
                      />
                    </Box>

                    {/* Info rows */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonIcon color="primary" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">المريض</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedEvent.patientName || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <PersonIcon color="secondary" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">المعالج</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedEvent.therapistName || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TypeIcon color="info" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">نوع الجلسة</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedEvent.sessionType || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <RoomIcon color="action" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">الغرفة</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedEvent.room || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarIcon color="primary" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">التاريخ</Typography>
                            <Typography variant="body2" fontWeight={600}>{selectedEvent.date || '-'}</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid item xs={6}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <ScheduleIcon color="primary" />
                          <Box>
                            <Typography variant="caption" color="text.secondary">الوقت</Typography>
                            <Typography variant="body2" fontWeight={600}>
                              {selectedEvent.startTime} — {selectedEvent.endTime} ({selectedEvent.duration || '-'} دقيقة)
                            </Typography>
                          </Box>
                        </Stack>
                      </Grid>
                    </Grid>

                    {selectedEvent.notes && (
                      <>
                        <Divider />
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600} gutterBottom>ملاحظات</Typography>
                          <Typography variant="body2" color="text.secondary">{selectedEvent.notes}</Typography>
                        </Box>
                      </>
                    )}
                  </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                  <Button onClick={() => setDetailOpen(false)} variant="outlined">إغلاق</Button>
                </DialogActions>
              </>
            );
          })()}
        </Dialog>
      </Container>
    </DashboardErrorBoundary>
  );
}
