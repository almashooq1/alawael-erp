import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Download as DownloadIcon } from '@mui/icons-material';

const API = '/api/montessori/reports';
const studentsAPI = '/api/montessori/students';
const token = localStorage.getItem('montessori_token');

export default function MontessoriReports() {
  const [reports, setReports] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReport, setEditReport] = useState(null);
  const [form, setForm] = useState({ student: '', title: '', content: '', date: '' });
  const [saving, setSaving] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setReports(data);
    } catch (err) {
      setError('فشل في جلب التقارير');
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
  useEffect(() => { fetchReports(); fetchStudents(); }, []);

  const handleOpenDialog = (report = null) => {
    setEditReport(report);
    setForm(report ? {
      student: report.student?._id || '',
      title: report.title || '',
      content: report.content || '',
      date: report.date ? report.date.slice(0,10) : ''
    } : { student: '', title: '', content: '', date: '' });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); setEditReport(null); };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const method = editReport ? 'PUT' : 'POST';
      const url = editReport ? `${API}/${editReport._id}` : API;
      const body = { ...form };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchReports();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف التقرير؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchReports();
    } catch {
      setError('فشل الحذف');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async id => {
    try {
      const res = await fetch(`${API}/${id}/download`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report.pdf';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('فشل تحميل التقرير');
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">التقارير</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>إضافة تقرير</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>العنوان</TableCell>
              <TableCell>المحتوى</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reports.map(r => (
              <TableRow key={r._id}>
                <TableCell>{r.student?.fullName}</TableCell>
                <TableCell>{r.title}</TableCell>
                <TableCell>{r.content?.slice(0, 40)}{r.content?.length > 40 ? '...' : ''}</TableCell>
                <TableCell>{r.date ? r.date.slice(0,10) : ''}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenDialog(r)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleDelete(r._id)}><DeleteIcon /></IconButton>
                  <IconButton color="secondary" onClick={() => handleDownload(r._id)}><DownloadIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editReport ? 'تعديل تقرير' : 'إضافة تقرير'}</DialogTitle>
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
            label="العنوان"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            fullWidth
            margin="normal"
          />
          <TextField
            label="المحتوى"
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            fullWidth
            margin="normal"
            multiline
            minRows={3}
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
