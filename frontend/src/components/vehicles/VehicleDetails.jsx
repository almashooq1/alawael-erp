import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  LinearProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  MyLocation as GpsIcon,
  LocalGasStation as FuelIcon,
  Speed as SpeedIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const VehicleDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vehicle, setVehicle] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVehicleDetails();
    fetchVehicleStatistics();
  }, [id]);

  const fetchVehicleDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setVehicle(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل تفاصيل المركبة');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/vehicles/${id}/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStatistics(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المركبة؟')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/vehicles');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في حذف المركبة');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'out-of-service': return 'error';
      case 'in-trip': return 'info';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'maintenance': return 'صيانة';
      case 'out-of-service': return 'خارج الخدمة';
      case 'in-trip': return 'في رحلة';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const isExpiringSoon = (dateString) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  const isExpired = (dateString) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!vehicle) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">لم يتم العثور على المركبة</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/vehicles')}
            sx={{ mb: 1 }}
          >
            العودة للقائمة
          </Button>
          <Typography variant="h4" component="h1">
            🚗 تفاصيل المركبة
          </Typography>
          <Typography variant="h5" color="primary" mt={1}>
            {vehicle.plateNumber}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/vehicles/${id}/edit`)}
          >
            تعديل
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            حذف
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Main Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                المعلومات الأساسية
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="الحالة"
                    secondary={
                      <Chip
                        label={getStatusLabel(vehicle.status)}
                        color={getStatusColor(vehicle.status)}
                        size="small"
                      />
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="النوع"
                    secondary={vehicle.type === 'bus' ? 'حافلة' : vehicle.type === 'truck' ? 'شاحنة' : 'سيارة'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الصنع والموديل"
                    secondary={`${vehicle.make} ${vehicle.model}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText primary="سنة الصنع" secondary={vehicle.year} />
                </ListItem>
                <ListItem>
                  <ListItemText primary="السعة" secondary={`${vehicle.capacity} راكب`} />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Fuel & Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                الوقود والأداء
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" display="flex" alignItems="center" gap={1}>
                    <FuelIcon /> مستوى الوقود
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {vehicle.fuelLevel}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={vehicle.fuelLevel}
                  color={vehicle.fuelLevel < 20 ? 'error' : vehicle.fuelLevel < 50 ? 'warning' : 'success'}
                  sx={{ height: 10, borderRadius: 1 }}
                />
              </Box>

              <List>
                <ListItem>
                  <ListItemText
                    primary="نوع الوقود"
                    secondary={
                      vehicle.fuelType === 'gasoline' ? 'بنزين' :
                      vehicle.fuelType === 'diesel' ? 'ديزل' :
                      vehicle.fuelType === 'electric' ? 'كهرباء' : 'هجين'
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="سعة الخزان"
                    secondary={`${vehicle.fuelCapacity} لتر`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={<Box display="flex" alignItems="center" gap={1}><SpeedIcon /> عداد الكيلومترات</Box>}
                    secondary={`${vehicle.mileage.toLocaleString()} كم`}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Documents & Expiry */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                الوثائق والانتهاءات
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarIcon />
                        انتهاء التأمين
                        {isExpired(vehicle.insuranceExpiry) && (
                          <WarningIcon color="error" fontSize="small" />
                        )}
                        {isExpiringSoon(vehicle.insuranceExpiry) && !isExpired(vehicle.insuranceExpiry) && (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                      </Box>
                    }
                    secondary={formatDate(vehicle.insuranceExpiry)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <CalendarIcon />
                        انتهاء الترخيص
                        {isExpired(vehicle.registrationExpiry) && (
                          <WarningIcon color="error" fontSize="small" />
                        )}
                        {isExpiringSoon(vehicle.registrationExpiry) && !isExpired(vehicle.registrationExpiry) && (
                          <WarningIcon color="warning" fontSize="small" />
                        )}
                      </Box>
                    }
                    secondary={formatDate(vehicle.registrationExpiry)}
                  />
                </ListItem>
              </List>

              {(isExpired(vehicle.insuranceExpiry) || isExpired(vehicle.registrationExpiry)) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  ⚠️ يوجد وثائق منتهية الصلاحية!
                </Alert>
              )}

              {(isExpiringSoon(vehicle.insuranceExpiry) || isExpiringSoon(vehicle.registrationExpiry)) && 
               !isExpired(vehicle.insuranceExpiry) && !isExpired(vehicle.registrationExpiry) && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  ⏰ يوجد وثائق ستنتهي خلال 30 يوم!
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* GPS Location */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <GpsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                الموقع الحالي
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              {vehicle.currentLocation ? (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="خط الطول"
                      secondary={vehicle.currentLocation.coordinates[0].toFixed(6)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="خط العرض"
                      secondary={vehicle.currentLocation.coordinates[1].toFixed(6)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="آخر تحديث"
                      secondary={formatDate(vehicle.lastGPSUpdate)}
                    />
                  </ListItem>
                  <ListItem>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<GpsIcon />}
                      onClick={() => navigate(`/vehicles/${id}/tracking`)}
                    >
                      عرض على الخريطة
                    </Button>
                  </ListItem>
                </List>
              ) : (
                <Alert severity="info">
                  لا توجد إحداثيات GPS متاحة حالياً
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics */}
        {statistics && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 الإحصائيات
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          إجمالي الرحلات
                        </Typography>
                        <Typography variant="h5">
                          {statistics.performance?.totalTrips || 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          متوسط استهلاك الوقود
                        </Typography>
                        <Typography variant="h5">
                          {statistics.fuel?.averageConsumption?.toFixed(1) || 'N/A'} ل/100كم
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          نقاط السلامة
                        </Typography>
                        <Typography variant="h5" color={
                          (statistics.safety?.score || 0) >= 80 ? 'success.main' :
                          (statistics.safety?.score || 0) >= 60 ? 'warning.main' : 'error.main'
                        }>
                          {statistics.safety?.score || 0}/100
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography color="textSecondary" variant="body2">
                          أيام الصيانة التالية
                        </Typography>
                        <Typography variant="h5">
                          {statistics.maintenance?.daysUntilNext || 'N/A'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Notes */}
        {vehicle.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📝 ملاحظات
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {vehicle.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default VehicleDetails;
