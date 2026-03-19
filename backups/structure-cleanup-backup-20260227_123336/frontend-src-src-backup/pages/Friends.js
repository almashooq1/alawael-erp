import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

function Friends() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          الأصدقاء
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography color="text.secondary">صفحة الأصدقاء قيد التطوير</Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Friends;
