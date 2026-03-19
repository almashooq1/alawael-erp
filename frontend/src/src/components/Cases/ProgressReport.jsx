import React from 'react';
import { Box, Card, CardContent, Grid, LinearProgress, Typography } from '@mui/material';

/**
 * ProgressReport
 * الوصف: تقرير التقدم للمستفيد
 */
function ProgressReport({ caseData }) {
  const stats = caseData.statistics || {};

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              نسبة التقدم
            </Typography>
            <Typography variant="h5">{stats.overallProgress || 0}%</Typography>
            <LinearProgress variant="determinate" value={stats.overallProgress || 0} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              مستوى المشاركة
            </Typography>
            <Typography variant="h5">{stats.engagementScore || 0}%</Typography>
            <LinearProgress variant="determinate" value={stats.engagementScore || 0} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              درجة الرضا
            </Typography>
            <Typography variant="h5">{stats.satisfactionScore || 0}%</Typography>
            <LinearProgress variant="determinate" value={stats.satisfactionScore || 0} />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              مستوى المخاطر
            </Typography>
            <Typography variant="h5" sx={{ color: stats.riskLevel === 'high' ? '#f44336' : '#4caf50' }}>
              {stats.riskLevel || 'منخفض'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default ProgressReport;
