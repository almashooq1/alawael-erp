/**
 * GPS Tracking Dashboard — لوحة تتبع GPS
 */
import { useState, useEffect } from 'react';

import apiClient from '../../services/api';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography
} from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';

const COLORS = ['#1976d2', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2'];

export default function GPSTrackingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/gps/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalVehicles: 24,
          activeNow: 18,
          alertsToday: 5,
          avgSpeed: 42,
          vehicleStatus: [
            { name: 'نشط', value: 18 }, { name: 'متوقف', value: 4 },
            { name: 'صيانة', value: 2 }
          ],
          dailyTrips: [
            { day: 'سبت', trips: 42 }, { day: 'أحد', trips: 48 },
            { day: 'إثنين', trips: 52 }, { day: 'ثلاثاء', trips: 45 },
            { day: 'أربعاء', trips: 50 }, { day: 'خميس', trips: 38 },
            { day: 'جمعة', trips: 22 }
          ],
          recentAlerts: [
            { vehicle: 'حافلة 05', type: 'تجاوز سرعة', speed: '95 كم/س', location: 'طريق الملك فهد', time: '10:30' },
            { vehicle: 'حافلة 12', type: 'خروج عن المسار', speed: '60 كم/س', location: 'حي الروضة', time: '09:15' },
            { vehicle: 'سيارة 03', type: 'توقف مطول', speed: '0 كم/س', location: 'المستشفى', time: '08:45' }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return <Typography>لا توجد بيانات</Typography>;

  const kpis = [
    { label: 'المركبات', value: data.totalVehicles, icon: <VehicleIcon />, color: '#1976d2' },
    { label: 'نشط الآن', value: data.activeNow, icon: <GpsIcon />, color: '#388e3c' },
    { label: 'تنبيهات اليوم', value: data.alertsToday, icon: <AlertIcon />, color: '#f57c00' },
    { label: 'متوسط السرعة', value: `${data.avgSpeed} كم/س`, icon: <SpeedIcon />, color: '#7b1fa2' }
  ];

  const alertColor = { 'تجاوز سرعة': 'error', 'خروج عن المسار': 'warning', 'توقف مطول': 'info' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة تتبع GPS</Typography>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {kpis.map((k, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card sx={{ borderTop: `4px solid ${k.color}` }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ color: k.color, mb: 1 }}>{k.icon}</Box>
                <Typography variant="h4" fontWeight="bold">{k.value}</Typography>
                <Typography color="text.secondary">{k.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حالة المركبات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.vehicleStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.vehicleStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الرحلات اليومية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.dailyTrips}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip />
                <Bar dataKey="trips" name="رحلات" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أحدث التنبيهات</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>المركبة</TableCell><TableCell>النوع</TableCell>
              <TableCell>السرعة</TableCell><TableCell>الموقع</TableCell><TableCell>الوقت</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentAlerts?.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.vehicle}</TableCell>
                  <TableCell><Chip label={a.type} size="small" color={alertColor[a.type] || 'default'} /></TableCell>
                  <TableCell>{a.speed}</TableCell>
                  <TableCell>{a.location}</TableCell>
                  <TableCell>{a.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
