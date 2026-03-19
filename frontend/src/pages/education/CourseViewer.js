import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import { PlayCircleFilled, Add as AddIcon, School as SchoolIcon } from '@mui/icons-material';
import apiClient from 'services/api.client';
import logger from 'utils/logger';
import { gradients } from 'theme/palette';

const CourseViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const loadCourse = useCallback(async () => {
    try {
      const data = await apiClient.get(`/lms/courses/${id}`);
      setCourse(data);
      if (data.lessons && data.lessons.length > 0) {
        setSelectedLesson(data.lessons[0]);
      }
    } catch (error) {
      logger.error('Failed to load course', error);
    }
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const handleLessonSelect = lesson => {
    setSelectedLesson(lesson);
  };

  if (!course) return <Typography>جاري التحميل...</Typography>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button onClick={() => navigate('/lms')} sx={{ mb: 2 }}>
        العودة للدورات
      </Button>

      {/* Gradient Header */}
      <Box sx={{ background: gradients.ocean, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SchoolIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              {course.title}
            </Typography>
            <Typography variant="body2">عرض محتوى الدورة والدروس التعليمية</Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Helper/Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3}>
            <Box p={2} bgcolor="primary.main" color="white">
              <Typography variant="h6">محتوى الدورة</Typography>
            </Box>
            <List>
              {(course.lessons || []).map((lesson, index) => (
                <div key={lesson._id}>
                  <ListItem
                    button
                    selected={selectedLesson && selectedLesson._id === lesson._id}
                    onClick={() => handleLessonSelect(lesson)}
                  >
                    <ListItemIcon>
                      <PlayCircleFilled />
                    </ListItemIcon>
                    <ListItemText
                      primary={`${index + 1}. ${lesson.title}`}
                      secondary={`${lesson.duration} دقيقة`}
                    />
                  </ListItem>
                  <Divider />
                </div>
              ))}
              <ListItem button>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="إضافة درس (مشرف)" />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Content Viewer */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, minHeight: '600px' }}>
            {selectedLesson ? (
              <>
                <Typography variant="h5" gutterBottom>
                  {selectedLesson.title}
                </Typography>
                {selectedLesson.videoUrl && (
                  <Box sx={{ bgcolor: 'black', borderRadius: 1, overflow: 'hidden', mb: 3 }}>
                    <Box
                      component="video"
                      src={selectedLesson.videoUrl}
                      controls
                      sx={{ width: '100%', maxHeight: 450, display: 'block' }}
                      controlsList="nodownload"
                      poster=""
                    >
                      Your browser does not support the video tag.
                    </Box>
                  </Box>
                )}
                <Typography variant="body1">
                  {selectedLesson.content || 'لا يوجد محتوى نصي لهذا الدرس.'}
                </Typography>
              </>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography variant="h6" color="text.secondary">
                  اختر درساً لبدء التعلم
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default CourseViewer;
