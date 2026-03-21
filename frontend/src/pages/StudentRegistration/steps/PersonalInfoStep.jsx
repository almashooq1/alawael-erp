/**
 * Student Registration — Step 0: Personal Info
 */


import {
  Badge,
  Box,
  Divider,
  Fade,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import Person from '@mui/icons-material/Person';
import Flag from '@mui/icons-material/Flag';
import Home from '@mui/icons-material/Home';
const PersonalInfoStep = ({ formData, fieldErrors, handleChange, calculatedAge }) => (
  <Fade in timeout={400}>
    <Box>
      <SectionTitle icon={<Person fontSize="small" />}>البيانات الشخصية</SectionTitle>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="الاسم الأول (عربي) *" value={formData.firstNameAr}
            onChange={handleChange('firstNameAr')} error={!!fieldErrors.firstNameAr}
            helperText={fieldErrors.firstNameAr}
            InputProps={{ startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="اسم العائلة (عربي) *" value={formData.lastNameAr}
            onChange={handleChange('lastNameAr')} error={!!fieldErrors.lastNameAr}
            helperText={fieldErrors.lastNameAr} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="First Name (English)" value={formData.firstNameEn}
            onChange={handleChange('firstNameEn')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Last Name (English)" value={formData.lastNameEn}
            onChange={handleChange('lastNameEn')} />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="رقم الهوية الوطنية" value={formData.nationalId}
            onChange={handleChange('nationalId')} error={!!fieldErrors.nationalId}
            helperText={fieldErrors.nationalId} placeholder="1XXXXXXXXX"
            InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="تاريخ الميلاد *" type="date" value={formData.dateOfBirth}
            onChange={handleChange('dateOfBirth')} error={!!fieldErrors.dateOfBirth}
            helperText={fieldErrors.dateOfBirth || (calculatedAge !== null ? `العمر: ${calculatedAge} سنة` : '')}
            InputLabelProps={{ shrink: true }}
            InputProps={{ startAdornment: <InputAdornment position="start"><Cake color="action" /></InputAdornment> }}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <FormControl fullWidth error={!!fieldErrors.gender}>
            <InputLabel>الجنس *</InputLabel>
            <Select value={formData.gender} label="الجنس *" onChange={handleChange('gender')}
              startAdornment={<InputAdornment position="start"><Wc color="action" /></InputAdornment>}>
              <MenuItem value="male">ذكر</MenuItem>
              <MenuItem value="female">أنثى</MenuItem>
            </Select>
            {fieldErrors.gender && <Typography variant="caption" color="error" sx={{ mt: 0.5, mr: 2 }}>{fieldErrors.gender}</Typography>}
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="الجنسية" value={formData.nationality}
            onChange={handleChange('nationality')}
            InputProps={{ startAdornment: <InputAdornment position="start"><Flag color="action" /></InputAdornment> }}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>فصيلة الدم</InputLabel>
            <Select value={formData.bloodType} label="فصيلة الدم" onChange={handleChange('bloodType')}>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                <MenuItem key={bt} value={bt}>{bt}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
        <Home fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
        العنوان
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="المنطقة" value={formData.region} onChange={handleChange('region')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="المدينة" value={formData.city} onChange={handleChange('city')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="الحي" value={formData.district} onChange={handleChange('district')} />
        </Grid>
        <Grid item xs={12} sm={8}>
          <TextField fullWidth label="الشارع" value={formData.streetName} onChange={handleChange('streetName')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="الرمز البريدي" value={formData.postalCode} onChange={handleChange('postalCode')} />
        </Grid>
      </Grid>
    </Box>
  </Fade>
);

export default PersonalInfoStep;
