import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Dialog,
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Rating,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SessionDocumentationForm = ({ sessionId, beneficiaryId, therapistId }) => {
  const [sessionDetails, setSessionDetails] = useState(null);
  const [documentation, setDocumentation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [attachments, setAttachments] = useState([]);

  const [formData, setFormData] = useState({
    soapNote: {
      subjective: {
        patientReports: '',
        complaints: [],
        mood: '',
        cooperation: '',
      },
      objective: {
        observations: '',
        performanceMetrics: {
          accuracy: 0,
          responseTime: 0,
          repetitionsCompleted: 0,
          assistanceRequired: '',
        },
        equipment: [],
        modifications: '',
      },
      assessment: {
        progressSummary: '',
        comparison: '',
        strengths: [],
        challenges: [],
        recommendations: [],
      },
      plan: {
        nextStepsActivities: [],
        homeProgram: '',
        frequency: '',
        recommendations: [],
        referrals: [],
      },
    },
    documentation: '',
    goalsAddressed: [],
    riskFlags: [],
  });

  const moodOptions = ['Happy', 'Anxious', 'Depressed', 'Neutral', 'Frustrated', 'Motivated'];
  const cooperationOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Not Applicable'];
  const assistanceOptions = ['None', 'Minimal', 'Moderate', 'Maximum'];

  // Fetch session and documentation
  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
      fetchDocumentation();
    }
  }, [sessionId]);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/therapy-sessions/${sessionId}`);
      setSessionDetails(response.data.data);
    } catch (error) {
      setErrorMessage('Failed to fetch session details: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDocumentation = async () => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/therapy-sessions/${sessionId}/documentation`
      );
      if (response.data.data) {
        setDocumentation(response.data.data);
        setFormData(response.data.data);
      }
    } catch (error) {
      // Documentation may not exist yet
    }
  };

  const handleArrayFieldChange = (path, value, index, action = 'add') => {
    const keys = path.split('.');
    let current = formData;
    let parent = null;

    // Navigate to the parent of the array
    for (let i = 0; i < keys.length - 1; i++) {
      parent = current;
      current = current[keys[i]];
    }

    const arrayKey = keys[keys.length - 1];
    const array = current[arrayKey] || [];

    if (action === 'add') {
      if (!array.includes(value) && value.trim() !== '') {
        array.push(value);
      }
    } else if (action === 'remove') {
      array.splice(index, 1);
    }

    setFormData({ ...formData });
  };

  const handleSaveDocumentation = async () => {
    try {
      setSaving(true);

      // Validate that session is completed
      if (sessionDetails?.status !== 'COMPLETED') {
        setErrorMessage('Session must be marked as completed before documentation');
        return;
      }

      const payload = {
        ...formData,
        therapist: therapistId,
      };

      const response = await axios.post(
        `${API_BASE_URL}/therapy-sessions/${sessionId}/documentation`,
        payload
      );

      if (response.data.success) {
        setSuccessMessage('Session documented successfully');
        setDocumentation(response.data.data);
        setIsEditing(false);
        fetchDocumentation();
      }
    } catch (error) {
      setErrorMessage('Failed to save documentation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (files.length === 0) return;

    const file = files[0];
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      // Upload to your file service
      // For now, we'll just add to local state
      setAttachments([
        ...attachments,
        {
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date(),
        },
      ]);
      setSuccessMessage('File attached successfully');
    } catch (error) {
      setErrorMessage('Failed to upload file: ' + error.message);
    }
  };

  const handleMarkAsCompleted = async () => {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/therapy-sessions/${sessionId}/status`,
        { status: 'COMPLETED' }
      );

      if (response.data.success) {
        setSuccessMessage('Session marked as completed');
        fetchSessionDetails();
      }
    } catch (error) {
      setErrorMessage('Failed to update session status: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Header */}
        <Grid item xs={12}>
          <Card>
            <CardHeader
              title="Session Documentation (SOAP Notes)"
              subtitle="توثيق الجلسة"
              action={
                !isEditing && !documentation && (
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                  >
                    Document Session
                  </Button>
                )
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

        {/* Session Info */}
        {sessionDetails && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <strong>Date:</strong> {format(new Date(sessionDetails.date), 'PPP')}
                  </Box>
                  <Box>
                    <strong>Time:</strong> {sessionDetails.startTime} - {sessionDetails.endTime}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Box>
                    <strong>Status:</strong> <Chip label={sessionDetails.status} />
                  </Box>
                  {sessionDetails.status !== 'COMPLETED' && (
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleMarkAsCompleted}
                      sx={{ mt: 1 }}
                    >
                      Mark as Completed
                    </Button>
                  )}
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Documentation Form */}
        {(isEditing || sessionDetails?.status === 'COMPLETED') && (
          <>
            {/* Subjective Section */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Subjective (S)" subtitle="Patient's Report" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Patient Reports"
                        value={formData.soapNote.subjective.patientReports}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              subjective: {
                                ...formData.soapNote.subjective,
                                patientReports: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="What did the patient report?"
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!isEditing && documentation}>
                        <InputLabel>Mood</InputLabel>
                        <Select
                          value={formData.soapNote.subjective.mood}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              soapNote: {
                                ...formData.soapNote,
                                subjective: {
                                  ...formData.soapNote.subjective,
                                  mood: e.target.value,
                                },
                              },
                            })
                          }
                          label="Mood"
                        >
                          {moodOptions.map((mood) => (
                            <MenuItem key={mood} value={mood}>
                              {mood}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!isEditing && documentation}>
                        <InputLabel>Cooperation Level</InputLabel>
                        <Select
                          value={formData.soapNote.subjective.cooperation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              soapNote: {
                                ...formData.soapNote,
                                subjective: {
                                  ...formData.soapNote.subjective,
                                  cooperation: e.target.value,
                                },
                              },
                            })
                          }
                          label="Cooperation Level"
                        >
                          {cooperationOptions.map((coop) => (
                            <MenuItem key={coop} value={coop}>
                              {coop}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Objective Section */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Objective (O)" subtitle="Therapist's Observations" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Observations"
                        value={formData.soapNote.objective.observations}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              objective: {
                                ...formData.soapNote.objective,
                                observations: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="What did you observe?"
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Accuracy (%)"
                        value={formData.soapNote.objective.performanceMetrics.accuracy}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              objective: {
                                ...formData.soapNote.objective,
                                performanceMetrics: {
                                  ...formData.soapNote.objective.performanceMetrics,
                                  accuracy: parseInt(e.target.value) || 0,
                                },
                              },
                            },
                          })
                        }
                        inputProps={{ min: 0, max: 100 }}
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Repetitions Completed"
                        value={formData.soapNote.objective.performanceMetrics.repetitionsCompleted}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              objective: {
                                ...formData.soapNote.objective,
                                performanceMetrics: {
                                  ...formData.soapNote.objective.performanceMetrics,
                                  repetitionsCompleted: parseInt(e.target.value) || 0,
                                },
                              },
                            },
                          })
                        }
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth disabled={!isEditing && documentation}>
                        <InputLabel>Assistance Required</InputLabel>
                        <Select
                          value={
                            formData.soapNote.objective.performanceMetrics.assistanceRequired
                          }
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              soapNote: {
                                ...formData.soapNote,
                                objective: {
                                  ...formData.soapNote.objective,
                                  performanceMetrics: {
                                    ...formData.soapNote.objective.performanceMetrics,
                                    assistanceRequired: e.target.value,
                                  },
                                },
                              },
                            })
                          }
                          label="Assistance Required"
                        >
                          {assistanceOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Modifications Made"
                        value={formData.soapNote.objective.modifications}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              objective: {
                                ...formData.soapNote.objective,
                                modifications: e.target.value,
                              },
                            },
                          })
                        }
                        disabled={!isEditing && documentation}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Assessment Section */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Assessment (A)" subtitle="Analysis and Comparison" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Progress Summary"
                        value={formData.soapNote.assessment.progressSummary}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              assessment: {
                                ...formData.soapNote.assessment,
                                progressSummary: e.target.value,
                              },
                            },
                          })
                        }
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Comparison (vs baseline, goals, previous session)"
                        value={formData.soapNote.assessment.comparison}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              assessment: {
                                ...formData.soapNote.assessment,
                                comparison: e.target.value,
                              },
                            },
                          })
                        }
                        disabled={!isEditing && documentation}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Plan Section */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Plan (P)" subtitle="Next Steps and Recommendations" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Home Program / Exercises"
                        value={formData.soapNote.plan.homeProgram}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              plan: {
                                ...formData.soapNote.plan,
                                homeProgram: e.target.value,
                              },
                            },
                          })
                        }
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Frequency"
                        placeholder="e.g., 3x per week, Daily"
                        value={formData.soapNote.plan.frequency}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            soapNote: {
                              ...formData.soapNote,
                              plan: {
                                ...formData.soapNote.plan,
                                frequency: e.target.value,
                              },
                            },
                          })
                        }
                        disabled={!isEditing && documentation}
                      />
                    </Grid>

                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="General Documentation Notes"
                        value={formData.documentation}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            documentation: e.target.value,
                          })
                        }
                        placeholder="Additional notes"
                        disabled={!isEditing && documentation}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Attachments */}
            <Grid item xs={12}>
              <Card>
                <CardHeader title="Attachments" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        disabled={!isEditing && documentation}
                        style={{ display: 'block', marginBottom: '10px' }}
                      />
                    </Grid>
                    {attachments.length > 0 && (
                      <Grid item xs={12}>
                        <List>
                          {attachments.map((attachment, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={attachment.name}
                                secondary={`${(attachment.size / 1024).toFixed(2)} KB`}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Action Buttons */}
            {isEditing && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveDocumentation}
                    disabled={saving}
                  >
                    Save Documentation
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsEditing(false);
                      fetchDocumentation();
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Grid>
            )}
          </>
        )}

        {/* View Documentation */}
        {documentation && !isEditing && (
          <Grid item xs={12}>
            <Alert severity="info">
              Documentation saved on {format(new Date(documentation.documentedAt), 'PPpp')}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default SessionDocumentationForm;
