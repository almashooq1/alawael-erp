/**
 * PerformanceDialog.jsx — Create/Edit dialog
 * Extracted from PerformanceEvaluation.js
 */


import { RATING_CONFIG, FIELD_SETS } from './performanceEvaluation.constants';

const PerformanceDialog = ({
  dialogOpen,
  setDialogOpen,
  dialogType,
  editItem,
  form,
  setForm,
  handleSave,
  tabs,
}) => (
  <Dialog
    open={dialogOpen}
    onClose={() => setDialogOpen(false)}
    maxWidth="sm"
    fullWidth
    PaperProps={{ sx: { borderRadius: 3 } }}
  >
    <DialogTitle sx={{ fontWeight: 'bold' }}>
      {editItem ? 'تعديل' : 'إضافة جديد'} — {tabs.find(t => t.key === dialogType)?.label}
    </DialogTitle>
    <DialogContent dividers>
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
            <MenuItem value="completed">مكتمل</MenuItem>
            <MenuItem value="pending">معلق</MenuItem>
            <MenuItem value="draft">مسودة</MenuItem>
          </Select>
        </FormControl>
        {dialogType === 'evaluations' && (
          <FormControl fullWidth>
            <InputLabel>التقييم</InputLabel>
            <Select
              value={form.rating || ''}
              label="التقييم"
              onChange={e => setForm({ ...form, rating: e.target.value })}
            >
              {Object.entries(RATING_CONFIG).map(([k, v]) => (
                <MenuItem key={k} value={k}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: v.color }}
                    />
                    {v.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
      <Button variant="contained" onClick={handleSave} sx={{ borderRadius: 2 }}>
        {editItem ? 'تحديث' : 'إنشاء'}
      </Button>
    </DialogActions>
  </Dialog>
);

export default PerformanceDialog;
