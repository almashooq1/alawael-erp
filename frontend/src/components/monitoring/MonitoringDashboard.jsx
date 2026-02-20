import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import { CheckCircle as CheckIcon, Error as ErrorIcon } from '@mui/icons-material';
import { fetchSystemHealth, fetchMetrics } from '../../store/slices/monitoringSlice';

const MonitoringDashboard = () => {
  const dispatch = useDispatch();
  const { health, metrics, loading } = useSelector((state) => state.monitoring);

  useEffect(() => {
    dispatch(fetchSystemHealth());
    dispatch(fetchMetrics());
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        مراقبة النظام
      </Typography>

      <Grid container spacing={3}>
        {/* Health Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckIcon sx={{ color: 'green' }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    حالة السيرفر
                  </Typography>
                  <Typography variant="h6">
                    {health?.status === 'healthy' ? 'سليم' : 'غير سليم'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* CPU Usage */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                استخدام CPU
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={metrics?.cpuUsage || 0}
                  />
                </Box>
                <Typography>{metrics?.cpuUsage || 0}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                استخدام الذاكرة
              </Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={metrics?.memoryUsage || 0}
                  />
                </Box>
                <Typography>{metrics?.memoryUsage || 0}%</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Database Status */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                حالة قاعدة البيانات
              </Typography>
              <Chip
                label={health?.database === 'connected' ? 'متصلة' : 'مقطوعة'}
                color={health?.database === 'connected' ? 'success' : 'error'}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* API Endpoints */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                الخدمات المتاحة
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                {health?.services?.map((service) => (
                  <Chip
                    key={service.name}
                    label={service.name}
                    icon={
                      service.status === 'active' ? <CheckIcon /> : <ErrorIcon />
                    }
                    color={service.status === 'active' ? 'success' : 'error'}
                    size="small"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringDashboard;
