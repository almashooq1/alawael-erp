// Messaging Page - Wrapper for Chat Component
import React from 'react';
import ChatComponent from '../components/messaging/ChatComponent';
import { Container, Typography, Box } from '@mui/material';

const MessagingPage = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, height: '85vh' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          💬 مركز الرسائل (Connect)
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          تواصل مباشرة مع فريق العمل والعملاء.
        </Typography>
      </Box>

      {/* The Chat Component takes the full height of the container */}
      <Box sx={{ height: '100%' }}>
        <ChatComponent />
      </Box>
    </Container>
  );
};

export default MessagingPage;
