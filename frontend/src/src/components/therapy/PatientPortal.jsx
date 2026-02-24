/**
 * Patient Portal for Therapy Sessions
 * بوابة المريض لجلسات العلاج
 *
 * Allows patients to view sessions, progress, and provide feedback
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  TextField,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Avatar,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/material';
import {
  CheckCircle,
  Schedule,
  TrendingUp,
  Chat,
  Download,
  Cancel
} from '@mui/icons-material';
import axios from 'axios';
import { format, formatDistance } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
});

// ============================================
// PATIENT PORTAL DASHBOARD
// ============================================

export default function PatientPortal() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [progress, setProgress] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: ''
  });

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      setLoading(true);

      // Get sessions
      const sessionsResponse = await api.get('/therapy-sessions/patient/my-sessions');
      setSessions(sessionsResponse.data.data);

      // Get progress
      const progressResponse = await api.get('/therapy-sessions/patient/my-progress');
      setProgress(progressResponse.data.data);
    } catch (error) {
      console.error('Failed to fetch patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      await api.post(
        `/therapy-sessions/${selectedSession._id}/feedback`,
        feedback
      );
      setFeedbackDialog(false);
      fetchPatientData();
      alert('Thank you for your feedback!');
    } catch (error) {
      alert('Failed to submit feedback');
    }
  };

  const cancelSession = async (sessionId) => {
    if (window.confirm('Are you sure you want to cancel this session?')) {
      try {
        await api.post(`/therapy-sessions/${sessionId}/cancel`, {
          reason: 'Patient request'
        });
        fetchPatientData();
        alert('Session cancelled successfully');
      } catch (error) {
        alert('Failed to cancel session');
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  const upcomingSessions = sessions.filter(s => new Date(s.date) > new Date() && s.status !== 'CANCELLED');
  const completedSessions = sessions.filter(s => s.status === 'COMPLETED');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          My Therapy Portal
        </Typography>
        <Typography color="textSecondary">
          Track your therapy progress and manage your sessions
        </Typography>
      </Box>

      {/* Progress Summary */}
      {progress && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Sessions
                </Typography>
                <Typography variant="h5">{completedSessions.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Upcoming Sessions
                </Typography>
                <Typography variant="h5">{upcomingSessions.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Progress
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: '100%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress.progressPercentage || 0}
                    />
                  </Box>
                  <Typography variant="body2">
                    {(progress.progressPercentage || 0).toFixed(0)}%
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Satisfaction
                </Typography>
                <Rating value={progress.avgRating || 0} readOnly />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Upcoming Sessions */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Upcoming Sessions"
          avatar={<Schedule />}
        />
        <CardContent>
          {upcomingSessions.length === 0 ? (
            <Typography color="textSecondary">
              No upcoming sessions scheduled. Please contact your therapist to schedule.
            </Typography>
          ) : (
            <List>
              {upcomingSessions.map(session => (
                <ListItem
                  key={session._id}
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    mb: 1,
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <Avatar sx={{ mr: 2 }}>
                    <Schedule />
                  </Avatar>
                  <ListItemText
                    primary={`${format(new Date(session.date), 'EEEE, MMMM dd')} at ${session.startTime}`}
                    secondary={`with ${session.therapist.name} • ${session.room || 'Location TBD'}`}
                  />
                  <Button
                    size="small"
                    color="error"
                    onClick={() => cancelSession(session._id)}
                  >
                    Cancel
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Progress Timeline */}
      {progress?.goalsProgress && (
        <Card sx={{ mb: 3 }}>
          <CardHeader
            title="Your Goals Progress"
            avatar={<TrendingUp />}
          />
          <CardContent>
            <Timeline>
              {progress.goalsProgress.map((goal, index) => (
                <TimelineItem key={index}>
                  <TimelineSeparator>
                    <TimelineDot color={goal.achieved ? 'success' : 'primary'}>
                      {goal.achieved ? <CheckCircle /> : null}
                    </TimelineDot>
                    {index < progress.goalsProgress.length - 1 && (
                      <TimelineConnector />
                    )}
                  </TimelineSeparator>
                  <TimelineContent>
                    <Typography variant="h6">{goal.name}</Typography>
                    <Box sx={{ mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={goal.progress || 0}
                      />
                    </Box>
                    <Typography variant="body2" color="textSecondary">
                      {goal.progress}% Complete
                    </Typography>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions with Feedback */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Recent Sessions"
          avatar={<CheckCircle />}
        />
        <CardContent>
          {completedSessions.slice(0, 5).map(session => (
            <Card
              key={session._id}
              sx={{
                mb: 2,
                backgroundColor: '#f9f9f9',
                '&:last-child': { mb: 0 }
              }}
              variant="outlined"
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6">
                      {format(new Date(session.date), 'MMMM dd, yyyy')}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {session.therapist.name} • {session.startTime} - {session.endTime}
                    </Typography>
                    {session.rating && (
                      <Box sx={{ mt: 1 }}>
                        <Rating value={session.rating} readOnly size="small" />
                        <Typography variant="caption">
                          {formatDistance(new Date(session.completedAt), new Date(), {
                            addSuffix: true
                          })}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  {!session.rating && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedSession(session);
                        setFeedbackDialog(true);
                      }}
                    >
                      Rate
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Home Program */}
      {progress?.homeProgram && (
        <Card>
          <CardHeader
            title="Your Home Program"
            avatar={<Download />}
          />
          <CardContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Complete these exercises between sessions for better results
            </Alert>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {progress.homeProgram}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              sx={{ mt: 2 }}
              onClick={() => alert('Download feature coming soon')}
            >
              Download as PDF
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onClose={() => setFeedbackDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Rate Your Session</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              How would you rate this session?
            </Typography>
            <Rating
              value={feedback.rating}
              onChange={(e, newValue) =>
                setFeedback({ ...feedback, rating: newValue })
              }
              size="large"
            />
          </Box>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Comments (Optional)"
            placeholder="Share your experience..."
            value={feedback.comments}
            onChange={(e) =>
              setFeedback({ ...feedback, comments: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitFeedback}
            variant="contained"
            color="primary"
          >
            Submit Feedback
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
