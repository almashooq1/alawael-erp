/**
 * Equipment Management Dashboard
 * لوحة تحكم إدارة المعدات
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Tab,
  Tabs,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  LinearProgress,
  Typography,
  Stack,
  Divider,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  BuildIcon,
  LocalShippingIcon,
  EquipmentIcon,
  TrendingUp,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

const EquipmentDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [equipment, setEquipment] = useState([]);
  const [maintenanceSchedules, setMaintenanceSchedules] = useState([]);
  const [lendings, setLendings] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState(null);

  const { get, post } = useApi();

  // إصلاح: إضافة fetchAllData كـ dependency في useCallback
  const fetchAllData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [equipmentRes, maintenanceRes, lendinRes, statsRes, alertsRes] = await Promise.all([
        get('/api/equipment'),
        get('/api/maintenance-schedules'),
        get('/api/lending'),
        get('/api/equipment/dashboard/stats'),
        get('/api/alerts'),
      ]);

      setEquipment(equipmentRes.data);
      setMaintenanceSchedules(maintenanceRes.data);
      setLendings(lendinRes.data);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [get]); // إضافة get كـ dependency

  // استخدام useEffect بشكل آمن
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]); // إضافة fetchAllData كـ dependency

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    const colors = {
      available: 'success',
      in_use: 'info',
      in_maintenance: 'warning',
      damaged: 'error',
      out_of_service: 'error',
    };
    return colors[status] || 'default';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'error',
      high: 'warning',
      medium: 'info',
      low: 'success',
    };
    return colors[severity] || 'default';
  };

  const getCategoryLabel = (category) => {
    const labels = {
      assessment_diagnostic: 'تقييم وتشخيص',
      treatment_rehabilitation: 'علاج وتأهيل',
      assistive_technology: 'أجهزة مساعدة',
      consumables: 'مواد استهلاكية',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}>
          📊 لوحة تحكم إدارة المعدات
        </Typography>
        <Typography variant="body1" sx={{ color: '#666' }}>
          نظام متقدم لإدارة وتتبع المعدات والصيانة والإعارات
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom>
                      إجمالي المعدات
                    </Typography>
                    <Typography variant="h4">{stats.equipment.total}</Typography>
                  </Box>
                  <EquipmentIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom>
                      متاحة الآن
                    </Typography>
                    <Typography variant="h4">{stats.equipment.available}</Typography>
                  </Box>
                  <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom>
                      صيانات متأخرة
                    </Typography>
                    <Typography variant="h4">{stats.maintenance.overdue}</Typography>
                  </Box>
                  <ScheduleIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="rgba(255,255,255,0.8)" gutterBottom>
                      إعارات نشطة
                    </Typography>
                    <Typography variant="h4">{stats.lending.active}</Typography>
                  </Box>
                  <LocalShippingIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card sx={{ mb: 3, borderLeft: '4px solid #f44336' }}>
          <CardHeader
            title="⚠️ التنبيهات النشطة"
            subheader={`${alerts.length} تنبيهات تتطلب انتباهاً`}
            sx={{ pb: 1 }}
          />
          <CardContent>
            <Stack spacing={1}>
              {alerts.slice(0, 5).map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info'}
                  icon={
                    alert.severity === 'critical' ? (
                      <WarningIcon />
                    ) : (
                      <InfoIcon />
                    )
                  }
                >
                  {alert.message}
                </Alert>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="المعدات (المخزون)" icon={<EquipmentIcon />} iconPosition="start" />
          <Tab label="جدولة الصيانة" icon={<ScheduleIcon />} iconPosition="start" />
          <Tab label="الإعارات" icon={<LocalShippingIcon />} iconPosition="start" />
          <Tab label="الأعطال والتصليح" icon={<BuildIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Tab Content */}

      {/* Equipment Tab */}
      {tabValue === 0 && (
        <Card>
          <CardHeader title="قائمة المعدات" action={<Button variant="contained">➕ إضافة معدة</Button>} />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>معرف المعدة</TableCell>
                    <TableCell>الاسم</TableCell>
                    <TableCell>التصنيف</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الموقع</TableCell>
                    <TableCell>الضمان</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {equipment.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{item.equipmentId}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={getCategoryLabel(item.category)}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          color={getStatusColor(item.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.location?.room || '-'}</TableCell>
                      <TableCell>
                        {item.warranty?.isExpired ? (
                          <Chip label="منتهي" color="error" size="small" />
                        ) : (
                          <Chip
                            label={`${item.warranty?.daysRemaining} يوم`}
                            color={item.warranty?.daysRemaining < 30 ? 'warning' : 'success'}
                            size="small"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          عرض
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Tab */}
      {tabValue === 1 && (
        <Card>
          <CardHeader title="جدولة الصيانة" action={<Button variant="contained">➕ جدولة صيانة</Button>} />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>المعدة</TableCell>
                    <TableCell>نوع الصيانة</TableCell>
                    <TableCell>التاريخ المقرر</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>المسؤول</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {maintenanceSchedules.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>{item.equipment?.name}</TableCell>
                      <TableCell>{item.scheduleType}</TableCell>
                      <TableCell>
                        {new Date(item.preventiveSchedule?.nextScheduledDate).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          color={item.status === 'completed' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{item.responsibleTechnician?.name || '-'}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          تفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Lending Tab */}
      {tabValue === 2 && (
        <Card>
          <CardHeader title="إدارة الإعارات" action={<Button variant="contained">➕ إعارة معدة</Button>} />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>المعدة</TableCell>
                    <TableCell>المستعير</TableCell>
                    <TableCell>تاريخ الإعارة</TableCell>
                    <TableCell>تاريخ الإرجاع المتوقع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lendings.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>{item.equipment?.name}</TableCell>
                      <TableCell>{item.borrower?.name}</TableCell>
                      <TableCell>
                        {new Date(item.borrowDate).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        {new Date(item.expectedReturnDate).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          color={
                            item.status === 'returned'
                              ? 'success'
                              : item.status === 'overdue'
                              ? 'error'
                              : 'info'
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined">
                          إجراء
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Faults Tab */}
      {tabValue === 3 && (
        <Card>
          <CardHeader title="الأعطال والتصليح" action={<Button variant="contained">➕ تقرير عطل</Button>} />
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              تتبع شامل لجميع الأعطال والحلول - تصنيف حسب الخطورة والحالة
            </Alert>
            <Typography color="textSecondary" sx={{ p: 2 }}>
              قادم قريباً...
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default EquipmentDashboard;
