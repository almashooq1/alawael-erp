import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/team';
const token = localStorage.getItem('montessori_token');

export default function MontessoriTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ name: '', role: '', specialization: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTeam(data);
    } catch (err) {
      setError('فشل في جلب الفريق');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchTeam(); }, []);

  const handleOpenDialog = (member = null) => {
    setEditMember(member);
    setForm(member ? {
      name: member.name || '',
      role: member.role || '',
      specialization: member.specialization || '',
      phone: member.phone || '',
      email: member.email || ''
    } : { name: '', role: '', specialization: '', phone: '', email: '' });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditMember(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editMember ? 'PUT' : 'POST';
      const url = editMember ? `${API}/${editMember._id}` : API;
      const body = { ...form };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchTeam();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف العضو؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchTeam();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">فريق العمل</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة عضو</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الاسم</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>التخصص</TableCell>
              <TableCell>الهاتف</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {team.map(m => (
              <TableRow key={m._id}>
                <TableCell>{m.name}</TableCell>
                <TableCell>{m.role}</TableCell>
                <TableCell>{m.specialization}</TableCell>
                <TableCell>{m.phone}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(m)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(m._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editMember ? 'تعديل عضو' : 'إضافة عضو'}</DialogTitle>
        <DialogContent>
          <TextField
            label="الاسم"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="الدور"
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="التخصص"
            value={form.specialization}
            onChange={e => setForm(f => ({ ...f, specialization: e.target.value }))}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
