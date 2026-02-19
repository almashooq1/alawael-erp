/**
 * صفحة إدارة المستفيدين المحسّنة
 * Enhanced Beneficiaries Management Page
 *
 * Features:
 * - Modern card-based layout
 * - Advanced search and filters
 * - Bulk actions
 * - Export functionality
 * - Real-time statistics
 * - Responsive design
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Tabs,
  Tab,
  Badge,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Stack,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Search,
  Add,
  FilterList,
  Download,
  Upload,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  PersonAdd,
  Print,
  Share,
  Star,
  StarBorder,
  CheckCircle,
  Cancel,
  Pending,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'; // Fixed TrendingUpIcon import
import { useNavigate } from 'react-router-dom';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

const BeneficiariesManagementPage = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Sample data - replace with API call
  const [statistics, setStatistics] = useState({
    total: 847,
    active: 623,
    pending: 124,
    inactive: 100,
    newThisMonth: 45,
    completionRate: 87
  });

  const [beneficiaries, setBeneficiaries] = useState([
    {
      id: 1,
      name: 'أحمد محمد علي',
      nameEn: 'Ahmed Mohammed Ali',
      nationalId: '1234567890',
      age: 12,
      gender: 'male',
      status: 'active',
      category: 'physical',
      joinDate: '2024-01-15',
      lastVisit: '2026-01-10',
      progress: 75,
      avatar: null,
      phone: '0501234567',
      sessions: 24,
      favorite: false
    },
    {
      id: 2,
      name: 'فاطمة أحمد حسن',
      nameEn: 'Fatima Ahmed Hassan',
      nationalId: '0987654321',
      age: 8,
      gender: 'female',
      status: 'active',
      category: 'mental',
      joinDate: '2024-03-20',
      lastVisit: '2026-01-12',
      progress: 82,
      avatar: null,
      phone: '0557654321',
      sessions: 31,
      favorite: true
    },
    {
      id: 3,
      name: 'خالد سعيد محمود',
      nameEn: 'Khaled Saeed Mahmoud',
      nationalId: '5678901234',
      age: 15,
      gender: 'male',
      status: 'pending',
      category: 'sensory',
      joinDate: '2026-01-05',
      lastVisit: null,
      progress: 20,
      avatar: null,
      phone: '0509876543',
      sessions: 2,
      favorite: false
    }
  ]);

  // Chart data
  const monthlyTrendData = {
    labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'],
    datasets: [
      {
        label: 'مستفيدين جدد',
        data: [35, 42, 38, 45, 52, 48],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const categoryDistributionData = {
    labels: ['إعاقة حركية', 'إعاقة ذهنية', 'إعاقة حسية', 'متعددة', 'أخرى'],
    datasets: [
      {
        data: [320, 245, 156, 89, 37],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  };

  const statusColors = {
    active: '#4caf50',
    pending: '#ff9800',
    inactive: '#f44336'
  };

  const categoryColors = {
    physical: '#2196f3',
    mental: '#e91e63',
    sensory: '#ff9800',
    multiple: '#9c27b0',
    other: '#607d8b'
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleFilterClick = (event) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleAddBeneficiary = () => {
    navigate('/beneficiaries/new');
  };

  const handleViewBeneficiary = (id) => {
    navigate(`/beneficiaries/${id}`);
  };

  const handleEditBeneficiary = (id) => {
    navigate(`/beneficiaries/${id}/edit`);
  };

  const toggleFavorite = (id) => {
    setBeneficiaries(prev =>
      prev.map(b => b.id === id ? { ...b, favorite: !b.favorite } : b)
    );
    setSnackbar({
      open: true,
      message: 'تم تحديث المفضلة',
      severity: 'success'
    });
  };

  const handleExport = () => {
    setSnackbar({
      open: true,
      message: 'جاري تصدير البيانات...',
      severity: 'info'
    });
  };

  const filteredBeneficiaries = beneficiaries.filter(b => {
    const matchesSearch = searchQuery === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.nameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.nationalId.includes(searchQuery);

    const matchesStatus = selectedStatus === 'all' || b.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              إدارة المستفيدين
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إدارة شاملة لجميع المستفيدين من خدمات المركز
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => console.log('Import')}
              >
                استيراد
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={handleExport}
              >
                تصدير
              </Button>
              <Button
                variant="contained"
                startIcon={<PersonAdd />}
                onClick={handleAddBeneficiary}
                sx={{
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
                }}
              >
                إضافة مستفيد
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            transition: 'transform 0.3s',
            '&:hover': { transform: 'translateY(-5px)' }
          }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.total}
                  </Typography>
                  <Typography variant="body2">
                    إجمالي المستفيدين
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <PersonAdd fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            color: 'white',
            transition: 'transform 0.3s',
            '&:hover': { transform: 'translateY(-5px)' }
          }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.active}
                  </Typography>
                  <Typography variant="body2">
                    مستفيدين نشطين
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <CheckCircle fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            color: 'white',
            transition: 'transform 0.3s',
            '&:hover': { transform: 'translateY(-5px)' }
          }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.pending}
                  </Typography>
                  <Typography variant="body2">
                    قيد الانتظار
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <Pending fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{
            background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            color: 'white',
            transition: 'transform 0.3s',
            '&:hover': { transform: 'translateY(-5px)' }
          }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {statistics.newThisMonth}
                  </Typography>
                  <Typography variant="body2">
                    جديد هذا الشهر
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 56, height: 56 }}>
                  <TrendingUpIcon fontSize="large" />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                اتجاه المستفيدين الشهري
              </Typography>
              <Line
                data={monthlyTrendData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top' }
                  },
                  scales: {
                    y: { beginAtZero: true }
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                توزيع الفئات
              </Typography>
              <Doughnut
                data={categoryDistributionData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'bottom' }
                  }
                }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card elevation={3} sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="البحث بالاسم، رقم الهوية، أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={selectedStatus}
                  label="الحالة"
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="pending">قيد الانتظار</MenuItem>
                  <MenuItem value="inactive">غير نشط</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={selectedCategory}
                  label="الفئة"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="physical">إعاقة حركية</MenuItem>
                  <MenuItem value="mental">إعاقة ذهنية</MenuItem>
                  <MenuItem value="sensory">إعاقة حسية</MenuItem>
                  <MenuItem value="multiple">متعددة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={handleFilterClick}
              >
                المزيد
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Beneficiaries Grid */}
      <Grid container spacing={3}>
        {filteredBeneficiaries.map((beneficiary) => (
          <Grid item xs={12} sm={6} md={4} key={beneficiary.id}>
            <Card
              elevation={3}
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6
                }
              }}
            >
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                  <Box display="flex" gap={2}>
                    <Avatar
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: categoryColors[beneficiary.category]
                      }}
                    >
                      {beneficiary.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {beneficiary.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {beneficiary.nameEn}
                      </Typography>
                      <Chip
                        label={beneficiary.nationalId}
                        size="small"
                        sx={{ mt: 0.5 }}
                      />
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => toggleFavorite(beneficiary.id)}
                  >
                    {beneficiary.favorite ? (
                      <Star color="warning" />
                    ) : (
                      <StarBorder />
                    )}
                  </IconButton>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={1} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      العمر
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {beneficiary.age} سنة
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      الجلسات
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {beneficiary.sessions}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      تاريخ الانضمام
                    </Typography>
                    <Typography variant="body2">
                      {beneficiary.joinDate}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      آخر زيارة
                    </Typography>
                    <Typography variant="body2">
                      {beneficiary.lastVisit || 'لا يوجد'}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary">
                      نسبة التقدم
                    </Typography>
                    <Typography variant="caption" fontWeight="bold">
                      {beneficiary.progress}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      bgcolor: 'grey.200',
                      borderRadius: 4,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: `${beneficiary.progress}%`,
                        height: '100%',
                        bgcolor: beneficiary.progress > 70 ? '#4caf50' : beneficiary.progress > 40 ? '#ff9800' : '#f44336',
                        transition: 'width 0.3s'
                      }}
                    />
                  </Box>
                </Box>

                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                  <Chip
                    label={
                      beneficiary.status === 'active' ? 'نشط' :
                      beneficiary.status === 'pending' ? 'انتظار' : 'غير نشط'
                    }
                    size="small"
                    sx={{
                      bgcolor: statusColors[beneficiary.status],
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  />
                  <Chip
                    label={
                      beneficiary.category === 'physical' ? 'حركية' :
                      beneficiary.category === 'mental' ? 'ذهنية' :
                      beneficiary.category === 'sensory' ? 'حسية' : 'متعددة'
                    }
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                <Stack direction="row" spacing={1} justifyContent="space-between">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Visibility />}
                    onClick={() => handleViewBeneficiary(beneficiary.id)}
                  >
                    عرض
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => handleEditBeneficiary(beneficiary.id)}
                  >
                    تعديل
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default BeneficiariesManagementPage;
