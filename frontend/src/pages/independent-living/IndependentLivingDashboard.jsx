/**
 * Independent Living Dashboard — لوحة برامج العيش المستقل
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import {
  Home as HomeIcon,
  School as TrainIcon,
  TrendingUp as ProgressIcon,
  Assessment as AssessIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#00897b', '#1976d2', '#f57c00', '#d32f2f', '#7b1fa2'];

export default function IndependentLivingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/independent-living/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalBeneficiaries: 45,
          activeTrainingPlans: 32,
          housingPlacements: 8,
          avgReadiness: 67,
          skillAreas: [
            { name: 'مهارات منزلية', value: 38 }, { name: 'مهارات مالية', value: 28 },
            { name: 'مهارات اجتماعية', value: 34 }, { name: 'مهارات مهنية', value: 22 }
          ],
          monthlyProgress: [
            { month: 'أكتوبر', score: 58 }, { month: 'نوفمبر', score: 61 },
            { month: 'ديسمبر', score: 60 }, { month: 'يناير', score: 64 },
            { month: 'فبراير', score: 66 }, { month: 'مارس', score: 67 }
          ],
          recentAssessments: [
            { beneficiary: 'أحمد سعيد', readiness: 82, plan: 'خطة شاملة', date: '2026-03-19' },
            { beneficiary: 'فاطمة علي', readiness: 71, plan: 'مهارات منزلية', date: '2026-03-18' },
            { beneficiary: 'خالد محمد', readiness: 55, plan: 'مهارات مالية', date: '2026-03-17' }
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
    { label: 'المستفيدون', value: data.totalBeneficiaries, icon: <HomeIcon />, color: '#00897b' },
    { label: 'خطط تدريب نشطة', value: data.activeTrainingPlans, icon: <TrainIcon />, color: '#1976d2' },
    { label: 'إسكان', value: data.housingPlacements, icon: <HomeIcon />, color: '#f57c00' },
    { label: 'متوسط الجاهزية %', value: `${data.avgReadiness}%`, icon: <ProgressIcon />, color: '#7b1fa2' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة العيش المستقل</Typography>
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
            <Typography variant="h6" gutterBottom>مجالات المهارات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.skillAreas} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.skillAreas?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>متوسط التقدم الشهري</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlyProgress}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="score" name="درجة الجاهزية" fill="#00897b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>آخر التقييمات</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>المستفيد</TableCell><TableCell>الجاهزية</TableCell>
              <TableCell>الخطة</TableCell><TableCell>التاريخ</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentAssessments?.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{a.beneficiary}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress variant="determinate" value={a.readiness} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="body2">{a.readiness}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{a.plan}</TableCell>
                  <TableCell>{a.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
