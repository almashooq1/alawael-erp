import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { fetchBeneficiaryById, updateBeneficiary } from '../store/slices/beneficiariesSlice';

function BeneficiaryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { currentBeneficiary, loading, error } = useSelector(state => state.beneficiaries);
  
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openMedicalDialog, setOpenMedicalDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [medicalRecordData, setMedicalRecordData] = useState({
    doctorId: '',
    diagnosis: '',
    treatment: '',
    notes: ''
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchBeneficiaryById(id));
    }
  }, [id, dispatch]);

  useEffect(() => {
    if (currentBeneficiary) {
      setEditFormData({
        firstName: currentBeneficiary.firstName || '',
        lastName: currentBeneficiary.lastName || '',
        email: currentBeneficiary.email || '',
        phone: currentBeneficiary.phone || '',
        address: currentBeneficiary.address || '',
        insuranceProvider: currentBeneficiary.insuranceProvider || ''
      });
    }
  }, [currentBeneficiary]);

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicalInputChange = (e) => {
    const { name, value } = e.target;
    setMedicalRecordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveEdit = async () => {
    try {
      await dispatch(updateBeneficiary({ id, data: editFormData }));
      setOpenEditDialog(false);
    } catch (err) {
      console.error('Error updating beneficiary:', err);
    }
  };

  const handleAddMedicalRecord = async () => {
    try {
      // This would call an API endpoint to add medical record
      // await dispatch(addMedicalRecord({ beneficiaryId: id, data: medicalRecordData }));
      setOpenMedicalDialog(false);
      setMedicalRecordData({
        doctorId: '',
        diagnosis: '',
        treatment: '',
        notes: ''
      });
    } catch (err) {
      console.error('Error adding medical record:', err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button onClick={() => navigate('/beneficiaries')} sx={{ mt: 2 }}>
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  if (!currentBeneficiary) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">المستفيد غير موجود</Alert>
        <Button onClick={() => navigate('/beneficiaries')} sx={{ mt: 2 }}>
          العودة للقائمة
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Tooltip title="العودة">
          <IconButton onClick={() => navigate('/beneficiaries')}>
            <BackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="h4">تفاصيل المستفيد</Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Basic Info Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="المعلومات الأساسية"
              action={
                <Tooltip title="تعديل">
                  <IconButton
                    size="small"
                    onClick={() => setOpenEditDialog(true)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" gutterBottom>
                    الاسم الأول
                  </Typography>
                  <Typography variant="body1">
                    {currentBeneficiary.firstName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" gutterBottom>
                    الاسم الأخير
                  </Typography>
                  <Typography variant="body1">
                    {currentBeneficiary.lastName}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" gutterBottom>
                    رقم الملف
                  </Typography>
                  <Typography variant="body1">
                    <Chip
                      label={currentBeneficiary.fileNumber}
                      color="primary"
                      variant="outlined"
                    />
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" gutterBottom>
                    البريد الإلكتروني
                  </Typography>
                  <Typography variant="body1">
                    {currentBeneficiary.email}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" gutterBottom>
                    الهاتف
                  </Typography>
                  <Typography variant="body1">
                    {currentBeneficiary.phone}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography color="textSecondary" gutterBottom>
                    جهة التأمين
                  </Typography>
                  <Typography variant="body1">
                    <Chip label={currentBeneficiary.insuranceProvider} />
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography color="textSecondary" gutterBottom>
                    العنوان
                  </Typography>
                  <Typography variant="body1">
                    {currentBeneficiary.address}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Stats Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="الإحصائيات" />
            <Divider />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    تاريخ الإضافة
                  </Typography>
                  <Typography variant="body2">
                    {new Date(currentBeneficiary.createdAt).toLocaleDateString('ar-SA')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    آخر تحديث
                  </Typography>
                  <Typography variant="body2">
                    {new Date(currentBeneficiary.updatedAt).toLocaleDateString('ar-SA')}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    عدد السجلات الطبية
                  </Typography>
                  <Typography variant="h6">
                    {currentBeneficiary.medicalRecords?.length || 0}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography color="textSecondary" gutterBottom>
                    الحالة
                  </Typography>
                  <Chip
                    label="نشط"
                    color="success"
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Medical Records */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="السجلات الطبية"
              action={
                <Tooltip title="إضافة سجل طبي">
                  <IconButton
                    size="small"
                    onClick={() => setOpenMedicalDialog(true)}
                  >
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              }
            />
            <Divider />
            <CardContent>
              {currentBeneficiary.medicalRecords && currentBeneficiary.medicalRecords.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                      <TableRow>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>التشخيص</TableCell>
                        <TableCell>العلاج</TableCell>
                        <TableCell>ملاحظات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentBeneficiary.medicalRecords.map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {new Date(record.createdAt).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>{record.diagnosis}</TableCell>
                          <TableCell>{record.treatment}</TableCell>
                          <TableCell>{record.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="textSecondary" align="center">
                  لا توجد سجلات طبية
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog
        open={openEditDialog}
        onClose={() => setOpenEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل بيانات المستفيد</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="الاسم الأول"
              name="firstName"
              value={editFormData.firstName}
              onChange={handleEditInputChange}
            />
            <TextField
              fullWidth
              label="الاسم الأخير"
              name="lastName"
              value={editFormData.lastName}
              onChange={handleEditInputChange}
            />
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={editFormData.email}
              onChange={handleEditInputChange}
            />
            <TextField
              fullWidth
              label="الهاتف"
              name="phone"
              value={editFormData.phone}
              onChange={handleEditInputChange}
            />
            <TextField
              fullWidth
              label="العنوان"
              name="address"
              value={editFormData.address}
              onChange={handleEditInputChange}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            حفظ التغييرات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Medical Record Dialog */}
      <Dialog
        open={openMedicalDialog}
        onClose={() => setOpenMedicalDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إضافة سجل طبي جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="معرف الطبيب"
              name="doctorId"
              value={medicalRecordData.doctorId}
              onChange={handleMedicalInputChange}
            />
            <TextField
              fullWidth
              label="التشخيص"
              name="diagnosis"
              value={medicalRecordData.diagnosis}
              onChange={handleMedicalInputChange}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="العلاج"
              name="treatment"
              value={medicalRecordData.treatment}
              onChange={handleMedicalInputChange}
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="ملاحظات"
              name="notes"
              value={medicalRecordData.notes}
              onChange={handleMedicalInputChange}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMedicalDialog(false)}>إلغاء</Button>
          <Button onClick={handleAddMedicalRecord} variant="contained" color="primary">
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BeneficiaryDetailPage;
