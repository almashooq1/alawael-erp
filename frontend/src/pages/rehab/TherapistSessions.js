import { useState, useEffect } from 'react';

import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors, neutralColors, surfaceColors } from '../../theme/palette';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  Rating,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';

const TherapistSessions = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [searchText, setSearchText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const showSnackbar = useSnackbar();
  const [formData, setFormData] = useState({
    patientName: '',
    date: '',
    duration: '',
    rating: 0,
    notes: '',
    achievements: '',
    nextGoals: '',
  });

  // Normalize a session from the backend (beneficiary.name) to the shape the UI expects (patientName)
  const normalizeSession = s => ({
    ...s,
    id: s.id || s._id,
    patientName: s.patientName || s.beneficiary?.name || 'غير محدد',
    date:
      typeof s.date === 'string'
        ? s.date
        : s.date
          ? new Date(s.date).toISOString().slice(0, 10)
          : '',
    duration: s.duration ?? '',
    rating: s.rating ?? 0,
    notes: typeof s.notes === 'string' ? s.notes : s.notes?.subjective || '',
    achievements: s.achievements || '',
    nextGoals: s.nextGoals || '',
  });

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await therapistService.getTherapistSessions(userId);
        const list = Array.isArray(data) ? data : (data?.data ?? data?.sessions ?? []);
        setSessions(list.map(normalizeSession));
        setLoading(false);
      } catch (error) {
        logger.error('Error loading sessions:', error);
        setLoading(false);
      }
    };
    loadSessions();
  }, [userId]);

  const handleOpenDialog = (mode = 'add', session = null) => {
    setDialogMode(mode);
    if (mode === 'edit' && session) {
      setFormData({
        patientName: session.patientName,
        date: session.date,
        duration: session.duration,
        rating: session.rating,
        notes: session.notes,
        achievements: session.achievements,
        nextGoals: session.nextGoals,
      });
    } else {
      setFormData({
        patientName: '',
        date: '',
        duration: '',
        rating: 0,
        notes: '',
        achievements: '',
        nextGoals: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      patientName: '',
      date: '',
      duration: '',
      rating: 0,
      notes: '',
      achievements: '',
      nextGoals: '',
    });
  };

  const handleSaveSession = async () => {
    try {
      await therapistService.saveSession({
        patientName: formData.patientName,
        date: formData.date,
        duration: formData.duration,
        rating: formData.rating,
        notes: formData.notes,
        achievements: formData.achievements,
        nextGoals: formData.nextGoals,
      });
      // Reload sessions from backend
      const data = await therapistService.getTherapistSessions(userId);
      const list = Array.isArray(data) ? data : (data?.data ?? data?.sessions ?? []);
      setSessions(list.map(normalizeSession));
      handleCloseDialog();
    } catch (err) {
      logger.error('Failed to save session:', err);
      handleCloseDialog();
    }
  };

  const filteredSessions = sessions.filter(
    s =>
      (s.patientName || '').includes(searchText) ||
      (s.date || '').includes(searchText) ||
      (s.notes || '').toLowerCase().includes(searchText.toLowerCase())
  );

  const getRatingColor = rating => {
    if (rating >= 4) return statusColors.success;
    if (rating >= 3) return statusColors.info;
    if (rating >= 2) return statusColors.warning;
    return statusColors.error;
  };

  const handleDeleteSession = async () => {
    if (!deleteTarget) return;
    try {
      if (therapistService.deleteSession) {
        await therapistService.deleteSession(deleteTarget._id || deleteTarget.id);
      }
      setSessions(prev =>
        prev.filter(s => (s._id || s.id) !== (deleteTarget._id || deleteTarget.id))
      );
      showSnackbar('تم حذف الجلسة بنجاح', 'success');
    } catch (err) {
      logger.error('Failed to delete session:', err);
      showSnackbar('فشل في حذف الجلسة', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDownloadSession = session => {
    const content = [
      `تقرير جلسة علاجية`,
      `${'─'.repeat(30)}`,
      `المريض: ${session.patientName || ''}`,
      `التاريخ: ${session.date || ''}`,
      `المدة: ${session.duration || ''} دقيقة`,
      `التقييم: ${session.rating || 0}/5`,
      ``,
      `الملاحظات:`,
      session.notes || 'لا توجد',
      ``,
      `الإنجازات:`,
      session.achievements || 'لا توجد',
      ``,
      `الأهداف القادمة:`,
      session.nextGoals || 'لا توجد',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `session-${session.patientName || 'report'}-${session.date || 'unknown'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل الجلسات...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SessionsIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              جلسات التأهيل
            </Typography>
            <Typography variant="body2">إدارة ومتابعة جلسات العلاج والتأهيل</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          📝 تقارير الجلسات
        </Typography>

        {/* الإحصائيات */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي الجلسات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.info }}>
                  {sessions.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  متوسط التقييم
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.success }}>
                  {(sessions.reduce((sum, s) => sum + s.rating, 0) / sessions.length || 0).toFixed(
                    1
                  )}
                  ⭐
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  هذا الشهر
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.warning }}>
                  {
                    sessions.filter(s => new Date(s.date).getMonth() === new Date().getMonth())
                      .length
                  }
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 2 }}>
              <CardContent>
                <Typography color="textSecondary" sx={{ mb: 1 }}>
                  إجمالي الساعات
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.purple }}>
                  {sessions.reduce((sum, s) => sum + parseInt(s.duration), 0)}h
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* البحث والإجراءات */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="ابحث عن جلسة..."
            variant="outlined"
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog('add')}
          >
            جلسة جديدة
          </Button>
        </Box>
      </Box>

      {/* قائمة الجلسات */}
      {filteredSessions.map(session => (
        <Card key={session.id} sx={{ borderRadius: 2, boxShadow: 3, mb: 2 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Avatar sx={{ width: 40, height: 40 }}>
                  {(session.patientName || '?').charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {session.patientName || 'غير محدد'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                    {session.date} • {session.duration} دقيقة
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={session.rating} readOnly size="small" />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 'bold', color: getRatingColor(session.rating) }}
                  >
                    {session.rating}/5
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* الملاحظات العامة */}
                <Box sx={{ pb: 2, borderBottom: `1px solid ${surfaceColors.borderSubtle}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📋 الملاحظات العامة:
                  </Typography>
                  <Typography variant="body2">{session.notes}</Typography>
                </Box>

                {/* الإنجازات */}
                <Box sx={{ pb: 2, borderBottom: `1px solid ${surfaceColors.borderSubtle}` }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    ✅ الإنجازات في هذه الجلسة:
                  </Typography>
                  <Typography variant="body2">{session.achievements}</Typography>
                </Box>

                {/* الأهداف القادمة */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    🎯 الأهداف للجلسة القادمة:
                  </Typography>
                  <Typography variant="body2">{session.nextGoals}</Typography>
                </Box>

                {/* الإجراءات */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    pt: 2,
                    borderTop: `1px solid ${surfaceColors.borderSubtle}`,
                  }}
                >
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenDialog('edit', session)}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteTarget(session)}
                  >
                    حذف
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadSession(session)}
                  >
                    تنزيل
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Card>
      ))}

      {filteredSessions.length === 0 && (
        <Card sx={{ borderRadius: 2, textAlign: 'center', py: 4 }}>
          <Typography color="textSecondary">لا توجد جلسات</Typography>
        </Card>
      )}

      {/* Dialog إضافة/تعديل جلسة */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          {dialogMode === 'add' ? 'إضافة جلسة جديدة' : 'تعديل الجلسة'}
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="اسم المريض"
              fullWidth
              variant="outlined"
              size="small"
              value={formData.patientName}
              onChange={e => setFormData({ ...formData, patientName: e.target.value })}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="التاريخ"
                type="date"
                fullWidth
                variant="outlined"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
              <TextField
                label="المدة (دقيقة)"
                type="number"
                variant="outlined"
                size="small"
                sx={{ width: 150 }}
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
              />
            </Box>

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>
                التقييم:
              </Typography>
              <Rating
                value={formData.rating}
                onChange={(e, value) => setFormData({ ...formData, rating: value })}
              />
            </Box>

            <TextField
              label="الملاحظات العامة"
              placeholder="الملاحظات العامة..."
              multiline
              minRows={3}
              fullWidth
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />

            <TextField
              label="الإنجازات"
              placeholder="الإنجازات في هذه الجلسة..."
              multiline
              minRows={3}
              fullWidth
              value={formData.achievements}
              onChange={e => setFormData({ ...formData, achievements: e.target.value })}
            />

            <TextField
              label="الأهداف القادمة"
              placeholder="الأهداف للجلسة القادمة..."
              multiline
              minRows={3}
              fullWidth
              value={formData.nextGoals}
              onChange={e => setFormData({ ...formData, nextGoals: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveSession}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف جلسة <strong>{deleteTarget?.patientName}</strong> بتاريخ{' '}
            <strong>{deleteTarget?.date}</strong>؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteTarget(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDeleteSession}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistSessions;
