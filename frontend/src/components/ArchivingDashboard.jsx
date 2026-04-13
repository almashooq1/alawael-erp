import { Container, Typography, Paper, Box } from '@mui/material';

const ArchivingDashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          لوحة الأرشفة
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Typography color="text.secondary">لوحة الأرشفة قيد التطوير</Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default ArchivingDashboard;
