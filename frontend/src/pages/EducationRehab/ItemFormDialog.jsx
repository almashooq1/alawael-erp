/**
 * ItemFormDialog – create / edit dialog for all EducationRehab entities.
 */
import React from 'react';


import { fieldSets, tabs } from './constants';

const ItemFormDialog = ({ open, onClose, dialogType, editItem, form, setForm, onSave }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>
      {editItem ? 'تعديل' : 'إضافة جديد'} - {tabs.find(t => t.key === dialogType)?.label}
    </DialogTitle>
    <DialogContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {(fieldSets[dialogType] || []).map(f => (
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
            <MenuItem value="published">منشور</MenuItem>
            <MenuItem value="draft">مسودة</MenuItem>
            <MenuItem value="in-progress">قيد التنفيذ</MenuItem>
            <MenuItem value="planned">مخطط</MenuItem>
            <MenuItem value="completed">مكتمل</MenuItem>
            <MenuItem value="archived">مؤرشف</MenuItem>
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

export default React.memo(ItemFormDialog);
