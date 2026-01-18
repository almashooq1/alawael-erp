import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  MenuItem,
  Card,
  CardContent,
  IconButton,
} from '@mui/material';
import { Save as SaveIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Section Types Definition
const DOMAINS = {
  educational: ['academic', 'classroom', 'communication'],
  therapeutic: ['speech', 'occupational', 'physical', 'behavioral', 'psychological'],
  lifeSkills: ['selfCare', 'homeSkills', 'social', 'transport', 'financial'],
};

function CreateCarePlan() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    beneficiary: '',
    startDate: new Date().toISOString().split('T')[0],
    status: 'DRAFT',
    educational: { enabled: false, domains: {} },
    therapeutic: { enabled: false, domains: {} },
    lifeSkills: { enabled: false, domains: {} },
  });

  useEffect(() => {
    // 1. Fetch Students (Mock or Real)
    // axios.get('/api/students').then(res => setStudents(res.data));
    // For now, using mock if endpoint not ready
    setStudents([
      { _id: '678509efc8619e0780280459', name: 'أحمد محمد' }, // Example ID from existing mock data usually
      { _id: '678509efc8619e0780280460', name: 'سارة علي' },
    ]);
  }, []);

  // --- HANDLERS ---

  const handleBasicChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSectionToggle = section => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], enabled: !prev[section].enabled },
    }));
  };

  // Helper to safely set deeply nested domain data
  const handleDomainChange = (section, domain, field, value) => {
    setFormData(prev => {
      const currentDomains = prev[section].domains || {};
      const currentDomainData = currentDomains[domain] || { goals: [], notes: '' };

      return {
        ...prev,
        [section]: {
          ...prev[section],
          domains: {
            ...currentDomains,
            [domain]: { ...currentDomainData, [field]: value },
          },
        },
      };
    });
  };

  const addGoal = (section, domain) => {
    setFormData(prev => {
      const currentDomains = prev[section].domains || {};
      const currentDomainData = currentDomains[domain] || { goals: [], notes: '' };
      const currentGoals = currentDomainData.goals || [];

      return {
        ...prev,
        [section]: {
          ...prev[section],
          domains: {
            ...currentDomains,
            [domain]: {
              ...currentDomainData,
              goals: [...currentGoals, { title: '', type: domain.toUpperCase(), target: '', status: 'PENDING' }],
            },
          },
        },
      };
    });
  };

  const updateGoal = (section, domain, index, field, value) => {
    setFormData(prev => {
      const currentDomainData = prev[section].domains[domain]; // Assumes exist if we are editing
      const updatedGoals = [...currentDomainData.goals];
      updatedGoals[index] = { ...updatedGoals[index], [field]: value };

      return {
        ...prev,
        [section]: {
          ...prev[section],
          domains: {
            ...prev[section].domains,
            [domain]: { ...currentDomainData, goals: updatedGoals },
          },
        },
      };
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await axios.post('/api/integrated-care/plans', formData);
      navigate('/integrated-care');
    } catch (err) {
      console.error(err);
      alert('Error creating plan');
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERERS ---

  const renderSectionStep = (sectionName, title) => {
    if (!formData[sectionName].enabled) return <Typography>This section is disabled.</Typography>;

    return (
      <Grid container spacing={3}>
        {DOMAINS[sectionName].map(domain => (
          <Grid item xs={12} key={domain}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  {domain.charAt(0).toUpperCase() + domain.slice(1)} Domain
                </Typography>

                <TextField
                  fullWidth
                  label="General Notes / Baseline"
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                  onChange={e => handleDomainChange(sectionName, domain, 'notes', e.target.value)}
                />

                <Typography variant="subtitle2" gutterBottom>
                  Goals:
                </Typography>
                {(formData[sectionName].domains?.[domain]?.goals || []).map((goal, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      label="Goal Title"
                      size="small"
                      fullWidth
                      value={goal.title}
                      onChange={e => updateGoal(sectionName, domain, idx, 'title', e.target.value)}
                    />
                    <TextField
                      label="Target Criteria"
                      size="small"
                      sx={{ width: '150px' }}
                      value={goal.target}
                      onChange={e => updateGoal(sectionName, domain, idx, 'target', e.target.value)}
                    />
                  </Box>
                ))}

                <Button startIcon={<AddIcon />} size="small" onClick={() => addGoal(sectionName, domain)}>
                  Add Goal
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const steps = ['Basic Info', 'Educational Plan', 'Therapeutic Plan', 'Life Skills Plan', 'Review'];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create Integrated Care Plan
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 2, mb: 4 }}>
          {activeStep === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Beneficiary"
                  name="beneficiary"
                  value={formData.beneficiary}
                  onChange={handleBasicChange}
                >
                  {students.map(s => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  type="date"
                  fullWidth
                  label="Start Date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleBasicChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }}>Select Enabled Modules</Divider>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <FormControlLabel
                    control={<Switch checked={formData.educational.enabled} onChange={() => handleSectionToggle('educational')} />}
                    label="Educational Plan"
                  />
                  <FormControlLabel
                    control={<Switch checked={formData.therapeutic.enabled} onChange={() => handleSectionToggle('therapeutic')} />}
                    label="Therapeutic Plan"
                  />
                  <FormControlLabel
                    control={<Switch checked={formData.lifeSkills.enabled} onChange={() => handleSectionToggle('lifeSkills')} />}
                    label="Life Skills Plan"
                  />
                </div>
              </Grid>
            </Grid>
          )}

          {activeStep === 1 && renderSectionStep('educational', 'Educational Plan')}
          {activeStep === 2 && renderSectionStep('therapeutic', 'Therapeutic Plan')}
          {activeStep === 3 && renderSectionStep('lifeSkills', 'Life Skills Plan')}

          {activeStep === 4 && (
            <Box>
              <Typography variant="h6">Summary</Typography>
              <Typography>Beneficiary ID: {formData.beneficiary}</Typography>
              <Typography>Start Date: {formData.startDate}</Typography>
              <Typography>
                Modules:
                {[
                  formData.educational.enabled ? ' Educational ' : '',
                  formData.therapeutic.enabled ? ' Therapeutic ' : '',
                  formData.lifeSkills.enabled ? ' Life Skills ' : '',
                ]}
              </Typography>
              <Button variant="contained" color="success" size="large" fullWidth sx={{ mt: 4 }} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating...' : 'Create Plan'}
              </Button>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button disabled={activeStep === 0} onClick={() => setActiveStep(prev => prev - 1)}>
            Back
          </Button>
          {activeStep < steps.length - 1 && (
            <Button variant="contained" onClick={() => setActiveStep(prev => prev + 1)}>
              Next
            </Button>
          )}
        </Box>
      </Paper>
    </Container>
  );
}

export default CreateCarePlan;
