/**
 * Student Registration — Success View
 */

import { gradients } from 'theme/palette';

const RegistrationSuccess = ({ formData, onReset, onNavigate }) => (
  <Container maxWidth="sm">
    <Box sx={{ mt: 8, textAlign: 'center' }}>
      <Fade in timeout={800}>
        <Box>
          <Avatar sx={{
            width: 96, height: 96, bgcolor: '#43e97b', mx: 'auto', mb: 3,
            boxShadow: '0 8px 32px rgba(67,233,123,0.3)',
          }}>
            <CheckCircle sx={{ fontSize: 56 }} />
          </Avatar>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            تم تسجيل الطالب بنجاح! 🎉
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {formData.firstNameAr} {formData.lastNameAr}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            سيتم إنشاء رقم طالب ورقم تسجيل تلقائياً
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" onClick={onReset}
              sx={{ background: gradients.primary, borderRadius: 2 }}>
              تسجيل طالب جديد
            </Button>
            <Button variant="outlined" color="primary"
              onClick={() => onNavigate('/student-management')}
              sx={{ borderRadius: 2 }}>
              إدارة الطلاب
            </Button>
            <Button variant="outlined"
              onClick={() => onNavigate('/beneficiaries')}
              sx={{ borderRadius: 2 }}>
              قائمة المستفيدين
            </Button>
            <Button variant="outlined" onClick={() => window.print()}
              startIcon={<Print />} sx={{ borderRadius: 2 }}>
              طباعة
            </Button>
          </Box>
        </Box>
      </Fade>
    </Box>
  </Container>
);

export default RegistrationSuccess;
