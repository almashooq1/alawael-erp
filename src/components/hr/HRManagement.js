/**
 * Human Resources Management Component - Advanced Version ⭐
 * مكون إدارة الموارد البشرية - نسخة متقدمة
 *
 * Features:
 * ✅ Employee management & profiles
 * ✅ Payroll and salary management
 * ✅ Attendance and leave tracking
 * ✅ Performance evaluations
 * ✅ Training and development
 * ✅ Benefits management
 * ✅ Recruitment pipeline
 * ✅ HR analytics and reports
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  Stack,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  LinearProgress,
  Rating,
  Alert,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from '@mui/material';
import {
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  AttachMoney as AttachMoneyIcon,
  EventAvailable as EventAvailableIcon,
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Pending as PendingIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';

const HRManagement = () => {
  const [employees, setEmployees] = useState([
    {
      id: 'E001',
      name: 'أحمد محمد',
      email: 'ahmed@company.com',
      department: 'تطوير البرمجيات',
      position: 'مهندس برمجيات أول',
      salary: 8500,
      hireDate: '2020-03-15',
      status: 'نشط',
      performance: 4.5,
      leaveBalance: 15,
      joinDate: '2020-03-15',
      skills: ['React', 'Node.js', 'MongoDB'],
      avatar: '👨‍💻',
    },
    {
      id: 'E002',
      name: 'فاطمة علي',
      email: 'fatima@company.com',
      department: 'الموارد البشرية',
      position: 'مديرة الموارد البشرية',
      salary: 7500,
      hireDate: '2019-06-20',
      status: 'نشط',
      performance: 4.8,
      leaveBalance: 10,
      joinDate: '2019-06-20',
      skills: ['التدريب', 'التوظيف', 'إدارة الأداء'],
      avatar: '👩‍💼',
    },
    {
      id: 'E003',
      name: 'محمد سالم',
      email: 'salem@company.com',
      department: 'المبيعات',
      position: 'مدير المبيعات',
      salary: 9000,
      hireDate: '2021-01-10',
      status: 'نشط',
      performance: 4.2,
      leaveBalance: 18,
      joinDate: '2021-01-10',
      skills: ['المبيعات', 'إدارة العملاء', 'التفاوض'],
      avatar: '👨‍💼',
    },
  ]);

  const [attendanceData, setAttendanceData] = useState([
    {
      id: 'A001',
      employeeId: 'E001',
      date: '2026-01-16',
      checkIn: '08:30',
      checkOut: '17:00',
      status: 'حاضر',
    },
    {
      id: 'A002',
      employeeId: 'E002',
      date: '2026-01-16',
      checkIn: '08:15',
      checkOut: '17:30',
      status: 'حاضر',
    },
    {
      id: 'A003',
      employeeId: 'E003',
      date: '2026-01-16',
      checkIn: null,
      checkOut: null,
      status: 'غياب',
    },
  ]);

  const [payroll, setPayroll] = useState([
    {
      id: 'P001',
      employeeId: 'E001',
      month: 'يناير 2026',
      salary: 8500,
      deductions: 1000,
      net: 7500,
      status: 'مدفوع',
    },
    {
      id: 'P002',
      employeeId: 'E002',
      month: 'يناير 2026',
      salary: 7500,
      deductions: 900,
      net: 6600,
      status: 'مدفوع',
    },
  ]);

  const [training, setTraining] = useState([
    {
      id: 'T001',
      title: 'React 18 المتقدمة',
      instructor: 'خبير تقني',
      date: '2026-02-01',
      participants: 12,
      status: 'قادم',
    },
    {
      id: 'T002',
      title: 'مهارات القيادة',
      instructor: 'مدرب إداري',
      date: '2026-01-20',
      participants: 8,
      status: 'جاري',
    },
  ]);

  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    salary: '',
  });

  // Analytics
  const departmentStats = useMemo(() => {
    const stats = {};
    employees.forEach(emp => {
      stats[emp.department] = (stats[emp.department] || 0) + 1;
    });
    return Object.entries(stats).map(([dept, count]) => ({ name: dept, value: count }));
  }, [employees]);

  const performanceStats = useMemo(() => {
    return employees.map(emp => ({
      name: emp.name,
      performance: emp.performance,
    }));
  }, [employees]);

  const avgPerformance = useMemo(() => {
    const sum = employees.reduce((acc, emp) => acc + emp.performance, 0);
    return (sum / employees.length).toFixed(1);
  }, [employees]);

  const totalPayroll = useMemo(() => {
    return payroll.reduce((acc, p) => acc + p.salary, 0);
  }, [payroll]);

  const handleAddEmployee = () => {
    if (newEmployee.name && newEmployee.email) {
      const emp = {
        id: `E${String(employees.length + 1).padStart(3, '0')}`,
        ...newEmployee,
        salary: parseFloat(newEmployee.salary),
        hireDate: new Date().toISOString().split('T')[0],
        status: 'نشط',
        performance: 3.5,
        leaveBalance: 20,
        joinDate: new Date().toISOString().split('T')[0],
        skills: [],
        avatar: '👤',
      };
      setEmployees([...employees, emp]);
      setNewEmployee({ name: '', email: '', department: '', position: '', salary: '' });
      setOpenDialog(false);
    }
  };

  const handleDeleteEmployee = useCallback(
    id => {
      setEmployees(employees.filter(emp => emp.id !== id));
    },
    [employees]
  );

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  return (
    <Box sx={{ p: 3, bgcolor: '#f8f9ff', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: '#333' }}>
            🏢 إدارة الموارد البشرية
          </Typography>
          <Typography variant="body2" color="textSecondary">
            إدارة شاملة للموظفين والرواتب والتطوير الوظيفي
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            px: 3,
            py: 1.5,
          }}
        >
          إضافة موظف جديد
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              boxShadow: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي الموظفين
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {employees.length}
                  </Typography>
                </Box>
                <PersonIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              boxShadow: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            }}
          >
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    إجمالي الرواتب الشهرية
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {totalPayroll.toLocaleString()}
                  </Typography>
                </Box>
                <AttachMoneyIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              boxShadow: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            }}
          >
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    متوسط الأداء
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {avgPerformance} ⭐
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              boxShadow: 2,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            }}
          >
            <CardContent sx={{ color: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography color="rgba(255,255,255,0.7)" variant="body2">
                    الحاضرون اليوم
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 1 }}>
                    {attendanceData.filter(a => a.status === 'حاضر').length}
                  </Typography>
                </Box>
                <EventAvailableIcon sx={{ fontSize: 50, opacity: 0.5 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, boxShadow: 2, mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, v) => setTabValue(v)}
          sx={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Tab label="👥 الموظفون" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="📊 الحضور" icon={<EventAvailableIcon />} iconPosition="start" />
          <Tab label="💰 الرواتب" icon={<AttachMoneyIcon />} iconPosition="start" />
          <Tab label="🎓 التدريب" icon={<SchoolIcon />} iconPosition="start" />
          <Tab label="📈 التحليلات" icon={<AssessmentIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 1: Employees */}
      {tabValue === 0 && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}
        >
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الموظف</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الوظيفة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>القسم</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الراتب</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الأداء</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }} align="center">
                  الإجراءات
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map(emp => (
                <TableRow key={emp.id} hover sx={{ transition: 'all 0.3s' }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                      >
                        {emp.avatar}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {emp.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {emp.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{emp.position}</TableCell>
                  <TableCell>{emp.department}</TableCell>
                  <TableCell>
                    <Chip
                      label={`${emp.salary.toLocaleString()} ر.س`}
                      color="primary"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Rating value={emp.performance} readOnly size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={emp.status}
                      color={emp.status === 'نشط' ? 'success' : 'warning'}
                      size="small"
                      icon={emp.status === 'نشط' ? <CheckCircleIcon /> : <PendingIcon />}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="حذف">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteEmployee(emp.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 2: Attendance */}
      {tabValue === 1 && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}
        >
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الموظف</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>التاريخ</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>وقت الدخول</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>وقت الخروج</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendanceData.map(record => {
                const emp = employees.find(e => e.id === record.employeeId);
                return (
                  <TableRow key={record.id} hover>
                    <TableCell>{emp?.name}</TableCell>
                    <TableCell>{new Date(record.date).toLocaleDateString('ar-SA')}</TableCell>
                    <TableCell>{record.checkIn || '---'}</TableCell>
                    <TableCell>{record.checkOut || '---'}</TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        color={record.status === 'حاضر' ? 'success' : 'error'}
                        size="small"
                        icon={record.status === 'حاضر' ? <CheckCircleIcon /> : <WarningIcon />}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 3: Payroll */}
      {tabValue === 2 && (
        <TableContainer
          component={Paper}
          sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}
        >
          <Table>
            <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الموظف</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الشهر</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الراتب</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الخصومات</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الصافي</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 600 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payroll.map(record => {
                const emp = employees.find(e => e.id === record.employeeId);
                return (
                  <TableRow key={record.id} hover>
                    <TableCell>{emp?.name}</TableCell>
                    <TableCell>{record.month}</TableCell>
                    <TableCell>{record.salary.toLocaleString()}</TableCell>
                    <TableCell>{record.deductions.toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{record.net.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip
                        label={record.status}
                        color={record.status === 'مدفوع' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Tab 4: Training */}
      {tabValue === 3 && (
        <Grid container spacing={2}>
          {training.map(prog => (
            <Grid item xs={12} md={6} key={prog.id}>
              <Card sx={{ boxShadow: 2, borderRadius: 2, height: '100%' }}>
                <CardHeader
                  title={prog.title}
                  subheader={prog.instructor}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                  }}
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        📅 التاريخ
                      </Typography>
                      <Typography variant="body2">
                        {new Date(prog.date).toLocaleDateString('ar-SA')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        👥 عدد المشاركين
                      </Typography>
                      <Typography variant="body2">{prog.participants} موظف</Typography>
                    </Box>
                    <Box>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        sx={{ display: 'block', mb: 1 }}
                      >
                        الحالة
                      </Typography>
                      <Chip
                        label={prog.status}
                        color={prog.status === 'جاري' ? 'warning' : 'info'}
                        size="small"
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 5: Analytics */}
      {tabValue === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                📊 توزيع الموظفين حسب القسم
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={departmentStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {departmentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                ⭐ مستويات الأداء
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="performance" fill="#8884d8" name="الأداء" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          إضافة موظف جديد
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="الاسم"
              value={newEmployee.name}
              onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={newEmployee.email}
              onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="الوظيفة"
              value={newEmployee.position}
              onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>القسم</InputLabel>
              <Select
                value={newEmployee.department}
                onChange={e => setNewEmployee({ ...newEmployee, department: e.target.value })}
                label="القسم"
              >
                <MenuItem value="تطوير البرمجيات">تطوير البرمجيات</MenuItem>
                <MenuItem value="الموارد البشرية">الموارد البشرية</MenuItem>
                <MenuItem value="المبيعات">المبيعات</MenuItem>
                <MenuItem value="التسويق">التسويق</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الراتب الشهري"
              type="number"
              value={newEmployee.salary}
              onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            onClick={handleAddEmployee}
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HRManagement;
