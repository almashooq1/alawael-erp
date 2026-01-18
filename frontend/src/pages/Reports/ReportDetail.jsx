// Report Detail Page - ReportDetail.jsx

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
  MenuItem
} from '@mui/material';
import {
  Edit,
  Delete,
  Print,
  Share,
  MoreVert,
  Add,
  MessageSquare
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ReportDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reportRes = await api.get(`/reports/${id}`);
        setReport(reportRes.data.data);

        const commentsRes = await api.get(`/reports/${id}/comments`);
        setComments(commentsRes.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/reports/${id}/comments`, {
        content: newComment
      });
      setComments([...comments, res.data.data]);
      setNewComment('');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء إضافة التعليق');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/reports/${id}`);
      navigate('/reports');
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحذف');
    }
    setOpenDelete(false);
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

  if (!report) {
    return (
      <Alert severity="error">
        لم يتم العثور على التقرير
      </Alert>
    );
  }

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
            {report.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            نوع التقرير: {report.report_type}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            startIcon={<Edit />}
            onClick={() => navigate(`/reports/${id}/edit`)}
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
            <MenuItem>
              <Share fontSize="small" sx={{ mr: 1 }} />
              مشاركة
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

      {/* Report Content */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="المستفيد"
                    secondary={report.beneficiary?.first_name} 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="تاريخ البداية"
                    secondary={new Date(report.period_start).toLocaleDateString('ar-EG')}
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="تاريخ النهاية"
                    secondary={new Date(report.period_end).toLocaleDateString('ar-EG')}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الحالة"
                    secondary={
                      <Chip
                        label={report.status}
                        size="small"
                        color={report.status === 'published' ? 'success' : 'default'}
                      />
                    }
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" gutterBottom>
            ملخص التقرير
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {report.report_summary}
          </Typography>

          {report.description && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                الوصف
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {report.description}
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <MessageSquare sx={{ mr: 1 }} />
            التعليقات ({comments.length})
          </Typography>
          <Divider sx={{ my: 2 }} />

          {/* Add Comment */}
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="أضف تعليق..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              variant="outlined"
            />
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddComment}
              sx={{ mt: 1 }}
            >
              إضافة تعليق
            </Button>
          </Box>

          {/* Comments List */}
          {comments.length > 0 ? (
            <List>
              {comments.map((comment) => (
                <Paper key={comment.id} sx={{ mb: 2, p: 2 }}>
                  <ListItemText
                    primary={comment.author?.first_name || 'مستخدم'}
                    secondary={
                      <>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {comment.content}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(comment.created_at).toLocaleDateString('ar-EG')}
                        </Typography>
                      </>
                    }
                  />
                </Paper>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">
              لا توجد تعليقات بعد
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          هل أنت متأكد من حذف هذا التقرير؟ لا يمكن التراجع عن هذه العملية.
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

export default ReportDetail;

import { Grid } from '@mui/material';
