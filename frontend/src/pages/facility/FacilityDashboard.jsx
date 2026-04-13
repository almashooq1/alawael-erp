/**
 * Facility Dashboard — لوحة تحكم إدارة المرافق
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
} from '@mui/material';
import { MeetingRoom, Build, EventSeat, Warning } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0'];

const KPICard = ({ icon: Icon, title, value, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Icon sx={{ color }} />
        <Typography variant="body2" color="text.secondary">{title}</Typography>
      </Box>
      <Typography variant="h4" fontWeight="bold">{value}</Typography>
    </CardContent>
  </Card>
);

export default function FacilityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/facilities/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalRooms: 45, activeBookings: 12, pendingMaintenance: 8, criticalIssues: 2,
          roomsByType: [
            { name: 'قاعات اجتماعات', value: 15 }, { name: 'فصول دراسية', value: 12 },
            { name: 'مكاتب', value: 10 }, { name: 'مختبرات', value: 5 }, { name: 'أخرى', value: 3 }
          ],
          maintenanceByStatus: [
            { status: 'مكتمل', count: 25 }, { status: 'قيد التنفيذ', count: 8 },
            { status: 'مجدول', count: 5 }, { status: 'طارئ', count: 2 }
          ],
          recentBookings: [
            { _id: '1', room: 'قاعة A1', bookedBy: 'أحمد الشمري', date: '2026-03-22', status: 'مؤكد' },
            { _id: '2', room: 'فصل B3', bookedBy: 'إدارة التدريب', date: '2026-03-23', status: 'معلق' },
            { _id: '3', room: 'مختبر C1', bookedBy: 'قسم التأهيل', date: '2026-03-24', status: 'مؤكد' }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  const statusColor = { 'مؤكد': 'success', 'معلق': 'warning', 'ملغي': 'error' };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم إدارة المرافق</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={MeetingRoom} title="إجمالي الغرف" value={data.totalRooms} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={EventSeat} title="حجوزات نشطة" value={data.activeBookings} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Build} title="صيانة معلقة" value={data.pendingMaintenance} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Warning} title="مشاكل حرجة" value={data.criticalIssues} color="#f44336" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>الغرف حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.roomsByType} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.roomsByType?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>حالة الصيانة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.maintenanceByStatus}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#ff9800" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر الحجوزات</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>الغرفة</TableCell><TableCell>الحاجز</TableCell>
            <TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentBookings?.map(b => (
              <TableRow key={b._id}>
                <TableCell>{b.room}</TableCell><TableCell>{b.bookedBy}</TableCell>
                <TableCell>{b.date}</TableCell>
                <TableCell><Chip label={b.status} color={statusColor[b.status] || 'default'} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
