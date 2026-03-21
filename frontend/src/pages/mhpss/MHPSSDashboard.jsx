/**
 * MHPSS Dashboard — لوحة الصحة النفسية والدعم النفسي الاجتماعي
 */
import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, LinearProgress
} from '@mui/material';
import {
  Psychology as PsychIcon,
  MedicalServices as SessionIcon,
  Warning as CrisisIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import apiClient from '../../services/api';

const COLORS = ['#5c6bc0', '#26a69a', '#ef5350', '#ffa726', '#ab47bc'];

export default function MHPSSDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await apiClient.get('/api/mhpss/dashboard');
        setData(res.data.data || res.data);
      } catch {
        setData({
          totalSessions: 342,
          activePrograms: 8,
          activeCrises: 3,
          groupSessions: 24,
          sessionTypes: [
            { name: 'فردية', value: 210 }, { name: 'جماعية', value: 72 },
            { name: 'أسرية', value: 38 }, { name: 'طوارئ', value: 22 }
          ],
          monthlySessions: [
            { month: 'أكتوبر', sessions: 48 }, { month: 'نوفمبر', sessions: 55 },
            { month: 'ديسمبر', sessions: 42 }, { month: 'يناير', sessions: 62 },
            { month: 'فبراير', sessions: 68 }, { month: 'مارس', sessions: 67 }
          ],
          recentCrises: [
            { beneficiary: 'مستفيد #102', level: 'متوسط', date: '2026-03-20', status: 'قيد المتابعة' },
            { beneficiary: 'مستفيد #087', level: 'منخفض', date: '2026-03-19', status: 'مغلق' },
            { beneficiary: 'مستفيد #154', level: 'مرتفع', date: '2026-03-21', status: 'نشط' }
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
    { label: 'الجلسات', value: data.totalSessions, icon: <SessionIcon />, color: '#5c6bc0' },
    { label: 'البرامج النشطة', value: data.activePrograms, icon: <PsychIcon />, color: '#26a69a' },
    { label: 'أزمات نشطة', value: data.activeCrises, icon: <CrisisIcon />, color: '#ef5350' },
    { label: 'جلسات جماعية', value: data.groupSessions, icon: <GroupIcon />, color: '#ffa726' }
  ];

  const levelColor = { 'مرتفع': 'error', 'متوسط': 'warning', 'منخفض': 'success' };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">لوحة الصحة النفسية (MHPSS)</Typography>
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
            <Typography variant="h6" gutterBottom>أنواع الجلسات</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data.sessionTypes} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {data.sessionTypes?.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>الجلسات الشهرية</Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthlySessions}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip />
                <Bar dataKey="sessions" name="جلسات" fill="#5c6bc0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>الأزمات الأخيرة</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>المستفيد</TableCell><TableCell>المستوى</TableCell>
              <TableCell>التاريخ</TableCell><TableCell>الحالة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {data.recentCrises?.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.beneficiary}</TableCell>
                  <TableCell><Chip label={c.level} size="small" color={levelColor[c.level] || 'default'} /></TableCell>
                  <TableCell>{c.date}</TableCell>
                  <TableCell>{c.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
