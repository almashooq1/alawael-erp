/**
 * Students Management Page
 * صفحة إدارة الطلاب
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  InputAdornment,
  Button,
  Chip,
  Avatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Accessibility as DisabilityIcon,
  School as SchoolIcon,
} from '@mui/icons-material';

// API Service
const API_BASE = '/api/students';

// Status Colors
const statusColors = {
  active: { bg: '#DCFCE7', color: '#166534', label: 'نشط' },
  inactive: { bg: '#F3F4F6', color: '#374151', label: 'غير نشط' },
  suspended: { bg: '#FEF3C7', color: '#92400E', label: 'موقوف' },
  waiting: { bg: '#DBEAFE', color: '#1E40AF', label: 'قائمة انتظار' },
};

// Disability Types
const disabilityTypes = {
  physical: 'إعاقة حركية',
  visual: 'إعاقة بصرية',
  hearing: 'إعاقة سمعية',
  intellectual: 'إعاقة ذهنية',
  autism: 'توحد',
  learning: 'صعوبات تعلم',
  multiple: 'إعاقات متعددة',
};

// Student Form Component
const StudentForm = ({ open, onClose, student, onSubmit }) => {
  const [formData, setFormData] = useState({
    firstNameAr: '',
    lastNameAr: '',
    nationalId: '',
    dateOfBirth: '',
    gender: 'male',
    disabilityType: '',
    centerId: '',
    ...student,
  });

  const handleChange = (field) => (e) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = () => {
    onSubmit(formData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ textAlign: 'right' }}>
        {student ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="الاسم الأول"
              value={formData.firstNameAr}
              onChange={handleChange('firstNameAr')}
              inputProps={{ dir: 'rtl' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="اسم العائلة"
              value={formData.lastNameAr}
              onChange={handleChange('lastNameAr')}
              inputProps={{ dir: 'rtl' }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="رقم الهوية الوطنية"
              value={formData.nationalId}
              onChange={handleChange('nationalId')}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="تاريخ الميلاد"
              value={formData.dateOfBirth}
              onChange={handleChange('dateOfBirth')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>الجنس</InputLabel>
              <Select
                value={formData.gender}
                onChange={handleChange('gender')}
              >
                <MenuItem value="male">ذكر</MenuItem>
                <MenuItem value="female">أنثى</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>نوع الإعاقة</InputLabel>
              <Select
                value={formData.disabilityType}
                onChange={handleChange('disabilityType')}
              >
                {Object.entries(disabilityTypes).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'flex-start', p: 2 }}>
        <Button onClick={onClose} color="inherit">إلغاء</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {student ? 'تحديث' : 'إضافة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Students Page
const StudentsPage = ({ centerId = 'CTR-001' }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [disabilityFilter, setDisabilityFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Mock Data
  useEffect(() => {
    const mockStudents = [
      { id: 1, studentId: 'STU-001', firstNameAr: 'أحمد', lastNameAr: 'محمد', nationalId: '1234567890', gender: 'male', disabilityType: 'physical', status: 'active', attendance: 95 },
      { id: 2, studentId: 'STU-002', firstNameAr: 'فاطمة', lastNameAr: 'علي', nationalId: '1234567891', gender: 'female', disabilityType: 'visual', status: 'active', attendance: 88 },
      { id: 3, studentId: 'STU-003', firstNameAr: 'عمر', lastNameAr: 'خالد', nationalId: '1234567892', gender: 'male', disabilityType: 'autism', status: 'active', attendance: 92 },
      { id: 4, studentId: 'STU-004', firstNameAr: 'سارة', lastNameAr: 'إبراهيم', nationalId: '1234567893', gender: 'female', disabilityType: 'hearing', status: 'waiting', attendance: 0 },
      { id: 5, studentId: 'STU-005', firstNameAr: 'محمد', lastNameAr: 'عبدالله', nationalId: '1234567894', gender: 'male', disabilityType: 'intellectual', status: 'active', attendance: 85 },
    ];
    setStudents(mockStudents);
  }, []);

  const handleAddStudent = () => {
    setSelectedStudent(null);
    setFormOpen(true);
  };

  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setFormOpen(true);
  };

  const handleSubmit = async (formData) => {
    console.log('Submitting:', formData);
    // API call here
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.firstNameAr.includes(searchTerm) ||
      student.lastNameAr.includes(searchTerm) ||
      student.nationalId.includes(searchTerm);
    const matchesStatus = !statusFilter || student.status === statusFilter;
    const matchesDisability = !disabilityFilter || student.disabilityType === disabilityFilter;
    return matchesSearch && matchesStatus && matchesDisability;
  });

  return (
    <Box sx={{ p: 3, bgcolor: '#F3F4F6', minHeight: '100vh' }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            إدارة الطلاب
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredStudents.length} طالب مسجل
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddStudent}
          sx={{ borderRadius: 2 }}
        >
          إضافة طالب
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="بحث بالاسم أو رقم الهوية..."
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
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="الحالة"
              >
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(statusColors).map(([key, { label }]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>نوع الإعاقة</InputLabel>
              <Select
                value={disabilityFilter}
                onChange={(e) => setDisabilityFilter(e.target.value)}
                label="نوع الإعاقة"
              >
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(disabilityTypes).map(([key, label]) => (
                  <MenuItem key={key} value={key}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F9FAFB' }}>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>رقم الهوية</TableCell>
              <TableCell>نوع الإعاقة</TableCell>
              <TableCell>نسبة الحضور</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredStudents
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((student) => (
                <TableRow key={student.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: student.gender === 'male' ? 'primary.light' : 'secondary.light' }}>
                        <PersonIcon />
                      </Avatar>
                      <Box>
                        <Typography fontWeight="medium">
                          {student.firstNameAr} {student.lastNameAr}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {student.studentId}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{student.nationalId}</TableCell>
                  <TableCell>
                    <Chip
                      icon={<DisabilityIcon />}
                      label={disabilityTypes[student.disabilityType]}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{student.attendance}%</Typography>
                      <Box
                        sx={{
                          width: 60,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'grey.200',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${student.attendance}%`,
                            height: '100%',
                            bgcolor: student.attendance >= 90 ? 'success.main' : student.attendance >= 70 ? 'warning.main' : 'error.main',
                          }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={statusColors[student.status]?.label}
                      size="small"
                      sx={{
                        bgcolor: statusColors[student.status]?.bg,
                        color: statusColors[student.status]?.color,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="عرض">
                        <IconButton size="small" color="primary">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => handleEditStudent(student)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredStudents.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
          labelRowsPerPage="عدد الصفوف:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
        />
      </TableContainer>

      {/* Student Form Dialog */}
      <StudentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        student={selectedStudent}
        onSubmit={handleSubmit}
      />

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, left: 24 }}
        onClick={handleAddStudent}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default StudentsPage;