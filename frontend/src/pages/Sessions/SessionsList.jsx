// قائمة الجلسات العلاجية - SessionsList

import React, { useEffect, useState } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  Grid
} from '@mui/material';
import {
  Search,
  Add,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SessionsList = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadSessions();
  }, [page, rowsPerPage, search, filterStatus]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sessions', {
        params: {
          page: page + 1,
          per_page: rowsPerPage,
          status: filterStatus || undefined
        }
      });

      if (response.data.success) {
        setSessions(response.data.data);
        setTotal(response.data.pagination.total);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, session) => {
    setAnchorEl(event.currentTarget);
    setSelectedSession(session);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSession(null);
  };

  const handleCompleteSession = async () => {
    try {
      await api.post(`/sessions/${selectedSession.id}/complete`);
      loadSessions();
    } catch (error) {
      console.error('Error completing session:', error);
    }
    handleMenuClose();
  };

  const handleCancelSession = async () => {
    if (window.confirm('هل تريد إلغاء هذه الجلسة؟')) {
      try {
        await api.post(`/sessions/${selectedSession.id}/cancel`, {
          reason: 'تم الإلغاء من قبل المستخدم'
        });
        loadSessions();
      } catch (error) {
        console.error('Error canceling session:', error);
      }
    }
    handleMenuClose();
  };

  const handleDeleteSession = async () => {
    if (window.confirm('هل أنت متأكد من حذف هذه الجلسة؟')) {
      try {
        await api.delete(`/sessions/${selectedSession.id}`);
        loadSessions();
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
    handleMenuClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'scheduled':
        return 'info';
      case 'cancelled':
        return 'error';
      case 'no_show':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'scheduled': 'مجدولة',
      'completed': 'مكتملة',
      'cancelled': 'ملغاة',
      'no_show': 'لم يحضر'
    };
    return labels[status] || status;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          الجلسات العلاجية
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/sessions/new')}
        >
          جدولة جلسة
        </Button>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={9}>
              <TextField
                fullWidth
                placeholder="البحث عن جلسة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="الحالة"
                >
                  <MenuItem value="">الكل</MenuItem>
                  <MenuItem value="scheduled">مجدولة</MenuItem>
                  <MenuItem value="completed">مكتملة</MenuItem>
                  <MenuItem value="cancelled">ملغاة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>نوع الجلسة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الوقت</TableCell>
                  <TableCell>المعالج</TableCell>
                  <TableCell>المدة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} hover>
                    <TableCell>{session.beneficiary?.name || '-'}</TableCell>
                    <TableCell>{session.session_type}</TableCell>
                    <TableCell>{session.session_date}</TableCell>
                    <TableCell>{session.start_time}</TableCell>
                    <TableCell>{session.therapist?.name || '-'}</TableCell>
                    <TableCell>{session.duration || '-'} دقيقة</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(session.status)}
                        size="small"
                        color={getStatusColor(session.status)}
                      />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, session)}
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
          />
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => navigate(`/sessions/${selectedSession?.id}`)}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          عرض التفاصيل
        </MenuItem>
        {selectedSession?.status === 'scheduled' && (
          <>
            <MenuItem onClick={handleCompleteSession}>
              <CheckCircle fontSize="small" sx={{ mr: 1 }} />
              إكمال الجلسة
            </MenuItem>
            <MenuItem onClick={handleCancelSession}>
              <Cancel fontSize="small" sx={{ mr: 1 }} />
              إلغاء الجلسة
            </MenuItem>
          </>
        )}
        <MenuItem onClick={handleDeleteSession} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default SessionsList;
