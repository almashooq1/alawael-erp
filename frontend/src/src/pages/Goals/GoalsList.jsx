// Goals List Page - GoalsList.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  TextField,
  MenuItem,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  IconButton,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  MoreVert,
  Search
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const GoalsList = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, [page, rowsPerPage, searchTerm, filterStatus]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await api.get('/goals', {
        params: {
          page: page + 1,
          per_page: rowsPerPage,
          search: searchTerm,
          status: filterStatus
        }
      });
      setGoals(response.data.data);
      setTotal(response.data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/goals/${selectedGoal.id}`);
      setGoals(goals.filter(g => g.id !== selectedGoal.id));
      setOpenDelete(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleMenuOpen = (e, goal) => {
    setSelectedGoal(goal);
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangePage = (e, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const getProgressColor = (progress) => {
    if (progress >= 75) return 'success';
    if (progress >= 50) return 'info';
    if (progress >= 25) return 'warning';
    return 'error';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <h2>الأهداف</h2>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/goals/new')}
        >
          هدف جديد
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              size="small"
              placeholder="البحث عن الأهداف..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              select
              size="small"
              label="حالة الهدف"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">جميع الحالات</MenuItem>
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="completed">مكتمل</MenuItem>
              <MenuItem value="on_hold">معلق</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>الهدف</TableCell>
                  <TableCell>المجال</TableCell>
                  <TableCell>التقدم</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {goals.length > 0 ? (
                  goals.map((goal) => (
                    <TableRow key={goal.id} hover>
                      <TableCell>
                        {goal.beneficiary?.first_name} {goal.beneficiary?.last_name}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        {goal.goal_description}
                      </TableCell>
                      <TableCell>{goal.domain}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={goal.current_progress || 0}
                            sx={{ flex: 1 }}
                            color={getProgressColor(goal.current_progress || 0)}
                          />
                          <Typography variant="caption">
                            {goal.current_progress || 0}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={goal.goal_category === 'short_term' ? 'قصير الأجل' : 'طويل الأجل'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, goal)}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      لا توجد أهداف
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={total}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ backgroundColor: '#f5f5f5' }}
          />
        </>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            navigate(`/goals/${selectedGoal?.id}`);
            handleMenuClose();
          }}
        >
          <Edit fontSize="small" sx={{ mr: 1 }} />
          تعديل
        </MenuItem>
        <MenuItem
          onClick={() => {
            setOpenDelete(true);
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <Delete fontSize="small" sx={{ mr: 1 }} />
          حذف
        </MenuItem>
      </Menu>

      {/* Delete Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف هذا الهدف؟
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>إلغاء</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GoalsList;

import { Typography } from '@mui/material';
