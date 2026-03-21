/**
 * Student Registration — Step 4: Medical History
 */



import {
  Alert,
  Box,
  Checkbox,
  Divider,
  Fade,
  FormControlLabel,
  FormGroup,
  Grid,
  TextField
} from '@mui/material';
const MedicalStep = ({ formData, handleChange, setFormData }) => (
  <Fade in timeout={400}>
    <Box>
      <SectionTitle icon={<LocalHospital fontSize="small" />}>التاريخ الطبي</SectionTitle>

      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField fullWidth label="الأمراض المزمنة" value={formData.chronicConditions}
            onChange={handleChange('chronicConditions')} multiline rows={2}
            placeholder="افصل بين كل حالة بفاصلة (مثال: ربو، سكري)" />
        </Grid>

        <Grid item xs={12}>
          <TextField fullWidth label="الأدوية الحالية" value={formData.medications}
            onChange={handleChange('medications')} multiline rows={2}
            placeholder="اسم الدواء والجرعة..." />
        </Grid>

        <Grid item xs={12}>
          <TextField fullWidth label="الحساسيات"
            value={Array.isArray(formData.allergies) ? formData.allergies.join(', ') : formData.allergies}
            onChange={(e) => setFormData((prev) => ({
              ...prev,
              allergies: e.target.value.split(',').map((a) => a.trim()).filter(Boolean),
            }))}
            multiline rows={2}
            placeholder="افصل بين كل حساسية بفاصلة (مثال: بنسلين، حليب، غبار)" />
        </Grid>

        <Grid item xs={12}>
          <FormGroup row>
            <FormControlLabel
              control={<Checkbox checked={formData.hasGlasses} onChange={handleChange('hasGlasses')} />}
              label="يرتدي نظارات طبية"
            />
            <FormControlLabel
              control={<Checkbox checked={formData.hasHearingAid} onChange={handleChange('hasHearingAid')} />}
              label="يستخدم سماعة طبية"
            />
          </FormGroup>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        يمكن إضافة تفاصيل إضافية (عمليات جراحية، تحصينات، تقارير طبية) لاحقاً من ملف الطالب
      </Alert>
    </Box>
  </Fade>
);

export default MedicalStep;
