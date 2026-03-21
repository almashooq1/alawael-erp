/**
 * StepRoleSelection — Step 2: Role cards + terms checkbox
 */



import { brandColors } from 'theme/palette';
import { ROLES } from './registerConstants';
import {
  Alert,
  Box,
  CardContent,
  Checkbox,
  Fade,
  FormControlLabel,
  Grid,
  Typography
} from '@mui/material';

const StepRoleSelection = ({
  formData,
  setFormData,
  fieldErrors,
  setFieldErrors,
  termsAccepted,
  setTermsAccepted,
}) => (
  <Fade in timeout={400} key="step2">
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: brandColors.primaryStart }}>
        نوع الحساب
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {ROLES.map(role => (
          <Grid item xs={12} sm={4} key={role.value}>
            <RoleCard
              selected={formData.role === role.value}
              onClick={() => {
                setFormData(prev => ({ ...prev, role: role.value }));
                setFieldErrors(prev => ({ ...prev, role: '' }));
              }}
              elevation={formData.role === role.value ? 4 : 1}
            >
              <CardContent sx={{ textAlign: 'center', py: 3 }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: role.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    color: 'white',
                  }}
                >
                  {role.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {role.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {role.description}
                </Typography>
              </CardContent>
            </RoleCard>
          </Grid>
        ))}
      </Grid>

      {fieldErrors.role && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {fieldErrors.role}
        </Alert>
      )}

      <FormControlLabel
        control={
          <Checkbox
            checked={termsAccepted}
            onChange={e => {
              setTermsAccepted(e.target.checked);
              setFieldErrors(prev => ({ ...prev, terms: '' }));
            }}
            sx={{ '&.Mui-checked': { color: brandColors.primaryStart } }}
          />
        }
        label={
          <Typography variant="body2">
            أوافق على{' '}
            <MuiLink href="#" color="primary" sx={{ fontWeight: 'bold' }}>
              شروط الخدمة
            </MuiLink>{' '}
            و{' '}
            <MuiLink href="#" color="primary" sx={{ fontWeight: 'bold' }}>
              سياسة الخصوصية
            </MuiLink>
          </Typography>
        }
      />
      {fieldErrors.terms && (
        <Typography color="error" variant="caption" sx={{ display: 'block', mt: 0.5 }}>
          {fieldErrors.terms}
        </Typography>
      )}
    </Box>
  </Fade>
);

export default StepRoleSelection;
