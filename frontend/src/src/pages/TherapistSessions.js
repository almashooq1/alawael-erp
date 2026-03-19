import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Rating,
  TextareaAutosize,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { therapistService } from '../services/therapistService';

const TherapistSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [searchText, setSearchText] = useState('');
  const [formData, setFormData] = useState({
    patientName: '',
    date: '',
    duration: '',
    rating: 0,
    notes: '',
    achievements: '',
    nextGoals: '',
  });

  useEffect(() => {
    const loadSessions = async () => {
      try {
        const data = await therapistService.getTherapistSessions('TH001');
        setSessions(data);
        setLoading(false);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setLoading(false);
      }
    };
    loadSessions();
  }, []);

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

  const handleSaveSession = () => {
    console.log('Save session:', formData);
    handleCloseDialog();
  };

  const filteredSessions = sessions.filter(
    s => s.patientName.includes(searchText) || s.date.includes(searchText) || s.notes.toLowerCase().includes(searchText.toLowerCase()),
  );

  const getRatingColor = rating => {
    if (rating >= 4) return '#4caf50';
    if (rating >= 3) return '#2196f3';
    if (rating >= 2) return '#ff9800';
    return '#f44336';
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                  {(sessions.reduce((sum, s) => sum + s.rating, 0) / sessions.length || 0).toFixed(1)}⭐
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                  {sessions.filter(s => new Date(s.date).getMonth() === new Date().getMonth()).length}
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
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog('add')}>
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
                <Avatar sx={{ width: 40, height: 40 }}>{session.patientName.charAt(0)}</Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {session.patientName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    {session.date} • {session.duration} دقيقة
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Rating value={session.rating} readOnly size="small" />
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: getRatingColor(session.rating) }}>
                    {session.rating}/5
                  </Typography>
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* الملاحظات العامة */}
                <Box sx={{ pb: 2, borderBottom: '1px solid #eee' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    📋 الملاحظات العامة:
                  </Typography>
                  <Typography variant="body2">{session.notes}</Typography>
                </Box>

                {/* الإنجازات */}
                <Box sx={{ pb: 2, borderBottom: '1px solid #eee' }}>
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
                <Box sx={{ display: 'flex', gap: 1, pt: 2, borderTop: '1px solid #eee' }}>
                  <Button size="small" startIcon={<EditIcon />} onClick={() => handleOpenDialog('edit', session)}>
                    تعديل
                  </Button>
                  <Button size="small" color="error" startIcon={<DeleteIcon />}>
                    حذف
                  </Button>
                  <Button size="small" startIcon={<DownloadIcon />}>
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
        <DialogTitle sx={{ fontWeight: 'bold' }}>{dialogMode === 'add' ? 'إضافة جلسة جديدة' : 'تعديل الجلسة'}</DialogTitle>
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
              <Rating value={formData.rating} onChange={(e, value) => setFormData({ ...formData, rating: value })} />
            </Box>

            <TextareaAutosize
              placeholder="الملاحظات العامة..."
              minRows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'inherit',
              }}
            />

            <TextareaAutosize
              placeholder="الإنجازات في هذه الجلسة..."
              minRows={3}
              value={formData.achievements}
              onChange={e => setFormData({ ...formData, achievements: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'inherit',
              }}
            />

            <TextareaAutosize
              placeholder="الأهداف للجلسة القادمة..."
              minRows={3}
              value={formData.nextGoals}
              onChange={e => setFormData({ ...formData, nextGoals: e.target.value })}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ddd',
                fontFamily: 'inherit',
              }}
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
    </Container>
  );
};

export default TherapistSessions;
