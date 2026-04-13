/**
 * سجل الأصول — Assets List
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
import { getAssets, createAsset, updateAsset, deleteAsset } from '../../services/assetManagement.service';

const categoryOptions = [
  { value: 'vehicles', label: 'مركبات' },
  { value: 'office', label: 'معدات مكتبية' },
  { value: 'equipment', label: 'أجهزة' },
  { value: 'property', label: 'عقارات' },
  { value: 'other', label: 'أخرى' },
];

const statusOptions = [
  { value: 'active', label: 'نشط', color: 'success' },
  { value: 'inactive', label: 'غير نشط', color: 'default' },
  { value: 'maintenance', label: 'صيانة', color: 'warning' },
  { value: 'disposed', label: 'مستبعد', color: 'error' },
];

const emptyForm = { name: '', category: 'equipment', status: 'active', value: 0, location: '', depreciationRate: 0.1 };

export default function AssetsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getAssets({ page: page + 1, limit: rowsPerPage });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rowsPerPage]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (editId) await updateAsset(editId, form);
    else await createAsset(form);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({ name: row.name, category: row.category, status: row.status, value: row.value, location: row.location, depreciationRate: row.depreciationRate || 0.1 });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteAsset(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">سجل الأصول</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>إضافة أصل</Button>
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
                  <TableCell>الاسم</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>الموقع</TableCell>
                  <TableCell>القيمة (ر.س)</TableCell>
                  <TableCell>نسبة الإهلاك</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{categoryOptions.find((o) => o.value === r.category)?.label || r.category}</TableCell>
                    <TableCell>{r.location}</TableCell>
                    <TableCell>{(r.value || 0).toLocaleString()}</TableCell>
                    <TableCell>{((r.depreciationRate || 0) * 100).toFixed(0)}%</TableCell>
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
            <TablePagination component="div" count={-1} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0); }} labelRowsPerPage="عدد الصفوف:" />
          </>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'تعديل الأصل' : 'إضافة أصل جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="اسم الأصل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
          <TextField select label="الفئة" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categoryOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="الموقع" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <TextField label="القيمة (ر.س)" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: +e.target.value })} />
          <TextField label="نسبة الإهلاك (0-1)" type="number" inputProps={{ step: 0.05, min: 0, max: 1 }} value={form.depreciationRate} onChange={(e) => setForm({ ...form, depreciationRate: +e.target.value })} />
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
