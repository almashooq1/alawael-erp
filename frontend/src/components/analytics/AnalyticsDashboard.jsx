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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchDashboard, fetchMetrics } from '../../store/slices/analyticsSlice';

const AnalyticsDashboard = () => {
  const dispatch = useDispatch();
  const { dashboard, metrics, loading } = useSelector((state) => state.analytics);

  useEffect(() => {
    dispatch(fetchDashboard());
    dispatch(fetchMetrics('month'));
  }, [dispatch]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        لوحة تحليلات النظام
      </Typography>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المبيعات
              </Typography>
              <Typography variant="h6">
                {dashboard?.totalSales || 0} ريال
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                العملاء الجدد
              </Typography>
              <Typography variant="h6">{dashboard?.newCustomers || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الطلبات المعلقة
              </Typography>
              <Typography variant="h6">{dashboard?.pendingOrders || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                رضا العملاء
              </Typography>
              <Typography variant="h6">
                {dashboard?.customerSatisfaction || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                المبيعات الشهرية
              </Typography>
              {metrics && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.monthlySales || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="sales" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
