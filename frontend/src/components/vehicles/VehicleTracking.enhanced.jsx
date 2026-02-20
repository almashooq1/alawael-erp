/**
 * Enhanced VehicleTracking Component with WebSocket
 * Real-time GPS updates without polling
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  DirectionsCar as CarIcon,
  Speed as SpeedIcon,
  Explore as CompassIcon,
  SignalCellularAlt as SignalIcon
} from '@mui/icons-material';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import useWebSocket from '../../hooks/useWebSocket';

const VehicleTracking = ({ vehicleId }) => {
  const [vehicle, setVehicle] = useState(null);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wsError, setWsError] = useState(null);

  // WebSocket hook
  const { 
    isConnected, 
    subscribeToVehicle, 
    requestVehicleStatus 
  } = useWebSocket();

  // Google Maps
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    if (!vehicleId || !isConnected) return;

    // Request initial vehicle status
    requestVehicleStatus(vehicleId)
      .then(data => {
        setVehicle(data);
        if (data.currentLocation) {
          setLocation({
            lat: data.currentLocation.coordinates[1],
            lng: data.currentLocation.coordinates[0]
          });
        }
        setLoading(false);
      })
      .catch(err => {
        setWsError(err.message);
        setLoading(false);
      });

    // Subscribe to real-time updates
    const unsubscribe = subscribeToVehicle(vehicleId, (update) => {
      console.log('Vehicle update received:', update);

      // Update vehicle data
      if (update.location) {
        setLocation({
          lat: update.location.latitude,
          lng: update.location.longitude
        });
        setVehicle(prev => ({
          ...prev,
          currentSpeed: update.location.speed,
          heading: update.location.heading,
          lastLocationUpdate: new Date()
        }));
      }

      // Handle low fuel alert
      if (update.lowFuel) {
        alert(`⚠️ Low Fuel Alert: ${update.fuelLevel}%`);
      }

      // Handle full vehicle update
      if (update.status || update.fuelLevel !== undefined) {
        setVehicle(prev => ({ ...prev, ...update }));
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [vehicleId, isConnected, subscribeToVehicle, requestVehicleStatus]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (wsError) {
    return (
      <Alert severity="error">
        خطأ في الاتصال بالخادم: {wsError}
      </Alert>
    );
  }

  if (!vehicle) {
    return (
      <Alert severity="warning">
        لم يتم العثور على بيانات المركبة
      </Alert>
    );
  }

  return (
    <Box>
      {/* Connection Status */}
      <Box mb={2} display="flex" alignItems="center" gap={1}>
        <Chip
          icon={<SignalIcon />}
          label={isConnected ? 'متصل' : 'غير متصل'}
          color={isConnected ? 'success' : 'error'}
          size="small"
        />
        <Typography variant="caption" color="textSecondary">
          آخر تحديث: {new Date(vehicle.lastLocationUpdate).toLocaleTimeString('ar-SA')}
        </Typography>
      </Box>

      {/* Vehicle Info Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CarIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    رقم اللوحة
                  </Typography>
                  <Typography variant="h6">
                    {vehicle.plateNumber}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <SpeedIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    السرعة الحالية
                  </Typography>
                  <Typography variant="h6">
                    {vehicle.currentSpeed || 0} كم/س
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <CompassIcon color="primary" />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الاتجاه
                  </Typography>
                  <Typography variant="h6">
                    {vehicle.heading ? `${vehicle.heading}°` : '--'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    الحالة
                  </Typography>
                  <Chip
                    label={vehicle.status === 'active' ? 'نشط' : 'غير نشط'}
                    color={vehicle.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Google Map */}
      <Paper elevation={2}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            الموقع على الخريطة
          </Typography>
          
          {isLoaded && location ? (
            <GoogleMap
              zoom={15}
              center={location}
              mapContainerStyle={{ width: '100%', height: '500px' }}
            >
              <Marker
                position={location}
                icon={{
                  url: '/vehicle-icon.png',
                  scaledSize: new window.google.maps.Size(40, 40)
                }}
                title={vehicle.plateNumber}
              />
            </GoogleMap>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" height={500}>
              <CircularProgress />
            </Box>
          )}
        </Box>
      </Paper>

      {/* Live Indicator */}
      {isConnected && (
        <Box mt={2} display="flex" alignItems="center" gap={1}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'success.main',
              animation: 'pulse 2s infinite'
            }}
          />
          <Typography variant="caption" color="success.main">
            التحديثات الفورية مفعّلة
          </Typography>
        </Box>
      )}

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default VehicleTracking;
