import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { fetchBeneficiaries } from '../store/slices/beneficiariesSlice';

function BeneficiariesReports() {
  const dispatch = useDispatch();
  const { beneficiaries } = useSelector(state => state.beneficiaries);

  useEffect(() => {
    dispatch(fetchBeneficiaries({ page: 1, limit: 1000 }));
  }, [dispatch]);

  // Chart data - Insurance providers distribution
  const insuranceData = useMemo(() => {
    if (!beneficiaries) return [];
    
    const grouped = beneficiaries.reduce((acc, b) => {
      const provider = b.insuranceProvider || 'Unknown';
      const existing = acc.find(item => item.name === provider);
      
      if (existing) {
        existing.value++;
      } else {
        acc.push({ name: provider, value: 1 });
      }
      
      return acc;
    }, []);
    
    return grouped;
  }, [beneficiaries]);

  // Chart data - Registration trend (by month)
  const registrationTrendData = useMemo(() => {
    if (!beneficiaries) return [];
    
    const months = {};
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    beneficiaries.forEach(b => {
      const date = new Date(b.createdAt);
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      months[monthKey] = (months[monthKey] || 0) + 1;
    });
    
    return Object.entries(months).map(([month, count]) => ({
      month,
      count
    }));
  }, [beneficiaries]);

  // Chart data - Medical records status
  const medicalRecordsData = useMemo(() => {
    if (!beneficiaries) return [];
    
    const withRecords = beneficiaries.filter(b => b.medicalRecords?.length > 0).length;
    const withoutRecords = beneficiaries.length - withRecords;
    
    return [
      { name: 'مع سجلات طبية', value: withRecords },
      { name: 'بدون سجلات طبية', value: withoutRecords }
    ];
  }, [beneficiaries]);

  const COLORS = ['#1976d2', '#4caf50', '#ff9800', '#f44336', '#9c27b0', '#00bcd4'];

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Insurance Provider Distribution */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="توزيع جهات التأمين" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={insuranceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {insuranceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Medical Records Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="حالة السجلات الطبية" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={medicalRecordsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {medicalRecordsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Registration Trend */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="اتجاه التسجيل الشهري" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={registrationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#1976d2"
                    name="عدد التسجيلات"
                    dot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics Summary */}
        <Grid item xs={12}>
          <Card>
            <CardHeader title="ملخص الإحصائيات" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                    <Typography color="textSecondary" gutterBottom>
                      إجمالي المستفيدين
                    </Typography>
                    <Typography variant="h6">
                      {beneficiaries?.length || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography color="textSecondary" gutterBottom>
                      متوسط السجلات الطبية للمستفيد
                    </Typography>
                    <Typography variant="h6">
                      {beneficiaries && beneficiaries.length > 0
                        ? (beneficiaries.reduce((sum, b) => sum + (b.medicalRecords?.length || 0), 0) / beneficiaries.length).toFixed(2)
                        : 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Box sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                    <Typography color="textSecondary" gutterBottom>
                      نسبة الاكتمال
                    </Typography>
                    <Typography variant="h6">
                      {beneficiaries && beneficiaries.length > 0
                        ? Math.round(
                            (beneficiaries.filter(b => b.medicalRecords?.length > 0).length / beneficiaries.length) * 100
                          )
                        : 0}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default BeneficiariesReports;
