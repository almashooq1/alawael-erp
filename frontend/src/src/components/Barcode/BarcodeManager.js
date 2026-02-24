/**
 * Barcode Manager Component
 * List, view, and manage barcodes
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Stack,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarcodeService from '../../services/BarcodeService';

const BarcodeManager = () => {
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('');
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [totalBarcodes, setTotalBarcodes] = useState(0);

  // Load barcodes on component mount or filter change
  useEffect(() => {
    loadBarcodes();
  }, [page, rowsPerPage, search, selectedEntityType]);

  const loadBarcodes = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await BarcodeService.listBarcodes({
        page: page + 1,
        limit: rowsPerPage,
        search,
        entityType: selectedEntityType || undefined,
        status: 'ACTIVE',
      });

      setBarcodes(result.barcodes);
      setTotalBarcodes(result.pagination.total);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load barcodes',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async barcode => {
    try {
      const result = await BarcodeService.getBarcodeById(barcode._id);
      setSelectedBarcode(result.barcode);
      setDetailsOpen(true);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to load barcode details',
      });
    }
  };

  const handleDeleteClick = barcode => {
    setSelectedBarcode(barcode);
    setDeleteReason('');
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await BarcodeService.deactivateBarcode(selectedBarcode._id, deleteReason);

      setMessage({
        type: 'success',
        text: 'Barcode deactivated successfully',
      });

      setDeleteConfirmOpen(false);
      loadBarcodes();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.message || 'Failed to deactivate barcode',
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = status => {
    const colors = {
      ACTIVE: 'success',
      INACTIVE: 'warning',
      ARCHIVED: 'default',
      REVOKED: 'error',
    };
    return colors[status] || 'default';
  };

  return (
    <Box sx={{ width: '100%' }}>
      {message.text && (
        <Alert
          severity={message.type}
          sx={{ mb: 2 }}
          onClose={() => setMessage({ type: '', text: '' })}
        >
          {message.text}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search by code or name..."
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1 }} />,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={selectedEntityType}
                  onChange={e => {
                    setSelectedEntityType(e.target.value);
                    setPage(0);
                  }}
                  label="Entity Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="PRODUCT">Product</MenuItem>
                  <MenuItem value="VEHICLE">Vehicle</MenuItem>
                  <MenuItem value="ASSET">Asset</MenuItem>
                  <MenuItem value="EMPLOYEE">Employee</MenuItem>
                  <MenuItem value="STUDENT">Student</MenuItem>
                  <MenuItem value="PATIENT">Patient</MenuItem>
                  <MenuItem value="INVOICE">Invoice</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Button
                fullWidth
                variant="contained"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={loadBarcodes}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Barcodes Table */}
      <Card>
        <CardHeader title={`Barcodes (Total: ${totalBarcodes})`} />
        <CardContent>
          {loading && <CircularProgress />}

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>
                    <strong>Code</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Type</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Entity</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Scans</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Status</strong>
                  </TableCell>
                  <TableCell>
                    <strong>Actions</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {barcodes.map(barcode => (
                  <TableRow key={barcode._id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{barcode.code}</TableCell>
                    <TableCell>{barcode.barcodeType}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {barcode.entityType}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {barcode.entityName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={barcode.totalScans} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={barcode.status}
                        color={getStatusColor(barcode.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(barcode)}
                          title="View Details"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(barcode)}
                          title="Deactivate"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={totalBarcodes}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Barcode Details</DialogTitle>
        <DialogContent>
          {selectedBarcode && (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Code
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {selectedBarcode.code}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Type
                </Typography>
                <Typography variant="body1">{selectedBarcode.barcodeType}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Entity
                </Typography>
                <Typography variant="body1">
                  {selectedBarcode.entityType} - {selectedBarcode.entityName}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Total Scans
                </Typography>
                <Typography variant="body1">{selectedBarcode.totalScans}</Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Status
                </Typography>
                <Chip label={selectedBarcode.status} color="primary" />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Created
                </Typography>
                <Typography variant="caption">
                  {new Date(selectedBarcode.createdAt).toLocaleString()}
                </Typography>
              </Box>

              {selectedBarcode.lastScannedAt && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Last Scanned
                  </Typography>
                  <Typography variant="caption">
                    {new Date(selectedBarcode.lastScannedAt).toLocaleString()}
                  </Typography>
                </Box>
              )}

              {selectedBarcode.tags && selectedBarcode.tags.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary">
                    Tags
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                    {selectedBarcode.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Deactivate Barcode</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>Are you sure you want to deactivate this barcode?</Typography>
          <TextField
            fullWidth
            label="Reason (optional)"
            multiline
            rows={3}
            value={deleteReason}
            onChange={e => setDeleteReason(e.target.value)}
            placeholder="Enter deactivation reason..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BarcodeManager;
