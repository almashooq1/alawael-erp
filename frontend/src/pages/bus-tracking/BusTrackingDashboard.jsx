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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Divider,
  Badge,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  Route as RouteIcon,
  People as PeopleIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  LocationOn as LocationIcon,
  Warning as WarningIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Build as MaintenanceIcon,
  MyLocation as GPSIcon,
  School as SchoolIcon,
  Navigation as NavIcon,
  Shield as SafetyIcon,
  Sos as SOSIcon,
} from '@mui/icons-material';
import busTrackingService from '../../services/busTrackingService';

// ── KPI Card ──
function KPICard({ title, value, icon, color = '#1976d2', subtitle }) {
  return (
    <Card sx={{ height: '100%', borderTop: `3px solid ${color}` }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: `${color}22`, color, width: 48, height: 48 }}>{icon}</Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BusTrackingDashboard() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [error, setError] = useState('');
  const [busDialog, setBusDialog] = useState(false);
  const [newBus, setNewBus] = useState({ plateNumber: '', capacity: '', model: '', driverName: '', driverPhone: '' });
  const [tripDialog, setTripDialog] = useState(false);
  const [tripData, setTripData] = useState({ busId: '', routeId: '', type: 'morning' });
  const [autoRefresh, _setAutoRefresh] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, busesRes, routesRes] = await Promise.all([
        busTrackingService.getDashboardOverview(),
        busTrackingService.getAllBuses(),
        busTrackingService.getAllRoutes(),
      ]);
      if (dashRes.data.success) setDashboard(dashRes.data.data);
      if (busesRes.data.success) setBuses(busesRes.data.data);
      if (routesRes.data.success) setRoutes(routesRes.data.data);
      setError('');
    } catch (err) {
      setError('فشل تحميل البيانات — تحقق من الاتصال');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchData]);

  const handleCreateBus = async () => {
    try {
      await busTrackingService.createBus(newBus);
      setBusDialog(false);
      setNewBus({ plateNumber: '', capacity: '', model: '', driverName: '', driverPhone: '' });
      fetchData();
    } catch {
      setError('فشل إضافة الحافلة');
    }
  };

  const handleStartTrip = async () => {
    try {
      await busTrackingService.startTrip(tripData);
      setTripDialog(false);
      setTripData({ busId: '', routeId: '', type: 'morning' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل بدء الرحلة');
    }
  };

  const handleEndTrip = async tripId => {
    try {
      await busTrackingService.endTrip(tripId);
      fetchData();
    } catch {
      setError('فشل إنهاء الرحلة');
    }
  };

  const handleSOS = async busId => {
    try {
      await busTrackingService.raiseSOS(busId);
      fetchData();
    } catch {
      setError('فشل إرسال إشارة الطوارئ');
    }
  };

  const handleAcknowledgeAlert = async alertId => {
    try {
      await busTrackingService.acknowledgeAlert(alertId);
      fetchData();
    } catch {
      setError('فشل تأكيد التنبيه');
    }
  };

  if (loading && !dashboard) return <LinearProgress />;

  const kpi = dashboard?.kpi || {};

  return (
    <Box sx={{ p: 3 }} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            <BusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            تتبع الحافلات المدرسية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نظام التتبع بالوقت الفعلي — لوحة تحكم الإدارة
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setBusDialog(true)}
          >
            إضافة حافلة
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<StartIcon />}
            onClick={() => setTripDialog(true)}
          >
            بدء رحلة
          </Button>
          <Tooltip title="تحديث">
            <IconButton onClick={fetchData}>
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

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="إجمالي الحافلات"
            value={kpi.totalBuses || 0}
            icon={<BusIcon />}
            color="#1976d2"
            subtitle={`${kpi.activeBuses || 0} نشطة — ${kpi.inMaintenanceBuses || 0} صيانة`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="الرحلات النشطة"
            value={kpi.activeTrips || 0}
            icon={<NavIcon />}
            color="#2e7d32"
            subtitle={`${kpi.todayTrips || 0} اليوم — ${kpi.completedToday || 0} مكتملة`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="الطلاب المسجلون"
            value={kpi.totalStudents || 0}
            icon={<SchoolIcon />}
            color="#ed6c02"
            subtitle={`${kpi.studentsOnBoard || 0} على الحافلات الآن`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="التنبيهات"
            value={kpi.activeAlerts || 0}
            icon={<WarningIcon />}
            color={kpi.criticalAlerts > 0 ? '#d32f2f' : '#757575'}
            subtitle={kpi.criticalAlerts > 0 ? `${kpi.criticalAlerts} حرجة!` : 'لا توجد تنبيهات حرجة'}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Active Trips */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <GPSIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
              الرحلات النشطة
            </Typography>
            {(dashboard?.activeTrips || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                لا توجد رحلات نشطة حالياً
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>الحافلة</TableCell>
                      <TableCell>السائق</TableCell>
                      <TableCell>النوع</TableCell>
                      <TableCell>المحطة الحالية</TableCell>
                      <TableCell>الركاب</TableCell>
                      <TableCell>الوصول المتوقع</TableCell>
                      <TableCell>إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dashboard.activeTrips.map(trip => (
                      <TableRow key={trip.tripId}>
                        <TableCell>
                          <Chip icon={<BusIcon />} label={trip.busPlate} size="small" />
                        </TableCell>
                        <TableCell>{trip.driverName || '—'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={trip.type === 'morning' ? 'ذهاب' : 'عودة'}
                            color={trip.type === 'morning' ? 'primary' : 'secondary'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{trip.currentStop}</TableCell>
                        <TableCell>
                          <Badge badgeContent={trip.studentsOnBoard} color="primary">
                            <PeopleIcon />
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {trip.eta
                            ? new Date(trip.eta).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Tooltip title="إنهاء الرحلة">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleEndTrip(trip.tripId)}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="SOS">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleSOS(trip.busId)}
                            >
                              <SOSIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Grid>

        {/* Safety Alerts */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              <SafetyIcon sx={{ mr: 1, verticalAlign: 'middle', color: 'warning.main' }} />
              تنبيهات السلامة
            </Typography>
            {(dashboard?.recentAlerts || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                ✅ لا توجد تنبيهات نشطة
              </Typography>
            ) : (
              <List dense>
                {dashboard.recentAlerts.map(alert => (
                  <ListItem
                    key={alert.id}
                    secondaryAction={
                      <IconButton size="small" onClick={() => handleAcknowledgeAlert(alert.id)}>
                        <CheckIcon color="success" />
                      </IconButton>
                    }
                  >
                    <ListItemIcon>
                      {alert.severity === 'critical' ? (
                        <WarningIcon color="error" />
                      ) : (
                        <SpeedIcon color="warning" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.message}
                      secondary={new Date(alert.createdAt).toLocaleTimeString('ar-SA')}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Bus Fleet */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <BusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              أسطول الحافلات
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم اللوحة</TableCell>
                    <TableCell>الموديل</TableCell>
                    <TableCell>السعة</TableCell>
                    <TableCell>السائق</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المسار</TableCell>
                    <TableCell>آخر موقع</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buses.map(bus => (
                    <TableRow key={bus.id}>
                      <TableCell>
                        <Typography fontWeight="bold">{bus.plateNumber}</Typography>
                      </TableCell>
                      <TableCell>{bus.model}</TableCell>
                      <TableCell>{bus.capacity} راكب</TableCell>
                      <TableCell>
                        {bus.driverName || '—'}
                        {bus.driverPhone && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {bus.driverPhone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={
                            bus.status === 'active'
                              ? 'نشطة'
                              : bus.status === 'maintenance'
                                ? 'صيانة'
                                : 'غير نشطة'
                          }
                          color={
                            bus.status === 'active'
                              ? 'success'
                              : bus.status === 'maintenance'
                                ? 'warning'
                                : 'default'
                          }
                          icon={bus.status === 'maintenance' ? <MaintenanceIcon /> : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        {bus.routeId
                          ? routes.find(r => r.id === bus.routeId)?.name || '—'
                          : 'غير مخصص'}
                      </TableCell>
                      <TableCell>
                        {bus.currentLocation ? (
                          <Chip
                            size="small"
                            icon={<LocationIcon />}
                            label={`${bus.currentLocation.lat.toFixed(3)}, ${bus.currentLocation.lng.toFixed(3)}`}
                            variant="outlined"
                            color="info"
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            لا يوجد
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Route Map */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              <RouteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              المسارات
            </Typography>
            <Grid container spacing={2}>
              {routes.map(route => (
                <Grid item xs={12} md={4} key={route.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        {route.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {route.stops.length} محطات — {route.distance || '—'} كم —{' '}
                        {route.estimatedDuration} دقيقة
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      {route.stops.map((stop, i) => (
                        <Box key={i} display="flex" alignItems="center" gap={1} mb={0.5}>
                          <LocationIcon fontSize="small" color={i === 0 ? 'success' : 'action'} />
                          <Typography variant="body2">
                            {stop.order}. {stop.name}
                          </Typography>
                          {stop.estimatedTime && (
                            <Chip size="small" label={stop.estimatedTime} variant="outlined" />
                          )}
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Add Bus Dialog ── */}
      <Dialog open={busDialog} onClose={() => setBusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة حافلة جديدة</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="رقم اللوحة"
              value={newBus.plateNumber}
              onChange={e => setNewBus(p => ({ ...p, plateNumber: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="السعة"
              type="number"
              value={newBus.capacity}
              onChange={e => setNewBus(p => ({ ...p, capacity: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="الموديل"
              value={newBus.model}
              onChange={e => setNewBus(p => ({ ...p, model: e.target.value }))}
              fullWidth
            />
            <TextField
              label="اسم السائق"
              value={newBus.driverName}
              onChange={e => setNewBus(p => ({ ...p, driverName: e.target.value }))}
              fullWidth
            />
            <TextField
              label="رقم هاتف السائق"
              value={newBus.driverPhone}
              onChange={e => setNewBus(p => ({ ...p, driverPhone: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBusDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateBus} disabled={!newBus.plateNumber || !newBus.capacity}>
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Start Trip Dialog ── */}
      <Dialog open={tripDialog} onClose={() => setTripDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>بدء رحلة جديدة</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              select
              label="الحافلة"
              value={tripData.busId}
              onChange={e => setTripData(p => ({ ...p, busId: e.target.value }))}
              required
              fullWidth
            >
              {buses
                .filter(b => b.status === 'active')
                .map(b => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.plateNumber} — {b.driverName || 'بدون سائق'}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="المسار"
              value={tripData.routeId}
              onChange={e => setTripData(p => ({ ...p, routeId: e.target.value }))}
              required
              fullWidth
            >
              {routes.map(r => (
                <MenuItem key={r.id} value={r.id}>
                  {r.name} ({r.stops.length} محطات)
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="نوع الرحلة"
              value={tripData.type}
              onChange={e => setTripData(p => ({ ...p, type: e.target.value }))}
              fullWidth
            >
              <MenuItem value="morning">ذهاب (للمركز)</MenuItem>
              <MenuItem value="afternoon">عودة (للمنزل)</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTripDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleStartTrip}
            disabled={!tripData.busId || !tripData.routeId}
          >
            بدء الرحلة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
