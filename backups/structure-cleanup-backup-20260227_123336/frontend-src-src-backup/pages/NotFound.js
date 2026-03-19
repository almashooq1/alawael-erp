import React from 'react';
import { Container, Typography, Paper, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

function NotFound() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h1" color="primary" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          الصفحة غير موجودة
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography color="text.secondary" paragraph>
            عذراً، الصفحة التي تبحث عنها غير موجودة
          </Typography>
          <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>
            العودة للرئيسية
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default NotFound;
