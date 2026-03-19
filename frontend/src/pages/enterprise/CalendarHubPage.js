/**
 * CalendarHubPage — التقويم الموحد
 *
 * Unified calendar with month grid, event management, room booking, Hijri support
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  IconButton,
  Chip,
  TextField,
  MenuItem,
  Select,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  LinearProgress,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  AvatarGroup,
  Tooltip,
  Badge,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  CalendarMonth as CalendarIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  Event as EventIcon,
  MeetingRoom as RoomIcon,
  AccessTime as TimeIcon,
  Circle as CircleIcon,
  Save as SaveIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import enterpriseProService from '../../services/enterprisePro.service';

const EVENT_TYPES = [
  { value: 'meeting', label: 'اجتماع', color: '#1565C0' },
  { value: 'deadline', label: 'موعد نهائي', color: '#C62828' },
  { value: 'reminder', label: 'تذكير', color: '#F9A825' },
  { value: 'holiday', label: 'إجازة', color: '#2E7D32' },
  { value: 'event', label: 'فعالية', color: '#6A1B9A' },
  { value: 'task', label: 'مهمة', color: '#00838F' },
  { value: 'maintenance', label: 'صيانة', color: '#E65100' },
];

const PRIORITY_MAP = {
  low: { label: 'منخفض', color: '#66BB6A' },
  medium: { label: 'متوسط', color: '#FFA726' },
  high: { label: 'عالي', color: '#EF5350' },
  urgent: { label: 'عاجل', color: '#B71C1C' },
};

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
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

function getDaysInMonth(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const initialEvent = {
  title: '',
  titleAr: '',
  description: '',
  type: 'meeting',
  priority: 'medium',
  start: '',
  end: '',
  allDay: false,
  location: '',
  module: '',
  relatedEntity: '',
  recurrence: { enabled: false, pattern: 'weekly', interval: 1, endDate: '' },
  reminders: [],
  color: '#1565C0',
  visibility: 'public',
};

export default function CalendarHubPage() {
  const { showSnackbar } = useSnackbar();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [todayEvents, setTodayEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...initialEvent });
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const cells = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const start = new Date(year, month, 1).toISOString();
      const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      const [evRes, todRes, stRes] = await Promise.all([
        enterpriseProService.getCalendarEvents({ start, end }),
        enterpriseProService.getTodayEvents(),
        enterpriseProService.getCalendarStats(),
      ]);
      setEvents(evRes.data || []);
      setTodayEvents(todRes.data || []);
      setStats(stRes.data);
    } catch {
      showSnackbar('خطأ في تحميل الأحداث', 'error');
    } finally {
      setLoading(false);
    }
  }, [year, month, showSnackbar]);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await enterpriseProService.getCalendarRooms();
      setRooms(res.data || []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  useEffect(() => {
    if (tab === 1) fetchRooms();
  }, [tab, fetchRooms]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const d = new Date(ev.start).getDate();
      if (!map[d]) map[d] = [];
      map[d].push(ev);
    });
    return map;
  }, [events]);

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const openCreate = day => {
    setEditId(null);
    const d = day || new Date().getDate();
    const startStr = new Date(year, month, d, 9, 0).toISOString().slice(0, 16);
    const endStr = new Date(year, month, d, 10, 0).toISOString().slice(0, 16);
    setForm({ ...initialEvent, start: startStr, end: endStr });
    setDialogOpen(true);
  };

  const openEdit = ev => {
    setEditId(ev._id);
    setForm({
      title: ev.title || '',
      titleAr: ev.titleAr || '',
      description: ev.description || '',
      type: ev.type || 'meeting',
      priority: ev.priority || 'medium',
      start: ev.start ? new Date(ev.start).toISOString().slice(0, 16) : '',
      end: ev.end ? new Date(ev.end).toISOString().slice(0, 16) : '',
      allDay: ev.allDay || false,
      location: ev.location || '',
      module: ev.module || '',
      relatedEntity: ev.relatedEntity || '',
      recurrence: ev.recurrence || { enabled: false, pattern: 'weekly', interval: 1, endDate: '' },
      reminders: ev.reminders || [],
      color: ev.color || '#1565C0',
      visibility: ev.visibility || 'public',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.title || !form.start) {
        showSnackbar('العنوان والتاريخ مطلوبان', 'warning');
        return;
      }
      if (editId) {
        await enterpriseProService.updateCalendarEvent(editId, form);
        showSnackbar('تم تحديث الحدث', 'success');
      } else {
        await enterpriseProService.createCalendarEvent(form);
        showSnackbar('تم إنشاء الحدث', 'success');
      }
      setDialogOpen(false);
      fetchEvents();
    } catch {
      showSnackbar('خطأ في الحفظ', 'error');
    }
  };

  const handleDelete = async id => {
    try {
      await enterpriseProService.deleteCalendarEvent(id);
      showSnackbar('تم الحذف', 'success');
      fetchEvents();
      setSelectedDay(null);
    } catch {
      showSnackbar('خطأ', 'error');
    }
  };

  const todayDate = new Date();
  const isToday = d =>
    d === todayDate.getDate() && month === todayDate.getMonth() && year === todayDate.getFullYear();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarIcon sx={{ fontSize: 36, color: '#1565C0' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              التقويم الموحد
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Unified Calendar Hub
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<AddIcon />} variant="contained" onClick={() => openCreate()}>
            حدث جديد
          </Button>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchEvents}>
            تحديث
          </Button>
        </Box>
      </Box>

      {/* Stats row */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'أحداث الشهر', value: events.length, color: '#1565C0' },
            { label: 'أحداث اليوم', value: todayEvents.length, color: '#C62828' },
            {
              label: 'الاجتماعات',
              value: events.filter(e => e.type === 'meeting').length,
              color: '#6A1B9A',
            },
            { label: 'حجوزات القاعات', value: stats.roomBookingCount || 0, color: '#00897B' },
          ].map((s, i) => (
            <Grid item xs={3} key={i}>
              <Card
                sx={{ background: `linear-gradient(135deg, ${alpha(s.color, 0.1)}, transparent)` }}
              >
                <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
                  <Typography variant="h4" fontWeight={700} color={s.color}>
                    {s.value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {s.label}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="التقويم الشهري" icon={<CalendarIcon />} iconPosition="start" />
        <Tab label="أحداث اليوم" icon={<TodayIcon />} iconPosition="start" />
        <Tab label="حجز القاعات" icon={<RoomIcon />} iconPosition="start" />
      </Tabs>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Tab 0: Monthly Calendar ── */}
      {tab === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={selectedDay ? 8 : 12}>
            <Paper sx={{ p: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 2,
                  mb: 2,
                }}
              >
                <IconButton onClick={prev}>
                  <PrevIcon />
                </IconButton>
                <Typography variant="h6" fontWeight={600}>
                  {MONTHS_AR[month]} {year}
                </Typography>
                <IconButton onClick={next}>
                  <NextIcon />
                </IconButton>
                <Button size="small" startIcon={<TodayIcon />} onClick={goToday}>
                  اليوم
                </Button>
              </Box>
              <Grid container>
                {DAYS_AR.map(d => (
                  <Grid item xs={12 / 7} key={d}>
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      textAlign="center"
                      display="block"
                      sx={{ py: 0.5, bgcolor: alpha('#1565C0', 0.05) }}
                    >
                      {d}
                    </Typography>
                  </Grid>
                ))}
                {cells.map((day, idx) => {
                  const dayEvents = day ? eventsByDay[day] || [] : [];
                  return (
                    <Grid item xs={12 / 7} key={idx}>
                      <Box
                        onClick={() => day && setSelectedDay(day)}
                        sx={{
                          minHeight: 80,
                          border: '1px solid',
                          borderColor: 'divider',
                          p: 0.5,
                          cursor: day ? 'pointer' : 'default',
                          bgcolor: !day
                            ? alpha('#000', 0.02)
                            : selectedDay === day
                              ? alpha('#1565C0', 0.08)
                              : 'transparent',
                          '&:hover': day ? { bgcolor: alpha('#1565C0', 0.05) } : {},
                        }}
                      >
                        {day && (
                          <>
                            <Badge
                              badgeContent={dayEvents.length}
                              color="primary"
                              invisible={dayEvents.length === 0}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={isToday(day) ? 700 : 400}
                                sx={
                                  isToday(day)
                                    ? {
                                        bgcolor: '#1565C0',
                                        color: '#fff',
                                        borderRadius: '50%',
                                        width: 28,
                                        height: 28,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                      }
                                    : {}
                                }
                              >
                                {day}
                              </Typography>
                            </Badge>
                            {dayEvents.slice(0, 3).map((ev, i) => {
                              const typeInfo = EVENT_TYPES.find(t => t.value === ev.type);
                              return (
                                <Tooltip title={ev.titleAr || ev.title} key={i}>
                                  <Typography
                                    variant="caption"
                                    noWrap
                                    display="block"
                                    sx={{
                                      bgcolor: alpha(typeInfo?.color || '#666', 0.15),
                                      borderRadius: 0.5,
                                      px: 0.5,
                                      mt: 0.3,
                                      fontSize: '0.65rem',
                                    }}
                                  >
                                    {ev.titleAr || ev.title}
                                  </Typography>
                                </Tooltip>
                              );
                            })}
                            {dayEvents.length > 3 && (
                              <Typography variant="caption" color="primary">
                                +{dayEvents.length - 3}
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>

          {/* Day Detail Sidebar */}
          {selectedDay && (
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, position: 'sticky', top: 80 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="h6" fontWeight={600}>
                    {selectedDay} {MONTHS_AR[month]}
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => openCreate(selectedDay)}
                  >
                    إضافة
                  </Button>
                </Box>
                <List dense>
                  {(eventsByDay[selectedDay] || []).map(ev => {
                    const typeInfo = EVENT_TYPES.find(t => t.value === ev.type);
                    return (
                      <ListItem
                        key={ev._id}
                        secondaryAction={
                          <Box>
                            <IconButton size="small" onClick={() => openEdit(ev)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(ev._id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <CircleIcon sx={{ color: typeInfo?.color || '#666', fontSize: 14 }} />
                        </ListItemIcon>
                        <ListItemText
                          primary={ev.titleAr || ev.title}
                          secondary={
                            <>
                              <TimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                              {ev.allDay
                                ? 'طوال اليوم'
                                : `${new Date(ev.start).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                              {ev.location && (
                                <>
                                  <LocationIcon
                                    sx={{ fontSize: 12, mr: 0.5, ml: 1, verticalAlign: 'middle' }}
                                  />
                                  {ev.location}
                                </>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                  {(!eventsByDay[selectedDay] || eventsByDay[selectedDay].length === 0) && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      textAlign="center"
                      sx={{ py: 2 }}
                    >
                      لا توجد أحداث
                    </Typography>
                  )}
                </List>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Tab 1: Today's Events ── */}
      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            أحداث اليوم — {todayDate.toLocaleDateString('ar-SA')}
          </Typography>
          <List>
            {todayEvents.map(ev => {
              const typeInfo = EVENT_TYPES.find(t => t.value === ev.type);
              const pInfo = PRIORITY_MAP[ev.priority];
              return (
                <ListItem
                  key={ev._id}
                  divider
                  sx={{ '&:hover': { bgcolor: alpha('#1565C0', 0.03) } }}
                >
                  <ListItemIcon>
                    <EventIcon sx={{ color: typeInfo?.color || '#666' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography fontWeight={600}>{ev.titleAr || ev.title}</Typography>
                        <Chip
                          label={typeInfo?.label || ev.type}
                          size="small"
                          sx={{
                            bgcolor: alpha(typeInfo?.color || '#666', 0.1),
                            color: typeInfo?.color,
                          }}
                        />
                        <Chip
                          label={pInfo?.label}
                          size="small"
                          sx={{ bgcolor: alpha(pInfo?.color || '#666', 0.1) }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Typography variant="caption">
                          <TimeIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                          {ev.allDay
                            ? 'طوال اليوم'
                            : `${new Date(ev.start).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })} - ${new Date(ev.end).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`}
                        </Typography>
                        {ev.location && (
                          <Typography variant="caption" sx={{ ml: 2 }}>
                            <LocationIcon sx={{ fontSize: 12, mr: 0.3, verticalAlign: 'middle' }} />
                            {ev.location}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  {ev.attendees?.length > 0 && (
                    <AvatarGroup max={3} sx={{ mr: 1 }}>
                      {ev.attendees.map((a, i) => (
                        <Avatar key={i} sx={{ width: 28, height: 28, fontSize: '0.7rem' }}>
                          {a.name?.charAt(0)}
                        </Avatar>
                      ))}
                    </AvatarGroup>
                  )}
                  <IconButton size="small" onClick={() => openEdit(ev)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </ListItem>
              );
            })}
            {todayEvents.length === 0 && (
              <Typography textAlign="center" color="text.secondary" sx={{ py: 4 }}>
                لا توجد أحداث اليوم 🎉
              </Typography>
            )}
          </List>
        </Paper>
      )}

      {/* ── Tab 2: Room Bookings ── */}
      {tab === 2 && (
        <Grid container spacing={2}>
          {rooms.map(room => (
            <Grid item xs={12} md={4} key={room._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <RoomIcon color="primary" />
                    <Typography variant="h6" fontWeight={600}>
                      {room.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    السعة: {room.capacity} شخص
                  </Typography>
                  {room.amenities?.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {room.amenities.map((a, i) => (
                        <Chip key={i} label={a} size="small" variant="outlined" />
                      ))}
                    </Box>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {room.isAvailable !== false ? '✅ متاحة للحجز' : '🔒 محجوزة'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {rooms.length === 0 && !loading && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">لا توجد قاعات مسجلة</Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      )}

      {/* ── Event Create/Edit Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل الحدث' : 'إنشاء حدث جديد'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="العنوان (عربي)"
                value={form.titleAr}
                onChange={e => setForm(f => ({ ...f, titleAr: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Title (EN)"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="الوصف"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                >
                  {EVENT_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                >
                  {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                    <MenuItem key={k} value={k}>
                      {v.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="البداية"
                value={form.start}
                onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="النهاية"
                value={form.end}
                onChange={e => setForm(f => ({ ...f, end: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="الموقع"
                value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="القسم"
                value={form.module}
                onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <Select
                  value={form.visibility}
                  onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
                >
                  <MenuItem value="public">عام</MenuItem>
                  <MenuItem value="private">خاص</MenuItem>
                  <MenuItem value="department">القسم فقط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="color"
                label="اللون"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!form.title && !form.titleAr}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
