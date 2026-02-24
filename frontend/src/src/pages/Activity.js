import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

function Activity() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          النشاطات
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography color="text.secondary">صفحة النشاطات قيد التطوير</Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Activity;
