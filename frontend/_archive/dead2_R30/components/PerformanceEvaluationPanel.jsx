import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Divider, TextField, CircularProgress, Grid } from '@mui/material';
import axios from 'axios';

const PerformanceEvaluationPanel = ({ employeeId }) => {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ period: '', management: '', peers: '', recipients: '', self: '', hrNotes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!employeeId) return;
    setLoading(true);
    axios.get(`/api/performance-evaluations/employee/${employeeId}`)
      .then(res => {
        setEvaluations(res.data.evaluations || []);
        setLoading(false);
      });
  }, [employeeId, submitting]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    await axios.post('/api/performance-evaluations', {
      employeeId,
      evaluationPeriod: { startDate: new Date(form.period + '-01'), endDate: new Date(form.period + '-28') },
      evaluations: {
        managementEvaluation: { evaluatedBy: 'self', evaluationType: 'management', score: Number(form.management) },
        peerEvaluations: [{ evaluatedBy: 'self', evaluationType: 'peer', score: Number(form.peers) }],
        recipientEvaluations: [{ evaluatedBy: 'self', evaluationType: 'recipient', score: Number(form.recipients) }],
        selfEvaluation: { evaluatedBy: 'self', evaluationType: 'self', score: Number(form.self) },
      },
      hrNotes: form.hrNotes,
    });
    setSubmitting(false);
    setForm({ period: '', management: '', peers: '', recipients: '', self: '', hrNotes: '' });
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>تقييم أداء الموظف</Typography>
      <Divider sx={{ mb: 2 }} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField label="فترة التقييم (YYYY-MM)" name="period" value={form.period} onChange={handleChange} fullWidth />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="الإدارة" name="management" value={form.management} onChange={handleChange} type="number" fullWidth />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="الزملاء" name="peers" value={form.peers} onChange={handleChange} type="number" fullWidth />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="المستفيدين" name="recipients" value={form.recipients} onChange={handleChange} type="number" fullWidth />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField label="ذاتي" name="self" value={form.self} onChange={handleChange} type="number" fullWidth />
          </Grid>
          <Grid item xs={12}>
            <TextField label="ملاحظات الموارد البشرية" name="hrNotes" value={form.hrNotes} onChange={handleChange} fullWidth multiline minRows={2} />
          </Grid>
        </Grid>
        <Button variant="contained" sx={{ mt: 2 }} onClick={handleSubmit} disabled={submitting}>إرسال التقييم</Button>
      </Paper>
      <Typography variant="subtitle1">التقييمات السابقة:</Typography>
      {evaluations.map((ev, i) => (
        <Paper key={i} sx={{ p: 2, my: 1 }}>
          <Typography>الفترة: {new Date(ev.evaluationPeriod.startDate).toLocaleDateString()} - {new Date(ev.evaluationPeriod.endDate).toLocaleDateString()}</Typography>
          <Typography>النتيجة النهائية: {ev.summary?.overallScore?.toFixed(2)} ({ev.summary?.overallRating})</Typography>
          <Typography>توصية ذكية: {ev.summary?.aiRecommendation}</Typography>
        </Paper>
      ))}
    </Box>
  );
};

export default PerformanceEvaluationPanel;
