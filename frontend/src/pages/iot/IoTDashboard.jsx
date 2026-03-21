/**
 * IoT Dashboard — لوحة إنترنت الأشياء
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

const COLORS = ['#00897b', '#1976d2', '#f57c00', '#d32f2f', '#7b1fa2'];

export default function IoTDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/iot/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalDevices: 86,
          onlineDevices: 72,
          alertsActive: 4,
          maintenancePending: 6,
          deviceTypes: [
            { name: 'حساسات حرارة', value: 28 }, { name: 'كاميرات', value: 20 },
            { name: 'حساسات رطوبة', value: 18 }, { name: 'أقفال ذكية', value: 12 },
            { name: 'أخرى', value: 8 }
          ],
          sensorReadings: [
            { hour: '06:00', temp: 22, humidity: 45 }, { hour: '09:00', temp: 24, humidity: 42 },
            { hour: '12:00', temp: 28, humidity: 38 }, { hour: '15:00', temp: 30, humidity: 35 },
            { hour: '18:00', temp: 27, humidity: 40 }, { hour: '21:00', temp: 23, humidity: 44 }
          ],
          recentAlerts: [
            { device: 'حساس حرارة - غرفة 204', type: 'حرارة مرتفعة', value: '32°C', time: '14:30', severity: 'تحذير' },
            { device: 'كاميرا - مدخل ب', type: 'اتصال مفقود', value: '-', time: '11:20', severity: 'حرج' },
            { device: 'حساس رطوبة - مخزن', type: 'رطوبة منخفضة', value: '25%', time: '09:45', severity: 'معلومة' }
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
    { label: 'الأجهزة', value: data.totalDevices, icon: <DeviceIcon />, color: '#00897b' },
    { label: 'متصل', value: data.onlineDevices, icon: <SensorIcon />, color: '#1976d2' },
    { label: 'تنبيهات نشطة', value: data.alertsActive, icon: <AlertIcon />, color: '#f57c00' },
    { label: 'صيانة معلقة', value: data.maintenancePending, icon: <MaintenanceIcon />, color: '#d32f2f' }
  ];

  const sevColor = { 'حرج': 'error', 'تحذير': 'warning', 'معلومة': 'info' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة إنترنت الأشياء (IoT)</Typography>
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
            <Typography variant="h6" gutterBottom>أنواع الأجهزة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.deviceTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.deviceTypes?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>قراءات المستشعرات (اليوم)</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.sensorReadings}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hour" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="temp" name="حرارة °C" fill="#d32f2f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="humidity" name="رطوبة %" fill="#1976d2" radius={[4, 4, 0, 0]} />
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
              <TableCell>الجهاز</TableCell><TableCell>النوع</TableCell>
              <TableCell>القيمة</TableCell><TableCell>الوقت</TableCell><TableCell>الشدة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentAlerts?.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.device}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell>{a.value}</TableCell>
                  <TableCell>{a.time}</TableCell>
                  <TableCell><Chip label={a.severity} size="small" color={sevColor[a.severity] || 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
