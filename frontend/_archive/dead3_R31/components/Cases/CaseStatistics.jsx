import React from 'react';
import { Grid, Card, CardContent, Typography } from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

/**
 * CaseStatistics
 * 
 * الوصف: عرض إحصائيات الحالات مع رسوم بيانية
 */

function CaseStatistics({ statistics }) {
  if (!statistics) return null;

  // البيانات للرسم البياني
  const statusChartData = {
    labels: Object.keys(statistics.byStatus || {}),
    datasets: [{
      label: 'عدد الحالات',
      data: Object.values(statistics.byStatus || {}),
      backgroundColor: ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9c27b0'],
    }],
  };

  const disabilityChartData = {
    labels: Object.keys(statistics.byDisability || {}),
    datasets: [{
      label: 'توزيع الإعاقات',
      data: Object.values(statistics.byDisability || {}),
      borderColor: '#1976d2',
      backgroundColor: 'rgba(25, 118, 210, 0.1)',
      tension: 0.4,
    }],
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>📊 توزيع حالات الحالات</Typography>
            {statistics.byStatus && <Pie data={statusChartData} />}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>♿ توزيع الإعاقات</Typography>
            {statistics.byDisability && <Bar data={disabilityChartData} />}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary">إجمالي الحالات</Typography>
            <Typography variant="h4">{statistics.summary.total}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary">حالات نشطة</Typography>
            <Typography variant="h4" sx={{ color: '#4caf50' }}>{statistics.summary.active}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary">حالات معلقة</Typography>
            <Typography variant="h4" sx={{ color: '#ff9800' }}>{statistics.summary.pending}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary">حالات حرجة</Typography>
            <Typography variant="h4" sx={{ color: '#f44336' }}>{statistics.summary.critical}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default CaseStatistics;
