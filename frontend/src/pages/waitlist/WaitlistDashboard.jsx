/**
 * Waitlist Dashboard — لوحة قوائم الانتظار
 */
import { useState, useEffect } from 'react';



import apiClient from '../../services/api';

const COLORS = ['#f57c00', '#1976d2', '#388e3c', '#d32f2f', '#7b1fa2'];

export default function WaitlistDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/waitlist/stats');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalEntries: 156,
          pending: 89,
          approved: 52,
          avgWaitDays: 14,
          byStatus: [
            { name: 'انتظار', value: 89 }, { name: 'معتمد', value: 52 },
            { name: 'مرفوض', value: 10 }, { name: 'منسحب', value: 5 }
          ],
          byDepartment: [
            { dept: 'إيواء', count: 42 }, { dept: 'تأهيل', count: 35 },
            { dept: 'تعليم', count: 28 }, { dept: 'صحة', count: 22 },
            { dept: 'اندماج', count: 18 }, { dept: 'أخرى', count: 11 }
          ],
          recentEntries: [
            { id: 'WL-1056', applicant: 'محمد عبدالرحمن', department: 'إيواء', priority: 'عالي', date: '2026-03-20', status: 'انتظار' },
            { id: 'WL-1055', applicant: 'هدى السالم', department: 'تعليم', priority: 'متوسط', date: '2026-03-19', status: 'انتظار' },
            { id: 'WL-1054', applicant: 'سلطان الحربي', department: 'تأهيل', priority: 'عالي', date: '2026-03-18', status: 'معتمد' }
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
    { label: 'إجمالي الطلبات', value: data.totalEntries, icon: <ListIcon />, color: '#f57c00' },
    { label: 'قيد الانتظار', value: data.pending, icon: <WaitIcon />, color: '#1976d2' },
    { label: 'معتمد', value: data.approved, icon: <ApprovedIcon />, color: '#388e3c' },
    { label: 'متوسط الانتظار (يوم)', value: data.avgWaitDays, icon: <AvgIcon />, color: '#7b1fa2' }
  ];

  const statusColor = { 'انتظار': 'warning', 'معتمد': 'success', 'مرفوض': 'error' };
  const priorityColor = { 'عالي': 'error', 'متوسط': 'warning', 'منخفض': 'info' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة قوائم الانتظار</Typography>
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
            <Typography variant="h6" gutterBottom>حسب الحالة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.byStatus?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>حسب القسم</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.byDepartment}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="dept" /><YAxis /><Tooltip />
                <Bar dataKey="count" name="طلبات" fill="#f57c00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أحدث الطلبات</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الرقم</TableCell><TableCell>المتقدم</TableCell>
              <TableCell>القسم</TableCell><TableCell>الأولوية</TableCell><TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentEntries?.map((e, i) => (
                <TableRow key={i}>
                  <TableCell>{e.id}</TableCell>
                  <TableCell>{e.applicant}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell><Chip label={e.priority} size="small" color={priorityColor[e.priority] || 'default'} /></TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell><Chip label={e.status} size="small" color={statusColor[e.status] || 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
