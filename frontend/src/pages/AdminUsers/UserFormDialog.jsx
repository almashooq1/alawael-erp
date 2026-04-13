/**
 * UserFormDialog — Add / Edit user dialog
 * حوار إضافة أو تعديل مستخدم
 */




const UserFormDialog = ({ open, onClose, editingUser, formData, setFormData, onSave }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
    <DialogContent>
      <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          fullWidth
          label="الاسم الكامل"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          size="small"
        />
        <TextField
          fullWidth
          label="البريد الإلكتروني"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
          size="small"
        />
        <TextField
          fullWidth
          label="الهاتف"
          value={formData.phone}
          onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
          size="small"
        />
        <FormControl fullWidth size="small">
          <InputLabel>الدور</InputLabel>
          <Select
            label="الدور"
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
          >
            <MenuItem value="إدارة">إدارة</MenuItem>
            <MenuItem value="معالج">معالج</MenuItem>
            <MenuItem value="ولي أمر">ولي أمر</MenuItem>
            <MenuItem value="طالب">طالب</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>الحالة</InputLabel>
          <Select
            label="الحالة"
            value={formData.status}
            onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
          >
            <MenuItem value="نشط">نشط</MenuItem>
            <MenuItem value="معطل">معطل</MenuItem>
            <MenuItem value="قيد الانتظار">قيد الانتظار</MenuItem>
          </Select>
        </FormControl>
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>إلغاء</Button>
      <Button variant="contained" onClick={onSave}>
        حفظ
      </Button>
    </DialogActions>
  </Dialog>
);

export default UserFormDialog;
