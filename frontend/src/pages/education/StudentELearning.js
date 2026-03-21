/**
 * Student E-Learning Page
 * صفحة التعلم الإلكتروني للطالب
 */

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from 'services/api';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Rating,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import BookIcon from '@mui/icons-material/Book';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import CheckIcon from '@mui/icons-material/Check';
import TimerIcon from '@mui/icons-material/Timer';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import LockIcon from '@mui/icons-material/Lock';
import { AttachIcon } from 'utils/iconAliases';

const categoryColors = {
  أكاديمي: '#3498db',
  'مهارات حياتية': '#2ecc71',
  تأهيل: '#e74c3c',
  لغات: '#9b59b6',
  تقنية: '#f39c12',
  فن: '#e67e22',
};

const levelMap = {
  مبتدئ: { color: '#2ecc71', label: 'مبتدئ' },
  متوسط: { color: '#f39c12', label: 'متوسط' },
  متقدم: { color: '#e74c3c', label: 'متقدم' },
};

const contentTypeIcons = {
  فيديو: <PlayIcon color="error" />,
  مقال: <BookIcon color="primary" />,
  اختبار: <QuizIcon color="warning" />,
  ملف: <AttachIcon color="action" />,
};

const StudentELearning = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('الكل');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDialog, setCourseDialog] = useState(false);

  const mockCourses = [
    {
      _id: '1',
      title: 'أساسيات الحساب والأرقام',
      description: 'تعلم الأرقام والعمليات الحسابية الأساسية بطرق ممتعة وتفاعلية',
      category: 'أكاديمي',
      level: 'مبتدئ',
      instructor: { name: 'أ. محمد العلي' },
      duration: '12 ساعة',
      lessonsCount: 24,
      enrolledCount: 45,
      rating: 4.5,
      ratingsCount: 20,
      tags: ['حساب', 'أرقام', 'رياضيات'],
      thumbnail: '',
      isPublished: true,
      isFree: true,
      lessons: [
        {
          _id: 'l1',
          title: 'التعرف على الأرقام 1-10',
          order: 1,
          contentType: 'فيديو',
          duration: 15,
          isFree: true,
        },
        {
          _id: 'l2',
          title: 'العد والترتيب',
          order: 2,
          contentType: 'فيديو',
          duration: 20,
          isFree: false,
        },
        {
          _id: 'l3',
          title: 'اختبار الوحدة الأولى',
          order: 3,
          contentType: 'اختبار',
          duration: 10,
          isFree: false,
        },
        {
          _id: 'l4',
          title: 'الجمع البسيط',
          order: 4,
          contentType: 'فيديو',
          duration: 25,
          isFree: false,
        },
      ],
    },
    {
      _id: '2',
      title: 'مهارات التواصل الاجتماعي',
      description: 'تطوير مهارات التواصل والتفاعل الاجتماعي مع الآخرين',
      category: 'مهارات حياتية',
      level: 'مبتدئ',
      instructor: { name: 'أ. سارة الحمد' },
      duration: '8 ساعات',
      lessonsCount: 16,
      enrolledCount: 62,
      rating: 4.8,
      ratingsCount: 35,
      tags: ['تواصل', 'اجتماعي', 'مهارات'],
      thumbnail: '',
      isPublished: true,
      isFree: true,
      lessons: [
        {
          _id: 'l1',
          title: 'التحية والتعارف',
          order: 1,
          contentType: 'فيديو',
          duration: 15,
          isFree: true,
        },
        {
          _id: 'l2',
          title: 'التعبير عن المشاعر',
          order: 2,
          contentType: 'فيديو',
          duration: 20,
          isFree: true,
        },
        {
          _id: 'l3',
          title: 'آداب الحديث',
          order: 3,
          contentType: 'مقال',
          duration: 10,
          isFree: false,
        },
      ],
    },
    {
      _id: '3',
      title: 'النطق والتخاطب - المستوى 1',
      description: 'تمارين نطق وتخاطب تفاعلية لتحسين مهارات الكلام',
      category: 'تأهيل',
      level: 'مبتدئ',
      instructor: { name: 'د. نورة الخالد' },
      duration: '15 ساعة',
      lessonsCount: 30,
      enrolledCount: 38,
      rating: 4.9,
      ratingsCount: 28,
      tags: ['نطق', 'تخاطب', 'تأهيل'],
      thumbnail: '',
      isPublished: true,
      isFree: false,
      lessons: [
        {
          _id: 'l1',
          title: 'حروف الهجاء - المجموعة الأولى',
          order: 1,
          contentType: 'فيديو',
          duration: 20,
          isFree: true,
        },
        {
          _id: 'l2',
          title: 'تمارين الشفاه واللسان',
          order: 2,
          contentType: 'فيديو',
          duration: 15,
          isFree: false,
        },
      ],
    },
    {
      _id: '4',
      title: 'الحاسوب للمبتدئين',
      description: 'تعلم استخدام الحاسوب والبرامج الأساسية خطوة بخطوة',
      category: 'تقنية',
      level: 'مبتدئ',
      instructor: { name: 'أ. فهد التقني' },
      duration: '10 ساعات',
      lessonsCount: 20,
      enrolledCount: 55,
      rating: 4.3,
      ratingsCount: 15,
      tags: ['حاسوب', 'تقنية', 'برامج'],
      thumbnail: '',
      isPublished: true,
      isFree: true,
      lessons: [
        {
          _id: 'l1',
          title: 'التعرف على أجزاء الحاسوب',
          order: 1,
          contentType: 'فيديو',
          duration: 15,
          isFree: true,
        },
        {
          _id: 'l2',
          title: 'استخدام لوحة المفاتيح',
          order: 2,
          contentType: 'فيديو',
          duration: 25,
          isFree: true,
        },
      ],
    },
    {
      _id: '5',
      title: 'الإنجليزية التفاعلية',
      description: 'تعلم اللغة الإنجليزية من خلال أنشطة تفاعلية وممتعة',
      category: 'لغات',
      level: 'مبتدئ',
      instructor: { name: 'أ. ريم الدولية' },
      duration: '20 ساعة',
      lessonsCount: 40,
      enrolledCount: 72,
      rating: 4.6,
      ratingsCount: 40,
      tags: ['إنجليزي', 'لغات', 'تعليم'],
      thumbnail: '',
      isPublished: true,
      isFree: true,
      lessons: [
        {
          _id: 'l1',
          title: 'الحروف الإنجليزية A-M',
          order: 1,
          contentType: 'فيديو',
          duration: 20,
          isFree: true,
        },
        {
          _id: 'l2',
          title: 'الحروف الإنجليزية N-Z',
          order: 2,
          contentType: 'فيديو',
          duration: 20,
          isFree: true,
        },
      ],
    },
  ];

  const mockMyCourses = [
    {
      ...mockCourses[0],
      isEnrolled: true,
      progress: 45,
      completedLessons: 11,
      enrollmentDate: new Date().toISOString(),
    },
    {
      ...mockCourses[1],
      isEnrolled: true,
      progress: 80,
      completedLessons: 13,
      enrollmentDate: new Date().toISOString(),
    },
  ];

  const mockStats = {
    totalEnrolled: 2,
    totalCompleted: 0,
    totalProgress: 62.5,
    totalLessonsCompleted: 24,
    totalHoursSpent: 8.5,
    certificates: 0,
    streak: 5,
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [coursesRes, myRes, statsRes] = await Promise.all([
        api
          .get(`/student-elearning/${userId}/courses`, {
            params: { search, category: filter !== 'الكل' ? filter : undefined },
          })
          .catch(() => null),
        api.get(`/student-elearning/${userId}/my-courses`).catch(() => null),
        api.get(`/student-elearning/${userId}/stats`).catch(() => null),
      ]);
      setCourses(coursesRes?.data?.success ? coursesRes.data.data?.courses : mockCourses);
      setMyCourses(myRes?.data?.success ? myRes.data.data?.courses : mockMyCourses);
      setStats(statsRes?.data?.success ? statsRes.data.data : mockStats);
    } catch {
      setCourses(mockCourses);
      setMyCourses(mockMyCourses);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, search, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEnroll = async courseId => {
    try {
      const res = await api
        .post(`/student-elearning/${userId}/enroll`, { courseId })
        .catch(() => null);
      if (res?.data?.success) {
        showSnackbar('تم التسجيل في الدورة بنجاح! 📚', 'success');
      } else {
        showSnackbar('تم التسجيل بنجاح (وضع تجريبي) 📚', 'success');
      }
      loadData();
    } catch {
      showSnackbar('حدث خطأ في التسجيل', 'error');
    }
  };

  const filteredCourses = courses.filter(c => {
    if (search && !c.title.includes(search) && !c.description.includes(search)) return false;
    if (filter !== 'الكل' && c.category !== filter) return false;
    return true;
  });

  const categories = ['الكل', ...new Set(courses.map(c => c.category))];

  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0984e3, #74b9ff)',
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: 'white',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          📚 التعلم الإلكتروني
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
          تعلّم بالسرعة التي تناسبك مع دورات تفاعلية ممتعة
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Chip
            icon={<SchoolIcon />}
            label={`${stats?.totalEnrolled || 0} دورة مسجل بها`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            icon={<CheckIcon />}
            label={`${stats?.totalLessonsCompleted || 0} درس مكتمل`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            icon={<TimerIcon />}
            label={`${stats?.totalHoursSpent || 0} ساعة دراسة`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            label={`🔥 سلسلة ${stats?.streak || 0} أيام`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<SchoolIcon />} label="كتالوج الدورات" iconPosition="start" />
          <Tab icon={<BookIcon />} label="دوراتي" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Course Catalog */}
      {tab === 0 && (
        <>
          {/* Search & Filter */}
          <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="ابحث عن دورة..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {categories.map(cat => (
                    <Chip
                      key={cat}
                      label={cat}
                      onClick={() => setFilter(cat)}
                      variant={filter === cat ? 'filled' : 'outlined'}
                      color={filter === cat ? 'primary' : 'default'}
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={3}>
            {filteredCourses.map(course => {
              const catColor = categoryColors[course.category] || '#3498db';
              const lvl = levelMap[course.level] || levelMap['مبتدئ'];
              return (
                <Grid item xs={12} sm={6} md={4} key={course._id}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                    }}
                  >
                    {/* Course Header */}
                    <Box
                      sx={{
                        background: `linear-gradient(135deg, ${catColor}, ${catColor}dd)`,
                        p: 3,
                        color: 'white',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Chip
                          label={course.category}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                        />
                        <Chip
                          label={lvl.label}
                          size="small"
                          sx={{ bgcolor: lvl.color, color: 'white' }}
                        />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {course.title}
                      </Typography>
                    </Box>

                    <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2, flex: 1 }}>
                        {course.description}
                      </Typography>

                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <InstructorIcon fontSize="small" color="action" />
                          <Typography variant="body2">{course.instructor.name}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">
                            <TimerIcon fontSize="inherit" /> {course.duration}
                          </Typography>
                          <Typography variant="body2">
                            <BookIcon fontSize="inherit" /> {course.lessonsCount} درس
                          </Typography>
                        </Box>
                      </Stack>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Rating value={course.rating} precision={0.5} size="small" readOnly />
                          <Typography variant="caption" color="textSecondary">
                            ({course.ratingsCount})
                          </Typography>
                        </Box>
                        <Chip
                          label={course.isFree ? 'مجاني' : 'مدفوع'}
                          size="small"
                          color={course.isFree ? 'success' : 'warning'}
                        />
                      </Box>

                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => {
                          setSelectedCourse(course);
                          setCourseDialog(true);
                        }}
                      >
                        عرض التفاصيل
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}

      {/* My Courses */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {myCourses.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                لم تسجل في أي دورة بعد. تصفح الكتالوج وابدأ رحلة التعلم!
              </Alert>
            </Grid>
          ) : (
            myCourses.map(course => {
              const catColor = categoryColors[course.category] || '#3498db';
              return (
                <Grid item xs={12} md={6} key={course._id}>
                  <Card sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {course.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {course.instructor.name}
                          </Typography>
                        </Box>
                        <Chip
                          label={course.category}
                          size="small"
                          sx={{ bgcolor: catColor, color: 'white' }}
                        />
                      </Box>

                      {/* Progress */}
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">التقدم</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {course.progress}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={course.progress}
                          sx={{ height: 10, borderRadius: 5 }}
                          color={
                            course.progress === 100
                              ? 'success'
                              : course.progress > 50
                                ? 'primary'
                                : 'warning'
                          }
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                          {course.completedLessons}/{course.lessonsCount} درس مكتمل
                        </Typography>
                      </Box>

                      {/* Lessons Preview */}
                      <List dense sx={{ bgcolor: 'grey.50', borderRadius: 2, mb: 2 }}>
                        {(course.lessons || []).slice(0, 4).map((lesson, i) => (
                          <ListItem key={lesson._id || i} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {contentTypeIcons[lesson.contentType] || <BookIcon />}
                            </ListItemIcon>
                            <ListItemText
                              primary={lesson.title}
                              secondary={`${lesson.duration} دقيقة`}
                              primaryTypographyProps={{ variant: 'body2' }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                            {i < (course.completedLessons || 0) && (
                              <CheckIcon color="success" fontSize="small" />
                            )}
                          </ListItem>
                        ))}
                      </List>

                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={<PlayIcon />}
                        onClick={() => {
                          setSelectedCourse(course);
                          setCourseDialog(true);
                        }}
                      >
                        {course.progress > 0 ? 'متابعة الدراسة' : 'ابدأ الآن'}
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      )}

      {/* Course Detail Dialog */}
      <Dialog open={courseDialog} onClose={() => setCourseDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{ bgcolor: categoryColors[selectedCourse?.category] || '#3498db', color: 'white' }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {selectedCourse?.title}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {selectedCourse?.instructor?.name}
          </Typography>
          <IconButton
            onClick={() => setCourseDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8, color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCourse && (
            <Stack spacing={3} sx={{ py: 2 }}>
              <Typography variant="body1">{selectedCourse.description}</Typography>

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <TimerIcon color="primary" />
                    <Typography variant="subtitle2">{selectedCourse.duration}</Typography>
                    <Typography variant="caption">المدة</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <BookIcon color="warning" />
                    <Typography variant="subtitle2">{selectedCourse.lessonsCount} درس</Typography>
                    <Typography variant="caption">الدروس</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={4}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
                    <PeopleIcon color="success" />
                    <Typography variant="subtitle2">{selectedCourse.enrolledCount}</Typography>
                    <Typography variant="caption">طالب مسجل</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  📋 محتوى الدورة
                </Typography>
                <List>
                  {(selectedCourse.lessons || []).map((lesson, i) => (
                    <ListItem
                      key={lesson._id || i}
                      sx={{ bgcolor: 'grey.50', borderRadius: 1, mb: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {contentTypeIcons[lesson.contentType] || <BookIcon />}
                      </ListItemIcon>
                      <ListItemText
                        primary={`${lesson.order}. ${lesson.title}`}
                        secondary={`${lesson.contentType} • ${lesson.duration} دقيقة`}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                      />
                      {lesson.isFree ? (
                        <Chip label="مجاني" size="small" color="success" />
                      ) : (
                        <LockIcon color="disabled" fontSize="small" />
                      )}
                    </ListItem>
                  ))}
                </List>
              </Box>

              {selectedCourse.tags && (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    الوسوم:
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    {selectedCourse.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseDialog(false)}>إغلاق</Button>
          {selectedCourse && !selectedCourse.isEnrolled && (
            <Button
              variant="contained"
              startIcon={<SchoolIcon />}
              onClick={() => {
                handleEnroll(selectedCourse._id);
                setCourseDialog(false);
              }}
            >
              التسجيل في الدورة
            </Button>
          )}
          {selectedCourse?.isEnrolled && (
            <Button variant="contained" startIcon={<PlayIcon />} color="success">
              متابعة الدراسة
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentELearning;
