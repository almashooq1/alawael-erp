import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Typography, Grid, Paper, Box, Button, List, ListItem, ListItemText, ListItemIcon, Divider } from '@mui/material';
import { PlayCircleFilled, CheckCircle, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';

const CourseViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);

  useEffect(() => {
    loadCourse();
  }, [id]);

  const loadCourse = async () => {
    try {
      const res = await axios.get(`/api/lms/courses/${id}`);
      setCourse(res.data);
      if (res.data.lessons && res.data.lessons.length > 0) {
        setSelectedLesson(res.data.lessons[0]);
      }
    } catch (error) {
      console.error('Failed to load course', error);
    }
  };

  const handleLessonSelect = lesson => {
    setSelectedLesson(lesson);
  };

  if (!course) return <Typography>Loading...</Typography>;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Button onClick={() => navigate('/lms')} sx={{ mb: 2 }}>
        Back to Courses
      </Button>
      <Typography variant="h4" gutterBottom>
        {course.title}
      </Typography>

      <Grid container spacing={3}>
        {/* Helper/Sidebar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3}>
            <Box p={2} bgcolor="primary.main" color="white">
              <Typography variant="h6">Course Content</Typography>
            </Box>
            <List>
              {course.lessons.map((lesson, index) => (
                <div key={lesson._id}>
                  <ListItem
                    button
                    selected={selectedLesson && selectedLesson._id === lesson._id}
                    onClick={() => handleLessonSelect(lesson)}
                  >
                    <ListItemIcon>
                      <PlayCircleFilled />
                    </ListItemIcon>
                    <ListItemText primary={`${index + 1}. ${lesson.title}`} secondary={`${lesson.duration} mins`} />
                  </ListItem>
                  <Divider />
                </div>
              ))}
              <ListItem button>
                <ListItemIcon>
                  <AddIcon />
                </ListItemIcon>
                <ListItemText primary="Add Lesson (Admin)" />
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
                  <Box sx={{ bgcolor: 'black', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                    <Typography color="white">Video Player Placeholder for {selectedLesson.videoUrl}</Typography>
                  </Box>
                )}
                <Typography variant="body1">{selectedLesson.content || 'No text content for this lesson.'}</Typography>
              </>
            ) : (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <Typography variant="h6" color="text.secondary">
                  Select a lesson to start learning
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
