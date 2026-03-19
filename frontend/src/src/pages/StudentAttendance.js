/**
 * Student Attendance Page
 * صفحة حضور الطالب
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Stack,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle as PresentIcon,
  Cancel as AbsentIcon,
  AccessTime as LateIcon,
  EventAvailable as AttendanceIcon,
  TrendingUp as TrendingUpIcon,
  CalendarMonth as CalendarIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import studentPortalService from '../services/studentPortalService';

const StudentAttendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendanceData();
  }, []);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const studentId = 'STU001';
      const data = await studentPortalService.getStudentAttendance(studentId);
      setAttendanceData(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'حاضر':
        return '#4CAF50';
      case 'غائب':
        return '#F44336';
      case 'متأخر':
        return '#FF9800';
      case 'عذر':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'حاضر':
        return <PresentIcon sx={{ color: '#4CAF50' }} />;
      case 'غائب':
        return <AbsentIcon sx={{ color: '#F44336' }} />;
      case 'متأخر':
        return <LateIcon sx={{ color: '#FF9800' }} />;
      case 'عذر':
        return <InfoIcon sx={{ color: '#2196F3' }} />;
      default:
        return <AttendanceIcon />;
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

  if (!attendanceData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">لا توجد بيانات حضور متاحة</Alert>
      </Box>
    );
  }

  const attendancePercentage =
    (attendanceData.stats.presentDays / (attendanceData.stats.totalDays - attendanceData.stats.excusedDays)) * 100;

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
        <Box
          sx={{
            position: 'absolute',
            bottom: -30,
            left: -30,
            width: 150,
            height: 150,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" sx={{ position: 'relative' }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.3)', width: 60, height: 60 }}>
            <AttendanceIcon sx={{ fontSize: 35 }} />
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              سجل الحضور
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              متابعة الحضور والغياب اليومي
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Attendance Rate */}
        <Grid item xs={12} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
              color: 'white',
              height: '100%',
              transition: 'transform 0.3s',
              '&:hover': { transform: 'scale(1.05)' },
            }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">نسبة الحضور</Typography>
                  <TrendingUpIcon />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
                  {attendancePercentage.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={attendancePercentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255,255,255,0.3)',
                    '& .MuiLinearProgress-bar': { bgcolor: 'white' },
                  }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Present Days */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="text.secondary">
                    أيام الحضور
                  </Typography>
                  <PresentIcon sx={{ color: '#4CAF50', fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#4CAF50' }}>
                  {attendanceData.stats.presentDays}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  من أصل {attendanceData.stats.totalDays} يوم دراسي
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Absent Days */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="text.secondary">
                    أيام الغياب
                  </Typography>
                  <AbsentIcon sx={{ color: '#F44336', fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#F44336' }}>
                  {attendanceData.stats.absentDays}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {attendanceData.stats.excusedDays} يوم بعذر
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Late Days */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" color="text.secondary">
                    أيام التأخير
                  </Typography>
                  <LateIcon sx={{ color: '#FF9800', fontSize: 30 }} />
                </Stack>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: '#FF9800' }}>
                  {attendanceData.stats.lateDays}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  تأخير متوسط {attendanceData.stats.averageLateness} دقيقة
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Monthly Attendance Pattern */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <CalendarIcon sx={{ mr: 1, color: '#667eea' }} />
            نمط الحضور الشهري
          </Typography>
          <Grid container spacing={1}>
            {attendanceData.monthlyPattern.map((day, index) => (
              <Grid item xs={12 / 7} key={index}>
                <Tooltip title={`${day.date} - ${day.status}`}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 1,
                      textAlign: 'center',
                      bgcolor: day.status ? getStatusColor(day.status) : '#f5f5f5',
                      color: day.status ? 'white' : 'text.secondary',
                      cursor: 'pointer',
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'scale(1.1)',
                        boxShadow: 4,
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {new Date(day.date).getDate()}
                    </Typography>
                  </Paper>
                </Tooltip>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Attendance Warnings */}
      {attendanceData.warnings && attendanceData.warnings.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            تنبيهات الحضور
          </Typography>
          {attendanceData.warnings.map((warning, index) => (
            <Typography key={index} variant="body2">
              • {warning}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Detailed Attendance Records */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
            سجل الحضور التفصيلي
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '& th': { color: 'white', fontWeight: 'bold' },
                  }}
                >
                  <TableCell>التاريخ</TableCell>
                  <TableCell>اليوم</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>وقت الوصول</TableCell>
                  <TableCell>وقت المغادرة</TableCell>
                  <TableCell>ملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {attendanceData.records.map((record, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      '&:hover': { bgcolor: '#f5f5f5' },
                      animation: 'fadeIn 0.5s ease-in',
                      animationDelay: `${index * 0.1}s`,
                      animationFillMode: 'both',
                      '@keyframes fadeIn': {
                        from: { opacity: 0, transform: 'translateY(10px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.day}</TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(record.status)}
                        label={record.status}
                        size="small"
                        sx={{
                          bgcolor: getStatusColor(record.status),
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      {record.checkIn || '-'}
                      {record.isLate && <Chip label="متأخر" size="small" color="warning" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{record.checkOut || '-'}</TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {record.notes || '-'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default StudentAttendance;
