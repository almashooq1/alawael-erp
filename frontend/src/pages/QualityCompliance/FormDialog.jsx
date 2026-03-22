import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Box, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { fieldSets, tabs } from './constants';

const FormDialog = ({ open, onClose, dialogType, editItem, form, setForm, onSave }) => (
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
            multiline={f.multiline}
            rows={f.multiline ? 3 : undefined}
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
            <MenuItem value="open">مفتوح</MenuItem>
            <MenuItem value="in-progress">قيد التنفيذ</MenuItem>
            <MenuItem value="resolved">تم الحل</MenuItem>
            <MenuItem value="closed">مغلق</MenuItem>
            <MenuItem value="compliant">ممتثل</MenuItem>
            <MenuItem value="non-compliant">غير ممتثل</MenuItem>
          </Select>
        </FormControl>
        {(dialogType === 'cases' || dialogType === 'tickets') && (
          <FormControl fullWidth>
            <InputLabel>الأولوية</InputLabel>
            <Select
              value={form.priority || ''}
              label="الأولوية"
              onChange={e => setForm({ ...form, priority: e.target.value })}
            >
              <MenuItem value="high">عالية</MenuItem>
              <MenuItem value="medium">متوسطة</MenuItem>
              <MenuItem value="low">منخفضة</MenuItem>
            </Select>
          </FormControl>
        )}
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

export default React.memo(FormDialog);
