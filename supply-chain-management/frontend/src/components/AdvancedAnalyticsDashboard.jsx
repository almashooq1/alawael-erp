import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  Grid,
  StaticDatePicker,
  TextField,
  Box,
  Paper,
  Typography,
  Chip,
} from '@mui/material';
import apiClient from '../utils/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
);

export default function AdvancedAnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  // Fetch data
  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/dashboard/advanced-reports');
      setStats(response.data?.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <Typography>Loading analytics...</Typography>;
  }

  // Sample data for charts
  const sortialData = [
    { name: 'Mon', suppliers: 3, products: 4, orders: 2 },
    { name: 'Tue', suppliers: 3, products: 4, orders: 3 },
    { name: 'Wed', suppliers: 3, products: 5, orders: 2 },
    { name: 'Thu', suppliers: 4, products: 5, orders: 4 },
    { name: 'Fri', suppliers: 4, products: 5, orders: 5 },
    { name: 'Sat', suppliers: 3, products: 4, orders: 3 },
    { name: 'Sun', suppliers: 3, products: 4, orders: 2 },
  ];

  const productData = [
    { name: 'منتج 1', value: stats?.productCount || 4 },
    { name: 'منتج 2', value: stats?.productCount || 4 },
    { name: 'منتج 3', value: stats?.productCount || 4 },
    { name: 'منتج 4', value: stats?.productCount || 4 },
  ];

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c'];

  const StatCard = ({ title, value, color, icon }) => (
    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: color, color: 'white' }}>
      <Box sx={{ fontSize: '2rem', mb: 1 }}>{icon}</Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </Paper>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        📊 Advanced Analytics Dashboard
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Suppliers"
            value={stats?.supplierCount || 0}
            color="#4CAF50"
            icon="🏢"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Products"
            value={stats?.productCount || 0}
            color="#2196F3"
            icon="📦"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Orders"
            value={stats?.orderCount || 0}
            color="#FF9800"
            icon="📋"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Inventory"
            value={stats?.totalInventory || 0}
            color="#9C27B0"
            icon="📦"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        {/* Weekly Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="📈 Weekly Activity" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sortialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="suppliers" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="products" stroke="#8884d8" />
                  <Line type="monotone" dataKey="orders" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Monthly Comparison */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="📊 Monthly Comparison" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sortialData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="suppliers" fill="#82ca9d" />
                  <Bar dataKey="products" fill="#8884d8" />
                  <Bar dataKey="orders" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Product Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="🥧 Product Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {productData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Suppliers */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="⭐ Top Suppliers" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { name: 'الشركة الأولى', rating: 4.8, orders: 12 },
                  { name: 'الشركة الثانية', rating: 4.6, orders: 8 },
                  { name: 'الشركة الثالثة', rating: 4.4, orders: 6 },
                ].map((supplier, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        {supplier.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>
                        Orders: {supplier.orders}
                      </Typography>
                    </Box>
                    <Chip
                      label={`${supplier.rating} ⭐`}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Metrics */}
      <Card sx={{ mt: 3 }}>
        <CardHeader title="📈 Performance Metrics" />
        <CardContent>
          <Grid container spacing={2}>
            {[
              { label: 'System Uptime', value: '99.9%', color: '#4CAF50' },
              { label: 'Avg Response Time', value: '<100ms', color: '#2196F3' },
              { label: 'DB Success Rate', value: '100%', color: '#4CAF50' },
              { label: 'Active Users', value: '5', color: '#FF9800' },
            ].map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box
                  sx={{
                    p: 2,
                    border: `2px solid ${metric.color}`,
                    borderRadius: 1,
                    textAlign: 'center',
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#666', mb: 1 }}>
                    {metric.label}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 'bold', color: metric.color }}
                  >
                    {metric.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
