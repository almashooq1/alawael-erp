import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/students';
const token = localStorage.getItem('montessori_token');

const disabilityOptions = ['ذهنية', 'سمعية', 'حركية', 'توحد', 'بصرية', 'اضطرابات أخرى'];

export default function MontessoriStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [form, setForm] = useState({ fullName: '', birthDate: '', gender: '', disabilityTypes: [] });
  const [saving, setSaving] = useState(false);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      setError('فشل في جلب الطلاب');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleOpenDialog = (student = null) => {
    setEditStudent(student);
    setForm(student ? {
      fullName: student.fullName || '',
      birthDate: student.birthDate ? student.birthDate.slice(0, 10) : '',
      gender: student.gender || '',
      disabilityTypes: student.disabilityTypes || [],
    } : { fullName: '', birthDate: '', gender: '', disabilityTypes: [] });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditStudent(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editStudent ? 'PUT' : 'POST';
      const url = editStudent ? `${API}/${editStudent._id}` : API;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchStudents();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف الطالب؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchStudents();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">الطلاب</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة طالب</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم الكامل</TableCell>
              <TableCell>تاريخ الميلاد</TableCell>
              <TableCell>الجنس</TableCell>
              <TableCell>نوع الإعاقة</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {students.map(s => (
              <TableRow key={s._id}>
                <TableCell>{s.fullName}</TableCell>
                <TableCell>{s.birthDate ? s.birthDate.slice(0, 10) : ''}</TableCell>
                <TableCell>{s.gender}</TableCell>
                <TableCell>{(s.disabilityTypes || []).join(', ')}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(s)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(s._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="xs" fullWidth>
        <DialogTitle>{editStudent ? 'تعديل طالب' : 'إضافة طالب'}</DialogTitle>
        <DialogContent>
          <TextField
            label="الاسم الكامل"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="تاريخ الميلاد"
            type="date"
            value={form.birthDate}
            onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="الجنس"
            select
            value={form.gender}
            onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
            fullWidth
            margin="normal"
          >
            <MenuItem value="ذكر">ذكر</MenuItem>
            <MenuItem value="أنثى">أنثى</MenuItem>
          </TextField>
          <TextField
            label="نوع الإعاقة"
            select
            SelectProps={{ multiple: true }}
            value={form.disabilityTypes}
            onChange={e => setForm(f => ({ ...f, disabilityTypes: e.target.value }))}
            fullWidth
            margin="normal"
          >
            {disabilityOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
