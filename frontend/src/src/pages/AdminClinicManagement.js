import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';

const AdminClinicManagement = () => {
  const [clinics, setClinics] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchClinics = async () => {
      const data = await adminService.getAdminClinics('admin001');
      setClinics(data);
      setLoading(false);
    };
    fetchClinics();
  }, []);

  const handleOpenDialog = (clinic = null) => {
    setEditingClinic(clinic);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClinic(null);
  };

  const handleSaveClinic = () => {
    handleCloseDialog();
  };

  const handleDeleteClinic = clinicId => {
    if (window.confirm('هل تريد حذف هذه العيادة؟')) {
      setClinics(clinics.filter(c => c.id !== clinicId));
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                إدارة العيادات
              </Typography>
              <Typography variant="body2">إدارة فروع وعيادات النظام</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            إضافة عيادة
          </Button>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي العيادات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {clinics.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                العيادات النشطة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {clinics.filter(c => c.status === 'نشطة').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي الموظفين
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {clinics.reduce((sum, c) => sum + c.staffCount, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                غرف العلاج
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {clinics.reduce((sum, c) => sum + c.roomCount, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Clinics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {clinics.map(clinic => (
          <Grid item xs={12} md={6} key={clinic.id}>
            <Card sx={{ height: '100%' }}>
              <CardHeader
                title={clinic.name}
                subheader={clinic.code}
                action={
                  <Box>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => handleOpenDialog(clinic)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" onClick={() => handleDeleteClinic(clinic.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Chip label={clinic.status} color={clinic.status === 'نشطة' ? 'success' : 'default'} size="small" sx={{ mb: 2 }} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationOnIcon sx={{ color: '#667eea', fontSize: 18 }} />
                  <Typography variant="body2">{clinic.address}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhoneIcon sx={{ color: '#667eea', fontSize: 18 }} />
                  <Typography variant="body2">{clinic.phone}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmailIcon sx={{ color: '#667eea', fontSize: 18 }} />
                  <Typography variant="body2">{clinic.email}</Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 3, pt: 2, borderTop: '1px solid #eee' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {clinic.staffCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      موظفون
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {clinic.roomCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      غرف
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {clinic.capacity}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      السعة
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 2 }}>
                  آخر تحديث: {clinic.lastUpdate}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Clinics Table View */}
      <Card>
        <CardHeader title="قائمة العيادات الكاملة" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>اسم العيادة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المدينة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الهاتف</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الموظفون</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clinics.map(clinic => (
                <TableRow key={clinic.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{clinic.name}</TableCell>
                  <TableCell>{clinic.city}</TableCell>
                  <TableCell>{clinic.phone}</TableCell>
                  <TableCell>{clinic.staffCount}</TableCell>
                  <TableCell>
                    <Chip label={clinic.status} color={clinic.status === 'نشطة' ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="تعديل">
                      <IconButton size="small" onClick={() => handleOpenDialog(clinic)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small" onClick={() => handleDeleteClinic(clinic.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Add/Edit Clinic Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingClinic ? 'تعديل العيادة' : 'إضافة عيادة جديدة'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField fullWidth label="اسم العيادة" defaultValue={editingClinic?.name || ''} size="small" />
            <TextField fullWidth label="الكود" defaultValue={editingClinic?.code || ''} size="small" />
            <TextField fullWidth label="العنوان" defaultValue={editingClinic?.address || ''} size="small" />
            <TextField fullWidth label="المدينة" defaultValue={editingClinic?.city || ''} size="small" />
            <TextField fullWidth label="الهاتف" defaultValue={editingClinic?.phone || ''} size="small" />
            <TextField fullWidth label="البريد الإلكتروني" type="email" defaultValue={editingClinic?.email || ''} size="small" />
            <TextField fullWidth type="number" label="عدد الموظفين" defaultValue={editingClinic?.staffCount || 0} size="small" />
            <TextField fullWidth type="number" label="عدد الغرف" defaultValue={editingClinic?.roomCount || 0} size="small" />
            <TextField fullWidth type="number" label="السعة الكلية" defaultValue={editingClinic?.capacity || 0} size="small" />
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select label="الحالة" defaultValue={editingClinic?.status || 'نشطة'}>
                <MenuItem value="نشطة">نشطة</MenuItem>
                <MenuItem value="معطلة">معطلة</MenuItem>
                <MenuItem value="مغلقة">مغلقة</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveClinic}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminClinicManagement;
