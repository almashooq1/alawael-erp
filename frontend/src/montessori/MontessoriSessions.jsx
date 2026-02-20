import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/sessions';
const studentsAPI = '/api/montessori/students';
const plansAPI = '/api/montessori/plans';
const token = localStorage.getItem('montessori_token');

export default function MontessoriSessions() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [form, setForm] = useState({ student: '', plan: '', date: '', notes: '', activities: '', evaluation: '' });
  const [saving, setSaving] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      setError('فشل في جلب الجلسات');
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
  useEffect(() => { fetchSessions(); fetchStudents(); fetchPlans(); }, []);

  const handleOpenDialog = (session = null) => {
    setEditSession(session);
    setForm(session ? {
      student: session.student?._id || '',
      plan: session.plan?._id || '',
      date: session.date ? session.date.slice(0,10) : '',
      notes: session.notes || '',
      activities: (session.activities || []).join(', '),
      evaluation: session.evaluation || ''
    } : { student: '', plan: '', date: '', notes: '', activities: '', evaluation: '' });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditSession(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editSession ? 'PUT' : 'POST';
      const url = editSession ? `${API}/${editSession._id}` : API;
      const body = {
        ...form,
        activities: form.activities.split(',').map(a => a.trim()).filter(Boolean)
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchSessions();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف الجلسة؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchSessions();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">الجلسات</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة جلسة</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>الخطة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الأنشطة</TableCell>
              <TableCell>ملاحظات</TableCell>
              <TableCell>تقييم</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sessions.map(s => (
              <TableRow key={s._id}>
                <TableCell>{s.student?.fullName}</TableCell>
                <TableCell>{s.plan?.goals?.map(g => g.area).join(', ')}</TableCell>
                <TableCell>{s.date ? s.date.slice(0,10) : ''}</TableCell>
                <TableCell>{(s.activities || []).join(', ')}</TableCell>
                <TableCell>{s.notes}</TableCell>
                <TableCell>{s.evaluation}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(s)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(s._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editSession ? 'تعديل جلسة' : 'إضافة جلسة'}</DialogTitle>
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
            label="التاريخ"
            type="date"
            value={form.date}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="الأنشطة (مفصولة بفاصلة)"
            value={form.activities}
            onChange={e => setForm(f => ({ ...f, activities: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="ملاحظات"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="تقييم الجلسة"
            value={form.evaluation}
            onChange={e => setForm(f => ({ ...f, evaluation: e.target.value }))}
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
