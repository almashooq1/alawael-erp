/**
 * قائمة العقود — Contracts List
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  TablePagination, Button, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, CircularProgress,
} from '@mui/material';
import { Add, Edit, Delete, Refresh, Autorenew } from '@mui/icons-material';
import { getContracts, createContract, updateContract, deleteContract, renewContract } from '../../services/contractManagement.service';

const typeOptions = [
  { value: 'SERVICE_AGREEMENT', label: 'عقد خدمات' },
  { value: 'SUPPLY_AGREEMENT', label: 'عقد توريد' },
  { value: 'MAINTENANCE_AGREEMENT', label: 'عقد صيانة' },
  { value: 'FRAMEWORK_AGREEMENT', label: 'عقد إطاري' },
  { value: 'ONE_TIME_PURCHASE', label: 'شراء لمرة واحدة' },
  { value: 'DISTRIBUTION_AGREEMENT', label: 'عقد توزيع' },
];

const statusOptions = [
  { value: 'DRAFT', label: 'مسودة', color: 'default' },
  { value: 'ACTIVE', label: 'نشط', color: 'success' },
  { value: 'EXPIRED', label: 'منتهي', color: 'error' },
  { value: 'TERMINATED', label: 'ملغي', color: 'error' },
  { value: 'SUSPENDED', label: 'معلق', color: 'warning' },
];

const emptyForm = { contractTitle: '', contractType: 'SERVICE_AGREEMENT', status: 'DRAFT', startDate: '', endDate: '', supplierName: '', estimatedAnnualValue: '' };

export default function ContractsList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rpp, setRpp] = useState(10);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getContracts({ page: page + 1, limit: rpp });
    setRows(r.data || []);
    setLoading(false);
  }, [page, rpp]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const payload = {
      contractTitle: form.contractTitle,
      contractType: form.contractType,
      status: form.status,
      startDate: form.startDate,
      endDate: form.endDate,
      supplier: { supplierName: form.supplierName },
      contractValue: { estimatedAnnualValue: form.estimatedAnnualValue ? Number(form.estimatedAnnualValue) : 0 },
    };
    if (editId) await updateContract(editId, payload);
    else await createContract(payload);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({
      contractTitle: row.contractTitle || '',
      contractType: row.contractType || 'SERVICE_AGREEMENT',
      status: row.status || 'DRAFT',
      startDate: row.startDate?.substring(0, 10) || '',
      endDate: row.endDate?.substring(0, 10) || '',
      supplierName: row.supplier?.supplierName || '',
      estimatedAnnualValue: row.contractValue?.estimatedAnnualValue || '',
    });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteContract(id); load(); };
  const handleRenew = async (id) => { await renewContract(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">العقود</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>عقد جديد</Button>
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
                  <TableCell>رقم العقد</TableCell>
                  <TableCell>عنوان العقد</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المورد</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>القيمة السنوية</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.contractNumber}</TableCell>
                    <TableCell>{r.contractTitle}</TableCell>
                    <TableCell>{typeOptions.find((o) => o.value === r.contractType)?.label || r.contractType}</TableCell>
                    <TableCell>{r.supplier?.supplierName}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>{(r.contractValue?.estimatedAnnualValue || 0).toLocaleString()} ر.س</TableCell>
                    <TableCell>{r.startDate ? new Date(r.startDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell>{r.endDate ? new Date(r.endDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => handleEdit(r)}><Edit fontSize="small" /></IconButton>
                      <IconButton size="small" color="info" title="تجديد" onClick={() => handleRenew(r._id)}><Autorenew fontSize="small" /></IconButton>
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
        <DialogTitle>{editId ? 'تعديل العقد' : 'عقد جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="عنوان العقد" value={form.contractTitle} onChange={(e) => setForm({ ...form, contractTitle: e.target.value })} fullWidth required />
          <TextField select label="النوع" value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })}>
            {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="اسم المورد" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
          <TextField label="القيمة السنوية (ر.س)" type="number" value={form.estimatedAnnualValue} onChange={(e) => setForm({ ...form, estimatedAnnualValue: e.target.value })} />
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
