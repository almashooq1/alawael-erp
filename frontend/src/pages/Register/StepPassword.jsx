/**
 * StepPassword — Step 1: Password with strength indicator
 */


import { brandColors, surfaceColors } from 'theme/palette';
import {
  Box,
  Chip,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography
} from '@mui/material';
import Lock from '@mui/icons-material/Lock';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import Visibility from '@mui/icons-material/Visibility';
import CheckCircle from '@mui/icons-material/CheckCircle';

const StepPassword = ({
  formData,
  fieldErrors,
  handleChange,
  showPassword,
  setShowPassword,
  showConfirm,
  setShowConfirm,
  passwordStrength,
}) => (
  <Fade in timeout={400} key="step1">
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: brandColors.primaryStart }}>
        إعداد كلمة المرور
      </Typography>
      <TextField
        fullWidth
        label="كلمة المرور"
        type={showPassword ? 'text' : 'password'}
        value={formData.password}
        onChange={handleChange('password')}
        error={!!fieldErrors.password}
        helperText={fieldErrors.password}
        sx={{ mb: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* Password Strength Indicator */}
      {formData.password && (
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              قوة كلمة المرور
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: passwordStrength.color, fontWeight: 'bold' }}
            >
              {passwordStrength.label}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(passwordStrength.score / 5) * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: surfaceColors.softGray,
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                bgcolor: passwordStrength.color,
                transition: 'all 0.4s ease',
              },
            }}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
            {[
              { test: formData.password.length >= 6, label: '6+ أحرف' },
              { test: /[A-Z]/.test(formData.password), label: 'حرف كبير' },
              { test: /[0-9]/.test(formData.password), label: 'رقم' },
              { test: /[^a-zA-Z0-9]/.test(formData.password), label: 'رمز خاص' },
            ].map(req => (
              <Chip
                key={req.label}
                label={req.label}
                size="small"
                variant={req.test ? 'filled' : 'outlined'}
                color={req.test ? 'success' : 'default'}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Box>
      )}

      <TextField
        fullWidth
        label="تأكيد كلمة المرور"
        type={showConfirm ? 'text' : 'password'}
        value={formData.confirmPassword}
        onChange={handleChange('confirmPassword')}
        error={!!fieldErrors.confirmPassword}
        helperText={fieldErrors.confirmPassword}
        sx={{ mb: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small">
                {showConfirm ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {formData.confirmPassword && formData.password === formData.confirmPassword && (
        <Fade in>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <CheckCircle sx={{ color: brandColors.accentGreen, fontSize: 18 }} />
            <Typography variant="caption" sx={{ color: brandColors.accentGreen }}>
              كلمتا المرور متطابقتان
            </Typography>
          </Box>
        </Fade>
      )}
    </Box>
  </Fade>
);

export default StepPassword;
