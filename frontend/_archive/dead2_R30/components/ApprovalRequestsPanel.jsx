import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Paper, Grid, CircularProgress, Divider, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import axios from 'axios';

const ApprovalRequestsPanel = () => {
  const [myRequests, setMyRequests] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState({ open: false, approval: null, action: '', comment: '' });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('/api/approval-requests/my'),
      axios.get('/api/approval-requests/pending'),
    ]).then(([myRes, pendingRes]) => {
      setMyRequests(myRes.data.approvals || []);
      setPending(pendingRes.data.approvals || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [refresh]);

  const handleAction = (approval, action) => {
    setActionDialog({ open: true, approval, action, comment: '' });
  };

  const submitAction = async () => {
    const { approval, action, comment } = actionDialog;
    await axios.post(`/api/approval-requests/${approval._id}/action`, { action, comment });
    setActionDialog({ open: false, approval: null, action: '', comment: '' });
    setRefresh(r => r + 1);
  };

  if (loading) return <CircularProgress />;

  return (
    <Box p={2}>
      <Typography variant="h6" gutterBottom>طلباتي</Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {myRequests.map(req => (
          <Grid item xs={12} md={6} key={req._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">{req.requestType}</Typography>
              <Typography variant="body2" color="text.secondary">الحالة: {req.status}</Typography>
              <Typography variant="body2">تاريخ الإنشاء: {new Date(req.createdAt).toLocaleString()}</Typography>
              <Typography variant="body2">سلسلة الموافقات: {req.steps.map((s, i) => `${i + 1}: ${s.action}`).join(' | ')}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h6" gutterBottom mt={4}>طلبات بحاجة لموافقتي</Typography>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={2}>
        {pending.map(req => (
          <Grid item xs={12} md={6} key={req._id}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1">{req.requestType}</Typography>
              <Typography variant="body2" color="text.secondary">الحالة: {req.status}</Typography>
              <Typography variant="body2">تاريخ الإنشاء: {new Date(req.createdAt).toLocaleString()}</Typography>
              <Typography variant="body2">سلسلة الموافقات: {req.steps.map((s, i) => `${i + 1}: ${s.action}`).join(' | ')}</Typography>
              <Box mt={2}>
                <Button variant="contained" color="success" sx={{ mr: 1 }} onClick={() => handleAction(req, 'approved')}>موافقة</Button>
                <Button variant="contained" color="error" onClick={() => handleAction(req, 'rejected')}>رفض</Button>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, approval: null, action: '', comment: '' })}>
        <DialogTitle>تأكيد الإجراء</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من أنك تريد {actionDialog.action === 'approved' ? 'الموافقة' : 'الرفض'} على هذا الطلب؟</Typography>
          <TextField
            label="تعليق (اختياري)"
            fullWidth
            multiline
            minRows={2}
            value={actionDialog.comment}
            onChange={e => setActionDialog({ ...actionDialog, comment: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, approval: null, action: '', comment: '' })}>إلغاء</Button>
          <Button onClick={submitAction} variant="contained" color={actionDialog.action === 'approved' ? 'success' : 'error'}>تأكيد</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalRequestsPanel;
