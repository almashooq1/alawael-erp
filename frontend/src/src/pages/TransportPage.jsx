/**
 * Transport Management Page
 * صفحة إدارة النقل الذكي
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  IconButton,
  Paper,
  LinearProgress,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Button,
} from '@mui/material';
import {
  DirectionsBus as BusIcon,
  LocationOn as LocationIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
  Map as MapIcon,
  Route as RouteIcon,
  AccessTime as TimeIcon,
  LocalShipping as VehicleIcon,
} from '@mui/icons-material';

// Vehicle Status Colors
const vehicleStatusColors = {
  active: { bg: '#DCFCE7', color: '#166534', label: 'نشط' },
  maintenance: { bg: '#FEF3C7', color: '#92400E', label: 'صيانة' },
  inactive: { bg: '#FEE2E2', color: '#991B1B', label: 'غير نشط' },
};

// Tab Panel Component
const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: '16px 0' }}>
    {value === index && children}
  </div>
);

// Route Card Component
const RouteCard = ({ route }) => (
  <Card sx={{ mb: 2, borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.light' }}>
            <RouteIcon />
          </Avatar>
          <Box>
            <Typography fontWeight="bold">{route.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {route.driver}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={route.status === 'on_time' ? 'في الموعد' : 'متأخر'}
          color={route.status === 'on_time' ? 'success' : 'warning'}
          size="small"
        />
      </Box>
      
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold" color="primary">
              {route.students}
            </Typography>
            <Typography variant="caption" color="text.secondary">طلاب</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold" color="success.main">
              {route.pickedUp}
            </Typography>
            <Typography variant="caption" color="text.secondary">تم الاستلام</Typography>
          </Box>
        </Grid>
        <Grid item xs={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="bold" color="warning.main">
              {route.remaining}
            </Typography>
            <Typography variant="caption" color="text.secondary">متبقي</Typography>
          </Box>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 2 }}>
        <LinearProgress
          variant="determinate"
          value={(route.pickedUp / route.students) * 100}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>
    </CardContent>
  </Card>
);

// Main Transport Page
const TransportPage = ({ centerId = 'CTR-001' }) => {
  const [tabValue, setTabValue] = useState(0);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  // Mock Data
  useEffect(() => {
    const mockVehicles = [
      { id: 1, plateNumber: 'ABC 1234', driver: 'محمد أحمد', status: 'active', capacity: 20, current: 15, route: 'مسار 1' },
      { id: 2, plateNumber: 'DEF 5678', driver: 'خالد سعيد', status: 'active', capacity: 15, current: 12, route: 'مسار 2' },
      { id: 3, plateNumber: 'GHI 9012', driver: 'عمر حسن', status: 'maintenance', capacity: 25, current: 0, route: '-' },
      { id: 4, plateNumber: 'JKL 3456', driver: 'علي محمود', status: 'active', capacity: 18, current: 10, route: 'مسار 3' },
    ];
    
    const mockRoutes = [
      { id: 1, name: 'مسار حي السلام', driver: 'محمد أحمد', vehicle: 'ABC 1234', students: 15, pickedUp: 12, remaining: 3, status: 'on_time' },
      { id: 2, name: 'مسار حي النور', driver: 'خالد سعيد', vehicle: 'DEF 5678', students: 12, pickedUp: 8, remaining: 4, status: 'on_time' },
      { id: 3, name: 'مسار حي الفيصلية', driver: 'علي محمود', vehicle: 'JKL 3456', students: 10, pickedUp: 5, remaining: 5, status: 'delayed' },
    ];
    
    setVehicles(mockVehicles);
    setRoutes(mockRoutes);
  }, []);

  const stats = {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter(v => v.status === 'active').length,
    totalRoutes: routes.length,
    studentsOnRoute: routes.reduce((sum, r) => sum + r.students, 0),
    pickedUp: routes.reduce((sum, r) => sum + r.pickedUp, 0),
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#F3F4F6', minHeight: '100vh' }} dir="rtl">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          إدارة النقل الذكي
        </Typography>
        <Typography variant="body2" color="text.secondary">
          تتبع وإدارة مسارات نقل الطلاب
        </Typography>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                  <VehicleIcon sx={{ color: 'primary.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.totalVehicles}</Typography>
                  <Typography variant="body2" color="text.secondary">إجمالي المركبات</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                  <CheckIcon sx={{ color: 'success.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.activeVehicles}</Typography>
                  <Typography variant="body2" color="text.secondary">مركبات نشطة</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                  <RouteIcon sx={{ color: 'info.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.totalRoutes}</Typography>
                  <Typography variant="body2" color="text.secondary">مسارات نشطة</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                  <PersonIcon sx={{ color: 'warning.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.pickedUp}/{stats.studentsOnRoute}</Typography>
                  <Typography variant="body2" color="text.secondary">طلاب تم استلامهم</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="المسارات" icon={<RouteIcon />} iconPosition="start" />
          <Tab label="المركبات" icon={<VehicleIcon />} iconPosition="start" />
          <Tab label="التتبع المباشر" icon={<MapIcon />} iconPosition="start" />
        </Tabs>

        {/* Routes Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </Box>
        </TabPanel>

        {/* Vehicles Tab */}
        <TabPanel value={tabValue} index={1}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F9FAFB' }}>
                <TableRow>
                  <TableCell>المركبة</TableCell>
                  <TableCell>السائق</TableCell>
                  <TableCell>المسار</TableCell>
                  <TableCell>السعة</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.light' }}>
                          <BusIcon />
                        </Avatar>
                        <Typography fontWeight="medium">{vehicle.plateNumber}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{vehicle.driver}</TableCell>
                    <TableCell>{vehicle.route}</TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {vehicle.current} / {vehicle.capacity}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(vehicle.current / vehicle.capacity) * 100}
                        sx={{ width: 80, height: 4, borderRadius: 2 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={vehicleStatusColors[vehicle.status]?.label}
                        size="small"
                        sx={{
                          bgcolor: vehicleStatusColors[vehicle.status]?.bg,
                          color: vehicleStatusColors[vehicle.status]?.color,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Live Tracking Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 2 }}>
            <MapIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              خريطة التتبع المباشر
            </Typography>
            <Typography variant="body2" color="text.secondary">
              عرض مواقع المركبات والطلاب في الوقت الحقيقي
            </Typography>
            <Button variant="contained" sx={{ mt: 2 }} startIcon={<MapIcon />}>
              تفعيل التتبع
            </Button>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default TransportPage;