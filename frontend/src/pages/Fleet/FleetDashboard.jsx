import React, { useState, useEffect, useCallback } from 'react';
import computeStatusCounts from '../../utils/computeStatusCounts';
import {
  Container, Typography, Grid, Paper, Box,
  Chip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Button,
} from '@mui/material';
import {
  DirectionsBus as FleetIcon,
  LocalShipping as VehicleIcon,
  Person as DriverIcon,
  Route as RouteIcon,
  Speed as SpeedIcon,
  LocalGasStation as FuelIcon,
  Build as MaintenanceIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, PieChart, Pie, Cell, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import fleetService from '../../services/fleet.service';
import { useNavigate } from 'react-router-dom';
import ModuleKPICard from '../../components/dashboard/shared/ModuleKPICard';
import EmptyState from '../../components/dashboard/shared/EmptyState';
import DashboardErrorBoundary from '../../components/dashboard/shared/DashboardErrorBoundary';

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  totalVehicles: 18,
  activeVehicles: 14,
  totalDrivers: 22,
  activeRoutes: 8,
  tripsToday: 12,
  fuelCostMonth: 24500,
  maintenancePending: 3,
  accidents: 1,
};

const DEMO_VEHICLE_STATUS = [
  { name: 'نشطة', value: 14, color: statusColors.success },
  { name: 'في الصيانة', value: 2, color: statusColors.warning },
  { name: 'متوقفة', value: 2, color: statusColors.error },
];

const DEMO_FUEL_TREND = [
  { month: 'يناير', cost: 22000, trips: 180 },
  { month: 'فبراير', cost: 19500, trips: 165 },
  { month: 'مارس', cost: 24500, trips: 195 },
  { month: 'أبريل', cost: 21000, trips: 172 },
  { month: 'مايو', cost: 23500, trips: 188 },
  { month: 'يونيو', cost: 20500, trips: 170 },
];

const DEMO_VEHICLE_TYPES = [
  { name: 'حافلة كبيرة', value: 4, color: chartColors.category[0] },
  { name: 'حافلة صغيرة', value: 6, color: chartColors.category[1] },
  { name: 'سيارة ركاب', value: 5, color: chartColors.category[2] },
  { name: 'شاحنة نقل', value: 3, color: chartColors.category[3] },
];

const DEMO_DRIVERS = [
  { id: 1, name: 'سعيد الحربي', vehicle: 'حافلة كبيرة #3', trips: 28, status: 'active' },
  { id: 2, name: 'ماجد العتيبي', vehicle: 'حافلة صغيرة #1', trips: 25, status: 'active' },
  { id: 3, name: 'فهد الشمري', vehicle: 'سيارة ركاب #2', trips: 22, status: 'active' },
  { id: 4, name: 'عبدالرحمن القحطاني', vehicle: 'حافلة كبيرة #1', trips: 20, status: 'leave' },
  { id: 5, name: 'تركي المطيري', vehicle: 'شاحنة نقل #1', trips: 18, status: 'active' },
];

const DEMO_RECENT_TRIPS = [
  { id: 1, route: 'المركز ← مدرسة النور', driver: 'سعيد الحربي', vehicle: 'حافلة #3', time: '07:30', students: 18, status: 'completed' },
  { id: 2, route: 'المركز ← حي الربوة', driver: 'ماجد العتيبي', vehicle: 'حافلة #1', time: '07:45', students: 12, status: 'completed' },
  { id: 3, route: 'حي الورود ← المركز', driver: 'فهد الشمري', vehicle: 'سيارة #2', time: '08:00', students: 4, status: 'in-progress' },
  { id: 4, route: 'المركز ← المستشفى', driver: 'تركي المطيري', vehicle: 'شاحنة #1', time: '09:00', students: 0, status: 'scheduled' },
];

const STATUS_MAP = {
  completed: { label: 'مكتملة', color: 'success' },
  'in-progress': { label: 'جارية', color: 'info' },
  scheduled: { label: 'مجدولة', color: 'warning' },
  active: { label: 'نشط', color: 'success' },
  leave: { label: 'إجازة', color: 'default' },
};

export default function FleetDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [vehicleStatus, setVehicleStatus] = useState(DEMO_VEHICLE_STATUS);
  const [fuelTrend, _setFuelTrend] = useState(DEMO_FUEL_TREND);
  const [vehicleTypes, setVehicleTypes] = useState(DEMO_VEHICLE_TYPES);
  const [topDrivers, setTopDrivers] = useState(DEMO_DRIVERS);
  const [recentTrips, setRecentTrips] = useState(DEMO_RECENT_TRIPS);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [vehiclesRes, driversRes, tripsRes, routesRes] = await Promise.all([
        fleetService.getVehicles().catch(err => { logger.warn('Fleet: vehicles fetch', err); return null; }),
        fleetService.getDrivers().catch(err => { logger.warn('Fleet: drivers fetch', err); return null; }),
        fleetService.getTrips().catch(err => { logger.warn('Fleet: trips fetch', err); return null; }),
        fleetService.getRoutes().catch(err => { logger.warn('Fleet: routes fetch', err); return null; }),
      ]);

      const vehicles = vehiclesRes?.data || vehiclesRes || [];
      const drivers = driversRes?.data || driversRes || [];
      const trips = tripsRes?.data || tripsRes || [];
      const routes = routesRes?.data || routesRes || [];

      if (Array.isArray(vehicles) && vehicles.length > 0) {
        const { active, maintenance: inMaint } = computeStatusCounts(
          vehicles, 'status', ['active', 'maintenance']
        );
        const stopped = vehicles.length - active - inMaint;

        setStats(prev => ({
          ...prev,
          totalVehicles: vehicles.length,
          activeVehicles: active,
          totalDrivers: Array.isArray(drivers) ? drivers.length : prev.totalDrivers,
          activeRoutes: Array.isArray(routes) ? routes.filter(r => r.status === 'active').length : prev.activeRoutes,
          tripsToday: Array.isArray(trips) ? trips.filter(t => t.date?.slice(0, 10) === new Date().toISOString().slice(0, 10)).length : prev.tripsToday,
          maintenancePending: inMaint,
        }));

        setVehicleStatus([
          { name: 'نشطة', value: active, color: statusColors.success },
          { name: 'في الصيانة', value: inMaint, color: statusColors.warning },
          { name: 'متوقفة', value: stopped, color: statusColors.error },
        ]);

        /* vehicle types */
        const typeMap = {};
        const typeColors = chartColors.category;
        vehicles.forEach(v => { const t = v.type || 'أخرى'; typeMap[t] = (typeMap[t] || 0) + 1; });
        const typeArr = Object.entries(typeMap).map(([name, value], i) => ({
          name, value, color: typeColors[i % typeColors.length],
        }));
        if (typeArr.length > 0) setVehicleTypes(typeArr);
      }

      /* top drivers */
      if (Array.isArray(drivers) && drivers.length > 0) {
        const driverList = drivers.slice(0, 5).map((d, i) => ({
          id: d._id || i,
          name: d.name || d.fullName || 'سائق',
          vehicle: d.vehicleInfo || d.vehicle?.name || '-',
          trips: d.totalTrips || 0,
          status: d.status || 'active',
        }));
        setTopDrivers(driverList);
      }

      /* recent trips */
      if (Array.isArray(trips) && trips.length > 0) {
        const recent = trips
          .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
          .slice(0, 5)
          .map((t, i) => ({
            id: t._id || i,
            route: t.routeName || t.route?.name || '-',
            driver: t.driverName || t.driver?.name || '-',
            vehicle: t.vehicleName || t.vehicle?.name || '-',
            time: t.startTime || t.time || '-',
            students: t.passengers || t.studentCount || 0,
            status: t.status || 'scheduled',
          }));
        setRecentTrips(recent);
      }
    } catch (err) {
      logger.warn('FleetDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات الأسطول — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.warning, borderRadius: 3, p: 3, mb: 4, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FleetIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">لوحة تحكم الأسطول والنقل</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>إدارة المركبات والسائقين والرحلات</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="inherit" sx={{ color: statusColors.pinkDark, fontWeight: 600 }} startIcon={<ArrowForwardIcon />} onClick={() => navigate('/fleet')}>
          إدارة الأسطول
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="إجمالي المركبات" value={stats.totalVehicles} subtitle={`${stats.activeVehicles} نشطة`} icon={<VehicleIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="السائقين" value={stats.totalDrivers} subtitle="سائق مسجل" icon={<DriverIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="رحلات اليوم" value={stats.tripsToday} subtitle="رحلة مجدولة" icon={<RouteIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="المسارات النشطة" value={stats.activeRoutes} subtitle="مسار فعال" icon={<SpeedIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="تكلفة الوقود" value={`${(stats.fuelCostMonth / 1000).toFixed(1)}K`} subtitle="ر.س هذا الشهر" icon={<FuelIcon />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="صيانة معلقة" value={stats.maintenancePending} subtitle={`${stats.accidents} حادث`} icon={<MaintenanceIcon />} color="error" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>تكلفة الوقود والرحلات الشهرية</Typography>
            {fuelTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لتكلفة الوقود والرحلات الشهرية">
                <BarChart data={fuelTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <RTooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="cost" fill={statusColors.error} name="التكلفة (ر.س)" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="trips" stroke={statusColors.primaryBlue} strokeWidth={2} name="عدد الرحلات" dot={{ r: 4 }} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حالة المركبات</Typography>
            {vehicleStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={200} role="img" aria-label="رسم بياني لحالة المركبات">
                <PieChart>
                  <Pie data={vehicleStatus} cx="50%" cy="50%" outerRadius={75} innerRadius={45} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {vehicleStatus.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={200} />
            )}
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ mt: 2 }}>أنواع المركبات</Typography>
            {vehicleTypes.length > 0 ? (
              <ResponsiveContainer width="100%" height={200} role="img" aria-label="رسم بياني لأنواع المركبات">
                <PieChart>
                  <Pie data={vehicleTypes} cx="50%" cy="50%" outerRadius={75} innerRadius={45} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {vehicleTypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={200} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Row 2: Drivers + Recent Trips */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>أداء السائقين</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>السائق</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المركبة</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>الرحلات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topDrivers.map(d => (
                    <TableRow key={d.id} hover>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>{d.vehicle}</TableCell>
                      <TableCell align="center"><Chip label={d.trips} size="small" variant="outlined" /></TableCell>
                      <TableCell><Chip label={STATUS_MAP[d.status]?.label || d.status} color={STATUS_MAP[d.status]?.color || 'default'} size="small" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>آخر الرحلات</Typography>
              <Button size="small" onClick={() => navigate('/fleet')}>عرض الكل</Button>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>المسار</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>السائق</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المركبة</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>الوقت</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>الركاب</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTrips.map(t => (
                    <TableRow key={t.id} hover>
                      <TableCell>{t.route}</TableCell>
                      <TableCell>{t.driver}</TableCell>
                      <TableCell>{t.vehicle}</TableCell>
                      <TableCell align="center">{t.time}</TableCell>
                      <TableCell align="center">{t.students}</TableCell>
                      <TableCell>
                        <Chip label={STATUS_MAP[t.status]?.label || t.status} color={STATUS_MAP[t.status]?.color || 'default'} size="small" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Container>
    </DashboardErrorBoundary>
  );
}
