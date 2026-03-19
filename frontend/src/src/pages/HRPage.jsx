/**
 * HR Page - Comprehensive Human Resources Management
 * صفحة الموارد البشرية الشاملة
 */

import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Event as LeaveIcon,
  AccessTime as AttendanceIcon,
  AttachMoney as PayrollIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, ChartTooltip, Legend, ArcElement);

// Tab Panel
const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

// Nitaqat Colors
const nitaqatColors = {
  platinum: '#E5E4E2',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
};

const HRPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Mock Data
  const [employees] = useState([
    { id: 'EMP-00001', name: 'محمد أحمد', nationalId: '1234567890', nationality: 'SA', department: 'الإدارة', jobTitle: 'مدير', status: 'active', salary: 15000 },
    { id: 'EMP-00002', name: 'سارة محمود', nationalId: '2234567890', nationality: 'SA', department: 'الموارد البشرية', jobTitle: 'أخصائي موارد بشرية', status: 'active', salary: 8500 },
    { id: 'EMP-00003', name: 'أحمد علي', nationalId: '2345678901', nationality: 'SA', department: 'تقنية المعلومات', jobTitle: 'مطور برمجيات', status: 'active', salary: 12000 },
    { id: 'EMP-00004', name: 'فاطمة حسن', nationalId: '3456789012', nationality: 'non-SA', department: 'المالية', jobTitle: 'محاسب', status: 'on_leave', salary: 7500 },
    { id: 'EMP-00005', name: 'خالد عبدالله', nationalId: '4567890123', nationality: 'SA', department: 'التسويق', jobTitle: 'مدير تسويق', status: 'active', salary: 13000 },
  ]);

  const [leaveRequests] = useState([
    { id: 1, employee: 'محمد أحمد', type: 'annual', startDate: '2026-03-01', endDate: '2026-03-10', days: 10, status: 'pending' },
    { id: 2, employee: 'سارة محمود', type: 'sick', startDate: '2026-02-25', endDate: '2026-02-26', days: 2, status: 'approved' },
    { id: 3, employee: 'أحمد علي', type: 'emergency', startDate: '2026-02-23', endDate: '2026-02-23', days: 1, status: 'approved' },
  ]);

  const [attendance] = useState([
    { id: 1, employee: 'محمد أحمد', date: '2026-02-23', checkIn: '07:55', checkOut: '16:30', hours: 8.5, status: 'present' },
    { id: 2, employee: 'سارة محمود', date: '2026-02-23', checkIn: '08:10', checkOut: '16:00', hours: 7.8, status: 'late' },
    { id: 3, employee: 'أحمد علي', date: '2026-02-23', checkIn: '08:00', checkOut: '17:00', hours: 9, status: 'overtime' },
  ]);

  // Statistics
  const stats = {
    totalEmployees: 50,
    saudis: 32,
    nonSaudis: 18,
    saudizationRate: 64,
    nitaqatCategory: 'green',
    onLeave: 5,
    todayAttendance: 43,
    pendingLeaves: 3,
  };

  // Chart Data
  const departmentChartData = {
    labels: ['الإدارة', 'الموارد البشرية', 'تقنية المعلومات', 'المالية', 'التسويق', 'العمليات'],
    datasets: [
      {
        label: 'عدد الموظفين',
        data: [5, 8, 12, 7, 10, 8],
        backgroundColor: '#6366F1',
      },
    ],
  };

  const saudizationChartData = {
    labels: ['سعوديين', 'غير سعوديين'],
    datasets: [
      {
        data: [stats.saudis, stats.nonSaudis],
        backgroundColor: ['#10B981', '#6366F1'],
      },
    ],
  };

  // Leave Type Labels
  const leaveTypeLabels = {
    annual: 'إجازة سنوية',
    sick: 'إجازة مرضية',
    emergency: 'إجازة طارئة',
    maternity: 'إجازة أمومة',
    hajj: 'إجازة حج',
    marriage: 'إجازة زواج',
    bereavement: 'إجازة عزاء',
  };

  // Status Colors
  const getStatusColor = (status) => {
    const colors = {
      active: 'success',
      on_leave: 'warning',
      terminated: 'error',
      probation: 'info',
      suspended: 'default',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'نشط',
      on_leave: 'في إجازة',
      terminated: 'منهي',
      probation: 'تحت التجربة',
      suspended: 'موقوف',
    };
    return labels[status] || status;
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#F3F4F6', minHeight: '100vh' }} dir="rtl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            نظام الموارد البشرية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة شاملة للموارد البشرية وفق النظام السعودي
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          إضافة موظف
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                  <PeopleIcon sx={{ color: 'primary.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.totalEmployees}</Typography>
                  <Typography variant="body2" color="text.secondary">إجمالي الموظفين</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.light', width: 48, height: 48 }}>
                  <TrendingUpIcon sx={{ color: 'success.main' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" fontWeight="bold">{stats.saudizationRate}%</Typography>
                  <Typography variant="body2" color="text.secondary">نسبة السعودة</Typography>
                  <Chip
                    size="small"
                    label={stats.nitaqatCategory === 'green' ? 'أخضر' : stats.nitaqatCategory}
                    sx={{
                      mt: 0.5,
                      bgcolor: nitaqatColors[stats.nitaqatCategory],
                      color: stats.nitaqatCategory === 'yellow' ? 'black' : 'white',
                    }}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.light', width: 48, height: 48 }}>
                  <LeaveIcon sx={{ color: 'warning.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.onLeave}</Typography>
                  <Typography variant="body2" color="text.secondary">في إجازة</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.light', width: 48, height: 48 }}>
                  <AttendanceIcon sx={{ color: 'info.main' }} />
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.todayAttendance}</Typography>
                  <Typography variant="body2" color="text.secondary">حضور اليوم</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="الموظفين" icon={<PeopleIcon />} iconPosition="start" />
          <Tab label="الإجازات" icon={<LeaveIcon />} iconPosition="start" />
          <Tab label="الحضور" icon={<AttendanceIcon />} iconPosition="start" />
          <Tab label="الرواتب" icon={<PayrollIcon />} iconPosition="start" />
          <Tab label="التقارير" icon={<TrendingUpIcon />} iconPosition="start" />
        </Tabs>

        {/* Employees Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ p: 2 }}>
            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                size="small"
                placeholder="بحث عن موظف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 300 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>الحالة</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="active">نشط</MenuItem>
                  <MenuItem value="on_leave">في إجازة</MenuItem>
                  <MenuItem value="probation">تحت التجربة</MenuItem>
                  <MenuItem value="terminated">منهي</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Employees Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الموظف</TableCell>
                    <TableCell>الاسم</TableCell>
                    <TableCell>رقم الهوية</TableCell>
                    <TableCell>الجنسية</TableCell>
                    <TableCell>القسم</TableCell>
                    <TableCell>المسمى الوظيفي</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>{employee.id}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                            {employee.name.charAt(0)}
                          </Avatar>
                          {employee.name}
                        </Box>
                      </TableCell>
                      <TableCell>{employee.nationalId}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={employee.nationality === 'SA' ? 'سعودي' : 'غير سعودي'}
                          color={employee.nationality === 'SA' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>{employee.jobTitle}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getStatusLabel(employee.status)}
                          color={getStatusColor(employee.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <MoreIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={100}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value))}
              labelRowsPerPage="صفوف لكل صفحة:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} من ${count}`}
            />
          </Box>
        </TabPanel>

        {/* Leave Requests Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الموظف</TableCell>
                    <TableCell>نوع الإجازة</TableCell>
                    <TableCell>من</TableCell>
                    <TableCell>إلى</TableCell>
                    <TableCell>الأيام</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaveRequests.map((request) => (
                    <TableRow key={request.id} hover>
                      <TableCell>{request.employee}</TableCell>
                      <TableCell>
                        <Chip label={leaveTypeLabels[request.type]} size="small" />
                      </TableCell>
                      <TableCell>{request.startDate}</TableCell>
                      <TableCell>{request.endDate}</TableCell>
                      <TableCell>{request.days}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={request.status === 'pending' ? 'قيد المراجعة' : request.status === 'approved' ? 'موافق' : 'مرفوض'}
                          color={request.status === 'pending' ? 'warning' : request.status === 'approved' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button size="small" variant="contained" color="success">
                              موافقة
                            </Button>
                            <Button size="small" variant="contained" color="error">
                              رفض
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Attendance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Box sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الموظف</TableCell>
                    <TableCell>التاريخ</TableCell>
                    <TableCell>دخول</TableCell>
                    <TableCell>خروج</TableCell>
                    <TableCell>الساعات</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id} hover>
                      <TableCell>{record.employee}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.checkIn}</TableCell>
                      <TableCell>{record.checkOut}</TableCell>
                      <TableCell>{record.hours} ساعات</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={record.status === 'present' ? <CheckCircleIcon /> : record.status === 'late' ? <WarningIcon /> : <TrendingUpIcon />}
                          label={record.status === 'present' ? 'حاضر' : record.status === 'late' ? 'متأخر' : 'إضافي'}
                          color={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'info'}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        {/* Payroll Tab */}
        <TabPanel value={tabValue} index={3}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              كشف الرواتب - فبراير 2026
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>الموظف</TableCell>
                    <TableCell>الأساسي</TableCell>
                    <TableCell>بدل السكن</TableCell>
                    <TableCell>بدل النقل</TableCell>
                    <TableCell>التأمينات</TableCell>
                    <TableCell>صافي الراتب</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.slice(0, 3).map((emp) => {
                    const basic = emp.salary;
                    const housing = basic * 0.25;
                    const transport = 500;
                    const gosi = (basic + housing) * 0.1;
                    const net = basic + housing + transport - gosi;
                    return (
                      <TableRow key={emp.id} hover>
                        <TableCell>{emp.name}</TableCell>
                        <TableCell>{basic.toLocaleString()} ر.س</TableCell>
                        <TableCell>{housing.toLocaleString()} ر.س</TableCell>
                        <TableCell>{transport.toLocaleString()} ر.س</TableCell>
                        <TableCell>{gosi.toLocaleString()} ر.س</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {net.toLocaleString()} ر.س
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" startIcon={<PayrollIcon />}>
                معالجة الرواتب الشهرية
              </Button>
              <Button variant="outlined" sx={{ ml: 2 }}>
                تصدير WPS
              </Button>
            </Box>
          </Box>
        </TabPanel>

        {/* Reports Tab */}
        <TabPanel value={tabValue} index={4}>
          <Box sx={{ p: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      توزيع الموظفين حسب الأقسام
                    </Typography>
                    <Bar data={departmentChartData} options={{ responsive: true }} />
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      نسبة السعودة
                    </Typography>
                    <Doughnut data={saudizationChartData} options={{ responsive: true }} />
                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Typography variant="h4" fontWeight="bold" color="success.main">
                        {stats.saudizationRate}%
                      </Typography>
                      <Typography color="text.secondary">
                        تصنيف نطاقات: 
                        <Chip
                          size="small"
                          label="أخضر"
                          sx={{ mr: 1, bgcolor: nitaqatColors.green, color: 'white' }}
                        />
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Paper>

      {/* Add Employee Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إضافة موظف جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="الاسم الأول" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="اسم العائلة" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="رقم الهوية" />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>الجنسية</InputLabel>
                <Select defaultValue="SA">
                  <MenuItem value="SA">سعودي</MenuItem>
                  <MenuItem value="non-SA">غير سعودي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="رقم الجوال" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="البريد الإلكتروني" type="email" />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>القسم</InputLabel>
                <Select defaultValue="">
                  <MenuItem value="admin">الإدارة</MenuItem>
                  <MenuItem value="hr">الموارد البشرية</MenuItem>
                  <MenuItem value="it">تقنية المعلومات</MenuItem>
                  <MenuItem value="finance">المالية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="المسمى الوظيفي" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="الراتب الأساسي" type="number" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="بدل السكن" type="number" />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="تاريخ التعيين" type="date" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>نوع العقد</InputLabel>
                <Select defaultValue="unlimited">
                  <MenuItem value="unlimited">غير محدد المدة</MenuItem>
                  <MenuItem value="limited">محدد المدة</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => setDialogOpen(false)}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HRPage;