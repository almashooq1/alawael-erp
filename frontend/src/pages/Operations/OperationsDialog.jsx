/**
 * OperationsDialog — Create / Edit dialog for operations items
 */

import { DIALOG_FIELDS } from './constants';

const OperationsDialog = ({
  open, onClose, dialogType, editItem, form, setForm, onSave, tabs,
}) => {
  const fields = DIALOG_FIELDS[dialogType] || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editItem ? 'تعديل' : 'إضافة جديد'} - {tabs.find(t => t.key === dialogType)?.label}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {fields.map(f => (
            <TextField
              key={f.key}
              label={f.label}
              type={f.type || 'text'}
              value={form[f.key] || ''}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              fullWidth
              InputLabelProps={f.type === 'date' ? { shrink: true } : undefined}
            />
          ))}
          <FormControl fullWidth>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={form.status || ''}
              label="الحالة"
              onChange={e => setForm({ ...form, status: e.target.value })}
            >
              <MenuItem value="active">نشط</MenuItem>
              <MenuItem value="inactive">غير نشط</MenuItem>
              <MenuItem value="operational">تشغيلي</MenuItem>
              <MenuItem value="pending">معلق</MenuItem>
              <MenuItem value="completed">مكتمل</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={onSave}>
          {editItem ? 'تحديث' : 'إنشاء'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default OperationsDialog;
