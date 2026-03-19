import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Timeline as TimelineIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await adminService.getAdminDashboard('admin001');
      setDashboardData(data);
    };
    fetchData();
  }, []);

  if (!dashboardData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  const handleOpenDialog = alert => {
    setSelectedAlert(alert);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DashboardIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة تحكم الإدارة
            </Typography>
            <Typography variant="body2">نظرة عامة على صحة النظام والعمليات</Typography>
          </Box>
        </Box>
      </Box>

      {/* Main Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    إجمالي المستخدمين
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                    {dashboardData.totalUsers}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    نشطين: {dashboardData.activeUsers}
                  </Typography>
                </Box>
                <DashboardIcon sx={{ fontSize: 50, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Therapists */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(245, 87, 108, 0.4)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    المعالجون النشطون
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                    {dashboardData.activeTherapists}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    من أصل {dashboardData.totalTherapists}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 50, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Patients */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(79, 172, 254, 0.4)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    المرضى المسجلون
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                    {dashboardData.totalPatients}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    في العلاج: {dashboardData.patientsInTreatment}
                  </Typography>
                </Box>
                <CheckCircleIcon sx={{ fontSize: 50, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Health */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              boxShadow: '0 8px 16px rgba(67, 233, 123, 0.4)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    صحة النظام
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                    {dashboardData.systemHealth}%
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    جميع الخدمات تعمل
                  </Typography>
                </Box>
                <TimelineIcon sx={{ fontSize: 50, opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="حالة الخدمات" avatar={<CheckCircleIcon sx={{ color: '#4CAF50' }} />} />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dashboardData.services?.map(service => (
                  <Box key={service.id}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {service.name}
                      </Typography>
                      <Chip
                        label={service.status}
                        color={service.status === 'تعمل بكفاءة' ? 'success' : 'warning'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={service.uptime}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #4CAF50 0%, #45a049 100%)',
                        },
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
                      وقت التشغيل: {service.uptime}%
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="الأنشطة الأخيرة" />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dashboardData.recentActivity?.map((activity, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 1,
                      borderLeft: '3px solid #667eea',
                      backgroundColor: '#f5f5f5',
                      borderRadius: 1,
                    }}
                  >
                    <Avatar sx={{ width: 32, height: 32, mr: 2, backgroundColor: '#667eea' }}>{activity.initials}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {activity.action}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        {activity.timestamp}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* System Alerts */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="تنبيهات النظام" avatar={<WarningIcon sx={{ color: '#FF9800' }} />} />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الرسالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الشدة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardData.alerts?.map(alert => (
                  <TableRow key={alert.id} hover>
                    <TableCell>
                      <Chip label={alert.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell>
                      <Chip
                        label={alert.severity}
                        color={alert.severity === 'عالية' ? 'error' : alert.severity === 'متوسطة' ? 'warning' : 'info'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{alert.timestamp}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => handleOpenDialog(alert)}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Alert Details Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل التنبيه</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                النوع:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedAlert.type}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الرسالة:
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedAlert.message}
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الشدة:
              </Typography>
              <Chip
                label={selectedAlert.severity}
                color={selectedAlert.severity === 'عالية' ? 'error' : selectedAlert.severity === 'متوسطة' ? 'warning' : 'info'}
                size="small"
                sx={{ mb: 2 }}
              />

              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الوقت:
              </Typography>
              <Typography variant="body2">{selectedAlert.timestamp}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إغلاق</Button>
          <Button variant="contained" color="primary">
            اتخاذ إجراء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminDashboard;
