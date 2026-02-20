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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  DirectionsCar as CarIcon,
  LocalShipping as TruckIcon,
  DirectionsBus as BusIcon,
  MyLocation as GpsIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const VehicleList = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    maintenance: 0,
    outOfService: 0
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/vehicles`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setVehicles(response.data.data.vehicles);
        calculateStats(response.data.data.vehicles);
      }
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل المركبات');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (vehicleList) => {
    const stats = {
      total: vehicleList.length,
      active: vehicleList.filter(v => v.status === 'active').length,
      maintenance: vehicleList.filter(v => v.status === 'maintenance').length,
      outOfService: vehicleList.filter(v => v.status === 'out-of-service').length
    };
    setStats(stats);
  };

  const handleDelete = async (vehicleId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المركبة؟')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE_URL}/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في حذف المركبة');
    }
  };

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'bus': return <BusIcon />;
      case 'truck': return <TruckIcon />;
      default: return <CarIcon />;
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

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())
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
          🚗 إدارة المركبات
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/vehicles/new')}
        >
          إضافة مركبة جديدة
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المركبات
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#e8f5e9' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                نشط
              </Typography>
              <Typography variant="h4" color="success.main">{stats.active}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                صيانة
              </Typography>
              <Typography variant="h4" color="warning.main">{stats.maintenance}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: '#ffebee' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                خارج الخدمة
              </Typography>
              <Typography variant="h4" color="error.main">{stats.outOfService}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="البحث برقم اللوحة، الصنع، أو الموديل..."
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

      {/* Vehicles Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>النوع</TableCell>
              <TableCell>رقم اللوحة</TableCell>
              <TableCell>الصنع والموديل</TableCell>
              <TableCell>السنة</TableCell>
              <TableCell>السعة</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الوقود</TableCell>
              <TableCell>GPS</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography color="textSecondary">
                    {searchTerm ? 'لا توجد نتائج للبحث' : 'لا توجد مركبات مسجلة'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle._id} hover>
                  <TableCell>
                    <Tooltip title={vehicle.type}>
                      {getVehicleIcon(vehicle.type)}
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {vehicle.plateNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {vehicle.make} {vehicle.model}
                  </TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell>{vehicle.capacity} راكب</TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(vehicle.status)}
                      color={getStatusColor(vehicle.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      {vehicle.fuelLevel < 20 && (
                        <WarningIcon color="error" fontSize="small" />
                      )}
                      {vehicle.fuelLevel}%
                    </Box>
                  </TableCell>
                  <TableCell>
                    {vehicle.currentLocation ? (
                      <Tooltip title="تتبع GPS نشط">
                        <GpsIcon color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="لا يوجد إحداثيات">
                        <GpsIcon color="disabled" />
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض التفاصيل">
                      <IconButton
                        size="small"
                        color="info"
                        onClick={() => navigate(`/vehicles/${vehicle._id}`)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="تعديل">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => navigate(`/vehicles/${vehicle._id}/edit`)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(vehicle._id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
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

export default VehicleList;
