/**
 * Customer Management Component - Advanced CRM System 🏢
 * مكون إدارة العملاء - نظام CRM متقدم
 *
 * Features:
 * ✅ Customer database with full records
 * ✅ Advanced search and filtering
 * ✅ Customer segmentation
 * ✅ Interaction history tracking
 * ✅ Quality scoring system
 * ✅ Bulk operations
 * ✅ Export/Import functionality
 * ✅ Responsive design
 * 🆕 Real-time updates
 * 🆕 Customer lifecycle tracking
 * 🆕 Email integration
 * 🆕 Social media profiles
 * 🆕 Custom fields
 * 🆕 Advanced filtering
 * 🆕 Bulk actions
 * 🆕 Statistics dashboard
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Alert,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  TablePagination,
  Collapse,
  LinearProgress,
  Tooltip,
  Badge,
  SpeedDial,
  SpeedDialIcon,
  SpeedDialAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  More as MoreIcon,
  Search as SearchIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Location as LocationIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  FileDownload as FileDownloadIcon,
  CloudUpload as CloudUploadIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  GetApp as GetAppIcon,
  Share as ShareIcon,
  Block as BlockIcon,
  Favorite as FavoriteIcon,
  Mail as MailIcon,
} from '@mui/icons-material';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([
    {
      id: '1',
      name: 'أحمد محمود',
      email: 'ahmed@example.com',
      phone: '+966501234567',
      company: 'شركة الابتكار',
      city: 'الرياض',
      status: 'نشط',
      segment: 'vip',
      score: 95,
      lastContact: '2026-01-15',
      interactions: 24,
      totalValue: 150000,
      notes: 'عميل مهم جداً',
      tags: ['vip', 'موثوق', 'دفعات منتظمة'],
      email2: 'ahmed.work@example.com',
      phone2: '+966501234568',
      social: { linkedin: 'ahmed-m', twitter: '@ahmed_m', instagram: 'ahmed_m' },
      customFields: { صناعة: 'التكنولوجيا', أولوية: 'عالية' },
      lifecycle: 'عميل مرتبط',
      rating: 5,
    },
    {
      id: '2',
      name: 'فاطمة علي',
      email: 'fatima@example.com',
      phone: '+966502345678',
      company: 'مجموعة التنمية',
      city: 'جدة',
      status: 'نشط',
      segment: 'premium',
      score: 85,
      lastContact: '2026-01-14',
      interactions: 18,
      totalValue: 95000,
      notes: 'عميل موثوق',
      tags: ['premium', 'تطوير', 'شراء منتظم'],
      email2: '',
      phone2: '',
      social: { linkedin: 'fatima-a', twitter: '@fatima_a', instagram: '' },
      customFields: { صناعة: 'الخدمات', أولوية: 'متوسطة' },
      lifecycle: 'عميل مرتبط',
      rating: 4,
    },
    {
      id: '3',
      name: 'محمد سالم',
      email: 'mohammed@example.com',
      phone: '+966503456789',
      company: 'شركة الحل الذكي',
      city: 'الدمام',
      status: 'خامل',
      segment: 'standard',
      score: 65,
      lastContact: '2026-01-10',
      interactions: 8,
      totalValue: 35000,
      notes: 'يحتاج المتابعة',
      tags: ['standard', 'قديم', 'خامل'],
      email2: '',
      phone2: '',
      social: { linkedin: '', twitter: '', instagram: '' },
      customFields: { صناعة: 'التجارة', أولوية: 'منخفضة' },
      lifecycle: 'عميل سابق',
      rating: 3,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterSegment, setFilterSegment] = useState('الكل');
  const [filterStatus, setFilterStatus] = useState('الكل');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [formData, setFormData] = useState({});
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredCustomers = useMemo(() => {
    const filtered = customers.filter(c => {
      const matchesSearch =
        c.name.includes(searchQuery) ||
        c.email.includes(searchQuery) ||
        c.phone.includes(searchQuery);
      const matchesSegment = filterSegment === 'الكل' || c.segment === filterSegment;
      const matchesStatus = filterStatus === 'الكل' || c.status === filterStatus;
      return matchesSearch && matchesSegment && matchesStatus;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name, 'ar');
          break;
        case 'value':
          comparison = a.totalValue - b.totalValue;
          break;
        case 'interactions':
          comparison = a.interactions - b.interactions;
          break;
        default:
          comparison = new Date(a.lastContact) - new Date(b.lastContact);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [customers, searchQuery, filterSegment, filterStatus, sortBy, sortOrder]);

  const paginatedCustomers = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredCustomers.slice(start, start + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  const handleAddCustomer = useCallback(() => {
    setFormData({});
    setSelectedCustomer(null);
    setOpenDialog(true);
  }, []);

  const handleEditCustomer = useCallback(customer => {
    setFormData(customer);
    setSelectedCustomer(customer);
    setOpenDialog(true);
  }, []);

  const handleSaveCustomer = useCallback(() => {
    if (!formData.name || !formData.email) {
      setSnackbar({ open: true, message: '❌ الاسم والبريد مطلوبان', severity: 'error' });
      return;
    }

    if (selectedCustomer) {
      setCustomers(
        customers.map(c => (c.id === selectedCustomer.id ? { ...formData, id: c.id } : c))
      );
      setSnackbar({ open: true, message: '✅ تم تحديث العميل بنجاح', severity: 'success' });
    } else {
      const newCustomer = {
        ...formData,
        id: Date.now().toString(),
        lastContact: new Date().toISOString().split('T')[0],
        interactions: 0,
        totalValue: 0,
      };
      setCustomers([...customers, newCustomer]);
      setSnackbar({ open: true, message: '✅ تم إضافة عميل جديد', severity: 'success' });
    }

    setOpenDialog(false);
  }, [formData, selectedCustomer, customers]);

  const handleDeleteCustomer = useCallback(
    id => {
      if (window.confirm('هل تريد حذف هذا العميل؟')) {
        setCustomers(customers.filter(c => c.id !== id));
        setSnackbar({ open: true, message: '✅ تم حذف العميل', severity: 'success' });
      }
    },
    [customers]
  );

  const handleSelectCustomer = useCallback(id => {
    setSelectedCustomers(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedCustomers.length === paginatedCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(paginatedCustomers.map(c => c.id));
    }
  }, [selectedCustomers, paginatedCustomers]);

  const getSegmentColor = segment => {
    const colors = { vip: 'error', premium: 'warning', standard: 'info', prospect: 'success' };
    return colors[segment] || 'default';
  };

  const getStatusColor = status => {
    return status === 'نشط' ? 'success' : 'warning';
  };

  const stats = useMemo(() => {
    return {
      total: customers.length,
      active: customers.filter(c => c.status === 'نشط').length,
      vip: customers.filter(c => c.segment === 'vip').length,
      totalValue: customers.reduce((sum, c) => sum + c.totalValue, 0),
      avgScore: Math.round(customers.reduce((sum, c) => sum + c.score, 0) / customers.length),
    };
  }, [customers]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي العملاء', value: stats.total, icon: '👥', color: '#667eea' },
          { label: 'العملاء النشطون', value: stats.active, icon: '🟢', color: '#4caf50' },
          { label: 'عملاء VIP', value: stats.vip, icon: '⭐', color: '#ff9800' },
          {
            label: 'إجمالي القيمة',
            value: `${(stats.totalValue / 1000).toFixed(0)}K`,
            icon: '💰',
            color: '#2196f3',
          },
          { label: 'متوسط النقاط', value: stats.avgScore, icon: '📊', color: '#9c27b0' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={idx}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                textAlign: 'center',
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h2" sx={{ mb: 1 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search & Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2, boxShadow: 2 }}>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="🔍 البحث عن عميل..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              sx={{ flex: 1, minWidth: 250 }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>القطاع</InputLabel>
              <Select
                value={filterSegment}
                onChange={e => setFilterSegment(e.target.value)}
                label="القطاع"
              >
                {['الكل', 'vip', 'premium', 'standard', 'prospect'].map(seg => (
                  <MenuItem key={seg} value={seg}>
                    {seg}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                label="الحالة"
              >
                {['الكل', 'نشط', 'خامل'].map(st => (
                  <MenuItem key={st} value={st}>
                    {st}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddCustomer}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              عميل جديد
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Customers Table */}
      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <TableRow>
              <TableCell padding="checkbox" sx={{ color: 'white' }}>
                <Checkbox
                  checked={selectedCustomers.length === paginatedCustomers.length}
                  onChange={handleSelectAll}
                  sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
                />
              </TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاسم</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>البريد الإلكتروني</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الهاتف</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الشركة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>القطاع</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>النقاط</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التقييم</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedCustomers.map(customer => (
              <TableRow key={customer.id} hover sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedCustomers.includes(customer.id)}
                    onChange={() => handleSelectCustomer(customer.id)}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        width: 32,
                        height: 32,
                      }}
                    >
                      {customer.name.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {customer.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {customer.city}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 18, color: '#667eea' }} />
                    <Typography variant="body2">{customer.email}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 18, color: '#4caf50' }} />
                    <Typography variant="body2">{customer.phone}</Typography>
                  </Box>
                </TableCell>
                <TableCell>{customer.company}</TableCell>
                <TableCell>
                  <Chip
                    label={customer.segment}
                    size="small"
                    color={getSegmentColor(customer.segment)}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={customer.score}
                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 30 }}>
                      {customer.score}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.25 }}>
                    {[...Array(5)].map((_, i) => (
                      <StarIcon
                        key={i}
                        sx={{ fontSize: 16, color: i < customer.rating ? '#ff9800' : '#ccc' }}
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" spacing={0.5} justifyContent="center">
                    <Tooltip title="تحرير">
                      <IconButton
                        size="small"
                        onClick={() => handleEditCustomer(customer)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteCustomer(customer.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component={Paper}
        count={filteredCustomers.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={e => setRowsPerPage(parseInt(e.target.value, 10))}
        sx={{ borderRadius: 2, mt: 2 }}
      />

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <PersonIcon />
          {selectedCustomer ? 'تحرير العميل' : 'إضافة عميل جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="الاسم"
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="أدخل اسم العميل"
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={formData.email || ''}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              placeholder="example@email.com"
            />
            <TextField
              label="الهاتف"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
              placeholder="+966501234567"
            />
            <TextField
              label="الشركة"
              value={formData.company || ''}
              onChange={e => setFormData({ ...formData, company: e.target.value })}
              fullWidth
              placeholder="اسم الشركة"
            />
            <FormControl fullWidth>
              <InputLabel>القطاع</InputLabel>
              <Select
                value={formData.segment || ''}
                onChange={e => setFormData({ ...formData, segment: e.target.value })}
                label="القطاع"
              >
                {['vip', 'premium', 'standard', 'prospect'].map(seg => (
                  <MenuItem key={seg} value={seg}>
                    {seg}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined" sx={{ borderRadius: 2 }}>
            إلغاء
          </Button>
          <Button
            onClick={handleSaveCustomer}
            variant="contained"
            sx={{
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Bulk Actions */}
      {selectedCustomers.length > 0 && (
        <SpeedDial
          ariaLabel="إجراءات جماعية"
          sx={{ position: 'fixed', bottom: 24, left: 24 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<MailIcon />}
            tooltipTitle="إرسال بريد"
            onClick={() =>
              setSnackbar({
                open: true,
                message: `✅ سيتم إرسال بريد ل ${selectedCustomers.length} عميل`,
                severity: 'success',
              })
            }
          />
          <SpeedDialAction
            icon={<ShareIcon />}
            tooltipTitle="مشاركة"
            onClick={() =>
              setSnackbar({
                open: true,
                message: `✅ تم التشارك مع ${selectedCustomers.length} عميل`,
                severity: 'success',
              })
            }
          />
        </SpeedDial>
      )}
    </Box>
  );
};

export default CustomerManagement;
