/**
 * FleetFormDialog.jsx
 * نافذة إضافة/تعديل عناصر الأسطول
 */



// ─── Field definitions per dialog type ──────────────────────
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography
} from '@mui/material';
const FIELD_DEFS = {
  vehicles: [
    { key: 'name', label: 'اسم المركبة', type: 'text', required: true },
    { key: 'plate', label: 'رقم اللوحة', type: 'text', required: true },
    {
      key: 'type',
      label: 'النوع',
      type: 'select',
      options: [
        { value: 'شاحنة خفيفة', label: 'شاحنة خفيفة' },
        { value: 'شاحنة', label: 'شاحنة' },
        { value: 'دفع رباعي', label: 'دفع رباعي' },
        { value: 'فان', label: 'فان' },
        { value: 'سيدان', label: 'سيدان' },
      ],
    },
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'غير نشط' },
        { value: 'maintenance', label: 'صيانة' },
      ],
    },
    { key: 'km', label: 'الكيلومترات', type: 'number' },
  ],
  drivers: [
    { key: 'name', label: 'اسم السائق', type: 'text', required: true },
    { key: 'license', label: 'رقم الرخصة', type: 'text', required: true },
    { key: 'phone', label: 'رقم الهاتف', type: 'text' },
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      options: [
        { value: 'active', label: 'نشط' },
        { value: 'on_leave', label: 'في إجازة' },
        { value: 'inactive', label: 'غير نشط' },
      ],
    },
    { key: 'vehicle', label: 'المركبة المخصصة', type: 'text' },
  ],
  maintenance: [
    { key: 'vehicle', label: 'المركبة', type: 'text', required: true },
    { key: 'type', label: 'نوع الصيانة', type: 'text', required: true },
    { key: 'date', label: 'التاريخ', type: 'date' },
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      options: [
        { value: 'pending', label: 'قيد الانتظار' },
        { value: 'completed', label: 'مكتمل' },
      ],
    },
    { key: 'cost', label: 'التكلفة (ر.س)', type: 'number' },
  ],
  fuel: [
    { key: 'vehicle', label: 'المركبة', type: 'text', required: true },
    { key: 'liters', label: 'اللترات', type: 'number', required: true },
    { key: 'cost', label: 'التكلفة (ر.س)', type: 'number' },
    { key: 'date', label: 'التاريخ', type: 'date' },
    { key: 'station', label: 'المحطة', type: 'text' },
  ],
};

const DIALOG_TITLES = {
  vehicles: 'مركبة',
  drivers: 'سائق',
  maintenance: 'طلب صيانة',
  fuel: 'سجل وقود',
};

const FleetFormDialog = ({
  dialogOpen,
  setDialogOpen,
  dialogType,
  editItem,
  form,
  setForm,
  handleSave,
}) => {
  const fields = FIELD_DEFS[dialogType] || [];
  const title = editItem
    ? `تعديل ${DIALOG_TITLES[dialogType] || ''}`
    : `إضافة ${DIALOG_TITLES[dialogType] || ''} جديد`;

  const handleChange = (key) => (e) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = () => setDialogOpen(false);

  return (
    <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ fontWeight: 'bold', bgcolor: 'grey.50' }}>
        <Typography variant="h6" component="span" fontWeight="bold">
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid item xs={12} sm={6} key={field.key}>
              {field.type === 'select' ? (
                <TextField
                  select
                  fullWidth
                  label={field.label}
                  value={form[field.key] ?? ''}
                  onChange={handleChange(field.key)}
                  required={!!field.required}
                  size="small"
                >
                  {(field.options || []).map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  fullWidth
                  label={field.label}
                  type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                  value={form[field.key] ?? ''}
                  onChange={handleChange(field.key)}
                  required={!!field.required}
                  size="small"
                  InputLabelProps={field.type === 'date' ? { shrink: true } : undefined}
                />
              )}
            </Grid>
          ))}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          إلغاء
        </Button>
        <Button onClick={handleSave} variant="contained">
          {editItem ? 'حفظ التعديلات' : 'إضافة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FleetFormDialog;
