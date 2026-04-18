import { useState, useEffect } from 'react';
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
import { adminService } from 'services/adminService';
import IntegrationsHealthBadge from '../../components/IntegrationsHealthBadge';
import BuildInfoChip from '../../components/BuildInfoChip';
import logger from 'utils/logger';
import { gradients, statusColors, surfaceColors, neutralColors, brandColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const AdminDashboard = () => {
  const showSnackbar = useSnackbar();
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [dashboardData, setDashboardData] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await adminService.getAdminDashboard(userId);
        setDashboardData(data);
      } catch (err) {
        logger.error('Failed to load admin dashboard:', err);
        setError(err.message || 'حدث خطأ في تحميل لوحة التحكم');
        showSnackbar('حدث خطأ في تحميل لوحة التحكم', 'error');
      }
    };
    fetchData();
  }, [userId, showSnackbar]);

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

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
          background: gradients.primary,
          borderRadius: '20px',
          p: 3,
          mb: 4,
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DashboardIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                لوحة تحكم الإدارة
              </Typography>
              <Typography variant="body2">نظرة عامة على صحة النظام والعمليات</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IntegrationsHealthBadge
              sx={{ bgcolor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(4px)' }}
            />
            <BuildInfoChip
              sx={{ bgcolor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)' }}
            />
          </Box>
        </Box>
      </Box>

      {/* Main Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Total Users */}
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: gradients.primary,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 16px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 24px rgba(102, 126, 234, 0.5)',
              },
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
              background: gradients.warning,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 16px rgba(245, 87, 108, 0.4)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 24px rgba(245, 87, 108, 0.5)',
              },
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
              background: gradients.info,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 16px rgba(79, 172, 254, 0.4)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 24px rgba(79, 172, 254, 0.5)',
              },
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
              background: gradients.success,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 8px 16px rgba(67, 233, 123, 0.4)',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-3px)',
                boxShadow: '0 12px 24px rgba(67, 233, 123, 0.5)',
              },
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
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              transition: 'all 0.3s',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
            }}
          >
            <CardHeader
              title="حالة الخدمات"
              titleTypographyProps={{ fontWeight: 700 }}
              avatar={<CheckCircleIcon sx={{ color: statusColors.success }} />}
            />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(Array.isArray(dashboardData.services) ? dashboardData.services : []).map(
                  service => (
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
                          backgroundColor: surfaceColors.divider,
                          '& .MuiLinearProgress-bar': {
                            background: `linear-gradient(90deg, ${statusColors.success} 0%, ${statusColors.successMid} 100%)`,
                          },
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: neutralColors.textSecondary, display: 'block', mt: 0.5 }}
                      >
                        وقت التشغيل: {service.uptime}%
                      </Typography>
                    </Box>
                  )
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              borderRadius: '20px',
              border: '1px solid rgba(0,0,0,0.04)',
              boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
              transition: 'all 0.3s',
              '&:hover': { boxShadow: '0 8px 30px rgba(0,0,0,0.08)' },
            }}
          >
            <CardHeader title="الأنشطة الأخيرة" titleTypographyProps={{ fontWeight: 700 }} />
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {(Array.isArray(dashboardData.recentActivity)
                  ? dashboardData.recentActivity
                  : []
                ).map((activity, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 1,
                      borderLeft: `3px solid ${brandColors.primaryStart}`,
                      backgroundColor: 'rgba(0,0,0,0.015)',
                      borderRadius: '10px',
                      transition: 'all 0.2s',
                      '&:hover': { backgroundColor: 'rgba(0,0,0,0.03)' },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        mr: 2,
                        backgroundColor: brandColors.primaryStart,
                      }}
                    >
                      {activity.initials}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {activity.action}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
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
      <Card
        sx={{
          mb: 4,
          borderRadius: '20px',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        <CardHeader
          title="تنبيهات النظام"
          titleTypographyProps={{ fontWeight: 700 }}
          avatar={<WarningIcon sx={{ color: statusColors.warning }} />}
        />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    النوع
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    الرسالة
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    الشدة
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    الوقت
                  </TableCell>
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: '12px',
                      letterSpacing: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    الإجراء
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(Array.isArray(dashboardData.alerts) ? dashboardData.alerts : []).map(alert => (
                  <TableRow key={alert.id} hover>
                    )
                    <TableCell>
                      <Chip label={alert.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{alert.message}</TableCell>
                    <TableCell>
                      <Chip
                        label={alert.severity}
                        color={
                          alert.severity === 'عالية'
                            ? 'error'
                            : alert.severity === 'متوسطة'
                              ? 'warning'
                              : 'info'
                        }
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{alert.timestamp}</Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          aria-label="المزيد"
                          size="small"
                          onClick={() => handleOpenDialog(alert)}
                        >
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
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
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
                color={
                  selectedAlert.severity === 'عالية'
                    ? 'error'
                    : selectedAlert.severity === 'متوسطة'
                      ? 'warning'
                      : 'info'
                }
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
