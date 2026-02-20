import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/activities';
const studentsAPI = '/api/montessori/students';
const plansAPI = '/api/montessori/plans';
const token = localStorage.getItem('montessori_token');

export default function MontessoriActivities() {
  const [activities, setActivities] = useState([]);
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editActivity, setEditActivity] = useState(null);
  const [form, setForm] = useState({ student: '', plan: '', name: '', area: '', description: '', date: '' });
  const [saving, setSaving] = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setActivities(data);
    } catch (err) {
      setError('فشل في جلب الأنشطة');
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
  const fetchPlans = async () => {
    try {
      const res = await fetch(plansAPI, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPlans(data);
    } catch {}
  };
  useEffect(() => { fetchActivities(); fetchStudents(); fetchPlans(); }, []);

  const handleOpenDialog = (activity = null) => {
    setEditActivity(activity);
    setForm(activity ? {
      student: activity.student?._id || '',
      plan: activity.plan?._id || '',
      name: activity.name || '',
      area: activity.area || '',
      description: activity.description || '',
      date: activity.date ? activity.date.slice(0,10) : ''
    } : { student: '', plan: '', name: '', area: '', description: '', date: '' });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditActivity(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editActivity ? 'PUT' : 'POST';
      const url = editActivity ? `${API}/${editActivity._id}` : API;
      const body = { ...form };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchActivities();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف النشاط؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchActivities();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">الأنشطة</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة نشاط</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>الخطة</TableCell>
              <TableCell>النشاط</TableCell>
              <TableCell>المجال</TableCell>
              <TableCell>الوصف</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.map(a => (
              <TableRow key={a._id}>
                <TableCell>{a.student?.fullName}</TableCell>
                <TableCell>{a.plan?.goals?.map(g => g.area).join(', ')}</TableCell>
                <TableCell>{a.name}</TableCell>
                <TableCell>{a.area}</TableCell>
                <TableCell>{a.description}</TableCell>
                <TableCell>{a.date ? a.date.slice(0,10) : ''}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(a)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(a._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editActivity ? 'تعديل نشاط' : 'إضافة نشاط'}</DialogTitle>
        <DialogContent>
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
          <TextField
            label="الخطة"
            select
            value={form.plan}
            onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
            fullWidth
            margin="normal"
          >
            {plans.map(p => <MenuItem key={p._id} value={p._id}>{p.student?.fullName + ' - ' + (p.goals?.map(g => g.area).join(', ') || '')}</MenuItem>)}
          </TextField>
          <TextField
            label="النشاط"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="المجال"
            value={form.area}
            onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="الوصف"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="التاريخ"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
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
