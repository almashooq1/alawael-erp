/**
 * Disability Assessment and Rehabilitation Management Component
 * مكون إدارة التقييم والتأهيل لذوي الإعاقة
 *
 * Advanced rehabilitation system with comprehensive features
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
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
  Chip,
  Typography,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import axios from 'axios';

const RehabilitationManagementPage = () => {
  const API_URL = 'http://localhost:3001/api/rehabilitation';

  // State Management
  const [tabValue, setTabValue] = useState(0);

  // Assessment State
  const [assessmentDialog, setAssessmentDialog] = useState(false);
  const [assessmentData, setAssessmentData] = useState({
    beneficiary_id: '',
    beneficiary_name: '',
    disability_profile: {
      type: '',
      severity: '',
      onset_type: '',
      duration_years: '',
    },
    assessment_details: {},
  });

  // Program State
  const [programDialog, setProgramDialog] = useState(false);
  const [programData, setProgramData] = useState({
    program_title: '',
    program_code: '',
    beneficiary_id: '',
    disability_type: '',
    program_type: '',
  });

  // Session State - Commented out unused variables
  // const [sessionData, setSessionData] = useState({
  //   session_date: '',
  //   therapist_id: '',
  //   therapy_type: '',
  //   duration_minutes: 60,
  // });

  // Mock data for assessments and programs
  const assessments = [];
  const programs = [];
  // const sessionDialog = false;

  // Statistics
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load Data on Mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all data
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes] = await Promise.all([
        axios.get(`${API_URL}/statistics`),
        axios.get(`${API_URL}/assessments/statistics`),
        axios.get(`${API_URL}/dashboard`),
      ]);

      setStatistics(statsRes.data.data);
    } catch (error) {
      showSnackbar('خطأ في تحميل البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Show Snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Assessment Functions
  const handleCreateAssessment = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/assessments`, assessmentData);
      showSnackbar('تم إنشاء التقييم بنجاح');
      setAssessmentDialog(false);
      setAssessmentData({
        beneficiary_id: '',
        beneficiary_name: '',
        disability_profile: { type: '', severity: '', onset_type: '', duration_years: '' },
        assessment_details: {},
      });
      loadData();
    } catch (error) {
      showSnackbar('خطأ في إنشاء التقييم: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAssessmentReport = async assessmentId => {
    try {
      setLoading(true);
      await axios.get(`${API_URL}/assessments/${assessmentId}/report`);
      // You can open a dialog to show the report
    } catch (error) {
      showSnackbar('خطأ في استرجاع التقرير', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReadiness = async assessmentId => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/assessments/${assessmentId}/readiness`);
      const readiness = response.data.readiness_details;

      const message =
        readiness.overall_readiness === 'جاهز للتأهيل'
          ? `المريض جاهز للتأهيل - التحفيز: ${readiness.motivation_score}%`
          : `يحتاج إلى تحضيرات - التحفيز: ${readiness.motivation_score}%`;

      showSnackbar(message, readiness.overall_readiness === 'جاهز للتأهيل' ? 'success' : 'warning');
    } catch (error) {
      showSnackbar('خطأ في التحقق من الجاهزية', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Program Functions
  const handleCreateProgram = async () => {
    try {
      setLoading(true);
      await axios.post(`${API_URL}/programs`, programData);
      showSnackbar('تم إنشاء برنامج التأهيل بنجاح');
      setProgramDialog(false);
      setProgramData({
        program_title: '',
        program_code: '',
        beneficiary_id: '',
        disability_type: '',
        program_type: '',
      });
      loadData();
    } catch (error) {
      showSnackbar('خطأ في إنشاء البرنامج', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Discharge program handler - temporarily unused
  // const handleDischargeProgram = async () => {
  //   try {
  //     setLoading(true);
  //     await axios.post(
  //       `${API_URL}/programs/discharge`,
  //       {
  //         discharge_reason: 'goal_achieved',
  //         discharge_summary: 'تم إنجاز أهداف البرنامج بنجاح',
  //         follow_up_plan: 'متابعة دورية شهرية',
  //       }
  //     );
  //     showSnackbar('تم إنهاء البرنامج بنجاح');
  //     loadData();
  //   } catch (error) {
  //     showSnackbar('خطأ في إنهاء البرنامج', 'error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Render Assessment Tab
  const renderAssessmentTab = () => (
    <Box>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setAssessmentDialog(true)}
        sx={{ mb: 2 }}
      >
        تقييم جديد
      </Button>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">إجمالي التقييمات</Typography>
              <Typography variant="h4">{statistics?.total_assessments || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">جاهزون للتأهيل</Typography>
              <Typography variant="h4" color="success.main">
                {statistics?.ready_for_rehabilitation || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">الإعاقة الحركية</Typography>
              <Typography variant="h4">{statistics?.by_type?.[0]?.count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">الإعاقة السمعية</Typography>
              <Typography variant="h4">{statistics?.by_type?.[1]?.count || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>اسم المريض</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>نوع الإعاقة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>درجة الشدة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>التاريخ</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assessments.length > 0 ? (
              assessments.map(assessment => (
                <TableRow key={assessment._id} hover>
                  <TableCell>{assessment.beneficiary_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={assessment.disability_profile?.type}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={assessment.disability_profile?.severity}
                      size="small"
                      color={
                        assessment.disability_profile?.severity === 'severe' ? 'error' : 'warning'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(assessment.createdAt).toLocaleDateString('ar-SA')}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleViewAssessmentReport(assessment._id)}
                      title="عرض التقرير"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleCheckReadiness(assessment._id)}
                      title="التحقق من الجاهزية"
                    >
                      <CheckCircleIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  لا توجد تقييمات
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Render Program Tab
  const renderProgramTab = () => (
    <Box>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setProgramDialog(true)}
        sx={{ mb: 2 }}
      >
        برنامج تأهيل جديد
      </Button>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">برامج نشطة</Typography>
              <Typography variant="h4" color="primary">
                {statistics?.active_programs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">برامج مكتملة</Typography>
              <Typography variant="h4" color="success.main">
                {statistics?.completed_programs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">برامج مفرغة</Typography>
              <Typography variant="h4" color="info.main">
                {statistics?.discharged_programs || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary">معدل الإنجاز</Typography>
              <Typography variant="h4">85%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>اسم البرنامج</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المريض</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>نوع البرنامج</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                الإجراءات
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {programs.length > 0 ? (
              programs.map(program => (
                <TableRow key={program._id} hover>
                  <TableCell>{program.program_title}</TableCell>
                  <TableCell>{program.beneficiary_name}</TableCell>
                  <TableCell>
                    <Chip label={program.program_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={program.program_status}
                      size="small"
                      color={program.program_status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" title="عرض التفاصيل">
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton size="small" title="إضافة جلسة">
                      <AddIcon />
                    </IconButton>
                    <IconButton size="small" title="إنهاء البرنامج">
                      <CheckCircleIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  لا توجد برامج
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  // Dialog for New Assessment
  const AssessmentDialog = () => (
    <Dialog
      open={assessmentDialog}
      onClose={() => setAssessmentDialog(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>تقييم جديد</DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="معرف المريض"
          value={assessmentData.beneficiary_id}
          onChange={e => setAssessmentData({ ...assessmentData, beneficiary_id: e.target.value })}
          margin="normal"
        />
        <TextField
          fullWidth
          label="اسم المريض"
          value={assessmentData.beneficiary_name}
          onChange={e => setAssessmentData({ ...assessmentData, beneficiary_name: e.target.value })}
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>نوع الإعاقة</InputLabel>
          <Select
            value={assessmentData.disability_profile.type}
            onChange={e =>
              setAssessmentData({
                ...assessmentData,
                disability_profile: { ...assessmentData.disability_profile, type: e.target.value },
              })
            }
          >
            <MenuItem value="physical">حركية</MenuItem>
            <MenuItem value="visual">بصرية</MenuItem>
            <MenuItem value="hearing">سمعية</MenuItem>
            <MenuItem value="intellectual">ذهنية</MenuItem>
            <MenuItem value="mental_health">نفسية</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth margin="normal">
          <InputLabel>درجة الشدة</InputLabel>
          <Select
            value={assessmentData.disability_profile.severity}
            onChange={e =>
              setAssessmentData({
                ...assessmentData,
                disability_profile: {
                  ...assessmentData.disability_profile,
                  severity: e.target.value,
                },
              })
            }
          >
            <MenuItem value="mild">خفيفة</MenuItem>
            <MenuItem value="moderate">متوسطة</MenuItem>
            <MenuItem value="severe">شديدة</MenuItem>
            <MenuItem value="profound">عميقة</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setAssessmentDialog(false)}>إلغاء</Button>
        <Button onClick={handleCreateAssessment} variant="contained">
          {loading ? <CircularProgress size={24} /> : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // Dialog for New Program
  const ProgramDialog = () => (
    <Dialog open={programDialog} onClose={() => setProgramDialog(false)} maxWidth="sm" fullWidth>
      <DialogTitle>برنامج تأهيل جديد</DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="عنوان البرنامج"
          value={programData.program_title}
          onChange={e => setProgramData({ ...programData, program_title: e.target.value })}
          margin="normal"
        />
        <TextField
          fullWidth
          label="كود البرنامج"
          value={programData.program_code}
          onChange={e => setProgramData({ ...programData, program_code: e.target.value })}
          margin="normal"
        />
        <TextField
          fullWidth
          label="معرف المريض"
          value={programData.beneficiary_id}
          onChange={e => setProgramData({ ...programData, beneficiary_id: e.target.value })}
          margin="normal"
        />
        <FormControl fullWidth margin="normal">
          <InputLabel>نوع البرنامج</InputLabel>
          <Select
            value={programData.program_type}
            onChange={e => setProgramData({ ...programData, program_type: e.target.value })}
          >
            <MenuItem value="inpatient">داخلي</MenuItem>
            <MenuItem value="outpatient">خارجي</MenuItem>
            <MenuItem value="home_based">منزلي</MenuItem>
            <MenuItem value="day_care">رعاية يومية</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setProgramDialog(false)}>إلغاء</Button>
        <Button onClick={handleCreateProgram} variant="contained">
          {loading ? <CircularProgress size={24} /> : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box
      sx={{
        p: 3,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh',
      }}
    >
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: '#333' }}>
        🏥 نظام إدارة التقييم والتأهيل لذوي الإعاقة
      </Typography>

      {loading && <CircularProgress />}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
          <Tab label="التقييمات" icon={<InfoIcon />} iconPosition="start" />
          <Tab label="برامج التأهيل" icon={<TrendingUpIcon />} iconPosition="start" />
          <Tab label="جلسات العلاج" icon={<CheckCircleIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      <Box sx={{ display: tabValue === 0 ? 'block' : 'none' }}>{renderAssessmentTab()}</Box>

      <Box sx={{ display: tabValue === 1 ? 'block' : 'none' }}>{renderProgramTab()}</Box>

      <AssessmentDialog />
      <ProgramDialog />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RehabilitationManagementPage;
