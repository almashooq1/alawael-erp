// Assessments List Page - AssessmentsList.jsx

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
  IconButton,
  Menu,
  CircularProgress,
  Alert,
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

const AssessmentsList = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);

  useEffect(() => {
    fetchAssessments();
  }, [page, rowsPerPage, searchTerm, filterType]);

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/assessments', {
        params: {
          page: page + 1,
          per_page: rowsPerPage,
          search: searchTerm,
          assessment_type: filterType
        }
      });
      setAssessments(response.data.data);
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
      await api.delete(`/assessments/${selectedAssessment.id}`);
      setAssessments(assessments.filter(a => a.id !== selectedAssessment.id));
      setOpenDelete(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleMenuOpen = (e, assessment) => {
    setSelectedAssessment(assessment);
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

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <h2>التقييمات</h2>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/assessments/new')}
        >
          تقييم جديد
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
              placeholder="البحث عن التقييمات..."
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
              label="نوع التقييم"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(0);
              }}
            >
              <MenuItem value="">جميع الأنواع</MenuItem>
              <MenuItem value="تقييم حركي">تقييم حركي</MenuItem>
              <MenuItem value="تقييم إدراكي">تقييم إدراكي</MenuItem>
              <MenuItem value="تقييم لغوي">تقييم لغوي</MenuItem>
              <MenuItem value="تقييم سمعي">تقييم سمعي</MenuItem>
              <MenuItem value="تقييم بصري">تقييم بصري</MenuItem>
              <MenuItem value="تقييم نفسي">تقييم نفسي</MenuItem>
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
                  <TableCell>نوع التقييم</TableCell>
                  <TableCell>الأداة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>الدرجة</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessments.length > 0 ? (
                  assessments.map((assessment) => (
                    <TableRow key={assessment.id} hover>
                      <TableCell>
                        {assessment.beneficiary?.first_name} {assessment.beneficiary?.last_name}
                      </TableCell>
                      <TableCell>{assessment.assessment_type}</TableCell>
                      <TableCell>{assessment.assessment_tool}</TableCell>
                      <TableCell>
                        {new Date(assessment.assessment_date).toLocaleDateString('ar-EG')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={assessment.total_score}
                          color={assessment.total_score >= 70 ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, assessment)}
                        >
                          <MoreVert />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      لا توجد تقييمات
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
            navigate(`/assessments/${selectedAssessment?.id}`);
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
          هل أنت متأكد من حذف هذا التقييم؟
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

export default AssessmentsList;
