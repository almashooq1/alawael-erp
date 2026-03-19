import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Pagination,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Typography
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import {
  fetchBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary
} from '../store/slices/beneficiariesSlice';

function BeneficiariesPage() {
  const dispatch = useDispatch();
  const { beneficiaries, loading, error, pagination } = useSelector(state => state.beneficiaries);
  
  // Local state
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    insuranceProvider: 'SLIC',
    address: ''
  });

  // Fetch beneficiaries on component mount and when page changes
  useEffect(() => {
    dispatch(fetchBeneficiaries({
      page: currentPage,
      limit: 10,
      search: searchTerm
    }));
  }, [dispatch, currentPage, searchTerm]);

  // Handle add new beneficiary
  const handleAddNew = () => {
    setEditingId(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      insuranceProvider: 'SLIC',
      address: ''
    });
    setOpenDialog(true);
  };

  // Handle edit beneficiary
  const handleEdit = (beneficiary) => {
    setEditingId(beneficiary._id);
    setFormData({
      firstName: beneficiary.firstName,
      lastName: beneficiary.lastName,
      email: beneficiary.email,
      phone: beneficiary.phone,
      dateOfBirth: beneficiary.dateOfBirth?.split('T')[0] || '',
      insuranceProvider: beneficiary.insuranceProvider,
      address: beneficiary.address
    });
    setOpenDialog(true);
  };

  // Handle delete beneficiary
  const handleDelete = async (id) => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستفيد؟')) {
      await dispatch(deleteBeneficiary(id));
      dispatch(fetchBeneficiaries({
        page: currentPage,
        limit: 10,
        search: searchTerm
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (editingId) {
        await dispatch(updateBeneficiary({ id: editingId, data: formData }));
      } else {
        await dispatch(createBeneficiary(formData));
        setCurrentPage(1);
      }
      setOpenDialog(false);
      dispatch(fetchBeneficiaries({
        page: currentPage,
        limit: 10,
        search: searchTerm
      }));
    } catch (err) {
      console.error('Error saving beneficiary:', err);
    }
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          إدارة المستفيدين
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          إضافة مستفيد جديد
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                إجمالي المستفيدين
              </Typography>
              <Typography variant="h5">
                {pagination?.total || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                الصفحة الحالية
              </Typography>
              <Typography variant="h5">
                {currentPage} من {pagination?.pages || 1}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="ابحث عن مستفيد (الاسم أو البريد الإلكتروني أو الهاتف)"
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* Error Display */}
      {error && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#ffebee', borderRadius: 1, color: '#c62828' }}>
          خطأ: {error}
        </Box>
      )}

      {/* Loading */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : beneficiaries && beneficiaries.length > 0 ? (
        <>
          {/* Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>رقم الملف</TableCell>
                  <TableCell>الاسم الكامل</TableCell>
                  <TableCell>البريد الإلكتروني</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>جهة التأمين</TableCell>
                  <TableCell>تاريخ الإضافة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {beneficiaries.map(beneficiary => (
                  <TableRow key={beneficiary._id} hover>
                    <TableCell>
                      <Chip
                        label={beneficiary.fileNumber}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {beneficiary.firstName} {beneficiary.lastName}
                    </TableCell>
                    <TableCell>{beneficiary.email}</TableCell>
                    <TableCell>{beneficiary.phone}</TableCell>
                    <TableCell>
                      <Chip
                        label={beneficiary.insuranceProvider}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(beneficiary.createdAt).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="عرض التفاصيل">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(beneficiary)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(beneficiary)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(beneficiary._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={pagination?.pages || 1}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">
            لا توجد بيانات متاحة
          </Typography>
        </Paper>
      )}

      {/* Dialog for Add/Edit */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingId ? 'تعديل المستفيد' : 'إضافة مستفيد جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="الاسم الأول"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="الاسم الأخير"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="الهاتف"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
            <TextField
              fullWidth
              label="تاريخ الميلاد"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="جهة التأمين"
              name="insuranceProvider"
              select
              value={formData.insuranceProvider}
              onChange={handleInputChange}
              SelectProps={{
                native: true
              }}
            >
              <option value="SLIC">SLIC</option>
              <option value="Achmea">Achmea</option>
              <option value="Axa">Axa</option>
              <option value="National">National</option>
            </TextField>
            <TextField
              fullWidth
              label="العنوان"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingId ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BeneficiariesPage;
