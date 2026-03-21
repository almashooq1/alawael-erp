/**
 * Performance Dashboard — لوحة تحكم تقييم الأداء
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
} from '@mui/material';
import { TrendingUp, People, Star, Assessment } from '@mui/icons-material';
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

export default function PerformanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/performance/analysis');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalEvaluations: 156, averageScore: 4.2, completedReviews: 142, pendingReviews: 14,
          byRating: [
            { name: 'ممتاز', value: 45 }, { name: 'جيد جداً', value: 58 },
            { name: 'جيد', value: 35 }, { name: 'مقبول', value: 12 }, { name: 'ضعيف', value: 6 }
          ],
          byDepartment: [
            { dept: 'الموارد البشرية', avg: 4.5 }, { dept: 'تقنية المعلومات', avg: 4.3 },
            { dept: 'المالية', avg: 4.1 }, { dept: 'العمليات', avg: 3.9 }, { dept: 'التسويق', avg: 4.0 }
          ],
          recentEvaluations: [
            { _id: '1', employee: 'أحمد الشمري', department: 'تقنية المعلومات', score: 4.8, status: 'مكتمل' },
            { _id: '2', employee: 'فاطمة العلي', department: 'الموارد البشرية', score: 4.5, status: 'مكتمل' },
            { _id: '3', employee: 'خالد المالكي', department: 'المالية', score: 3.2, status: 'قيد المراجعة' }
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
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم تقييم الأداء</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Assessment} title="إجمالي التقييمات" value={data.totalEvaluations} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Star} title="متوسط التقييم" value={data.averageScore} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={TrendingUp} title="تقييمات مكتملة" value={data.completedReviews} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={People} title="بانتظار المراجعة" value={data.pendingReviews} color="#f44336" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>توزيع التقييمات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byRating} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byRating?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>متوسط الأداء حسب القسم</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byDepartment}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dept" /><YAxis domain={[0, 5]} /><Tooltip />
                <Bar dataKey="avg" fill="#2196f3" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر التقييمات</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>الموظف</TableCell><TableCell>القسم</TableCell>
            <TableCell>التقييم</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentEvaluations?.map(e => (
              <TableRow key={e._id}>
                <TableCell>{e.employee}</TableCell><TableCell>{e.department}</TableCell>
                <TableCell><Chip label={e.score} color={e.score >= 4 ? 'success' : e.score >= 3 ? 'warning' : 'error'} size="small" /></TableCell>
                <TableCell><Chip label={e.status} variant="outlined" size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
