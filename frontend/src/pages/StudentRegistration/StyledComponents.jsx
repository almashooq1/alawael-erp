/**
 * Student Registration — Styled Components & Step Icons
 */

import {
  Avatar,
  Box,
  StepConnector,
  Typography
} from '@mui/material';

import { styled } from '@mui/material/styles';
import { gradients, brandColors, surfaceColors } from 'theme/palette';
import Person from '@mui/icons-material/Person';
import School from '@mui/icons-material/School';
import CheckCircle from '@mui/icons-material/CheckCircle';

// ─── Styled Components ──────────────────────────
export const GradientHeader = styled(Box)(() => ({
  background: gradients.primary,
  borderRadius: '0 0 32px 32px',
  padding: '40px 24px 48px',
  textAlign: 'center',
  color: 'white',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""', position: 'absolute', top: -40, right: -40,
    width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
  },
}));

export const StyledStepConnector = styled(StepConnector)(() => ({
  '& .MuiStepConnector-line': { borderColor: surfaceColors.divider, borderTopWidth: 3, borderRadius: 2 },
  '&.Mui-active .MuiStepConnector-line': { background: gradients.primary, border: 'none', height: 3 },
  '&.Mui-completed .MuiStepConnector-line': { background: gradients.success, border: 'none', height: 3 },
}));

export const StepIconRoot = styled('div')(({ ownerState }) => ({
  backgroundColor: ownerState.completed ? brandColors.accentGreen : ownerState.active ? brandColors.primaryStart : surfaceColors.divider,
  zIndex: 1, color: '#fff', width: 40, height: 40, display: 'flex', borderRadius: '50%',
  justifyContent: 'center', alignItems: 'center',
  boxShadow: ownerState.active ? '0 4px 16px rgba(102,126,234,0.4)' : 'none',
  transition: 'all 0.3s ease',
}));

export function CustomStepIcon(props) {
  const { active, completed, icon } = props;
  const icons = {
    1: <Person fontSize="small" />,
    2: <Accessible fontSize="small" />,
    3: <FamilyRestroom fontSize="small" />,
    4: <School fontSize="small" />,
    5: <LocalHospital fontSize="small" />,
    6: <CheckCircle fontSize="small" />,
  };
  return (
    <StepIconRoot ownerState={{ completed, active }}>
      {completed ? <CheckCircle sx={{ fontSize: 20 }} /> : icons[String(icon)]}
    </StepIconRoot>
  );
}

export const SectionTitle = ({ icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
    <Avatar sx={{ bgcolor: brandColors.primaryStart, width: 36, height: 36 }}>
      {icon}
    </Avatar>
    <Typography variant="h6" fontWeight="bold" color={brandColors.primaryStart}>
      {children}
    </Typography>
  </Box>
);
