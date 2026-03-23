import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  LinearProgress,
  Alert,
  TextField,
  Divider,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  People as PeopleIcon,
  LocationOn as LocationIcon,
  Notifications as NotifIcon,
  NotificationsActive as NotifActiveIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  School as SchoolIcon,
  MyLocation as GPSIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  DoneAll as DoneAllIcon,
  ArrowForward as ArrowIcon,
  AccessTime as TimeIcon,
  NearMe as ETAIcon,
} from '@mui/icons-material';
import busTrackingService from '../../services/busTrackingService';

export default function ParentBusTracker() {
  const [phone, setPhone] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedBus, setSelectedBus] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [etaData, setEtaData] = useState({});
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    if (!phone) return;
    try {
      setLoading(true);
      const [dashRes, notifRes] = await Promise.all([
        busTrackingService.getParentDashboard(phone),
        busTrackingService.getNotifications(phone, { limit: 20 }),
      ]);
      if (dashRes.data.success) setDashboard(dashRes.data.data);
      if (notifRes.data.success) setNotifications(notifRes.data.data);
      setError('');
    } catch (err) {
      setError('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  // Auto-refresh every 15s when logged in
  useEffect(() => {
    if (!loggedIn) return;
    fetchDashboard();
    const timer = setInterval(fetchDashboard, 15000);
    return () => clearInterval(timer);
  }, [loggedIn, fetchDashboard]);

  const handleLogin = () => {
    if (phone.length >= 10) {
      setLoggedIn(true);
    }
  };

  const handleTrackBus = async busId => {
    try {
      const res = await busTrackingService.trackBusForParent(busId, phone);
      if (res.data.success) {
        setTrackingData(res.data.data);
        setSelectedBus(busId);
      }
    } catch {
      setError('فشل تتبع الحافلة');
    }
  };

  const handleGetETA = async studentId => {
    try {
      const res = await busTrackingService.getETAForStudent(studentId);
      if (res.data.success) {
        setEtaData(prev => ({ ...prev, [studentId]: res.data.data }));
      }
    } catch {
      /* ignore */
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await busTrackingService.markAllNotificationsRead(phone);
      fetchDashboard();
    } catch {
      /* ignore */
    }
  };

  // ── Login Screen ──
  if (!loggedIn) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
        }}
        dir="rtl"
      >
        <Card sx={{ maxWidth: 420, width: '100%', p: 2 }}>
          <CardContent>
            <Box textAlign="center" mb={3}>
              <Avatar sx={{ bgcolor: '#1976d2', width: 64, height: 64, mx: 'auto', mb: 2 }}>
                <BusIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                بوابة تتبع الحافلات
              </Typography>
              <Typography variant="body2" color="text.secondary">
                أدخل رقم هاتفك المسجل لتتبع حافلة طفلك
              </Typography>
            </Box>
            <TextField
              label="رقم الهاتف"
              placeholder="05xxxxxxxx"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              inputProps={{ dir: 'ltr' }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleLogin}
              disabled={phone.length < 10}
              startIcon={<PhoneIcon />}
            >
              دخول
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (loading && !dashboard) return <LinearProgress />;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            <BusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            تتبع حافلة طفلك
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <PhoneIcon sx={{ fontSize: 14, mr: 0.5 }} />
            {phone} — {dashboard?.totalStudents || 0} طالب مسجل
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Badge badgeContent={unreadCount} color="error">
            <NotifIcon color="action" />
          </Badge>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchDashboard}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {dashboard?.message && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {dashboard.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Student Cards */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            أبنائي
          </Typography>
          <Grid container spacing={2}>
            {(dashboard?.students || []).map(student => (
              <Grid item xs={12} sm={6} md={4} key={student.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRight: `4px solid ${
                      student.status === 'على الحافلة'
                        ? '#2e7d32'
                        : student.status === 'في المحطة'
                          ? '#ed6c02'
                          : '#757575'
                    }`,
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {student.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {student.grade} — الحافلة {student.busPlate}
                        </Typography>
                      </Box>
                      <Chip
                        label={student.status}
                        size="small"
                        color={
                          student.status === 'على الحافلة'
                            ? 'success'
                            : student.status === 'في المحطة'
                              ? 'warning'
                              : 'default'
                        }
                      />
                    </Box>

                    {student.lastEvent && (
                      <Box mt={1} p={1} bgcolor="#f5f5f5" borderRadius={1}>
                        <Typography variant="caption" color="text.secondary">
                          آخر حدث: {student.lastEvent.type === 'boarding' ? '🚌 صعود' : '👋 نزول'} —{' '}
                          {student.lastEvent.stop}
                        </Typography>
                      </Box>
                    )}

                    <Box mt={2} display="flex" gap={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<GPSIcon />}
                        onClick={() => handleTrackBus(student.busId)}
                      >
                        تتبع الحافلة
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        startIcon={<ETAIcon />}
                        onClick={() => handleGetETA(student.id)}
                      >
                        وقت الوصول
                      </Button>
                    </Box>

                    {/* ETA display */}
                    {etaData[student.id] && (
                      <Box mt={1} p={1} bgcolor="#e8f5e9" borderRadius={1}>
                        {etaData[student.id].hasActiveTrip ? (
                          etaData[student.id].passed ? (
                            <Typography variant="body2" color="warning.main">
                              ⚠️ الحافلة تجاوزت المحطة
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="success.main">
                              🕐 {etaData[student.id].stopsAway} محطات — تقريباً{' '}
                              {etaData[student.id].etaMinutes} دقيقة
                            </Typography>
                          )
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            لا توجد رحلة نشطة
                          </Typography>
                        )}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Active Bus Tracking */}
        {dashboard?.activeBuses?.length > 0 && (
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                <GPSIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
                حافلات نشطة
              </Typography>
              {dashboard.activeBuses.map(bus => (
                <Card key={bus.id} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          <BusIcon sx={{ mr: 1, fontSize: 18 }} />
                          {bus.plateNumber}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          السائق: {bus.driverName} — {bus.driverPhone}
                        </Typography>
                      </Box>
                      <Box textAlign="left">
                        <Chip
                          label={`${bus.studentsOnBoard} راكب`}
                          size="small"
                          icon={<PeopleIcon />}
                          color="primary"
                        />
                      </Box>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          المحطة الحالية
                        </Typography>
                        <Typography variant="body2">{bus.currentStop}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          الوصول المتوقع
                        </Typography>
                        <Typography variant="body2">
                          {bus.eta
                            ? new Date(bus.eta).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="text.secondary">
                          الموقع
                        </Typography>
                        <Typography variant="body2">
                          {bus.currentLocation
                            ? `${bus.currentLocation.lat.toFixed(4)}, ${bus.currentLocation.lng.toFixed(4)}`
                            : '—'}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Button
                      sx={{ mt: 1 }}
                      size="small"
                      variant="contained"
                      fullWidth
                      startIcon={<LocationIcon />}
                      onClick={() => handleTrackBus(bus.id)}
                    >
                      تتبع مباشر
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </Paper>
          </Grid>
        )}

        {/* Notifications */}
        <Grid item xs={12} md={dashboard?.activeBuses?.length > 0 ? 5 : 12}>
          <Paper sx={{ p: 2, maxHeight: 500, overflow: 'auto' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6">
                <Badge badgeContent={unreadCount} color="error">
                  <NotifActiveIcon sx={{ mr: 1 }} />
                </Badge>
                الإشعارات
              </Typography>
              {unreadCount > 0 && (
                <Button size="small" startIcon={<DoneAllIcon />} onClick={handleMarkAllRead}>
                  تحديد الكل كمقروء
                </Button>
              )}
            </Box>
            {notifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                لا توجد إشعارات
              </Typography>
            ) : (
              <List dense>
                {notifications.map(notif => (
                  <ListItem
                    key={notif.id}
                    sx={{
                      bgcolor: notif.read ? 'transparent' : '#e3f2fd',
                      borderRadius: 1,
                      mb: 0.5,
                    }}
                  >
                    <ListItemIcon>
                      {notif.type === 'trip_started' ? (
                        <ArrowIcon color="primary" />
                      ) : notif.type === 'trip_completed' ? (
                        <CheckIcon color="success" />
                      ) : notif.type === 'student_boarded' ? (
                        <PersonIcon color="info" />
                      ) : notif.type === 'student_alighted' ? (
                        <PersonIcon color="secondary" />
                      ) : notif.type === 'bus_arriving' ? (
                        <LocationIcon color="warning" />
                      ) : notif.type === 'safety_alert' ? (
                        <NotifActiveIcon color="error" />
                      ) : (
                        <NotifIcon />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={notif.message}
                      secondary={
                        <Box display="flex" gap={1} alignItems="center">
                          <TimeIcon sx={{ fontSize: 12 }} />
                          {new Date(notif.createdAt).toLocaleTimeString('ar-SA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {notif.eta && (
                            <>
                              {' — '}
                              <ScheduleIcon sx={{ fontSize: 12 }} />
                              الوصول:{' '}
                              {new Date(notif.eta).toLocaleTimeString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Detailed Bus Tracking */}
        {trackingData && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, border: '2px solid #1976d2' }}>
              <Typography variant="h6" gutterBottom>
                <GPSIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'primary.main' }} />
                تتبع مباشر — {trackingData.bus.plateNumber}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    معلومات الحافلة
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="السائق" secondary={trackingData.bus.driverName} />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="هاتف السائق"
                        secondary={trackingData.bus.driverPhone}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="المرافق" secondary={trackingData.bus.assistantName || '—'} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="الموديل" secondary={`${trackingData.bus.model} — ${trackingData.bus.color}`} />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    حالة الرحلة
                  </Typography>
                  {trackingData.trip ? (
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary="الحالة"
                          secondary={
                            <Chip
                              size="small"
                              label={trackingData.trip.status === 'in-progress' ? 'جارية' : trackingData.trip.status}
                              color="success"
                            />
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary="المحطة الحالية" secondary={trackingData.trip.currentStop} />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="الوصول المتوقع"
                          secondary={
                            trackingData.trip.eta
                              ? new Date(trackingData.trip.eta).toLocaleTimeString('ar-SA')
                              : '—'
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="عدد الركاب"
                          secondary={trackingData.trip.studentsOnBoard}
                        />
                      </ListItem>
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" mt={2}>
                      لا توجد رحلة نشطة
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    أبنائي على هذه الحافلة
                  </Typography>
                  <List dense>
                    {trackingData.myStudents?.map(s => (
                      <ListItem key={s.id}>
                        <ListItemIcon>
                          <SchoolIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={s.name}
                          secondary={
                            s.lastEvent
                              ? `${s.lastEvent.type === 'boarding' ? 'صعد' : 'نزل'} — ${s.lastEvent.stopName}`
                              : 'لا توجد أحداث'
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>

              {/* Route Stops */}
              {trackingData.route && (
                <Box mt={2}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    محطات المسار — {trackingData.route.name}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {trackingData.route.stops.map((stop, i) => (
                      <Chip
                        key={i}
                        label={`${stop.order}. ${stop.name}`}
                        variant={stop.name === trackingData.trip?.currentStop ? 'filled' : 'outlined'}
                        color={stop.name === trackingData.trip?.currentStop ? 'primary' : 'default'}
                        icon={<LocationIcon />}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Location */}
              {trackingData.location && (
                <Box
                  mt={2}
                  p={2}
                  bgcolor="#e8f5e9"
                  borderRadius={1}
                  display="flex"
                  justifyContent="space-between"
                >
                  <Typography variant="body2">
                    📍 الإحداثيات: {trackingData.location.lat.toFixed(5)},{' '}
                    {trackingData.location.lng.toFixed(5)}
                  </Typography>
                  <Typography variant="body2">
                    🚌 السرعة: {trackingData.location.speed || 0} كم/ساعة
                  </Typography>
                  <Typography variant="body2">
                    🕐 آخر تحديث:{' '}
                    {new Date(trackingData.location.timestamp).toLocaleTimeString('ar-SA')}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
