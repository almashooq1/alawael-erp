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
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
} from '@mui/material';
import { DirectionsBus, Timer, CreditCard, Warning, CheckCircle, StarRate } from '@mui/icons-material';
import api from '../services/api';

const ParentTransportPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [ratingDialog, setRatingDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regRes, busRes, drvRes, notifRes] = await Promise.all([
        api.get('/transport/student-registration'),
        api.get('/transport/buses'),
        api.get('/transport/drivers'),
        api.get('/transport/notifications'),
      ]);

      setRegistrations(regRes.data.data);
      setBuses(busRes.data.data);
      setDrivers(drvRes.data.data);
      setNotifications(notifRes.data.data);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async registration => {
    try {
      setSelectedRegistration(registration);

      const currentDate = new Date();
      const [attRes, payRes] = await Promise.all([
        api.get(`/transport/attendance/${registration._id}?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`),
        api.get(`/transport/payments/${registration._id}`),
      ]);

      setAttendance(attRes.data.data);
      setPayments(payRes.data.data);
      setDetailsDialog(true);
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const handleCloseDetails = () => {
    setDetailsDialog(false);
    setSelectedRegistration(null);
  };

  const handleOpenRatingDialog = () => {
    setRatingDialog(true);
  };

  const handleCloseRatingDialog = () => {
    setRatingDialog(false);
    setRating(5);
    setFeedback('');
  };

  const handleSubmitRating = async () => {
    try {
      // يمكن إضافة API للتقييمات
      alert('شكراً على تقييمك');
      handleCloseRatingDialog();
    } catch (error) {
      console.error('خطأ:', error);
    }
  };

  const getPaymentStatusLabel = status => {
    const labels = {
      paid: 'مدفوع',
      partial: 'دفع جزئي',
      unpaid: 'لم يتم الدفع',
      overdue: 'متأخر',
    };
    return labels[status] || status;
  };

  const getPaymentStatusColor = status => {
    const colors = {
      paid: 'success',
      partial: 'warning',
      unpaid: 'error',
      overdue: 'error',
    };
    return colors[status] || 'default';
  };

  const activeRegistrations = registrations.filter(r => r.status === 'active');
  const pendingPayments = registrations.filter(r => r.paymentStatus === 'unpaid' || r.paymentStatus === 'overdue');

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* العنوان والإحصائيات السريعة */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsBus color="primary" fontSize="large" />
          بوابة أولياء الأمور - النقل والمواصلات
        </Typography>

        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Typography color="inherit" gutterBottom>
                  التسجيلات النشطة
                </Typography>
                <Typography variant="h4">{activeRegistrations.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Typography color="inherit" gutterBottom>
                  الدفعات المتأخرة
                </Typography>
                <Typography variant="h4">{pendingPayments.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Typography color="inherit" gutterBottom>
                  الحافلات المتاحة
                </Typography>
                <Typography variant="h4">{buses.filter(b => b.status === 'active').length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Typography color="inherit" gutterBottom>
                  التنبيهات الجديدة
                </Typography>
                <Typography variant="h4">{notifications.filter(n => !n.isRead).length}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* التنبيهات الهامة */}
      {pendingPayments.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => {}}>
          ⚠️ لديك {pendingPayments.length} دفعة متأخرة. يرجى تسديتها في أقرب وقت
        </Alert>
      )}

      {/* التنبيهات */}
      {notifications.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardHeader title="آخر التنبيهات" />
          <CardContent>
            <List>
              {notifications.slice(0, 5).map((notif, idx) => (
                <Box key={notif._id}>
                  <ListItem sx={{ pl: 0 }}>
                    <ListItemIcon>
                      {notif.notificationType === 'bus_delay' && <Timer color="warning" />}
                      {notif.notificationType === 'bus_arrival' && <CheckCircle color="success" />}
                      {notif.notificationType === 'payment' && <CreditCard color="info" />}
                      {notif.notificationType === 'alert' && <Warning color="error" />}
                    </ListItemIcon>
                    <ListItemText
                      primary={notif.title}
                      secondary={notif.message}
                      sx={{
                        opacity: notif.isRead ? 0.6 : 1,
                        fontWeight: notif.isRead ? 'normal' : 'bold',
                      }}
                    />
                    <Typography variant="caption" color="textSecondary">
                      {new Date(notif.sendDate).toLocaleDateString('ar-SA')}
                    </Typography>
                  </ListItem>
                  {idx < 4 && <Divider />}
                </Box>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* التسجيلات */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="تسجيلات الطلاب" />
        <CardContent>
          {registrations.length === 0 ? (
            <Alert severity="info">لا توجد تسجيلات حالياً</Alert>
          ) : (
            <TableContainer>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>الطالب</TableCell>
                    <TableCell>المسار</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الدفع</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {registrations.map(reg => (
                    <TableRow key={reg._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32 }}>{reg.studentId?.firstName?.charAt(0)}</Avatar>
                          {reg.studentId?.firstName}
                        </Box>
                      </TableCell>
                      <TableCell>{reg.currentRoute?.routeName || '-'}</TableCell>
                      <TableCell>
                        <Chip
                          label={reg.status === 'active' ? 'نشط' : 'غير نشط'}
                          color={reg.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getPaymentStatusLabel(reg.paymentStatus)}
                          color={getPaymentStatusColor(reg.paymentStatus)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => handleViewDetails(reg)}>
                          تفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* معلومات السائقين */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            السائقون المتاحون
          </Typography>
        </Grid>
        {drivers
          .filter(d => d.status === 'active')
          .slice(0, 3)
          .map(driver => (
            <Grid item xs={12} sm={6} md={4} key={driver._id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <Avatar sx={{ width: 48, height: 48 }}>{driver.firstName?.charAt(0)}</Avatar>
                    <Box>
                      <Typography variant="subtitle2">
                        {driver.firstName} {driver.lastName}
                      </Typography>
                      <Rating value={driver.rating || 5} size="small" readOnly />
                    </Box>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Timer fontSize="small" />
                    <Typography variant="body2">{driver.phone}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <DirectionsBus fontSize="small" />
                    <Typography variant="body2">{driver.assignedBus?.busNumber || 'لا توجد حافلة مخصصة'}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      {/* نموذج التفاصيل */}
      <Dialog open={detailsDialog} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          تفاصيل التسجيل
          {selectedRegistration && (
            <Button sx={{ float: 'left' }} onClick={handleOpenRatingDialog} startIcon={<StarRate />}>
              تقييم الخدمة
            </Button>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRegistration && (
            <Box>
              <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)}>
                <Tab label="المعلومات الأساسية" />
                <Tab label="الحضور والغياب" />
                <Tab label="الدفعات" />
                <Tab label="جهات الاتصال" />
              </Tabs>

              {tabValue === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">رقم التسجيل</Typography>
                      <Typography>{selectedRegistration.registrationNumber}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">المسار</Typography>
                      <Typography>{selectedRegistration.currentRoute?.routeName}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">الوردية</Typography>
                      <Typography>{selectedRegistration.shift === 'morning' ? 'صباح' : 'مساء'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">الرسم الشهري</Typography>
                      <Typography>{selectedRegistration.monthlyFee} ريال</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">المبلغ المدفوع</Typography>
                      <Typography>{selectedRegistration.paidAmount} ريال</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">المبلغ المتبقي</Typography>
                      <Typography color={selectedRegistration.balanceDue > 0 ? 'error' : 'success'}>
                        {selectedRegistration.balanceDue} ريال
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {tabValue === 1 && (
                <Box sx={{ mt: 2 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>الحالة</TableCell>
                          <TableCell>الملاحظات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendance.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{new Date(record.date).toLocaleDateString('ar-SA')}</TableCell>
                            <TableCell>
                              <Chip label={record.status} size="small" color={record.status === 'present' ? 'success' : 'default'} />
                            </TableCell>
                            <TableCell>{record.remarks || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {attendance.length === 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      لا توجد سجلات حضور
                    </Alert>
                  )}
                </Box>
              )}

              {tabValue === 2 && (
                <Box sx={{ mt: 2 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell>التاريخ</TableCell>
                          <TableCell>المبلغ</TableCell>
                          <TableCell>الطريقة</TableCell>
                          <TableCell>الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString('ar-SA')}</TableCell>
                            <TableCell>{payment.amount} ريال</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>
                              <Chip label={payment.status} size="small" color={payment.status === 'completed' ? 'success' : 'default'} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {payments.length === 0 && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      لا توجد دفعات مسجلة
                    </Alert>
                  )}
                </Box>
              )}

              {tabValue === 3 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    جهات الاتصال:
                  </Typography>
                  <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle2">ولي الأمر</Typography>
                    <Typography variant="body2">{selectedRegistration.parentContact?.name}</Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Timer fontSize="small" />
                      {selectedRegistration.parentContact?.phone}
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle2">جهة الطوارئ</Typography>
                    <Typography variant="body2">{selectedRegistration.emergencyContact?.name}</Typography>
                    <Typography variant="body2">{selectedRegistration.emergencyContact?.relationship}</Typography>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Timer fontSize="small" />
                      {selectedRegistration.emergencyContact?.phone}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* نموذج التقييم */}
      <Dialog open={ratingDialog} onClose={handleCloseRatingDialog} maxWidth="sm" fullWidth>
        <DialogTitle>تقييم خدمة النقل</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Rating value={rating} onChange={(e, val) => setRating(val)} size="large" />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="ملاحظاتك وتوصياتك"
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            placeholder="أخبرنا برأيك في الخدمة..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRatingDialog}>إلغاء</Button>
          <Button onClick={handleSubmitRating} variant="contained" color="primary">
            إرسال التقييم
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ParentTransportPage;
