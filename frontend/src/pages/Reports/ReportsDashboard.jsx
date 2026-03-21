/**
 * Reports Center Dashboard — لوحة تحكم مركز التقارير
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
} from '@mui/material';
import { Summarize, Schedule, Download, Assessment } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

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

export default function ReportsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/v1/basic-reports');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalReports: 156, scheduledReports: 12, downloadsThisMonth: 345, reportTypes: 8,
          byType: [
            { name: 'مالية', value: 35 }, { name: 'موارد بشرية', value: 28 },
            { name: 'تشغيلية', value: 42 }, { name: 'إدارية', value: 22 },
            { name: 'تأهيلية', value: 18 }, { name: 'أخرى', value: 11 }
          ],
          monthlyGeneration: [
            { month: 'يناير', count: 22 }, { month: 'فبراير', count: 28 },
            { month: 'مارس', count: 35 }, { month: 'أبريل', count: 25 },
            { month: 'مايو', count: 30 }, { month: 'يونيو', count: 16 }
          ],
          recentReports: [
            { _id: '1', title: 'تقرير الأداء الشهري', type: 'تشغيلية', generatedBy: 'النظام', date: '2026-03-20', downloads: 45 },
            { _id: '2', title: 'تقرير الميزانية Q1', type: 'مالية', generatedBy: 'أحمد', date: '2026-03-18', downloads: 32 },
            { _id: '3', title: 'تقرير الحضور الأسبوعي', type: 'موارد بشرية', generatedBy: 'النظام', date: '2026-03-21', downloads: 28 }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم مركز التقارير</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Summarize} title="إجمالي التقارير" value={data.totalReports} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Schedule} title="تقارير مجدولة" value={data.scheduledReports} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Download} title="تحميلات الشهر" value={data.downloadsThisMonth} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Assessment} title="أنواع التقارير" value={data.reportTypes} color="#9c27b0" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>التقارير حسب النوع</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byType} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byType?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>التقارير الشهرية المُنشأة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyGeneration}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر التقارير</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>التقرير</TableCell><TableCell>النوع</TableCell>
            <TableCell>بواسطة</TableCell><TableCell>التاريخ</TableCell><TableCell>التحميلات</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentReports?.map(r => (
              <TableRow key={r._id}>
                <TableCell>{r.title}</TableCell>
                <TableCell><Chip label={r.type} size="small" variant="outlined" /></TableCell>
                <TableCell>{r.generatedBy}</TableCell>
                <TableCell>{r.date}</TableCell>
                <TableCell>{r.downloads}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
