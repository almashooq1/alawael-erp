// Messaging Page - Wrapper for Chat Component
import { gradients } from 'theme/palette';
import { Box, Container, Typography } from '@mui/material';
import ForumIcon from '@mui/icons-material/Forum';

const MessagingPage = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4, height: '85vh' }}>
      {/* Gradient Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 3, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ForumIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              مركز الرسائل
            </Typography>
            <Typography variant="body2">تواصل مباشرة مع فريق العمل والعملاء</Typography>
          </Box>
        </Box>
      </Box>

      {/* The Chat Component takes the full height of the container */}
      <Box sx={{ height: '100%' }}>
        <ChatComponent />
      </Box>
    </Container>
  );
};

export default MessagingPage;
