// Beneficiary Detail Page - BeneficiaryDetail.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Edit,
  Delete,
  Print,
  MoreVert,
  Email,
  Phone,
  LocationOn,
  Person,
  Info,
  History
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import api from '../../utils/api';

const BeneficiaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [beneficiary, setBeneficiary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const beneficiaryRes = await api.get(`/beneficiaries/${id}`);
        setBeneficiary(beneficiaryRes.data.data);

        const sessionsRes = await api.get(`/sessions?beneficiary_id=${id}&per_page=5`);
        setSessions(sessionsRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/beneficiaries/${id}`);
      navigate('/beneficiaries');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
    }
    setOpenDelete(false);
  };

  const handleMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!beneficiary) {
    return (
      <Alert severity="error">
        لم يتم العثور على المستفيد
      </Alert>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {beneficiary.first_name} {beneficiary.last_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            رقم المستفيد: {beneficiary.id}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/beneficiaries/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            تعديل
          </Button>
          <IconButton
            onClick={handleMenuOpen}
          >
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => window.print()}>
              <Print fontSize="small" sx={{ mr: 1 }} />
              طباعة
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => setOpenDelete(true)}
              sx={{ color: 'error.main' }}
            >
              <Delete fontSize="small" sx={{ mr: 1 }} />
              حذف
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ mr: 1 }} />
                معلومات شخصية
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="تاريخ الميلاد"
                    secondary={new Date(beneficiary.date_of_birth).toLocaleDateString('ar-EG')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الجنس"
                    secondary={beneficiary.gender === 'M' ? 'ذكر' : 'أنثى'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="رقم الهوية"
                    secondary={beneficiary.national_id}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Contact Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Info sx={{ mr: 1 }} />
                معلومات التواصل
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText
                    primary={<Phone fontSize="small" />}
                    secondary={beneficiary.phone || 'غير متوفر'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={<Email fontSize="small" />}
                    secondary={beneficiary.email || 'غير متوفر'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={<LocationOn fontSize="small" />}
                    secondary={`${beneficiary.address}, ${beneficiary.city}`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Disability Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات الإعاقة
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="نوع الإعاقة"
                    secondary={beneficiary.disability_type}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="فئة الإعاقة"
                    secondary={beneficiary.disability_category}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="درجة الشدة"
                    secondary={
                      <Chip
                        label={beneficiary.disability_severity}
                        size="small"
                        color={
                          beneficiary.disability_severity === 'شديدة'
                            ? 'error'
                            : beneficiary.disability_severity === 'متوسطة'
                            ? 'warning'
                            : 'success'
                        }
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="التشخيص الطبي"
                    secondary={beneficiary.medical_diagnosis}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Guardian Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات الوصي
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="اسم الوصي"
                    secondary={beneficiary.guardian_name}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="علاقة القرابة"
                    secondary={beneficiary.guardian_relationship}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الهاتف"
                    secondary={beneficiary.guardian_phone}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="البريد الإلكتروني"
                    secondary={beneficiary.guardian_email}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Sessions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <History sx={{ mr: 1 }} />
                أحدث الجلسات
              </Typography>
              <Divider sx={{ my: 2 }} />
              {sessions.length > 0 ? (
                <List>
                  {sessions.map((session) => (
                    <ListItem key={session.id}>
                      <ListItemText
                        primary={session.session_type}
                        secondary={new Date(session.session_date).toLocaleDateString('ar-EG')}
                      />
                      <Chip
                        label={session.status}
                        size="small"
                        color={
                          session.status === 'completed'
                            ? 'success'
                            : session.status === 'scheduled'
                            ? 'info'
                            : 'error'
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  لا توجد جلسات مسجلة
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف هذا المستفيد؟ لا يمكن التراجع عن هذه العملية.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>إلغاء</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BeneficiaryDetail;
