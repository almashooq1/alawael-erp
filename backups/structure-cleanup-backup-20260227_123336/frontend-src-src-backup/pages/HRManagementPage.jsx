/**
 * Advanced HR Management Dashboard Component
 * مكون لوحة تحكم إدارة الموارد البشرية المتقدمة
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  LinearProgress,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Tooltip,
  Stack,
  Rating,
} from '@mui/material';

import {
  Add as AddIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as AttachMoneyIcon,
  EmojiEvents as EmojiEventsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';

import axios from 'axios';

const HRManagementDashboard = () => {
  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [empRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE}/hr/employees`),
        axios.get(`${API_BASE}/hr/analytics/summary`),
      ]);

      if (empRes.data.success) setEmployees(empRes.data.data);
      if (analyticsRes.data.success) setAnalytics(analyticsRes.data.data);

      showMessage('تم تحميل البيانات بنجاح');
    } catch (error) {
      showMessage('خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // ======================== أقسام الواجهة ========================

  // === قسم الموظفين ===
  const EmployeesSection = () => (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <PersonIcon color="primary" />
              <span>إدارة الموظفين</span>
            </Box>
          }
          action={
            <Button variant="contained" startIcon={<AddIcon />}>
              موظف جديد
            </Button>
          }
        />
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell align="center">الموظف</TableCell>
                  <TableCell>المنصب</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">التقييم</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map(emp => (
                    <TableRow key={emp._id} hover>
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: '#667eea' }}>
                            {emp.firstName?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="600">
                              {emp.firstName} {emp.lastName}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {emp.email}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>
                        <Chip
                          label={emp.status}
                          size="small"
                          color={emp.status === 'active' ? 'success' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Rating value={emp.performance?.currentRating || 0} readOnly size="small" />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="التفاصيل">
                          <IconButton size="small" color="primary">
                            <PersonIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="warning">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography color="textSecondary">لا توجد بيانات موظفين</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // === قسم الرواتب ===
  const PayrollSection = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoneyIcon sx={{ fontSize: 40, color: '#667eea', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                إجمالي الرواتب الشهرية
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.summary?.totalGross?.toLocaleString('ar-SA') || '0'} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                الرواتب المعالجة
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.summary?.employeeCount || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <AttachMoneyIcon color="primary" />
              <span>إدارة الرواتب</span>
            </Box>
          }
          action={
            <Stack direction="row" gap={1}>
              <Button variant="outlined" size="small">
                معالجة الرواتب
              </Button>
              <Button variant="outlined" size="small">
                تحويل
              </Button>
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>
                تقرير
              </Button>
            </Stack>
          }
        />
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>الموظف</TableCell>
                  <TableCell align="right">الراتب الأساسي</TableCell>
                  <TableCell align="right">المزايا</TableCell>
                  <TableCell align="right">الخصومات</TableCell>
                  <TableCell align="right">الصافي</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">اختر شهراً لعرض الرواتب</Typography>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );

  // === قسم التدريب ===
  const TrainingSection = () => (
    <Box>
      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <SchoolIcon color="primary" />
              <span>التدريب والتطوير</span>
            </Box>
          }
          action={
            <Button variant="contained" startIcon={<AddIcon />}>
              برنامج جديد
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={2}>
            {[1, 2, 3].map(idx => (
              <Grid item xs={12} md={6} key={idx}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      برنامج التطوير الإداري
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      المدة: 30 ساعة | عدد المشاركين: 15
                    </Typography>
                    <Box sx={{ mb: 1 }}>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption">التقدم:</Typography>
                        <Typography variant="caption">60%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={60} />
                    </Box>
                    <Button size="small" color="primary">
                      عرض التفاصيل
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );

  // === قسم الأداء ===
  const PerformanceSection = () => (
    <Box>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                متوسط التقييمات
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.averagePerformance?.toFixed(2) || '3.5'} / 5.0
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <CheckCircleIcon sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                تقييمات معلقة
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                12
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardHeader
          title={
            <Box display="flex" alignItems="center" gap={1}>
              <TrendingUpIcon color="primary" />
              <span>تقييمات الأداء</span>
            </Box>
          }
        />
        <CardContent>
          <List>
            {[1, 2, 3].map(idx => (
              <Box key={idx}>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: '#667eea' }}>أ</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="أحمد محمد"
                    secondary={`التقييم: 4/5 - في الانتظار من المدير`}
                  />
                  <Button size="small" color="primary">
                    عرض
                  </Button>
                </ListItem>
                <Divider variant="inset" component="li" />
              </Box>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );

  // === قسم الإحصائيات ===
  const AnalyticsSection = () => (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PersonIcon sx={{ fontSize: 40, color: '#667eea', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                إجمالي الموظفين
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.totalEmployees || '0'}
              </Typography>
              <Chip label="نشطين" size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <EmojiEventsIcon sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                المتدربين
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.totalParticipants || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoneyIcon sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                متوسط الراتب
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.averageSalary?.toLocaleString('ar-SA') || '0'} ر.س
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                عقود منتهية قريباً
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {analytics?.expiringContracts?.length || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  // ======================== الواجهة الرئيسية ========================

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          لوحة تحكم إدارة الموارد البشرية
        </Typography>
        <Typography color="textSecondary">نظام متقدم لإدارة الموظفين والرواتب والأداء</Typography>
      </Box>

      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, value) => setActiveTab(value)}>
          <Tab icon={<PersonIcon />} label="الموظفين" iconPosition="start" />
          <Tab icon={<AttachMoneyIcon />} label="الرواتب" iconPosition="start" />
          <Tab icon={<SchoolIcon />} label="التدريب" iconPosition="start" />
          <Tab icon={<TrendingUpIcon />} label="الأداء" iconPosition="start" />
          <Tab icon={<TrendingUpIcon />} label="الإحصائيات" iconPosition="start" />
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {activeTab === 0 && <EmployeesSection />}
        {activeTab === 1 && <PayrollSection />}
        {activeTab === 2 && <TrainingSection />}
        {activeTab === 3 && <PerformanceSection />}
        {activeTab === 4 && <AnalyticsSection />}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HRManagementDashboard;
