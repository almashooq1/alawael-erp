/**
 * Student Registration — Step 5: Review & Confirm
 */


import {
  DISABILITY_TYPES, SEVERITY_LEVELS, PROGRAMS, SHIFTS, WEEK_DAYS,
} from '../studentRegistrationConfig';
import { gradients } from 'theme/palette';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Fade,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography
} from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';

const ReviewStep = ({ formData, submitError, calculatedAge }) => (
  <Fade in timeout={400}>
    <Box>
      <SectionTitle icon={<CheckCircle fontSize="small" />}>مراجعة البيانات والتأكيد</SectionTitle>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{submitError}</Alert>
      )}

      {/* Personal Info */}
      <Card elevation={2} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ background: gradients.primary, p: 2, color: 'white' }}>
          <Typography fontWeight="bold">البيانات الشخصية</Typography>
        </Box>
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ fontWeight: 'bold', width: 160 }}>الاسم</TableCell>
              <TableCell>{formData.firstNameAr} {formData.lastNameAr}</TableCell></TableRow>
            {formData.firstNameEn && <TableRow><TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell>{formData.firstNameEn} {formData.lastNameEn}</TableCell></TableRow>}
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>الهوية</TableCell>
              <TableCell>{formData.nationalId || '—'}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>تاريخ الميلاد</TableCell>
              <TableCell>{formData.dateOfBirth || '—'} {calculatedAge !== null ? `(${calculatedAge} سنة)` : ''}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>الجنس</TableCell>
              <TableCell>{formData.gender === 'male' ? 'ذكر' : formData.gender === 'female' ? 'أنثى' : '—'}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>المدينة</TableCell>
              <TableCell>{formData.city || '—'}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Disability */}
      <Card elevation={2} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ background: gradients.warning, p: 2, color: 'white' }}>
          <Typography fontWeight="bold">الإعاقة والتشخيص</Typography>
        </Box>
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ fontWeight: 'bold', width: 160 }}>النوع</TableCell>
              <TableCell>{DISABILITY_TYPES[formData.primaryType]?.label || '—'}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>الفرعي</TableCell>
              <TableCell>{formData.primarySubtype || '—'}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>الشدة</TableCell>
              <TableCell>{SEVERITY_LEVELS[formData.severity] || '—'}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>جهة التشخيص</TableCell>
              <TableCell>{formData.diagnosisSource || '—'}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Guardian */}
      <Card elevation={2} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ background: gradients.success, p: 2, color: 'white' }}>
          <Typography fontWeight="bold">ولي الأمر</Typography>
        </Box>
        <Table size="small">
          <TableBody>
            <TableRow><TableCell sx={{ fontWeight: 'bold', width: 160 }}>الأب</TableCell>
              <TableCell>{formData.fatherName || '—'} {formData.fatherMobile ? `— ${formData.fatherMobile}` : ''}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>الأم</TableCell>
              <TableCell>{formData.motherName || '—'} {formData.motherMobile ? `— ${formData.motherMobile}` : ''}</TableCell></TableRow>
            <TableRow><TableCell sx={{ fontWeight: 'bold' }}>الطوارئ</TableCell>
              <TableCell>{formData.emergencyName || '—'} — {formData.emergencyMobile || '—'}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Card>

      {/* Programs */}
      <Card elevation={2} sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ background: gradients.info, p: 2, color: 'white' }}>
          <Typography fontWeight="bold">البرامج</Typography>
        </Box>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {formData.selectedPrograms.map((p) => (
              <Chip key={p} label={PROGRAMS[p]} color="primary" variant="outlined" />
            ))}
            {formData.selectedPrograms.length === 0 && (
              <Typography variant="body2" color="text.secondary">لم يتم اختيار برامج</Typography>
            )}
          </Box>
          {formData.shift && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              الفترة: {SHIFTS[formData.shift]} | الأيام: {formData.days.map((d) => WEEK_DAYS[d]).join(', ') || '—'}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  </Fade>
);

export default ReviewStep;
