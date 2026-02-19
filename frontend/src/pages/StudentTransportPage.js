import React, { useState, useEffect } from 'react';
import {
  Box,
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
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import { DirectionsBus, LocationOn } from '@mui/icons-material';
import api from '../utils/api';

const StudentTransportPage = () => {
  const [registrations, setRegistrations] = useState([]);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [payments, setPayments] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pickupPoint: '',
    dropoffPoint: '',
    shift: 'morning',
    parentContact: {
      name: '',
      phone: '',
      email: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: '',
    },
    medicalInformation: {
      allergies: '',
      medicines: '',
      specialNeeds: '',
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regRes] = await Promise.all([
        api.get('/transport/student-registration'),
        api.get('/transport/routes'),
        api.get('/transport/buses'),
      ]);

      setRegistrations(regRes.data.data);
    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      pickupPoint: '',
      dropoffPoint: '',
      shift: 'morning',
      parentContact: { name: '', phone: '', email: '' },
      emergencyContact: { name: '', phone: '', relationship: '' },
      medicalInformation: { allergies: '', medicines: '', specialNeeds: '' },
    });
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNestedInputChange = (e, parent) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [name]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await api.post('/transport/student-registration', formData);
      if (response.data.success) {
        fetchData();
        handleCloseDialog();
        alert('تم إرسال طلب التسجيل بنجاح');
      }
    } catch (error) {
      console.error('خطأ في الإرسال:', error);
      alert('حدث خطأ في إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async registration => {
    try {
      setSelectedRegistration(registration);

      // جلب سجل الحضور
      const currentDate = new Date();
      const attendanceRes = await api.get(
        `/transport/attendance/${registration._id}?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
      );
      setAttendance(attendanceRes.data.data);

      // جلب سجل الدفعات
      const paymentsRes = await api.get(`/transport/payments/${registration._id}`);
      setPayments(paymentsRes.data.data);

      setOpenDetailsDialog(true);
    } catch (error) {
      console.error('خطأ في جلب التفاصيل:', error);
    }
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setSelectedRegistration(null);
  };

  const getStatusColor = status => {
    const colors = {
      active: 'success',
      inactive: 'default',
      waiting_approval: 'warning',
      suspended: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = status => {
    const labels = {
      active: 'نشط',
      inactive: 'غير نشط',
      waiting_approval: 'في انتظار الموافقة',
      suspended: 'موقوف',
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

  const getAttendanceStatusColor = status => {
    const colors = {
      present: 'success',
      absent: 'error',
      late: 'warning',
      excuse: 'info',
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DirectionsBus color="primary" fontSize="large" />
          نظام النقل والمواصلات
        </Typography>
        <Button variant="contained" color="primary" onClick={handleOpenDialog} sx={{ mb: 2 }}>
          تسجيل جديد في النقل
        </Button>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* قسم التسجيلات */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Card>
            <CardHeader title="التسجيلات الحالية" />
            <CardContent>
              {registrations.length === 0 ? (
                <Alert severity="info">لا توجد تسجيلات حالياً</Alert>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell>الحالة</TableCell>
                        <TableCell>المسار</TableCell>
                        <TableCell>الوردية</TableCell>
                        <TableCell>الرسم الشهري</TableCell>
                        <TableCell>حالة الدفع</TableCell>
                        <TableCell>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {registrations.map(reg => (
                        <TableRow key={reg._id}>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(reg.status)}
                              color={getStatusColor(reg.status)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{reg.currentRoute?.routeName || '-'}</TableCell>
                          <TableCell>
                            {reg.shift === 'morning'
                              ? 'صباح'
                              : reg.shift === 'evening'
                                ? 'مساء'
                                : 'كلا الوردين'}
                          </TableCell>
                          <TableCell>{reg.monthlyFee} ريال</TableCell>
                          <TableCell>
                            <Chip
                              label={reg.paymentStatus}
                              color={getPaymentStatusColor(reg.paymentStatus)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleViewDetails(reg)}
                            >
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
        </Grid>
      </Grid>

      {/* نموذج التسجيل */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل جديد في النقل</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="نقطة الاستقلال"
            name="pickupPoint"
            value={formData.pickupPoint}
            onChange={handleInputChange}
            margin="normal"
            InputProps={{
              startAdornment: <LocationOn sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
          <TextField
            fullWidth
            label="نقطة الإنزال"
            name="dropoffPoint"
            value={formData.dropoffPoint}
            onChange={handleInputChange}
            margin="normal"
            InputProps={{
              startAdornment: <LocationOn sx={{ mr: 1, color: 'action.active' }} />,
            }}
          />
          <TextField
            fullWidth
            select
            label="الوردية"
            name="shift"
            value={formData.shift}
            onChange={handleInputChange}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="morning">صباح</option>
            <option value="evening">مساء</option>
            <option value="both">كلا الوردين</option>
          </TextField>

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">بيانات ولي الأمر</Typography>
          <TextField
            fullWidth
            label="الاسم"
            name="name"
            value={formData.parentContact.name}
            onChange={e => handleNestedInputChange(e, 'parentContact')}
            margin="normal"
          />
          <TextField
            fullWidth
            label="الهاتف"
            name="phone"
            value={formData.parentContact.phone}
            onChange={e => handleNestedInputChange(e, 'parentContact')}
            margin="normal"
          />
          <TextField
            fullWidth
            label="البريد الإلكتروني"
            name="email"
            type="email"
            value={formData.parentContact.email}
            onChange={e => handleNestedInputChange(e, 'parentContact')}
            margin="normal"
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">جهة الاتصال في الطوارئ</Typography>
          <TextField
            fullWidth
            label="الاسم"
            name="name"
            value={formData.emergencyContact.name}
            onChange={e => handleNestedInputChange(e, 'emergencyContact')}
            margin="normal"
          />
          <TextField
            fullWidth
            label="الهاتف"
            name="phone"
            value={formData.emergencyContact.phone}
            onChange={e => handleNestedInputChange(e, 'emergencyContact')}
            margin="normal"
          />
          <TextField
            fullWidth
            label="الصلة"
            name="relationship"
            value={formData.emergencyContact.relationship}
            onChange={e => handleNestedInputChange(e, 'emergencyContact')}
            margin="normal"
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2">معلومات طبية</Typography>
          <TextField
            fullWidth
            label="الحساسيات"
            name="allergies"
            value={formData.medicalInformation.allergies}
            onChange={e => handleNestedInputChange(e, 'medicalInformation')}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            label="الأدوية"
            name="medicines"
            value={formData.medicalInformation.medicines}
            onChange={e => handleNestedInputChange(e, 'medicalInformation')}
            margin="normal"
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
            إرسال الطلب
          </Button>
        </DialogActions>
      </Dialog>

      {/* نموذج التفاصيل */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل التسجيل</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRegistration && (
            <Box>
              <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                <Tab label="المعلومات الأساسية" />
                <Tab label="الحضور والغياب" />
                <Tab label="الدفعات" />
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
                      <Typography variant="subtitle2">الرسم الشهري</Typography>
                      <Typography>{selectedRegistration.monthlyFee} ريال</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">المبلغ المتبقي</Typography>
                      <Typography color={selectedRegistration.balanceDue > 0 ? 'error' : 'success'}>
                        {selectedRegistration.balanceDue} ريال
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">نقطة الاستقلال</Typography>
                      <Typography>{selectedRegistration.pickupPoint?.address}</Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2">نقطة الإنزال</Typography>
                      <Typography>{selectedRegistration.dropoffPoint?.address}</Typography>
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
                          <TableCell>ملاحظات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendance.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {new Date(record.date).toLocaleDateString('ar-SA')}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={record.status}
                                color={getAttendanceStatusColor(record.status)}
                                size="small"
                              />
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
                          <TableCell>طريقة الدفع</TableCell>
                          <TableCell>الحالة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {new Date(payment.paymentDate).toLocaleDateString('ar-SA')}
                            </TableCell>
                            <TableCell>{payment.amount} ريال</TableCell>
                            <TableCell>{payment.paymentMethod}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                color={getPaymentStatusColor(payment.status)}
                                size="small"
                              />
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentTransportPage;
