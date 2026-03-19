import { Box, Card } from '@mui/material';
import { styled } from '@mui/material/styles';
import { gradients } from 'theme/palette';

export const GradientHeader = styled(Box)({
  background: gradients.primary,
  color: 'white',
  padding: '32px 24px 48px',
  borderRadius: '0 0 24px 24px',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
  },
});

export const StatCard = styled(Card)(({ gradient }) => ({
  borderRadius: 16,
  overflow: 'hidden',
  position: 'relative',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: gradient || gradients.primary,
  },
}));
