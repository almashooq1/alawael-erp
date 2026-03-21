/**
 * StepBasicInfo — Step 0: Name, email, phone, national ID
 */

import { brandColors } from 'theme/palette';
import {
  Badge,
  Box,
  Fade,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';
import Person from '@mui/icons-material/Person';
import Email from '@mui/icons-material/Email';
import Phone from '@mui/icons-material/Phone';

const StepBasicInfo = ({ formData, fieldErrors, handleChange }) => (
  <Fade in timeout={400} key="step0">
    <Box>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, color: brandColors.primaryStart }}>
        البيانات الأساسية
      </Typography>
      <TextField
        fullWidth
        label="الاسم الكامل"
        value={formData.name}
        onChange={handleChange('name')}
        error={!!fieldErrors.name}
        helperText={fieldErrors.name}
        autoFocus
        sx={{ mb: 2.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Person color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        fullWidth
        label="البريد الإلكتروني"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        error={!!fieldErrors.email}
        helperText={fieldErrors.email}
        sx={{ mb: 2.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        fullWidth
        label="رقم الجوال (اختياري)"
        value={formData.phone}
        onChange={handleChange('phone')}
        error={!!fieldErrors.phone}
        helperText={fieldErrors.phone || 'مثال: 0501234567'}
        placeholder="05XXXXXXXX"
        sx={{ mb: 2.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Phone color="action" />
            </InputAdornment>
          ),
        }}
      />
      <TextField
        fullWidth
        label="رقم الهوية الوطنية (اختياري)"
        value={formData.nationalId}
        onChange={handleChange('nationalId')}
        error={!!fieldErrors.nationalId}
        helperText={fieldErrors.nationalId}
        placeholder="1XXXXXXXXX"
        sx={{ mb: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Badge color="action" />
            </InputAdornment>
          ),
        }}
      />
    </Box>
  </Fade>
);

export default StepBasicInfo;
