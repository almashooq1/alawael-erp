/**
 * Enhanced License Table Component
 * مكون جدول الرخص المحسّن
 * 
 * المميزات:
 * - بحث متقدم
 * - ترتيب ديناميكي
 * - فلترة متعددة المستويات
 * - عرض مرن للأعمدة
 * - إجراءات دفعية
 * - تصدير البيانات
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Paper,
  Box,
  TextField,
  Button,
  Menu,
  MenuItem,
  IconButton,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Grid,
  Card,
  CardContent,
  Typography
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedUserIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';

const EnhancedLicenseTable = ({
  licenses = [],
  loading = false,
  onEdit,
  onDelete,
  onVerify,
  onRenew,
  onRefresh
}) => {
  // ==================== State Management ====================

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({
    column: 'dates.expiry',
    order: 'asc'
  });
  const [selectedLicenses, setSelectedLicenses] = useState(new Set());
  const [filters, setFilters] = useState({
    status: null,
    licenseType: null,
    entityType: null
  });
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    licenseNumber: true,
    entityName: true,
    licenseType: true,
    issueDate: true,
    expiryDate: true,
    status: true,
    action: true
  });

  // ==================== Filter & Search ====================

  const filtered = useMemo(() => {
    let result = licenses.filter(license => {
      // البحث النصي
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          license.licenseNumber?.toLowerCase().includes(query) ||
          license.entity?.name?.toLowerCase().includes(query) ||
          license.entity?.idNumber?.toLowerCase().includes(query);

        if (!matchesSearch) return false;
      }

      // الفلترة حسب الحالة
      if (filters.status && license.status !== filters.status) {
        return false;
      }

      // الفلترة حسب نوع الرخصة
      if (filters.licenseType && license.licenseType !== filters.licenseType) {
        return false;
      }

      // الفلترة حسب نوع الكيان
      if (filters.entityType && license.entity?.type !== filters.entityType) {
        return false;
      }

      return true;
    });

    // الترتيب
    result.sort((a, b) => {
      let aValue, bValue;

      if (sortConfig.column === 'dates.expiry') {
        aValue = new Date(a.dates.expiry);
        bValue = new Date(b.dates.expiry);
      } else if (sortConfig.column === 'entity.name') {
        aValue = a.entity?.name || '';
        bValue = b.entity?.name || '';
      } else if (sortConfig.column === 'licenseType') {
        aValue = a.licenseType || '';
        bValue = b.licenseType || '';
      }

      if (aValue < bValue) {
        return sortConfig.order === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [licenses, searchQuery, filters, sortConfig]);

  // ==================== Pagination ====================

  const paginatedData = filtered.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // ==================== Handlers ====================

  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      setSelectedLicenses(new Set(paginatedData.map(l => l._id)));
    } else {
      setSelectedLicenses(new Set());
    }
  }, [paginatedData]);

  const handleSelectLicense = useCallback((licenseId) => {
    const newSelected = new Set(selectedLicenses);
    if (newSelected.has(licenseId)) {
      newSelected.delete(licenseId);
    } else {
      newSelected.add(licenseId);
    }
    setSelectedLicenses(newSelected);
  }, [selectedLicenses]);

  const handleSort = (column) => {
    setSortConfig(prev => ({
      column,
      order: prev.column === column && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleMenuOpen = (e, license) => {
    setAnchorEl(e.currentTarget);
    setSelectedLicense(license);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedLicense(null);
  };

  // ==================== Helper Functions ====================

  const getStatusColor = (status) => {
    const colors = {
      active: '#4caf50',
      expired: '#f44336',
      suspended: '#ff9800',
      pending_renewal: '#2196f3',
      inactive: '#9e9e9e'
    };
    return colors[status] || '#757575';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'سارية',
      expired: 'منتهية',
      suspended: 'موقوفة',
      pending_renewal: 'قيد التجديد',
      inactive: 'غير نشطة'
    };
    return labels[status] || status;
  };

  const getDaysUntilExpiry = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getExpiryIcon = (expiryDate) => {
    const daysLeft = getDaysUntilExpiry(expiryDate);

    if (daysLeft < 0) {
      return <WarningIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />;
    }
    if (daysLeft <= 30) {
      return <AlertIcon sx={{ color: '#ff9800', fontSize: '1.2rem' }} />;
    }
    return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />;
  };

  // ==================== Render ====================

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header with Search & Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="end">
            {/* Search Field */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="ابحث عن رقم الرخصة أو الاسم..."
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
              />
            </Grid>

            {/* Status Filter */}
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filters.status || ''}
                  label="الحالة"
                  onChange={(e) => {
                    setFilters(prev => ({
                      ...prev,
                      status: e.target.value || null
                    }));
                    setPage(0);
                  }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="active">سارية</MenuItem>
                  <MenuItem value="expired">منتهية</MenuItem>
                  <MenuItem value="suspended">موقوفة</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* License Type Filter */}
            <Grid item xs={12} sm={6} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select
                  value={filters.licenseType || ''}
                  label="النوع"
                  onChange={(e) => {
                    setFilters(prev => ({
                      ...prev,
                      licenseType: e.target.value || null
                    }));
                    setPage(0);
                  }}
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="CR">سجل تجاري</MenuItem>
                  <MenuItem value="ML">رخصة بلدية</MenuItem>
                  <MenuItem value="CD">دفاع مدني</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12} sm={6} md={2.5}>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تحديث">
                  <IconButton
                    onClick={onRefresh}
                    disabled={loading}
                    size="small"
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>

                <Tooltip title="تصدير">
                  <IconButton size="small">
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>
          </Grid>

          {/* Quick Stats */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip
              label={`الكل: ${filtered.length}`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`سارية: ${filtered.filter(l => l.status === 'active').length}`}
              color="success"
              size="small"
              variant="outlined"
            />
            <Chip
              label={`منتهية: ${filtered.filter(l => l.status === 'expired').length}`}
              color="error"
              size="small"
              variant="outlined"
            />
            <Chip
              label={`قريبة: ${filtered.filter(l => {
                const days = getDaysUntilExpiry(l.dates.expiry);
                return days > 0 && days <= 30;
              }).length}`}
              color="warning"
              size="small"
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Table */}
      <TableContainer component={Paper}>
        {loading && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '300px'
          }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && paginatedData.length === 0 && (
          <Box sx={{
            p: 3,
            textAlign: 'center',
            color: 'text.secondary'
          }}>
            <Typography variant="body1">
              لم يتم العثور على رخص مطابقة
            </Typography>
          </Box>
        )}

        {!loading && paginatedData.length > 0 && (
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={
                      selectedLicenses.size > 0 &&
                      selectedLicenses.size < paginatedData.length
                    }
                    checked={
                      selectedLicenses.size === paginatedData.length &&
                      paginatedData.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </TableCell>

                {visibleColumns.licenseNumber && (
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.column === 'licenseNumber'}
                      direction={sortConfig.order}
                      onClick={() => handleSort('licenseNumber')}
                    >
                      رقم الرخصة
                    </TableSortLabel>
                  </TableCell>
                )}

                {visibleColumns.entityName && (
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.column === 'entity.name'}
                      direction={sortConfig.order}
                      onClick={() => handleSort('entity.name')}
                    >
                      اسم الكيان
                    </TableSortLabel>
                  </TableCell>
                )}

                {visibleColumns.licenseType && (
                  <TableCell>
                    نوع الرخصة
                  </TableCell>
                )}

                {visibleColumns.issueDate && (
                  <TableCell>
                    تاريخ الإصدار
                  </TableCell>
                )}

                {visibleColumns.expiryDate && (
                  <TableCell>
                    <TableSortLabel
                      active={sortConfig.column === 'dates.expiry'}
                      direction={sortConfig.order}
                      onClick={() => handleSort('dates.expiry')}
                    >
                      تاريخ الانتهاء
                    </TableSortLabel>
                  </TableCell>
                )}

                {visibleColumns.status && (
                  <TableCell>
                    الحالة
                  </TableCell>
                )}

                {visibleColumns.action && (
                  <TableCell align="center">
                    الإجراءات
                  </TableCell>
                )}
              </TableRow>
            </TableHead>

            <TableBody>
              {paginatedData.map(license => (
                <TableRow
                  key={license._id}
                  hover
                  sx={{
                    backgroundColor: selectedLicenses.has(license._id)
                      ? 'action.selected'
                      : 'inherit'
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedLicenses.has(license._id)}
                      onChange={() => handleSelectLicense(license._id)}
                    />
                  </TableCell>

                  {visibleColumns.licenseNumber && (
                    <TableCell sx={{ fontWeight: 600 }}>
                      {license.licenseNumber}
                    </TableCell>
                  )}

                  {visibleColumns.entityName && (
                    <TableCell>
                      {license.entity?.name}
                    </TableCell>
                  )}

                  {visibleColumns.licenseType && (
                    <TableCell>
                      <Chip
                        label={license.licenseType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                  )}

                  {visibleColumns.issueDate && (
                    <TableCell size="small">
                      {new Date(license.dates.issued).toLocaleDateString('ar')}
                    </TableCell>
                  )}

                  {visibleColumns.expiryDate && (
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getExpiryIcon(license.dates.expiry)}
                        {new Date(license.dates.expiry).toLocaleDateString('ar')}
                      </Box>
                    </TableCell>
                  )}

                  {visibleColumns.status && (
                    <TableCell>
                      <Chip
                        label={getStatusLabel(license.status)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(license.status),
                          color: 'white'
                        }}
                      />
                    </TableCell>
                  )}

                  {visibleColumns.action && (
                    <TableCell align="center">
                      <Tooltip title="المزيد">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, license)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filtered.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage="عدد الصفوف:"
        labelDisplayedRows={({ from, to, count }) =>
          `${from}–${to} من ${count}`
        }
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            onEdit?.(selectedLicense);
            handleMenuClose();
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>

        <MenuItem
          onClick={() => {
            onRenew?.(selectedLicense);
            handleMenuClose();
          }}
        >
          <ScheduleIcon fontSize="small" sx={{ mr: 1 }} />
          تجديد
        </MenuItem>

        <MenuItem
          onClick={() => {
            onVerify?.(selectedLicense);
            handleMenuClose();
          }}
        >
          <VerifiedUserIcon fontSize="small" sx={{ mr: 1 }} />
          التحقق
        </MenuItem>

        <MenuItem
          onClick={() => {
            onDelete?.(selectedLicense);
            handleMenuClose();
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
          حذف
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EnhancedLicenseTable;
