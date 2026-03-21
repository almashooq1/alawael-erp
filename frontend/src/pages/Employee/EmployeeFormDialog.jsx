/**
 * EmployeeFormDialog.jsx — Add / Edit / View dialog with multi-step form
 * نموذج إضافة / تعديل الموظفين مع خطوات متعددة
 */

import {
  DEPARTMENTS, STATUS_MAP, CONTRACT_TYPES, GENDERS,
  MARITAL_STATUS, NATIONALITIES, BANKS, STEPS,
  generateEmpNumber,
} from './employeeManagement.constants';
import { DEPT_COLORS } from '../../constants/departmentColors';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import WorkIcon from '@mui/icons-material/Work';
import RefreshIcon from '@mui/icons-material/Refresh';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import HomeIcon from '@mui/icons-material/Home';
import SaveIcon from '@mui/icons-material/Save';
import { ActiveIcon } from 'utils/iconAliases';

const EmployeeFormDialog = ({
  dialogOpen, setDialogOpen, dialogMode, setDialogMode,
  form, setField, positionsList, activeStep, setActiveStep,
  errors, setErrors, touched, setTouched,
  saving, handleNext, handleBack, handleSave, handlePrint,
}) => {
  /* ─── local renderField helper ─── */
  const renderField = (field, label, props = {}) => (
    <TextField fullWidth label={label} value={form[field] || ''}
      onChange={e => setField(field, e.target.value)}
      error={!!(touched[field] && errors[field])}
      helperText={touched[field] && errors[field]}
      disabled={dialogMode === 'view'} size="small" {...props}
    />
  );

  return (
    <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 3, minHeight: dialogMode === 'view' ? 'auto' : 520 } }}>

      {dialogMode === 'view' ? (
        <EmployeeProfileView form={form} onClose={() => setDialogOpen(false)}
          onEdit={() => { setDialogMode('edit'); setActiveStep(0); setErrors({}); setTouched({}); }}
          onPrint={handlePrint} />
      ) : (
        <>
          <DialogTitle sx={{ pb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight={700}>
                {dialogMode === 'add' ? 'تسجيل موظف جديد' : 'تعديل بيانات الموظف'}
              </Typography>
              <IconButton onClick={() => setDialogOpen(false)}><CloseIcon /></IconButton>
            </Box>
          </DialogTitle>

          {/* Stepper */}
          <Box sx={{ px: 3, pb: 1 }}>
            <Stepper activeStep={activeStep} alternativeLabel sx={{ '& .MuiStepLabel-label': { fontSize: '0.8rem', mt: 0.5 } }}>
              {STEPS.map((step, i) => (
                <Step key={i} completed={i < activeStep}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Avatar sx={{
                        width: 32, height: 32, fontSize: 14,
                        bgcolor: i === activeStep ? 'primary.main' : i < activeStep ? 'success.main' : 'action.disabled',
                        color: '#fff', cursor: i < activeStep ? 'pointer' : 'default',
                      }} onClick={() => { if (i < activeStep) setActiveStep(i); }}>
                        {i < activeStep ? <ActiveIcon sx={{ fontSize: 18 }} /> : step.icon}
                      </Avatar>
                    )}>
                    {step.label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Divider />

          <DialogContent sx={{ py: 3, minHeight: 320 }}>
            {/* Step 0: البيانات الشخصية */}
            <Collapse in={activeStep === 0} unmountOnExit>
              <SectionHeader icon={<PersonIcon />} title="البيانات الشخصية" subtitle="المعلومات الأساسية للموظف" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {renderField('firstName', 'الاسم الأول *', {
                    InputProps: { startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>{renderField('lastName', 'الاسم الأخير *')}</Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('gender', 'الجنس *', {
                    select: true,
                    children: GENDERS.map(g => (
                      <MenuItem key={g.value} value={g.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{g.icon} {g.label}</Box>
                      </MenuItem>
                    )),
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('dateOfBirth', 'تاريخ الميلاد', { type: 'date', InputLabelProps: { shrink: true } })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('nationality', 'الجنسية *', {
                    select: true, children: NATIONALITIES.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>),
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('idNumber', 'رقم الهوية / الإقامة', {
                    InputProps: { startAdornment: <InputAdornment position="start"><IdIcon color="action" /></InputAdornment> },
                    inputProps: { maxLength: 10, dir: 'ltr' },
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('maritalStatus', 'الحالة الاجتماعية', {
                    select: true,
                    children: MARITAL_STATUS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>),
                  })}
                </Grid>
              </Grid>
            </Collapse>

            {/* Step 1: البيانات الوظيفية */}
            <Collapse in={activeStep === 1} unmountOnExit>
              <SectionHeader icon={<WorkIcon />} title="البيانات الوظيفية" subtitle="معلومات التوظيف والعقد" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="رقم الموظف" value={form.employeeNumber} disabled
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment>,
                      endAdornment: dialogMode === 'add' ? (
                        <InputAdornment position="end">
                          <Tooltip title="توليد رقم جديد">
                            <IconButton size="small" onClick={() => setField('employeeNumber', generateEmpNumber())}>
                              <RefreshIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : null,
                    }}
                    helperText="يتم توليده تلقائياً"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('department', 'القسم *', {
                    select: true,
                    children: DEPARTMENTS.map(d => (
                      <MenuItem key={d} value={d}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DEPT_COLORS[d] || '#607d8b' }} /> {d}
                        </Box>
                      </MenuItem>
                    )),
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {positionsList.length > 0 ? renderField('position', 'المنصب *', {
                    select: true, children: positionsList.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>),
                  }) : renderField('position', 'المنصب *')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('status', 'الحالة', {
                    select: true,
                    children: Object.entries(STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>),
                  })}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('joinDate', 'تاريخ التعيين *', { type: 'date', InputLabelProps: { shrink: true } })}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('contractType', 'نوع العقد', {
                    select: true,
                    children: CONTRACT_TYPES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>),
                  })}
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Collapse in={form.contractType !== 'permanent'}>
                    {renderField('contractEndDate', 'تاريخ انتهاء العقد', { type: 'date', InputLabelProps: { shrink: true } })}
                  </Collapse>
                </Grid>
              </Grid>
            </Collapse>

            {/* Step 2: معلومات التواصل */}
            <Collapse in={activeStep === 2} unmountOnExit>
              <SectionHeader icon={<ContactIcon />} title="معلومات التواصل" subtitle="بيانات الاتصال والطوارئ" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {renderField('phone', 'رقم الهاتف *', {
                    inputProps: { maxLength: 10, dir: 'ltr' }, placeholder: '05XXXXXXXX',
                    InputProps: { startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('email', 'البريد الإلكتروني', {
                    type: 'email', dir: 'ltr',
                    InputProps: { startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={8}>
                  {renderField('address', 'العنوان', {
                    InputProps: { startAdornment: <InputAdornment position="start"><HomeIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('city', 'المدينة', {
                    InputProps: { startAdornment: <InputAdornment position="start"><CityIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}><Chip label="جهة اتصال الطوارئ" size="small" icon={<EmergIcon />} /></Divider>
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('emergencyName', 'الاسم', {
                    InputProps: { startAdornment: <InputAdornment position="start"><EmergIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={4}>{renderField('emergencyRelation', 'صلة القرابة')}</Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('emergencyPhone', 'رقم الهاتف', {
                    inputProps: { maxLength: 10, dir: 'ltr' },
                    InputProps: { startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment> },
                  })}
                </Grid>
              </Grid>
            </Collapse>

            {/* Step 3: البيانات المالية */}
            <Collapse in={activeStep === 3} unmountOnExit>
              <SectionHeader icon={<BankIcon />} title="البيانات المالية" subtitle="معلومات الراتب والحساب البنكي" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {renderField('basicSalary', 'الراتب الأساسي *', {
                    type: 'number', InputProps: { endAdornment: <InputAdornment position="end">ر.س</InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('housingAllowance', 'بدل السكن', {
                    type: 'number', InputProps: { endAdornment: <InputAdornment position="end">ر.س</InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('transportAllowance', 'بدل النقل', {
                    type: 'number', InputProps: { endAdornment: <InputAdornment position="end">ر.س</InputAdornment> },
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('otherAllowance', 'بدلات أخرى', {
                    type: 'number', InputProps: { endAdornment: <InputAdornment position="end">ر.س</InputAdornment> },
                  })}
                </Grid>
                {(+form.basicSalary > 0) && (
                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'success.lighter' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={600} color="success.dark">إجمالي الراتب الشهري</Typography>
                        <Typography variant="h6" fontWeight={700} color="success.dark">
                          {((+form.basicSalary || 0) + (+form.housingAllowance || 0) +
                            (+form.transportAllowance || 0) + (+form.otherAllowance || 0)).toLocaleString('ar-SA')} ر.س
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}><Chip label="الحساب البنكي" size="small" icon={<BankIcon />} /></Divider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('bankName', 'اسم البنك', {
                    select: true, children: BANKS.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>),
                  })}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('iban', 'رقم الآيبان IBAN', {
                    inputProps: { maxLength: 24, dir: 'ltr', style: { letterSpacing: '1px' } },
                    placeholder: 'SA0000000000000000000000',
                  })}
                </Grid>
              </Grid>
            </Collapse>
          </DialogContent>

          {/* Actions: Next / Back / Save */}
          <Divider />
          <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
            <Box>{activeStep > 0 && <Button startIcon={<BackIcon />} onClick={handleBack}>السابق</Button>}</Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
              {activeStep < STEPS.length - 1 ? (
                <Button variant="contained" endIcon={<NextIcon />} onClick={handleNext}>التالي</Button>
              ) : (
                <Button variant="contained" startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave} disabled={saving}>
                  {dialogMode === 'edit' ? 'تحديث البيانات' : 'تسجيل الموظف'}
                </Button>
              )}
            </Box>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default EmployeeFormDialog;
