import React from 'react';
import { Container, Typography, Paper, Box } from '@mui/material';

function Profile() {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          الملف الشخصي
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography color="text.secondary">صفحة الملف الشخصي قيد التطوير</Typography>
        </Box>
      </Paper>
    </Container>
  );
}

export default Profile;
