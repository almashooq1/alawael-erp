/**
 * Student Registration — Step 1: Disability & Diagnosis
 */


import { DISABILITY_TYPES, SEVERITY_LEVELS } from '../studentRegistrationConfig';
import { statusColors } from 'theme/palette';

const SEVERITY_BAR_COLORS = {
  mild: statusColors.success,
  moderate: statusColors.warning,
  severe: statusColors.error,
  profound: '#b71c1c',
};

const DisabilityStep = ({ formData, fieldErrors, handleChange }) => (
  <Fade in timeout={400}>
    <Box>
      <SectionTitle icon={<Accessible fontSize="small" />}>معلومات الإعاقة والتشخيص</SectionTitle>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!fieldErrors.primaryType}>
            <InputLabel>نوع الإعاقة الرئيسي *</InputLabel>
            <Select value={formData.primaryType} label="نوع الإعاقة الرئيسي *"
              onChange={handleChange('primaryType')}>
              {Object.entries(DISABILITY_TYPES).map(([key, val]) => (
                <MenuItem key={key} value={key}>{val.label}</MenuItem>
              ))}
            </Select>
            {fieldErrors.primaryType && <Typography variant="caption" color="error" sx={{ mt: 0.5, mr: 2 }}>{fieldErrors.primaryType}</Typography>}
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={!formData.primaryType}>
            <InputLabel>النوع الفرعي</InputLabel>
            <Select value={formData.primarySubtype} label="النوع الفرعي"
              onChange={handleChange('primarySubtype')}>
              {(DISABILITY_TYPES[formData.primaryType]?.subtypes || []).map((st) => (
                <MenuItem key={st} value={st}>{st}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth error={!!fieldErrors.severity}>
            <InputLabel>مستوى الشدة *</InputLabel>
            <Select value={formData.severity} label="مستوى الشدة *"
              onChange={handleChange('severity')}>
              {Object.entries(SEVERITY_LEVELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>{label}</MenuItem>
              ))}
            </Select>
            {fieldErrors.severity && <Typography variant="caption" color="error" sx={{ mt: 0.5, mr: 2 }}>{fieldErrors.severity}</Typography>}
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="تاريخ التشخيص" type="date" value={formData.diagnosisDate}
            onChange={handleChange('diagnosisDate')} InputLabelProps={{ shrink: true }} />
        </Grid>

        <Grid item xs={12}>
          <TextField fullWidth label="جهة التشخيص" value={formData.diagnosisSource}
            onChange={handleChange('diagnosisSource')}
            placeholder="مثال: مستشفى الملك فيصل التخصصي" />
        </Grid>

        <Grid item xs={12}>
          <TextField fullWidth label="ملاحظات إضافية" value={formData.disabilityNotes}
            onChange={handleChange('disabilityNotes')} multiline rows={3}
            placeholder="أي معلومات إضافية عن حالة الإعاقة أو التشخيص..." />
        </Grid>
      </Grid>

      {/* Severity visual indicator */}
      {formData.severity && (
        <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">مستوى الشدة</Typography>
            <Chip label={SEVERITY_LEVELS[formData.severity]} size="small"
              color={formData.severity === 'mild' ? 'success' : formData.severity === 'moderate' ? 'warning' : 'error'} />
          </Box>
          <LinearProgress variant="determinate"
            value={formData.severity === 'mild' ? 25 : formData.severity === 'moderate' ? 50 : formData.severity === 'severe' ? 75 : 100}
            sx={{
              height: 8, borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                bgcolor: SEVERITY_BAR_COLORS[formData.severity],
              },
            }}
          />
        </Box>
      )}
    </Box>
  </Fade>
);

export default DisabilityStep;
