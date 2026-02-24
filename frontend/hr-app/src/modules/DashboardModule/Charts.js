import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import { Bar, Pie } from 'react-chartjs-2';
import { useTranslation } from 'react-i18next';

// Example chart data (replace with real API data)
export const AttendancePieChart = ({ data }) => {
  const { t } = useTranslation();
  const chartData = {
    labels: [t('Present'), t('Absent'), t('On Leave')],
    datasets: [
      {
        data: [data.present, data.absent, data.leave],
        backgroundColor: ['#4caf50', '#f44336', '#ff9800'],
      },
    ],
  };
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{t('Attendance Distribution')}</Typography>
        <Pie data={chartData} />
      </CardContent>
    </Card>
  );
};

export const LeavesBarChart = ({ data }) => {
  const { t } = useTranslation();
  const chartData = {
    labels: data.months,
    datasets: [
      {
        label: t('Leaves'),
        data: data.leaves,
        backgroundColor: '#2196f3',
      },
    ],
  };
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6">{t('Leaves Per Month')}</Typography>
        <Bar data={chartData} />
      </CardContent>
    </Card>
  );
};
