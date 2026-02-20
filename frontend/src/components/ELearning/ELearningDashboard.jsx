import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  LinearProgress,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Pagination,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  AccessibilityNew as AccessibilityIcon,
  PlayCircle as PlayIcon,
  QuizOutlined as QuizIcon,
  Certificate as CertificateIcon,
  Book as BookIcon,
  VideoLibrary as VideoIcon,
  AudioFile as AudioIcon,
  Description as DocumentIcon
} from '@mui/icons-material';
import axios from 'axios';

const ELearningDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // User stats
  const [userStats, setUserStats] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    if (activeTab === 0) {
      fetchCourses();
    } else if (activeTab === 1) {
      fetchMyCourses();
    } else if (activeTab === 2) {
      fetchMediaLibrary();
    } else if (activeTab === 3) {
      fetchCertificates();
    }
  }, [activeTab, page, category, level, searchQuery]);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (category) params.append('category', category);
      if (level) params.append('level', level);
      params.append('page', page);
      params.append('limit', 12);

      const response = await axios.get(`${API_URL}/elearning/courses?${params}`);
      setCourses(response.data.data.courses);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`${API_URL}/elearning/my-courses?userId=${userId}`);
      setMyCourses(response.data.data);
    } catch (error) {
      console.error('Error fetching my courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaLibrary = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/elearning/media?page=${page}&limit=20`);
      setMediaLibrary(response.data.data.media);
      setTotalPages(response.data.data.pagination.pages);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`${API_URL}/elearning/my-certificates?userId=${userId}`);
      setCertificates(response.data.data);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await axios.get(`${API_URL}/elearning/stats/user/${userId}`);
      setUserStats(response.data.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleEnrollCourse = async (courseId) => {
    try {
      const userId = localStorage.getItem('userId');
      await axios.post(`${API_URL}/elearning/enroll/${courseId}`, { userId });
      alert('تم التسجيل في الدورة بنجاح!');
      fetchCourses();
    } catch (error) {
      console.error('Error enrolling:', error);
      alert(error.response?.data?.message || 'خطأ في التسجيل');
    }
  };

  const handleCourseClick = (course) => {
    setSelectedCourse(course);
    setDialogOpen(true);
  };

  const categories = [
    { value: 'technical', label: 'تقنية' },
    { value: 'management', label: 'إدارية' },
    { value: 'soft-skills', label: 'مهارات ناعمة' },
    { value: 'compliance', label: 'امتثال' },
    { value: 'accessibility', label: 'إمكانية الوصول' },
    { value: 'rehabilitation', label: 'تأهيل' }
  ];

  const levels = [
    { value: 'beginner', label: 'مبتدئ' },
    { value: 'intermediate', label: 'متوسط' },
    { value: 'advanced', label: 'متقدم' }
  ];

  const renderCourseCard = (course, isEnrolled = false) => (
    <Grid item xs={12} sm={6} md={4} key={course._id}>
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'transform 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4
          }
        }}
        onClick={() => handleCourseClick(course)}
      >
        <CardMedia
          component="img"
          height="200"
          image={course.thumbnail || '/placeholder-course.jpg'}
          alt={course.title}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ mb: 1 }}>
            <Chip 
              label={categories.find(c => c.value === course.category)?.label || course.category} 
              size="small" 
              color="primary" 
              sx={{ mr: 1 }}
            />
            <Chip 
              label={levels.find(l => l.value === course.level)?.label || course.level} 
              size="small" 
              variant="outlined"
            />
            {course.accessibility?.hasSubtitles && (
              <Tooltip title="يدعم إمكانية الوصول">
                <AccessibilityIcon sx={{ ml: 1, color: 'success.main', fontSize: 20 }} />
              </Tooltip>
            )}
          </Box>
          
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            {course.title}
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}
          >
            {course.description}
          </Typography>

          {isEnrolled ? (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">التقدم</Typography>
                <Typography variant="body2">{course.progress?.percentage || 0}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={course.progress?.percentage || 0} 
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Rating value={course.rating?.average || 0} readOnly size="small" precision={0.5} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                ({course.enrollmentCount || 0} طالب)
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {course.instructor?.name || 'مدرب'}
            </Typography>
            {!isEnrolled && (
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEnrollCourse(course._id);
                }}
              >
                تسجيل
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  const renderMediaCard = (media) => {
    const getMediaIcon = (type) => {
      switch(type) {
        case 'video': return <VideoIcon />;
        case 'audio': return <AudioIcon />;
        case 'document': return <DocumentIcon />;
        default: return <BookIcon />;
      }
    };

    return (
      <Grid item xs={12} sm={6} md={3} key={media._id}>
        <Card sx={{ height: '100%' }}>
          {media.thumbnail && (
            <CardMedia
              component="img"
              height="140"
              image={media.thumbnail}
              alt={media.title}
            />
          )}
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getMediaIcon(media.type)}
              <Typography variant="caption" sx={{ ml: 1 }}>
                {media.type}
              </Typography>
              {media.accessibilityFeatures?.isAccessible && (
                <AccessibilityIcon sx={{ ml: 'auto', color: 'success.main', fontSize: 18 }} />
              )}
            </Box>
            <Typography variant="subtitle2" gutterBottom>
              {media.title}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              المشاهدات: {media.views} | التحميلات: {media.downloads}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    );
  };

  const renderCertificateCard = (cert) => (
    <Grid item xs={12} sm={6} md={4} key={cert._id}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CertificateIcon sx={{ fontSize: 60, color: 'warning.main' }} />
          </Box>
          <Typography variant="h6" align="center" gutterBottom>
            {cert.course?.title}
          </Typography>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Chip label={`الدرجة: ${cert.grade}`} color="success" />
          </Box>
          <Typography variant="body2" color="text.secondary" align="center">
            تاريخ الإصدار: {new Date(cert.issuedAt).toLocaleDateString('ar-SA')}
          </Typography>
          <Typography variant="caption" display="block" align="center" sx={{ mt: 1 }}>
            رقم الشهادة: {cert.certificateId}
          </Typography>
          <Button
            variant="outlined"
            fullWidth
            sx={{ mt: 2 }}
            onClick={() => window.open(cert.pdfUrl, '_blank')}
          >
            تحميل الشهادة
          </Button>
        </CardContent>
      </Card>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header with Stats */}
      {userStats && (
        <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Typography variant="h4" gutterBottom>
              منصة التعلم المؤسسي
            </Typography>
            <Typography variant="subtitle1" sx={{ mb: 3 }}>
              منصة تعليمية شاملة مع دعم كامل لذوي الإعاقة
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3">{userStats.totalCourses}</Typography>
                  <Typography variant="body2">إجمالي الدورات</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3">{userStats.completedCourses}</Typography>
                  <Typography variant="body2">مكتملة</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3">{userStats.inProgressCourses}</Typography>
                  <Typography variant="body2">قيد التقدم</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h3">{userStats.certificatesEarned}</Typography>
                  <Typography variant="body2">الشهادات</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="جميع الدورات" icon={<BookIcon />} iconPosition="start" />
          <Tab label="دوراتي" icon={<PlayIcon />} iconPosition="start" />
          <Tab label="مكتبة الوسائط" icon={<VideoIcon />} iconPosition="start" />
          <Tab label="شهاداتي" icon={<CertificateIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Filters (for Courses tab) */}
      {activeTab === 0 && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="ابحث عن دورة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>التصنيف</InputLabel>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  label="التصنيف"
                >
                  <MenuItem value="">الكل</MenuItem>
                  {categories.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>المستوى</InputLabel>
                <Select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  label="المستوى"
                >
                  <MenuItem value="">الكل</MenuItem>
                  {levels.map(lvl => (
                    <MenuItem key={lvl.value} value={lvl.value}>{lvl.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => {
                  setSearchQuery('');
                  setCategory('');
                  setLevel('');
                }}
              >
                مسح الفلاتر
              </Button>
            </Grid>
          </Grid>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>جاري التحميل...</Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {activeTab === 0 && courses.map(course => renderCourseCard(course))}
            {activeTab === 1 && myCourses.map(enrollment => renderCourseCard(enrollment.course, true))}
            {activeTab === 2 && mediaLibrary.map(media => renderMediaCard(media))}
            {activeTab === 3 && certificates.map(cert => renderCertificateCard(cert))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(e, value) => setPage(value)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Course Details Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        {selectedCourse && (
          <>
            <DialogTitle>{selectedCourse.title}</DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedCourse.description}
              </Typography>
              
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2" gutterBottom>مميزات إمكانية الوصول:</Typography>
                {selectedCourse.accessibility?.hasSubtitles && (
                  <Chip label="ترجمة" size="small" sx={{ mr: 1, mb: 1 }} />
                )}
                {selectedCourse.accessibility?.hasSignLanguage && (
                  <Chip label="لغة الإشارة" size="small" sx={{ mr: 1, mb: 1 }} />
                )}
                {selectedCourse.accessibility?.hasAudioDescription && (
                  <Chip label="وصف صوتي" size="small" sx={{ mr: 1, mb: 1 }} />
                )}
                {selectedCourse.accessibility?.hasScreenReaderSupport && (
                  <Chip label="قارئ الشاشة" size="small" sx={{ mr: 1, mb: 1 }} />
                )}
              </Box>

              <Typography variant="body2" color="text.secondary">
                المدة: {selectedCourse.duration?.hours}ساعة {selectedCourse.duration?.minutes}دقيقة
              </Typography>
              <Typography variant="body2" color="text.secondary">
                عدد الدروس: {selectedCourse.lessons?.length || 0}
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>إغلاق</Button>
              <Button 
                variant="contained" 
                onClick={() => {
                  handleEnrollCourse(selectedCourse._id);
                  setDialogOpen(false);
                }}
              >
                تسجيل في الدورة
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default ELearningDashboard;
