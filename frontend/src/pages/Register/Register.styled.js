/**
 * Register Page — Styled Components
 */
import { styled } from '@mui/material/styles';
import { Box, StepConnector, Card } from '@mui/material';
import { gradients, brandColors, surfaceColors } from 'theme/palette';

export const GradientHeader = styled(Box)(() => ({
  background: gradients.primary,
  borderRadius: '0 0 40px 40px',
  padding: '48px 24px 56px',
  textAlign: 'center',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 150,
    height: 150,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.05)',
  },
}));

export const StyledStepConnector = styled(StepConnector)(() => ({
  '& .MuiStepConnector-line': {
    borderColor: surfaceColors.divider,
    borderTopWidth: 3,
    borderRadius: 2,
  },
  '&.Mui-active .MuiStepConnector-line': {
    background: gradients.primary,
    border: 'none',
    height: 3,
  },
  '&.Mui-completed .MuiStepConnector-line': {
    background: gradients.success,
    border: 'none',
    height: 3,
  },
}));

export const StepIconRoot = styled('div')(({ ownerState }) => ({
  backgroundColor: ownerState.completed
    ? brandColors.accentGreen
    : ownerState.active
      ? brandColors.primaryStart
      : surfaceColors.divider,
  zIndex: 1,
  color: 'white',
  width: 44,
  height: 44,
  display: 'flex',
  borderRadius: '50%',
  justifyContent: 'center',
  alignItems: 'center',
  boxShadow: ownerState.active
    ? '0 4px 16px rgba(102,126,234,0.4)'
    : ownerState.completed
      ? '0 4px 16px rgba(67,233,123,0.3)'
      : 'none',
  transition: 'all 0.3s ease',
  fontSize: 18,
  fontWeight: 'bold',
}));

export const RoleCard = styled(Card)(({ selected }) => ({
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  border: selected ? `2px solid ${brandColors.primaryStart}` : '2px solid transparent',
  background: selected ? 'rgba(102,126,234,0.06)' : 'transparent',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
}));
