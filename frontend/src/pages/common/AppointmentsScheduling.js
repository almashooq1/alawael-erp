import { useState, useEffect } from 'react';




import { parentService } from 'services/parentService';
import api from 'services/api.client';
import { getStatusColor } from 'utils/statusColors';
import logger from 'utils/logger';
import { gradients, brandColors, neutralColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const AppointmentsScheduling = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const [appData, setAppData] = useState(null);
  const showSnackbar = useSnackbar();
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('January');
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    therapist: '',
    type: 'individual',
    notes: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await parentService.getAppointmentsScheduling(userId);
        setAppData(data);
      } catch (err) {
        logger.error('Failed to load appointments:', err);
        setError(err.message || 'حدث خطأ في تحميل المواعيد');
        showSnackbar('حدث خطأ في تحميل المواعيد', 'error');
      }
    };
    fetchData();
  }, [userId, showSnackbar]);

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  if (!appData) return <Typography>جاري التحميل...</Typography>;

  const handleAddAppointment = async () => {
    try {
      await api.post('/appointments', {
        date: formData.date,
        startTime: formData.time,
        therapist: formData.therapist,
        type:
          formData.type === 'individual'
            ? 'جلسة فردية'
            : formData.type === 'group'
              ? 'جلسة جماعية'
              : formData.type,
        reason: formData.notes,
        bookedBy: userId,
        source: 'online',
      });
      // Reload appointments
      const data = await parentService.getAppointmentsScheduling(userId);
      setAppData(data);
      setOpenDialog(false);
      showSnackbar('تم تحديد الموعد بنجاح', 'success');
      setFormData({
        date: '',
        time: '',
        therapist: '',
        type: 'individual',
        notes: '',
      });
    } catch (err) {
      logger.error('Failed to add appointment:', err);
      showSnackbar('فشل في تحديد الموعد', 'error');
      setOpenDialog(false);
      setFormData({
        date: '',
        time: '',
        therapist: '',
        type: 'individual',
        notes: '',
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: gradients.primary,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DateRangeIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                جدولة ومتابعة الجلسات
              </Typography>
              <Typography variant="body2">عرض وتحديد مواعيد الجلسات العلاجية</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
            }}
          >
            جلسة جديدة
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {appData.stats?.map(stat => (
          <Grid item xs={12} sm={6} md={3} key={stat.id}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6" sx={{ color: stat.color, fontWeight: 'bold' }}>
                  {stat.value}
                </Typography>
                <Typography variant="caption">{stat.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Month Selection */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="اختر الشهر" />
        <CardContent>
          <Grid container spacing={2}>
            {['January', 'February', 'March', 'April'].map(month => (
              <Grid item xs={6} sm={3} key={month}>
                <Button
                  fullWidth
                  variant={selectedMonth === month ? 'contained' : 'outlined'}
                  onClick={() => setSelectedMonth(month)}
                  sx={{
                    background: selectedMonth === month ? gradients.primary : 'white',
                  }}
                >
                  {month}
                </Button>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Upcoming Appointments */}
      <Card sx={{ mb: 4 }}>
        <CardHeader title="الجلسات القادمة" />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>التاريخ والوقت</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الطفل</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>المعالج</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appData.upcomingAppointments?.map(apt => (
                  <TableRow key={apt.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {apt.date}
                        </Typography>
                        <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                          {apt.time}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{ width: 32, height: 32, backgroundColor: brandColors.primaryStart }}
                        >
                          {apt.childName.charAt(0)}
                        </Avatar>
                        <Typography variant="body2">{apt.childName}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{apt.therapist}</TableCell>
                    <TableCell>
                      <Chip label={apt.type} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip label={apt.status} color={getStatusColor(apt.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        aria-label="تعديل"
                        size="small"
                        onClick={() => setOpenDialog(true)}
                      >
                        <EditIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Completed Sessions */}
      <Card>
        <CardHeader title="الجلسات المكتملة" />
        <CardContent>
          <Grid container spacing={2}>
            {appData.completedSessions?.map(session => (
              <Grid item xs={12} md={6} key={session.id}>
                <Card
                  sx={{
                    border: `1px solid ${surfaceColors.borderSubtle}`,
                    backgroundColor: surfaceColors.backgroundLight,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {session.date}
                      </Typography>
                      <Chip icon={<CheckIcon />} label="مكتملة" size="small" color="success" />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Avatar
                        sx={{ width: 32, height: 32, backgroundColor: brandColors.primaryStart }}
                      >
                        {session.childName.charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {session.childName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                          مع {session.therapist}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: neutralColors.textSecondary }}
                    >
                      <strong>الملاحظات:</strong> {session.notes}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* New Appointment Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تحديد جلسة جديدة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="التاريخ"
            type="date"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="الوقت"
            type="time"
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>المعالج</InputLabel>
            <Select
              value={formData.therapist}
              onChange={e => setFormData({ ...formData, therapist: e.target.value })}
              label="المعالج"
            >
              {appData.therapists?.map(t => (
                <MenuItem key={t.id} value={t.name}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>نوع الجلسة</InputLabel>
            <Select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
              label="نوع الجلسة"
            >
              <MenuItem value="individual">فردية</MenuItem>
              <MenuItem value="group">جماعية</MenuItem>
              <MenuItem value="family">عائلية</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="ملاحظات"
            multiline
            rows={3}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAddAppointment}
            sx={{
              background: gradients.primary,
            }}
          >
            تحديد الموعد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AppointmentsScheduling;
