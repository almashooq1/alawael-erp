/**
 * FleetFormDialog.jsx — Create / Edit dialog for all fleet entity types
 * حوار إضافة / تعديل كيانات الأسطول
 */


import { TABS } from './fleetManagement.constants';

const FleetFormDialog = ({ dialogOpen, setDialogOpen, dialogType, editItem, form, setForm, handleSave }) => (
  <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
    <DialogTitle>
      {editItem ? 'تعديل' : 'إضافة جديد'} - {TABS.find(t => t.key === dialogType)?.label}
    </DialogTitle>
    <DialogContent>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {dialogType === 'drivers' && (
          <>
            <TextField label="الاسم" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="رقم الرخصة" value={form.licenseNumber || ''} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} fullWidth />
            <TextField label="الهاتف" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>الحالة</InputLabel>
              <Select value={form.status || ''} label="الحالة" onChange={e => setForm({ ...form, status: e.target.value })}>
                <MenuItem value="active">نشط</MenuItem>
                <MenuItem value="inactive">غير نشط</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
        {dialogType === 'vehicles' && (
          <>
            <TextField label="رقم اللوحة" value={form.plateNumber || ''} onChange={e => setForm({ ...form, plateNumber: e.target.value })} fullWidth />
            <TextField label="الشركة المصنعة" value={form.make || ''} onChange={e => setForm({ ...form, make: e.target.value })} fullWidth />
            <TextField label="الموديل" value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} fullWidth />
            <TextField label="سنة الصنع" type="number" value={form.year || ''} onChange={e => setForm({ ...form, year: e.target.value })} fullWidth />
            <FormControl fullWidth>
              <InputLabel>نوع الوقود</InputLabel>
              <Select value={form.fuelType || ''} label="نوع الوقود" onChange={e => setForm({ ...form, fuelType: e.target.value })}>
                <MenuItem value="بنزين">بنزين</MenuItem>
                <MenuItem value="ديزل">ديزل</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
        {dialogType === 'trips' && (
          <>
            <TextField label="نقطة الانطلاق" value={form.origin || ''} onChange={e => setForm({ ...form, origin: e.target.value })} fullWidth />
            <TextField label="الوجهة" value={form.destination || ''} onChange={e => setForm({ ...form, destination: e.target.value })} fullWidth />
            <TextField label="السائق" value={form.driver || ''} onChange={e => setForm({ ...form, driver: e.target.value })} fullWidth />
            <TextField label="المركبة" value={form.vehicle || ''} onChange={e => setForm({ ...form, vehicle: e.target.value })} fullWidth />
            <TextField label="التاريخ" type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
          </>
        )}
        {dialogType === 'routes' && (
          <>
            <TextField label="اسم المسار" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="نقطة البداية" value={form.origin || ''} onChange={e => setForm({ ...form, origin: e.target.value })} fullWidth />
            <TextField label="نقطة النهاية" value={form.destination || ''} onChange={e => setForm({ ...form, destination: e.target.value })} fullWidth />
            <TextField label="المسافة" value={form.distance || ''} onChange={e => setForm({ ...form, distance: e.target.value })} fullWidth />
          </>
        )}
        {dialogType === 'accidents' && (
          <>
            <TextField label="التاريخ" type="date" value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="الموقع" value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} fullWidth />
            <TextField label="السائق" value={form.driver || ''} onChange={e => setForm({ ...form, driver: e.target.value })} fullWidth />
            <TextField label="الوصف" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
            <FormControl fullWidth>
              <InputLabel>الخطورة</InputLabel>
              <Select value={form.severity || ''} label="الخطورة" onChange={e => setForm({ ...form, severity: e.target.value })}>
                <MenuItem value="بسيط">بسيط</MenuItem>
                <MenuItem value="متوسط">متوسط</MenuItem>
                <MenuItem value="خطير">خطير</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </Box>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
      <Button variant="contained" onClick={handleSave}>{editItem ? 'تحديث' : 'إنشاء'}</Button>
    </DialogActions>
  </Dialog>
);

export default FleetFormDialog;
