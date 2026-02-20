import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, CircularProgress, Alert } from '@mui/material';
import { Delete as DeleteIcon, CloudUpload as CloudUploadIcon, Download as DownloadIcon } from '@mui/icons-material';

const API = '/api/montessori/media';
const studentsAPI = '/api/montessori/students';
const token = localStorage.getItem('montessori_token');

export default function MontessoriMedia() {
  const [media, setMedia] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ student: '', title: '', type: 'image', file: null });
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMedia(data);
    } catch (err) {
      setError('فشل في جلب الوسائط');
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
  useEffect(() => { fetchMedia(); fetchStudents(); }, []);

  const handleOpenDialog = () => {
    setForm({ student: '', title: '', type: 'image', file: null });
    setDialogOpen(true);
  };
  const handleCloseDialog = () => { setDialogOpen(false); };

  const handleFileChange = e => {
    setForm(f => ({ ...f, file: e.target.files[0] }));
  };

  const handleSave = async () => {
    if (!form.file) { setError('يجب اختيار ملف'); return; }
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('student', form.student);
      formData.append('title', form.title);
      formData.append('type', form.type);
      formData.append('file', form.file);
      const res = await fetch(API, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) throw new Error('فشل الحفظ');
      await fetchMedia();
      handleCloseDialog();
    } catch {
      setError('فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('تأكيد حذف الملف؟')) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      await fetchMedia();
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
      a.download = 'media-file';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('فشل تحميل الملف');
    }
  };

  return (
    <Box mt={4}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">الوسائط</Typography>
        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={handleOpenDialog}>رفع ملف</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading ? <CircularProgress /> : (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>الطالب</TableCell>
              <TableCell>العنوان</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>اسم الملف</TableCell>
              <TableCell>إجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {media.map(m => (
              <TableRow key={m._id}>
                <TableCell>{m.student?.fullName}</TableCell>
                <TableCell>{m.title}</TableCell>
                <TableCell>{m.type}</TableCell>
                <TableCell>{m.filename}</TableCell>
                <TableCell>
                  <IconButton color="error" onClick={() => handleDelete(m._id)}><DeleteIcon /></IconButton>
                  <IconButton color="secondary" onClick={() => handleDownload(m._id)}><DownloadIcon /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>رفع ملف وسائط</DialogTitle>
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
            label="النوع"
            select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            fullWidth
            margin="normal"
          >
            <MenuItem value="image">صورة</MenuItem>
            <MenuItem value="video">فيديو</MenuItem>
            <MenuItem value="audio">صوت</MenuItem>
            <MenuItem value="document">مستند</MenuItem>
          </TextField>
          <Button variant="outlined" component="label" fullWidth sx={{ mt: 2 }} startIcon={<CloudUploadIcon />}>
            اختر ملف
            <input type="file" hidden onChange={handleFileChange} ref={fileInputRef} />
          </Button>
          {form.file && <Typography mt={1}>الملف المختار: {form.file.name}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
