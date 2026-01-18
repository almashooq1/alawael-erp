// Session Detail Page - SessionDetail.jsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Grid
} from '@mui/material';
import {
  Edit,
  Delete,
  Print,
  CheckCircle,
  Cancel,
  MoreVert,
  Clock,
  Person,
  Note
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDelete, setOpenDelete] = useState(false);
  const [openComplete, setOpenComplete] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/sessions/${id}`);
        setSession(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleDelete = async () => {
    try {
      await api.delete(`/sessions/${id}`);
      navigate('/sessions');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
    }
    setOpenDelete(false);
  };

  const handleComplete = async () => {
    try {
      const res = await api.post(`/sessions/${id}/complete`, {
        notes: completionNotes
      });
      setSession(res.data.data);
      setOpenComplete(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إكمال الجلسة');
    }
  };

  const handleMenuOpen = (e) => {
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return (
      <Alert severity="error">
        لم يتم العثور على الجلسة
      </Alert>
    );
  }

  const statusColor = {
    scheduled: 'info',
    completed: 'success',
    cancelled: 'error'
  }[session.status] || 'default';

  const statusLabel = {
    scheduled: 'مجدولة',
    completed: 'مكتملة',
    cancelled: 'ملغاة'
  }[session.status] || session.status;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            جلسة {session.session_type}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            التاريخ: {new Date(session.session_date).toLocaleDateString('ar-EG')}
          </Typography>
        </Box>
        <Box>
          {session.status === 'scheduled' && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => setOpenComplete(true)}
              sx={{ mr: 1 }}
            >
              إكمال الجلسة
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={() => navigate(`/sessions/${id}/edit`)}
            sx={{ mr: 1 }}
          >
            تعديل
          </Button>
          <IconButton
            onClick={handleMenuOpen}
          >
            <MoreVert />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={() => window.print()}>
              <Print fontSize="small" sx={{ mr: 1 }} />
              طباعة
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => setOpenDelete(true)}
              sx={{ color: 'error.main' }}
            >
              <Delete fontSize="small" sx={{ mr: 1 }} />
              حذف
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Session Information */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات الجلسة
              </Typography>
              <Divider sx={{ my: 2 }} />
              <List dense>
                <ListItem>
                  <ListItemText
                    primary={<Clock fontSize="small" />}
                    secondary={
                      <>
                        <Typography variant="body2">
                          التاريخ: {new Date(session.session_date).toLocaleDateString('ar-EG')}
                        </Typography>
                        <Typography variant="body2">
                          الوقت: {session.session_time}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="مدة الجلسة"
                    secondary={`${session.duration_minutes} دقيقة`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="نوع الجلسة"
                    secondary={session.session_type}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الحالة"
                    secondary={
                      <Chip
                        label={statusLabel}
                        size="small"
                        color={statusColor}
                      />
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          {/* Objectives */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                أهداف الجلسة
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {session.session_objectives || 'لا توجد أهداف محددة'}
              </Typography>
            </CardContent>
          </Card>

          {/* Notes */}
          {session.session_notes && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Note sx={{ mr: 1 }} />
                  ملاحظات الجلسة
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {session.session_notes}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar Info */}
        <Grid item xs={12} md={4}>
          {/* Participant */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ mr: 1 }} />
                المستفيد
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                {session.beneficiary?.first_name} {session.beneficiary?.last_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                رقم المستفيد: {session.beneficiary?.id}
              </Typography>
            </CardContent>
          </Card>

          {/* Therapist */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Person sx={{ mr: 1 }} />
                المعالج
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Typography variant="body2" sx={{ mt: 2 }}>
                {session.therapist?.first_name} {session.therapist?.last_name}
              </Typography>
            </CardContent>
          </Card>

          {/* Completion Info */}
          {session.status === 'completed' && (
            <Card sx={{ mb: 3, backgroundColor: '#f1f5fe' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  معلومات الإكمال
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  {session.completion_notes || 'بدون ملاحظات'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {new Date(session.completed_at).toLocaleDateString('ar-EG')}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Complete Session Dialog */}
      <Dialog open={openComplete} onClose={() => setOpenComplete(false)} fullWidth>
        <DialogTitle>إكمال الجلسة</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="ملاحظات الإكمال"
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComplete(false)}>إلغاء</Button>
          <Button onClick={handleComplete} color="success" variant="contained">
            إكمال
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذه العملية.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>إلغاء</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SessionDetail;
