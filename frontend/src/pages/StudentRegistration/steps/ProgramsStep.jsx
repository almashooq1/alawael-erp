/**
 * Student Registration — Step 3: Programs & Schedule
 */


import { PROGRAMS, SHIFTS, WEEK_DAYS } from '../studentRegistrationConfig';
import { brandColors } from 'theme/palette';
import {
  Alert,
  Box,
  Card,
  Chip,
  Divider,
  Fade,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import School from '@mui/icons-material/School';
import CheckCircle from '@mui/icons-material/CheckCircle';

const ProgramsStep = ({ formData, fieldErrors, handleChange, handleMultiSelect }) => (
  <Fade in timeout={400}>
    <Box>
      <SectionTitle icon={<School fontSize="small" />}>البرامج التأهيلية والجدول</SectionTitle>

      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
        اختر البرامج المطلوبة *
      </Typography>
      {fieldErrors.selectedPrograms && (
        <Alert severity="error" sx={{ mb: 2 }}>{fieldErrors.selectedPrograms}</Alert>
      )}

      <Grid container spacing={1.5} sx={{ mb: 3 }}>
        {Object.entries(PROGRAMS).map(([key, label]) => (
          <Grid item xs={6} sm={4} key={key}>
            <Card
              onClick={() => handleMultiSelect('selectedPrograms', key)}
              sx={{
                cursor: 'pointer', textAlign: 'center', py: 1.5, px: 1,
                border: formData.selectedPrograms.includes(key)
                  ? `2px solid ${brandColors.primaryStart}` : '2px solid transparent',
                bgcolor: formData.selectedPrograms.includes(key) ? 'rgba(102,126,234,0.06)' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': { boxShadow: 3 },
              }}
            >
              <Typography variant="body2" fontWeight={formData.selectedPrograms.includes(key) ? 'bold' : 'normal'}>
                {label}
              </Typography>
              {formData.selectedPrograms.includes(key) && (
                <CheckCircle sx={{ fontSize: 16, color: brandColors.primaryStart, mt: 0.5 }} />
              )}
            </Card>
          </Grid>
        ))}
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
        الجدول الزمني
      </Typography>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel>الفترة</InputLabel>
            <Select value={formData.shift} label="الفترة" onChange={handleChange('shift')}>
              {Object.entries(SHIFTS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="body2" sx={{ mb: 1 }}>أيام الحضور:</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(WEEK_DAYS).map(([key, label]) => (
              <Chip key={key} label={label}
                onClick={() => handleMultiSelect('days', key)}
                variant={formData.days.includes(key) ? 'filled' : 'outlined'}
                color={formData.days.includes(key) ? 'primary' : 'default'}
                sx={{ cursor: 'pointer' }} />
            ))}
          </Box>
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="المركز" value={formData.centerName}
            onChange={handleChange('centerName')} placeholder="اسم المركز" />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="الفرع" value={formData.branchName}
            onChange={handleChange('branchName')} placeholder="اسم الفرع" />
        </Grid>
      </Grid>
    </Box>
  </Fade>
);

export default ProgramsStep;
