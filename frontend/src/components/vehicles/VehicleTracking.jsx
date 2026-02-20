import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  MyLocation as GpsIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const VehicleTracking = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchVehicleLocation();
    
    // Auto-refresh every 10 seconds
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchVehicleLocation(true);
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, autoRefresh]);

  useEffect(() => {
    if (vehicle && vehicle.currentLocation && !mapInstanceRef.current) {
      initializeMap();
    } else if (vehicle && vehicle.currentLocation && mapInstanceRef.current) {
      updateMarkerPosition();
    }
  }, [vehicle]);

  const fetchVehicleLocation = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setVehicle(response.data.data);
        setLastUpdate(new Date());
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل موقع المركبة');
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    // Check if Google Maps is loaded
    if (!window.google) {
      setError('خدمة الخرائط غير متوفرة. يرجى تحميل Google Maps API.');
      return;
    }

    const { coordinates } = vehicle.currentLocation;
    const position = { lat: coordinates[1], lng: coordinates[0] };

    // Create map
    const map = new window.google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeId: 'roadmap'
    });

    // Create marker
    const marker = new window.google.maps.Marker({
      position: position,
      map: map,
      title: vehicle.plateNumber,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#4CAF50',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2
      }
    });

    // Create info window
    const infoWindow = new window.google.maps.InfoWindow({
      content: `
        <div style="padding: 10px;">
          <h3>${vehicle.plateNumber}</h3>
          <p>${vehicle.make} ${vehicle.model}</p>
          <p>الحالة: ${getStatusLabel(vehicle.status)}</p>
        </div>
      `
    });

    marker.addListener('click', () => {
      infoWindow.open(map, marker);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
  };

  const updateMarkerPosition = () => {
    if (!markerRef.current || !vehicle.currentLocation) return;

    const { coordinates } = vehicle.currentLocation;
    const position = { lat: coordinates[1], lng: coordinates[0] };

    markerRef.current.setPosition(position);
    mapInstanceRef.current.setCenter(position);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'maintenance': return 'warning';
      case 'out-of-service': return 'error';
      case 'in-trip': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('ar-EG');
  };

  if (loading && !vehicle) {
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
            onClick={() => navigate(`/vehicles/${id}`)}
            sx={{ mb: 1 }}
          >
            العودة للتفاصيل
          </Button>
          <Typography variant="h4" component="h1">
            <GpsIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            تتبع المركبة
          </Typography>
          <Typography variant="h6" color="primary" mt={1}>
            {vehicle.plateNumber}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchVehicleLocation()}
            disabled={loading}
          >
            تحديث
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Map */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">الخريطة</Typography>
                {lastUpdate && (
                  <Typography variant="caption" color="textSecondary">
                    آخر تحديث: {formatDate(lastUpdate)}
                  </Typography>
                )}
              </Box>
              
              {vehicle.currentLocation ? (
                <Box
                  ref={mapRef}
                  sx={{
                    width: '100%',
                    height: '500px',
                    borderRadius: 1,
                    bgcolor: '#f5f5f5'
                  }}
                />
              ) : (
                <Alert severity="info">
                  لا توجد إحداثيات GPS متاحة لهذه المركبة
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Info Panel */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات المركبة
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

                {vehicle.currentLocation && (
                  <>
                    <ListItem>
                      <ListItemText
                        primary="خط الطول (Longitude)"
                        secondary={vehicle.currentLocation.coordinates[0].toFixed(6)}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="خط العرض (Latitude)"
                        secondary={vehicle.currentLocation.coordinates[1].toFixed(6)}
                      />
                    </ListItem>
                  </>
                )}

                {vehicle.lastSpeed !== undefined && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <SpeedIcon /> السرعة الحالية
                        </Box>
                      }
                      secondary={`${vehicle.lastSpeed} كم/س`}
                    />
                  </ListItem>
                )}

                <ListItem>
                  <ListItemText
                    primary="مستوى الوقود"
                    secondary={`${vehicle.fuelLevel}%`}
                  />
                </ListItem>

                <ListItem>
                  <ListItemText
                    primary="عداد الكيلومترات"
                    secondary={`${vehicle.mileage.toLocaleString()} كم`}
                  />
                </ListItem>

                {vehicle.lastGPSUpdate && (
                  <ListItem>
                    <ListItemText
                      primary="آخر تحديث GPS"
                      secondary={formatDate(vehicle.lastGPSUpdate)}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>

          {/* Auto Refresh Control */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                التحديث التلقائي
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Typography variant="body2">
                  تحديث الموقع كل 10 ثواني
                </Typography>
                <Button
                  variant={autoRefresh ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? 'إيقاف' : 'تفعيل'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Emergency Alerts */}
          {vehicle.emergencyAlerts && vehicle.emergencyAlerts.length > 0 && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="error">
                  ⚠️ تنبيهات الطوارئ
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List>
                  {vehicle.emergencyAlerts.slice(0, 3).map((alert, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={alert.type}
                        secondary={formatDate(alert.timestamp)}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default VehicleTracking;
