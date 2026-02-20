// واجهة مراجعة القوالب الإدارية (اعتماد/رفض)
import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Tooltip, Snackbar, Alert } from '@mui/material';
import templatesService from '../../../services/templatesService';

export default function AdminTemplatesReview() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, msg: '', severity: 'success' });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await templatesService.getAll({ status: 'draft' });
      setTemplates(res);
    } catch {
      setTemplates([]);
      setSnackbar({ open: true, msg: 'فشل تحميل القوالب', severity: 'error' });
    }
    setLoading(false);
  };
  useEffect(() => { fetchTemplates(); }, []);

  const handleApprove = async (tpl) => {
    try {
      await templatesService.approve(tpl._id);
      setSnackbar({ open: true, msg: 'تم اعتماد القالب بنجاح', severity: 'success' });
      fetchTemplates();
    } catch {
      setSnackbar({ open: true, msg: 'فشل اعتماد القالب', severity: 'error' });
    }
  };
  const handleReject = async (tpl) => {
    try {
      await templatesService.reject(tpl._id, rejectReason);
      setSnackbar({ open: true, msg: 'تم رفض القالب', severity: 'info' });
      setRejectOpen(false);
      setRejectReason('');
      fetchTemplates();
    } catch {
      setSnackbar({ open: true, msg: 'فشل رفض القالب', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" mb={2}>مراجعة القوالب قيد الاعتماد</Typography>
      {loading && <Typography>جاري التحميل...</Typography>}
      {templates.length === 0 && !loading && <Typography>لا توجد قوالب بانتظار الاعتماد.</Typography>}
      {templates.map(tpl => (
        <Paper key={tpl._id} sx={{ p: 2, mb: 2 }}>
          <Typography fontWeight="bold">{tpl.title}</Typography>
          <Typography color="text.secondary">{tpl.description}</Typography>
          <Box sx={{ fontFamily: 'monospace', background: '#f9f9f9', p: 1, borderRadius: 1, my: 1, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: tpl.body }} />
          {tpl.attachments && tpl.attachments.length > 0 && (
            <Box mb={1}>
              <Typography fontSize={14} color="text.secondary">المرفقات:</Typography>
              <Box display="flex" flexWrap="wrap" gap={1}>
                {tpl.attachments.map((att, j) => (
                  <Chip key={j} label={att.name} component="a" href={att.url} target="_blank" clickable color="info" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}
          <Box display="flex" gap={2} mt={1}>
            <Button variant="contained" color="success" onClick={() => handleApprove(tpl)}>اعتماد</Button>
            <Button variant="outlined" color="error" onClick={() => { setSelected(tpl); setRejectOpen(true); }}>رفض</Button>
            <Tooltip title="سجل التغييرات"><Button onClick={() => setSelected(tpl)}>سجل التدقيق</Button></Tooltip>
          </Box>
          {/* سجل التغييرات */}
          {selected && selected._id === tpl._id && selected.history && (
            <Box mt={2}>
              <Typography fontSize={14} fontWeight="bold">سجل التغييرات:</Typography>
              {selected.history.length === 0 && <Typography color="text.secondary">لا يوجد.</Typography>}
              {selected.history.map((h, i) => (
                <Typography key={i} fontSize={13} color="text.secondary">
                  [{new Date(h.at).toLocaleString()}] {h.action} - {h.details || ''}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      ))}
      {/* حوار سبب الرفض */}
      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)}>
        <DialogTitle>رفض القالب</DialogTitle>
        <DialogContent>
          <TextField label="سبب الرفض" value={rejectReason} onChange={e => setRejectReason(e.target.value)} fullWidth multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={() => handleReject(selected)} disabled={!rejectReason}>تأكيد الرفض</Button>
        </DialogActions>
      </Dialog>
      {/* تنبيه */}
      <Snackbar open={snackbar.open} autoHideDuration={2500} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
