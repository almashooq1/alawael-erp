/**
 * قائمة الوظائف الشاغرة — Job Postings List
 */
import { useState, useEffect, useCallback } from 'react';


import { getJobs, createJob, updateJob, deleteJob } from '../../services/recruitment.service';

const typeOptions = [
  { value: 'full_time', label: 'دوام كامل' }, { value: 'part_time', label: 'دوام جزئي' },
  { value: 'contract', label: 'عقد' }, { value: 'temporary', label: 'مؤقت' },
  { value: 'internship', label: 'تدريب' },
];

const levelOptions = [
  { value: 'entry', label: 'مبتدئ' }, { value: 'junior', label: 'صغير' },
  { value: 'mid', label: 'متوسط' }, { value: 'senior', label: 'أول' },
  { value: 'lead', label: 'قائد فريق' }, { value: 'manager', label: 'مدير' },
  { value: 'director', label: 'مدير إدارة' }, { value: 'executive', label: 'تنفيذي' },
];

const statusOptions = [
  { value: 'draft', label: 'مسودة', color: 'default' },
  { value: 'open', label: 'مفتوحة', color: 'success' },
  { value: 'on_hold', label: 'معلقة', color: 'warning' },
  { value: 'closed', label: 'مغلقة', color: 'error' },
  { value: 'filled', label: 'مكتملة', color: 'info' },
  { value: 'cancelled', label: 'ملغاة', color: 'error' },
];

const emptyForm = { titleAr: '', department: '', type: 'full_time', level: 'mid', positions: 1, status: 'draft' };

export default function JobPostingsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getJobs({ page: page + 1, limit: rpp });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rpp]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const payload = { title: { ar: form.titleAr }, department: form.department, type: form.type, level: form.level, positions: Number(form.positions), status: form.status };
    if (editId) await updateJob(editId, payload);
    else await createJob(payload);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({
      titleAr: row.title?.ar || '', department: row.department || '',
      type: row.type || 'full_time', level: row.level || 'mid',
      positions: row.positions || 1, status: row.status || 'draft',
    });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteJob(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">الوظائف الشاغرة</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>وظيفة جديدة</Button>
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
                  <TableCell>رقم الوظيفة</TableCell>
                  <TableCell>المسمى</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المستوى</TableCell>
                  <TableCell>الشواغر</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>عدد المتقدمين</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.jobNumber}</TableCell>
                    <TableCell>{r.title?.ar || r.title}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{typeOptions.find((o) => o.value === r.type)?.label || r.type}</TableCell>
                    <TableCell>{levelOptions.find((o) => o.value === r.level)?.label || r.level}</TableCell>
                    <TableCell>{r.positions}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>{r.applicationsCount || 0}</TableCell>
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
        <DialogTitle>{editId ? 'تعديل الوظيفة' : 'وظيفة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="المسمى الوظيفي (عربي)" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth required />
          <TextField label="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} fullWidth />
          <TextField select label="نوع الدوام" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="المستوى" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            {levelOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="عدد الشواغر" type="number" value={form.positions} onChange={(e) => setForm({ ...form, positions: e.target.value })} />
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
