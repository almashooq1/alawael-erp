import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/parents';
const studentsAPI = '/api/montessori/students';
const token = localStorage.getItem('montessori_token');

export default function MontessoriParents() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editParent, setEditParent] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', student: '' });
  const [saving, setSaving] = useState(false);

  const fetchParents = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setParents(data);
    } catch (err) {
      setError('فشل في جلب أولياء الأمور');
    } finally {
      setLoading(false);
    }
  };
  const fetchStudents = async () => {
    try {
      const res = await fetch(studentsAPI, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setStudents(data);
    } catch {}
  };
  useEffect(() => { fetchParents(); fetchStudents(); }, []);

  const handleOpenDialog = (parent = null) => {
    setEditParent(parent);
    setForm(parent ? {
      name: parent.name || '',
      phone: parent.phone || '',
      email: parent.email || '',
      student: parent.student?._id || ''
    } : { name: '', phone: '', email: '', student: '' });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditParent(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editParent ? 'PUT' : 'POST';
      const url = editParent ? `${API}/${editParent._id}` : API;
      const body = { ...form };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchParents();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف ولي الأمر؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchParents();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">أولياء الأمور</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة ولي أمر</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الهاتف</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell>الطالب</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {parents.map(p => (
              <TableRow key={p._id}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.phone}</TableCell>
                <TableCell>{p.email}</TableCell>
                <TableCell>{p.student?.fullName}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(p)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(p._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editParent ? 'تعديل ولي أمر' : 'إضافة ولي أمر'}</DialogTitle>
        <DialogContent>
          <TextField
            label="الاسم"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="الهاتف"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="البريد الإلكتروني"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="الطالب"
            select
            value={form.student}
            onChange={e => setForm(f => ({ ...f, student: e.target.value }))}
            fullWidth
            margin="normal"
          >
            {students.map(s => <MenuItem key={s._id} value={s._id}>{s.fullName}</MenuItem>)}
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
