import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  Alert,
  CircularProgress,
  Divider,
  Box,
  LinearProgress
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  DirectionsBus,
  Person,
  Route as RouteIcon,
  Schedule,
  Speed,
  People,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import axios from 'axios';

const TripDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routePolylineRef = useRef(null);

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTrip();
  }, [id]);

  useEffect(() => {
    if (trip && trip.route && mapRef.current && !mapInstanceRef.current) {
      initializeMap();
    }
  }, [trip]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trips/${id}`,
        config
      );

      setTrip(response.data);
    } catch (err) {
      setError('فشل تحميل بيانات الرحلة');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!window.google || !trip.route) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: {
        lat: trip.route.stops[0]?.latitude || 24.7136,
        lng: trip.route.stops[0]?.longitude || 46.6753
      },
      zoom: 12
    });

    mapInstanceRef.current = map;

    // Draw route polyline if stops exist
    if (trip.route.stops && trip.route.stops.length > 1) {
      const path = trip.route.stops.map(stop => ({
        lat: stop.latitude,
        lng: stop.longitude
      }));

      routePolylineRef.current = new window.google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#2196F3',
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: map
      });

      // Add markers for each stop
      trip.route.stops.forEach((stop, index) => {
        new window.google.maps.Marker({
          position: { lat: stop.latitude, lng: stop.longitude },
          map: map,
          label: `${index + 1}`,
          title: stop.name
        });
      });
    }
  };

  const handleEdit = () => {
    navigate(`/trips/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الرحلة؟')) return;

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trips/${id}`,
        config
      );

      navigate('/trips');
    } catch (err) {
      setError('فشل حذف الرحلة');
    }
  };

  const handleBack = () => {
    navigate('/trips');
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'info',
      'in-progress': 'warning',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      scheduled: 'مجدولة',
      'in-progress': 'قيد التنفيذ',
      completed: 'مكتملة',
      cancelled: 'ملغاة'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'غير محدد';
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = () => {
    if (!trip.actualStartTime || !trip.actualEndTime) return null;
    
    const start = new Date(trip.actualStartTime);
    const end = new Date(trip.actualEndTime);
    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours} ساعة و ${minutes} دقيقة`;
  };

  const calculateOccupancyPercentage = () => {
    if (!trip.passengers || !trip.passengers.capacity) return 0;
    return (trip.passengers.current / trip.passengers.capacity) * 100;
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !trip) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'لم يتم العثور على الرحلة'}</Alert>
        <Button onClick={handleBack} sx={{ mt: 2 }}>
          العودة إلى قائمة الرحلات
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          تفاصيل الرحلة
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBack />}
            onClick={handleBack}
          >
            رجوع
          </Button>
          {trip.status !== 'completed' && trip.status !== 'cancelled' && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
            >
              تعديل
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleDelete}
          >
            حذف
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Basic Info Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <RouteIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                معلومات المسار
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="اسم المسار"
                    secondary={trip.route?.name || 'غير محدد'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="نقطة البداية"
                    secondary={trip.route?.startPoint || 'غير محدد'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="نقطة النهاية"
                    secondary={trip.route?.endPoint || 'غير محدد'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="المسافة"
                    secondary={`${trip.route?.distance || 0} كم`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الحالة"
                    secondary={
                      <Chip
                        label={getStatusLabel(trip.status)}
                        color={getStatusColor(trip.status)}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Vehicle & Driver Info Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <DirectionsBus sx={{ verticalAlign: 'middle', mr: 1 }} />
                المركبة والسائق
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="المركبة"
                    secondary={`${trip.vehicle?.make || ''} ${trip.vehicle?.model || ''} (${trip.vehicle?.plateNumber || ''})`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="نوع المركبة"
                    secondary={trip.vehicle?.type || 'غير محدد'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="السائق"
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person />
                        {trip.driver?.name || trip.driver?.email || 'غير محدد'}
                      </Box>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Time Information Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Schedule sx={{ verticalAlign: 'middle', mr: 1 }} />
                معلومات التوقيت
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemText
                    primary="وقت البدء المجدول"
                    secondary={formatDate(trip.scheduledStartTime)}
                  />
                </ListItem>
                {trip.actualStartTime && (
                  <ListItem>
                    <ListItemText
                      primary="وقت البدء الفعلي"
                      secondary={formatDate(trip.actualStartTime)}
                    />
                  </ListItem>
                )}
                {trip.scheduledEndTime && (
                  <ListItem>
                    <ListItemText
                      primary="وقت الانتهاء المتوقع"
                      secondary={formatDate(trip.scheduledEndTime)}
                    />
                  </ListItem>
                )}
                {trip.actualEndTime && (
                  <ListItem>
                    <ListItemText
                      primary="وقت الانتهاء الفعلي"
                      secondary={formatDate(trip.actualEndTime)}
                    />
                  </ListItem>
                )}
                {calculateDuration() && (
                  <ListItem>
                    <ListItemText
                      primary="المدة الفعلية"
                      secondary={calculateDuration()}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Passengers Info Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <People sx={{ verticalAlign: 'middle', mr: 1 }} />
                معلومات الركاب
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  الإشغال
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={calculateOccupancyPercentage()}
                      color={calculateOccupancyPercentage() > 90 ? 'error' : 'primary'}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>
                  <Typography variant="body2">
                    {Math.round(calculateOccupancyPercentage())}%
                  </Typography>
                </Box>
              </Box>

              <List>
                <ListItem>
                  <ListItemText
                    primary="عدد الركاب الحالي"
                    secondary={trip.passengers?.current || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="السعة الكاملة"
                    secondary={trip.passengers?.capacity || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="المقاعد المتاحة"
                    secondary={(trip.passengers?.capacity || 0) - (trip.passengers?.current || 0)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Map Card */}
        {trip.route && trip.route.stops && trip.route.stops.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  خريطة المسار
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box
                  ref={mapRef}
                  sx={{
                    width: '100%',
                    height: 400,
                    borderRadius: 1,
                    bgcolor: 'grey.200'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Notes Card */}
        {trip.notes && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  ملاحظات
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {trip.notes}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Cancellation Reason */}
        {trip.status === 'cancelled' && trip.cancellationReason && (
          <Grid item xs={12}>
            <Alert severity="warning" icon={<Cancel />}>
              <Typography variant="subtitle2">سبب الإلغاء:</Typography>
              <Typography variant="body2">{trip.cancellationReason}</Typography>
            </Alert>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default TripDetails;
