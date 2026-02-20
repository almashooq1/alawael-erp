/**
 * مكون إدارة ملفات الموظفين
 * Employee Profile Manager Component
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Button,
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
  Paper,
  Chip,
  Box,
  Typography,
  Tabs,
  Tab,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  School,
  VerifiedUser,
  WorkHistory,
  Timeline,
  ExpandMore,
  Download,
  Upload,
  Close,
  Check,
  Info
} from '@mui/icons-material';
import axios from 'axios';

const EmployeeProfileManager = ({ employeeId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [formData, setFormData] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, [employeeId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/hr/employees/${employeeId}`);
      setProfile(response.data.data);
    } catch (error) {
      setError('خطأ في تحميل ملف الموظف');
    } finally {
      setLoading(false);
    }
  };

  const openAddDialog = (type) => {
    setDialogType(type);
    setFormData({});
    setOpenDialog(true);
  };

  const closeDialog = () => {
    setOpenDialog(false);
    setDialogType('');
    setFormData({});
  };

  const handleAddQualification = async () => {
    try {
      await axios.post(
        `/api/hr/employees/${employeeId}/add-qualification`,
        formData
      );
      setSuccess('تم إضافة المؤهل بنجاح');
      loadProfile();
      closeDialog();
    } catch (error) {
      setError('خطأ في إضافة المؤهل');
    }
  };

  const handleAddCertification = async () => {
    try {
      await axios.post(
        `/api/hr/employees/${employeeId}/add-certification`,
        formData
      );
      setSuccess('تم إضافة الشهادة بنجاح');
      loadProfile();
      closeDialog();
    } catch (error) {
      setError('خطأ في إضافة الشهادة');
    }
  };

  const handleAddTraining = async () => {
    try {
      await axios.post(
        `/api/hr/employees/${employeeId}/add-training`,
        formData
      );
      setSuccess('تم إضافة الدورة بنجاح');
      loadProfile();
      closeDialog();
    } catch (error) {
      setError('خطأ في إضافة الدورة');
    }
  };

  const renderQualifications = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">المؤهلات العلمية</Typography>
        <Button
          startIcon={<Add />}
          variant="contained"
          size="small"
          onClick={() => openAddDialog('qualification')}
        >
          إضافة مؤهل
        </Button>
      </Box>

      {profile?.professionalRecord?.qualifications?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>الدرجة العلمية</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التخصص</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المؤسسة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>سنة التخرج</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profile.professionalRecord.qualifications.map((qual, index) => (
                <TableRow key={index}>
                  <TableCell>{qual.degree}</TableCell>
                  <TableCell>{qual.field}</TableCell>
                  <TableCell>{qual.institution}</TableCell>
                  <TableCell>{new Date(qual.graduationDate).getFullYear()}</TableCell>
                  <TableCell>
                    <Chip
                      label={qual.verificationStatus}
                      size="small"
                      color={qual.verificationStatus === 'verified' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="تحرير">
                      <IconButton size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">لا توجد مؤهلات مسجلة</Alert>
      )}
    </Box>
  );

  const renderCertifications = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">الشهادات المهنية</Typography>
        <Button
          startIcon={<Add />}
          variant="contained"
          size="small"
          onClick={() => openAddDialog('certification')}
        >
          إضافة شهادة
        </Button>
      </Box>

      {profile?.professionalRecord?.certifications?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>اسم الشهادة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الجهة المصدرة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الإصدار</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الانتهاء</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profile.professionalRecord.certifications.map((cert, index) => (
                <TableRow key={index}>
                  <TableCell>{cert.name}</TableCell>
                  <TableCell>{cert.issuingOrganization}</TableCell>
                  <TableCell>{new Date(cert.issueDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{new Date(cert.expiryDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    <Chip
                      label={cert.status}
                      size="small"
                      color={cert.status === 'active' ? 'success' : 'warning'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="تحرير">
                      <IconButton size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">لا توجد شهادات مسجلة</Alert>
      )}
    </Box>
  );

  const renderTrainings = () => (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">الدورات التدريبية</Typography>
        <Button
          startIcon={<Add />}
          variant="contained"
          size="small"
          onClick={() => openAddDialog('training')}
        >
          إضافة دورة
        </Button>
      </Box>

      {profile?.professionalRecord?.trainingCourses?.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>عنوان الدورة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المقدم</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>المدة (ساعات)</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>التقييم</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }} align="center">الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {profile.professionalRecord.trainingCourses.map((training, index) => (
                <TableRow key={index}>
                  <TableCell>{training.courseTitle}</TableCell>
                  <TableCell>{training.provider}</TableCell>
                  <TableCell>{training.duration}</TableCell>
                  <TableCell>{new Date(training.startDate).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{training.rating || '-'}/5</TableCell>
                  <TableCell align="center">
                    <Tooltip title="تفاصيل">
                      <IconButton size="small">
                        <Info fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="حذف">
                      <IconButton size="small">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">لا توجد دورات مسجلة</Alert>
      )}
    </Box>
  );

  const renderQualificationDialog = () => (
    <Dialog open={openDialog && dialogType === 'qualification'} onClose={closeDialog} maxWidth="sm" fullWidth>
      <DialogTitle>إضافة مؤهل علمي</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>الدرجة العلمية</InputLabel>
            <Select
              value={formData.degree || ''}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
              label="الدرجة العلمية"
            >
              <MenuItem value="ثانوية">ثانوية</MenuItem>
              <MenuItem value="دبلوم">دبلوم</MenuItem>
              <MenuItem value="بكالوريوس">بكالوريوس</MenuItem>
              <MenuItem value="ماجستير">ماجستير</MenuItem>
              <MenuItem value="دكتوراه">دكتوراه</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="التخصص"
            fullWidth
            value={formData.field || ''}
            onChange={(e) => setFormData({ ...formData, field: e.target.value })}
          />

          <TextField
            label="المؤسسة التعليمية"
            fullWidth
            value={formData.institution || ''}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
          />

          <TextField
            label="سنة التخرج"
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            value={formData.graduationDate || ''}
            onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })}
          />

          <TextField
            label="المعدل التراكمي (GPA)"
            type="number"
            inputProps={{ step: "0.01", min: "0", max: "4" }}
            fullWidth
            value={formData.gpa || ''}
            onChange={(e) => setFormData({ ...formData, gpa: parseFloat(e.target.value) })}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={closeDialog}>إلغاء</Button>
        <Button onClick={handleAddQualification} variant="contained" color="primary">
          إضافة
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="إدارة ملف الموظف"
          subheader={profile && `${profile.personalInfo?.firstName} ${profile.personalInfo?.lastName}`}
        />
        <CardContent>
          {loading ? (
            <CircularProgress />
          ) : (
            <>
              <Tabs
                value={tabValue}
                onChange={(e, newValue) => setTabValue(newValue)}
                sx={{ mb: 3 }}
              >
                <Tab label="المؤهلات العلمية" icon={<School />} iconPosition="start" />
                <Tab label="الشهادات المهنية" icon={<VerifiedUser />} iconPosition="start" />
                <Tab label="الدورات التدريبية" icon={<Timeline />} iconPosition="start" />
                <Tab label="الخبرات السابقة" icon={<WorkHistory />} iconPosition="start" />
              </Tabs>

              {tabValue === 0 && renderQualifications()}
              {tabValue === 1 && renderCertifications()}
              {tabValue === 2 && renderTrainings()}
            </>
          )}
        </CardContent>
      </Card>

      {renderQualificationDialog()}
    </Container>
  );
};

export default EmployeeProfileManager;
