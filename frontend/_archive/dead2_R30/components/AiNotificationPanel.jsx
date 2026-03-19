import React, { useState } from 'react';
import { Box, Typography, Button, Paper, TextField, Divider, CircularProgress } from '@mui/material';
import axios from 'axios';

const AiNotificationPanel = () => {
  const [input, setInput] = useState({ name: '', absentDays: '', performanceScore: '' });
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = e => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setSuggestions([]);
    const res = await axios.post('/api/ai-notifications/suggest', {
      name: input.name,
      absentDays: Number(input.absentDays),
      performanceScore: Number(input.performanceScore),
    });
    setSuggestions(res.data.suggestions || []);
    setLoading(false);
  };

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>تحليل ذكي للتنبيهات</Typography>
      <Divider sx={{ mb: 2 }} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField label="اسم الموظف" name="name" value={input.name} onChange={handleChange} fullWidth sx={{ mb: 2 }} />
        <TextField label="عدد أيام الغياب المتتالية" name="absentDays" value={input.absentDays} onChange={handleChange} type="number" fullWidth sx={{ mb: 2 }} />
        <TextField label="تقييم الأداء" name="performanceScore" value={input.performanceScore} onChange={handleChange} type="number" fullWidth sx={{ mb: 2 }} />
        <Button variant="contained" onClick={handleAnalyze} disabled={loading}>تحليل واقتراح تنبيهات</Button>
        {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Paper>
      {suggestions.length > 0 && (
        <Box>
          <Typography variant="subtitle1">تنبيهات مقترحة:</Typography>
          {suggestions.map((s, i) => (
            <Paper key={i} sx={{ p: 2, my: 1 }}>
              <Typography>{s.message}</Typography>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AiNotificationPanel;
