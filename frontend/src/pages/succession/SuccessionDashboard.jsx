/**
 * Succession Planning Dashboard — لوحة تحكم تخطيط التعاقب الوظيفي
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
} from '@mui/material';
import { SwapHoriz, Person, Warning, TrendingUp } from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'];

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

export default function SuccessionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/succession-planning/stats');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalPlans: 24, totalCandidates: 67, highRiskPositions: 5, avgReadiness: 72,
          byStatus: [
            { name: 'نشط', value: 18 }, { name: 'قيد التطوير', value: 4 }, { name: 'مكتمل', value: 2 }
          ],
          byRisk: [
            { risk: 'عالي', count: 5 }, { risk: 'متوسط', count: 10 },
            { risk: 'منخفض', count: 9 }
          ],
          topCandidates: [
            { _id: '1', name: 'أحمد الشمري', position: 'مدير العمليات', readiness: 90, status: 'جاهز' },
            { _id: '2', name: 'فاطمة الأحمد', position: 'مدير الموارد البشرية', readiness: 78, status: 'قيد التطوير' },
            { _id: '3', name: 'محمد العلي', position: 'مدير تقنية المعلومات', readiness: 65, status: 'قيد التطوير' }
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
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم تخطيط التعاقب الوظيفي</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={SwapHoriz} title="خطط التعاقب" value={data.totalPlans} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Person} title="المرشحون" value={data.totalCandidates} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Warning} title="مناصب عالية المخاطر" value={data.highRiskPositions} color="#f44336" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={TrendingUp} title="متوسط الجاهزية %" value={`${data.avgReadiness}%`} color="#ff9800" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>الخطط حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byStatus} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>المناصب حسب مستوى المخاطر</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byRisk}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="risk" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#f44336" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>أفضل المرشحين</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>المرشح</TableCell><TableCell>المنصب المستهدف</TableCell>
            <TableCell>الجاهزية</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.topCandidates?.map(c => (
              <TableRow key={c._id}>
                <TableCell>{c.name}</TableCell><TableCell>{c.position}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LinearProgress variant="determinate" value={c.readiness} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                    <Typography variant="body2">{c.readiness}%</Typography>
                  </Box>
                </TableCell>
                <TableCell><Chip label={c.status} color={c.status === 'جاهز' ? 'success' : 'warning'} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
