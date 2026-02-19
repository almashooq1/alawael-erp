import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Button,
  TablePagination,
  Chip,
  CircularProgress,
  Card,
  CardHeader,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../utils/api';

export default function EnhancedDataTable({ entityType = 'suppliers', columns = [], title = '' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});

  // Fetch data with pagination and filters
  const fetchData = async (pageNum = 0, pageSize = 10, search = '', status = '') => {
    setLoading(true);
    try {
      let url = `/api/${entityType}?page=${pageNum + 1}&limit=${pageSize}`;

      if (search) {
        url += `&search=${encodeURIComponent(search)}`;
      }

      if (status) {
        url += `&status=${status}`;
      }

      const response = await apiClient.get(url);
      const { data: items, pagination } = response.data;

      setData(items);
      setTotalItems(pagination.totalDocuments);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchData(0, rowsPerPage, searchTerm, filterStatus);
  }, [entityType]);

  // Handle pagination
  const handleChangePage = (event, newPage) => {
    fetchData(newPage, rowsPerPage, searchTerm, filterStatus);
  };

  const handleChangeRowsPerPage = (event) => {
    const newRowsPerPage = parseInt(event.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    fetchData(0, newRowsPerPage, searchTerm, filterStatus);
  };

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setPage(0);
    fetchData(0, rowsPerPage, value, filterStatus);
  };

  // Handle filter
  const handleFilterChange = (e) => {
    const value = e.target.value;
    setFilterStatus(value);
    setPage(0);
    fetchData(0, rowsPerPage, searchTerm, value);
  };

  // Handle add/edit
  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingId(item._id);
      setFormData(item);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await apiClient.put(`/api/${entityType}/${editingId}`, formData);
      } else {
        await apiClient.post(`/api/${entityType}`, formData);
      }
      handleCloseDialog();
      fetchData(page, rowsPerPage, searchTerm, filterStatus);
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await apiClient.delete(`/api/${entityType}/${id}`);
        fetchData(page, rowsPerPage, searchTerm, filterStatus);
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      'active': 'success',
      'inactive': 'error',
      'pending': 'warning',
      'completed': 'success',
      'cancelled': 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Card sx={{ mb: 4 }}>
      <CardHeader
        title={title}
        subheader={`Total: ${totalItems} items`}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add New
          </Button>
        }
      />
      <CardContent>
        {/* Search and Filter Bar */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              label="Filter by Status"
              value={filterStatus}
              onChange={handleFilterChange}
              SelectProps={{ native: true }}
              size="small"
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </TextField>
          </Grid>
        </Grid>

        {/* Data Table */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col.id} align={col.align || 'left'}>
                        <strong>{col.label}</strong>
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <strong>Actions</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.map((row) => (
                    <TableRow
                      key={row._id}
                      sx={{ '&:hover': { backgroundColor: '#f9f9f9' } }}
                    >
                      {columns.map((col) => (
                        <TableCell key={col.id} align={col.align || 'left'}>
                          {col.format ? col.format(row[col.id]) : row[col.id]}
                          {col.id === 'status' && (
                            <Chip
                              label={row.status}
                              size="small"
                              color={getStatusColor(row.status)}
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                      ))}
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenDialog(row)}
                          sx={{ mr: 1 }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          color="error"
                          onClick={() => handleDelete(row._id)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              component="div"
              count={totalItems}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              sx={{ mt: 2 }}
            />
          </>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Edit Item' : 'Add New Item'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {/* Dynamic form fields */}
          {columns.map((col) => (
            <TextField
              key={col.id}
              fullWidth
              label={col.label}
              value={formData[col.id] || ''}
              onChange={(e) => setFormData({ ...formData, [col.id]: e.target.value })}
              margin="normal"
              type={col.type || 'text'}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
