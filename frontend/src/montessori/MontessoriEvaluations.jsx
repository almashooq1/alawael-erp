import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/evaluations';
const studentsAPI = '/api/montessori/students';
const sessionsAPI = '/api/montessori/sessions';
const token = localStorage.getItem('montessori_token');

export default function MontessoriEvaluations() {
  const [evaluations, setEvaluations] = useState([]);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editEval, setEditEval] = useState(null);
  const [form, setForm] = useState({ student: '', session: '', date: '', summary: '', score: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEvaluations(data);
    } catch (err) {
      setError('فشل في جلب التقييمات');
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
  const fetchSessions = async () => {
    try {
      const res = await fetch(sessionsAPI, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data);
    } catch {}
  };
  useEffect(() => { fetchEvaluations(); fetchStudents(); fetchSessions(); }, []);

  const handleOpenDialog = (ev = null) => {
    setEditEval(ev);
    setForm(ev ? {
      student: ev.student?._id || '',
      session: ev.session?._id || '',
      date: ev.date ? ev.date.slice(0,10) : '',
      summary: ev.summary || '',
      score: ev.score || '',
      notes: ev.notes || ''
    } : { student: '', session: '', date: '', summary: '', score: '', notes: '' });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditEval(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editEval ? 'PUT' : 'POST';
      const url = editEval ? `${API}/${editEval._id}` : API;
      const body = { ...form };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchEvaluations();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف التقييم؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchEvaluations();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">التقييمات</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة تقييم</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>الجلسة</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الملخص</TableCell>
              <TableCell>الدرجة</TableCell>
              <TableCell>ملاحظات</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evaluations.map(ev => (
              <TableRow key={ev._id}>
                <TableCell>{ev.student?.fullName}</TableCell>
                <TableCell>{ev.session?.date ? ev.session.date.slice(0,10) : ''}</TableCell>
                <TableCell>{ev.date ? ev.date.slice(0,10) : ''}</TableCell>
                <TableCell>{ev.summary}</TableCell>
                <TableCell>{ev.score}</TableCell>
                <TableCell>{ev.notes}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(ev)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(ev._id)}><DeleteIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editEval ? 'تعديل تقييم' : 'إضافة تقييم'}</DialogTitle>
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
            label="الجلسة"
            select
            value={form.session}
            onChange={e => setForm(f => ({ ...f, session: e.target.value }))}
            fullWidth
            margin="normal"
          >
            {sessions.map(sess => <MenuItem key={sess._id} value={sess._id}>{sess.date ? sess.date.slice(0,10) : ''} - {sess.student?.fullName}</MenuItem>)}
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
            label="الملخص"
            value={form.summary}
            onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="الدرجة"
            value={form.score}
            onChange={e => setForm(f => ({ ...f, score: e.target.value }))}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
