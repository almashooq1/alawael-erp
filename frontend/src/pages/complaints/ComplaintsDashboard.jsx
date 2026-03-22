/**
 * Complaints Dashboard — لوحة تحكم الشكاوى والمقترحات
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
} from '@mui/material';
import { Report, CheckCircle, HourglassTop, Escalator } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#f44336', '#ff9800', '#4caf50', '#2196f3', '#9c27b0'];

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

export default function ComplaintsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/complaints/stats');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalComplaints: 87, resolved: 62, pending: 18, escalated: 7,
          byCategory: [
            { name: 'خدمات', value: 30 }, { name: 'موظفين', value: 22 },
            { name: 'مرافق', value: 18 }, { name: 'إدارية', value: 12 }, { name: 'أخرى', value: 5 }
          ],
          monthlyTrend: [
            { month: 'يناير', count: 12 }, { month: 'فبراير', count: 15 },
            { month: 'مارس', count: 10 }, { month: 'أبريل', count: 18 },
            { month: 'مايو', count: 14 }, { month: 'يونيو', count: 18 }
          ],
          recentComplaints: [
            { _id: '1', title: 'تأخر في الخدمة', category: 'خدمات', priority: 'عالية', status: 'قيد المعالجة' },
            { _id: '2', title: 'مشكلة في المرافق', category: 'مرافق', priority: 'متوسطة', status: 'مغلقة' },
            { _id: '3', title: 'اقتراح تحسين', category: 'إدارية', priority: 'منخفضة', status: 'جديدة' }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  const statusColor = { 'مغلقة': 'success', 'قيد المعالجة': 'warning', 'جديدة': 'info', 'مصعّدة': 'error' };
  const prioColor = { 'عالية': 'error', 'متوسطة': 'warning', 'منخفضة': 'success' };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم الشكاوى والمقترحات</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Report} title="إجمالي الشكاوى" value={data.totalComplaints} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={CheckCircle} title="تم الحل" value={data.resolved} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={HourglassTop} title="معلقة" value={data.pending} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Escalator} title="مصعّدة" value={data.escalated} color="#f44336" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>الشكاوى حسب الفئة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byCategory} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byCategory?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>الشكاوى الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyTrend}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#f44336" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر الشكاوى</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>العنوان</TableCell><TableCell>الفئة</TableCell>
            <TableCell>الأولوية</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentComplaints?.map(c => (
              <TableRow key={c._id}>
                <TableCell>{c.title}</TableCell><TableCell>{c.category}</TableCell>
                <TableCell><Chip label={c.priority} color={prioColor[c.priority] || 'default'} size="small" /></TableCell>
                <TableCell><Chip label={c.status} color={statusColor[c.status] || 'default'} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
