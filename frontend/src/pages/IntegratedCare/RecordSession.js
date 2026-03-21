import { useState, useEffect } from 'react';

import apiClient from 'services/api.client';
import { useNavigate } from 'react-router-dom';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients } from '../../theme/palette';
import {
  Box,
  Button,
  Container,
  Grid,
  MenuItem,
  Paper,
  Rating,
  TextField,
  Typography
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import SaveIcon from '@mui/icons-material/Save';

function RecordSession() {
  const showSnackbar = useSnackbar();
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
    const fetchStudents = async () => {
      try {
        const res = await apiClient.get('/integrated-care/students');
        const list = res?.data || res || [];
        setStudents(Array.isArray(list) ? list : []);
      } catch (err) {
        logger.error('Failed to load students:', err);
        setStudents([]);
      }
    };
    fetchStudents();
  }, []);

  const handleStudentSelect = async studentId => {
    setSessionData({ ...sessionData, student: studentId });
    setLoading(true);
    try {
      const res = await apiClient.get(`/integrated-care/plans/student/${studentId}`);
      const goals = res?.goals || [];
      setAvailableGoals(goals.map(g => ({ id: g.id, title: g.title, domain: g.domain || g.type })));
    } catch (err) {
      logger.error(err);
      setAvailableGoals([]);
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
      await apiClient.post('/integrated-care/sessions', sessionData);
      showSnackbar('تم تسجيل الجلسة بنجاح!', 'success');
      navigate('/integrated-care');
    } catch (err) {
      logger.error(err);
      showSnackbar('فشل تسجيل الجلسة', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <EventNoteIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              تسجيل جلسة
            </Typography>
            <Typography variant="body2">توثيق وتسجيل بيانات الجلسة العلاجية</Typography>
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          تسجيل جلسة يومية
        </Typography>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="اختيار الطالب"
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
              label="تاريخ الجلسة"
              value={sessionData.date}
              onChange={e => setSessionData({ ...sessionData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="المدة (دقائق)"
              value={sessionData.duration}
              onChange={e => setSessionData({ ...sessionData, duration: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="نوع الجلسة"
              value={sessionData.sessionType}
              onChange={e => setSessionData({ ...sessionData, sessionType: e.target.value })}
            >
              <MenuItem value="INDIVIDUAL">فردية</MenuItem>
              <MenuItem value="GROUP">جماعية</MenuItem>
            </TextField>
          </Grid>
        </Grid>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            اختر الأهداف التي تم العمل عليها:
          </Typography>
          {availableGoals.length === 0 && (
            <Typography color="text.secondary">اختر طالباً أولاً لعرض الأهداف النشطة.</Typography>
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
          {sessionData.goalsWorkedOn.map((g, _index) => (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }} key={g.goalId}>
              <Typography variant="subtitle2" gutterBottom>
                {g.goalTitle}
              </Typography>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <Typography component="legend">الأداء (1-5)</Typography>
                  <Rating
                    value={g.score}
                    onChange={(e, val) => updateGoalData(g.goalId, 'score', val)}
                  />
                </Grid>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="ملاحظات خاصة بهذا الهدف..."
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
            label="ملاحظات عامة عن الجلسة"
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
          حفظ السجل
        </Button>
      </Paper>
    </Container>
  );
}

export default RecordSession;
