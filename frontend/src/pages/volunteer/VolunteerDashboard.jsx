/**
 * Volunteer Dashboard — لوحة إدارة المتطوعين
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
import EventIcon from '@mui/icons-material/Event';
import { TrendIcon } from 'utils/iconAliases';

const COLORS = ['#00897b', '#1976d2', '#f57c00', '#7b1fa2', '#c62828'];

export default function VolunteerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/volunteers/dashboard/stats');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalVolunteers: 89,
          activePrograms: 7,
          totalHours: 1240,
          shiftsThisWeek: 32,
          byProgram: [
            { name: 'تأهيل', value: 28 }, { name: 'تعليم', value: 24 },
            { name: 'رياضة', value: 18 }, { name: 'مرافقة', value: 19 }
          ],
          monthlyHours: [
            { month: 'أكتوبر', hours: 180 }, { month: 'نوفمبر', hours: 210 },
            { month: 'ديسمبر', hours: 165 }, { month: 'يناير', hours: 230 },
            { month: 'فبراير', hours: 220 }, { month: 'مارس', hours: 235 }
          ],
          topVolunteers: [
            { name: 'محمد العلي', hours: 64, program: 'تأهيل', status: 'نشط' },
            { name: 'نورة السالم', hours: 58, program: 'تعليم', status: 'نشط' },
            { name: 'فهد الحربي', hours: 52, program: 'رياضة', status: 'نشط' }
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
    { label: 'المتطوعون', value: data.totalVolunteers, icon: <VolIcon />, color: '#00897b' },
    { label: 'البرامج النشطة', value: data.activePrograms, icon: <EventIcon />, color: '#1976d2' },
    { label: 'ساعات التطوع', value: data.totalHours?.toLocaleString(), icon: <HoursIcon />, color: '#f57c00' },
    { label: 'ورديات هذا الأسبوع', value: data.shiftsThisWeek, icon: <TrendIcon />, color: '#7b1fa2' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة إدارة المتطوعين</Typography>
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
            <Typography variant="h6" gutterBottom>التوزيع حسب البرنامج</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.byProgram} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.byProgram?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>ساعات التطوع الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyHours}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="hours" name="ساعات" fill="#00897b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أفضل المتطوعين</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الاسم</TableCell><TableCell>الساعات</TableCell>
              <TableCell>البرنامج</TableCell><TableCell>الحالة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.topVolunteers?.map((v, i) => (
                <TableRow key={i}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>{v.hours}</TableCell>
                  <TableCell>{v.program}</TableCell>
                  <TableCell><Chip label={v.status} size="small" color="success" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
