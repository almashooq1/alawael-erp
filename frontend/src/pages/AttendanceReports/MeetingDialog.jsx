import React from 'react';


const MeetingDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>تحديد موعد مقابلة</DialogTitle>
    <DialogContent sx={{ pt: 2 }}>
      <TextField fullWidth label="التاريخ" type="date" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>المعالج</InputLabel>
        <Select label="المعالج">
          <MenuItem value="therapist1">أ. فاطمة علي</MenuItem>
          <MenuItem value="therapist2">د. محمد إبراهيم</MenuItem>
        </Select>
      </FormControl>
      <TextField fullWidth label="الموضوع" multiline rows={3} />
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إلغاء</Button>
      <Button variant="contained" onClick={onClose}>تحديد الموعد</Button>
    </DialogActions>
  </Dialog>
);

export default React.memo(MeetingDialog);
