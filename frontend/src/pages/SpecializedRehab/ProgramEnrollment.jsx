/**
 * ProgramEnrollment — تسجيل المستفيدين في البرامج التأهيلية
 * Program Enrollment Management
 */
import { useState } from 'react';



const STEPS = ['اختيار البرنامج', 'بيانات المستفيد', 'الجدول الزمني', 'التأكيد'];

const PROGRAMS = [
  'برنامج تأهيل الإصابات الجسدية (12 أسبوع)',
  'برنامج التدخل المبكر (8 أسابيع)',
  'برنامج التأهيل المهني (16 أسبوع)',
  'برنامج التأهيل المعرفي (10 أسابيع)',
  'برنامج التواصل والنطق (12 أسبوع)',
  'برنامج المعيشة المستقلة (20 أسبوع)',
];

export default function ProgramEnrollment() {
  const [activeStep, setActiveStep] = useState(0);
  const [program, setProgram] = useState('');
  const [enrolled, setEnrolled] = useState(false);

  const handleNext = () => {
    if (activeStep === STEPS.length - 1) {
      setEnrolled(true);
    } else {
      setActiveStep(prev => prev + 1);
    }
  };
  const handleBack = () => setActiveStep(prev => Math.max(prev - 1, 0));

  if (enrolled) {
    return (
      <Container maxWidth="sm" sx={{ py: 6, textAlign: 'center' }}>
        <Alert severity="success" sx={{ mb: 3 }}>
          تم تسجيل المستفيد في البرنامج بنجاح
        </Alert>
        <Typography variant="h6">
          سيتم إرسال إشعار للمعالج المسؤول وجدولة الجلسات الأولى
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 3 }}
          onClick={() => { setEnrolled(false); setActiveStep(0); setProgram(''); }}
        >
          تسجيل مستفيد آخر
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <HowToRegIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h4" fontWeight="bold">
          تسجيل في برنامج تأهيلي
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
            <Typography variant="h6" gutterBottom>اختر البرنامج التأهيلي</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>البرنامج</InputLabel>
              <Select
                value={program}
                label="البرنامج"
                onChange={e => setProgram(e.target.value)}
              >
                {PROGRAMS.map(p => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {activeStep === 1 && (
          <Box>
            <Typography variant="h6" gutterBottom>بيانات المستفيد</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="رقم ملف المستفيد" placeholder="BEN-2026-XXXXX" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="اسم المستفيد" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="الطبيب / المعالج المسؤول" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="الفرع" />
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>الجدول الزمني</Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="تاريخ البدء" type="date" InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>عدد الجلسات أسبوعياً</InputLabel>
                  <Select defaultValue={3} label="عدد الجلسات أسبوعياً">
                    <MenuItem value={2}>مرتان أسبوعياً</MenuItem>
                    <MenuItem value={3}>3 مرات أسبوعياً</MenuItem>
                    <MenuItem value={5}>5 مرات أسبوعياً</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeStep === 3 && (
          <Box>
            <Typography variant="h6" gutterBottom>تأكيد التسجيل</Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              يرجى مراجعة البيانات قبل تأكيد التسجيل
            </Alert>
            <Typography><strong>البرنامج:</strong> {program || 'غير محدد'}</Typography>
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button onClick={handleBack} disabled={activeStep === 0}>
            السابق
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && !program}
          >
            {activeStep === STEPS.length - 1 ? 'تأكيد التسجيل' : 'التالي'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
