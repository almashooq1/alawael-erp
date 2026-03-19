/**
 * Fleet Dashboard Component - لوحة تحكم الأسطول
 * 
 * واجهة شاملة لإدارة الأسطول والمركبات
 * ✅ Real-time Fleet Statistics
 * ✅ Vehicle Monitoring
 * ✅ Compliance Tracking
 * ✅ Performance Analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  PersonIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  RefreshIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const FleetDashboard = () => {
  // حالات
  const [fleetStats, setFleetStats] = useState(null);
  const [complianceReport, setComplianceReport] = useState(null);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ألوان المخطط
  // const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#00f2fe'];

  // جلب البيانات
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // محاكاة جلب البيانات من API
      const statsResponse = {
        statistics: {
          totalVehicles: 45,
          totalDrivers: 52,
          totalTrips: 1250,
          totalDistance: 125000,
          totalCosts: 850000,
          totalRevenue: 1200000,
          costPerKm: 6.8,
          profit: 350000,
          profitMargin: 29.17,
          vehiclesByStatus: {
            active: 38,
            maintenance: 5,
            idle: 2,
          },
          driversByStatus: {
            active: 48,
            onLeave: 3,
            suspended: 1,
          },
        },
      };

      const complianceResponse = {
        report: {
          totalVehicles: 45,
          compliant: 40,
          noncompliant: 5,
          complianceRate: 88.89,
          issues: [],
        },
      };

      const vehiclesResponse = {
        vehicles: [
          {
            _id: '1',
            registrationNumber: 'س ق أ 1234',
            plateNumber: 'ق أ 1234',
            basicInfo: { make: 'Toyota', model: 'Hilux', year: 2023, type: 'سيارة نقل' },
            status: 'نشطة',
            assignedDriver: { personalInfo: { firstName: 'أحمد', lastName: 'السالم' } },
            stats: { totalDistance: 5000, totalCost: 20000 },
          },
          {
            _id: '2',
            registrationNumber: 'س ق أ 1235',
            plateNumber: 'ق أ 1235',
            basicInfo: { make: 'Nissan', model: 'Patrol', year: 2022, type: 'سيارة ركوب' },
            status: 'نشطة',
            assignedDriver: { personalInfo: { firstName: 'محمد', lastName: 'العتيبي' } },
            stats: { totalDistance: 8000, totalCost: 32000 },
          },
        ],
      };

      setFleetStats(statsResponse.statistics);
      setComplianceReport(complianceResponse.report);
      setVehiclesList(vehiclesResponse.vehicles);
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  // بيانات المخطط البياني للاتجاهات
  const trendData = [
    { month: 'يناير', vehicles: 35, distance: 100000, revenue: 900000 },
    { month: 'فبراير', vehicles: 38, distance: 110000, revenue: 980000 },
    { month: 'مارس', vehicles: 42, distance: 118000, revenue: 1050000 },
    { month: 'أبريل', vehicles: 45, distance: 125000, revenue: 1200000 },
  ];

  // بيانات الحالة الدائرية
  const statusData = fleetStats ? [
    { name: 'نشطة', value: fleetStats.vehiclesByStatus.active, color: '#4caf50' },
    { name: 'صيانة', value: fleetStats.vehiclesByStatus.maintenance, color: '#ff9800' },
    { name: 'متوقفة', value: fleetStats.vehiclesByStatus.idle, color: '#f44336' },
  ] : [];

  if (loading && !fleetStats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* الرأس */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            📊 لوحة تحكم الأسطول
          </Typography>
          <Typography color="textSecondary">
            إدارة شاملة لأسطول المركبات والسائقين
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadDashboardData}
          sx={{ borderRadius: 2 }}
        >
          تحديث البيانات
        </Button>
      </Box>

      {/* بطاقات إحصائيات رئيسية */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CarIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="caption">إجمالي المركبات</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fleetStats?.totalVehicles}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 2, background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <PersonIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="caption">السائقين النشطين</Typography>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {fleetStats?.driversByStatus.active}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 2, background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="caption">الإيرادات</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {(fleetStats?.totalRevenue / 1000000).toFixed(1)}M
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: 2, background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingDownIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="caption">الربح</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {(fleetStats?.profit / 1000).toFixed(0)}K
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* تقرير الامتثال */}
      {complianceReport && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                🎯 معدل الامتثال
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">متوافق</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {complianceReport.complianceRate}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={complianceReport.complianceRate}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #4caf50 0%, #8bc34a 100%)',
                    },
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Chip
                  icon={<CheckCircleIcon />}
                  label={`متوافق: ${complianceReport.compliant}`}
                  color="success"
                  variant="outlined"
                />
                <Chip
                  icon={<WarningIcon />}
                  label={`غير متوافق: ${complianceReport.noncompliant}`}
                  color="error"
                  variant="outlined"
                />
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                📈 توزيع حالة المركبات
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* مخطط الاتجاهات */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          📊 اتجاهات الأداء
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <ChartTooltip />
            <Legend />
            <Line type="monotone" dataKey="vehicles" stroke="#667eea" name="المركبات" />
            <Line type="monotone" dataKey="distance" stroke="#764ba2" name="المسافة (كم)" />
          </LineChart>
        </ResponsiveContainer>
      </Paper>

      {/* قائمة المركبات */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>رقم التسجيل</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>الماركة والموديل</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>السائق</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>المسافة الكلية (كم)</TableCell>
                <TableCell sx={{ fontWeight: 600 }} align="center">
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vehiclesList.map(vehicle => (
                <TableRow key={vehicle._id} hover sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}>
                  <TableCell sx={{ fontWeight: 600 }}>{vehicle.registrationNumber}</TableCell>
                  <TableCell>
                    {vehicle.basicInfo.make} {vehicle.basicInfo.model} ({vehicle.basicInfo.year})
                  </TableCell>
                  <TableCell>
                    {vehicle.assignedDriver
                      ? `${vehicle.assignedDriver.personalInfo.firstName} ${vehicle.assignedDriver.personalInfo.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={vehicle.status}
                      size="small"
                      color={vehicle.status === 'نشطة' ? 'success' : 'warning'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{vehicle.stats.totalDistance.toLocaleString('ar-SA')}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="التفاصيل">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedVehicle(vehicle);
                          setDetailsOpen(true);
                        }}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* نافذة التفاصيل */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          🚗 تفاصيل المركبة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedVehicle && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>رقم التسجيل:</strong> {selectedVehicle.registrationNumber}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>الماركة:</strong> {selectedVehicle.basicInfo.make}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>الموديل:</strong> {selectedVehicle.basicInfo.model}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>السائق:</strong>{' '}
                {selectedVehicle.assignedDriver
                  ? `${selectedVehicle.assignedDriver.personalInfo.firstName}`
                  : 'لم يتم التعيين'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>الحالة:</strong>{' '}
                <Chip label={selectedVehicle.status} size="small" color={selectedVehicle.status === 'نشطة' ? 'success' : 'warning'} />
              </Typography>
              <Typography variant="body2">
                <strong>المسافة الكلية:</strong> {selectedVehicle.stats.totalDistance.toLocaleString('ar-SA')} كم
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default FleetDashboard;
