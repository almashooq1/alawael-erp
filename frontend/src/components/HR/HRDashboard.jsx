/**
 * مكون لوحة التحكم الموارد البشرية
 * HR Dashboard Component
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Box,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Tooltip,
  Badge,
  IconButton,
  Tabs,
  TabPanel
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  PeopleAlt,
  TrendingUp,
  Assignment,
  SchoolOutlined,
  VerifiedUser,
  Edit,
  Add,
  MoreVert,
  Download,
  Visibility,
  PersonAdd,
  Timeline,
  CheckCircle,
  WarningAmber,
  Info
} from '@mui/icons-material';
import axios from 'axios';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: theme.shadows[8]
  }
}));

const StatBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1)
}));

const HRDashboard = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState(''); // 'profile', 'evaluation', 'succession'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [statistics, setStatistics] = useState({
    totalEmployees: 0,
    activeEvaluations: 0,
    pendingTrainings: 0,
    criticalPositions: 0,
    averagePerformance: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // جلب عدد الموظفين
      const employeesRes = await axios.get('/api/hr/employees/search/profiles');
      setEmployees(employeesRes.data.data);

      // جلب إحصائيات الأداء
      const statsRes = await axios.get('/api/performance/reports/statistics');
      setStatistics(prev => ({
        ...prev,
        ...statsRes.data.data,
        totalEmployees: employeesRes.data.count
      }));

    } catch (error) {
      console.error('خطأ في تحميل البيانات:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEmployeeProfileDialog = (employee) => {
    setSelectedEmployee(employee);
    setDialogType('profile');
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setSelectedEmployee(null);
    setDialogType('');
  };

  const renderStatistics = () => (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={12} sm={6} md={4}>
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  إجمالي الموظفين
                </Typography>
                <Typography variant="h5">
                  {statistics.totalEmployees}
                </Typography>
              </Box>
              <PeopleAlt sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  تقييمات نشطة
                </Typography>
                <Typography variant="h5">
                  {statistics.activeEvaluations}
                </Typography>
              </Box>
              <Assignment sx={{ fontSize: 40, color: 'info.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  متوسط الأداء
                </Typography>
                <Typography variant="h5">
                  {statistics.averagePerformance.toFixed(2)}/5
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 40, color: 'success.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  دورات تدريبية قادمة
                </Typography>
                <Typography variant="h5">
                  {statistics.pendingTrainings}
                </Typography>
              </Box>
              <SchoolOutlined sx={{ fontSize: 40, color: 'warning.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid item xs={12} sm={6} md={4}>
        <StyledCard>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="textSecondary" gutterBottom>
                  مراكز حرجة
                </Typography>
                <Typography variant="h5">
                  {statistics.criticalPositions}
                </Typography>
              </Box>
              <WarningAmber sx={{ fontSize: 40, color: 'error.main', opacity: 0.3 }} />
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );

  const renderEmployeesTable = () => (
    <StyledCard>
      <CardHeader
        title="الموظفون المسجلون"
        action={
          <Button
            startIcon={<PersonAdd />}
            variant="contained"
            size="small"
          >
            إضافة موظف
          </Button>
        }
      />
      <CardContent>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>الاسم</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>البريد الإلكتروني</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>القسم</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المنصب</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.slice(0, 10).map((employee) => (
                  <TableRow key={employee._id} hover>
                    <TableCell>
                      {employee.personalInfo?.firstName} {employee.personalInfo?.lastName}
                    </TableCell>
                    <TableCell>{employee.personalInfo?.email}</TableCell>
                    <TableCell>{employee.jobInfo?.department}</TableCell>
                    <TableCell>{employee.jobInfo?.position}</TableCell>
                    <TableCell>
                      <Chip
                        label={employee.status}
                        color={employee.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="عرض الملف">
                        <IconButton
                          size="small"
                          onClick={() => openEmployeeProfileDialog(employee)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small">
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </StyledCard>
  );

  const renderProfileDialog = () => (
    <Dialog open={openDialog && dialogType === 'profile'} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle>
        ملف الموظف: {selectedEmployee?.personalInfo?.firstName} {selectedEmployee?.personalInfo?.lastName}
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
            المعلومات الشخصية
          </Typography>
          <StatBox>
            <Box>
              <Typography variant="body2" color="textSecondary">البريد الإلكتروني</Typography>
              <Typography>{selectedEmployee?.personalInfo?.email}</Typography>
            </Box>
          </StatBox>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
            المعلومات الوظيفية
          </Typography>
          <StatBox>
            <Box>
              <Typography variant="body2" color="textSecondary">القسم</Typography>
              <Typography>{selectedEmployee?.jobInfo?.department}</Typography>
            </Box>
          </StatBox>
          <StatBox>
            <Box>
              <Typography variant="body2" color="textSecondary">المنصب</Typography>
              <Typography>{selectedEmployee?.jobInfo?.position}</Typography>
            </Box>
          </StatBox>

          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, mt: 2 }}>
            السجل المهني
          </Typography>
          <StatBox>
            <Box width="100%">
              <Typography variant="body2" color="textSecondary">المؤهلات العلمية</Typography>
              <Typography variant="h6">
                {selectedEmployee?.professionalRecord?.qualifications?.length || 0}
              </Typography>
            </Box>
          </StatBox>
          <StatBox>
            <Box width="100%">
              <Typography variant="body2" color="textSecondary">الشهادات المهنية</Typography>
              <Typography variant="h6">
                {selectedEmployee?.professionalRecord?.certifications?.length || 0}
              </Typography>
            </Box>
          </StatBox>
          <StatBox>
            <Box width="100%">
              <Typography variant="body2" color="textSecondary">الدورات التدريبية</Typography>
              <Typography variant="h6">
                {selectedEmployee?.professionalRecord?.trainingCourses?.length || 0}
              </Typography>
            </Box>
          </StatBox>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>إغلاق</Button>
        <Button variant="contained" color="primary">
          تحرير الملف
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleAlt />
          لوحة تحكم الموارد البشرية
        </Typography>
        <Typography color="textSecondary">
          إدارة الموظفين والتقييمات وخطط التطوير
        </Typography>
      </Box>

      <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
        <React.Fragment>
          <Typography component="span">
            الإحصائيات والملخصات
          </Typography>
        </React.Fragment>
      </Tabs>

      {renderStatistics()}
      {renderEmployeesTable()}
      {renderProfileDialog()}
    </Container>
  );
};

export default HRDashboard;
