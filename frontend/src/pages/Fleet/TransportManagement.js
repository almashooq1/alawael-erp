/**
 * 🚌 إدارة النقل والمواصلات — Transport Management Page
 * AlAwael ERP — Comprehensive transport ops: routes, trips, drivers, fuel, accidents, analytics
 * @created 2026-03-13
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Rating,
  Select,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme
} from '@mui/material';

import transportService from 'services/transportService';
import logger from 'utils/logger';
import { gradients } from 'theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';
import CheckIcon from '@mui/icons-material/Check';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import StarIcon from '@mui/icons-material/Star';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import { TrendIcon, ViewIcon } from 'utils/iconAliases';

/* ═══ Constants ═══ */
const STATUS_MAP = {
  نشط: { color: '#43A047', chip: 'success' },
  متوقف: { color: '#E53935', chip: 'error' },
  'قيد الإنشاء': { color: '#FF9800', chip: 'warning' },
  مجدول: { color: '#1E88E5', chip: 'info' },
  جاري: { color: '#FF9800', chip: 'warning' },
  مكتمل: { color: '#43A047', chip: 'success' },
  ملغي: { color: '#757575', chip: 'default' },
  متأخر: { color: '#E53935', chip: 'error' },
  متاح: { color: '#43A047', chip: 'success' },
  'في مهمة': { color: '#1E88E5', chip: 'info' },
  إجازة: { color: '#FF9800', chip: 'warning' },
  موقوف: { color: '#E53935', chip: 'error' },
  تدريب: { color: '#9C27B0', chip: 'secondary' },
  'قيد المعالجة': { color: '#FF9800', chip: 'warning' },
  مغلق: { color: '#43A047', chip: 'success' },
};

const SEVERITY_MAP = {
  بسيط: { color: '#43A047', icon: <CheckIcon fontSize="small" /> },
  متوسط: { color: '#FF9800', icon: <WarningIcon fontSize="small" /> },
  خطير: { color: '#E53935', icon: <AccidentIcon fontSize="small" /> },
  كارثي: { color: '#880E4F', icon: <CancelIcon fontSize="small" /> },
};

const CHART_COLORS = [
  '#667eea',
  '#43e97b',
  '#f5576c',
  '#4facfe',
  '#fa709a',
  '#f5af19',
  '#38f9d7',
  '#805AD5',
];

/* ═══ Sub-Components ═══ */

const StatCard = ({ icon, label, value, color, trend, subtitle, gradient }) => {
  return (
    <Card
      sx={{
        background:
          gradient ||
          `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
        color: gradient ? 'white' : 'inherit',
        borderRadius: 3,
        border: gradient ? 'none' : `1px solid ${alpha(color, 0.15)}`,
        height: '100%',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 28px ${alpha(color, 0.2)}` },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: gradient ? 'rgba(255,255,255,0.06)' : alpha(color, 0.04),
          transform: 'translate(20px, -20px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                bgcolor: gradient ? 'rgba(255,255,255,0.2)' : alpha(color, 0.12),
                color: gradient ? 'white' : color,
                width: 48,
                height: 48,
                boxShadow: `0 4px 12px ${alpha(color, 0.2)}`,
              }}
            >
              {icon}
            </Avatar>
            <Box>
              <Typography
                variant="caption"
                sx={{ opacity: 0.75, display: 'block', fontSize: '0.7rem', fontWeight: 500 }}
              >
                {label}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.65rem' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {trend && (
            <Chip
              size="small"
              icon={<TrendIcon sx={{ fontSize: 14 }} />}
              label={trend}
              sx={{
                bgcolor: gradient ? 'rgba(255,255,255,0.15)' : alpha('#43A047', 0.1),
                color: gradient ? 'white' : '#43A047',
                fontWeight: 700,
                fontSize: '0.65rem',
                height: 22,
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

function TabPanel({ children, value, index }) {
  return value === index ? (
    <Fade in timeout={400}>
      <Box sx={{ py: 2 }}>{children}</Box>
    </Fade>
  ) : null;
}

const StyledChip = ({ status }) => {
  const cfg = STATUS_MAP[status] || { color: '#757575', chip: 'default' };
  return (
    <Chip
      label={status}
      size="small"
      color={cfg.chip}
      sx={{ fontWeight: 600, fontSize: '0.72rem' }}
    />
  );
};

/* ════════════════════════════════════════════════════ */
/* ═══ MAIN: TransportManagement Component           ═══ */
/* ════════════════════════════════════════════════════ */
const TransportManagement = () => {
  const theme = useTheme();
  const showSnackbar = useSnackbar();

  /* ─── State ─── */
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [routes, setRoutes] = useState([]);
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [fuelRecords, setFuelRecords] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogs
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [tripDialogOpen, setTripDialogOpen] = useState(false);
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [fuelDialogOpen, setFuelDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Forms
  const emptyRoute = {
    routeName: '',
    type: 'ذهاب وإياب',
    stopsCount: 3,
    totalDistance: '',
    estimatedTime: '',
    assignedVehicle: '',
    assignedDriver: '',
    status: 'قيد الإنشاء',
  };
  const emptyTrip = {
    route: '',
    driver: '',
    vehicle: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '07:00',
    passengers: '',
    notes: '',
  };
  const emptyFuel = {
    vehicle: '',
    driver: '',
    date: new Date().toISOString().slice(0, 10),
    fuelType: 'بنزين',
    liters: '',
    costPerLiter: '',
    station: '',
    odometer: '',
  };
  const [routeForm, setRouteForm] = useState(emptyRoute);
  const [tripForm, setTripForm] = useState(emptyTrip);
  const [fuelForm, setFuelForm] = useState(emptyFuel);
  const [editMode, setEditMode] = useState(false);

  /* ─── Data Loaders ─── */
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, t, d, f, a, m] = await Promise.all([
        transportService.getRoutes(),
        transportService.getTrips(),
        transportService.getDrivers(),
        transportService.getFuelRecords(),
        transportService.getAccidents(),
        transportService.getMonthlyStats(),
      ]);
      setRoutes(Array.isArray(r) ? r : []);
      setTrips(Array.isArray(t) ? t : []);
      setDrivers(Array.isArray(d) ? d : []);
      setFuelRecords(Array.isArray(f) ? f : []);
      setAccidents(Array.isArray(a) ? a : []);
      setMonthlyStats(Array.isArray(m) ? m : []);
    } catch (err) {
      logger.error('TransportManagement load error:', err);
      showSnackbar('خطأ في تحميل بيانات النقل', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* ─── Derived Stats ─── */
  const stats = useMemo(() => {
    const activeRoutes = routes.filter(r => r.status === 'نشط').length;
    const completedTrips = trips.filter(t => t.status === 'مكتمل').length;
    const ongoingTrips = trips.filter(t => t.status === 'جاري').length;
    const availableDrivers = drivers.filter(d => d.status === 'متاح').length;
    const totalPassengers = trips.reduce((s, t) => s + (t.passengers || 0), 0);
    const totalFuelCost = fuelRecords.reduce((s, f) => s + (f.totalCost || 0), 0);
    const totalDistance = trips.reduce((s, t) => s + (t.distance || 0), 0);
    return {
      activeRoutes,
      completedTrips,
      ongoingTrips,
      availableDrivers,
      totalPassengers,
      totalFuelCost,
      totalDistance,
    };
  }, [routes, trips, drivers, fuelRecords]);

  const routeStatusDist = useMemo(() => {
    const map = {};
    routes.forEach(r => {
      const s = r.status || 'أخرى';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: STATUS_MAP[name]?.color || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [routes]);

  const tripStatusDist = useMemo(() => {
    const map = {};
    trips.forEach(t => {
      const s = t.status || 'أخرى';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: STATUS_MAP[name]?.color || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [trips]);

  const driverStatusDist = useMemo(() => {
    const map = {};
    drivers.forEach(d => {
      const s = d.status || 'أخرى';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({
      name,
      value,
      color: STATUS_MAP[name]?.color || CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [drivers]);

  /* ─── Filter Helpers ─── */
  const filterItems = arr =>
    arr.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || Object.values(item).some(v => String(v).toLowerCase().includes(q));
      const matchStatus = !statusFilter || item.status === statusFilter;
      return matchSearch && matchStatus;
    });

  /* ─── Handlers ─── */
  const handleSaveRoute = async () => {
    if (!routeForm.routeName.trim()) {
      showSnackbar('اسم المسار مطلوب', 'warning');
      return;
    }
    try {
      if (editMode && selectedItem) {
        await transportService.updateRoute(selectedItem._id, routeForm);
        showSnackbar('تم تحديث المسار بنجاح', 'success');
      } else {
        await transportService.createRoute(routeForm);
        showSnackbar('تم إنشاء المسار بنجاح', 'success');
      }
      setRouteDialogOpen(false);
      setRouteForm(emptyRoute);
      setEditMode(false);
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في حفظ المسار', 'error');
    }
  };

  const handleSaveTrip = async () => {
    if (!tripForm.route || !tripForm.driver) {
      showSnackbar('المسار والسائق مطلوبان', 'warning');
      return;
    }
    try {
      await transportService.createTrip(tripForm);
      showSnackbar('تم إنشاء الرحلة بنجاح', 'success');
      setTripDialogOpen(false);
      setTripForm(emptyTrip);
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في إنشاء الرحلة', 'error');
    }
  };

  const handleSaveFuel = async () => {
    if (!fuelForm.vehicle || !fuelForm.liters) {
      showSnackbar('المركبة والكمية مطلوبان', 'warning');
      return;
    }
    try {
      const cost = +(fuelForm.liters * fuelForm.costPerLiter).toFixed(2);
      await transportService.createFuelRecord({ ...fuelForm, totalCost: cost });
      showSnackbar('تم تسجيل التزويد بنجاح', 'success');
      setFuelDialogOpen(false);
      setFuelForm(emptyFuel);
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في تسجيل التزويد', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { type, id } = deleteTarget;
      if (type === 'route') await transportService.deleteRoute(id);
      else if (type === 'trip') await transportService.deleteTrip(id);
      showSnackbar('تم الحذف بنجاح', 'success');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadAll();
    } catch (_err) {
      showSnackbar('فشل في الحذف', 'error');
    }
  };

  const openEditRoute = route => {
    setRouteForm({
      routeName: route.routeName,
      type: route.type,
      stopsCount: route.stopsCount,
      totalDistance: route.totalDistance,
      estimatedTime: route.estimatedTime,
      assignedVehicle: route.assignedVehicle || '',
      assignedDriver: route.assignedDriver || '',
      status: route.status,
    });
    setSelectedItem(route);
    setEditMode(true);
    setRouteDialogOpen(true);
  };

  const openDetail = item => {
    setSelectedItem(item);
    setDetailDialogOpen(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPage(0);
  };

  /* ═══ RENDER ═══ */
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="#"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon sx={{ fontSize: 18 }} /> الرئيسية
        </Link>
        <Typography color="text.primary" sx={{ fontWeight: 600 }}>
          إدارة النقل والمواصلات
        </Typography>
      </Breadcrumbs>

      {/* ═══ Gradient Header ═══ */}
      <Card
        sx={{
          mb: 3,
          background:
            gradients.ocean ||
            gradients.info ||
            'linear-gradient(135deg, #667eea 0%, #00d2ff 100%)',
          color: 'white',
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -60,
            left: '30%',
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 3.5 }, position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 56, height: 56 }}>
                <TransportIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                  إدارة النقل والمواصلات
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                  إدارة شاملة للمسارات والرحلات والسائقين والمركبات والوقود والحوادث
                </Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={1}>
              <Tooltip title="تحديث البيانات">
                <IconButton
                  sx={{
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                  onClick={loadAll}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* ═══ Stats Cards (7) ═══ */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          {
            icon: <RouteIcon />,
            label: 'المسارات النشطة',
            value: stats.activeRoutes,
            color: '#1E88E5',
            trend: `${routes.length} إجمالي`,
          },
          {
            icon: <CheckIcon />,
            label: 'رحلات مكتملة',
            value: stats.completedTrips,
            color: '#43A047',
            trend: '+12%',
          },
          { icon: <PlayIcon />, label: 'رحلات جارية', value: stats.ongoingTrips, color: '#FF9800' },
          {
            icon: <DriverIcon />,
            label: 'سائقين متاحين',
            value: stats.availableDrivers,
            color: '#9C27B0',
            subtitle: `من ${drivers.length}`,
          },
          {
            icon: <PassengerIcon />,
            label: 'إجمالي الركاب',
            value: stats.totalPassengers.toLocaleString(),
            color: '#00BCD4',
          },
          {
            icon: <FuelIcon />,
            label: 'تكلفة الوقود',
            value: `${(stats.totalFuelCost / 1000).toFixed(1)}K`,
            color: '#E53935',
            subtitle: 'ر.س',
          },
          {
            icon: <SpeedIcon />,
            label: 'المسافة الكلية',
            value: `${stats.totalDistance.toFixed(0)} كم`,
            color: '#DD6B20',
          },
        ].map((s, i) => (
          <Grid item xs={6} sm={4} md={2} lg key={i}>
            <StatCard {...s} />
          </Grid>
        ))}
      </Grid>

      {/* ═══ Main Tabs ═══ */}
      <Paper
        sx={{
          borderRadius: 3,
          overflow: 'hidden',
          mb: 3,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_e, v) => {
            setActiveTab(v);
            resetFilters();
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            '& .MuiTab-root': {
              minHeight: 56,
              fontWeight: 600,
              fontSize: '0.85rem',
              '&.Mui-selected': { color: theme.palette.primary.main },
            },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<RouteIcon />} label="المسارات" iconPosition="start" />
          <Tab icon={<BusIcon />} label="الرحلات" iconPosition="start" />
          <Tab icon={<DriverIcon />} label="السائقين" iconPosition="start" />
          <Tab icon={<FuelIcon />} label="الوقود والتكاليف" iconPosition="start" />
          <Tab icon={<AccidentIcon />} label="الحوادث" iconPosition="start" />
          <Tab icon={<AnalyticsIcon />} label="التحليلات" iconPosition="start" />
        </Tabs>

        {/* ═══ TAB 0: Routes ═══ */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            {/* Toolbar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="بحث في المسارات..."
                size="small"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  label="الحالة"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {['نشط', 'متوقف', 'قيد الإنشاء'].map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setRouteForm(emptyRoute);
                  setEditMode(false);
                  setRouteDialogOpen(true);
                }}
                sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
              >
                إضافة مسار
              </Button>
            </Box>

            {/* Routes Table */}
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }} color="text.secondary">
                  جاري التحميل...
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer
                  component={Paper}
                  sx={{ borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                        {[
                          'كود',
                          'اسم المسار',
                          'النوع',
                          'المحطات',
                          'المسافة',
                          'الوقت',
                          'المركبة',
                          'السائق',
                          'الركاب',
                          'التقييم',
                          'الحالة',
                          'إجراءات',
                        ].map(h => (
                          <TableCell
                            key={h}
                            sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filterItems(routes)
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map(route => (
                          <TableRow
                            key={route._id}
                            hover
                            sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}
                          >
                            <TableCell>
                              <Chip
                                label={route.routeCode}
                                size="small"
                                variant="outlined"
                                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{route.routeName}</TableCell>
                            <TableCell>
                              <Chip
                                label={route.type}
                                size="small"
                                sx={{
                                  bgcolor: alpha('#1E88E5', 0.08),
                                  color: '#1E88E5',
                                  fontWeight: 600,
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">{route.stopsCount}</TableCell>
                            <TableCell>{route.totalDistance} كم</TableCell>
                            <TableCell>{route.estimatedTime} د</TableCell>
                            <TableCell>
                              {route.assignedVehicle || (
                                <Typography variant="caption" color="text.disabled">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {route.assignedDriver || (
                                <Typography variant="caption" color="text.disabled">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              <Badge badgeContent={route.passengers} color="info" max={99}>
                                <PassengerIcon color="action" fontSize="small" />
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Rating value={route.rating} precision={0.5} readOnly size="small" />
                            </TableCell>
                            <TableCell>
                              <StyledChip status={route.status} />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="عرض">
                                  <IconButton size="small" onClick={() => openDetail(route)}>
                                    <ViewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="تعديل">
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => openEditRoute(route)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setDeleteTarget({
                                        type: 'route',
                                        id: route._id,
                                        name: route.routeName,
                                      });
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      {filterItems(routes).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={12} sx={{ textAlign: 'center', py: 6 }}>
                            <RouteIcon sx={{ fontSize: 48, opacity: 0.15, mb: 1 }} />
                            <Typography color="text.secondary">لا توجد مسارات مطابقة</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={filterItems(routes).length}
                  page={page}
                  onPageChange={(_e, p) => setPage(p)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={e => {
                    setRowsPerPage(+e.target.value);
                    setPage(0);
                  }}
                  labelRowsPerPage="الصفوف:"
                  labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
                />
              </>
            )}
          </Box>
        </TabPanel>

        {/* ═══ TAB 1: Trips ═══ */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="بحث في الرحلات..."
                size="small"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  label="الحالة"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {transportService.getTripStatuses().map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setTripForm(emptyTrip);
                  setTripDialogOpen(true);
                }}
                sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
              >
                إضافة رحلة
              </Button>
            </Box>

            <TableContainer
              component={Paper}
              sx={{ borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                    {[
                      'رقم',
                      'المسار',
                      'السائق',
                      'المركبة',
                      'التاريخ',
                      'من',
                      'إلى',
                      'الركاب',
                      'المسافة',
                      'الوقود',
                      'الحالة',
                      'إجراءات',
                    ].map(h => (
                      <TableCell
                        key={h}
                        sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filterItems(trips)
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(trip => (
                      <TableRow key={trip._id} hover>
                        <TableCell>
                          <Chip
                            label={trip.tripNumber}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace' }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            fontWeight: 600,
                            maxWidth: 180,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {trip.route}
                        </TableCell>
                        <TableCell>{trip.driver}</TableCell>
                        <TableCell>{trip.vehicle}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{trip.date}</TableCell>
                        <TableCell>{trip.startTime}</TableCell>
                        <TableCell>{trip.endTime || '—'}</TableCell>
                        <TableCell align="center">{trip.passengers}</TableCell>
                        <TableCell>{trip.distance} كم</TableCell>
                        <TableCell>{trip.fuelConsumed} لتر</TableCell>
                        <TableCell>
                          <StyledChip status={trip.status} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="عرض">
                              <IconButton size="small" onClick={() => openDetail(trip)}>
                                <ViewIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setDeleteTarget({
                                    type: 'trip',
                                    id: trip._id,
                                    name: trip.tripNumber,
                                  });
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filterItems(trips).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12} sx={{ textAlign: 'center', py: 6 }}>
                        <BusIcon sx={{ fontSize: 48, opacity: 0.15, mb: 1 }} />
                        <Typography color="text.secondary">لا توجد رحلات مطابقة</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filterItems(trips).length}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              labelRowsPerPage="الصفوف:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
            />
          </Box>
        </TabPanel>

        {/* ═══ TAB 2: Drivers ═══ */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="بحث في السائقين..."
                size="small"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  label="الحالة"
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  {transportService.getDriverStatuses().map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ flex: 1 }} />
              <Chip
                label={`${drivers.length} سائق مسجل`}
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
            </Box>

            <Grid container spacing={2.5}>
              {filterItems(drivers).map(driver => {
                const statusCfg = STATUS_MAP[driver.status] || { color: '#757575' };
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={driver._id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        height: '100%',
                        transition: 'all 0.3s',
                        overflow: 'hidden',
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                        '&:hover': { boxShadow: 6, transform: 'translateY(-3px)' },
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 4,
                          background: statusCfg.color,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                          <Avatar
                            sx={{
                              width: 50,
                              height: 50,
                              bgcolor: alpha(statusCfg.color, 0.12),
                              color: statusCfg.color,
                              fontWeight: 700,
                              fontSize: 18,
                            }}
                          >
                            {driver.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {driver.name}
                            </Typography>
                            <StyledChip status={driver.status} />
                          </Box>
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" sx={{ direction: 'ltr' }}>
                              {driver.phone}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LicenseIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption">
                              رخصة: {driver.licenseType} — حتى {driver.licenseExpiry}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <VehicleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption">{driver.vehicle}</Typography>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 1,
                            }}
                          >
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                إجمالي الرحلات
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {driver.totalTrips}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                هذا الشهر
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 700, color: '#1E88E5' }}
                              >
                                {driver.monthlyTrips}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'left' }}>
                              <Typography variant="caption" color="text.secondary">
                                التقييم
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                                <StarIcon sx={{ fontSize: 14, color: '#FFB300' }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {driver.rating}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
              {filterItems(drivers).length === 0 && (
                <Grid item xs={12}>
                  <Paper
                    sx={{
                      textAlign: 'center',
                      py: 8,
                      borderRadius: 3,
                      border: '2px dashed',
                      borderColor: 'divider',
                    }}
                  >
                    <DriverIcon sx={{ fontSize: 48, opacity: 0.15, mb: 1 }} />
                    <Typography color="text.secondary">لا يوجد سائقين مطابقين</Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        </TabPanel>

        {/* ═══ TAB 3: Fuel & Costs ═══ */}
        <TabPanel value={activeTab} index={3}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            {/* Fuel Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<FuelIcon />}
                  label="إجمالي الوقود"
                  value={`${fuelRecords.reduce((s, f) => s + (f.liters || 0), 0).toFixed(0)} لتر`}
                  color="#E53935"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<CostIcon />}
                  label="إجمالي التكلفة"
                  value={`${stats.totalFuelCost.toLocaleString()} ر.س`}
                  color="#FF9800"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<StationIcon />}
                  label="عمليات التزويد"
                  value={fuelRecords.length}
                  color="#1E88E5"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <StatCard
                  icon={<SpeedIcon />}
                  label="متوسط الاستهلاك"
                  value={`${fuelRecords.length > 0 ? (fuelRecords.reduce((s, f) => s + (f.liters || 0), 0) / fuelRecords.length).toFixed(1) : 0} لتر/تزويد`}
                  color="#9C27B0"
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap', alignItems: 'center' }}>
              <TextField
                placeholder="بحث..."
                size="small"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
              <Box sx={{ flex: 1 }} />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setFuelForm(emptyFuel);
                  setFuelDialogOpen(true);
                }}
                sx={{ borderRadius: 2.5, px: 3, fontWeight: 700 }}
              >
                تسجيل تزويد
              </Button>
            </Box>

            <TableContainer
              component={Paper}
              sx={{ borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                    {[
                      'التاريخ',
                      'المركبة',
                      'السائق',
                      'نوع الوقود',
                      'الكمية (لتر)',
                      'سعر اللتر',
                      'الإجمالي',
                      'عداد',
                      'المحطة',
                      'إيصال',
                    ].map(h => (
                      <TableCell
                        key={h}
                        sx={{ fontWeight: 700, fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filterItems(fuelRecords)
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map(f => (
                      <TableRow key={f._id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{f.date}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{f.vehicle}</TableCell>
                        <TableCell>{f.driver}</TableCell>
                        <TableCell>
                          <Chip
                            label={f.fuelType}
                            size="small"
                            sx={{
                              bgcolor: alpha('#E53935', 0.08),
                              color: '#E53935',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>{f.liters}</TableCell>
                        <TableCell>{f.costPerLiter} ر.س</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#E53935' }}>
                          {f.totalCost} ر.س
                        </TableCell>
                        <TableCell>{f.odometer?.toLocaleString()}</TableCell>
                        <TableCell>{f.station}</TableCell>
                        <TableCell>
                          <Chip
                            label={f.receipt}
                            size="small"
                            variant="outlined"
                            sx={{ fontFamily: 'monospace' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  {filterItems(fuelRecords).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} sx={{ textAlign: 'center', py: 6 }}>
                        <FuelIcon sx={{ fontSize: 48, opacity: 0.15, mb: 1 }} />
                        <Typography color="text.secondary">لا توجد سجلات وقود</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filterItems(fuelRecords).length}
              page={page}
              onPageChange={(_e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => {
                setRowsPerPage(+e.target.value);
                setPage(0);
              }}
              labelRowsPerPage="الصفوف:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
            />
          </Box>
        </TabPanel>

        {/* ═══ TAB 4: Accidents ═══ */}
        <TabPanel value={activeTab} index={4}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            {/* Severity Summary */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {['بسيط', 'متوسط', 'خطير'].map(sev => {
                const cfg = SEVERITY_MAP[sev];
                const count = accidents.filter(a => a.severity === sev).length;
                return (
                  <Grid item xs={4} key={sev}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        border: `1px solid ${alpha(cfg.color, 0.2)}`,
                        bgcolor: alpha(cfg.color, 0.03),
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', p: 2 }}>
                        <Avatar
                          sx={{
                            bgcolor: alpha(cfg.color, 0.12),
                            color: cfg.color,
                            mx: 'auto',
                            mb: 1,
                            width: 44,
                            height: 44,
                          }}
                        >
                          {cfg.icon}
                        </Avatar>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: cfg.color }}>
                          {count}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {sev}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {accidents.map(acc => {
              const sevCfg = SEVERITY_MAP[acc.severity] || SEVERITY_MAP['بسيط'];
              return (
                <Paper
                  key={acc._id}
                  sx={{
                    p: 2.5,
                    mb: 2,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: alpha(sevCfg.color, 0.15),
                    bgcolor: alpha(sevCfg.color, 0.02),
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: alpha(sevCfg.color, 0.3),
                      boxShadow: `0 4px 16px ${alpha(sevCfg.color, 0.1)}`,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Avatar
                        sx={{
                          bgcolor: alpha(sevCfg.color, 0.12),
                          color: sevCfg.color,
                          width: 48,
                          height: 48,
                        }}
                      >
                        {sevCfg.icon}
                      </Avatar>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Chip
                            label={acc.severity}
                            size="small"
                            sx={{
                              bgcolor: alpha(sevCfg.color, 0.12),
                              color: sevCfg.color,
                              fontWeight: 700,
                            }}
                          />
                          <StyledChip status={acc.status} />
                          {acc.insuranceClaim && (
                            <Chip
                              label={acc.insuranceClaim}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: 'monospace' }}
                            />
                          )}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {acc.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            <VehicleIcon sx={{ fontSize: 13, mr: 0.3 }} />
                            {acc.vehicle}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <DriverIcon sx={{ fontSize: 13, mr: 0.3 }} />
                            {acc.driver}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <LocationIcon sx={{ fontSize: 13, mr: 0.3 }} />
                            {acc.location}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {acc.date}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#E53935' }}>
                        {acc.estimatedCost?.toLocaleString()} ر.س
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        إصابات: {acc.injuries}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              );
            })}
            {accidents.length === 0 && (
              <Paper
                sx={{
                  textAlign: 'center',
                  py: 8,
                  borderRadius: 3,
                  border: '2px dashed',
                  borderColor: 'divider',
                }}
              >
                <AccidentIcon sx={{ fontSize: 48, opacity: 0.15, mb: 1 }} />
                <Typography color="text.secondary">لا توجد حوادث مسجلة — هذا ممتاز!</Typography>
              </Paper>
            )}
          </Box>
        </TabPanel>

        {/* ═══ TAB 5: Analytics ═══ */}
        <TabPanel value={activeTab} index={5}>
          <Box sx={{ px: { xs: 1.5, md: 2.5 } }}>
            <Grid container spacing={3}>
              {/* Monthly Trend Chart */}
              <Grid item xs={12} md={8}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      الاتجاه الشهري — الرحلات والمسافة والتكلفة
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={monthlyStats}>
                        <defs>
                          <linearGradient id="tFillTrips" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="tFillCost" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f5576c" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f5576c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis yAxisId="left" fontSize={11} />
                        <YAxis yAxisId="right" orientation="right" fontSize={11} />
                        <RTooltip />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="trips"
                          name="الرحلات"
                          stroke="#667eea"
                          fill="url(#tFillTrips)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="cost"
                          name="التكلفة (ر.س)"
                          stroke="#f5576c"
                          fill="url(#tFillCost)"
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                        />
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="passengers"
                          name="الركاب"
                          stroke="#43e97b"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={{ r: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Route Status Pie */}
              <Grid item xs={12} md={4}>
                <Card
                  sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: '100%' }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      حالة المسارات
                    </Typography>
                    <Divider sx={{ mb: 1 }} />
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={routeStatusDist}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {routeStatusDist.map((d, i) => (
                            <Cell key={i} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                      {routeStatusDist.map(d => (
                        <Chip
                          key={d.name}
                          size="small"
                          label={`${d.name}: ${d.value}`}
                          sx={{ bgcolor: alpha(d.color, 0.1), color: d.color, fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                      حالة السائقين
                    </Typography>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={driverStatusDist}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={3}
                        >
                          {driverStatusDist.map((d, i) => (
                            <Cell key={i} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <RTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 1 }}>
                      {driverStatusDist.map(d => (
                        <Chip
                          key={d.name}
                          size="small"
                          label={`${d.name}: ${d.value}`}
                          sx={{ bgcolor: alpha(d.color, 0.1), color: d.color, fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Monthly Distance & Fuel Bar Chart */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      المسافة والوقود الشهري
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={monthlyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke={alpha('#000', 0.06)} />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis fontSize={11} />
                        <RTooltip />
                        <Legend />
                        <Bar
                          dataKey="distance"
                          name="المسافة (كم)"
                          fill="#4facfe"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="fuel"
                          name="الوقود (لتر)"
                          fill="#f5af19"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Trip Status Pie */}
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      توزيع حالة الرحلات
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={tripStatusDist}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {tripStatusDist.map((d, i) => (
                            <Cell key={i} fill={d.color} stroke="none" />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>

              {/* Top Drivers Table */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                      أفضل السائقين أداءً
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Grid container spacing={2}>
                      {[...drivers]
                        .sort((a, b) => (b.totalTrips || 0) - (a.totalTrips || 0))
                        .slice(0, 5)
                        .map((driver, i) => {
                          const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#667eea', '#9C27B0'];
                          return (
                            <Grid item xs={12} sm={6} md key={driver._id}>
                              <Paper
                                sx={{
                                  p: 2,
                                  textAlign: 'center',
                                  borderRadius: 2.5,
                                  border: '1px solid',
                                  borderColor: alpha(colors[i], 0.2),
                                  bgcolor: alpha(colors[i], 0.03),
                                  transition: 'all 0.2s',
                                  '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 },
                                }}
                              >
                                <Avatar
                                  sx={{
                                    width: 52,
                                    height: 52,
                                    mx: 'auto',
                                    mb: 1,
                                    bgcolor: alpha(colors[i], 0.12),
                                    color: colors[i],
                                    fontWeight: 800,
                                    fontSize: 20,
                                  }}
                                >
                                  {i + 1}
                                </Avatar>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {driver.name}
                                </Typography>
                                <Typography
                                  variant="h5"
                                  sx={{ fontWeight: 800, color: colors[i], my: 0.5 }}
                                >
                                  {driver.totalTrips}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  رحلة
                                </Typography>
                                <Box
                                  sx={{
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    mt: 0.5,
                                  }}
                                >
                                  <StarIcon sx={{ fontSize: 16, color: '#FFB300' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {driver.rating}
                                  </Typography>
                                </Box>
                              </Paper>
                            </Grid>
                          );
                        })}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* ═══════════════ DIALOGS ═══════════════ */}

      {/* Route Dialog */}
      <Dialog
        open={routeDialogOpen}
        onClose={() => setRouteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: alpha('#1E88E5', 0.12), color: '#1E88E5', width: 36, height: 36 }}>
            <RouteIcon fontSize="small" />
          </Avatar>
          {editMode ? 'تعديل المسار' : 'إضافة مسار جديد'}
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="اسم المسار"
                value={routeForm.routeName}
                onChange={e => setRouteForm(p => ({ ...p, routeName: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  value={routeForm.type}
                  onChange={e => setRouteForm(p => ({ ...p, type: e.target.value }))}
                  label="النوع"
                >
                  {transportService.getRouteTypes().map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="عدد المحطات"
                value={routeForm.stopsCount}
                onChange={e => setRouteForm(p => ({ ...p, stopsCount: +e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="المسافة (كم)"
                value={routeForm.totalDistance}
                onChange={e => setRouteForm(p => ({ ...p, totalDistance: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الوقت المتوقع (دقيقة)"
                value={routeForm.estimatedTime}
                onChange={e => setRouteForm(p => ({ ...p, estimatedTime: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المركبة"
                value={routeForm.assignedVehicle}
                onChange={e => setRouteForm(p => ({ ...p, assignedVehicle: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="السائق"
                value={routeForm.assignedDriver}
                onChange={e => setRouteForm(p => ({ ...p, assignedDriver: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={routeForm.status}
                  onChange={e => setRouteForm(p => ({ ...p, status: e.target.value }))}
                  label="الحالة"
                >
                  {['نشط', 'متوقف', 'قيد الإنشاء'].map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setRouteDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveRoute}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {editMode ? 'تحديث' : 'إنشاء'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Trip Dialog */}
      <Dialog
        open={tripDialogOpen}
        onClose={() => setTripDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: alpha('#FF9800', 0.12), color: '#FF9800', width: 36, height: 36 }}>
            <BusIcon fontSize="small" />
          </Avatar>
          إضافة رحلة جديدة
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>المسار</InputLabel>
                <Select
                  value={tripForm.route}
                  onChange={e => setTripForm(p => ({ ...p, route: e.target.value }))}
                  label="المسار"
                >
                  {routes
                    .filter(r => r.status === 'نشط')
                    .map(r => (
                      <MenuItem key={r._id} value={r.routeName}>
                        {r.routeName}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>السائق</InputLabel>
                <Select
                  value={tripForm.driver}
                  onChange={e => setTripForm(p => ({ ...p, driver: e.target.value }))}
                  label="السائق"
                >
                  {drivers
                    .filter(d => d.status === 'متاح')
                    .map(d => (
                      <MenuItem key={d._id} value={d.name}>
                        {d.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المركبة"
                value={tripForm.vehicle}
                onChange={e => setTripForm(p => ({ ...p, vehicle: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={tripForm.date}
                onChange={e => setTripForm(p => ({ ...p, date: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="time"
                label="وقت الانطلاق"
                value={tripForm.startTime}
                onChange={e => setTripForm(p => ({ ...p, startTime: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="عدد الركاب"
                value={tripForm.passengers}
                onChange={e => setTripForm(p => ({ ...p, passengers: +e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6} />
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={tripForm.notes}
                onChange={e => setTripForm(p => ({ ...p, notes: e.target.value }))}
                size="small"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setTripDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveTrip}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* Fuel Dialog */}
      <Dialog
        open={fuelDialogOpen}
        onClose={() => setFuelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: alpha('#E53935', 0.12), color: '#E53935', width: 36, height: 36 }}>
            <FuelIcon fontSize="small" />
          </Avatar>
          تسجيل تزويد وقود
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المركبة"
                value={fuelForm.vehicle}
                onChange={e => setFuelForm(p => ({ ...p, vehicle: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="السائق"
                value={fuelForm.driver}
                onChange={e => setFuelForm(p => ({ ...p, driver: e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                value={fuelForm.date}
                onChange={e => setFuelForm(p => ({ ...p, date: e.target.value }))}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الوقود</InputLabel>
                <Select
                  value={fuelForm.fuelType}
                  onChange={e => setFuelForm(p => ({ ...p, fuelType: e.target.value }))}
                  label="نوع الوقود"
                >
                  {transportService.getFuelTypes().map(t => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="الكمية (لتر)"
                value={fuelForm.liters}
                onChange={e => setFuelForm(p => ({ ...p, liters: +e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="سعر اللتر (ر.س)"
                value={fuelForm.costPerLiter}
                onChange={e => setFuelForm(p => ({ ...p, costPerLiter: +e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="قراءة العداد"
                value={fuelForm.odometer}
                onChange={e => setFuelForm(p => ({ ...p, odometer: +e.target.value }))}
                size="small"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="المحطة"
                value={fuelForm.station}
                onChange={e => setFuelForm(p => ({ ...p, station: e.target.value }))}
                size="small"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setFuelDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveFuel}
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{ bgcolor: alpha('#667eea', 0.12), color: '#667eea', width: 36, height: 36 }}
            >
              <ViewIcon fontSize="small" />
            </Avatar>
            تفاصيل العنصر
          </Box>
          <IconButton onClick={() => setDetailDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {selectedItem && (
            <Box>
              {Object.entries(selectedItem)
                .filter(([k]) => !['_id', '__v'].includes(k))
                .map(([key, val]) => (
                  <Box
                    key={key}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      py: 1,
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'capitalize' }}
                    >
                      {key}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 500, maxWidth: '60%', textAlign: 'left' }}
                    >
                      {typeof val === 'object' ? JSON.stringify(val) : String(val || '—')}
                    </Typography>
                  </Box>
                ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{ fontWeight: 700, color: '#E53935', display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Avatar sx={{ bgcolor: alpha('#E53935', 0.12), color: '#E53935', width: 36, height: 36 }}>
            <DeleteIcon fontSize="small" />
          </Avatar>
          تأكيد الحذف
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف <strong>{deleteTarget?.name}</strong>؟ لا يمكن التراجع عن هذا
            الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            sx={{ borderRadius: 2 }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TransportManagement;
