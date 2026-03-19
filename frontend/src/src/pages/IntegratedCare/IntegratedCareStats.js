import React from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';

function IntegratedCareStats() {
  const stats = [
    { label: 'Active Plans', value: 142, color: '#1976d2' },
    { label: 'Sessions This Week', value: 856, color: '#2e7d32' },
    { label: 'Goals Achieved', value: '68%', color: '#ed6c02' },
    { label: 'Group Programs', value: 12, color: '#9c27b0' }
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
            <Typography variant="h4" sx={{ color: stat.color, fontWeight: 'bold' }}>
              {stat.value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stat.label}
            </Typography>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

export default IntegratedCareStats;
