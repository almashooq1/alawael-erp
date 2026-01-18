import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Avatar
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  FilterList
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const BeneficiariesList = () => {
  const navigate = useNavigate();
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  const loadBeneficiaries = useCallback(async () => {
    try {
      const response = await api.get('/beneficiaries', {
        params: {
          page: page + 1,
          per_page: rowsPerPage,
          search: search
        }
      });

      if (response.data.success) {
        setBeneficiaries(response.data.data);
        setTotal(response.data.pagination.total);
      }
    } catch (error) {
      console.error('Error loading beneficiaries:', error);
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    loadBeneficiaries();
  }, [loadBeneficiaries]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(0);
  };

  const handleMenuOpen = (event, beneficiary) => {
    setAnchorEl(event.currentTarget);
    setSelectedBeneficiary(beneficiary);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedBeneficiary(null);
  };

  const handleView = () => {
    navigate(`/beneficiaries/${selectedBeneficiary.id}`);
    handleMenuClose();
  };

  const handleEdit = () => {
    navigate(`/beneficiaries/${selectedBeneficiary.id}/edit`);
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (window.confirm('هل أنت متأكد من حذف هذا المستفيد؟')) {
      try {
        await api.delete(`/beneficiaries/${selectedBeneficiary.id}`);
        loadBeneficiaries();
      } catch (error) {
        console.error('Error deleting beneficiary:', error);
      }
    }
    handleMenuClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'graduated':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          المستفيدون
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/beneficiaries/new')}
        >
          إضافة مستفيد
        </Button>
      </Box>

      <Card>
        <CardContent>
          {/* Search Bar */}
          <Box display="flex" gap={2} mb={3}>
            <TextField
              fullWidth
              placeholder="البحث عن مستفيد..."
              value={search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
            >
              تصفية
            </Button>
          </Box>

          {/* Table */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>الرقم الوطني</TableCell>
                  <TableCell>نوع الإعاقة</TableCell>
                  <TableCell>العمر</TableCell>
                  <TableCell>ولي الأمر</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {beneficiaries.map((beneficiary) => (
                  <TableRow
                    key={beneficiary.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/beneficiaries/${beneficiary.id}`)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar>
                          {beneficiary.first_name[0]}{beneficiary.last_name[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" fontWeight="medium">
                            {beneficiary.full_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {beneficiary.registration_date}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{beneficiary.national_id}</TableCell>
                    <TableCell>{beneficiary.disability_type || '-'}</TableCell>
                    <TableCell>{beneficiary.age || '-'} سنة</TableCell>
                    <TableCell>{beneficiary.guardian_name}</TableCell>
                    <TableCell>
                      <Chip
                        label={beneficiary.status}
                        size="small"
                        color={getStatusColor(beneficiary.status)}
                      />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, beneficiary)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="عدد الصفوف:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
            }
          />
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default BeneficiariesList;
