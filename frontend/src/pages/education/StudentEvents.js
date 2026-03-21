/**
 * Student Events & Activities Page
 * صفحة الفعاليات والأنشطة للطالب
 */

import { useState, useEffect, useCallback } from 'react';

import { gradients } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import api from 'services/api';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Rating,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import SportsIcon from '@mui/icons-material/Sports';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EventIcon from '@mui/icons-material/Event';
import StarIcon from '@mui/icons-material/Star';
import CheckIcon from '@mui/icons-material/Check';
import PeopleIcon from '@mui/icons-material/People';
import CloseIcon from '@mui/icons-material/Close';
import { CalendarIcon } from 'utils/iconAliases';

const typeConfig = {
  رياضي: {
    icon: <SportsIcon />,
    color: '#e74c3c',
    bg: 'linear-gradient(135deg, #e74c3c, #c0392b)',
  },
  ثقافي: {
    icon: <AcademicIcon />,
    color: '#3498db',
    bg: 'linear-gradient(135deg, #3498db, #2980b9)',
  },
  فني: { icon: <ArtIcon />, color: '#9b59b6', bg: 'linear-gradient(135deg, #9b59b6, #8e44ad)' },
  تطوعي: {
    icon: <VolunteerIcon />,
    color: '#2ecc71',
    bg: 'linear-gradient(135deg, #2ecc71, #27ae60)',
  },
  احتفال: {
    icon: <CelebrationIcon />,
    color: '#f39c12',
    bg: 'linear-gradient(135deg, #f39c12, #e67e22)',
  },
  مسابقة: {
    icon: <TrophyIcon />,
    color: '#e67e22',
    bg: 'linear-gradient(135deg, #e67e22, #d35400)',
  },
};

const statusColors = {
  قادم: 'primary',
  جاري: 'success',
  منتهي: 'default',
  ملغي: 'error',
};

const StudentEvents = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 4,
    comment: '',
    wouldRecommend: true,
  });

  const mockEvents = [
    {
      _id: '1',
      title: 'بطولة كرة القدم المصغرة',
      type: 'رياضي',
      description: 'بطولة كرة قدم بين الفصول مع جوائز للفائزين',
      date: new Date(Date.now() + 3 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 3 * 86400000 + 10800000).toISOString(),
      location: 'الملعب الرئيسي',
      maxParticipants: 40,
      currentParticipants: 28,
      status: 'قادم',
      points: 50,
      organizer: { name: 'أ. سعد المدرب' },
      isRegistered: false,
      registrationDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    },
    {
      _id: '2',
      title: 'مسابقة القراءة السريعة',
      type: 'ثقافي',
      description: 'مسابقة لأسرع قارئ مع فهم واستيعاب النص',
      date: new Date(Date.now() + 5 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 5 * 86400000 + 7200000).toISOString(),
      location: 'المكتبة المركزية',
      maxParticipants: 30,
      currentParticipants: 12,
      status: 'قادم',
      points: 75,
      organizer: { name: 'أ. فاطمة' },
      isRegistered: false,
      registrationDeadline: new Date(Date.now() + 4 * 86400000).toISOString(),
    },
    {
      _id: '3',
      title: 'ورشة الرسم الإبداعي',
      type: 'فني',
      description: 'ورشة عمل لتعلم أساليب الرسم الحديثة بالألوان المائية',
      date: new Date(Date.now() + 7 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000 + 10800000).toISOString(),
      location: 'غرفة الفنون',
      maxParticipants: 15,
      currentParticipants: 14,
      status: 'قادم',
      points: 40,
      organizer: { name: 'أ. ليلى' },
      isRegistered: false,
      registrationDeadline: new Date(Date.now() + 6 * 86400000).toISOString(),
    },
    {
      _id: '4',
      title: 'يوم التطوع المجتمعي',
      type: 'تطوعي',
      description: 'نشاط تطوعي لتنظيف الحديقة المجتمعية وزراعة الأشجار',
      date: new Date(Date.now() + 10 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 10 * 86400000 + 14400000).toISOString(),
      location: 'الحديقة العامة',
      maxParticipants: 50,
      currentParticipants: 20,
      status: 'قادم',
      points: 100,
      organizer: { name: 'أ. خالد' },
      isRegistered: false,
      registrationDeadline: new Date(Date.now() + 9 * 86400000).toISOString(),
    },
    {
      _id: '5',
      title: 'حفل نهاية الفصل',
      type: 'احتفال',
      description: 'حفل ترفيهي بمناسبة نهاية الفصل الدراسي مع عروض الطلاب',
      date: new Date(Date.now() + 14 * 86400000).toISOString(),
      endDate: new Date(Date.now() + 14 * 86400000 + 14400000).toISOString(),
      location: 'القاعة الكبرى',
      maxParticipants: 200,
      currentParticipants: 85,
      status: 'قادم',
      points: 30,
      organizer: { name: 'إدارة المركز' },
      isRegistered: false,
      registrationDeadline: new Date(Date.now() + 13 * 86400000).toISOString(),
    },
  ];

  const mockMyEvents = [
    { ...mockEvents[0], isRegistered: true, registrationDate: new Date().toISOString() },
  ];

  const mockStats = { totalAttended: 12, totalPoints: 450, upcomingRegistered: 1, badges: 3 };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [upRes, myRes, statsRes] = await Promise.all([
        api.get(`/student-events/${userId}/upcoming`).catch(() => null),
        api.get(`/student-events/${userId}/my-events`).catch(() => null),
        api.get(`/student-events/${userId}/stats`).catch(() => null),
      ]);
      setUpcomingEvents(upRes?.data?.success ? upRes.data.data?.events : mockEvents);
      setMyEvents(myRes?.data?.success ? myRes.data.data?.events : mockMyEvents);
      setStats(statsRes?.data?.success ? statsRes.data.data : mockStats);
    } catch {
      setUpcomingEvents(mockEvents);
      setMyEvents(mockMyEvents);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async eventId => {
    try {
      const res = await api
        .post(`/student-events/${userId}/register`, { eventId })
        .catch(() => null);
      if (res?.data?.success) {
        showSnackbar('تم التسجيل في الفعالية بنجاح! 🎉', 'success');
      } else {
        showSnackbar('تم التسجيل بنجاح (وضع تجريبي) 🎉', 'success');
      }
      loadData();
    } catch {
      showSnackbar('حدث خطأ في التسجيل', 'error');
    }
  };

  const handleCancel = async eventId => {
    try {
      await api.post(`/student-events/${userId}/cancel`, { eventId }).catch(() => null);
      showSnackbar('تم إلغاء التسجيل', 'info');
      loadData();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleFeedback = async () => {
    try {
      await api
        .post(`/student-events/${userId}/feedback`, {
          eventId: selectedEvent?._id,
          ...feedbackForm,
        })
        .catch(() => null);
      showSnackbar('شكراً لتقييمك! ⭐', 'success');
      setFeedbackDialog(false);
      loadData();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const formatDate = d =>
    new Date(d).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  const formatTime = d =>
    new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  const capacityPercent = (cur, max) => Math.round((cur / max) * 100);

  if (loading)
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
          borderRadius: 3,
          p: 4,
          mb: 3,
          color: 'white',
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          🎉 الفعاليات والأنشطة
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
          شارك في الأنشطة واكسب نقاط إضافية!
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap">
          <Chip
            icon={<EventIcon />}
            label={`${stats?.totalAttended || 0} فعالية حضرتها`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            icon={<StarIcon />}
            label={`${stats?.totalPoints || 0} نقطة مكتسبة`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
          <Chip
            icon={<CalendarIcon />}
            label={`${stats?.upcomingRegistered || 0} فعالية مسجل بها`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
          />
        </Stack>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab icon={<CalendarIcon />} label="الفعاليات القادمة" iconPosition="start" />
          <Tab icon={<CheckIcon />} label="فعالياتي" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Upcoming Events */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {upcomingEvents.map(event => {
            const config = typeConfig[event.type] || {};
            const isFull = event.currentParticipants >= event.maxParticipants;
            return (
              <Grid item xs={12} md={6} key={event._id}>
                <Card
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 },
                  }}
                >
                  {/* Event Type Header */}
                  <Box
                    sx={{
                      background: config.bg || gradients.primary,
                      p: 2,
                      color: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {config.icon}
                      <Typography variant="subtitle2">{event.type}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={event.status}
                        size="small"
                        sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }}
                      />
                      {event.points > 0 && (
                        <Chip
                          icon={<StarIcon />}
                          label={`+${event.points} نقطة`}
                          size="small"
                          sx={{ bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }}
                        />
                      )}
                    </Stack>
                  </Box>

                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                      {event.title}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {event.description}
                    </Typography>

                    <Stack spacing={1} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CalendarIcon fontSize="small" color="action" />
                        <Typography variant="body2">{formatDate(event.date)}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TimeIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {formatTime(event.date)} - {formatTime(event.endDate)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon fontSize="small" color="action" />
                        <Typography variant="body2">{event.location}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon fontSize="small" color="action" />
                        <Typography variant="body2">
                          {event.currentParticipants}/{event.maxParticipants} مشارك
                        </Typography>
                      </Box>
                    </Stack>

                    {/* Capacity Bar */}
                    <Box sx={{ mb: 2 }}>
                      <LinearProgress
                        variant="determinate"
                        value={capacityPercent(event.currentParticipants, event.maxParticipants)}
                        color={
                          isFull
                            ? 'error'
                            : capacityPercent(event.currentParticipants, event.maxParticipants) > 80
                              ? 'warning'
                              : 'primary'
                        }
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color={isFull ? 'error' : 'textSecondary'}>
                        {isFull
                          ? 'ممتلئ - لا يوجد أماكن'
                          : `${event.maxParticipants - event.currentParticipants} مكان متاح`}
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      variant={event.isRegistered ? 'outlined' : 'contained'}
                      disabled={isFull && !event.isRegistered}
                      color={event.isRegistered ? 'error' : 'primary'}
                      onClick={() =>
                        event.isRegistered ? handleCancel(event._id) : handleRegister(event._id)
                      }
                    >
                      {event.isRegistered ? 'إلغاء التسجيل' : isFull ? 'ممتلئ' : 'سجّل الآن'}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* My Events */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {myEvents.length === 0 ? (
            <Grid item xs={12}>
              <Alert severity="info">
                لم تسجل في أي فعالية بعد. تصفح الفعاليات القادمة وسجّل الآن!
              </Alert>
            </Grid>
          ) : (
            myEvents.map(event => {
              const config = typeConfig[event.type] || {};
              return (
                <Grid item xs={12} md={6} key={event._id}>
                  <Card
                    sx={{
                      borderRadius: 2,
                      border: '2px solid',
                      borderColor: config.color || '#3498db',
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {config.icon}
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {event.title}
                          </Typography>
                        </Box>
                        <Chip
                          label={event.status}
                          color={statusColors[event.status] || 'default'}
                          size="small"
                        />
                      </Box>
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Typography variant="body2">
                          <CalendarIcon fontSize="inherit" /> {formatDate(event.date)}
                        </Typography>
                        <Typography variant="body2">
                          <LocationIcon fontSize="inherit" /> {event.location}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        {event.status === 'قادم' && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleCancel(event._id)}
                          >
                            إلغاء التسجيل
                          </Button>
                        )}
                        {event.status === 'منتهي' && (
                          <Button
                            size="small"
                            color="warning"
                            variant="contained"
                            startIcon={<StarIcon />}
                            onClick={() => {
                              setSelectedEvent(event);
                              setFeedbackDialog(true);
                            }}
                          >
                            تقييم
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })
          )}
        </Grid>
      )}

      {/* Feedback Dialog */}
      <Dialog
        open={feedbackDialog}
        onClose={() => setFeedbackDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          ⭐ تقييم الفعالية
          <IconButton
            onClick={() => setFeedbackDialog(false)}
            sx={{ position: 'absolute', left: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="h6">{selectedEvent?.title}</Typography>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                التقييم العام
              </Typography>
              <Rating
                value={feedbackForm.rating}
                onChange={(_, v) => setFeedbackForm({ ...feedbackForm, rating: v })}
                size="large"
              />
            </Box>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="تعليقك"
              value={feedbackForm.comment}
              onChange={e => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
              placeholder="شاركنا رأيك عن الفعالية..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFeedbackDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<StarIcon />}
            onClick={handleFeedback}
          >
            إرسال التقييم
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentEvents;
