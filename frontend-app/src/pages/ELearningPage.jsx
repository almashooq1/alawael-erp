import { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  School,
  PlayCircle,
  Add,
  Search,
  MenuBook,
  Quiz,
  EmojiEvents,
  Person,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import api from '../services/api';
import { toast } from 'react-toastify';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography color="textSecondary" variant="body2" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
        </Box>
        <Box
          sx={{
            bgcolor: `${color}.light`,
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Icon sx={{ color: `${color}.main`, fontSize: 28 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export default function ELearningPage() {
  const [tabValue, setTabValue] = useState(0);
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [openDetails, setOpenDetails] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, [tabValue]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        const response = await api.get('/elearning/courses');
        setCourses(response.data || []);
      } else {
        const response = await api.get('/elearning/my-courses');
        setMyCourses(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      // Demo data fallback
      if (tabValue === 0) {
        setCourses([
          {
            _id: '1',
            title: 'مقدمة في البرمجة بلغة JavaScript',
            description: 'تعلم أساسيات البرمجة باستخدام JavaScript من الصفر',
            instructor: 'أحمد محمود',
            duration: '12 ساعة',
            lessons: 45,
            level: 'مبتدئ',
            rating: 4.8,
            students: 1250,
            image: 'https://via.placeholder.com/300x200?text=JS+Course',
            category: 'برمجة',
          },
          {
            _id: '2',
            title: 'تصميم واجهات المستخدم بـ React',
            description: 'بناء تطبيقات ويب حديثة باستخدام React و Material-UI',
            instructor: 'سارة أحمد',
            duration: '18 ساعة',
            lessons: 62,
            level: 'متوسط',
            rating: 4.9,
            students: 890,
            image: 'https://via.placeholder.com/300x200?text=React+Course',
            category: 'تطوير واجهات',
          },
          {
            _id: '3',
            title: 'إدارة قواعد البيانات MongoDB',
            description: 'تعلم كيفية تصميم وإدارة قواعد بيانات NoSQL',
            instructor: 'محمد خالد',
            duration: '10 ساعات',
            lessons: 38,
            level: 'متقدم',
            rating: 4.7,
            students: 620,
            image: 'https://via.placeholder.com/300x200?text=MongoDB',
            category: 'قواعد بيانات',
          },
        ]);
      } else {
        setMyCourses([
          {
            _id: '1',
            title: 'مقدمة في البرمجة بلغة JavaScript',
            progress: 65,
            completedLessons: 29,
            totalLessons: 45,
            lastAccessed: '2026-01-14',
            nextLesson: 'الدرس 30: الدوال المتقدمة',
          },
          {
            _id: '2',
            title: 'تصميم واجهات المستخدم بـ React',
            progress: 40,
            completedLessons: 25,
            totalLessons: 62,
            lastAccessed: '2026-01-13',
            nextLesson: 'الدرس 26: استخدام Hooks',
          },
        ]);
      }
    }
    setLoading(false);
  };

  const handleEnroll = async (courseId) => {
    try {
      await api.post(`/elearning/courses/${courseId}/enroll`);
      toast.success('تم التسجيل في الدورة بنجاح');
      fetchCourses();
    } catch (error) {
      toast.error('فشل التسجيل في الدورة');
    }
  };

  const handleOpenDetails = (course) => {
    setSelectedCourse(course);
    setOpenDetails(true);
  };

  const handleCloseDetails = () => {
    setOpenDetails(false);
    setSelectedCourse(null);
  };

  const filteredCourses = courses.filter((c) =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { title: 'إجمالي الدورات', value: courses.length || '24', icon: MenuBook, color: 'primary' },
    { title: 'دوراتي', value: myCourses.length || '2', icon: School, color: 'success' },
    { title: 'الشهادات', value: '1', icon: EmojiEvents, color: 'warning' },
    { title: 'الطلاب', value: '2,760', icon: Person, color: 'info' },
  ];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          التعليم الإلكتروني
        </Typography>
        <Button variant="contained" startIcon={<Add />}>
          إضافة دورة جديدة
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
            <Tab label="جميع الدورات" />
            <Tab label="دوراتي" />
          </Tabs>
        </Box>

        {tabValue === 0 && (
          <TextField
            fullWidth
            placeholder="بحث عن دورة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        )}

        {tabValue === 0 ? (
          <Grid container spacing={3}>
            {filteredCourses.map((course) => (
              <Grid item xs={12} sm={6} md={4} key={course._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="180"
                    image={course.image}
                    alt={course.title}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box display="flex" gap={1} mb={1}>
                      <Chip label={course.category} size="small" color="primary" variant="outlined" />
                      <Chip label={course.level} size="small" />
                    </Box>
                    <Typography variant="h6" gutterBottom>
                      {course.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {course.description}
                    </Typography>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        <Person fontSize="small" /> {course.students} طالب
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        <Schedule fontSize="small" /> {course.duration}
                      </Typography>
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button size="small" onClick={() => handleOpenDetails(course)}>
                      التفاصيل
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<PlayCircle />}
                      onClick={() => handleEnroll(course._id)}
                    >
                      ابدأ الآن
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={3}>
            {myCourses.map((course) => (
              <Grid item xs={12} md={6} key={course._id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {course.title}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.secondary">
                          التقدم: {course.completedLessons} من {course.totalLessons} درس
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {course.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={course.progress} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      الدرس القادم: {course.nextLesson}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      آخر دخول: {course.lastAccessed}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button fullWidth variant="contained" startIcon={<PlayCircle />}>
                      متابعة التعلم
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Course Details Dialog */}
      <Dialog open={openDetails} onClose={handleCloseDetails} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCourse?.title}
        </DialogTitle>
        <DialogContent>
          {selectedCourse && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedCourse.description}
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    المحاضر: {selectedCourse.instructor}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    المدة: {selectedCourse.duration}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    عدد الدروس: {selectedCourse.lessons}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    المستوى: {selectedCourse.level}
                  </Typography>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                محتوى الدورة
              </Typography>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText primary="المقدمة والإعداد" secondary="5 دروس - 45 دقيقة" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <MenuBook color="action" />
                  </ListItemIcon>
                  <ListItemText primary="الأساسيات" secondary="12 درس - 2 ساعة" />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <Quiz color="action" />
                  </ListItemIcon>
                  <ListItemText primary="التطبيقات العملية" secondary="18 درس - 3 ساعات" />
                </ListItem>
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>إغلاق</Button>
          <Button
            variant="contained"
            startIcon={<PlayCircle />}
            onClick={() => {
              handleEnroll(selectedCourse._id);
              handleCloseDetails();
            }}
          >
            ابدأ الدورة
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
