import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Rating,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  VideoCall,
  Person,
  Group,
  Timer,
  Language,
  AccessibilityNew,
} from '@mui/icons-material';
import axios from 'axios';

const VirtualSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [registrationStep, setRegistrationStep] = useState(0);
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' });
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    fetchUpcomingSessions();
  }, []);

  const fetchUpcomingSessions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        'http://localhost:3001/api/community/sessions/upcoming'
      );
      setSessions(response.data.data);
    } catch (error) {
      console.error('خطأ في تحميل الجلسات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = (session) => {
    setSelectedSession(session);
    // Check if user is registered
    const token = localStorage.getItem('token');
    if (token) {
      // Decode token to get user ID (simplified)
      setIsRegistered(false);
    }
    setOpenDialog(true);
  };

  const handleRegister = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3001/api/community/sessions/${selectedSession._id}/register`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setIsRegistered(true);
      setRegistrationStep(1);
    } catch (error) {
      console.error('خطأ في التسجيل:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:3001/api/community/sessions/${selectedSession._id}/feedback`,
        feedback,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setFeedback({ rating: 0, comment: '' });
      setRegistrationStep(2);
    } catch (error) {
      console.error('خطأ في إرسال التعليق:', error);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSession(null);
    setRegistrationStep(0);
    setFeedback({ rating: 0, comment: '' });
    setIsRegistered(false);
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const sessionTypes = {
    workshop: 'ورشة عمل',
    webinar: 'ندوة',
    training: 'تدريب',
    consultation: 'استشارة',
    discussion_group: 'مجموعة نقاش',
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        ندوات وورش عمل افتراضية
      </Typography>

      <Grid container spacing={3}>
        {sessions.map((session) => (
          <Grid item xs={12} md={6} lg={4} key={session._id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: 6,
                },
              }}
              onClick={() => handleOpenSession(session)}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <VideoCall color="primary" />
                  <Chip
                    label={sessionTypes[session.sessionType] || session.sessionType}
                    color="primary"
                    size="small"
                  />
                </Box>

                <Typography variant="h6" component="h2" gutterBottom>
                  {session.title}
                </Typography>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {session.description.substring(0, 80)}...
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, fontSize: 'small' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Timer fontSize="small" />
                    <span>{formatDateTime(session.scheduledDate)}</span>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2, fontSize: 'small' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Group fontSize="small" />
                    <span>
                      {session.currentParticipants}/{session.maxParticipants}
                    </span>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Timer fontSize="small" />
                    <span>{session.duration} دقيقة</span>
                  </Box>
                </Box>

                {session.accessibilityServices && (
                  <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    {session.accessibilityServices.arabicSignLanguageInterpreter && (
                      <Chip label="مترجم لغة إشارة" size="small" icon={<AccessibilityNew />} />
                    )}
                    {session.accessibilityServices.liveSubtitles && (
                      <Chip label="ترجمة فورية" size="small" />
                    )}
                    {session.accessibilityServices.audioDescription && (
                      <Chip label="وصف صوتي" size="small" />
                    )}
                  </Box>
                )}

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  onClick={() => handleOpenSession(session)}
                >
                  عرض التفاصيل والتسجيل
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Session Details Dialog */}
      {selectedSession && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedSession.title}</DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <Stepper activeStep={registrationStep} sx={{ mb: 3 }}>
              <Step>
                <StepLabel>التفاصيل</StepLabel>
              </Step>
              <Step>
                <StepLabel>التسجيل</StepLabel>
              </Step>
              <Step>
                <StepLabel>التعليق</StepLabel>
              </Step>
            </Stepper>

            {registrationStep === 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  {sessionTypes[selectedSession.sessionType]}
                </Typography>

                <Typography variant="body2" paragraph>
                  {selectedSession.description}
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    معلومات الجلسة:
                  </Typography>
                  <Typography variant="body2">
                    📅 {formatDateTime(selectedSession.scheduledDate)}
                  </Typography>
                  <Typography variant="body2">
                    ⏱️ المدة: {selectedSession.duration} دقيقة
                  </Typography>
                  <Typography variant="body2">
                    👥 المشاركون: {selectedSession.currentParticipants}/{selectedSession.maxParticipants}
                  </Typography>
                </Box>

                {selectedSession.accessibilityServices && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      مميزات إمكانية الوصول:
                    </Typography>
                    {selectedSession.accessibilityServices.arabicSignLanguageInterpreter && (
                      <Typography variant="caption">✓ مترجم لغة إشارة عربية</Typography>
                    )}
                    {selectedSession.accessibilityServices.liveSubtitles && (
                      <Typography variant="caption">✓ ترجمة نصية فورية</Typography>
                    )}
                    {selectedSession.accessibilityServices.audioDescription && (
                      <Typography variant="caption">✓ وصف صوتي</Typography>
                    )}
                  </Alert>
                )}
              </>
            )}

            {registrationStep === 1 && (
              <Alert severity="success">
                شكراً لتسجيلك في الجلسة! سيتم إرسال رابط الجلسة إلى بريدك الإلكتروني قبل البداية.
              </Alert>
            )}

            {registrationStep === 2 && (
              <Alert severity="success">
                شكراً لتقييمك وتعليقك! ردود الفعل تساعدنا على تحسين خدماتنا.
              </Alert>
            )}
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseDialog}>إغلاق</Button>
            {registrationStep === 0 && !isRegistered && (
              <Button variant="contained" color="primary" onClick={handleRegister}>
                التسجيل الآن
              </Button>
            )}
            {registrationStep === 1 && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setRegistrationStep(2)}
              >
                إضافة تقييم
              </Button>
            )}
          </DialogActions>
        </Dialog>
      )}

      {/* Feedback Dialog */}
      {registrationStep === 2 && selectedSession && (
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>أضف تقييماً للجلسة</DialogTitle>
          <DialogContent sx={{ py: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography component="legend">التقييم:</Typography>
              <Rating
                value={feedback.rating}
                onChange={(e, value) => setFeedback({ ...feedback, rating: value })}
                size="large"
              />
            </Box>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="تعليقك"
              value={feedback.comment}
              onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
              placeholder="شارك آراءك وملاحظاتك حول الجلسة..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>إلغاء</Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmitFeedback}
              disabled={feedback.rating === 0}
            >
              إرسال التقييم
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Container>
  );
};

export default VirtualSessions;
