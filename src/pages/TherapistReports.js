import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';
import {
  LineChart as MuiLineChart,
  Line,
  BarChart as MuiBarChart,
  Bar,
  PieChart as MuiPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { therapistService } from '../services/therapistService';

const TherapistReports = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const loadReports = async () => {
      try {
        await therapistService.getTherapistReports('TH001');
        setLoading(false);
      } catch (error) {
        console.error('Error loading reports:', error);
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const progressData = [
    { name: 'يناير', value: 45 },
    { name: 'فبراير', value: 52 },
    { name: 'مارس', value: 61 },
    { name: 'أبريل', value: 68 },
    { name: 'مايو', value: 75 },
  ];

  const patientStatusData = [
    { name: 'تحسن ملحوظ', value: 45 },
    { name: 'تحسن متوسط', value: 35 },
    { name: 'بحاجة متابعة', value: 15 },
    { name: 'حالات حرجة', value: 5 },
  ];

  const sessionDistributionData = [
    { name: 'جلسات فردية', value: 65 },
    { name: 'جلسات جماعية', value: 25 },
    { name: 'متابعات', value: 10 },
  ];

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c'];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل التقارير...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          📊 التقارير والإحصائيات
        </Typography>

        {/* التحكم والفلترة */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(e, newRange) => {
              if (newRange) setTimeRange(newRange);
            }}
            size="small"
          >
            <ToggleButton value="week">أسبوع</ToggleButton>
            <ToggleButton value="month">شهر</ToggleButton>
            <ToggleButton value="quarter">ربع سنة</ToggleButton>
            <ToggleButton value="year">سنة</ToggleButton>
          </ToggleButtonGroup>

          <Box sx={{ flex: 1 }} />

          <Button variant="outlined" startIcon={<DownloadIcon />}>
            تحميل PDF
          </Button>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            طباعة
          </Button>
        </Box>
      </Box>

      {/* الإحصائيات الرئيسية */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>إجمالي الجلسات</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                127
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                +15% مقارنة بالشهر السابق
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>متوسط رضا المريض</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                4.6/5
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                من 96 تقييم
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>معدل التحسن</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                72%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المرضى في تحسن مستمر
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography sx={{ opacity: 0.9, mb: 1 }}>معدل الحضور</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                89%
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                التزام عالي من المرضى
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الرسوم البيانية */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* تطور الحالات */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📈 تطور نسبة التحسن الشهري
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <MuiLineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#667eea"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </MuiLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع حالات المرضى */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                🔍 توزيع حالات المرضى
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <MuiBarChart data={patientStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#667eea" />
                </MuiBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* توزيع أنواع الجلسات */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📊 توزيع أنواع الجلسات
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <MuiPieChart>
                  <Pie
                    data={sessionDistributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </MuiPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* جدول الملخص */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📋 ملخص الأداء الشهري
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>المؤشر</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">
                        القيمة
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>إجمالي الجلسات</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          127
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>الجلسات المكتملة</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                          119
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>الجلسات الملغاة</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                          8
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>متوسط التقييم</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                          4.6/5 ⭐
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default TherapistReports;
