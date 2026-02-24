import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  Avatar,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
} from '@mui/material';
import { Phone as PhoneIcon, Email as EmailIcon, Warning as WarningIcon, School as SchoolIcon } from '@mui/icons-material';
import { parentService } from '../services/parentService';

const ParentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getParentDashboard('parent001');
      setDashboardData(data);
      if (data?.children?.length > 0) {
        setSelectedChild(data.children[0]);
      }
    };
    fetchData();
  }, []);

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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                backgroundColor: selectedChild?.id === child.id ? 'rgba(255,255,255,0.3)' : 'transparent',
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
                    backgroundColor: '#667eea',
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
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#667eea' }}>
                      {selectedChild.overallProgress}%
                    </Typography>
                    <Typography variant="caption">التقدم الإجمالي</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#4CAF50' }}>
                      {selectedChild.attendance}%
                    </Typography>
                    <Typography variant="caption">نسبة الحضور</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#FF9800' }}>
                      {selectedChild.sessionsCompleted}
                    </Typography>
                    <Typography variant="caption">جلسات مكتملة</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2196F3' }}>
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
                          color={skill.status === 'محسّن' ? 'success' : skill.status === 'مستقر' ? 'info' : 'warning'}
                          size="small"
                        />
                      </Box>
                      <LinearProgress variant="determinate" value={skill.progress} sx={{ mb: 1, height: 8, borderRadius: 4 }} />
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        {skill.progress}% - آخر تحديث: {skill.lastUpdate}
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
                    <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
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
                          <Button size="small" variant="outlined" onClick={() => setOpenDialog(true)}>
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
                      avatar={<Avatar sx={{ backgroundColor: '#667eea' }}>{therapist.name.charAt(0)}</Avatar>}
                      title={therapist.name}
                      subheader={therapist.specialization}
                    />
                    <CardContent>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <PhoneIcon sx={{ fontSize: 18, color: '#667eea' }} />
                          <Typography variant="body2">{therapist.phone}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: 18, color: '#667eea' }} />
                          <Typography variant="body2">{therapist.email}</Typography>
                        </Box>
                      </Box>
                      <Button
                        fullWidth
                        variant="contained"
                        size="small"
                        sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                      <Typography variant="caption" sx={{ color: '#999' }}>
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
          <CardHeader title="تنبيهات مهمة" avatar={<WarningIcon sx={{ color: '#FF9800' }} />} />
          <CardContent>
            {dashboardData.alerts?.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {dashboardData.alerts.map(alert => (
                  <Box
                    key={alert.id}
                    sx={{
                      p: 2,
                      borderLeft: '3px solid #FF9800',
                      backgroundColor: '#fff8e1',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {alert.message}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      {alert.date}
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ color: '#999' }}>
                لا توجد تنبيهات حالية
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Details Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تفاصيل الجلسة</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              المعالج: فاطمة علي
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              التاريخ: 2025-01-20
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              الوقت: 02:00 PM
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              النوع: جلسة فردية
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
              المكان: العيادة الرئيسية
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ParentDashboard;
