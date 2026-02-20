import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Autocomplete
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import axios from 'axios';

const TripForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [formData, setFormData] = useState({
    route: '',
    vehicle: '',
    driver: '',
    scheduledStartTime: '',
    scheduledEndTime: '',
    status: 'scheduled',
    passengers: {
      capacity: 0
    },
    notes: ''
  });

  useEffect(() => {
    loadData();
    if (isEditMode) {
      loadTrip();
    }
  }, [id]);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [routesRes, vehiclesRes, driversRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/transport-routes`, config),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/vehicles`, config),
        axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/users?role=driver`, config)
      ]);

      setRoutes(routesRes.data);
      setVehicles(vehiclesRes.data.filter(v => v.status === 'active'));
      setDrivers(driversRes.data);
    } catch (err) {
      setError('فشل تحميل البيانات');
    }
  };

  const loadTrip = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trips/${id}`,
        config
      );

      const trip = response.data;
      setFormData({
        route: trip.route._id || trip.route,
        vehicle: trip.vehicle._id || trip.vehicle,
        driver: trip.driver._id || trip.driver,
        scheduledStartTime: trip.scheduledStartTime?.split('T')[0] || '',
        scheduledEndTime: trip.scheduledEndTime?.split('T')[0] || '',
        status: trip.status,
        passengers: trip.passengers,
        notes: trip.notes || ''
      });
    } catch (err) {
      setError('فشل تحميل بيانات الرحلة');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVehicleChange = (event, newValue) => {
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        vehicle: newValue._id,
        passengers: {
          ...prev.passengers,
          capacity: newValue.capacity
        }
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const url = isEditMode
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trips/${id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/trips`;

      const method = isEditMode ? 'put' : 'post';

      await axios[method](url, formData, config);

      setSuccess('تم حفظ الرحلة بنجاح');
      setTimeout(() => navigate('/trips'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'فشل حفظ الرحلة');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/trips');
  };

  if (loading && isEditMode) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
          {isEditMode ? 'تعديل رحلة' : 'إضافة رحلة جديدة'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Route Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>المسار</InputLabel>
                <Select
                  name="route"
                  value={formData.route}
                  onChange={handleChange}
                  label="المسار"
                >
                  {routes.map(route => (
                    <MenuItem key={route._id} value={route._id}>
                      {route.name} ({route.startPoint} → {route.endPoint})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Vehicle Selection with Autocomplete */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={vehicles}
                getOptionLabel={(option) => `${option.plateNumber} - ${option.make} ${option.model}`}
                value={vehicles.find(v => v._id === formData.vehicle) || null}
                onChange={handleVehicleChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="المركبة"
                    required
                  />
                )}
              />
            </Grid>

            {/* Driver Selection */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel>السائق</InputLabel>
                <Select
                  name="driver"
                  value={formData.driver}
                  onChange={handleChange}
                  label="السائق"
                >
                  {drivers.map(driver => (
                    <MenuItem key={driver._id} value={driver._id}>
                      {driver.name || driver.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Scheduled Start Time */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                required
                type="datetime-local"
                name="scheduledStartTime"
                label="وقت البدء المجدول"
                value={formData.scheduledStartTime}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Scheduled End Time */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                name="scheduledEndTime"
                label="وقت الانتهاء المتوقع"
                value={formData.scheduledEndTime}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Capacity Display */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                disabled
                label="السعة"
                value={formData.passengers.capacity || 0}
                helperText="يتم تحديد السعة تلقائياً بناءً على المركبة"
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="الحالة"
                >
                  <MenuItem value="scheduled">مجدولة</MenuItem>
                  <MenuItem value="in-progress">قيد التنفيذ</MenuItem>
                  <MenuItem value="completed">مكتملة</MenuItem>
                  <MenuItem value="cancelled">ملغاة</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Notes */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                name="notes"
                label="ملاحظات"
                value={formData.notes}
                onChange={handleChange}
                placeholder="أدخل أي ملاحظات إضافية..."
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                disabled={loading}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'حفظ'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
};

export default TripForm;
