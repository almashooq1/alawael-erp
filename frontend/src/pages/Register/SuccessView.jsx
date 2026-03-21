/**
 * SuccessView — Post-registration success animation
 */

import { brandColors } from 'theme/palette';
import {
  Avatar,
  Box,
  CircularProgress,
  Container,
  Fade,
  Typography
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';

const SuccessView = () => (
  <Container maxWidth="sm">
    <Box sx={{ mt: 8, textAlign: 'center' }}>
      <Fade in timeout={800}>
        <Box>
          <Avatar
            sx={{
              width: 96,
              height: 96,
              bgcolor: brandColors.accentGreen,
              mx: 'auto',
              mb: 3,
              boxShadow: '0 8px 32px rgba(67,233,123,0.3)',
            }}
          >
            <CheckCircle sx={{ fontSize: 56 }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            تم التسجيل بنجاح! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            سيتم توجيهك لصفحة تسجيل الدخول خلال لحظات...
          </Typography>
          <CircularProgress size={28} sx={{ color: brandColors.primaryStart }} />
        </Box>
      </Fade>
    </Box>
  </Container>
);

export default SuccessView;
