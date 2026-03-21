import { useState, useEffect } from 'react';




import { parentService } from 'services/parentService';
import logger from 'utils/logger';
import { gradients, brandColors, statusColors, neutralColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';

const ParentDashboard = () => {
  const { currentUser } = useAuth();
  const showSnackbar = useSnackbar();
  const userId = currentUser?._id || currentUser?.id || '';
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await parentService.getParentDashboard(userId);
        setDashboardData(data);
        if (data?.children?.length > 0) {
          setSelectedChild(data.children[0]);
        }
      } catch (err) {
        logger.error('Failed to load parent dashboard:', err);
        setError(err.message || 'حدث خطأ في تحميل لوحة التحكم');
        showSnackbar('حدث خطأ أثناء تحميل لوحة معلومات ولي الأمر', 'error');
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

  if (!dashboardData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

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
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SchoolIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              لوحة معلومات الأب/الأم
            </Typography>
            <Typography variant="body2">متابعة تقدم أطفالك والتواصل مع المعالجين</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {dashboardData.children?.map(child => (
            <Chip
              key={child.id}
              label={child.name}
              onClick={() => setSelectedChild(child)}
              variant={selectedChild?.id === child.id ? 'filled' : 'outlined'}
              sx={{
                backgroundColor:
                  selectedChild?.id === child.id ? 'rgba(255,255,255,0.3)' : 'transparent',
                color: 'white',
              }}
            />
          ))}
        </Box>
      </Box>

      {selectedChild && (
        <>
          {/* Child Info Card */}
          <Card sx={{ mb: 4 }}>
            <CardHeader
              avatar={
                <Avatar
                  sx={{
                    width: 60,
                    height: 60,
                    backgroundColor: brandColors.primaryStart,
                  }}
                >
                  {selectedChild.name.charAt(0)}
                </Avatar>
              }
              title={selectedChild.name}
              subheader={`العمر: ${selectedChild.age} سنة`}
            />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 'bold', color: brandColors.primaryStart }}
                    >
                      {selectedChild.overallProgress}%
                    </Typography>
                    <Typography variant="caption">التقدم الإجمالي</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 'bold', color: statusColors.success }}
                    >
                      {selectedChild.attendance}%
                    </Typography>
                    <Typography variant="caption">نسبة الحضور</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 'bold', color: statusColors.warning }}
                    >
                      {selectedChild.sessionsCompleted}
                    </Typography>
                    <Typography variant="caption">جلسات مكتملة</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: statusColors.info }}>
                      {selectedChild.nextSessionDays}
                    </Typography>
                    <Typography variant="caption">أيام للجلسة القادمة</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} sx={{ mb: 3 }}>
            <Tab label="التقدم والمهارات" />
            <Tab label="الجلسات القادمة" />
            <Tab label="التواصل" />
            <Tab label="المستندات" />
          </Tabs>

          {/* Tab 0: Progress */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              {selectedChild.skills?.map(skill => (
                <Grid item xs={12} md={6} key={skill.id}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          mb: 1,
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {skill.name}
                        </Typography>
                        <Chip
                          label={skill.status}
                          color={
                            skill.status === 'محسّن'
                              ? 'success'
                              : skill.status === 'مستقر'
                                ? 'info'
                                : 'warning'
                          }
                          size="small"
                        />
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={skill.progress}
                        sx={{ mb: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                        {' '}
                        - آخر تحديث: {skill.lastUpdate}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 1: Upcoming Sessions */}
          {tabValue === 1 && (
            <Card>
              <CardHeader title="الجلسات القادمة" />
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: surfaceColors.lightGray }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>التاريخ</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الوقت</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>المعالج</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>النوع</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>الإجراء</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedChild.upcomingSessions?.map(session => (
                      <TableRow key={session.id} hover>
                        <TableCell>{session.date}</TableCell>
                        <TableCell>{session.time}</TableCell>
                        <TableCell>{session.therapist}</TableCell>
                        <TableCell>
                          <Chip label={session.type} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              setSelectedSession(session);
                              setOpenDialog(true);
                            }}
                          >
                            تفاصيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* Tab 2: Communication */}
          {tabValue === 2 && (
            <Grid container spacing={3}>
              {selectedChild.therapists?.map(therapist => (
                <Grid item xs={12} md={6} key={therapist.id}>
                  <Card>
                    <CardHeader
                      avatar={<Avatar sx={{ backgroundColor: brandColors.primaryStart }}></Avatar>}
                      title={therapist.name}
                      subheader={therapist.specialization}
                    />
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PhoneIcon sx={{ fontSize: 18, color: brandColors.primaryStart }} />
                          <Typography variant="body2">{therapist.phone}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 18, color: brandColors.primaryStart }} />
                          <Typography variant="body2">{therapist.email}</Typography>
                        </Box>
                      </Box>
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        sx={{
                          background: gradients.primary,
                        }}
                      >
                        إرسال رسالة
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Tab 3: Documents */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              {selectedChild.documents?.map(doc => (
                <Grid item xs={12} md={6} key={doc.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {doc.title}
                        </Typography>
                        <Chip label={doc.type} size="small" />
                      </Box>
                      <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                        {doc.date}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button size="small" variant="outlined">
                          عرض
                        </Button>
                        <Button size="small" variant="outlined" sx={{ ml: 1 }}>
                          تحميل
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Alerts Section */}
      <Box sx={{ mt: 4 }}>
        <Card>
          <CardHeader
            title="تنبيهات مهمة"
            avatar={<WarningIcon sx={{ color: statusColors.warning }} />}
          />
          <CardContent>
            {dashboardData.alerts?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dashboardData.alerts.map(alert => (
                  <Box
                    key={alert.id}
                    sx={{
                      p: 2,
                      borderLeft: '3px solid',
                      borderLeftColor: 'warning.main',
                      bgcolor: 'warning.lighter',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {alert.date}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: neutralColors.textMuted }}>
                لا توجد تنبيهات حالية
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Details Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setSelectedSession(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تفاصيل الجلسة</DialogTitle>
        <DialogContent>
          {selectedSession ? (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                المعالج: {selectedSession.therapist || 'غير محدد'}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                التاريخ: {selectedSession.date || 'غير محدد'}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                الوقت: {selectedSession.time || 'غير محدد'}
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                النوع: {selectedSession.type || 'غير محدد'}
              </Typography>
              {selectedSession.location && (
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  المكان: {selectedSession.location}
                </Typography>
              )}
              {selectedSession.notes && (
                <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                  ملاحظات: {selectedSession.notes}
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
              لا توجد بيانات لعرضها
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setSelectedSession(null);
            }}
          >
            إغلاق
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ParentDashboard;
