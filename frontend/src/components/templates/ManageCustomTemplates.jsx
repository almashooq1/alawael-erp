import React, { useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, IconButton, Typography, Paper } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import templatesService from '../../../services/templatesService';
import axios from 'axios';

const languages = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

export default function ManageCustomTemplates({ open, onClose, templates, setTemplates }) {
  const [newTpl, setNewTpl] = useState({ title: '', description: '', body: '', keywords: '', language: 'ar', attachments: [] });
  const [editIdx, setEditIdx] = useState(-1);
  const [editTpl, setEditTpl] = useState({ title: '', description: '', body: '', keywords: '', language: 'ar', attachments: [] });
  const [saving, setSaving] = useState(false);

  // رفع ملف مرفق
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/templates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewTpl(t => ({ ...t, attachments: [...(t.attachments || []), res.data] }));
    }
  };

  const handleRemoveAttachment = idx => {
    setNewTpl(t => ({ ...t, attachments: t.attachments.filter((_, i) => i !== idx) }));
  };

  const handleAdd = async () => {
    if (!newTpl.title || !newTpl.body) return;
    setSaving(true);
    await templatesService.create({
      ...newTpl,
      category: 'custom',
      keywords: newTpl.keywords ? newTpl.keywords.split(',').map(k => k.trim()) : [],
      language: newTpl.language || 'ar',
      attachments: newTpl.attachments || [],
    });
    setNewTpl({ title: '', description: '', body: '', keywords: '', language: 'ar', attachments: [] });
    setSaving(false);
    setTemplates();
  };
  const handleDelete = async idx => {
    setSaving(true);
    await templatesService.remove(templates[idx]._id);
    setSaving(false);
    setTemplates();
  };
  const handleEdit = idx => {
    setEditIdx(idx);
    // keywords: array to string, language fallback, attachments fallback
    setEditTpl({
      ...templates[idx],
      keywords: Array.isArray(templates[idx].keywords) ? templates[idx].keywords.join(', ') : (templates[idx].keywords || ''),
      language: templates[idx].language || 'ar',
      attachments: Array.isArray(templates[idx].attachments) ? templates[idx].attachments : [],
    });
  };

  // رفع مرفقات جديدة أثناء التعديل
  const handleEditFiles = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post('/api/templates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditTpl(t => ({ ...t, attachments: [...(t.attachments || []), res.data] }));
    }
  };
  const handleRemoveEditAttachment = idx => {
    setEditTpl(t => ({ ...t, attachments: t.attachments.filter((_, i) => i !== idx) }));
  };
  const handleEditSave = async () => {
    if (!editTpl.title || !editTpl.body) return;
    setSaving(true);
    await templatesService.update(editTpl._id, {
      ...editTpl,
      keywords: editTpl.keywords ? editTpl.keywords.split(',').map(k => k.trim()) : [],
      language: editTpl.language || 'ar',
      attachments: editTpl.attachments || [],
    });
    setEditIdx(-1);
    setEditTpl({ title: '', description: '', body: '', keywords: '', language: 'ar', attachments: [] });
    setSaving(false);
    setTemplates();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>إدارة القوالب المخصصة</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" mb={1}>إضافة قالب جديد:</Typography>
        <Box display="flex" gap={2} mb={2} flexWrap="wrap">
          <TextField label="العنوان" value={newTpl.title} onChange={e => setNewTpl(t => ({ ...t, title: e.target.value }))} size="small" />
          <TextField label="الوصف" value={newTpl.description} onChange={e => setNewTpl(t => ({ ...t, description: e.target.value }))} size="small" />
          <TextField label="الكلمات المفتاحية (مفصولة بفاصلة)" value={newTpl.keywords} onChange={e => setNewTpl(t => ({ ...t, keywords: e.target.value }))} size="small" sx={{ minWidth: 180 }} />
          <TextField select label="اللغة" value={newTpl.language} onChange={e => setNewTpl(t => ({ ...t, language: e.target.value }))} size="small" sx={{ minWidth: 120 }}>
            {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </TextField>
        </Box>
        <Box mb={2}>
          <Typography fontSize={14} mb={0.5}>النص/المحتوى:</Typography>
          <ReactQuill
            value={newTpl.body}
            onChange={val => setNewTpl(t => ({ ...t, body: val }))}
            modules={{
              toolbar: {
                container: [
                  [{ 'header': [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'color': [] }, { 'background': [] }],
                  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                  ['link', 'image', 'video'],
                  ['clean']
                ],
                handlers: {
                  image: function () {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.onchange = async () => {
                      const file = input.files[0];
                      const formData = new FormData();
                      formData.append('file', file);
                      const res = await axios.post('/api/templates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                      const quill = this.quill;
                      const range = quill.getSelection();
                      quill.insertEmbed(range.index, 'image', res.data.url);
                    };
                    input.click();
                  }
                }
              }
            }}
            style={{ background: '#fff', borderRadius: 8 }}
            theme="snow"
          />
        </Box>
        {/* واجهة رفع المرفقات */}
        <Box mb={2}>
          <Typography fontSize={14} mb={0.5}>المرفقات:</Typography>
          <Button variant="outlined" component="label" size="small">
            إضافة مرفقات
            <input type="file" multiple hidden onChange={handleFiles} />
          </Button>
          <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
            {(newTpl.attachments || []).map((att, idx) => (
              <Box key={idx} display="flex" alignItems="center" gap={1}>
                <a href={att.url} target="_blank" rel="noopener noreferrer">{att.name}</a>
                <Typography color="text.secondary" fontSize={12}>{att.type}</Typography>
                <Button color="error" size="small" onClick={() => handleRemoveAttachment(idx)}>حذف</Button>
              </Box>
            ))}
          </Box>
        </Box>
        <Typography variant="subtitle2" mb={1}>قوالبك الحالية:</Typography>
        {templates.length === 0 && <Typography color="text.secondary">لا توجد قوالب مخصصة بعد.</Typography>}
        {templates.map((tpl, i) => (
          <Paper key={tpl._id || i} sx={{ p: 2, mb: 1, position: 'relative' }}>
            {editIdx === i ? (
              <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                <TextField label="العنوان" value={editTpl.title} onChange={e => setEditTpl(t => ({ ...t, title: e.target.value }))} size="small" />
                <TextField label="الوصف" value={editTpl.description} onChange={e => setEditTpl(t => ({ ...t, description: e.target.value }))} size="small" />
                <TextField label="الكلمات المفتاحية (مفصولة بفاصلة)" value={editTpl.keywords} onChange={e => setEditTpl(t => ({ ...t, keywords: e.target.value }))} size="small" sx={{ minWidth: 180 }} />
                <TextField select label="اللغة" value={editTpl.language} onChange={e => setEditTpl(t => ({ ...t, language: e.target.value }))} size="small" sx={{ minWidth: 120 }}>
                  {languages.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </TextField>
                <Box width="100%" mb={2}>
                  <Typography fontSize={14} mb={0.5}>النص/المحتوى:</Typography>
                  <ReactQuill
                    value={editTpl.body}
                    onChange={val => setEditTpl(t => ({ ...t, body: val }))}
                    modules={{
                      toolbar: {
                        container: [
                          [{ 'header': [1, 2, 3, false] }],
                          ['bold', 'italic', 'underline', 'strike'],
                          [{ 'color': [] }, { 'background': [] }],
                          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                          ['link', 'image', 'video'],
                          ['clean']
                        ],
                        handlers: {
                          image: function () {
                            const input = document.createElement('input');
                            input.setAttribute('type', 'file');
                            input.setAttribute('accept', 'image/*');
                            input.onchange = async () => {
                              const file = input.files[0];
                              const formData = new FormData();
                              formData.append('file', file);
                              const res = await axios.post('/api/templates/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                              const quill = this.quill;
                              const range = quill.getSelection();
                              quill.insertEmbed(range.index, 'image', res.data.url);
                            };
                            input.click();
                          }
                        }
                      }
                    }}
                    style={{ background: '#fff', borderRadius: 8 }}
                    theme="snow"
                  />
                </Box>
                <Button variant="contained" color="success" onClick={handleEditSave} disabled={saving}>حفظ</Button>
                <Button onClick={() => setEditIdx(-1)} disabled={saving}>إلغاء</Button>
                {/* واجهة رفع المرفقات للتعديل */}
                <Box width="100%" mt={1}>
                  <Button variant="outlined" component="label" size="small">
                    إضافة مرفقات
                    <input type="file" multiple hidden onChange={handleEditFiles} />
                  </Button>
                  <Box mt={1} display="flex" flexDirection="column" gap={0.5}>
                    {(editTpl.attachments || []).map((att, idx2) => (
                      <Box key={idx2} display="flex" alignItems="center" gap={1}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer">{att.name}</a>
                        <Typography color="text.secondary" fontSize={12}>{att.type}</Typography>
                        <Button color="error" size="small" onClick={() => handleRemoveEditAttachment(idx2)}>حذف</Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            ) : (
              <Box display="flex" alignItems="center" gap={2}>
                <Typography fontWeight="bold">{tpl.title}</Typography>
                <Typography color="text.secondary">{tpl.description}</Typography>
                {tpl.keywords && tpl.keywords.length > 0 && (
                  <Typography color="info.main" sx={{ fontSize: 13, mx: 1 }}>
                    كلمات: {Array.isArray(tpl.keywords) ? tpl.keywords.join(', ') : tpl.keywords}
                  </Typography>
                )}
                <Typography color="secondary" sx={{ fontSize: 13, mx: 1 }}>
                  {tpl.language === 'en' ? 'EN' : 'AR'}
                </Typography>
                <Typography sx={{ fontFamily: 'monospace', background: '#f9f9f9', px: 1, borderRadius: 1 }}>{tpl.body}</Typography>
                <Button variant="outlined" size="small" onClick={() => handleEdit(i)} disabled={saving}>تعديل</Button>
                <IconButton color="error" onClick={() => handleDelete(i)} disabled={saving}><DeleteIcon /></IconButton>
              </Box>
            )}
          </Paper>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  );
}