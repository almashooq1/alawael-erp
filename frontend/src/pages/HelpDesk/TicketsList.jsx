/**
 * قائمة التذاكر — Tickets List
 */
import { useState, useEffect, useCallback } from 'react';


import { getTickets, createTicket, updateTicket, deleteTicket } from '../../services/helpdesk.service';

const categoryOptions = [
  { value: 'hardware', label: 'أجهزة' }, { value: 'software', label: 'برمجيات' },
  { value: 'network', label: 'شبكة' }, { value: 'access', label: 'صلاحيات' },
  { value: 'email', label: 'بريد إلكتروني' }, { value: 'printer', label: 'طابعة' },
  { value: 'security', label: 'أمان' }, { value: 'general', label: 'عام' }, { value: 'other', label: 'أخرى' },
];

const priorityOptions = [
  { value: 'low', label: 'منخفض', color: 'success' }, { value: 'medium', label: 'متوسط', color: 'info' },
  { value: 'high', label: 'مرتفع', color: 'warning' }, { value: 'critical', label: 'حرج', color: 'error' },
];

const statusOptions = [
  { value: 'open', label: 'مفتوح', color: 'error' }, { value: 'assigned', label: 'معيّن', color: 'info' },
  { value: 'in_progress', label: 'قيد التنفيذ', color: 'warning' }, { value: 'pending', label: 'معلق', color: 'default' },
  { value: 'resolved', label: 'محلول', color: 'success' }, { value: 'closed', label: 'مغلق', color: 'success' },
];

const emptyForm = { titleAr: '', description: '', category: 'general', priority: 'medium', status: 'open', requesterDepartment: '' };

export default function TicketsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getTickets({ page: page + 1, limit: rpp });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rpp]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (editId) await updateTicket(editId, form);
    else await createTicket(form);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({ titleAr: row.titleAr, description: row.description || '', category: row.category, priority: row.priority, status: row.status, requesterDepartment: row.requesterDepartment || '' });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteTicket(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">التذاكر</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>تذكرة جديدة</Button>
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
                  <TableCell>الفئة</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.ticketNumber}</TableCell>
                    <TableCell>{r.titleAr}</TableCell>
                    <TableCell>{categoryOptions.find((o) => o.value === r.category)?.label || r.category}</TableCell>
                    <TableCell>{r.requesterDepartment}</TableCell>
                    <TableCell>
                      <Chip size="small" label={priorityOptions.find((o) => o.value === r.priority)?.label || r.priority} color={priorityOptions.find((o) => o.value === r.priority)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
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
        <DialogTitle>{editId ? 'تعديل التذكرة' : 'تذكرة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="العنوان" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth />
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
          <TextField label="القسم الطالب" value={form.requesterDepartment} onChange={(e) => setForm({ ...form, requesterDepartment: e.target.value })} />
          <TextField select label="الفئة" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categoryOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {priorityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
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
