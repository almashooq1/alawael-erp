import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  Select,
  InputLabel,
  FormControl,
  MenuItem,
} from '@mui/material';
import {
  DirectionsBus,
  Person,
  LocationOn,
  Add,
  Dashboard,
  Receipt,
  People,
  Warning,
} from '@mui/icons-material';
import api from '../utils/api';

const AdminTransportPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openBusDialog, setOpenBusDialog] = useState(false);
  const [openDriverDialog, setOpenDriverDialog] = useState(false);
  const [openRouteDialog, setOpenRouteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dashboardStats, setDashboardStats] = useState({});

  const [busForm, setBusForm] = useState({
    busNumber: '',
    licensePlate: '',
    capacity: 0,
    model: '',
    color: '',
    status: 'active',
  });

  const [driverForm, setDriverForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseCategory: 'D',
    licenseExpiry: '',
    status: 'active',
  });

  const [routeForm, setRouteForm] = useState({
    routeName: '',
    description: '',
    startPoint: '',
    endPoint: '',
    scheduleType: 'daily',
    status: 'active',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [busRes, drvRes, routeRes, regRes, compRes, payRes, dashRes] = await Promise.all([
        api.get('/transport/buses'),
        api.get('/transport/drivers'),
        api.get('/transport/routes'),
        api.get('/transport/student-registration'),
        api.get('/transport/complaints'),
        api.get('/transport/payments/overdue/all'),
        api.get('/transport/dashboard'),
      ]);

      setBuses(busRes.data.data);
      setDrivers(drvRes.data.data);
      setRoutes(routeRes.data.data);
      setRegistrations(regRes.data.data);
      setComplaints(compRes.data.data);
      setPayments(payRes.data.data);
      setDashboardStats(dashRes.data.data);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  // ==================== إدارة الحافلات ====================
  const handleOpenBusDialog = (bus = null) => {
    if (bus) {
      setBusForm(bus);
      setSelectedItem(bus);
    } else {
      setBusForm({
        busNumber: '',
        licensePlate: '',
        capacity: 0,
        model: '',
        color: '',
        status: 'active',
      });
      setSelectedItem(null);
    }
    setOpenBusDialog(true);
  };

  const handleSaveBus = async () => {
    try {
      if (selectedItem) {
        await api.put(`/transport/buses/${selectedItem._id}`, busForm);
        alert('تم تحديث الحافلة بنجاح');
      } else {
        await api.post('/transport/buses', busForm);
        alert('تم إضافة الحافلة بنجاح');
      }
      setOpenBusDialog(false);
      fetchAllData();
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const handleDeleteBus = async busId => {
    if (window.confirm('هل تريد حذف الحافلة؟')) {
      try {
        await api.delete(`/transport/buses/${busId}`);
        alert('تم حذف الحافلة بنجاح');
        fetchAllData();
      } catch (error) {
        console.error('خطأ:', error);
      }
    }
  };

  // ==================== إدارة السائقين ====================
  const handleOpenDriverDialog = (driver = null) => {
    if (driver) {
      setDriverForm(driver);
      setSelectedItem(driver);
    } else {
      setDriverForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        licenseNumber: '',
        licenseCategory: 'D',
        licenseExpiry: '',
        status: 'active',
      });
      setSelectedItem(null);
    }
    setOpenDriverDialog(true);
  };

  const handleSaveDriver = async () => {
    try {
      if (selectedItem) {
        await api.put(`/transport/drivers/${selectedItem._id}`, driverForm);
        alert('تم تحديث بيانات السائق بنجاح');
      } else {
        await api.post('/transport/drivers', driverForm);
        alert('تم إضافة السائق بنجاح');
      }
      setOpenDriverDialog(false);
      fetchAllData();
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const handleDeleteDriver = async driverId => {
    if (window.confirm('هل تريد حذف السائق؟')) {
      try {
        await api.delete(`/transport/drivers/${driverId}`);
        alert('تم حذف السائق بنجاح');
        fetchAllData();
      } catch (error) {
        console.error('خطأ:', error);
      }
    }
  };

  // ==================== إدارة المسارات ====================
  const handleOpenRouteDialog = (route = null) => {
    if (route) {
      setRouteForm(route);
      setSelectedItem(route);
    } else {
      setRouteForm({
        routeName: '',
        description: '',
        startPoint: '',
        endPoint: '',
        scheduleType: 'daily',
        status: 'active',
      });
      setSelectedItem(null);
    }
    setOpenRouteDialog(true);
  };

  const handleSaveRoute = async () => {
    try {
      if (selectedItem) {
        await api.put(`/transport/routes/${selectedItem._id}`, routeForm);
        alert('تم تحديث المسار بنجاح');
      } else {
        await api.post('/transport/routes', routeForm);
        alert('تم إضافة المسار بنجاح');
      }
      setOpenRouteDialog(false);
      fetchAllData();
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const getStatusColor = status => {
    const colors = {
      active: 'success',
      inactive: 'default',
      suspended: 'error',
      maintenance: 'warning',
    };
    return colors[status] || 'default';
  };

  const getComplaintStatusColor = status => {
    const colors = {
      open: 'error',
      investigating: 'warning',
      resolved: 'success',
      closed: 'default',
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Dashboard color="primary" fontSize="large" />
        لوحة تحكم إدارة النقل والمواصلات
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* الإحصائيات العامة */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DirectionsBus sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                إجمالي الحافلات
              </Typography>
              <Typography variant="h5">{dashboardStats.totalBuses || 0}</Typography>
              <Chip label={`${dashboardStats.activeBuses || 0} نشطة`} size="small" sx={{ mt: 1 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Person sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                إجمالي السائقين
              </Typography>
              <Typography variant="h5">{dashboardStats.totalDrivers || 0}</Typography>
              <Chip
                label={`${dashboardStats.activeDrivers || 0} نشطين`}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocationOn sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                إجمالي المسارات
              </Typography>
              <Typography variant="h5">{dashboardStats.totalRoutes || 0}</Typography>
              <Chip
                label={`${dashboardStats.activeRoutes || 0} نشطة`}
                size="small"
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Warning sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography color="textSecondary" gutterBottom>
                الشكاوى المفتوحة
              </Typography>
              <Typography variant="h5">{dashboardStats.complaints?.open || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات الرئيسية */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
          <Tab label="الحافلات" icon={<DirectionsBus />} iconPosition="start" />
          <Tab label="السائقون" icon={<Person />} iconPosition="start" />
          <Tab label="المسارات" icon={<LocationOn />} iconPosition="start" />
          <Tab label="تسجيلات الطلاب" icon={<People />} iconPosition="start" />
          <Tab label="الشكاوى" icon={<Warning />} iconPosition="start" />
          <Tab label="الدفعات" icon={<Receipt />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* تبويب الحافلات */}
      {tabValue === 0 && (
        <Card>
          <CardHeader
            title="إدارة الحافلات"
            action={
              <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenBusDialog()}>
                إضافة حافلة
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>رقم الحافلة</TableCell>
                    <TableCell>لوحة الترخيص</TableCell>
                    <TableCell>السعة</TableCell>
                    <TableCell>النموذج</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buses.map(bus => (
                    <TableRow key={bus._id} hover>
                      <TableCell>{bus.busNumber}</TableCell>
                      <TableCell>{bus.licensePlate}</TableCell>
                      <TableCell>{bus.capacity}</TableCell>
                      <TableCell>{bus.model}</TableCell>
                      <TableCell>
                        <Chip label={bus.status} color={getStatusColor(bus.status)} size="small" />
                      </TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenBusDialog(bus)}>
                          تعديل
                        </Button>
                        <Button size="small" color="error" onClick={() => handleDeleteBus(bus._id)}>
                          حذف
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

      {/* تبويب السائقين */}
      {tabValue === 1 && (
        <Card>
          <CardHeader
            title="إدارة السائقين"
            action={
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenDriverDialog()}
              >
                إضافة سائق
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>الاسم</TableCell>
                    <TableCell>الهاتف</TableCell>
                    <TableCell>رقم الرخصة</TableCell>
                    <TableCell>تاريخ انتهاء الرخصة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التقييم</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drivers.map(driver => (
                    <TableRow key={driver._id} hover>
                      <TableCell>
                        {driver.firstName} {driver.lastName}
                      </TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell>{driver.licenseNumber}</TableCell>
                      <TableCell>
                        {new Date(driver.licenseExpiry).toLocaleDateString('ar-SA')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={driver.status}
                          color={getStatusColor(driver.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>⭐ {driver.rating || 5}</TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenDriverDialog(driver)}>
                          تعديل
                        </Button>
                        <Button
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDriver(driver._id)}
                        >
                          حذف
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

      {/* تبويب المسارات */}
      {tabValue === 2 && (
        <Card>
          <CardHeader
            title="إدارة المسارات"
            action={
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => handleOpenRouteDialog()}
              >
                إضافة مسار
              </Button>
            }
          />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>اسم المسار</TableCell>
                    <TableCell>المسافة</TableCell>
                    <TableCell>عدد الطلاب</TableCell>
                    <TableCell>نوع الجدول</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {routes.map(route => (
                    <TableRow key={route._id} hover>
                      <TableCell>{route.routeName}</TableCell>
                      <TableCell>{route.routeDistance} كم</TableCell>
                      <TableCell>{route.totalStudents || 0}</TableCell>
                      <TableCell>{route.scheduleType}</TableCell>
                      <TableCell>
                        <Chip
                          label={route.status}
                          color={getStatusColor(route.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" onClick={() => handleOpenRouteDialog(route)}>
                          تعديل
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

      {/* تبويب تسجيلات الطلاب */}
      {tabValue === 3 && (
        <Card>
          <CardHeader title="تسجيلات الطلاب" />
          <CardContent>
            <FormControl sx={{ mb: 2, minWidth: 200 }}>
              <InputLabel>تصفية حسب الحالة</InputLabel>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="waiting_approval">في انتظار الموافقة</MenuItem>
                <MenuItem value="inactive">غير نشط</MenuItem>
              </Select>
            </FormControl>

            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>الطالب</TableCell>
                    <TableCell>المسار</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الدفع</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations.map(reg => (
                    <TableRow key={reg._id} hover>
                      <TableCell>{reg.studentId?.firstName}</TableCell>
                      <TableCell>{reg.currentRoute?.routeName}</TableCell>
                      <TableCell>
                        <Chip label={reg.status} color={getStatusColor(reg.status)} size="small" />
                      </TableCell>
                      <TableCell>{reg.paymentStatus}</TableCell>
                      <TableCell>{new Date(reg.createdAt).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>
                        {reg.status === 'waiting_approval' && (
                          <Button
                            size="small"
                            color="success"
                            onClick={() => {
                              api.post(`/transport/student-registration/${reg._id}/approve`);
                              fetchAllData();
                            }}
                          >
                            موافقة
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* تبويب الشكاوى */}
      {tabValue === 4 && (
        <Card>
          <CardHeader title="الشكاوى والملاحظات" />
          <CardContent>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>النوع</TableCell>
                    <TableCell>الشدة</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complaints.map(complaint => (
                    <TableRow key={complaint._id} hover>
                      <TableCell>{complaint.complaintType}</TableCell>
                      <TableCell>
                        <Chip
                          label={complaint.severity}
                          color={complaint.severity === 'critical' ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={complaint.status}
                          color={getComplaintStatusColor(complaint.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{new Date(complaint.date).toLocaleDateString('ar-SA')}</TableCell>
                      <TableCell>
                        <Button size="small">تفاصيل</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* تبويب الدفعات */}
      {tabValue === 5 && (
        <Card>
          <CardHeader title="الحسابات المتأخرة" />
          <CardContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              يوجد {payments.length} حساب متأخر بحاجة إلى متابعة
            </Alert>
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>الطالب</TableCell>
                    <TableCell>المسار</TableCell>
                    <TableCell>المبلغ المتبقي</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payments.map(payment => (
                    <TableRow key={payment._id} hover>
                      <TableCell>{payment.studentId?.firstName}</TableCell>
                      <TableCell>{payment.currentRoute?.routeName}</TableCell>
                      <TableCell sx={{ color: 'error.main', fontWeight: 'bold' }}>
                        {payment.balanceDue} ريال
                      </TableCell>
                      <TableCell>
                        <Chip label={payment.paymentStatus} color="error" size="small" />
                      </TableCell>
                      <TableCell>
                        <Button size="small">متابعة</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* نموذج الحافلة */}
      <Dialog open={openBusDialog} onClose={() => setOpenBusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedItem ? 'تعديل الحافلة' : 'إضافة حافلة جديدة'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="رقم الحافلة"
            value={busForm.busNumber}
            onChange={e => setBusForm({ ...busForm, busNumber: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="لوحة الترخيص"
            value={busForm.licensePlate}
            onChange={e => setBusForm({ ...busForm, licensePlate: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="السعة"
            value={busForm.capacity}
            onChange={e => setBusForm({ ...busForm, capacity: parseInt(e.target.value) })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="النموذج"
            value={busForm.model}
            onChange={e => setBusForm({ ...busForm, model: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="اللون"
            value={busForm.color}
            onChange={e => setBusForm({ ...busForm, color: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="الحالة"
            value={busForm.status}
            onChange={e => setBusForm({ ...busForm, status: e.target.value })}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="active">نشطة</option>
            <option value="inactive">غير نشطة</option>
            <option value="maintenance">صيانة</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBusDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveBus} variant="contained" color="primary">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* نموذج السائق */}
      <Dialog
        open={openDriverDialog}
        onClose={() => setOpenDriverDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{selectedItem ? 'تعديل السائق' : 'إضافة سائق جديد'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="الاسم الأول"
            value={driverForm.firstName}
            onChange={e => setDriverForm({ ...driverForm, firstName: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="الاسم الأخير"
            value={driverForm.lastName}
            onChange={e => setDriverForm({ ...driverForm, lastName: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="email"
            label="البريد الإلكتروني"
            value={driverForm.email}
            onChange={e => setDriverForm({ ...driverForm, email: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="الهاتف"
            value={driverForm.phone}
            onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="رقم الرخصة"
            value={driverForm.licenseNumber}
            onChange={e => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="date"
            label="تاريخ انتهاء الرخصة"
            value={driverForm.licenseExpiry}
            onChange={e => setDriverForm({ ...driverForm, licenseExpiry: e.target.value })}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDriverDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveDriver} variant="contained" color="primary">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* نموذج المسار */}
      <Dialog
        open={openRouteDialog}
        onClose={() => setOpenRouteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{selectedItem ? 'تعديل المسار' : 'إضافة مسار جديد'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="اسم المسار"
            value={routeForm.routeName}
            onChange={e => setRouteForm({ ...routeForm, routeName: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            multiline
            rows={2}
            label="الوصف"
            value={routeForm.description}
            onChange={e => setRouteForm({ ...routeForm, description: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="نقطة البداية"
            value={routeForm.startPoint}
            onChange={e => setRouteForm({ ...routeForm, startPoint: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="نقطة النهاية"
            value={routeForm.endPoint}
            onChange={e => setRouteForm({ ...routeForm, endPoint: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="نوع الجدول"
            value={routeForm.scheduleType}
            onChange={e => setRouteForm({ ...routeForm, scheduleType: e.target.value })}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="daily">يومي</option>
            <option value="weekdays">أيام الأسبوع</option>
            <option value="weekends">نهاية الأسبوع</option>
            <option value="custom">مخصص</option>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRouteDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveRoute} variant="contained" color="primary">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminTransportPage;
