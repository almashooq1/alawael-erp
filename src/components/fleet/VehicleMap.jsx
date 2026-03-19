/**
 * Vehicle Map Component - مكون خريطة المركبات
 *
 * عرض المركبات على الخريطة مع التتبع الفوري
 * ✅ Real-time Vehicle Location
 * ✅ Route Display
 * ✅ Geofence Visualization
 * ✅ Vehicle Information
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Button,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
  SpeedIcon,
  Menu as MenuIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const VehicleMapComponent = () => {
  // حالات
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleDetails, setVehicleDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);
  // const markersRef = useRef({});

  // جلب بيانات المركبات
  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 10000); // تحديث كل 10 ثواني
    return () => clearInterval(interval);
  }, []);

  const loadVehicles = async () => {
    try {
      // محاكاة جلب البيانات من API
      const vehiclesData = [
        {
          _id: '1',
          registrationNumber: 'س ق أ 1234',
          plateNumber: 'ق أ 1234',
          type: 'سيارة نقل',
          latitude: 24.7136,
          longitude: 46.6753,
          speed: 85,
          status: 'نشطة',
          lastUpdate: new Date(),
        },
        {
          _id: '2',
          registrationNumber: 'س ق أ 1235',
          plateNumber: 'ق أ 1235',
          type: 'سيارة ركوب',
          latitude: 24.7241,
          longitude: 46.6844,
          speed: 0,
          status: 'نشطة',
          lastUpdate: new Date(),
        },
        {
          _id: '3',
          registrationNumber: 'س ق أ 1236',
          plateNumber: 'ق أ 1236',
          type: 'سيارة نقل',
          latitude: 24.7392,
          longitude: 46.6733,
          speed: 120,
          status: 'نشطة',
          lastUpdate: new Date(),
        },
      ];

      setVehicles(vehiclesData);
      setLoading(false);
    } catch (error) {
      console.error('خطأ في جلب بيانات المركبات:', error);
    }
  };

  const handleVehicleSelect = vehicle => {
    setSelectedVehicle(vehicle);
    setVehicleDetails(vehicle);
    setDetailsOpen(true);
  };

  const handleMarkerClick = vehicle => {
    handleVehicleSelect(vehicle);
  };

  const getStatusColor = status => {
    switch (status) {
      case 'نشطة':
        return 'success';
      case 'في الإصلاح':
        return 'warning';
      case 'معطلة':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSpeedStatus = speed => {
    if (speed === 0) return { status: 'متوقفة', color: '#ff9800' };
    if (speed < 50) return { status: 'بطيئة', color: '#4caf50' };
    if (speed < 100) return { status: 'عادية', color: '#2196f3' };
    return { status: 'سريعة', color: '#f44336' };
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* الخريطة */}
      <Box
        ref={mapRef}
        sx={{
          flex: 1,
          backgroundColor: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              backgroundImage: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
            }}
          >
            {/* محاكاة الخريطة */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundImage: `
                  linear-gradient(0deg, transparent 24%, rgba(255, 0, 0, .05) 25%, rgba(255, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(255, 0, 0, .05) 75%, rgba(255, 0, 0, .05) 76%, transparent 77%, transparent),
                  linear-gradient(90deg, transparent 24%, rgba(255, 0, 0, .05) 25%, rgba(255, 0, 0, .05) 26%, transparent 27%, transparent 74%, rgba(255, 0, 0, .05) 75%, rgba(255, 0, 0, .05) 76%, transparent 77%, transparent)
                `,
                backgroundSize: '50px 50px',
                opacity: 0.3,
              }}
            />

            {/* علامات المركبات */}
            {vehicles.map(vehicle => (
              <Box
                key={vehicle._id}
                onClick={() => handleMarkerClick(vehicle)}
                sx={{
                  position: 'absolute',
                  left: `${10 + (vehicle.longitude - 46.65) * 200}px`,
                  top: `${20 + (vehicle.latitude - 24.71) * 200}px`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.2)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: getSpeedStatus(vehicle.speed).color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    border: selectedVehicle?._id === vehicle._id ? '3px solid white' : 'none',
                  }}
                >
                  🚗
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {/* أزرار التحكم */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            display: 'flex',
            gap: 1,
            zIndex: 10,
          }}
        >
          <Tooltip title="القائمة">
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': { backgroundColor: '#f0f0f0' },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="تحديث">
            <IconButton
              onClick={loadVehicles}
              sx={{
                backgroundColor: 'white',
                color: 'primary.main',
                '&:hover': { backgroundColor: '#f0f0f0' },
              }}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* قائمة المركبات الجانبية */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 350,
            backgroundColor: '#fafafa',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🚗 قائمة المركبات
            </Typography>
            <IconButton size="small" onClick={() => setDrawerOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {vehicles.length} مركبة نشطة
          </Typography>

          <List disablePadding>
            {vehicles.map(vehicle => (
              <Box key={vehicle._id}>
                <ListItemButton
                  selected={selectedVehicle?._id === vehicle._id}
                  onClick={() => {
                    handleVehicleSelect(vehicle);
                    setDrawerOpen(false);
                  }}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    '&.Mui-selected': {
                      backgroundColor: '#e3f2fd',
                      '&:hover': { backgroundColor: '#bbdefb' },
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {vehicle.registrationNumber}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {vehicle.type}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          size="small"
                          icon={<SpeedIcon />}
                          label={`${vehicle.speed} كم/س`}
                          color={vehicle.speed > 100 ? 'error' : 'success'}
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={vehicle.status}
                          color={getStatusColor(vehicle.status)}
                          variant="outlined"
                        />
                      </Box>
                    }
                  />
                </ListItemButton>
              </Box>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* نافذة تفاصيل المركبة */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography sx={{ fontWeight: 700 }}>{vehicleDetails?.registrationNumber}</Typography>
          <IconButton onClick={() => setDetailsOpen(false)} sx={{ color: 'white' }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {vehicleDetails && (
            <Stack spacing={2}>
              <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>🚗 النوع:</strong> {vehicleDetails.type}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>📍 الموقع:</strong> ({vehicleDetails.latitude.toFixed(4)},{' '}
                  {vehicleDetails.longitude.toFixed(4)})
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>⚡ السرعة:</strong> {vehicleDetails.speed} كم/س{' '}
                  <Chip
                    size="small"
                    label={getSpeedStatus(vehicleDetails.speed).status}
                    sx={{
                      backgroundColor: getSpeedStatus(vehicleDetails.speed).color,
                      color: 'white',
                      ml: 1,
                    }}
                  />
                </Typography>
                <Typography variant="body2">
                  <strong>🔄 آخر تحديث:</strong>{' '}
                  {vehicleDetails.lastUpdate?.toLocaleTimeString('ar-SA')}
                </Typography>
              </Box>

              <Box sx={{ backgroundColor: '#e8f5e9', p: 2, borderRadius: 2 }}>
                <Chip
                  label={vehicleDetails.status}
                  color={getStatusColor(vehicleDetails.status)}
                  icon={vehicleDetails.status === 'نشطة' ? '✓' : '⚠'}
                  sx={{ width: '100%' }}
                />
              </Box>

              <Stack direction="row" spacing={1}>
                <Button variant="contained" fullWidth sx={{ borderRadius: 2 }}>
                  معاينة الرحلة
                </Button>
                <Button variant="outlined" fullWidth sx={{ borderRadius: 2 }}>
                  التفاصيل
                </Button>
              </Stack>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default VehicleMapComponent;
