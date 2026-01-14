/**
 * Student Portal Dashboard Page
 * صفحة لوحة معلومات بوابة الطالب
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Divider,
  Stack,
  IconButton,
  Alert,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assessment as AssessmentIcon,
  Assignment as AssignmentIcon,
  EventAvailable as AttendanceIcon,
  Announcement as AnnouncementIcon,
  EmojiEvents as TrophyIcon,
  ArrowForward as ArrowForwardIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import studentPortalService from '../services/studentPortalService';

const StudentPortal = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const studentId = 'STU001'; // في التطبيق الحقيقي، سيأتي من نظام المصادقة

      const [dashboard, announcementsData, assignmentsData] = await Promise.all([
        studentPortalService.getStudentDashboard(studentId),
        studentPortalService.getAnnouncements(studentId),
        studentPortalService.getStudentAssignments(studentId),
      ]);

      setDashboardData(dashboard);
      setAnnouncements(announcementsData.slice(0, 3)); // أول 3 إعلانات
      setUpcomingAssignments(assignmentsData.pending.slice(0, 3)); // أول 3 واجبات
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = priority => {
    const colors = {
      عالي: 'error',
      متوسط: 'warning',
      منخفض: 'info',
    };
    return colors[priority] || 'default';
  };

  if (loading || !dashboardData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  const { student, stats, quickActions } = dashboardData;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item>
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: '40px',
                  fontWeight: 700,
                  border: '4px solid white',
                  boxShadow: 3,
                }}
              >
                {student.name.charAt(0)}
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                مرحباً، {student.name}
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Chip icon={<SchoolIcon />} label={student.grade} sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip label={`القسم: ${student.section}`} sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip label={`الرقم الأكاديمي: ${student.studentId}`} sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              </Stack>
            </Grid>
            <Grid item>
              <IconButton sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.2)' }}>
                <NotificationsIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
        {/* Decorative Circles */}
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
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              borderRadius: 2,
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <TrophyIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats.gpa}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                المعدل التراكمي (GPA)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.gpa / 5) * 100}
                sx={{
                  mt: 1,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': { backgroundColor: 'white' },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              borderRadius: 2,
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <AttendanceIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats.attendance}%
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                نسبة الحضور
              </Typography>
              <LinearProgress
                variant="determinate"
                value={stats.attendance}
                sx={{
                  mt: 1,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': { backgroundColor: 'white' },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              borderRadius: 2,
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats.completedAssignments}/{stats.totalAssignments}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                الواجبات المكتملة
              </Typography>
              <LinearProgress
                variant="determinate"
                value={(stats.completedAssignments / stats.totalAssignments) * 100}
                sx={{
                  mt: 1,
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  '& .MuiLinearProgress-bar': { backgroundColor: 'white' },
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              color: 'white',
              borderRadius: 2,
              transition: 'transform 0.3s',
              '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <AssessmentIcon sx={{ fontSize: 40 }} />
                <Typography variant="h3" sx={{ fontWeight: 700 }}>
                  {stats.upcomingExams}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                اختبارات قادمة
              </Typography>
              <Typography variant="caption" sx={{ mt: 1, display: 'block', opacity: 0.9 }}>
                خلال الأسبوعين القادمين
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          🚀 الوصول السريع
        </Typography>
        <Grid container spacing={2}>
          {quickActions.map(action => (
            <Grid item xs={6} sm={3} key={action.id}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate(action.path)}
                sx={{
                  py: 2,
                  borderRadius: 2,
                  flexDirection: 'column',
                  gap: 1,
                  transition: 'all 0.3s',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: 3,
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50',
                  },
                }}
              >
                <Box sx={{ fontSize: 30 }}>
                  {action.icon === 'schedule' && '📅'}
                  {action.icon === 'grades' && '📊'}
                  {action.icon === 'assignments' && '📝'}
                  {action.icon === 'attendance' && '✅'}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {action.title}
                </Typography>
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Announcements */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AnnouncementIcon color="primary" />
                الإعلانات الأخيرة
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/student-portal/announcements')}>
                عرض الكل
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {announcements.map(announcement => (
                <Alert
                  key={announcement.id}
                  severity={announcement.priority === 'عالي' ? 'error' : announcement.priority === 'متوسط' ? 'warning' : 'info'}
                  icon={<span style={{ fontSize: 20 }}>{announcement.icon}</span>}
                  sx={{ borderRadius: 2 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {announcement.title}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {announcement.date} • {announcement.type}
                  </Typography>
                </Alert>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Upcoming Assignments */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon color="primary" />
                الواجبات القادمة
              </Typography>
              <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => navigate('/student-portal/assignments')}>
                عرض الكل
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              {upcomingAssignments.map(assignment => (
                <Card key={assignment.id} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, flex: 1 }}>
                        {assignment.title}
                      </Typography>
                      <Chip label={assignment.priority} size="small" color={getPriorityColor(assignment.priority)} sx={{ ml: 1 }} />
                    </Box>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      📚 {assignment.subject}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                        📅 التسليم: {assignment.dueDate}
                      </Typography>
                      <Chip label={assignment.submissionType} size="small" variant="outlined" />
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentPortal;
