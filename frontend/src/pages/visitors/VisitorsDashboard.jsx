/**
 * Visitors Dashboard — لوحة تحكم إدارة الزوار
 */
import { useState, useEffect } from 'react';

import { People, Login, Logout, Block } from '@mui/icons-material';
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

export default function VisitorsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/visitors/stats/today');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalToday: 35, checkedIn: 18, checkedOut: 12, expected: 5,
          byPurpose: [
            { name: 'زيارة عائلية', value: 12 }, { name: 'اجتماع عمل', value: 8 },
            { name: 'صيانة', value: 5 }, { name: 'تسليم', value: 6 }, { name: 'أخرى', value: 4 }
          ],
          weeklyTrend: [
            { day: 'السبت', count: 28 }, { day: 'الأحد', count: 35 },
            { day: 'الإثنين', count: 42 }, { day: 'الثلاثاء', count: 30 },
            { day: 'الأربعاء', count: 38 }, { day: 'الخميس', count: 20 }
          ],
          recentVisitors: [
            { _id: '1', name: 'محمد العتيبي', purpose: 'اجتماع عمل', checkIn: '09:00', status: 'داخل المبنى' },
            { _id: '2', name: 'سارة الأحمد', purpose: 'زيارة عائلية', checkIn: '10:30', status: 'داخل المبنى' },
            { _id: '3', name: 'عبدالله الخالد', purpose: 'صيانة', checkIn: '08:00', status: 'غادر' }
          ]
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <LinearProgress />;
  if (!data) return null;

  const statusColor = { 'داخل المبنى': 'success', 'غادر': 'default', 'متوقع': 'info' };

  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" mb={3}>لوحة تحكم إدارة الزوار</Typography>
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={People} title="زوار اليوم" value={data.totalToday} color="#1976d2" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Login} title="داخل المبنى" value={data.checkedIn} color="#4caf50" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Logout} title="غادروا" value={data.checkedOut} color="#ff9800" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard icon={Block} title="متوقعين" value={data.expected} color="#9c27b0" /></Grid>
      </Grid>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>الغرض من الزيارة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={data.byPurpose} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label>
                {data.byPurpose?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" mb={2}>الزوار خلال الأسبوع</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weeklyTrend}><CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" /><YAxis /><Tooltip />
                <Bar dataKey="count" fill="#1976d2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" mb={2}>آخر الزوار</Typography>
        <TableContainer><Table size="small">
          <TableHead><TableRow>
            <TableCell>الاسم</TableCell><TableCell>الغرض</TableCell>
            <TableCell>وقت الدخول</TableCell><TableCell>الحالة</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.recentVisitors?.map(v => (
              <TableRow key={v._id}>
                <TableCell>{v.name}</TableCell><TableCell>{v.purpose}</TableCell>
                <TableCell>{v.checkIn}</TableCell>
                <TableCell><Chip label={v.status} color={statusColor[v.status] || 'default'} size="small" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></TableContainer>
      </Paper>
    </Box>
  );
}
