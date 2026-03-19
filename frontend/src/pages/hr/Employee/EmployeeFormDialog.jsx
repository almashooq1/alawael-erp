/**
 * EmployeeFormDialog – multi-step dialog for add / edit / view employee.
 * Steps: 0 = personal info, 1 = employment info, 2 = documents.
 */
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel,
  TextField, MenuItem, Button, IconButton, Grid,
  Typography, Box, Stack, Divider, Chip, CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Save as SaveIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  Description as DocsIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { DEPARTMENTS, STATUS_MAP } from './employeeManagement.constants';

/* ── step labels ── */
const STEPS = [
  { label: 'المعلومات الشخصية', icon: <PersonIcon /> },
  { label: 'معلومات التوظيف',   icon: <WorkIcon /> },
  { label: 'المستندات',          icon: <DocsIcon /> },
];

/* ── helper: read-only field ── */
const ReadOnly = ({ label, value }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    <Typography variant="body2" fontWeight={600}>{value || '—'}</Typography>
  </Box>
);

/* ── step 0 content ── */
function StepPersonal({ form, setField, errors, touched, readOnly }) {
  const field = (name, label, props = {}) =>
    readOnly ? (
      <ReadOnly key={name} label={label} value={form[name]} />
    ) : (
      <TextField
        key={name}
        fullWidth
        size="small"
        label={label}
        value={form[name] || ''}
        onChange={(e) => setField(name, e.target.value)}
        error={!!errors[name] && touched[name] !== false}
        helperText={touched[name] !== false ? errors[name] : ''}
        sx={{ mb: 2 }}
        {...props}
      />
    );

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>{field('firstName', 'الاسم الأول')}</Grid>
      <Grid item xs={12} sm={6}>{field('lastName', 'اسم العائلة')}</Grid>
      <Grid item xs={12} sm={6}>{field('nationalId', 'رقم الهوية', { dir: 'ltr' })}</Grid>
      <Grid item xs={12} sm={6}>{field('phone', 'رقم الجوال', { dir: 'ltr' })}</Grid>
      <Grid item xs={12}>{field('email', 'البريد الإلكتروني', { type: 'email', dir: 'ltr' })}</Grid>
    </Grid>
  );
}

/* ── step 1 content ── */
function StepEmployment({ form, setField, errors, touched, readOnly, positionsList }) {
  if (readOnly) {
    const st = STATUS_MAP[form.status];
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}><ReadOnly label="القسم" value={form.department} /></Grid>
        <Grid item xs={12} sm={6}><ReadOnly label="المسمى الوظيفي" value={form.position} /></Grid>
        <Grid item xs={12} sm={6}><ReadOnly label="تاريخ الالتحاق" value={form.joinDate} /></Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">الحالة</Typography>
          {st ? (
            <Chip label={st.label} size="small" sx={{ bgcolor: `${st.color}18`, color: st.color, fontWeight: 600, mt: 0.5, display: 'flex', width: 'fit-content' }} />
          ) : (
            <Typography variant="body2" fontWeight={600}>{form.status || '—'}</Typography>
          )}
        </Grid>
        <Grid item xs={12} sm={6}><ReadOnly label="الراتب" value={form.salary} /></Grid>
        <Grid item xs={12}><ReadOnly label="ملاحظات" value={form.notes} /></Grid>
      </Grid>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          select fullWidth size="small" label="القسم"
          value={form.department || ''}
          onChange={(e) => { setField('department', e.target.value); setField('position', ''); }}
          error={!!errors.department}
          helperText={errors.department}
          sx={{ mb: 2 }}
        >
          {DEPARTMENTS.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select fullWidth size="small" label="المسمى الوظيفي"
          value={form.position || ''}
          onChange={(e) => setField('position', e.target.value)}
          error={!!errors.position}
          helperText={errors.position}
          disabled={!form.department}
          sx={{ mb: 2 }}
        >
          {positionsList.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth size="small" label="تاريخ الالتحاق" type="date"
          InputLabelProps={{ shrink: true }}
          value={form.joinDate || ''}
          onChange={(e) => setField('joinDate', e.target.value)}
          error={!!errors.joinDate}
          helperText={errors.joinDate}
          sx={{ mb: 2 }}
        />
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          select fullWidth size="small" label="الحالة"
          value={form.status || 'active'}
          onChange={(e) => setField('status', e.target.value)}
          sx={{ mb: 2 }}
        >
          {Object.entries(STATUS_MAP).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v.label}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12} sm={6}>
        <TextField
          fullWidth size="small" label="الراتب" type="number" dir="ltr"
          value={form.salary || ''}
          onChange={(e) => setField('salary', e.target.value)}
          sx={{ mb: 2 }}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth size="small" label="ملاحظات" multiline rows={2}
          value={form.notes || ''}
          onChange={(e) => setField('notes', e.target.value)}
          sx={{ mb: 2 }}
        />
      </Grid>
    </Grid>
  );
}

/* ── step 2 content ── */
function StepDocuments({ form, setField, readOnly }) {
  const docs = form.documents || [];

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>المستندات المرفقة</Typography>

      {docs.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          لا توجد مستندات مرفقة
        </Typography>
      )}

      {docs.map((doc, i) => (
        <Chip
          key={i}
          label={doc.name || `مستند ${i + 1}`}
          onDelete={readOnly ? undefined : () => {
            const next = docs.filter((_, idx) => idx !== i);
            setField('documents', next);
          }}
          sx={{ mr: 1, mb: 1 }}
        />
      ))}

      {!readOnly && (
        <Box
          sx={{
            mt: 2, p: 4, border: '2px dashed', borderColor: 'divider',
            borderRadius: 2, textAlign: 'center', cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
          onClick={() => {
            // placeholder – in production use <input type="file" />
            const fakeName = `مستند_${docs.length + 1}.pdf`;
            setField('documents', [...docs, { name: fakeName, url: '#' }]);
          }}
        >
          <UploadIcon color="action" sx={{ fontSize: 40, mb: 1 }} />
          <Typography variant="body2" color="text.secondary">
            اضغط لإرفاق مستند
          </Typography>
        </Box>
      )}
    </Box>
  );
}

/* ═══════════════════════════════════════════════ */
export default function EmployeeFormDialog({
  dialogOpen, setDialogOpen,
  dialogMode, setDialogMode,
  form, setField, positionsList,
  activeStep, setActiveStep,
  errors, setErrors,
  touched, setTouched,
  saving, handleNext, handleBack,
  handleSave, handlePrint,
}) {
  const readOnly = dialogMode === 'view';
  const title = dialogMode === 'add' ? 'إضافة موظف جديد'
    : dialogMode === 'edit' ? 'تعديل بيانات الموظف'
    : 'بيانات الموظف';

  const stepContent = () => {
    switch (activeStep) {
      case 0:
        return <StepPersonal form={form} setField={setField} errors={errors} touched={touched} readOnly={readOnly} />;
      case 1:
        return <StepEmployment form={form} setField={setField} errors={errors} touched={touched} readOnly={readOnly} positionsList={positionsList} />;
      case 2:
        return <StepDocuments form={form} setField={setField} readOnly={readOnly} />;
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={dialogOpen}
      onClose={() => setDialogOpen(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      {/* ── Title ── */}
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        <Stack direction="row" spacing={1}>
          {dialogMode === 'view' && (
            <>
              <IconButton size="small" onClick={handlePrint}><PrintIcon fontSize="small" /></IconButton>
              <Button size="small" variant="outlined" onClick={() => setDialogMode('edit')}>
                تعديل
              </Button>
            </>
          )}
          <IconButton size="small" onClick={() => setDialogOpen(false)}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      {/* ── Stepper ── */}
      <Box sx={{ px: 3, pt: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((s, i) => (
            <Step key={i} completed={activeStep > i}>
              <StepLabel
                StepIconComponent={() => (
                  <Box
                    sx={{
                      width: 32, height: 32, borderRadius: '50%', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      bgcolor: activeStep >= i ? 'primary.main' : 'action.disabledBackground',
                      color: activeStep >= i ? '#fff' : 'text.disabled',
                      transition: 'all .3s',
                    }}
                  >
                    {s.icon}
                  </Box>
                )}
              >
                <Typography variant="caption" fontWeight={activeStep === i ? 700 : 400}>
                  {s.label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* ── Content ── */}
      <DialogContent sx={{ pt: 3, minHeight: 280 }}>
        {stepContent()}
      </DialogContent>

      <Divider />

      {/* ── Actions ── */}
      <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
        <Box>
          {activeStep > 0 && (
            <Button startIcon={<BackIcon />} onClick={handleBack}>
              السابق
            </Button>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => setDialogOpen(false)} color="inherit">إلغاء</Button>

          {activeStep < STEPS.length - 1 ? (
            <Button variant="contained" endIcon={<NextIcon />} onClick={handleNext}>
              التالي
            </Button>
          ) : !readOnly ? (
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'جارٍ الحفظ...' : 'حفظ'}
            </Button>
          ) : null}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
