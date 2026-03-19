import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  CheckCircle as PostIcon,
  Cancel as ReverseIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getToken } from '../../utils/tokenStorage';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const JournalEntries = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [_accounts, setAccounts] = useState([]);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    posted: 0,
    draft: 0,
    reversed: 0,
  });

  useEffect(() => {
    fetchEntries();
    fetchAccounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await axios.get(`${API_URL}/api/accounting/journal-entries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEntries(response.data.entries || []);
      calculateStats(response.data.entries || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'فشل في تحميل القيود');
      console.error('Error fetching entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/api/accounting/accounts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    }
  };

  const calculateStats = (entriesData) => {
    setStats({
      total: entriesData.length,
      posted: entriesData.filter(e => e.status === 'posted').length,
      draft: entriesData.filter(e => e.status === 'draft').length,
      reversed: entriesData.filter(e => e.status === 'reversed').length,
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewEntry = (entry) => {
    setSelectedEntry(entry);
    setOpenDialog(true);
  };

  const handlePostEntry = async (entryId) => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/accounting/journal-entries/${entryId}/post`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchEntries();
      alert('تم ترحيل القيد بنجاح');
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في ترحيل القيد');
    }
  };

  const handleReverseEntry = async (entryId) => {
    if (!window.confirm('هل أنت متأكد من عكس هذا القيد؟')) return;

    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/api/accounting/journal-entries/${entryId}/reverse`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchEntries();
      alert('تم عكس القيد بنجاح');
    } catch (err) {
      alert(err.response?.data?.message || 'فشل في عكس القيد');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'posted':
        return 'success';
      case 'draft':
        return 'warning';
      case 'reversed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'posted':
        return 'مرحّل';
      case 'draft':
        return 'مسودة';
      case 'reversed':
        return 'معكوس';
      default:
        return status;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'manual':
        return 'يدوي';
      case 'automatic':
        return 'تلقائي';
      case 'adjustment':
        return 'تسوية';
      case 'closing':
        return 'إقفال';
      case 'opening':
        return 'افتتاحي';
      default:
        return type;
    }
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const paginatedEntries = filteredEntries.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                إجمالي القيود
              </Typography>
              <Typography variant="h4">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.light' }}>
            <CardContent>
              <Typography color="white" gutterBottom>
                المرحلة
              </Typography>
              <Typography variant="h4" color="white">
                {stats.posted}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardContent>
              <Typography color="white" gutterBottom>
                المسودات
              </Typography>
              <Typography variant="h4" color="white">
                {stats.draft}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'error.light' }}>
            <CardContent>
              <Typography color="white" gutterBottom>
                المعكوسة
              </Typography>
              <Typography variant="h4" color="white">
                {stats.reversed}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Paper */}
      <Paper sx={{ p: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            📝 قيود اليومية
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => alert('سيتم إضافة نموذج إنشاء قيد قريباً')}
          >
            قيد جديد
          </Button>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Filters */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="بحث بالرقم المرجعي أو الوصف..."
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
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>النوع</InputLabel>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="manual">يدوي</MenuItem>
                <MenuItem value="automatic">تلقائي</MenuItem>
                <MenuItem value="adjustment">تسوية</MenuItem>
                <MenuItem value="closing">إقفال</MenuItem>
                <MenuItem value="opening">افتتاحي</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <MenuItem value="all">الكل</MenuItem>
                <MenuItem value="draft">مسودة</MenuItem>
                <MenuItem value="posted">مرحّل</MenuItem>
                <MenuItem value="reversed">معكوس</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>الرقم المرجعي</strong></TableCell>
                <TableCell><strong>التاريخ</strong></TableCell>
                <TableCell><strong>النوع</strong></TableCell>
                <TableCell><strong>الوصف</strong></TableCell>
                <TableCell align="right"><strong>المبلغ</strong></TableCell>
                <TableCell><strong>الحالة</strong></TableCell>
                <TableCell align="center"><strong>الإجراءات</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : paginatedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary">لا توجد قيود</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEntries.map((entry) => (
                  <TableRow key={entry._id} hover>
                    <TableCell>{entry.reference}</TableCell>
                    <TableCell>
                      {entry.date ? format(new Date(entry.date), 'dd/MM/yyyy', { locale: ar }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip label={getTypeLabel(entry.type)} size="small" />
                    </TableCell>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell align="right">
                      {entry.totalDebit?.toLocaleString('ar-SA', {
                        style: 'currency',
                        currency: 'SAR',
                      })}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(entry.status)}
                        color={getStatusColor(entry.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" onClick={() => handleViewEntry(entry)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {entry.status === 'draft' && (
                        <Tooltip title="ترحيل">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handlePostEntry(entry._id)}
                          >
                            <PostIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {entry.status === 'posted' && (
                        <Tooltip title="عكس القيد">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleReverseEntry(entry._id)}
                          >
                            <ReverseIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={filteredEntries.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </Paper>

      {/* View Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل القيد</DialogTitle>
        <DialogContent dividers>
          {selectedEntry && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    الرقم المرجعي
                  </Typography>
                  <Typography variant="body1">{selectedEntry.reference}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    التاريخ
                  </Typography>
                  <Typography variant="body1">
                    {selectedEntry.date
                      ? format(new Date(selectedEntry.date), 'dd/MM/yyyy', { locale: ar })
                      : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    الوصف
                  </Typography>
                  <Typography variant="body1">{selectedEntry.description}</Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                السطور
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>الحساب</strong></TableCell>
                      <TableCell align="right"><strong>مدين</strong></TableCell>
                      <TableCell align="right"><strong>دائن</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedEntry.lines?.map((line, index) => (
                      <TableRow key={index}>
                        <TableCell>{line.account?.name || line.account}</TableCell>
                        <TableCell align="right">
                          {line.debit > 0 ? line.debit.toLocaleString('ar-SA') : '-'}
                        </TableCell>
                        <TableCell align="right">
                          {line.credit > 0 ? line.credit.toLocaleString('ar-SA') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default JournalEntries;
