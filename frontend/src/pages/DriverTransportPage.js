import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  LinearProgress,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import { DirectionsBus, LocationOn, MapRounded, EventNote, Assessment, GpsFixed, People as Group, CheckCircle } from '@mui/icons-material';
import api from '../services/api';

const DriverTransportPage = () => {
  const [assignedBus, setAssignedBus] = useState(null);
  const [assignedRoutes, setAssignedRoutes] = useState([]);
  const [students, setStudents] = useState([]);
  const [tripReport, setTripReport] = useState({
    shift: 'morning',
    startTime: new Date(),
    studentsBoarded: 0,
    fuelUsed: 0,
    mileageStart: 0,
    mileageEnd: 0,
    incidents: [],
    safetyChecks: {
      seatbeltsInspected: true,
      emergencyExitClear: true,
      fireExtinguisherPresent: true,
      busConditionGood: true,
    },
  });
  const [openTripReport, setOpenTripReport] = useState(false);
  const [openStudentList, setOpenStudentList] = useState(false);
  const [openBusCheck, setOpenBusCheck] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    fetchData();
    startGPSTracking();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [busRes, routeRes] = await Promise.all([api.get('/transport/buses'), api.get('/transport/routes')]);

      // أفترض أن السائق له حافلة مخصصة
      const bus = busRes.data.data.find(b => b.driver);
      setAssignedBus(bus);

      if (bus) {
        // جلب الطلاب في المسار الحالي
        const studentsRes = await api.get(`/transport/routes/${bus.currentRoute}?expand=students`);
        setStudents(studentsRes.data.data?.stops?.flatMap(s => [...s.pickupStudents, ...s.dropoffStudents]) || []);
      }

      setAssignedRoutes(routeRes.data.data);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGPSTracking = () => {
    if ('geolocation' in navigator) {
      setGpsEnabled(true);
      navigator.geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });

          // تحديث موقع الحافلة
          if (assignedBus) {
            api
              .post(`/transport/buses/${assignedBus._id}/location`, {
                latitude,
                longitude,
              })
              .catch(err => console.error('خطأ في تحديث الموقع:', err));
          }
        },
        error => console.error('خطأ GPS:', error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      );
    }
  };

  const handleOpenTripReport = () => {
    setOpenTripReport(true);
  };

  const handleCloseTripReport = () => {
    setOpenTripReport(false);
  };

  const handleSubmitTripReport = async () => {
    try {
      await api.post('/transport/trip-report', {
        ...tripReport,
        bus: assignedBus?._id,
        route: selectedRoute?._id,
        driver: 'currentDriverId',
      });
      alert('تم تسجيل التقرير بنجاح');
      handleCloseTripReport();
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const handleOpenStudentList = route => {
    setSelectedRoute(route);
    setOpenStudentList(true);
  };

  const handleRecordAttendance = async (studentId, status) => {
    try {
      await api.post('/transport/attendance', {
        studentTransportId: studentId,
        date: new Date(),
        shift: 'morning',
        status,
        boardingTime: new Date(),
        busId: assignedBus?._id,
        driverId: 'currentDriverId',
      });
      fetchData();
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const handleOpenBusCheck = () => {
    setOpenBusCheck(true);
  };

  const handleBusPreCheck = async () => {
    try {
      alert('تم فحص الحافلة بنجاح ✓');
      setOpenBusCheck(false);
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DirectionsBus color="primary" fontSize="large" />
        بوابة السائق - نظام النقل والمواصلات
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* معلومات الحافلة المخصصة */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <CardContent sx={{ color: 'white' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">الحافلة المخصصة</Typography>
                  <Typography variant="h6">{assignedBus?.busNumber || 'لا توجد حافلة مخصصة'}</Typography>
                  <Typography variant="body2">السعة: {assignedBus?.capacity || 0} مقعد</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">حالة الحافلة</Typography>
                  <Chip
                    label={assignedBus?.status === 'active' ? 'تعمل بشكل طبيعي' : 'متوقفة'}
                    color={assignedBus?.status === 'active' ? 'success' : 'error'}
                    sx={{ color: 'white' }}
                  />
                </Grid>
              </Grid>

              {/* شريط تتبع GPS */}
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <GpsFixed fontSize="small" />
                  <Typography variant="body2">GPS: {gpsEnabled ? 'مفعل' : 'معطل'}</Typography>
                </Box>
                {currentLocation && (
                  <Typography variant="caption">
                    الموقع الحالي: {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* الإجراءات السريعة */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Button fullWidth variant="contained" color="primary" startIcon={<EventNote />} onClick={handleOpenBusCheck}>
            فحص الحافلة
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button fullWidth variant="contained" color="success" startIcon={<Group />} onClick={() => handleOpenStudentList(selectedRoute)}>
            الطلاب
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button fullWidth variant="contained" color="warning" startIcon={<Assessment />} onClick={handleOpenTripReport}>
            تقرير الرحلة
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button fullWidth variant="outlined" color="primary" startIcon={<MapRounded />}>
            الملاحة
          </Button>
        </Grid>
      </Grid>

      {/* المسارات المخصصة */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="المسارات المخصصة" />
        <CardContent>
          {assignedRoutes.length === 0 ? (
            <Alert severity="info">لا توجد مسارات مخصصة حالياً</Alert>
          ) : (
            <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              {assignedRoutes.map((route, idx) => (
                <Tab key={route._id} label={route.routeName} />
              ))}
            </Tabs>
          )}

          {assignedRoutes.length > 0 && (
            <Box>
              {assignedRoutes.map(
                (route, idx) =>
                  tabValue === idx && (
                    <Box key={route._id}>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              وقت البدء
                            </Typography>
                            <Typography variant="h6">{route.morningShift?.startTime || '-'}</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              المسافة
                            </Typography>
                            <Typography variant="h6">{route.routeDistance || 0} كم</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              الوقت المتوقع
                            </Typography>
                            <Typography variant="h6">{route.estimatedTravelTime || 0} دقيقة</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Paper sx={{ p: 2, textAlign: 'center' }}>
                            <Typography variant="subtitle2" color="textSecondary">
                              عدد الطلاب
                            </Typography>
                            <Typography variant="h6">{route.totalStudents || 0}</Typography>
                          </Paper>
                        </Grid>
                      </Grid>

                      {/* المحطات */}
                      <Typography variant="subtitle2" sx={{ mb: 2 }}>
                        المحطات
                      </Typography>
                      <List>
                        {route.stops?.map((stop, sIdx) => (
                          <Box key={sIdx}>
                            <ListItem>
                              <ListItemIcon>
                                <LocationOn color="primary" />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${stop.stopNumber}. ${stop.stopName}`}
                                secondary={`${stop.location?.address} - الوقت المتوقع: ${stop.estimatedArrivalTime}`}
                              />
                            </ListItem>
                            {sIdx < route.stops.length - 1 && <Divider />}
                          </Box>
                        ))}
                      </List>
                    </Box>
                  ),
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* نموذج فحص الحافلة */}
      <Dialog open={openBusCheck} onClose={() => setOpenBusCheck(false)} maxWidth="sm" fullWidth>
        <DialogTitle>فحص الحافلة اليومي</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            تحقق من جميع العناصر التالية:
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="أحزمة الأمان" secondary="تم فحصها بنجاح" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="مخارج الطوارئ" secondary="خالية وسهلة الوصول" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="طفاية الحريق" secondary="موجودة وصالحة" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="حالة الحافلة" secondary="جيدة جداً" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="الإطارات" secondary="في حالة جيدة" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="الأضواء" secondary="تعمل بشكل صحيح" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="success" />
              </ListItemIcon>
              <ListItemText primary="المكابح" secondary="الضغط طبيعي" />
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBusCheck(false)}>إلغاء</Button>
          <Button onClick={handleBusPreCheck} variant="contained" color="success">
            تأكيد الفحص
          </Button>
        </DialogActions>
      </Dialog>

      {/* نموذج تقرير الرحلة */}
      <Dialog open={openTripReport} onClose={handleCloseTripReport} maxWidth="sm" fullWidth>
        <DialogTitle>تقرير الرحلة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            select
            label="الوردية"
            value={tripReport.shift}
            onChange={e => setTripReport({ ...tripReport, shift: e.target.value })}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="morning">صباح</option>
            <option value="evening">مساء</option>
          </TextField>
          <TextField
            fullWidth
            type="number"
            label="عدد الطلاب المقلوعين"
            value={tripReport.studentsBoarded}
            onChange={e => setTripReport({ ...tripReport, studentsBoarded: parseInt(e.target.value) })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="استهلاك الوقود (لتر)"
            value={tripReport.fuelUsed}
            onChange={e => setTripReport({ ...tripReport, fuelUsed: parseFloat(e.target.value) })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="قراءة العداد الابتدائية"
            value={tripReport.mileageStart}
            onChange={e => setTripReport({ ...tripReport, mileageStart: parseInt(e.target.value) })}
            margin="normal"
          />
          <TextField
            fullWidth
            type="number"
            label="قراءة العداد النهائية"
            value={tripReport.mileageEnd}
            onChange={e => setTripReport({ ...tripReport, mileageEnd: parseInt(e.target.value) })}
            margin="normal"
          />
          <TextField fullWidth multiline rows={3} label="ملاحظات إضافية" margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTripReport}>إلغاء</Button>
          <Button onClick={handleSubmitTripReport} variant="contained" color="primary">
            إرسال التقرير
          </Button>
        </DialogActions>
      </Dialog>

      {/* قائمة الطلاب */}
      <Dialog open={openStudentList} onClose={() => setOpenStudentList(false)} maxWidth="sm" fullWidth>
        <DialogTitle>قائمة الطلاب</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {students.length === 0 ? (
            <Alert severity="info">لا توجد طلاب في هذا المسار</Alert>
          ) : (
            <List>
              {students.map((student, idx) => (
                <Box key={student._id}>
                  <ListItem
                    secondaryAction={
                      <Box>
                        <Button size="small" color="success" onClick={() => handleRecordAttendance(student._id, 'present')}>
                          موجود
                        </Button>
                        <Button size="small" color="error" onClick={() => handleRecordAttendance(student._id, 'absent')}>
                          غائب
                        </Button>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <Avatar>{student.firstName?.charAt(0)}</Avatar>
                    </ListItemIcon>
                    <ListItemText primary={`${student.firstName} ${student.lastName}`} secondary={student.studentId} />
                  </ListItem>
                  {idx < students.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStudentList(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DriverTransportPage;
