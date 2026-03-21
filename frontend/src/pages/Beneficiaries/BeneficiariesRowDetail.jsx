/**
 * تفاصيل الصف القابل للتوسيع
 * BeneficiariesRowDetail – expandable row detail panel
 */


import {
  Box,
  Collapse,
  Grid,
  Stack,
  Typography
} from '@mui/material';
const BeneficiariesRowDetail = ({ row, isOpen }) => (
  <Collapse in={isOpen} timeout="auto" unmountOnExit>
    <Box sx={{ margin: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom fontWeight="bold">
        معلومات تفصيلية
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                الهاتف
              </Typography>
              <Typography variant="body2">{row.phone}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                البريد الإلكتروني
              </Typography>
              <Typography variant="body2">{row.email || 'غير متوفر'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                العنوان
              </Typography>
              <Typography variant="body2">{row.address}</Typography>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                المعالج المسؤول
              </Typography>
              <Typography variant="body2">{row.therapist}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                ولي الأمر
              </Typography>
              <Typography variant="body2">
                {row.guardian} - {row.guardianPhone}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                الموعد القادم
              </Typography>
              <Typography variant="body2">
                {row.nextAppointment || 'لا يوجد'}
              </Typography>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              ملاحظات
            </Typography>
            <Typography variant="body2">{row.notes}</Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  </Collapse>
);

export default BeneficiariesRowDetail;
