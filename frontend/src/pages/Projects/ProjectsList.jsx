/**
 * قائمة المشاريع — Projects List
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { getProjects, createProject, updateProject, deleteProject } from '../../services/projectManagement.service';

const statusOptions = [
  { value: 'active', label: 'نشط', color: 'primary' },
  { value: 'completed', label: 'مكتمل', color: 'success' },
  { value: 'on_hold', label: 'معلق', color: 'warning' },
];

const priorityOptions = [
  { value: 'low', label: 'منخفض', color: 'success' },
  { value: 'medium', label: 'متوسط', color: 'info' },
  { value: 'high', label: 'مرتفع', color: 'warning' },
  { value: 'critical', label: 'حرج', color: 'error' },
];

const emptyForm = { name: '', description: '', status: 'active', priority: 'medium', budget: '', startDate: '', endDate: '' };

export default function ProjectsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getProjects({ page: page + 1, limit: rpp });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rpp]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const payload = { ...form, budget: form.budget ? Number(form.budget) : undefined };
    if (editId) await updateProject(editId, payload);
    else await createProject(payload);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({
      name: row.name || '', description: row.description || '',
      status: row.status || 'active', priority: row.priority || 'medium',
      budget: row.budget || '', startDate: row.startDate?.substring(0, 10) || '',
      endDate: row.endDate?.substring(0, 10) || '',
    });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteProject(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">المشاريع</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>مشروع جديد</Button>
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
                  <TableCell>اسم المشروع</TableCell>
                  <TableCell>الأولوية</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الميزانية</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={priorityOptions.find((o) => o.value === r.priority)?.label || r.priority} color={priorityOptions.find((o) => o.value === r.priority)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>{(r.budget || 0).toLocaleString()} ر.س</TableCell>
                    <TableCell>{r.startDate ? new Date(r.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell>{r.endDate ? new Date(r.endDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
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
        <DialogTitle>{editId ? 'تعديل المشروع' : 'مشروع جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="اسم المشروع" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth required />
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} fullWidth />
          <TextField select label="الأولوية" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {priorityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="الميزانية (ر.س)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <TextField label="تاريخ البدء" type="date" InputLabelProps={{ shrink: true }} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <TextField label="تاريخ الانتهاء" type="date" InputLabelProps={{ shrink: true }} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
