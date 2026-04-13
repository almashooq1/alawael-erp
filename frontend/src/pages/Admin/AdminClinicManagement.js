import { useState, useEffect } from 'react';
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
import { adminService } from 'services/adminService';
import api from 'services/api.client';
import logger from 'utils/logger';
import { gradients, brandColors, neutralColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import ConfirmDialog, { useConfirmDialog } from 'components/common/ConfirmDialog';
import { useSnackbar } from '../../contexts/SnackbarContext';

const AdminClinicManagement = () => {
  const showSnackbar = useSnackbar();
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [clinics, setClinics] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingClinic, setEditingClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, showConfirm] = useConfirmDialog();

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const data = await adminService.getAdminClinics(userId);
        setClinics(data);
      } catch (err) {
        logger.error('Failed to load clinics:', err);
        setError(err.message || 'حدث خطأ في تحميل العيادات');
        showSnackbar('حدث خطأ في تحميل العيادات', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchClinics();
  }, [userId, showSnackbar]);

  const handleOpenDialog = (clinic = null) => {
    setEditingClinic(clinic);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingClinic(null);
  };

  const handleSaveClinic = async () => {
    try {
      if (editingClinic?._id || editingClinic?.id) {
        await api.put(`/branches/${editingClinic._id || editingClinic.id}`, editingClinic);
      } else {
        await api.post('/branches', editingClinic);
      }
      // Reload clinics
      const data = await adminService.getAdminClinics(userId);
      setClinics(data);
      showSnackbar('تم حفظ العيادة بنجاح', 'success');
      handleCloseDialog();
    } catch (err) {
      logger.error('Failed to save clinic:', err);
      showSnackbar('فشل حفظ العيادة', 'error');
      handleCloseDialog();
    }
  };

  const handleDeleteClinic = clinicId => {
    showConfirm({
      title: 'حذف العيادة',
      message: 'هل تريد حذف هذه العيادة؟',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await api.delete(`/branches/${clinicId}`);
          setClinics(clinics.filter(c => (c._id || c.id) !== clinicId));
          showSnackbar('تم حذف العيادة بنجاح', 'success');
        } catch (err) {
          logger.error('Failed to delete clinic:', err);
          showSnackbar('فشل حذف العيادة', 'error');
        }
      },
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

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
          boxShadow: '0 8px 32px rgba(102,126,234,0.25)',
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
              background: gradients.primary,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(102,126,234,0.2)',
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
              background: gradients.warning,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(237,137,54,0.2)',
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
              background: gradients.info,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(49,130,206,0.2)',
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
              background: gradients.success,
              color: 'white',
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(56,161,105,0.2)',
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
            <Card
              sx={{
                height: '100%',
                borderRadius: '16px',
                border: '1px solid rgba(0,0,0,0.04)',
                boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                transition: 'all 0.3s',
                '&:hover': {
                  boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardHeader
                title={clinic.name}
                subheader={clinic.code}
                action={
                  <Box>
                    <Tooltip title="تعديل">
                      <IconButton
                        aria-label="تعديل"
                        size="small"
                        onClick={() => handleOpenDialog(clinic)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        aria-label="حذف"
                        size="small"
                        onClick={() => handleDeleteClinic(clinic.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              />
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={clinic.status}
                    color={clinic.status === 'نشطة' ? 'success' : 'default'}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationOnIcon sx={{ color: brandColors.primaryStart, fontSize: 18 }} />
                  <Typography variant="body2">{clinic.address}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PhoneIcon sx={{ color: brandColors.primaryStart, fontSize: 18 }} />
                  <Typography variant="body2">{clinic.phone}</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmailIcon sx={{ color: brandColors.primaryStart, fontSize: 18 }} />
                  <Typography variant="body2">{clinic.email}</Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    mt: 3,
                    pt: 2,
                    borderTop: `1px solid ${surfaceColors.borderSubtle}`,
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {clinic.staffCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      موظفون
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {clinic.roomCount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      غرف
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {clinic.capacity}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      السعة
                    </Typography>
                  </Box>
                </Box>

                <Typography
                  variant="caption"
                  sx={{ color: neutralColors.textMuted, display: 'block', mt: 2 }}
                >
                  آخر تحديث: {clinic.lastUpdate}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Clinics Table View */}
      <Card
        sx={{
          borderRadius: '20px',
          border: '1px solid rgba(0,0,0,0.04)',
          boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
        }}
      >
        <CardHeader title="قائمة العيادات الكاملة" />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.02)' }}>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  اسم العيادة
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  المدينة
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  الهاتف
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  الموظفون
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  الحالة
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '12px',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                    textAlign: 'center',
                  }}
                >
                  الإجراءات
                </TableCell>
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
                    <Chip
                      label={clinic.status}
                      color={clinic.status === 'نشطة' ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="تعديل">
                      <IconButton
                        aria-label="تعديل"
                        size="small"
                        onClick={() => handleOpenDialog(clinic)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        aria-label="حذف"
                        size="small"
                        onClick={() => handleDeleteClinic(clinic.id)}
                      >
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
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px' } }}
      >
        <DialogTitle>{editingClinic ? 'تعديل العيادة' : 'إضافة عيادة جديدة'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="اسم العيادة"
              defaultValue={editingClinic?.name || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="الكود"
              defaultValue={editingClinic?.code || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="العنوان"
              defaultValue={editingClinic?.address || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="المدينة"
              defaultValue={editingClinic?.city || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="الهاتف"
              defaultValue={editingClinic?.phone || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              type="email"
              defaultValue={editingClinic?.email || ''}
              size="small"
            />
            <TextField
              fullWidth
              type="number"
              label="عدد الموظفين"
              defaultValue={editingClinic?.staffCount || 0}
              size="small"
            />
            <TextField
              fullWidth
              type="number"
              label="عدد الغرف"
              defaultValue={editingClinic?.roomCount || 0}
              size="small"
            />
            <TextField
              fullWidth
              type="number"
              label="السعة الكلية"
              defaultValue={editingClinic?.capacity || 0}
              size="small"
            />
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
      <ConfirmDialog {...confirmState} />
    </Container>
  );
};

export default AdminClinicManagement;
