/**
 * Therapist Availability Management Component
 * مكون إدارة توفر المعالج
 *
 * Admin UI for managing therapist working hours and schedules
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TimelineDot,
  Typography,
  Paper
} from '@mui/material';
import { Edit, Delete, Add, CheckCircle, Close } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
});

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// ============================================
// THERAPIST AVAILABILITY MANAGEMENT
// ============================================

export default function TherapistAvailabilityManagement() {
  const [therapists, setTherapists] = useState([]);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState(null);
  const [editDialog, setEditDialog] = useState(false);
  const [dayDialog, setDayDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [daySchedule, setDaySchedule] = useState({
    dayOfWeek: '',
    startTime: '09:00',
    endTime: '17:00',
    breaks: [],
    roomPreferences: []
  });

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      setLoading(true);
      const response = await api.get('/employees/therapists');
      setTherapists(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch therapists:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTherapistAvailability = async (therapistId) => {
    try {
      const response = await api.get(`/therapy-sessions/availability/${therapistId}`);
      setAvailability(response.data.data);
      setSelectedTherapist(therapistId);
    } catch (error) {
      console.error('Failed to fetch availability:', error);
      setAvailability(null);
    }
  };

  const handleEditDay = (day) => {
    const existing = availability?.recurringSchedule?.find(
      s => s.dayOfWeek === day
    );

    if (existing) {
      setDaySchedule(existing);
    } else {
      setDaySchedule({
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        breaks: [],
        roomPreferences: []
      });
    }
    setSelectedDay(day);
    setDayDialog(true);
  };

  const handleSaveDay = async () => {
    if (!selectedTherapist) return;

    try {
      const currentSchedule = availability?.recurringSchedule || [];
      const updatedSchedule = currentSchedule.filter(
        s => s.dayOfWeek !== daySchedule.dayOfWeek
      );
      updatedSchedule.push(daySchedule);

      await api.post(`/therapy-sessions/availability/${selectedTherapist}`, {
        ...availability,
        recurringSchedule: updatedSchedule
      });

      setDayDialog(false);
      fetchTherapistAvailability(selectedTherapist);
      alert('Schedule updated successfully');
    } catch (error) {
      alert('Failed to update schedule: ' + error.message);
    }
  };

  const handleRemoveDay = async (day) => {
    if (!window.confirm(`Remove ${day} from schedule?`)) return;

    try {
      const updatedSchedule = availability.recurringSchedule.filter(
        s => s.dayOfWeek !== day
      );

      await api.post(`/therapy-sessions/availability/${selectedTherapist}`, {
        ...availability,
        recurringSchedule: updatedSchedule
      });

      fetchTherapistAvailability(selectedTherapist);
      alert('Schedule removed successfully');
    } catch (error) {
      alert('Failed to remove schedule');
    }
  };

  const addBreak = () => {
    setDaySchedule({
      ...daySchedule,
      breaks: [...(daySchedule.breaks || []), { startTime: '12:00', endTime: '13:00' }]
    });
  };

  const removeBreak = (index) => {
    setDaySchedule({
      ...daySchedule,
      breaks: daySchedule.breaks.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        Therapist Availability Management
      </Typography>

      <Grid container spacing={2}>
        {/* Therapist List */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Therapists" />
            <CardContent>
              {therapists.length === 0 ? (
                <Typography color="textSecondary">No therapists found</Typography>
              ) : (
                therapists.map(therapist => (
                  <Paper
                    key={therapist._id}
                    sx={{
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      backgroundColor: selectedTherapist === therapist._id ? '#e3f2fd' : 'white',
                      border: selectedTherapist === therapist._id ? '2px solid #2196F3' : '1px solid #e0e0e0',
                      '&:hover': { backgroundColor: '#f5f5f5' }
                    }}
                    onClick={() => fetchTherapistAvailability(therapist._id)}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {therapist.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {therapist.specialization || 'Therapist'}
                    </Typography>
                  </Paper>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Schedule Editor */}
        <Grid item xs={12} md={8}>
          {selectedTherapist && availability ? (
            <Card>
              <CardHeader title="Weekly Schedule" />
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Configure working hours, breaks, and room preferences
                </Alert>

                {/* Days Grid */}
                <Grid container spacing={1} sx={{ mb: 2 }}>
                  {DAYS_OF_WEEK.map(day => {
                    const scheduled = availability.recurringSchedule?.find(
                      s => s.dayOfWeek === day
                    );
                    return (
                      <Grid item xs={12} sm={6} key={day}>
                        <Paper
                          sx={{
                            p: 2,
                            backgroundColor: scheduled ? '#f0f7ff' : '#fafafa',
                            border: scheduled ? '2px solid #2196F3' : '1px solid #e0e0e0',
                            borderRadius: 1
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {day}
                              </Typography>
                              {scheduled && (
                                <>
                                  <Typography variant="caption">
                                    {scheduled.startTime} - {scheduled.endTime}
                                  </Typography>
                                  {scheduled.breaks?.length > 0 && (
                                    <Typography variant="caption" display="block" color="textSecondary">
                                      {scheduled.breaks.length} break(s)
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Box>
                            <Box>
                              <Button
                                size="small"
                                color="primary"
                                onClick={() => handleEditDay(day)}
                                startIcon={<Edit />}
                              >
                                {scheduled ? 'Edit' : 'Add'}
                              </Button>
                              {scheduled && (
                                <Button
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveDay(day)}
                                  startIcon={<Delete />}
                                >
                                  Remove
                                </Button>
                              )}
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                </Grid>

                {/* Preferences */}
                <Card variant="outlined" sx={{ mt: 2 }}>
                  <CardHeader
                    title="Preferences"
                    subheader="Configure session limits and specializations"
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Max Sessions Per Day"
                          value={availability.preferences?.maxSessionsPerDay || 8}
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Min Break Between Sessions (minutes)"
                          value={availability.preferences?.minBreakBetweenSessions || 15}
                          disabled
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          multiline
                          rows={2}
                          label="Specializations"
                          value={availability.preferences?.specializations?.join(', ') || ''}
                          disabled
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="textSecondary">
                  Select a therapist to view and edit their availability
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Day Schedule Dialog */}
      <Dialog open={dayDialog} onClose={() => setDayDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{daySchedule.dayOfWeek} Schedule</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="time"
                label="Start Time"
                InputLabelProps={{ shrink: true }}
                value={daySchedule.startTime}
                onChange={(e) =>
                  setDaySchedule({ ...daySchedule, startTime: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                type="time"
                label="End Time"
                InputLabelProps={{ shrink: true }}
                value={daySchedule.endTime}
                onChange={(e) =>
                  setDaySchedule({ ...daySchedule, endTime: e.target.value })
                }
              />
            </Grid>

            {/* Breaks */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Breaks
              </Typography>
              {daySchedule.breaks?.map((breakPeriod, index) => (
                <Paper
                  key={index}
                  sx={{ p: 2, mb: 1, display: 'flex', gap: 1, alignItems: 'end' }}
                >
                  <TextField
                    type="time"
                    label="Break Start"
                    InputLabelProps={{ shrink: true }}
                    value={breakPeriod.startTime}
                    onChange={(e) => {
                      const newBreaks = [...daySchedule.breaks];
                      newBreaks[index].startTime = e.target.value;
                      setDaySchedule({ ...daySchedule, breaks: newBreaks });
                    }}
                    size="small"
                  />
                  <TextField
                    type="time"
                    label="Break End"
                    InputLabelProps={{ shrink: true }}
                    value={breakPeriod.endTime}
                    onChange={(e) => {
                      const newBreaks = [...daySchedule.breaks];
                      newBreaks[index].endTime = e.target.value;
                      setDaySchedule({ ...daySchedule, breaks: newBreaks });
                    }}
                    size="small"
                  />
                  <Button
                    color="error"
                    onClick={() => removeBreak(index)}
                    startIcon={<Delete />}
                  >
                    Remove
                  </Button>
                </Paper>
              ))}
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={addBreak}
                sx={{ mt: 1 }}
              >
                Add Break
              </Button>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDayDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveDay} variant="contained" color="primary">
            Save Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
