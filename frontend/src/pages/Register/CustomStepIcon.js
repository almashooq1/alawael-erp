/**
 * Register Page — Custom Step Icon Component
 */

import { Badge } from '@mui/material';
import Person from '@mui/icons-material/Person';
import Lock from '@mui/icons-material/Lock';
import CheckCircle from '@mui/icons-material/CheckCircle';
export default function CustomStepIcon(props) {
  const { active, completed, icon } = props;
  const icons = { 1: <Person />, 2: <Lock />, 3: <Badge /> };
  return (
    <StepIconRoot ownerState={{ completed, active }}>
      {completed ? <CheckCircle sx={{ fontSize: 22 }} /> : icons[String(icon)]}
    </StepIconRoot>
  );
}
