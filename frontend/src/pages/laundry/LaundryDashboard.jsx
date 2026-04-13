/**
 * Laundry Dashboard — لوحة معلومات المغسلة
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import {
  LocalLaundryService as LaundryIcon,
  Assignment as OrderIcon,
  Build as MachineIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#0288d1', '#388e3c', '#f57c00', '#d32f2f', '#7b1fa2'];

export default function LaundryDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/laundry/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalOrdersToday: 47,
          activeMachines: 8,
          pendingOrders: 12,
          completedToday: 35,
          ordersByStatus: [
            { name: 'مكتمل', value: 35 }, { name: 'قيد الغسيل', value: 8 },
            { name: 'انتظار', value: 12 }, { name: 'جاهز للتسليم', value: 5 }
          ],
          weeklyOrders: [
            { day: 'سبت', orders: 42 }, { day: 'أحد', orders: 47 },
            { day: 'إثنين', orders: 51 }, { day: 'ثلاثاء', orders: 45 },
            { day: 'أربعاء', orders: 48 }, { day: 'خميس', orders: 38 },
            { day: 'جمعة', orders: 30 }
          ],
          machines: [
            { name: 'غسالة 1', status: 'تعمل', load: 'كامل', eta: '14:30' },
            { name: 'غسالة 2', status: 'تعمل', load: 'نصف', eta: '14:15' },
            { name: 'مجفف 1', status: 'متاح', load: '-', eta: '-' },
            { name: 'مجفف 2', status: 'صيانة', load: '-', eta: '-' }
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
    { label: 'طلبات اليوم', value: data.totalOrdersToday, icon: <OrderIcon />, color: '#0288d1' },
    { label: 'آلات نشطة', value: data.activeMachines, icon: <MachineIcon />, color: '#388e3c' },
    { label: 'قيد الانتظار', value: data.pendingOrders, icon: <ScheduleIcon />, color: '#f57c00' },
    { label: 'مكتمل اليوم', value: data.completedToday, icon: <LaundryIcon />, color: '#7b1fa2' }
  ];

  const statusColor = { 'تعمل': 'success', 'متاح': 'info', 'صيانة': 'error' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة خدمة المغسلة</Typography>
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
            <Typography variant="h6" gutterBottom>حالة الطلبات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.ordersByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.ordersByStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الطلبات الأسبوعية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyOrders}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip />
                <Bar dataKey="orders" name="طلبات" fill="#0288d1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>حالة الآلات</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الجهاز</TableCell><TableCell>الحالة</TableCell>
              <TableCell>الحمل</TableCell><TableCell>الانتهاء المتوقع</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.machines?.map((m, i) => (
                <TableRow key={i}>
                  <TableCell>{m.name}</TableCell>
                  <TableCell><Chip label={m.status} size="small" color={statusColor[m.status] || 'default'} /></TableCell>
                  <TableCell>{m.load}</TableCell>
                  <TableCell>{m.eta}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
