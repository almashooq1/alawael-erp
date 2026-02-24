/**
 * Student Assignments Page
 * صفحة واجبات الطالب
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  Button,
  Stack,
  Avatar,
  Divider,
  IconButton,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Warning as OverdueIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  AttachFile as AttachFileIcon,
  CalendarToday as CalendarIcon,
  Person as TeacherIcon,
} from '@mui/icons-material';
import studentPortalService from '../services/studentPortalService';

const StudentAssignments = () => {
  const [assignmentsData, setAssignmentsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  useEffect(() => {
    loadAssignmentsData();
  }, []);

  const loadAssignmentsData = async () => {
    try {
      setLoading(true);
      const studentId = 'STU001';
      const data = await studentPortalService.getStudentAssignments(studentId);
      setAssignmentsData(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleOpenDialog = assignment => {
    setSelectedAssignment(assignment);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedAssignment(null);
    setUploadFile(null);
  };

  const handleFileUpload = event => {
    setUploadFile(event.target.files[0]);
  };

  const handleSubmitAssignment = () => {
    // Handle assignment submission
    console.log('Submitting assignment:', selectedAssignment, uploadFile);
    handleCloseDialog();
  };

  const getPriorityColor = priority => {
    switch (priority) {
      case 'عاجل':
        return '#F44336';
      case 'عالي':
        return '#FF9800';
      case 'متوسط':
        return '#2196F3';
      case 'منخفض':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'مكتمل':
        return '#4CAF50';
      case 'قيد التنفيذ':
        return '#2196F3';
      case 'متأخر':
        return '#F44336';
      case 'قيد المراجعة':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'مكتمل':
        return <CompletedIcon sx={{ color: '#4CAF50' }} />;
      case 'قيد التنفيذ':
        return <PendingIcon sx={{ color: '#2196F3' }} />;
      case 'متأخر':
        return <OverdueIcon sx={{ color: '#F44336' }} />;
      default:
        return <AssignmentIcon />;
    }
  };

  const filterAssignments = () => {
    if (!assignmentsData) return [];

    switch (currentTab) {
      case 0: // الكل
        return assignmentsData.assignments;
      case 1: // قيد التنفيذ
        return assignmentsData.assignments.filter(a => a.status === 'قيد التنفيذ');
      case 2: // مكتمل
        return assignmentsData.assignments.filter(a => a.status === 'مكتمل');
      case 3: // متأخر
        return assignmentsData.assignments.filter(a => a.status === 'متأخر');
      default:
        return assignmentsData.assignments;
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold' }}>
          جاري التحميل...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (!assignmentsData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">لا توجد بيانات واجبات متاحة</Alert>
      </Box>
    );
  }

  const filteredAssignments = filterAssignments();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative' }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 60, height: 60 }}>
            <AssignmentIcon sx={{ fontSize: 35 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              الواجبات والمشاريع
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              إدارة ومتابعة جميع الواجبات الدراسية
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">إجمالي الواجبات</Typography>
                  <AssignmentIcon sx={{ fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {assignmentsData.stats.total}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">قيد التنفيذ</Typography>
                  <PendingIcon sx={{ fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {assignmentsData.stats.pending}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">مكتمل</Typography>
                  <CompletedIcon sx={{ fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {assignmentsData.stats.completed}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #F44336 0%, #D32F2F 100%)', color: 'white' }}>
            <CardContent>
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">متأخر</Typography>
                  <OverdueIcon sx={{ fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {assignmentsData.stats.overdue}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="الكل" />
          <Tab label="قيد التنفيذ" />
          <Tab label="مكتمل" />
          <Tab label="متأخر" />
        </Tabs>
      </Paper>

      {/* Assignments List */}
      <Grid container spacing={3}>
        {filteredAssignments.map((assignment, index) => (
          <Grid item xs={12} md={6} lg={4} key={index}>
            <Card
              sx={{
                height: '100%',
                transition: 'all 0.3s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                },
                animation: 'fadeIn 0.5s ease-in',
                animationDelay: `${index * 0.1}s`,
                animationFillMode: 'both',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(20px)' },
                  to: { opacity: 1, transform: 'translateY(0)' },
                },
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  {/* Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="start">
                    <Typography variant="h6" sx={{ fontWeight: 'bold', flex: 1 }}>
                      {assignment.title}
                    </Typography>
                    <Chip
                      label={assignment.priority}
                      size="small"
                      sx={{
                        bgcolor: getPriorityColor(assignment.priority),
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  </Stack>

                  {/* Subject */}
                  <Chip label={assignment.subject} size="small" variant="outlined" sx={{ width: 'fit-content' }} />

                  {/* Description */}
                  <Typography variant="body2" color="text.secondary" sx={{ minHeight: 60 }}>
                    {assignment.description}
                  </Typography>

                  <Divider />

                  {/* Info */}
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TeacherIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {assignment.teacher}
                      </Typography>
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        موعد التسليم: {assignment.dueDate}
                      </Typography>
                    </Stack>

                    {assignment.grade && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                          الدرجة: {assignment.grade} / {assignment.totalGrade}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>

                  {/* Status */}
                  <Chip
                    icon={getStatusIcon(assignment.status)}
                    label={assignment.status}
                    sx={{
                      bgcolor: getStatusColor(assignment.status),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />

                  {/* Actions */}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="contained"
                      startIcon={<UploadIcon />}
                      fullWidth
                      onClick={() => handleOpenDialog(assignment)}
                      disabled={assignment.status === 'مكتمل'}
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      تسليم
                    </Button>
                    {assignment.attachments && (
                      <IconButton color="primary" sx={{ border: '1px solid', borderColor: 'primary.main' }}>
                        <DownloadIcon />
                      </IconButton>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Submit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>تسليم الواجب</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {selectedAssignment && (
            <Stack spacing={3}>
              <Typography variant="h6">{selectedAssignment.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedAssignment.description}
              </Typography>

              <Divider />

              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  رفع ملف الواجب
                </Typography>
                <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} fullWidth>
                  اختيار ملف
                  <input type="file" hidden onChange={handleFileUpload} />
                </Button>
                {uploadFile && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    تم اختيار: {uploadFile.name}
                  </Alert>
                )}
              </Box>

              <TextField label="ملاحظات (اختياري)" multiline rows={4} fullWidth variant="outlined" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSubmitAssignment}
            disabled={!uploadFile}
            sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            تسليم الواجب
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentAssignments;
