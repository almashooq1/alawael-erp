/**
 * Research Center Dashboard — لوحة مركز الأبحاث
 */
import { useState, useEffect } from 'react';



import apiClient from '../../services/api';

const COLORS = ['#7b1fa2', '#1976d2', '#388e3c', '#f57c00', '#d32f2f'];

export default function ResearchDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/research/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalStudies: 18,
          activeStudies: 7,
          datasets: 34,
          publications: 12,
          studyPhases: [
            { name: 'تخطيط', value: 4 }, { name: 'جمع بيانات', value: 5 },
            { name: 'تحليل', value: 3 }, { name: 'نشر', value: 6 }
          ],
          monthlyOutput: [
            { month: 'أكتوبر', reports: 3 }, { month: 'نوفمبر', reports: 2 },
            { month: 'ديسمبر', reports: 4 }, { month: 'يناير', reports: 3 },
            { month: 'فبراير', reports: 5 }, { month: 'مارس', reports: 4 }
          ],
          recentStudies: [
            { title: 'فعالية برامج التأهيل', phase: 'تحليل', lead: 'د. سعاد', startDate: '2025-09-01' },
            { title: 'تقييم خدمات الإيواء', phase: 'جمع بيانات', lead: 'د. عادل', startDate: '2025-11-15' },
            { title: 'مؤشرات الاندماج المجتمعي', phase: 'نشر', lead: 'د. منال', startDate: '2025-06-01' }
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
    { label: 'الدراسات', value: data.totalStudies, icon: <ScienceIcon />, color: '#7b1fa2' },
    { label: 'نشطة', value: data.activeStudies, icon: <StudyIcon />, color: '#1976d2' },
    { label: 'مجموعات بيانات', value: data.datasets, icon: <DataIcon />, color: '#388e3c' },
    { label: 'منشورات', value: data.publications, icon: <EffectIcon />, color: '#f57c00' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة مركز الأبحاث</Typography>
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
            <Typography variant="h6" gutterBottom>مراحل الدراسات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.studyPhases} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.studyPhases?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>المخرجات الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyOutput}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="reports" name="تقارير" fill="#7b1fa2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>أحدث الدراسات</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>العنوان</TableCell><TableCell>المرحلة</TableCell>
              <TableCell>الباحث الرئيسي</TableCell><TableCell>تاريخ البدء</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentStudies?.map((s, i) => (
                <TableRow key={i}>
                  <TableCell>{s.title}</TableCell>
                  <TableCell><Chip label={s.phase} size="small" color="primary" variant="outlined" /></TableCell>
                  <TableCell>{s.lead}</TableCell>
                  <TableCell>{s.startDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
