/**
 * SystemAdminDialog.jsx — Create/Edit dialog
 * Extracted from SystemAdmin.js
 */


import { FIELD_SETS } from './systemAdmin.constants';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField
} from '@mui/material';

const SystemAdminDialog = ({
  dialogOpen,
  setDialogOpen,
  dialogType,
  editItem,
  form,
  setForm,
  handleSave,
  tabs,
}) => (
  <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
    <DialogTitle>
      {editItem ? 'تعديل' : 'إضافة جديد'} - {tabs.find(t => t.key === dialogType)?.label}
    </DialogTitle>
    <DialogContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {(FIELD_SETS[dialogType] || []).map(f => (
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
            <MenuItem value="pending">معلق</MenuItem>
            <MenuItem value="approved">معتمد</MenuItem>
            <MenuItem value="rejected">مرفوض</MenuItem>
            <MenuItem value="in-stock">متوفر</MenuItem>
            <MenuItem value="low-stock">مخزون منخفض</MenuItem>
            <MenuItem value="out-of-stock">نفاد</MenuItem>
            <MenuItem value="published">منشور</MenuItem>
            <MenuItem value="draft">مسودة</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
      <Button variant="contained" onClick={handleSave}>
        {editItem ? 'تحديث' : 'إنشاء'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default SystemAdminDialog;
