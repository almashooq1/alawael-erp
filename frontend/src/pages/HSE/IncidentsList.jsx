/**
 * قائمة الحوادث — Incidents List
 */
import { useState, useEffect, useCallback } from 'react';


import { getIncidents, createIncident, updateIncident, deleteIncident } from '../../services/hse.service';

const typeOptions = [
  { value: 'injury', label: 'إصابة' }, { value: 'near_miss', label: 'حادثة قريبة' },
  { value: 'property_damage', label: 'تلف ممتلكات' }, { value: 'environmental', label: 'بيئية' },
  { value: 'fire', label: 'حريق' }, { value: 'chemical', label: 'كيميائية' },
  { value: 'electrical', label: 'كهربائية' }, { value: 'fall', label: 'سقوط' },
  { value: 'vehicle', label: 'مركبات' }, { value: 'other', label: 'أخرى' },
];

const severityOptions = [
  { value: 'minor', label: 'بسيط', color: 'success' }, { value: 'moderate', label: 'متوسط', color: 'info' },
  { value: 'serious', label: 'خطير', color: 'warning' }, { value: 'critical', label: 'حرج', color: 'error' },
  { value: 'fatal', label: 'مميت', color: 'error' },
];

const statusOptions = [
  { value: 'reported', label: 'مُبلغ', color: 'error' }, { value: 'under_investigation', label: 'تحقيق', color: 'warning' },
  { value: 'corrective_action', label: 'إجراء تصحيحي', color: 'info' }, { value: 'closed', label: 'مغلق', color: 'success' },
];

const emptyForm = {
  titleAr: '', description: '', incidentType: 'other', severity: 'minor',
  status: 'reported', location: '', department: '', incidentDate: new Date().toISOString().slice(0, 10),
};

export default function IncidentsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getIncidents({ page: page + 1, limit: rpp });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rpp]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (editId) await updateIncident(editId, form);
    else await createIncident(form);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({
      titleAr: row.titleAr, description: row.description || '', incidentType: row.incidentType,
      severity: row.severity, status: row.status, location: row.location || '',
      department: row.department || '', incidentDate: row.incidentDate ? row.incidentDate.slice(0, 10) : '',
    });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteIncident(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">الحوادث والسلامة</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>حادثة جديدة</Button>
        </Box>
      </Box>

      <Paper>
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الرقم</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>الموقع</TableCell>
                  <TableCell>الخطورة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.incidentNumber}</TableCell>
                    <TableCell>{r.titleAr}</TableCell>
                    <TableCell>{typeOptions.find((o) => o.value === r.incidentType)?.label || r.incidentType}</TableCell>
                    <TableCell>{r.location}</TableCell>
                    <TableCell>
                      <Chip size="small" label={severityOptions.find((o) => o.value === r.severity)?.label || r.severity} color={severityOptions.find((o) => o.value === r.severity)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>{r.incidentDate ? new Date(r.incidentDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(r)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(r._id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={-1} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rpp} onRowsPerPageChange={(e) => { setRpp(+e.target.value); setPage(0); }} labelRowsPerPage="عدد الصفوف:" />
          </>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل الحادثة' : 'حادثة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth />
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
          <TextField label="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <TextField label="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <TextField label="تاريخ الحادثة" type="date" value={form.incidentDate} onChange={(e) => setForm({ ...form, incidentDate: e.target.value })} InputLabelProps={{ shrink: true }} />
          <TextField select label="النوع" value={form.incidentType} onChange={(e) => setForm({ ...form, incidentType: e.target.value })}>
            {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الخطورة" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {severityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
