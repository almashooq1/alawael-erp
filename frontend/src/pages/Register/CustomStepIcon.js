/**
 * Register Page — Custom Step Icon Component
 */

export default function CustomStepIcon(props) {
  const { active, completed, icon } = props;
  const icons = { 1: <Person />, 2: <Lock />, 3: <Badge /> };
  return (
    <StepIconRoot ownerState={{ completed, active }}>
      {completed ? <CheckCircle sx={{ fontSize: 22 }} /> : icons[String(icon)]}
    </StepIconRoot>
  );
}
