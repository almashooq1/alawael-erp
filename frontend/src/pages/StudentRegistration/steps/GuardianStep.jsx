/**
 * Student Registration — Step 2: Guardian / Parent Info
 */


import { statusColors } from 'theme/palette';

const GuardianStep = ({ formData, fieldErrors, handleChange }) => (
  <Fade in timeout={400}>
    <Box>
      <SectionTitle icon={<FamilyRestroom fontSize="small" />}>بيانات ولي الأمر</SectionTitle>

      {/* Father */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography fontWeight="bold">بيانات الأب</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم الأب *" value={formData.fatherName}
                onChange={handleChange('fatherName')} error={!!fieldErrors.fatherName}
                helperText={fieldErrors.fatherName}
                InputProps={{ startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="رقم هوية الأب" value={formData.fatherNationalId}
                onChange={handleChange('fatherNationalId')}
                InputProps={{ startAdornment: <InputAdornment position="start"><Badge color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="جوال الأب" value={formData.fatherMobile}
                onChange={handleChange('fatherMobile')} placeholder="05XXXXXXXX"
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="بريد الأب" value={formData.fatherEmail}
                onChange={handleChange('fatherEmail')} type="email"
                InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField fullWidth label="المهنة" value={formData.fatherOccupation}
                onChange={handleChange('fatherOccupation')} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Mother */}
      <Accordion defaultExpanded sx={{ mt: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography fontWeight="bold">بيانات الأم</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="اسم الأم" value={formData.motherName}
                onChange={handleChange('motherName')}
                InputProps={{ startAdornment: <InputAdornment position="start"><Person color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="جوال الأم" value={formData.motherMobile}
                onChange={handleChange('motherMobile')} placeholder="05XXXXXXXX"
                InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="بريد الأم" value={formData.motherEmail}
                onChange={handleChange('motherEmail')} type="email"
                InputProps={{ startAdornment: <InputAdornment position="start"><Email color="action" /></InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="المهنة" value={formData.motherOccupation}
                onChange={handleChange('motherOccupation')} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Emergency Contact */}
      <Divider sx={{ my: 3 }} />
      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, color: statusColors.error }}>
        🚨 جهة اتصال الطوارئ
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="الاسم" value={formData.emergencyName}
            onChange={handleChange('emergencyName')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="صلة القرابة" value={formData.emergencyRelation}
            onChange={handleChange('emergencyRelation')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="رقم الجوال *" value={formData.emergencyMobile}
            onChange={handleChange('emergencyMobile')} error={!!fieldErrors.emergencyMobile}
            helperText={fieldErrors.emergencyMobile}
            InputProps={{ startAdornment: <InputAdornment position="start"><Phone color="action" /></InputAdornment> }}
          />
        </Grid>
      </Grid>
    </Box>
  </Fade>
);

export default GuardianStep;
