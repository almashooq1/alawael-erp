import React, { useState } from 'react';
import { Box, Typography, Paper, TextField, Button, Divider, CircularProgress } from '@mui/material';
import axios from 'axios';

const IntegrationPanel = () => {
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('post');
  const [data, setData] = useState('{}');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post('/api/integrations/send', {
        url,
        method,
        data: JSON.parse(data),
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setLoading(false);
  };

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>تكامل API مع الأنظمة الخارجية</Typography>
      <Divider sx={{ mb: 2 }} />
      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField label="رابط النظام الخارجي (URL)" value={url} onChange={e => setUrl(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="طريقة الإرسال (GET/POST/PUT...)" value={method} onChange={e => setMethod(e.target.value)} fullWidth sx={{ mb: 2 }} />
        <TextField label="البيانات (JSON)" value={data} onChange={e => setData(e.target.value)} fullWidth multiline minRows={3} sx={{ mb: 2 }} />
        <Button variant="contained" onClick={handleSend} disabled={loading}>إرسال</Button>
        {loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
      </Paper>
      {result && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1">النتيجة:</Typography>
          <pre style={{ direction: 'ltr', textAlign: 'left' }}>{JSON.stringify(result, null, 2)}</pre>
        </Paper>
      )}
    </Box>
  );
};

export default IntegrationPanel;
