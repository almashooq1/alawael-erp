import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Box,
  Button,
  Dialog,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Alert,
  CircularProgress,
  Modal,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, getDay } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SessionSchedulingCalendar = ({ therapistId }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    beneficiary: '',
    startTime: '09:00',
    endTime: '10:00',
    plan: '',
  });

  // Fetch sessions for the month
  useEffect(() => {
    if (therapistId) {
      fetchSessions();
    }
  }, [currentMonth, therapistId]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const response = await axios.get(
        `${API_BASE_URL}/therapy-sessions/therapist/${therapistId}?startDate=${startDate}&endDate=${endDate}`
      );

      setSessions(response.data.data || []);
    } catch (error) {
      setErrorMessage('Failed to fetch sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getSessionsForDate = (date) => {
    return sessions.filter((session) => {
      const sessionDate = format(new Date(session.date), 'yyyy-MM-dd');
      const checkDate = format(date, 'yyyy-MM-dd');
      return sessionDate === checkDate;
    });
  };

  const handleScheduleSession = async () => {
    try {
      setLoading(true);

      if (!formData.beneficiary || !selectedDate) {
        setErrorMessage('Please fill in all required fields');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/therapy-sessions`, {
        beneficiary: formData.beneficiary,
        therapist: therapistId,
        plan: formData.plan || undefined,
        date: selectedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
      });

      if (response.data.success) {
        setSuccessMessage('Session scheduled successfully');
        setOpenDialog(false);
        fetchSessions();
        resetForm();
      }
    } catch (error) {
      setErrorMessage('Failed to schedule session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      beneficiary: '',
      startTime: '09:00',
      endTime: '10:00',
      plan: '',
    });
    setSelectedDate(null);
  };

  const renderCalendarDays = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = getDay(start);
    const paddedDays = Array(firstDayOfWeek).fill(null).concat(days);

    return paddedDays.map((date, index) => {
      if (!date) {
        return <Box key={`empty-${index}`} sx={{ minHeight: '100px', backgroundColor: '#fafafa' }} />;
      }

      const daySessions = getSessionsForDate(date);
      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

      return (
        <Box
          key={format(date, 'yyyy-MM-dd')}
          sx={{
            minHeight: '100px',
            border: '1px solid #ddd',
            p: 1,
            backgroundColor: isToday ? '#e3f2fd' : 'white',
            borderRadius: 1,
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
            position: 'relative',
          }}
          onClick={() => {
            setSelectedDate(date);
            setOpenDialog(true);
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <strong>{format(date, 'd')}</strong>
            {isToday && <Chip label="Today" size="small" color="primary" />}
          </Box>

          {daySessions.map((session) => (
            <Box
              key={session._id}
              sx={{
                backgroundColor: getSessionStatusColor(session.status),
                color: 'white',
                p: 0.5,
                mb: 0.5,
                borderRadius: 0.5,
                fontSize: '0.75rem',
                cursor: 'default',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedSession(session);
              }}
            >
              <strong>{session.startTime}</strong> - {session.endTime}
              <div>{session.beneficiary?.firstName}</div>
            </Box>
          ))}

          {daySessions.length === 0 && (
            <Button
              size="small"
              fullWidth
              sx={{ mt: 1 }}
              startIcon={<AddIcon />}
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(date);
                setOpenDialog(true);
              }}
            >
              Add
            </Button>
          )}
        </Box>
      );
    });
  };

  const getSessionStatusColor = (status) => {
    const colors = {
      SCHEDULED: '#2196F3',
      CONFIRMED: '#4CAF50',
      COMPLETED: '#8BC34A',
      CANCELLED_BY_PATIENT: '#FF9800',
      CANCELLED_BY_CENTER: '#FF9800',
      NO_SHOW: '#F44336',
    };
    return colors[status] || '#9E9E9E';
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Therapy Session Calendar"
              subtitle="جدول الجلسات العلاجية"
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<ChevronLeftIcon />}
                    onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
                  >
                    Previous
                  </Button>
                  <Button variant="text">{format(currentMonth, 'MMMM yyyy')}</Button>
                  <Button
                    endIcon={<ChevronRightIcon />}
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  >
                    Next
                  </Button>
                </Box>
              }
            />
          </Card>
        </Grid>

        {/* Alerts */}
        {successMessage && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          </Grid>
        )}
        {errorMessage && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          </Grid>
        )}

        {/* Loading */}
        {loading && (
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Grid>
        )}

        {/* Calendar */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            {/* Week days header */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {weekDays.map((day) => (
                <Grid item xs={12 / 7} key={day}>
                  <Box sx={{ textAlign: 'center', fontWeight: 'bold', py: 1 }}>
                    {day}
                  </Box>
                </Grid>
              ))}
            </Grid>

            {/* Calendar days */}
            <Grid container spacing={1}>
              {renderCalendarDays().map((day, index) => (
                <Grid item xs={12 / 7} key={index} sx={{ minHeight: '120px' }}>
                  {day}
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Legend */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { label: 'Scheduled', color: '#2196F3' },
                { label: 'Confirmed', color: '#4CAF50' },
                { label: 'Completed', color: '#8BC34A' },
                { label: 'Cancelled', color: '#FF9800' },
                { label: 'No Show', color: '#F44336' },
              ].map((item) => (
                <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: '20px', height: '20px', backgroundColor: item.color, borderRadius: 1 }} />
                  <span>{item.label}</span>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Schedule Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          resetForm();
        }}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 3 }}>
          <h2>Schedule Session for {selectedDate ? format(selectedDate, 'PPP') : ''}</h2>

          <TextField
            fullWidth
            label="Beneficiary ID"
            value={formData.beneficiary}
            onChange={(e) => setFormData({ ...formData, beneficiary: e.target.value })}
            margin="normal"
            required
          />

          <TextField
            fullWidth
            label="Therapeutic Plan ID"
            value={formData.plan}
            onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
            margin="normal"
          />

          <TextField
            fullWidth
            label="Start Time"
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            margin="normal"
            inputProps={{ step: '300' }}
          />

          <TextField
            fullWidth
            label="End Time"
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            margin="normal"
            inputProps={{ step: '300' }}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleScheduleSession}
              disabled={loading}
            >
              Schedule
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setOpenDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Dialog>

      {/* Session Details Modal */}
      {selectedSession && (
        <Modal
          open={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        >
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'white',
              p: 3,
              borderRadius: 2,
              boxShadow: 3,
              maxWidth: '500px',
              width: '90%',
            }}
          >
            <h2>Session Details</h2>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <strong>Beneficiary:</strong> {selectedSession.beneficiary?.firstName} {selectedSession.beneficiary?.lastName}
              </Grid>
              <Grid item xs={12}>
                <strong>Date:</strong> {format(new Date(selectedSession.date), 'PPpp')}
              </Grid>
              <Grid item xs={12}>
                <strong>Time:</strong> {selectedSession.startTime} - {selectedSession.endTime}
              </Grid>
              <Grid item xs={12}>
                <strong>Status:</strong> <Chip label={selectedSession.status} />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => setSelectedSession(null)}
                >
                  Close
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Modal>
      )}
    </Container>
  );
};

export default SessionSchedulingCalendar;
