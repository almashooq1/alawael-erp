import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { TrendingUp as TrendingIcon } from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchSalesPrediction, fetchDemandForecast } from '../../store/slices/predictionsSlice';

const PredictionsDashboard = () => {
  const dispatch = useDispatch();
  const { salesPrediction, demandForecast, loading } = useSelector(
    (state) => state.predictions
  );

  useEffect(() => {
    dispatch(
      fetchSalesPrediction({
        jan: 50000,
        feb: 52000,
        mar: 54000,
        apr: 56000,
      })
    );
    dispatch(fetchDemandForecast({ productId: 'PROD-001', period: 'month' }));
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
        لوحة التوقعات والتنبؤات
      </Typography>

      <Grid container spacing={3}>
        {/* Sales Forecast */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingIcon sx={{ color: '#1976d2' }} />
                <Typography variant="h6">توقعات المبيعات</Typography>
              </Box>
              {salesPrediction && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesPrediction.forecast || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="predictedSales" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Typography variant="body2" sx={{ mt: 2 }}>
                دقة التنبؤ: {salesPrediction?.accuracy || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Demand Forecast */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TrendingIcon sx={{ color: '#ff7300' }} />
                <Typography variant="h6">توقعات الطلب</Typography>
              </Box>
              {demandForecast && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={demandForecast.forecast || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="demand" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <Typography variant="body2" sx={{ mt: 2 }}>
                الثقة: {demandForecast?.confidence || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                متوسط الزيادة المتوقعة
              </Typography>
              <Typography variant="h6">
                {salesPrediction?.growthRate || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                أعلى فترة متوقعة
              </Typography>
              <Typography variant="h6">
                {salesPrediction?.peakMonth || '-'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PredictionsDashboard;
