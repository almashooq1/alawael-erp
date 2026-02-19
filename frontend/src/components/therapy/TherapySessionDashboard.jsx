import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Dialog,
  TextField,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { format } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TherapySessionDashboard = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [therapistId, setTherapistId] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date(),
  });
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    beneficiary: '',
    therapist: '',
    date: new Date(),
    startTime: '09:00',
    endTime: '10:00',
    plan: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch sessions
  useEffect(() => {
    if (therapistId && dateRange.startDate && dateRange.endDate) {
      fetchSessions();
    }
  }, [therapistId, dateRange]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
      });
      if (filterStatus) params.append('status', filterStatus);

      const response = await axios.get(
        `${API_BASE_URL}/therapy-sessions/therapist/${therapistId}?${params}`
      );

      setSessions(response.data.data || []);
    } catch (error) {
      setErrorMessage('Failed to fetch sessions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSession = async () => {
    try {
      setLoading(true);

      if (!formData.beneficiary || !formData.therapist || !formData.date) {
        setErrorMessage('Please fill in all required fields');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/therapy-sessions`, {
        ...formData,
        date: formData.date,
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

  const handleUpdateStatus = async (sessionId, newStatus) => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/therapy-sessions/${sessionId}/status`,
        { status: newStatus }
      );

      if (response.data.success) {
        setSuccessMessage(`Session status updated to ${newStatus}`);
        fetchSessions();
      }
    } catch (error) {
      setErrorMessage('Failed to update session: ' + error.message);
    }
  };

  const handleMarkAttendance = async (sessionId) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/therapy-sessions/${sessionId}/attend`,
        { arrivalTime: format(new Date(), 'HH:mm') }
      );

      if (response.data.success) {
        setSuccessMessage('Attendance recorded');
        fetchSessions();
      }
    } catch (error) {
      setErrorMessage('Failed to record attendance: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      beneficiary: '',
      therapist: '',
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      plan: '',
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: 'primary',
      CONFIRMED: 'info',
      COMPLETED: 'success',
      CANCELLED_BY_PATIENT: 'warning',
      CANCELLED_BY_CENTER: 'warning',
      NO_SHOW: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      SCHEDULED: 'Scheduled',
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Completed',
      CANCELLED_BY_PATIENT: 'Cancelled (Patient)',
      CANCELLED_BY_CENTER: 'Cancelled (Center)',
      NO_SHOW: 'No Show',
    };
    return labels[status] || status;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Header */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title="Therapeutic Session Management"
                subtitle="جدارة إدارة الجلسات العلاجية"
                action={
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<ScheduleIcon />}
                    onClick={() => setOpenDialog(true)}
                  >
                    Schedule Session
                  </Button>
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

          {/* Filters */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Therapist ID"
                    value={therapistId}
                    onChange={(e) => setTherapistId(e.target.value)}
                    placeholder="Enter therapist ID"
                  />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      label="Status"
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="SCHEDULED">Scheduled</MenuItem>
                      <MenuItem value="CONFIRMED">Confirmed</MenuItem>
                      <MenuItem value="COMPLETED">Completed</MenuItem>
                      <MenuItem value="CANCELLED_BY_PATIENT">Cancelled (Patient)</MenuItem>
                      <MenuItem value="CANCELLED_BY_CENTER">Cancelled (Center)</MenuItem>
                      <MenuItem value="NO_SHOW">No Show</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button variant="outlined" fullWidth onClick={fetchSessions} disabled={loading}>
                    Filter
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Loading Progress */}
          {loading && (
            <Grid item xs={12}>
              <LinearProgress />
            </Grid>
          )}

          {/* Sessions Table */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableRow>
                    <TableCell>Beneficiary</TableCell>
                    <TableCell>Therapist</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        No sessions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => (
                      <TableRow key={session._id}>
                        <TableCell>{session.beneficiary?.firstName} {session.beneficiary?.lastName}</TableCell>
                        <TableCell>{session.therapist?.firstName} {session.therapist?.lastName}</TableCell>
                        <TableCell>{format(new Date(session.date), 'MMM dd, yyyy')}</TableCell>
                        <TableCell>
                          {session.startTime} - {session.endTime}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(session.status)}
                            color={getStatusColor(session.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{session.rating ? `${session.rating}/5` : '-'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={() => setSelectedSession(session)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          {session.status === 'SCHEDULED' && (
                            <Tooltip title="Mark as Attended">
                              <IconButton
                                size="small"
                                onClick={() => handleMarkAttendance(session._id)}
                              >
                                <CheckCircleIcon color="success" />
                              </IconButton>
                            </Tooltip>
                          )}
                          {session.status !== 'COMPLETED' && session.status !== 'NO_SHOW' && (
                            <Tooltip title="Cancel">
                              <IconButton
                                size="small"
                                onClick={() => handleUpdateStatus(session._id, 'CANCELLED_BY_CENTER')}
                              >
                                <CancelIcon color="error" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>

        {/* Schedule Session Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <Box sx={{ p: 3 }}>
            <h2>Schedule New Session</h2>

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
              label="Therapist ID"
              value={formData.therapist}
              onChange={(e) => setFormData({ ...formData, therapist: e.target.value })}
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

            <DateTimePicker
              label="Session Date & Time"
              value={formData.date}
              onChange={(newDate) => setFormData({ ...formData, date: newDate })}
              sx={{ width: '100%', mt: 2, mb: 2 }}
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
                Schedule Session
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

        {/* Session Details Dialog */}
        {selectedSession && (
          <Dialog
            open={!!selectedSession}
            onClose={() => setSelectedSession(null)}
            maxWidth="sm"
            fullWidth
          >
            <Box sx={{ p: 3 }}>
              <h2>Session Details</h2>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <strong>Beneficiary:</strong> {selectedSession.beneficiary?.firstName} {selectedSession.beneficiary?.lastName}
                </Grid>
                <Grid item xs={12}>
                  <strong>Therapist:</strong> {selectedSession.therapist?.firstName} {selectedSession.therapist?.lastName}
                </Grid>
                <Grid item xs={12}>
                  <strong>Date:</strong> {format(new Date(selectedSession.date), 'PPpp')}
                </Grid>
                <Grid item xs={12}>
                  <strong>Time:</strong> {selectedSession.startTime} - {selectedSession.endTime}
                </Grid>
                <Grid item xs={12}>
                  <strong>Status:</strong> <Chip label={getStatusLabel(selectedSession.status)} />
                </Grid>
                {selectedSession.rating && (
                  <Grid item xs={12}>
                    <strong>Rating:</strong> {selectedSession.rating}/5
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Button variant="outlined" fullWidth onClick={() => setSelectedSession(null)}>
                    Close
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Dialog>
        )}
      </Container>
    </LocalizationProvider>
  );
};

export default TherapySessionDashboard;
