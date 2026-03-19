// Phase 5: E-Learning Dashboard
import React, { useState, useEffect } from 'react';
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
import eLearningService from '../services/eLearning.service';

const ELearningDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', category: 'development' });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [coursesRes, enrollmentsRes] = await Promise.all([eLearningService.getAllCourses(), eLearningService.getMyCourses()]);
      setCourses(coursesRes);
      setMyEnrollments(enrollmentsRes);
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const handleCreateCourse = async () => {
    try {
      await eLearningService.createCourse(newCourse);
      setOpenDialog(false);
      loadData();
      setNewCourse({ title: '', description: '', category: 'development' });
    } catch (error) {
      alert('Error creating course: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEnroll = async courseId => {
    try {
      await eLearningService.enrollInCourse(courseId);
      loadData();
      alert('Enrolled successfully!');
    } catch (error) {
      alert('Enrollment failed');
    }
  };

  const isEnrolled = courseId => {
    return myEnrollments.some(e => e.course._id === courseId || e.course === courseId);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <SchoolIcon color="primary" />
          <Typography variant="h4">E-Learning Platform</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenDialog(true)}>
          New Course
        </Button>
      </Box>

      <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ mb: 3 }}>
        <Tab label="Browse Courses" />
        <Tab label="My Learning" />
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
                  image={course.thumbnailUrl || 'https://via.placeholder.com/300?text=Course'}
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
                    <Button size="small" variant="contained" color="success" onClick={() => navigate(`/lms/course/${course._id}`)}>
                      Continue Learning
                    </Button>
                  ) : (
                    <>
                      <Button size="small" onClick={() => navigate(`/lms/course/${course._id}`)}>
                        View Details
                      </Button>
                      <Button size="small" variant="contained" onClick={() => handleEnroll(course._id)}>
                        Enroll Now
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
                    onClick={() => navigate(`/lms/course/${enrollment.course._id || enrollment.course}`)}
                  >
                    Resume
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {myEnrollments.length === 0 && (
            <Typography variant="body1" sx={{ p: 3 }}>
              You are not enrolled in any courses yet.
            </Typography>
          )}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Course</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Course Title"
            fullWidth
            value={newCourse.title}
            onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newCourse.description}
            onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
          />
          <TextField
            select
            margin="dense"
            label="Category"
            fullWidth
            value={newCourse.category}
            onChange={e => setNewCourse({ ...newCourse, category: e.target.value })}
          >
            <MenuItem value="development">Development</MenuItem>
            <MenuItem value="therapy">Therapy</MenuItem>
            <MenuItem value="soft-skills">Soft Skills</MenuItem>
            <MenuItem value="technical">Technical</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateCourse} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ELearningDashboard;
