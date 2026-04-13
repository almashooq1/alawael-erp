/**
 * الملاحظات وعدم المطابقة — Audit Findings
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress,
} from '@mui/material';
import { Add, Edit, Refresh } from '@mui/icons-material';
import { getFindings, createFinding, updateFinding } from '../../services/internalAudit.service';

const severityOptions = [
  { value: 'minor', label: 'طفيفة', color: 'info' },
  { value: 'major', label: 'رئيسية', color: 'warning' },
  { value: 'critical', label: 'حرجة', color: 'error' },
];

const statusOptions = [
  { value: 'open', label: 'مفتوحة', color: 'error' },
  { value: 'corrective_action', label: 'إجراء تصحيحي', color: 'warning' },
  { value: 'follow_up', label: 'متابعة', color: 'info' },
  { value: 'closed', label: 'مغلقة', color: 'success' },
];

const emptyForm = { title: '', titleAr: '', severity: 'minor', status: 'open', department: '', auditPlan: '', description: '' };

export default function AuditFindings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getFindings({ page: page + 1, limit: rowsPerPage });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (editId) await updateFinding(editId, form);
    else await createFinding(form);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({ title: row.title, titleAr: row.titleAr, severity: row.severity, status: row.status, department: row.department, auditPlan: row.auditPlan, description: row.description || '' });
    setEditId(row._id); setOpen(true);
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">الملاحظات وعدم المطابقة</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>إضافة ملاحظة</Button>
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
                  <TableCell>رقم الملاحظة</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>الخطورة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>خطة التدقيق</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.ncrId}</TableCell>
                    <TableCell>{r.titleAr || r.title}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>
                      <Chip size="small" label={severityOptions.find((o) => o.value === r.severity)?.label || r.severity} color={severityOptions.find((o) => o.value === r.severity)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>{r.auditPlan}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(r)}><Edit fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination component="div" count={-1} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }} labelRowsPerPage="عدد الصفوف:" />
          </>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل الملاحظة' : 'إضافة ملاحظة جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="العنوان (عربي)" value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} fullWidth />
          <TextField label="Title (English)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
          <TextField label="القسم" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          <TextField label="رقم خطة التدقيق" value={form.auditPlan} onChange={(e) => setForm({ ...form, auditPlan: e.target.value })} />
          <TextField select label="الخطورة" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {severityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="الوصف" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
