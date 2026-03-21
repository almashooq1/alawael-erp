import { useState, useEffect } from 'react';




import { therapistService } from 'services/therapistService';
import logger from 'utils/logger';
import { useAuth } from 'contexts/AuthContext';
import { gradients, statusColors, neutralColors, surfaceColors } from '../../theme/palette';
import { useSnackbar } from '../../contexts/SnackbarContext';

const TherapistSchedule = () => {
  const showSnackbar = useSnackbar();
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [schedule, setSchedule] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [_selectedDay, setSelectedDay] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState('add');
  const [formData, setFormData] = useState({
    patientName: '',
    time: '',
    type: '',
    notes: '',
  });

  // Convert flat session array into per-day groups: [{sessions:[...]}, ...] indexed 0-4
  const groupByDay = raw => {
    const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.sessions ?? []);
    const days = Array.from({ length: 5 }, () => ({ sessions: [] }));
    list.forEach(s => {
      const dayIdx = s.dayOfWeek ?? (s.date ? new Date(s.date).getDay() : -1);
      if (dayIdx >= 0 && dayIdx < 5) {
        days[dayIdx].sessions.push({
          ...s,
          patientName: s.patientName || s.beneficiary?.name || 'غير محدد',
          time: s.time || s.startTime || '',
          type: s.type || s.sessionType || '',
        });
      }
    });
    return days;
  };

  useEffect(() => {
    const loadSchedule = async () => {
      try {
        const data = await therapistService.getTherapistSchedule(userId);
        setSchedule(groupByDay(data));
        setLoading(false);
      } catch (error) {
        logger.error('Error loading schedule:', error);
        showSnackbar('حدث خطأ في تحميل الجدول', 'error');
        setLoading(false);
      }
    };
    loadSchedule();
  }, [userId, showSnackbar]);

  const daysOfWeek = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const timeSlots = [
    '08:00',
    '08:30',
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
  ];

  const handleOpenDialog = (day, mode = 'add', existing = null) => {
    setSelectedDay(day);
    setDialogMode(mode);
    if (mode === 'edit' && existing) {
      setFormData({
        patientName: existing.patientName,
        time: existing.time,
        type: existing.type,
        notes: existing.notes,
      });
    } else {
      setFormData({ patientName: '', time: '', type: '', notes: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({ patientName: '', time: '', type: '', notes: '' });
  };

  const handleAddSession = async () => {
    if (formData.patientName && formData.time) {
      try {
        await therapistService.addScheduleSession({
          patientName: formData.patientName,
          time: formData.time,
          type: formData.type,
          notes: formData.notes,
        });
        // Reload schedule from backend
        const data = await therapistService.getTherapistSchedule(userId);
        setSchedule(groupByDay(data));
        showSnackbar('تمت إضافة الجلسة بنجاح', 'success');
        handleCloseDialog();
      } catch (err) {
        logger.error('Failed to add session:', err);
        showSnackbar('فشل إضافة الجلسة', 'error');
        handleCloseDialog();
      }
    }
  };

  const getDayDate = dayIndex => {
    const today = new Date();
    const date = new Date(today);
    date.setDate(date.getDate() + dayIndex + currentWeek * 7);
    return date.toLocaleDateString('ar-SA', { month: 'long', day: 'numeric' });
  };

  const getSessionColor = type => {
    switch (type) {
      case 'فردية':
        return { bg: surfaceColors.infoLight, border: statusColors.info };
      case 'جماعية':
        return { bg: surfaceColors.purpleLight, border: statusColors.purple };
      case 'متابعة':
        return { bg: surfaceColors.successLight, border: statusColors.success };
      case 'استشارة':
        return { bg: surfaceColors.warningLight, border: statusColors.warning };
      default:
        return { bg: surfaceColors.lightGray, border: neutralColors.textMuted };
    }
  };

  const getSessionChipColor = type => {
    switch (type) {
      case 'فردية':
        return 'primary';
      case 'جماعية':
        return 'secondary';
      case 'متابعة':
        return 'success';
      case 'استشارة':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>جاري تحميل الجدول...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 2, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              جدول المعالج
            </Typography>
            <Typography variant="body2">إدارة المواعيد والجداول الزمنية</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 3 }}>
          📅 جدول المواعيد والجلسات
        </Typography>

        {/* التحكم في الأسابيع */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Button
            startIcon={<NavigateBeforeIcon />}
            onClick={() => setCurrentWeek(currentWeek - 1)}
          >
            الأسبوع السابق
          </Button>
          <Typography sx={{ fontWeight: 'bold', minWidth: 150, textAlign: 'center' }}>
            أسبوع {currentWeek + 1}
          </Typography>
          <Button endIcon={<NavigateNextIcon />} onClick={() => setCurrentWeek(currentWeek + 1)}>
            الأسبوع القادم
          </Button>
        </Box>
      </Box>

      {/* إحصائيات الأسبوع */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                إجمالي الجلسات
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.info }}>
                12
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                جلسات مؤكدة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.success }}>
                10
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                في انتظار التأكيد
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.warning }}>
                2
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography color="textSecondary" sx={{ mb: 1 }}>
                ملغاة
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: statusColors.error }}>
                0
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* جدول الجلسات يومياً */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {daysOfWeek.map((day, dayIndex) => (
          <Grid item xs={12} sm={6} md={4} key={day}>
            <Card sx={{ borderRadius: 2, boxShadow: 3, height: '100%' }}>
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    pb: 1,
                    borderBottom: `2px solid ${surfaceColors.borderSubtle}`,
                  }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {day}
                    </Typography>
                    <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                      {getDayDate(dayIndex)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog(dayIndex, 'add')}
                  >
                    إضافة
                  </Button>
                </Box>

                {/* الجلسات اليومية */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(schedule[dayIndex]?.sessions || []).map((session, idx) => {
                    const colors = getSessionColor(session.type);
                    return (
                      <Box
                        key={idx}
                        sx={{
                          p: 1.5,
                          backgroundColor: colors.bg,
                          borderLeft: `4px solid ${colors.border}`,
                          borderRadius: 1,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateX(-2px)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start',
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {session.time}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                              {session.patientName}
                            </Typography>
                          </Box>
                          <Chip
                            label={session.type}
                            size="small"
                            color={getSessionChipColor(session.type)}
                            variant="outlined"
                          />
                        </Box>
                        {session.notes && (
                          <Typography
                            variant="caption"
                            sx={{ display: 'block', mt: 0.5, color: neutralColors.textSecondary }}
                          >
                            📝 {session.notes}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                          <Button
                            size="small"
                            variant="text"
                            onClick={() => handleOpenDialog(dayIndex, 'edit', session)}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </Button>
                          <Button size="small" variant="text" color="error">
                            <DeleteIcon sx={{ fontSize: 14 }} />
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}

                  {!schedule[dayIndex] ||
                    (schedule[dayIndex].sessions.length === 0 && (
                      <Typography
                        variant="caption"
                        sx={{ color: neutralColors.placeholder, textAlign: 'center', py: 2 }}
                      >
                        لا توجد جلسات محددة
                      </Typography>
                    ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog إضافة جلسة */}
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

            <FormControl fullWidth size="small">
              <InputLabel>الوقت</InputLabel>
              <Select
                value={formData.time}
                label="الوقت"
                onChange={e => setFormData({ ...formData, time: e.target.value })}
              >
                {timeSlots.map(time => (
                  <MenuItem key={time} value={time}>
                    {time}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small">
              <InputLabel>نوع الجلسة</InputLabel>
              <Select
                value={formData.type}
                label="نوع الجلسة"
                onChange={e => setFormData({ ...formData, type: e.target.value })}
              >
                <MenuItem value="فردية">جلسة فردية</MenuItem>
                <MenuItem value="جماعية">جلسة جماعية</MenuItem>
                <MenuItem value="متابعة">متابعة</MenuItem>
                <MenuItem value="استشارة">استشارة</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="ملاحظات"
              fullWidth
              variant="outlined"
              size="small"
              multiline
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleAddSession}>
            {dialogMode === 'add' ? 'إضافة' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistSchedule;
