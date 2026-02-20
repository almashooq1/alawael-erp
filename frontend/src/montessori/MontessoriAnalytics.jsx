import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, CircularProgress, Alert, Grid, Card, CardContent, Chip } from '@mui/material';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const API = '/api/montessori/analytics';
const token = localStorage.getItem('montessori_token');

export default function MontessoriAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData(d);
    } catch {
      setError('فشل في جلب التحليلات');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchData(); }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return null;

  return (
    <Box mt={4}>
      <Typography variant="h5" mb={2}>لوحة التحليلات الذكية</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">نسبة الأهداف المنجزة</Typography>
              <Pie data={data.goalsPieData} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">توزيع الجلسات حسب المجالات</Typography>
              <Bar data={data.sessionsBarData} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">تطور التقييمات عبر الزمن</Typography>
              <Line data={data.evaluationsLineData} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" mb={2}>ملاحظات ذكية</Typography>
            {(data.smartNotes || []).map((note, i) => (
              <Chip key={i} label={note} color="info" sx={{ mr: 1, mb: 1 }} />
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
