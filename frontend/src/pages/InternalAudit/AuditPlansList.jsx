/**
 * خطط التدقيق — Audit Plans List
 */
import { useState, useEffect, useCallback } from 'react';


import { getAuditPlans, createAuditPlan, updateAuditPlan, deleteAuditPlan } from '../../services/internalAudit.service';

const statusOptions = [
  { value: 'draft', label: 'مسودة' },
  { value: 'approved', label: 'معتمدة' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'cancelled', label: 'ملغاة' },
];

const riskOptions = [
  { value: 'low', label: 'منخفض', color: 'success' },
  { value: 'medium', label: 'متوسط', color: 'warning' },
  { value: 'high', label: 'مرتفع', color: 'error' },
];

const statusColors = { draft: 'default', approved: 'info', in_progress: 'warning', completed: 'success', cancelled: 'error' };

const emptyForm = { title: '', titleAr: '', year: new Date().getFullYear(), department: '', status: 'draft', riskLevel: 'medium' };

export default function AuditPlansList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getAuditPlans({ page: page + 1, limit: rowsPerPage });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (editId) await updateAuditPlan(editId, form);
    else await createAuditPlan(form);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({ title: row.title, titleAr: row.titleAr, year: row.year, department: row.department, status: row.status, riskLevel: row.riskLevel || 'medium' });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteAuditPlan(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">خطط التدقيق</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>إضافة خطة</Button>
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
                  <TableCell>رقم الخطة</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>السنة</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>مستوى المخاطر</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.planId}</TableCell>
                    <TableCell>{r.titleAr || r.title}</TableCell>
                    <TableCell>{r.year}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>
                      <Chip size="small" label={riskOptions.find((o) => o.value === r.riskLevel)?.label || r.riskLevel} color={riskOptions.find((o) => o.value === r.riskLevel)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusColors[r.status] || 'default'} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(r)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(r._id)}><Delete fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={-1} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }} labelRowsPerPage="عدد الصفوف:" />
          </>
        )}
      </Paper>

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل خطة التدقيق' : 'إضافة خطة تدقيق جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="العنوان (عربي)" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth />
          <TextField label="Title (English)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
          <TextField label="السنة" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: +e.target.value })} />
          <TextField label="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <TextField select label="مستوى المخاطر" value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}>
            {riskOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
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
