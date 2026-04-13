/**
 * CompensationFormDialog — Multi-section form for create/edit structure
 */

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, Paper, Box, Typography, TextField, Button, MenuItem,
  IconButton, Switch, FormControlLabel, Chip, CircularProgress, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Business as StructureIcon,
} from '@mui/icons-material';
import { SCOPE_LABELS, FORM_SECTIONS } from './compensationConstants';

const CompensationFormDialog = ({
  open,
  editingId,
  formData,
  setFormData,
  formSection,
  setFormSection,
  loading,
  onSubmit,
  onClose,
  updateAllowance,
  addAllowance,
  removeAllowance,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box display="flex" alignItems="center" gap={1}>
        <StructureIcon color="primary" /> {editingId ? 'تحرير الهيكل' : 'إضافة هيكل جديد'}
      </Box>
      <IconButton onClick={onClose}><CloseIcon /></IconButton>
    </DialogTitle>
    <Divider />

    {/* Section Tabs */}
    <Box sx={{ px: 3, pt: 2 }}>
      <Box display="flex" gap={1} flexWrap="wrap">
        {FORM_SECTIONS.map((label, idx) => (
          <Chip key={idx} label={label} clickable onClick={() => setFormSection(idx)}
            color={formSection === idx ? 'primary' : 'default'}
            variant={formSection === idx ? 'filled' : 'outlined'} />
        ))}
      </Box>
    </Box>

    <DialogContent sx={{ pt: 3 }}>
      {/* Section 0: Basic Info */}
      {formSection === 0 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField fullWidth label="اسم الهيكل *" value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })} required />
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth label="الوصف" multiline rows={2} value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="تاريخ البدء الفعلي" type="date" value={formData.effectiveDate}
              onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })}
              InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={6}>
            <FormControlLabel control={
              <Switch checked={formData.isActive}
                onChange={e => setFormData({ ...formData, isActive: e.target.checked })} />
            } label="نشط" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth select label="النطاق" value={formData.applicableTo.scope}
              onChange={e => setFormData({
                ...formData, applicableTo: { ...formData.applicableTo, scope: e.target.value }
              })}>
              {Object.entries(SCOPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="الراتب الأدنى" type="number"
              value={formData.applicableTo.salaryRange.min}
              onChange={e => setFormData({
                ...formData, applicableTo: {
                  ...formData.applicableTo, salaryRange: { ...formData.applicableTo.salaryRange, min: +e.target.value }
                }
              })} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="الراتب الأقصى" type="number"
              value={formData.applicableTo.salaryRange.max}
              onChange={e => setFormData({
                ...formData, applicableTo: {
                  ...formData.applicableTo, salaryRange: { ...formData.applicableTo.salaryRange, max: +e.target.value }
                }
              })} />
          </Grid>
        </Grid>
      )}

      {/* Section 1: Fixed Allowances */}
      {formSection === 1 && (
        <Box>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>المزايا الثابتة</Typography>
          {formData.fixedAllowances.map((al, idx) => (
            <Box key={idx} display="flex" gap={2} alignItems="center" sx={{ mb: 1.5 }}>
              <TextField size="small" label="اسم المزية" value={al.name}
                onChange={e => updateAllowance(idx, 'name', e.target.value)} sx={{ flex: 2 }} />
              <TextField size="small" label="المبلغ (ريال)" type="number" value={al.amount}
                onChange={e => updateAllowance(idx, 'amount', e.target.value)} sx={{ flex: 1 }} />
              {formData.fixedAllowances.length > 1 && (
                <IconButton color="error" onClick={() => removeAllowance(idx)}><DeleteIcon /></IconButton>
              )}
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addAllowance} sx={{ mt: 1 }}>إضافة مزية</Button>
        </Box>
      )}

      {/* Section 2: Incentive Structure */}
      {formSection === 2 && (
        <Grid container spacing={2}>
          {[
            { key: 'performance', label: 'حافز الأداء', field: 'percentage', unit: '%', extra: 'minScore' },
            { key: 'attendance', label: 'حافز الحضور', field: 'amount', unit: 'ر.س' },
            { key: 'safety', label: 'حافز السلامة', field: 'amount', unit: 'ر.س' },
            { key: 'loyalty', label: 'حافز الولاء', field: 'percentage', unit: '%', extra: 'yearsRequired' },
            { key: 'project', label: 'حافز المشروع', field: 'amount', unit: 'ر.س' },
            { key: 'seasonal', label: 'حافز موسمي', field: 'amount', unit: 'ر.س' },
          ].map(item => (
            <Grid item xs={12} sm={6} key={item.key}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>{item.label}</Typography>
                <TextField size="small" fullWidth label={`القيمة (${item.unit})`} type="number"
                  value={formData.incentiveStructure[item.key]?.[item.field] || 0}
                  onChange={e => setFormData({
                    ...formData, incentiveStructure: {
                      ...formData.incentiveStructure, [item.key]: {
                        ...formData.incentiveStructure[item.key], [item.field]: +e.target.value,
                      }
                    }
                  })} sx={{ mb: item.extra ? 1 : 0 }} />
                {item.extra && (
                  <TextField size="small" fullWidth
                    label={item.extra === 'minScore' ? 'الحد الأدنى للدرجة' : 'سنوات الخدمة المطلوبة'}
                    type="number"
                    value={formData.incentiveStructure[item.key]?.[item.extra] || 0}
                    onChange={e => setFormData({
                      ...formData, incentiveStructure: {
                        ...formData.incentiveStructure, [item.key]: {
                          ...formData.incentiveStructure[item.key], [item.extra]: +e.target.value,
                        }
                      }
                    })} />
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Section 3: Deductions & Leave */}
      {formSection === 3 && (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>الخصومات الإلزامية</Typography>
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth label="الضمان الاجتماعي (%)" type="number" inputProps={{ step: 0.1 }}
              value={formData.mandatoryDeductions.socialSecurity.percentage}
              onChange={e => setFormData({
                ...formData, mandatoryDeductions: {
                  ...formData.mandatoryDeductions, socialSecurity: {
                    ...formData.mandatoryDeductions.socialSecurity, percentage: +e.target.value,
                  }
                }
              })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth label="التأمين الصحي (%)" type="number" inputProps={{ step: 0.1 }}
              value={formData.mandatoryDeductions.healthInsurance.percentage}
              onChange={e => setFormData({
                ...formData, mandatoryDeductions: {
                  ...formData.mandatoryDeductions, healthInsurance: {
                    ...formData.mandatoryDeductions.healthInsurance, percentage: +e.target.value,
                  }
                }
              })} />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth label="GOSI (%)" type="number" inputProps={{ step: 0.1 }}
              value={formData.mandatoryDeductions.GOSI.percentage}
              onChange={e => setFormData({
                ...formData, mandatoryDeductions: {
                  ...formData.mandatoryDeductions, GOSI: {
                    ...formData.mandatoryDeductions.GOSI, percentage: +e.target.value,
                  }
                }
              })} />
          </Grid>
          <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>الإجازات المأجورة</Typography>
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="أيام الإجازة السنوية" type="number"
              value={formData.paidLeave.annualDays}
              onChange={e => setFormData({
                ...formData, paidLeave: { ...formData.paidLeave, annualDays: +e.target.value }
              })} />
          </Grid>
          <Grid item xs={6}>
            <TextField fullWidth label="الاستحقاق الشهري (أيام)" type="number" inputProps={{ step: 0.1 }}
              value={formData.paidLeave.accruedPerMonth}
              onChange={e => setFormData({
                ...formData, paidLeave: { ...formData.paidLeave, accruedPerMonth: +e.target.value }
              })} />
          </Grid>
        </Grid>
      )}
    </DialogContent>

    <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
      <Box display="flex" gap={1}>
        {formSection > 0 && (
          <Button onClick={() => setFormSection(s => s - 1)}>السابق</Button>
        )}
      </Box>
      <Box display="flex" gap={1}>
        <Button onClick={onClose}>إلغاء</Button>
        {formSection < FORM_SECTIONS.length - 1 ? (
          <Button variant="contained" onClick={() => setFormSection(s => s + 1)}>التالي</Button>
        ) : (
          <Button variant="contained" color="primary" onClick={onSubmit}
            disabled={loading} startIcon={loading ? <CircularProgress size={18} /> : <SaveIcon />}>
            {editingId ? 'تحديث' : 'حفظ'}
          </Button>
        )}
      </Box>
    </DialogActions>
  </Dialog>
);

export default CompensationFormDialog;
