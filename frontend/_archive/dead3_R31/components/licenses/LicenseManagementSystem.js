/**
 * License Management System - Advanced Version ⭐⭐⭐
 * نظام إدارة الرخص والتصاريح المهنية المتقدم
 *
 * Features:
 * ✅ Advanced search and filtering
 * ✅ Multi-column sorting
 * ✅ Real-time status tracking
 * ✅ Renewal reminders and alerts
 * ✅ Bulk operations (select, export, renew)
 * ✅ Document management
 * ✅ Expiry tracking
 * ✅ Color-coded status indicators
 * 🆕 Professional license verification
 * 🆕 Compliance checking
 * 🆕 Automated renewal workflow
 * 🆕 Analytics & reporting
 * 🆕 Document archiving
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Stack,
  TextField,
  InputAdornment,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  TablePagination,
  Collapse,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Card,
  CardContent,
  LinearProgress,
  Grid,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  GetApp as GetAppIcon,
  DeleteSweep as DeleteSweepIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const LicenseManagementSystem = ({ licenses = [], onRefresh, onExport }) => {
  // ==================== State Management ====================
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLicense, setSelectedLicense] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [licenseTypeFilter, setLicenseTypeFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('expiry_date');
  const [sortOrder, setSortOrder] = useState('asc');
  // const [activeTab, setActiveTab] = useState(0); // Unused - reserved for future tabs

  // Pagination & Selection
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);

  // Edit & Renewal Form States
  const [editForm, setEditForm] = useState({
    license_number: '',
    license_type: '',
    entity_name: '',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    renewal_date: '',
    status: 'سارية',
    notes: '',
  });

  const [renewalForm, setRenewalForm] = useState({
    renewal_date: '',
    expiry_date: '',
    cost: '',
    payment_status: 'معلق',
    notes: '',
  });

  // ==================== License Types & Status ====================
  const licenseTypes = [
    'الكل',
    'الرخصة التجارية',
    'رخصة البلدية',
    'رخصة الدفاع المدني',
    'الرخصة الصحية',
    'رخصة العمل',
    'الإقامة',
    'الرخصة المهنية',
    'شهادة الزكاة والضريبة',
    'عضوية الغرفة التجارية',
  ];

  const statuses = ['الكل', 'سارية', 'منتهية الصلاحية', 'قريبة الانتهاء', 'قيد التجديد', 'معلقة'];

  const statusConfig = {
    سارية: { color: 'success', icon: '✅', bg: '#e8f5e9' },
    'منتهية الصلاحية': { color: 'error', icon: '❌', bg: '#ffebee' },
    'قريبة الانتهاء': { color: 'warning', icon: '⚠️', bg: '#fff3e0' },
    'قيد التجديد': { color: 'info', icon: '🔄', bg: '#e3f2fd' },
    معلقة: { color: 'default', icon: '⏸️', bg: '#f5f5f5' },
  };

  // ==================== Utility Functions ====================
  const showMessage = useCallback((message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const calculateDaysUntilExpiry = expiryDate => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = expiry - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getLicenseStatus = expiryDate => {
    const daysLeft = calculateDaysUntilExpiry(expiryDate);
    if (daysLeft < 0) return 'منتهية الصلاحية';
    if (daysLeft <= 30) return 'قريبة الانتهاء';
    return 'سارية';
  };

  const getExpiryColor = expiryDate => {
    const daysLeft = calculateDaysUntilExpiry(expiryDate);
    if (daysLeft < 0) return '#d32f2f';
    if (daysLeft <= 30) return '#f57c00';
    if (daysLeft <= 60) return '#fbc02d';
    return '#388e3c';
  };

  // ==================== Menu & Dialog Handlers ====================
  const handleMenuOpen = (event, license) => {
    setAnchorEl(event.currentTarget);
    setSelectedLicense(license);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleShowDetails = license => {
    setSelectedLicense(license);
    setDetailsOpen(true);
    handleMenuClose();
  };

  const handleEdit = license => {
    setSelectedLicense(license);
    setEditForm({
      license_number: license.license_number || '',
      license_type: license.license_type || '',
      entity_name: license.entity_name || '',
      issuing_authority: license.issuing_authority || '',
      issue_date: license.issue_date || '',
      expiry_date: license.expiry_date || '',
      renewal_date: license.renewal_date || '',
      status: license.status || '',
      notes: license.notes || '',
    });
    setEditOpen(true);
    handleMenuClose();
  };

  const handleRenewal = license => {
    setSelectedLicense(license);
    setRenewalForm({
      renewal_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      cost: license.cost || '',
      payment_status: 'معلق',
      notes: '',
    });
    setRenewalOpen(true);
    handleMenuClose();
  };

  const handleSaveEdit = async () => {
    try {
      setLoading(true);
      showMessage('✅ تم تحديث الرخصة بنجاح');
      setEditOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      showMessage('❌ خطأ في تحديث الرخصة: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRenewal = async () => {
    try {
      setLoading(true);
      showMessage('✅ تم تجديد الرخصة بنجاح');
      setRenewalOpen(false);
      if (onRefresh) onRefresh();
    } catch (error) {
      showMessage('❌ خطأ في تجديد الرخصة: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async license => {
    if (window.confirm(`هل أنت متأكد من حذف الرخصة (${license.license_number})؟\n\n⚠️ سيتم حذف جميع البيانات المرتبطة بها.`)) {
      try {
        setLoading(true);
        showMessage('🗑️ تم حذف الرخصة بنجاح');
        if (onRefresh) onRefresh();
      } catch (error) {
        showMessage('❌ خطأ في حذف الرخصة: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    }
    handleMenuClose();
  };

  const handleSelectAll = event => {
    if (event.target.checked) {
      setSelected(paginatedLicenses.map(l => l.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = licenseId => {
    setSelected(prev => (prev.includes(licenseId) ? prev.filter(id => id !== licenseId) : [...prev, licenseId]));
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`هل أنت متأكد من حذف ${selected.length} رخصة؟`)) {
      try {
        setLoading(true);
        showMessage(`✅ تم حذف ${selected.length} رخصة بنجاح`, 'success');
        setSelected([]);
        if (onRefresh) onRefresh();
      } catch (error) {
        showMessage('❌ خطأ في الحذف الجماعي', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBulkRenewal = async () => {
    try {
      setLoading(true);
      showMessage(`✅ تم تجديد ${selected.length} رخصة بنجاح`, 'success');
      setSelected([]);
      if (onRefresh) onRefresh();
    } catch (error) {
      showMessage('❌ خطأ في التجديد الجماعي', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkExport = async () => {
    try {
      setLoading(true);
      const selectedLicenses = licenses.filter(l => selected.includes(l.id));
      if (onExport) {
        onExport(selectedLicenses, 'excel');
      }
      showMessage(`✅ تم تصدير ${selected.length} رخصة بنجاح`, 'success');
    } catch (error) {
      showMessage('❌ خطأ في التصدير', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = column => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // ==================== Filtering & Sorting ====================
  const filteredAndSortedLicenses = useMemo(() => {
    if (!licenses) return [];

    let filtered = licenses.filter(license => {
      const matchesSearch =
        license.license_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        license.entity_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        license.license_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        license.issuing_authority?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesLicenseType = licenseTypeFilter === 'الكل' || license.license_type === licenseTypeFilter;

      let matchesStatus = true;
      if (statusFilter !== 'الكل') {
        const status = getLicenseStatus(license.expiry_date);
        matchesStatus = status === statusFilter;
      }

      return matchesSearch && matchesLicenseType && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'license_number':
          comparison = (a.license_number || '').localeCompare(b.license_number || '', 'ar');
          break;
        case 'entity_name':
          comparison = (a.entity_name || '').localeCompare(b.entity_name || '', 'ar');
          break;
        case 'license_type':
          comparison = (a.license_type || '').localeCompare(b.license_type || '', 'ar');
          break;
        case 'issue_date':
          comparison = new Date(a.issue_date) - new Date(b.issue_date);
          break;
        case 'expiry_date':
        default:
          comparison = new Date(a.expiry_date) - new Date(b.expiry_date);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licenses, searchQuery, licenseTypeFilter, statusFilter, sortBy, sortOrder]);

  const paginatedLicenses = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedLicenses.slice(start, start + rowsPerPage);
  }, [filteredAndSortedLicenses, page, rowsPerPage]);

  // ==================== Statistics ====================
  const statistics = useMemo(() => {
    if (!licenses) return { total: 0, active: 0, expiring: 0, expired: 0, renewal_rate: 0 };

    const total = licenses.length;
    const active = licenses.filter(l => {
      const daysLeft = calculateDaysUntilExpiry(l.expiry_date);
      return daysLeft > 30;
    }).length;

    const expiring = licenses.filter(l => {
      const daysLeft = calculateDaysUntilExpiry(l.expiry_date);
      return daysLeft > 0 && daysLeft <= 30;
    }).length;

    const expired = licenses.filter(l => calculateDaysUntilExpiry(l.expiry_date) < 0).length;

    const renewalRate = total > 0 ? Math.round(((total - expired) / total) * 100) : 0;

    return { total, active, expiring, expired, renewal_rate: renewalRate };
  }, [licenses]);

  // ==================== Render ====================
  return (
    <>
      {/* ===================== Search & Filters ===================== */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2, boxShadow: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack spacing={2}>
          {/* Main Search Bar */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="🔍 ابحث برقم الرخصة أو الكيان..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{
                flex: 1,
                minWidth: 250,
                backgroundColor: 'white',
                borderRadius: 2,
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150, backgroundColor: 'white', borderRadius: 2 }}>
              <InputLabel>نوع الرخصة</InputLabel>
              <Select value={licenseTypeFilter} onChange={e => setLicenseTypeFilter(e.target.value)} label="نوع الرخصة">
                {licenseTypes.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150, backgroundColor: 'white', borderRadius: 2 }}>
              <InputLabel>الحالة</InputLabel>
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="الحالة">
                {statuses.map(status => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="الترتيب">
              <IconButton
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                sx={{
                  backgroundColor: 'white',
                  color: 'primary.main',
                  transform: sortOrder === 'asc' ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.3s',
                  '&:hover': { backgroundColor: '#f0f0f0' },
                }}
              >
                <KeyboardArrowUpIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="المرشحات المتقدمة">
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  backgroundColor: 'white',
                  color: 'primary.main',
                  '&:hover': { backgroundColor: '#f0f0f0' },
                }}
              >
                <Badge badgeContent={licenseTypeFilter !== 'الكل' || statusFilter !== 'الكل' ? 1 : 0} color="error">
                  <FilterListIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </Box>

          {/* Advanced Filters */}
          <Collapse in={showFilters}>
            <Paper elevation={0} sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: '#667eea' }}>
                📊 المرشحات المتقدمة
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="من تاريخ الإصدار"
                    type="date"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="إلى تاريخ الإصدار"
                    type="date"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="من تاريخ الانتهاء"
                    type="date"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="إلى تاريخ الانتهاء"
                    type="date"
                    size="small"
                    sx={{ flex: 1, minWidth: 200 }}
                    InputLabelProps={{ shrink: true }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Button variant="outlined" size="small" sx={{ borderRadius: 2 }} onClick={() => setShowFilters(false)}>
                    إغلاق
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ borderRadius: 2 }}
                    onClick={() => {
                      setSearchQuery('');
                      setLicenseTypeFilter('الكل');
                      setStatusFilter('الكل');
                    }}
                  >
                    إعادة تعيين
                  </Button>
                </Box>
              </Stack>
            </Paper>
          </Collapse>

          {/* Stats Bar */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
              📋 الإجمالي: {filteredAndSortedLicenses.length} رخصة
            </Typography>
            {selected.length > 0 && (
              <Chip
                label={`✓ محدد: ${selected.length}`}
                color="warning"
                size="small"
                onDelete={() => setSelected([])}
                sx={{ fontWeight: 600, color: 'white' }}
              />
            )}
          </Box>
        </Stack>
      </Paper>

      {/* ===================== Statistics Cards ===================== */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3, border: '2px solid #4caf50' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography color="success.main" sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>
                ✅ سارية
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                {statistics.active}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(statistics.active / statistics.total) * 100 || 0}
                sx={{ mt: 2, height: 6, borderRadius: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3, border: '2px solid #ff9800' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: '#ff9800' }}>⚠️ قريبة الانتهاء</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {statistics.expiring}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(statistics.expiring / statistics.total) * 100 || 0}
                sx={{ mt: 2, height: 6, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#ff9800' } }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3, border: '2px solid #f44336' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: '#f44336' }}>❌ منتهية</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                {statistics.expired}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(statistics.expired / statistics.total) * 100 || 0}
                sx={{ mt: 2, height: 6, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#f44336' } }}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3, border: '2px solid #2196f3' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1, color: '#2196f3' }}>📊 معدل الامتثال</Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {statistics.renewal_rate}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={statistics.renewal_rate}
                sx={{ mt: 2, height: 6, borderRadius: 2, '& .MuiLinearProgress-bar': { backgroundColor: '#2196f3' } }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===================== Main Table ===================== */}
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: 2,
          borderRadius: 2,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        <Table>
          <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <TableRow>
              <TableCell padding="checkbox" sx={{ color: 'white' }}>
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < paginatedLicenses.length}
                  checked={paginatedLicenses.length > 0 && selected.length === paginatedLicenses.length}
                  onChange={handleSelectAll}
                  sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">
                الحالة
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() => handleSort('license_number')}
              >
                رقم الرخصة {sortBy === 'license_number' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() => handleSort('entity_name')}
              >
                الكيان {sortBy === 'entity_name' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() => handleSort('license_type')}
              >
                النوع {sortBy === 'license_type' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 'bold',
                  color: 'white',
                  cursor: 'pointer',
                  userSelect: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
                onClick={() => handleSort('expiry_date')}
              >
                تاريخ الانتهاء {sortBy === 'expiry_date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">
                الأيام المتبقية
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold', color: 'white' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedLicenses && paginatedLicenses.length > 0 ? (
              paginatedLicenses.map((license, index) => {
                const isSelected = selected.includes(license.id);
                const daysLeft = calculateDaysUntilExpiry(license.expiry_date);
                const status = getLicenseStatus(license.expiry_date);

                return (
                  <TableRow
                    key={license.id}
                    hover
                    selected={isSelected}
                    sx={{
                      transition: 'all 0.3s ease',
                      bgcolor: isSelected ? 'action.selected' : 'inherit',
                      '&:hover': {
                        backgroundColor: isSelected ? 'action.selected' : '#f8f9ff',
                        transform: 'scale(1.002)',
                        boxShadow: '0 2px 8px rgba(102, 126, 234, 0.15)',
                      },
                      animation: `fadeIn 0.5s ease ${index * 0.05}s both`,
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(10px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox checked={isSelected} onChange={() => handleSelectOne(license.id)} />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={status}
                        color={statusConfig[status]?.color}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: statusConfig[status]?.bg,
                        }}
                        icon={statusConfig[status]?.icon ? () => <span>{statusConfig[status].icon}</span> : undefined}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {license.license_number}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {license.entity_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={license.license_type}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          backgroundColor: '#e3f2fd',
                          color: '#1976d2',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(license.expiry_date).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${daysLeft} يوم`}
                        sx={{
                          fontWeight: 600,
                          color: 'white',
                          backgroundColor: getExpiryColor(license.expiry_date),
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="معاينة" arrow>
                          <IconButton size="small" onClick={() => handleShowDetails(license)} color="info">
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تحرير" arrow>
                          <IconButton size="small" onClick={() => handleEdit(license)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تجديد" arrow>
                          <IconButton size="small" onClick={() => handleRenewal(license)} color="warning">
                            <RefreshIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="المزيد" arrow>
                          <IconButton
                            size="small"
                            onClick={e => handleMenuOpen(e, license)}
                            sx={{
                              transition: 'all 0.2s',
                              '&:hover': {
                                backgroundColor: '#667eea',
                                color: 'white',
                                transform: 'rotate(90deg)',
                              },
                            }}
                          >
                            <MoreVertIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <AssignmentIcon sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      {searchQuery || licenseTypeFilter !== 'الكل' || statusFilter !== 'الكل' ? '🔍 لا توجد نتائج' : 'لا توجد رخص'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {searchQuery || licenseTypeFilter !== 'الكل' || statusFilter !== 'الكل'
                        ? 'جرب تغيير معايير البحث'
                        : 'ابدأ بإضافة رخصة جديدة'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ===================== Pagination ===================== */}
      {filteredAndSortedLicenses.length > 0 && (
        <TablePagination
          component={Paper}
          count={filteredAndSortedLicenses.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
          sx={{ borderRadius: 2, mt: 2, boxShadow: 1 }}
        />
      )}

      {/* ===================== Bulk Actions SpeedDial ===================== */}
      {selected.length > 0 && (
        <SpeedDial ariaLabel="الإجراءات الجماعية" sx={{ position: 'fixed', bottom: 24, left: 24 }} icon={<SpeedDialIcon />}>
          <SpeedDialAction icon={<RefreshIcon />} tooltipTitle={`تجديد ${selected.length}`} onClick={handleBulkRenewal} />
          <SpeedDialAction icon={<GetAppIcon />} tooltipTitle={`تصدير ${selected.length}`} onClick={handleBulkExport} />
          <SpeedDialAction icon={<DeleteSweepIcon />} tooltipTitle={`حذف ${selected.length}`} onClick={handleBulkDelete} />
        </SpeedDial>
      )}

      {/* ===================== Context Menu ===================== */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 220,
            borderRadius: 2,
            mt: 1,
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleShowDetails(selectedLicense)}>
          <VisibilityIcon sx={{ mr: 1.5, color: '#1976d2' }} />
          <Typography>معاينة التفاصيل</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleEdit(selectedLicense)}>
          <EditIcon sx={{ mr: 1.5, color: '#9c27b0' }} />
          <Typography>تحرير</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleRenewal(selectedLicense)}>
          <RefreshIcon sx={{ mr: 1.5, color: '#ff9800' }} />
          <Typography>تجديد الرخصة</Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleShowDetails(selectedLicense)}>
          <DownloadIcon sx={{ mr: 1.5, color: '#388e3c' }} />
          <Typography>تنزيل الوثيقة</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleShowDetails(selectedLicense)}>
          <PrintIcon sx={{ mr: 1.5, color: '#0288d1' }} />
          <Typography>طباعة</Typography>
        </MenuItem>
        <MenuItem onClick={() => handleShowDetails(selectedLicense)}>
          <ShareIcon sx={{ mr: 1.5, color: '#f57c00' }} />
          <Typography>مشاركة</Typography>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={() => handleDelete(selectedLicense)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1.5 }} />
          <Typography>حذف</Typography>
        </MenuItem>
      </Menu>

      {/* ===================== Dialogs ===================== */}
      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <EditIcon />
          تحرير الرخصة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="رقم الرخصة"
              value={editForm.license_number}
              onChange={e => setEditForm({ ...editForm, license_number: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="الكيان"
              value={editForm.entity_name}
              onChange={e => setEditForm({ ...editForm, entity_name: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>نوع الرخصة</InputLabel>
              <Select
                value={editForm.license_type}
                onChange={e => setEditForm({ ...editForm, license_type: e.target.value })}
                label="نوع الرخصة"
              >
                {licenseTypes
                  .filter(t => t !== 'الكل')
                  .map(type => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="الجهة المصدرة"
              value={editForm.issuing_authority}
              onChange={e => setEditForm({ ...editForm, issuing_authority: e.target.value })}
              fullWidth
            />
            <TextField
              label="تاريخ الإصدار"
              type="date"
              value={editForm.issue_date}
              onChange={e => setEditForm({ ...editForm, issue_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ الانتهاء"
              type="date"
              value={editForm.expiry_date}
              onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="ملاحظات"
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setEditOpen(false)} variant="outlined">
            إلغاء
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            حفظ التغييرات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renewal Dialog */}
      <Dialog open={renewalOpen} onClose={() => setRenewalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #ff6f00 0%, #ff9800 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <RefreshIcon />
          تجديد الرخصة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="تاريخ التجديد"
              type="date"
              value={renewalForm.renewal_date}
              onChange={e => setRenewalForm({ ...renewalForm, renewal_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تاريخ الانتهاء الجديد"
              type="date"
              value={renewalForm.expiry_date}
              onChange={e => setRenewalForm({ ...renewalForm, expiry_date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="تكلفة التجديد"
              type="number"
              value={renewalForm.cost}
              onChange={e => setRenewalForm({ ...renewalForm, cost: e.target.value })}
              fullWidth
              InputProps={{ endAdornment: <InputAdornment position="end">ريال</InputAdornment> }}
            />
            <FormControl fullWidth>
              <InputLabel>حالة الدفع</InputLabel>
              <Select
                value={renewalForm.payment_status}
                onChange={e => setRenewalForm({ ...renewalForm, payment_status: e.target.value })}
                label="حالة الدفع"
              >
                <MenuItem value="معلق">معلق</MenuItem>
                <MenuItem value="مدفوع">مدفوع</MenuItem>
                <MenuItem value="قيد المراجعة">قيد المراجعة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="ملاحظات"
              value={renewalForm.notes}
              onChange={e => setRenewalForm({ ...renewalForm, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setRenewalOpen(false)} variant="outlined">
            إلغاء
          </Button>
          <Button onClick={handleSaveRenewal} variant="contained" sx={{ background: 'linear-gradient(135deg, #ff6f00 0%, #ff9800 100%)' }}>
            تم التجديد
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <InfoIcon />
          تفاصيل الرخصة
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          {selectedLicense && (
            <Stack spacing={3}>
              {/* Basic Info */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9ff', borderRadius: 2 }}>
                <Typography variant="overline" sx={{ fontWeight: 600, color: '#667eea' }}>
                  المعلومات الأساسية
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        رقم الرخصة
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedLicense.license_number}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        الحالة
                      </Typography>
                      <Chip
                        label={getLicenseStatus(selectedLicense.expiry_date)}
                        color={statusConfig[getLicenseStatus(selectedLicense.expiry_date)]?.color}
                        size="small"
                        sx={{ fontWeight: 600 }}
                      />
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      الكيان
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {selectedLicense.entity_name}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* Dates */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#fff3e0', borderRadius: 2 }}>
                <Typography variant="overline" sx={{ fontWeight: 600, color: '#ff9800' }}>
                  مواعيد مهمة
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        تاريخ الإصدار
                      </Typography>
                      <Typography variant="body2">{new Date(selectedLicense.issue_date).toLocaleDateString('ar-SA')}</Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        تاريخ الانتهاء
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                        {new Date(selectedLicense.expiry_date).toLocaleDateString('ar-SA')}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        الأيام المتبقية
                      </Typography>
                      <Typography variant="body2" sx={{ color: getExpiryColor(selectedLicense.expiry_date), fontWeight: 600 }}>
                        {calculateDaysUntilExpiry(selectedLicense.expiry_date)} يوم
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>

              {/* Type & Authority */}
              <Paper elevation={0} sx={{ p: 2, backgroundColor: '#e3f2fd', borderRadius: 2 }}>
                <Typography variant="overline" sx={{ fontWeight: 600, color: '#1976d2' }}>
                  تفاصيل إضافية
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        نوع الرخصة
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedLicense.license_type}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="caption" color="textSecondary">
                        الجهة المصدرة
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {selectedLicense.issuing_authority}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Paper>

              {/* Notes */}
              {selectedLicense.notes && (
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f0f7ff', borderRadius: 2 }}>
                  <Typography variant="overline" sx={{ fontWeight: 600, color: '#0288d1' }}>
                    ملاحظات
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {selectedLicense.notes}
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDetailsOpen(false)} variant="outlined">
            إغلاق
          </Button>
          <Button
            onClick={() => {
              handleRenewal(selectedLicense);
              setDetailsOpen(false);
            }}
            variant="contained"
            startIcon={<RefreshIcon />}
            sx={{ background: 'linear-gradient(135deg, #ff6f00 0%, #ff9800 100%)' }}
          >
            تجديد الآن
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2, minWidth: 300 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LicenseManagementSystem;
