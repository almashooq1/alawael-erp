import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Assignment as AssignmentIcon,
  EventNote as EventNoteIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CaseManagementList = () => {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCases, setTotalCases] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });
  const [statistics, setStatistics] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);

  // جلب الحالات
  const fetchCases = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchQuery,
        ...filters
      };

      const response = await axios.get('/api/case-management', { params });
      setCases(response.data.data.cases);
      setTotalCases(response.data.data.pagination.totalItems);
    } catch (error) {
      console.error('خطأ في جلب الحالات:', error);
    } finally {
      setLoading(false);
    }
  };

  // جلب الإحصائيات
  const fetchStatistics = async () => {
    try {
      const response = await axios.get('/api/case-management/statistics/overview');
      setStatistics(response.data.data);
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, rowsPerPage, searchQuery, filters]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  // معالجات الأحداث
  const handleSearch = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleFilterClick = (event) => {
    setFilterAnchor(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setPage(0);
    handleFilterClose();
  };

  const handleMenuOpen = (event, caseItem) => {
    setMenuAnchor(event.currentTarget);
    setSelectedCase(caseItem);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleView = () => {
    if (selectedCase) {
      navigate(`/case-management/${selectedCase._id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedCase) {
      navigate(`/case-management/${selectedCase._id}/edit`);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteDialog(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`/api/case-management/${selectedCase._id}`);
      fetchCases();
      fetchStatistics();
      setDeleteDialog(false);
      setSelectedCase(null);
    } catch (error) {
      console.error('خطأ في حذف الحالة:', error);
    }
  };

  // دوال مساعدة
  const getStatusColor = (status) => {
    const colors = {
      'جديدة': 'info',
      'قيد الدراسة': 'warning',
      'نشطة': 'success',
      'متوقفة': 'default',
      'مكتملة': 'primary',
      'ملغاة': 'error'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'عادية': 'default',
      'متوسطة': 'info',
      'عالية': 'warning',
      'عاجلة': 'error'
    };
    return colors[priority] || 'default';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'عاجلة' || priority === 'عالية') {
      return <WarningIcon fontSize="small" />;
    }
    return null;
  };

  return (
    <Container maxWidth="xl">
      {/* الإحصائيات */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      إجمالي الحالات
                    </Typography>
                    <Typography variant="h4">
                      {statistics.totalCases}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <PersonIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      حالات نشطة
                    </Typography>
                    <Typography variant="h4">
                      {statistics.activeCases}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <TrendingUpIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      حالات جديدة
                    </Typography>
                    <Typography variant="h4">
                      {statistics.newCases}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <AddIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      مواعيد قادمة
                    </Typography>
                    <Typography variant="h4">
                      {statistics.upcomingAppointments}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <ScheduleIcon />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* شريط الأدوات */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="ابحث عن حالة... (الاسم، رقم الحالة، الرقم الوطني)"
              value={searchQuery}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleFilterClick}
              >
                تصفية
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate('/case-management/new')}
              >
                إضافة حالة جديدة
              </Button>
            </Box>
          </Grid>
        </Grid>

        {/* الفلاتر النشطة */}
        {(filters.status || filters.priority) && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            {filters.status && (
              <Chip
                label={`الحالة: ${filters.status}`}
                onDelete={() => handleFilterChange('status', '')}
              />
            )}
            {filters.priority && (
              <Chip
                label={`الأولوية: ${filters.priority}`}
                onDelete={() => handleFilterChange('priority', '')}
              />
            )}
          </Box>
        )}
      </Paper>

      {/* جدول الحالات */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>رقم الحالة</TableCell>
              <TableCell>اسم المستفيد</TableCell>
              <TableCell>العمر</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الأولوية</TableCell>
              <TableCell>تاريخ التسجيل</TableCell>
              <TableCell>الموعد القادم</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  لا توجد حالات
                </TableCell>
              </TableRow>
            ) : (
              cases.map((caseItem) => (
                <TableRow key={caseItem._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {caseItem.caseNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Avatar sx={{ width: 32, height: 32 }}>
                        {caseItem.beneficiary.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2">
                        {caseItem.beneficiary.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {caseItem.beneficiary.age || '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={caseItem.status}
                      size="small"
                      color={getStatusColor(caseItem.status)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={caseItem.priority}
                      size="small"
                      color={getPriorityColor(caseItem.priority)}
                      icon={getPriorityIcon(caseItem.priority)}
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(caseItem.registrationDate), 'dd/MM/yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    {caseItem.nextAppointmentDate ? (
                      <Typography variant="body2" color="primary">
                        {format(new Date(caseItem.nextAppointmentDate), 'dd/MM/yyyy', { locale: ar })}
                      </Typography>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="عرض">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/case-management/${caseItem._id}`)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, caseItem)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* التصفح */}
        <TablePagination
          component="div"
          count={totalCases}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* قائمة الخيارات */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleView}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* قائمة الفلترة */}
      <Menu
        anchorEl={filterAnchor}
        open={Boolean(filterAnchor)}
        onClose={handleFilterClose}
      >
        <MenuItem disabled>
          <Typography variant="subtitle2">الحالة</Typography>
        </MenuItem>
        {['جديدة', 'قيد الدراسة', 'نشطة', 'متوقفة', 'مكتملة', 'ملغاة'].map((status) => (
          <MenuItem key={status} onClick={() => handleFilterChange('status', status)}>
            {status}
          </MenuItem>
        ))}
        <MenuItem disabled>
          <Typography variant="subtitle2">الأولوية</Typography>
        </MenuItem>
        {['عادية', 'متوسطة', 'عالية', 'عاجلة'].map((priority) => (
          <MenuItem key={priority} onClick={() => handleFilterChange('priority', priority)}>
            {priority}
          </MenuItem>
        ))}
      </Menu>

      {/* مربع حوار الحذف */}
      <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف هذه الحالة؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(false)}>
            إلغاء
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CaseManagementList;
