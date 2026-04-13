/**
 * ScaleAdministration — إدارة وتطبيق المقاييس التشخيصية
 * Scale Administration & Scoring
 */
import { useState } from 'react';



const STEPS = ['اختيار المقياس', 'بيانات المستفيد', 'تطبيق المقياس', 'النتائج'];

export default function ScaleAdministration() {
  const [activeStep, setActiveStep] = useState(0);
  const [painScore, setPainScore] = useState(0);

  const handleNext = () => setActiveStep(prev => Math.min(prev + 1, STEPS.length - 1));
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <AssignmentIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" fontWeight="bold">
          تطبيق المقياس التشخيصي
        </Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper sx={{ p: 4 }}>
        {activeStep === 0 && (
          <Box>
            <Typography variant="h6" gutterBottom>اختر المقياس المراد تطبيقه</Typography>
            <FormControl>
              <RadioGroup defaultValue="fim">
                <FormControlLabel value="fim" control={<Radio />} label="Functional Independence Measure (FIM)" />
                <FormControlLabel value="barthel" control={<Radio />} label="Barthel Index" />
                <FormControlLabel value="nrs" control={<Radio />} label="Numerical Rating Scale - Pain (NRS)" />
                <FormControlLabel value="berg" control={<Radio />} label="Berg Balance Scale" />
              </RadioGroup>
            </FormControl>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>بيانات المستفيد</Typography>
            <Alert severity="info">سيتم تعبئة بيانات المستفيد من ملفه في النظام</Alert>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>مستوى الألم (0-10)</Typography>
            <Divider sx={{ my: 2 }} />
            <Typography gutterBottom>كيف تصف مستوى الألم لديك؟</Typography>
            <Slider
              value={painScore}
              onChange={(_, v) => setPainScore(v)}
              min={0}
              max={10}
              step={1}
              marks
              valueLabelDisplay="on"
              sx={{ mt: 4 }}
            />
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">لا ألم</Typography>
              <Typography variant="caption" color="text.secondary">ألم شديد جداً</Typography>
            </Box>
          </Box>
        )}

        {activeStep === 3 && (
          <Box textAlign="center">
            <Alert severity="success" sx={{ mb: 3 }}>
              تم الانتهاء من تطبيق المقياس بنجاح
            </Alert>
            <Typography variant="h5" fontWeight="bold" color="primary">
              النتيجة: {painScore} / 10
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {painScore <= 3 ? 'ألم خفيف' : painScore <= 6 ? 'ألم متوسط' : 'ألم شديد'}
            </Typography>
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button onClick={handleBack} disabled={activeStep === 0}>
            السابق
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === STEPS.length - 1}
          >
            {activeStep === STEPS.length - 2 ? 'احتساب النتيجة' : 'التالي'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
