import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const VehicleForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    type: 'car',
    plateNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    capacity: 4,
    fuelType: 'gasoline',
    fuelCapacity: 50,
    fuelLevel: 100,
    mileage: 0,
    status: 'active',
    gpsEnabled: true,
    insuranceExpiry: '',
    registrationExpiry: '',
    notes: ''
  });

  useEffect(() => {
    if (isEditMode) {
      fetchVehicle();
    }
  }, [id]);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/vehicles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        const vehicle = response.data.data;
        setFormData({
          type: vehicle.type,
          plateNumber: vehicle.plateNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          capacity: vehicle.capacity,
          fuelType: vehicle.fuelType,
          fuelCapacity: vehicle.fuelCapacity,
          fuelLevel: vehicle.fuelLevel,
          mileage: vehicle.mileage,
          status: vehicle.status,
          gpsEnabled: vehicle.gpsEnabled,
          insuranceExpiry: vehicle.insuranceExpiry ? vehicle.insuranceExpiry.split('T')[0] : '',
          registrationExpiry: vehicle.registrationExpiry ? vehicle.registrationExpiry.split('T')[0] : '',
          notes: vehicle.notes || ''
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل بيانات المركبة');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      let response;
      if (isEditMode) {
        response = await axios.put(
          `${API_BASE_URL}/vehicles/${id}`,
          formData,
          config
        );
      } else {
        response = await axios.post(
          `${API_BASE_URL}/vehicles`,
          formData,
          config
        );
      }

      if (response.data.success) {
        setSuccess(isEditMode ? 'تم تحديث المركبة بنجاح' : 'تم إضافة المركبة بنجاح');
        setTimeout(() => {
          navigate('/vehicles');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في حفظ البيانات');
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isEditMode ? '✏️ تعديل مركبة' : '➕ إضافة مركبة جديدة'}
      </Typography>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* نوع المركبة */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>نوع المركبة</InputLabel>
                  <Select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    label="نوع المركبة"
                  >
                    <MenuItem value="car">سيارة</MenuItem>
                    <MenuItem value="bus">حافلة</MenuItem>
                    <MenuItem value="truck">شاحنة</MenuItem>
                    <MenuItem value="van">فان</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* رقم اللوحة */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="رقم اللوحة"
                  name="plateNumber"
                  value={formData.plateNumber}
                  onChange={handleChange}
                  placeholder="مثال: أ ب ج 1234"
                />
              </Grid>

              {/* الصنع */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="الصنع"
                  name="make"
                  value={formData.make}
                  onChange={handleChange}
                  placeholder="مثال: تويوتا"
                />
              </Grid>

              {/* الموديل */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="الموديل"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="مثال: كامري"
                />
              </Grid>

              {/* السنة */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="سنة الصنع"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  inputProps={{ min: 1990, max: new Date().getFullYear() + 1 }}
                />
              </Grid>

              {/* السعة */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="السعة (عدد الركاب)"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>

              {/* نوع الوقود */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>نوع الوقود</InputLabel>
                  <Select
                    name="fuelType"
                    value={formData.fuelType}
                    onChange={handleChange}
                    label="نوع الوقود"
                  >
                    <MenuItem value="gasoline">بنزين</MenuItem>
                    <MenuItem value="diesel">ديزل</MenuItem>
                    <MenuItem value="electric">كهرباء</MenuItem>
                    <MenuItem value="hybrid">هجين</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* سعة خزان الوقود */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="سعة خزان الوقود (لتر)"
                  name="fuelCapacity"
                  value={formData.fuelCapacity}
                  onChange={handleChange}
                  inputProps={{ min: 10, max: 500 }}
                />
              </Grid>

              {/* مستوى الوقود */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="مستوى الوقود (%)"
                  name="fuelLevel"
                  value={formData.fuelLevel}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>

              {/* عداد الكيلومترات */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="عداد الكيلومترات"
                  name="mileage"
                  value={formData.mileage}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>

              {/* الحالة */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>الحالة</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    label="الحالة"
                  >
                    <MenuItem value="active">نشط</MenuItem>
                    <MenuItem value="maintenance">صيانة</MenuItem>
                    <MenuItem value="out-of-service">خارج الخدمة</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* تاريخ انتهاء التأمين */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ انتهاء التأمين"
                  name="insuranceExpiry"
                  value={formData.insuranceExpiry}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* تاريخ انتهاء الترخيص */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="تاريخ انتهاء الترخيص"
                  name="registrationExpiry"
                  value={formData.registrationExpiry}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* ملاحظات */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="ملاحظات"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="أدخل أي ملاحظات إضافية..."
                />
              </Grid>

              {/* Error/Success Messages */}
              {error && (
                <Grid item xs={12}>
                  <Alert severity="error" onClose={() => setError('')}>
                    {error}
                  </Alert>
                </Grid>
              )}

              {success && (
                <Grid item xs={12}>
                  <Alert severity="success">{success}</Alert>
                </Grid>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={() => navigate('/vehicles')}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : (isEditMode ? 'تحديث' : 'حفظ')}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VehicleForm;
