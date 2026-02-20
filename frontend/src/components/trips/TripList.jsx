import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Grid,
  Alert,
  CircularProgress,
  Tooltip,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  DirectionsBus as BusIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  CheckCircle as CompleteIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TripList = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setTrips(response.data.data.trips);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل الرحلات');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async (tripId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/trips/${tripId}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTrips();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في بدء الرحلة');
    }
  };

  const handleCompleteTrip = async (tripId) => {
    if (!window.confirm('هل أنت متأكد من إنهاء هذه الرحلة؟')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/trips/${tripId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTrips();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في إنهاء الرحلة');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'info';
      case 'in-progress': return 'primary';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'delayed': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'scheduled': return 'مجدولة';
      case 'in-progress': return 'جارية';
      case 'completed': return 'مكتملة';
      case 'cancelled': return 'ملغاة';
      case 'delayed': return 'متأخرة';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ar-EG');
  };

  const filterTripsByTab = (trip) => {
    switch (tabValue) {
      case 0: // الكل
        return true;
      case 1: // النشطة
        return trip.status === 'scheduled' || trip.status === 'in-progress';
      case 2: // المكتملة
        return trip.status === 'completed';
      case 3: // الملغاة
        return trip.status === 'cancelled';
      default:
        return true;
    }
  };

  const filteredTrips = trips
    .filter(filterTripsByTab)
    .filter(trip =>
      trip.route?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trip.vehicle?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          🚌 إدارة الرحلات
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/trips/new')}
        >
          إضافة رحلة جديدة
        </Button>
      </Box>

      {/* Statistics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي الرحلات
              </Typography>
              <Typography variant="h4">{trips.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                جارية
              </Typography>
              <Typography variant="h4" color="primary.main">
                {trips.filter(t => t.status === 'in-progress').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                مكتملة
              </Typography>
              <Typography variant="h4" color="success.main">
                {trips.filter(t => t.status === 'completed').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                مجدولة
              </Typography>
              <Typography variant="h4" color="warning.main">
                {trips.filter(t => t.status === 'scheduled').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="الكل" />
          <Tab label="النشطة" />
          <Tab label="المكتملة" />
          <Tab label="الملغاة" />
        </Tabs>
      </Box>

      {/* Search */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="البحث بالمسار أو رقم المركبة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Trips Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>المسار</TableCell>
              <TableCell>المركبة</TableCell>
              <TableCell>السائق</TableCell>
              <TableCell>تاريخ البدء</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الركاب</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredTrips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary">
                    {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد رحلات مسجلة'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredTrips.map((trip) => (
                <TableRow key={trip._id} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {trip.route?.name || 'غير محدد'}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {trip.route?.startPoint} → {trip.route?.endPoint}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <BusIcon fontSize="small" />
                      {trip.vehicle?.plateNumber || 'غير محدد'}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {trip.driver?.name || 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    {formatDate(trip.scheduledStartTime)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(trip.status)}
                      color={getStatusColor(trip.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {trip.currentPassengers || 0} / {trip.route?.capacity || 0}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => navigate(`/trips/${trip._id}`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    
                    {trip.status === 'scheduled' && (
                      <Tooltip title="بدء الرحلة">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleStartTrip(trip._id)}
                        >
                          <StartIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {trip.status === 'in-progress' && (
                      <Tooltip title="إنهاء الرحلة">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleCompleteTrip(trip._id)}
                        >
                          <CompleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    
                    {(trip.status === 'scheduled' || trip.status === 'in-progress') && (
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => navigate(`/trips/${trip._id}/edit`)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default TripList;
