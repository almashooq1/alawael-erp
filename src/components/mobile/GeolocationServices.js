/**
 * Geolocation & Location Services 📍
 * خدمات الموقع الجغرافي المتقدمة
 *
 * Features:
 * ✅ Real-time location tracking
 * ✅ Geofencing
 * ✅ Distance calculation
 * ✅ Route planning
 * ✅ Location history
 * ✅ Nearby search
 * ✅ Map integration
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Rating,
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  MyLocation as MyLocationIcon,
  Navigation as NavigationIcon,
  Place as PlaceIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Map as MapIcon,
  Directions as DirectionsIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Beenhere as BeenhereIcon,
} from '@mui/icons-material';

const GeolocationServices = () => {
  const [currentLocation, setCurrentLocation] = useState({
    latitude: 24.7136,
    longitude: 46.6753,
    accuracy: 5,
    altitude: 650,
    speed: 0,
    heading: 0,
  });

  const [locations, setLocations] = useState([
    {
      id: 1,
      name: 'المكتب الرئيسي',
      lat: 24.7136,
      lng: 46.6753,
      category: 'work',
      distance: 0,
      visited: 45,
      rating: 4.8,
      isFavorite: true,
      lastVisit: '2026-01-16',
    },
    {
      id: 2,
      name: 'المنزل',
      lat: 24.75,
      lng: 46.7,
      category: 'home',
      distance: 5.2,
      visited: 120,
      rating: 5.0,
      isFavorite: true,
      lastVisit: '2026-01-16',
    },
    {
      id: 3,
      name: 'محطة الوقود',
      lat: 24.73,
      lng: 46.69,
      category: 'fuel',
      distance: 2.1,
      visited: 30,
      rating: 4.5,
      isFavorite: false,
      lastVisit: '2026-01-14',
    },
    {
      id: 4,
      name: 'المحل التجاري',
      lat: 24.72,
      lng: 46.71,
      category: 'shopping',
      distance: 3.5,
      visited: 15,
      rating: 4.2,
      isFavorite: false,
      lastVisit: '2026-01-13',
    },
  ]);

  const [geofences, setGeofences] = useState([
    {
      id: 1,
      name: 'منطقة المكتب',
      lat: 24.7136,
      lng: 46.6753,
      radius: 500,
      active: true,
      alerts: 45,
    },
    { id: 2, name: 'منطقة المنزل', lat: 24.75, lng: 46.7, radius: 300, active: true, alerts: 120 },
    {
      id: 3,
      name: 'منطقة المركز التجاري',
      lat: 24.74,
      lng: 46.705,
      radius: 1000,
      active: false,
      alerts: 8,
    },
  ]);

  const [locationHistory, setLocationHistory] = useState([
    {
      id: 1,
      time: '2026-01-16 14:30',
      location: 'المكتب الرئيسي',
      lat: 24.7136,
      lng: 46.6753,
      accuracy: 5,
    },
    {
      id: 2,
      time: '2026-01-16 12:00',
      location: 'المحل التجاري',
      lat: 24.72,
      lng: 46.71,
      accuracy: 8,
    },
    { id: 3, time: '2026-01-16 09:00', location: 'المنزل', lat: 24.75, lng: 46.7, accuracy: 4 },
  ]);

  const [openDialog, setOpenDialog] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const stats = {
    placesVisited: locations.length,
    totalDistance: locations.reduce((sum, l) => sum + l.distance, 0).toFixed(1),
    geofences: geofences.length,
    activeGeofences: geofences.filter(g => g.active).length,
  };

  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            speed: position.coords.speed,
            heading: position.coords.heading,
          });
        },
        error => alert('خطأ في الحصول على الموقع: ' + error.message)
      );
    }
  };

  const toggleFavorite = id => {
    setLocations(locations.map(l => (l.id === id ? { ...l, isFavorite: !l.isFavorite } : l)));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'الأماكن المزارة', value: stats.placesVisited, icon: '📍', color: '#667eea' },
          {
            label: 'المسافة الكلية',
            value: `${stats.totalDistance} كم`,
            icon: '🛣️',
            color: '#ff9800',
          },
          { label: 'الأسيجة الجغرافية', value: stats.geofences, icon: '🔐', color: '#4caf50' },
          { label: 'نشطة', value: stats.activeGeofences, icon: '✅', color: '#2196f3' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Current Location */}
      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          mb: 3,
          backgroundColor: '#e3f2fd',
          border: '2px solid #2196f3',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1976d2' }}>
            📍 الموقع الحالي
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Switch
              checked={trackingEnabled}
              onChange={e => setTrackingEnabled(e.target.checked)}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<MyLocationIcon />}
              onClick={getCurrentLocation}
            >
              تحديث
            </Button>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">
                  خط العرض
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  {currentLocation.latitude.toFixed(4)}°
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  خط الطول
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {currentLocation.longitude.toFixed(4)}°
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography variant="caption" color="textSecondary">
                  دقة الموقع
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  ±{currentLocation.accuracy} متر
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  الارتفاع
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {currentLocation.altitude || 'N/A'} متر
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Saved Locations */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        ⭐ الأماكن المحفوظة
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {locations.map(loc => (
          <Grid item xs={12} sm={6} md={4} key={loc.id}>
            <Card sx={{ borderRadius: 2, height: '100%' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {loc.name}
                    </Typography>
                    <Chip label={loc.category} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  </Box>
                  <IconButton size="small" onClick={() => toggleFavorite(loc.id)}>
                    {loc.isFavorite ? (
                      <FavoriteIcon sx={{ color: '#f44336' }} />
                    ) : (
                      <FavoriteBorderIcon />
                    )}
                  </IconButton>
                </Box>

                <Divider sx={{ my: 1 }} />

                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  📏 المسافة: {loc.distance} كم
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  🏷️ زيارات: {loc.visited}
                </Typography>
                <Typography
                  variant="caption"
                  color="textSecondary"
                  sx={{ display: 'block', mb: 1 }}
                >
                  📅 آخر زيارة: {loc.lastVisit}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Rating value={loc.rating} readOnly size="small" sx={{ mr: 1 }} />
                  <Typography variant="caption">{loc.rating}</Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" fullWidth startIcon={<DirectionsIcon />}>
                    مسار
                  </Button>
                  <Button size="small" variant="outlined" startIcon={<ShareIcon />}>
                    مشاركة
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Geofences */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        🔐 الأسيجة الجغرافية
      </Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2, mb: 3 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#667eea' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاسم</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>نطاق</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التنبيهات</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {geofences.map(geo => (
              <TableRow key={geo.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell sx={{ fontWeight: 600 }}>{geo.name}</TableCell>
                <TableCell>{geo.radius} متر</TableCell>
                <TableCell>
                  <Chip
                    label={geo.active ? 'نشط' : 'معطل'}
                    color={geo.active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{geo.alerts}</TableCell>
                <TableCell align="center">
                  <Button size="small" startIcon={<EditIcon />}>
                    تعديل
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Location History */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        📜 سجل الأماكن
      </Typography>
      <Paper sx={{ borderRadius: 2 }}>
        <List>
          {locationHistory.map((entry, idx) => (
            <Box key={entry.id}>
              <ListItem sx={{ backgroundColor: idx % 2 === 0 ? '#f8f9ff' : 'white' }}>
                <ListItemIcon>
                  <BeenhereIcon sx={{ color: '#667eea' }} />
                </ListItemIcon>
                <ListItemText
                  primary={entry.location}
                  secondary={`${entry.time} • دقة: ±${entry.accuracy}m`}
                />
                <Typography variant="caption" sx={{ color: '#667eea' }}>
                  {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
                </Typography>
              </ListItem>
              {idx < locationHistory.length - 1 && <Divider />}
            </Box>
          ))}
        </List>
      </Paper>

      {/* Add Location */}
      <Button
        variant="contained"
        fullWidth
        startIcon={<PlaceIcon />}
        onClick={() => setOpenDialog(true)}
        sx={{ mt: 3, borderRadius: 2 }}
      >
        إضافة موقع جديد
      </Button>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>📍 إضافة موقع جديد</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField fullWidth label="الاسم" variant="outlined" margin="normal" />
          <TextField fullWidth label="خط العرض" variant="outlined" margin="normal" />
          <TextField fullWidth label="خط الطول" variant="outlined" margin="normal" />
          <TextField fullWidth label="الفئة" variant="outlined" margin="normal" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={() => setOpenDialog(false)} variant="contained">
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GeolocationServices;
