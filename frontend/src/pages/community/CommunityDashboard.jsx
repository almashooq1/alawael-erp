/**
 * Community Integration Dashboard — لوحة الاندماج المجتمعي
 */
import { useState, useEffect } from 'react';



import apiClient from '../../services/api';

const COLORS = ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#c62828', '#00838f'];

export default function CommunityDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/community-integration/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalActivities: 84,
          activePartnerships: 12,
          participations: 256,
          awarenessPrograms: 15,
          activityTypes: [
            { name: 'رياضية', value: 28 }, { name: 'ثقافية', value: 22 },
            { name: 'تعليمية', value: 18 }, { name: 'ترفيهية', value: 16 }
          ],
          monthlyActivities: [
            { month: 'أكتوبر', count: 12 }, { month: 'نوفمبر', count: 15 },
            { month: 'ديسمبر', count: 10 }, { month: 'يناير', count: 18 },
            { month: 'فبراير', count: 14 }, { month: 'مارس', count: 15 }
          ],
          recentActivities: [
            { name: 'يوم رياضي مجتمعي', type: 'رياضية', participants: 45, date: '2026-03-18', status: 'مكتمل' },
            { name: 'ورشة فنية', type: 'ثقافية', participants: 22, date: '2026-03-20', status: 'جارٍ' },
            { name: 'برنامج توعوي', type: 'تعليمية', participants: 60, date: '2026-03-22', status: 'قادم' }
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
    { label: 'الأنشطة', value: data.totalActivities, icon: <CommunityIcon />, color: '#1565c0' },
    { label: 'الشراكات', value: data.activePartnerships, icon: <PartnerIcon />, color: '#2e7d32' },
    { label: 'المشاركات', value: data.participations, icon: <AssessIcon />, color: '#e65100' },
    { label: 'برامج التوعية', value: data.awarenessPrograms, icon: <AwarenessIcon />, color: '#6a1b9a' }
  ];

  const statusColor = { 'مكتمل': 'success', 'جارٍ': 'warning', 'قادم': 'info' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة الاندماج المجتمعي</Typography>
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
            <Typography variant="h6" gutterBottom>أنواع الأنشطة</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.activityTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.activityTypes?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الأنشطة الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyActivities}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="count" name="أنشطة" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أحدث الأنشطة</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>النشاط</TableCell><TableCell>النوع</TableCell>
              <TableCell>المشاركون</TableCell><TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentActivities?.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell>{a.participants}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell><Chip label={a.status} size="small" color={statusColor[a.status] || 'default'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
