import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Rating,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function RecordSession() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);

  // Flattened list of goals for selection
  const [availableGoals, setAvailableGoals] = useState([]);

  const [sessionData, setSessionData] = useState({
    student: '',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    sessionType: 'INDIVIDUAL',
    goalsWorkedOn: [], // { goalId, score, comments }
    globalNotes: '',
  });

  useEffect(() => {
    // Mock students fetch
    setStudents([
      { _id: '678509efc8619e0780280459', name: 'أحمد محمد' },
      { _id: '678509efc8619e0780280460', name: 'سارة علي' },
    ]);
  }, []);

  const handleStudentSelect = async studentId => {
    setSessionData({ ...sessionData, student: studentId });
    setLoading(true);
    try {
      // In real app: GET /api/integrated-care/plans/student/:id
      // For now, simulating fetching the active plan
      // const res = await axios.get(`/api/integrated-care/plans/student/${studentId}`);
      // setActivePlan(res.data);

      // Mock Plan for demonstration
      const mockPlanGoals = [
        { id: 'g1', title: 'Improve reading fluency', domain: 'Academic' },
        { id: 'g2', title: 'Eye contact duration', domain: 'Behavioral' },
        { id: 'g3', title: 'Tie shoelaces', domain: 'SelfCare' },
      ];
      setAvailableGoals(mockPlanGoals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoalToggle = goal => {
    const isSelected = sessionData.goalsWorkedOn.find(g => g.goalId === goal.id);
    if (isSelected) {
      setSessionData(prev => ({
        ...prev,
        goalsWorkedOn: prev.goalsWorkedOn.filter(g => g.goalId !== goal.id),
      }));
    } else {
      setSessionData(prev => ({
        ...prev,
        goalsWorkedOn: [
          ...prev.goalsWorkedOn,
          { goalId: goal.id, goalTitle: goal.title, score: 3, comments: '' },
        ],
      }));
    }
  };

  const updateGoalData = (goalId, field, value) => {
    setSessionData(prev => ({
      ...prev,
      goalsWorkedOn: prev.goalsWorkedOn.map(g =>
        g.goalId === goalId ? { ...g, [field]: value } : g
      ),
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await axios.post('/api/integrated-care/sessions', sessionData);
      alert('Session logged successfully!');
      navigate('/integrated-care');
    } catch (err) {
      console.error(err);
      alert('Failed to log session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Log Daily Session
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Select Student"
              value={sessionData.student}
              onChange={e => handleStudentSelect(e.target.value)}
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
              label="Session Date"
              value={sessionData.date}
              onChange={e => setSessionData({ ...sessionData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Duration (Minutes)"
              value={sessionData.duration}
              onChange={e => setSessionData({ ...sessionData, duration: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Session Type"
              value={sessionData.sessionType}
              onChange={e => setSessionData({ ...sessionData, sessionType: e.target.value })}
            >
              <MenuItem value="INDIVIDUAL">Individual</MenuItem>
              <MenuItem value="GROUP">Group</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            Select Goals Worked On:
          </Typography>
          {availableGoals.length === 0 && (
            <Typography color="text.secondary">
              Select a student first to see active goals.
            </Typography>
          )}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            {availableGoals.map(goal => (
              <Button
                key={goal.id}
                variant={
                  sessionData.goalsWorkedOn.find(g => g.goalId === goal.id)
                    ? 'contained'
                    : 'outlined'
                }
                onClick={() => handleGoalToggle(goal)}
              >
                {goal.domain}: {goal.title}
              </Button>
            ))}
          </Box>

          {/* Goals Details Inputs */}
          {sessionData.goalsWorkedOn.map((g, index) => (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }} key={g.goalId}>
              <Typography variant="subtitle2" gutterBottom>
                {g.goalTitle}
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography component="legend">Performance (1-5)</Typography>
                  <Rating
                    value={g.score}
                    onChange={(e, val) => updateGoalData(g.goalId, 'score', val)}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Specific comments/observations for this goal..."
                    value={g.comments}
                    onChange={e => updateGoalData(g.goalId, 'comments', e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>
          ))}

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Global Session Notes"
            sx={{ mt: 2 }}
            value={sessionData.globalNotes}
            onChange={e => setSessionData({ ...sessionData, globalNotes: e.target.value })}
          />
        </Box>

        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          sx={{ mt: 4 }}
          onClick={handleSubmit}
          disabled={loading || !sessionData.student}
        >
          Save Log
        </Button>
      </Paper>
    </Container>
  );
}

export default RecordSession;
