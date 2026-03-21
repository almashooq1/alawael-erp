/**
 * WorkflowCalendar – تقويم سير العمل
 * Calendar view showing tasks, deadlines, and reminders grouped by date.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  alpha,
} from '@mui/material';


import { useSnackbar } from '../../contexts/SnackbarContext';
import workflowService from '../../services/workflow.service';

const DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const priorityColors = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#1976d2',
  low: '#388e3c',
};
const typeConfig = {
  task: { icon: <Assignment fontSize="small" />, label: 'مهمة', color: '#1976d2' },
  deadline: { icon: <Flag fontSize="small" />, label: 'موعد نهائي', color: '#d32f2f' },
  reminder: { icon: <AccessAlarm fontSize="small" />, label: 'تذكير', color: '#f57c00' },
};

function DayCell({ date, events, isToday, isOtherMonth, onClick }) {
  const dayNum = date.getDate();
  const MAX = 3;
  const shown = events.slice(0, MAX);
  const more = events.length - MAX;

  return (
    <Paper
      onClick={() => onClick(date, events)}
      sx={{
        minHeight: 110,
        p: 0.5,
        cursor: 'pointer',
        border: '1px solid',
        borderColor: isToday ? 'primary.main' : 'divider',
        bgcolor: isOtherMonth ? 'grey.50' : 'background.paper',
        opacity: isOtherMonth ? 0.6 : 1,
        '&:hover': { borderColor: 'primary.light', boxShadow: 2 },
        transition: 'all 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 0.5 }}>
        <Typography
          variant="caption"
          fontWeight={isToday ? 700 : 400}
          color={isToday ? 'primary.main' : 'text.secondary'}
        >
          {dayNum}
        </Typography>
        {events.length > 0 && (
          <Badge
            badgeContent={events.length}
            color="primary"
            sx={{ '& .MuiBadge-badge': { fontSize: 10 } }}
          />
        )}
      </Box>
      <Stack spacing={0.3} sx={{ mt: 0.5 }}>
        {shown.map((e, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.3,
              bgcolor: alpha(typeConfig[e.type]?.color || '#666', 0.1),
              borderRadius: 0.5,
              px: 0.5,
              py: 0.2,
              borderRight: `3px solid ${typeConfig[e.type]?.color || '#666'}`,
            }}
          >
            <Typography variant="caption" noWrap sx={{ fontSize: 10 }}>
              {e.title}
            </Typography>
          </Box>
        ))}
        {more > 0 && (
          <Typography
            variant="caption"
            color="primary"
            sx={{ fontSize: 10, fontWeight: 600, px: 0.5 }}
          >
            +{more} المزيد
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

export default function WorkflowCalendar() {
  const nav = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month | week
  const [selectedDay, setSelectedDay] = useState(null);
  const [dialogEvents, setDialogEvents] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);
      const res = await workflowService.getCalendarEvents({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
      setEvents(res.data?.data?.events || res.data?.events || []);
    } catch {
      showSnackbar('تعذر تحميل بيانات التقويم', 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, showSnackbar]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const calendarGrid = useMemo(() => {
    const first = new Date(year, month, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();
    const cells = [];
    // prev month fill
    for (let i = startDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevDays - i), otherMonth: true });
    }
    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), otherMonth: false });
    }
    // next month fill
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ date: new Date(year, month + 1, d), otherMonth: true });
    }
    return cells;
  }, [year, month]);

  const eventsByDate = useMemo(() => {
    const map = {};
    (events || []).forEach(e => {
      const d = new Date(e.date || e.dueDate || e.reminderDate).toDateString();
      if (!map[d]) map[d] = [];
      if (filterType === 'all' || e.type === filterType) map[d].push(e);
    });
    return map;
  }, [events, filterType]);

  const todayStr = new Date().toDateString();

  const handleDayClick = (date, evts) => {
    setSelectedDay(date);
    setDialogEvents(evts);
    setDialogOpen(true);
  };

  const navigateMonth = dir => {
    setCurrentDate(new Date(year, month + dir, 1));
  };

  const goToday = () => setCurrentDate(new Date());

  const stats = useMemo(() => {
    const s = { total: 0, task: 0, deadline: 0, reminder: 0 };
    (events || []).forEach(e => {
      s.total++;
      if (s[e.type] !== undefined) s[e.type]++;
    });
    return s;
  }, [events]);

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => nav('/workflow')}>
            <ArrowBack />
          </IconButton>
          <CalendarMonth sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              تقويم سير العمل
            </Typography>
            <Typography variant="body2" color="text.secondary">
              عرض المهام والمواعيد النهائية والتذكيرات
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>تصفية</InputLabel>
            <Select value={filterType} label="تصفية" onChange={e => setFilterType(e.target.value)}>
              <MenuItem value="all">الكل</MenuItem>
              <MenuItem value="task">المهام</MenuItem>
              <MenuItem value="deadline">المواعيد</MenuItem>
              <MenuItem value="reminder">التذكيرات</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="اليوم">
            <IconButton onClick={goToday}>
              <Today />
            </IconButton>
          </Tooltip>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchCalendar}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* STATS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الأحداث', value: stats.total, color: '#6366f1', icon: <Event /> },
          { label: 'المهام', value: stats.task, color: '#1976d2', icon: <Assignment /> },
          { label: 'المواعيد النهائية', value: stats.deadline, color: '#d32f2f', icon: <Flag /> },
          { label: 'التذكيرات', value: stats.reminder, color: '#f57c00', icon: <AccessAlarm /> },
        ].map((s, i) => (
          <Grid item xs={6} md={3} key={i}>
            <Card
              sx={{ bgcolor: alpha(s.color, 0.06), border: `1px solid ${alpha(s.color, 0.15)}` }}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  py: 1.5,
                  '&:last-child': { pb: 1.5 },
                }}
              >
                <Avatar
                  sx={{ bgcolor: alpha(s.color, 0.15), color: s.color, width: 40, height: 40 }}
                >
                  {s.icon}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight={700} color={s.color}>
                    {loading ? '—' : s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* NAVIGATION */}
      <Paper
        sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <IconButton onClick={() => navigateMonth(-1)}>
          <ChevronRight />
        </IconButton>
        <Typography variant="h6" fontWeight={600}>
          {MONTHS_AR[month]} {year}
        </Typography>
        <IconButton onClick={() => navigateMonth(1)}>
          <ChevronLeft />
        </IconButton>
      </Paper>

      {/* CALENDAR GRID */}
      {loading ? (
        <Grid container spacing={1}>
          {Array.from({ length: 42 }).map((_, i) => (
            <Grid item xs={12 / 7} key={i}>
              <Skeleton variant="rectangular" height={110} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {/* Day headers */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {DAYS_AR.map(d => (
              <Grid item xs={12 / 7} key={d}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  textAlign="center"
                  display="block"
                  color="text.secondary"
                >
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>
          {/* Day cells */}
          <Grid container spacing={1}>
            {calendarGrid.map((cell, i) => {
              const key = cell.date.toDateString();
              const dayEvents = eventsByDate[key] || [];
              return (
                <Grid item xs={12 / 7} key={i}>
                  <DayCell
                    date={cell.date}
                    events={dayEvents}
                    isToday={key === todayStr}
                    isOtherMonth={cell.otherMonth}
                    onClick={handleDayClick}
                  />
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* DAY DETAIL DIALOG */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarMonth color="primary" />
          {selectedDay &&
            `${DAYS_AR[selectedDay.getDay()]} ${selectedDay.getDate()} ${MONTHS_AR[selectedDay.getMonth()]}`}
        </DialogTitle>
        <DialogContent dividers>
          {dialogEvents.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              لا توجد أحداث في هذا اليوم
            </Typography>
          ) : (
            <List dense>
              {dialogEvents.map((e, i) => (
                <ListItem
                  key={i}
                  sx={{
                    mb: 1,
                    borderRadius: 1,
                    bgcolor: alpha(typeConfig[e.type]?.color || '#666', 0.06),
                    borderRight: `4px solid ${typeConfig[e.type]?.color || '#666'}`,
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: typeConfig[e.type]?.color }}>
                    {typeConfig[e.type]?.icon || <Circle fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={e.title}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          label={typeConfig[e.type]?.label || e.type}
                          sx={{ fontSize: 10 }}
                        />
                        {e.priority && (
                          <Chip
                            size="small"
                            icon={<PriorityHigh sx={{ fontSize: 12 }} />}
                            label={e.priority}
                            sx={{ fontSize: 10, color: priorityColors[e.priority] }}
                          />
                        )}
                        {e.assignee && (
                          <Chip
                            size="small"
                            icon={<Person sx={{ fontSize: 12 }} />}
                            label={e.assignee}
                            sx={{ fontSize: 10 }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
