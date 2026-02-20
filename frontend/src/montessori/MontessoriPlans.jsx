import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert, Chip } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';

const API = '/api/montessori/plans';
const studentsAPI = '/api/montessori/students';
const token = localStorage.getItem('montessori_token');

export default function MontessoriPlans() {
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [form, setForm] = useState({ student: '', goals: [] });
  const [goal, setGoal] = useState({ area: '', objective: '', activities: '', targetDate: '' });
  const [saving, setSaving] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPlans(data);
    } catch (err) {
      setError('فشل في جلب الخطط');
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
  useEffect(() => { fetchPlans(); fetchStudents(); }, []);

  const handleOpenDialog = (plan = null) => {
    setEditPlan(plan);
    setForm(plan ? {
      student: plan.student?._id || '',
      goals: plan.goals.map(g => ({ ...g, activities: (g.activities || []).join(', ') }))
    } : { student: '', goals: [] });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditPlan(null); setGoal({ area: '', objective: '', activities: '', targetDate: '' }); };

  const handleAddGoal = () => {
    if (!goal.area || !goal.objective) return;
    setForm(f => ({ ...f, goals: [...f.goals, { ...goal }] }));
    setGoal({ area: '', objective: '', activities: '', targetDate: '' });
  };
  const handleRemoveGoal = idx => {
    setForm(f => ({ ...f, goals: f.goals.filter((_, i) => i !== idx) }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editPlan ? 'PUT' : 'POST';
      const url = editPlan ? `${API}/${editPlan._id}` : API;
      const body = {
        ...form,
        goals: form.goals.map(g => ({ ...g, activities: g.activities.split(',').map(a => a.trim()).filter(Boolean) }))
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchPlans();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف الخطة؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchPlans();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">الخطط الفردية</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة خطة</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>الأهداف</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map(p => (
              <TableRow key={p._id}>
                <TableCell>{p.student?.fullName}</TableCell>
                <TableCell>
                  {(p.goals || []).map((g, i) => (
                    <Box key={i} mb={1}>
                      <Chip label={g.area} size="small" sx={{ mr: 1 }} />
                      <b>{g.objective}</b>
                      <span style={{ color: '#888', marginRight: 8 }}>{g.activities?.join(', ')}</span>
                      {g.achieved && <Chip label="منجز" color="success" size="small" />}
                    </Box>
                  ))}
                </TableCell>
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
        <DialogTitle>{editPlan ? 'تعديل خطة' : 'إضافة خطة'}</DialogTitle>
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
          <Box mt={2} mb={1}>
            <Typography fontWeight={600}>الأهداف</Typography>
            {(form.goals || []).map((g, i) => (
              <Box key={i} display="flex" alignItems="center" gap={1} mb={1}>
                <Chip label={g.area} size="small" />
                <span>{g.objective}</span>
                <span style={{ color: '#888' }}>{g.activities}</span>
                <IconButton size="small" color="error" onClick={() => handleRemoveGoal(i)}><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            ))}
            <Box display="flex" gap={1} mt={1}>
              <TextField label="المجال" value={goal.area} onChange={e => setGoal(g => ({ ...g, area: e.target.value }))} size="small" />
              <TextField label="الهدف" value={goal.objective} onChange={e => setGoal(g => ({ ...g, objective: e.target.value }))} size="small" />
              <TextField label="الأنشطة (مفصولة بفاصلة)" value={goal.activities} onChange={e => setGoal(g => ({ ...g, activities: e.target.value }))} size="small" />
              <TextField label="تاريخ مستهدف" type="date" value={goal.targetDate} onChange={e => setGoal(g => ({ ...g, targetDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} />
              <Button onClick={handleAddGoal} variant="outlined" size="small">إضافة</Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
