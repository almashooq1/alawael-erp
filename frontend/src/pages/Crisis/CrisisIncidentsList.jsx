/**
 * قائمة حوادث الأزمات — Crisis Incidents List
 */
import { useState, useEffect, useCallback } from 'react';

import { getIncidents, createIncident, updateIncident, deleteIncident } from '../../services/crisisManagement.service';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import Add from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import Delete from '@mui/icons-material/Delete';

const typeOptions = [
  { value: 'fire', label: 'حريق' }, { value: 'earthquake', label: 'زلزال' },
  { value: 'flood', label: 'فيضان' }, { value: 'medical', label: 'طبي' },
  { value: 'security', label: 'أمني' }, { value: 'power_outage', label: 'انقطاع كهرباء' },
  { value: 'pandemic', label: 'وباء' }, { value: 'evacuation', label: 'إخلاء' },
  { value: 'chemical', label: 'كيميائي' }, { value: 'structural', label: 'هيكلي' },
  { value: 'other', label: 'أخرى' },
];

const severityOptions = [
  { value: 'minor', label: 'بسيط', color: 'success' },
  { value: 'moderate', label: 'متوسط', color: 'warning' },
  { value: 'major', label: 'كبير', color: 'error' },
  { value: 'critical', label: 'حرج', color: 'error' },
];

const statusOptions = [
  { value: 'reported', label: 'مبلغ', color: 'error' },
  { value: 'acknowledged', label: 'تم الاستلام', color: 'info' },
  { value: 'in_progress', label: 'قيد المعالجة', color: 'warning' },
  { value: 'contained', label: 'محتوى', color: 'primary' },
  { value: 'resolved', label: 'محلول', color: 'success' },
  { value: 'closed', label: 'مغلق', color: 'success' },
];

const emptyForm = { title: '', type: 'fire', severity: 'minor', status: 'reported', building: '', floor: '' };

export default function CrisisIncidentsList() {
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
    const payload = { title: form.title, type: form.type, severity: form.severity, status: form.status, location: { building: form.building, floor: form.floor } };
    if (editId) await updateIncident(editId, payload);
    else await createIncident(payload);
    setOpen(false); setForm(emptyForm); setEditId(null); load();
  };

  const handleEdit = (row) => {
    setForm({
      title: row.title || '', type: row.type || 'fire',
      severity: row.severity || 'minor', status: row.status || 'reported',
      building: row.location?.building || '', floor: row.location?.floor || '',
    });
    setEditId(row._id); setOpen(true);
  };

  const handleDelete = async (id) => { await deleteIncident(id); load(); };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">حوادث الأزمات</Typography>
        <Box>
          <Button startIcon={<Refresh />} onClick={load} sx={{ mr: 1 }}>تحديث</Button>
          <Button variant="contained" startIcon={<Add />} color="error" onClick={() => { setForm(emptyForm); setEditId(null); setOpen(true); }}>تسجيل حادث</Button>
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
                  <TableCell>الخطورة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>المبنى</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r._id} hover>
                    <TableCell>{r.incidentNumber}</TableCell>
                    <TableCell>{r.title}</TableCell>
                    <TableCell>{typeOptions.find((o) => o.value === r.type)?.label || r.type}</TableCell>
                    <TableCell>
                      <Chip size="small" label={severityOptions.find((o) => o.value === r.severity)?.label || r.severity} color={severityOptions.find((o) => o.value === r.severity)?.color || 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusOptions.find((o) => o.value === r.status)?.label || r.status} color={statusOptions.find((o) => o.value === r.status)?.color || 'default'} />
                    </TableCell>
                    <TableCell>{r.location?.building || '—'}</TableCell>
                    <TableCell>{r.reportedAt ? new Date(r.reportedAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
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
        <DialogTitle>{editId ? 'تعديل الحادث' : 'تسجيل حادث جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="عنوان الحادث" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth required />
          <TextField select label="النوع" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {typeOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الخطورة" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {severityOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select label="الحالة" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {statusOptions.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField label="المبنى" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} />
          <TextField label="الطابق" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
