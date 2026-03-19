// Phase 5: E-Learning Dashboard
import { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import { Add as AddIcon, School as SchoolIcon, PlayArrow } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import eLearningService from 'services/eLearning.service';
import { placeholderImage } from 'utils/placeholderImage';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients } from '../../theme/palette';

// بيانات تجريبية للدورات
const demoCourses = [
  {
    _id: '1',
    title: 'أساسيات العلاج الوظيفي',
    description: 'دورة شاملة في أساسيات العلاج الوظيفي وتطبيقاته',
    category: 'therapy',
    instructor: 'د. أحمد السالم',
    duration: '20 ساعة',
    enrolledCount: 45,
    lessons: [{}, {}, {}, {}],
    thumbnail: null,
  },
  {
    _id: '2',
    title: 'تقنيات التواصل مع الأطفال',
    description: 'تعلم أفضل تقنيات التواصل والتفاعل مع الأطفال ذوي الاحتياجات',
    category: 'communication',
    instructor: 'أ. سارة محمد',
    duration: '15 ساعة',
    enrolledCount: 32,
    lessons: [{}, {}, {}],
    thumbnail: null,
  },
  {
    _id: '3',
    title: 'إدارة البيانات الصحية',
    description: 'كيفية إدارة وتحليل البيانات الصحية للمستفيدين',
    category: 'development',
    instructor: 'م. خالد العتيبي',
    duration: '10 ساعات',
    enrolledCount: 28,
    lessons: [{}, {}],
    thumbnail: null,
  },
  {
    _id: '4',
    title: 'مهارات القيادة والإدارة',
    description: 'تطوير المهارات القيادية والإدارية للفريق',
    category: 'management',
    instructor: 'د. نورة الفهد',
    duration: '12 ساعة',
    enrolledCount: 55,
    lessons: [{}, {}, {}, {}, {}],
    thumbnail: null,
  },
];
const demoEnrollments = [
  { _id: 'e1', course: demoCourses[0], progress: 75, enrolledAt: '2026-01-15T10:00:00Z' },
  { _id: 'e2', course: demoCourses[1], progress: 40, enrolledAt: '2026-02-10T14:00:00Z' },
];

const ELearningDashboard = () => {
  const showSnackbar = useSnackbar();
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    category: 'development',
  });
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([
        eLearningService.getAllCourses(),
        eLearningService.getMyCourses(),
      ]);
      const coursesData = Array.isArray(coursesRes)
        ? coursesRes
        : Array.isArray(coursesRes?.data)
          ? coursesRes.data
          : Array.isArray(coursesRes?.courses)
            ? coursesRes.courses
            : demoCourses;
      const enrollData = Array.isArray(enrollmentsRes)
        ? enrollmentsRes
        : Array.isArray(enrollmentsRes?.data)
          ? enrollmentsRes.data
          : Array.isArray(enrollmentsRes?.enrollments)
            ? enrollmentsRes.enrollments
            : demoEnrollments;
      setCourses(coursesData);
      setMyEnrollments(enrollData);
    } catch (error) {
      logger.error('Failed to load data', error);
      setCourses(demoCourses);
      setMyEnrollments(demoEnrollments);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCourse = async () => {
    try {
      await eLearningService.createCourse(newCourse);
      setOpenDialog(false);
      loadData();
      setNewCourse({ title: '', description: '', category: 'development' });
    } catch (error) {
      showSnackbar(
        'Error creating course: ' + (error.response?.data?.message || 'An internal error occurred'),
        'error'
      );
    }
  };

  const handleEnroll = async courseId => {
    try {
      await eLearningService.enrollInCourse(courseId);
      loadData();
      showSnackbar('تم التسجيل بنجاح!', 'success');
    } catch (error) {
      // If API fails (e.g. demo data with non-ObjectId IDs), enroll locally
      const course = courses.find(c => c._id === courseId);
      if (course) {
        setMyEnrollments(prev => [
          ...prev,
          { _id: `local-${Date.now()}`, course, progress: 0, enrolledAt: new Date().toISOString() },
        ]);
        showSnackbar('تم التسجيل بنجاح!', 'success');
        return;
      }
      showSnackbar('فشل التسجيل', 'error');
    }
  };

  const isEnrolled = courseId => {
    return myEnrollments.some(e => e.course._id === courseId || e.course === courseId);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.success, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              التعليم الإلكتروني
            </Typography>
            <Typography variant="body2">منصة التعليم والتدريب عن بعد</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            دورة جديدة
          </Button>
        </Box>
      </Box>

      <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ mb: 3 }}>
        <Tab label="تصفح الدورات" />
        <Tab label="تعلّمي" />
      </Tabs>

      {/* Browse Courses Tab */}
      {tabIndex === 0 && (
        <Grid container spacing={3}>
          {courses.map(course => (
            <Grid item xs={12} sm={6} md={4} key={course._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={
                    course.thumbnailUrl || placeholderImage('Course', '667eea', 'ffffff', 300, 300)
                  }
                  alt={course.title}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="div">
                    {course.title}
                  </Typography>
                  <Chip label={course.category} size="small" color="primary" sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {course.description.substring(0, 100)}...
                  </Typography>
                </CardContent>
                <CardActions>
                  {isEnrolled(course._id) ? (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      onClick={() => navigate(`/lms/course/${course._id}`)}
                    >
                      متابعة التعلم
                    </Button>
                  ) : (
                    <>
                      <Button size="small" onClick={() => navigate(`/lms/course/${course._id}`)}>
                        عرض التفاصيل
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleEnroll(course._id)}
                      >
                        التسجيل الآن
                      </Button>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* My Learning Tab */}
      {tabIndex === 1 && (
        <Grid container spacing={3}>
          {myEnrollments.map(enrollment => (
            <Grid item xs={12} sm={6} md={4} key={enrollment._id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5">
                    {enrollment.course.title}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress variant="determinate" value={enrollment.progress} />
                    </Box>
                    <Box sx={{ minWidth: 35 }}>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(enrollment.progress)}%
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() =>
                      navigate(`/lms/course/${enrollment.course._id || enrollment.course}`)
                    }
                  >
                    استئناف
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {myEnrollments.length === 0 && (
            <Typography variant="body1" sx={{ p: 3 }}>
              لم تسجل في أي دورة بعد.
            </Typography>
          )}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>إنشاء دورة جديدة</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="عنوان الدورة"
            fullWidth
            value={newCourse.title}
            onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="الوصف"
            fullWidth
            multiline
            rows={3}
            value={newCourse.description}
            onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
          />
          <TextField
            select
            margin="dense"
            label="التصنيف"
            fullWidth
            value={newCourse.category}
            onChange={e => setNewCourse({ ...newCourse, category: e.target.value })}
          >
            <MenuItem value="development">تطوير</MenuItem>
            <MenuItem value="therapy">علاج</MenuItem>
            <MenuItem value="soft-skills">مهارات ناعمة</MenuItem>
            <MenuItem value="technical">تقني</MenuItem>
            <MenuItem value="other">أخرى</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button onClick={handleCreateCourse} variant="contained">
            إنشاء
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ELearningDashboard;
