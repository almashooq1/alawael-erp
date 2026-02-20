import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Tabs,
  Tab,
  Chip,
  Avatar,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Attachment as AttachmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Print as PrintIcon,
  Share as ShareIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationOnIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CaseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchCaseDetails();
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/case-management/${id}`);
      setCaseData(response.data.data);
    } catch (error) {
      console.error('خطأ في جلب تفاصيل الحالة:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status) => {
    const colors = {
      'جديدة': 'info',
      'قيد الدراسة': 'warning',
      'نشطة': 'success',
      'متوقفة': 'default',
      'مكتملة': 'primary',
      'ملغاة': 'error'
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      'عادية': 'default',
      'متوسطة': 'info',
      'عالية': 'warning',
      'عاجلة': 'error'
    };
    return colors[priority] || 'default';
  };

  if (loading) {
    return (
      <Container>
        <Typography>جاري التحميل...</Typography>
      </Container>
    );
  }

  if (!caseData) {
    return (
      <Container>
        <Typography>لم يتم العثور على الحالة</Typography>
      </Container>
    );
  }

  const { case: caseInfo, statistics, latestDiagnosis, activeTreatmentPlan } = caseData;

  return (
    <Container maxWidth="xl">
      {/* رأس الصفحة */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/case-management')}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4">
              {caseInfo.beneficiary.name}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {caseInfo.caseNumber}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button startIcon={<PrintIcon />} variant="outlined">
            طباعة
          </Button>
          <Button startIcon={<ShareIcon />} variant="outlined">
            مشاركة
          </Button>
          <Button
            startIcon={<EditIcon />}
            variant="contained"
            onClick={() => navigate(`/case-management/${id}/edit`)}
          >
            تعديل
          </Button>
        </Box>
      </Box>

      {/* بطاقات المعلومات الأساسية */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box textAlign="center">
                <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
                  {caseInfo.beneficiary.name.charAt(0)}
                </Avatar>
                <Typography variant="h6">
                  {caseInfo.beneficiary.name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {caseInfo.beneficiary.age} سنة • {caseInfo.beneficiary.gender}
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Chip
                    label={caseInfo.status}
                    color={getStatusColor(caseInfo.status)}
                    size="small"
                  />
                  <Chip
                    label={caseInfo.priority}
                    color={getPriorityColor(caseInfo.priority)}
                    size="small"
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات الاتصال
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <PhoneIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="الهاتف"
                    secondary={caseInfo.beneficiary.phone || 'غير متوفر'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <EmailIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="البريد الإلكتروني"
                    secondary={caseInfo.beneficiary.email || 'غير متوفر'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemAvatar>
                    <Avatar>
                      <LocationOnIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="العنوان"
                    secondary={caseInfo.beneficiary.address?.city || 'غير متوفر'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                الإحصائيات
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {statistics.totalDiagnoses}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      تشخيصات
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="success.main">
                      {statistics.totalTreatmentPlans}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      خطط علاج
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="info.main">
                      {statistics.totalSessions}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      جلسات
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="warning.main">
                      {statistics.totalFiles}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      ملفات
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                معلومات مهمة
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="تاريخ التسجيل"
                    secondary={format(new Date(caseInfo.registrationDate), 'dd MMMM yyyy', { locale: ar })}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="آخر زيارة"
                    secondary={caseInfo.lastVisitDate
                      ? format(new Date(caseInfo.lastVisitDate), 'dd MMMM yyyy', { locale: ar })
                      : 'لم يتم التحديد'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="الموعد القادم"
                    secondary={caseInfo.nextAppointmentDate
                      ? format(new Date(caseInfo.nextAppointmentDate), 'dd MMMM yyyy', { locale: ar })
                      : 'لم يتم التحديد'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* التبويبات */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable">
          <Tab label="السجل الطبي" />
          <Tab label="التشخيصات" />
          <Tab label="خطط العلاج" />
          <Tab label="الملفات الطبية" />
          <Tab label="الملاحظات" />
          <Tab label="الفريق" />
        </Tabs>
      </Paper>

      {/* محتوى التبويبات */}
      <Box>
        {/* السجل الطبي */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader title="المعلومات الطبية الأساسية" />
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="textSecondary">
                        فصيلة الدم
                      </Typography>
                      <Typography variant="body1">
                        {caseInfo.medicalRecord?.bloodType || 'غير محدد'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardHeader
                  title="الحساسية"
                  action={
                    <Badge badgeContent={caseInfo.medicalRecord?.allergies?.length || 0} color="error">
                      <HospitalIcon />
                    </Badge>
                  }
                />
                <CardContent>
                  {caseInfo.medicalRecord?.allergies?.length > 0 ? (
                    <List dense>
                      {caseInfo.medicalRecord.allergies.map((allergy, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={allergy.name}
                            secondary={`الشدة: ${allergy.severity}`}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      لا توجد حساسية مسجلة
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="الأمراض المزمنة"
                  action={
                    <Badge badgeContent={caseInfo.medicalRecord?.chronicDiseases?.length || 0} color="warning">
                      <AssignmentIcon />
                    </Badge>
                  }
                />
                <CardContent>
                  {caseInfo.medicalRecord?.chronicDiseases?.length > 0 ? (
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>المرض</TableCell>
                            <TableCell>تاريخ التشخيص</TableCell>
                            <TableCell>الحالة</TableCell>
                            <TableCell>الأدوية</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {caseInfo.medicalRecord.chronicDiseases.map((disease, index) => (
                            <TableRow key={index}>
                              <TableCell>{disease.name}</TableCell>
                              <TableCell>
                                {disease.diagnosisDate
                                  ? format(new Date(disease.diagnosisDate), 'dd/MM/yyyy', { locale: ar })
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <Chip label={disease.status} size="small" />
                              </TableCell>
                              <TableCell>{disease.medications || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      لا توجد أمراض مزمنة مسجلة
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* التشخيصات */}
        {activeTab === 1 && (
          <Card>
            <CardHeader title="التشخيصات" />
            <CardContent>
              {caseInfo.diagnoses.length > 0 ? (
                <Timeline position="alternate">
                  {caseInfo.diagnoses
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((diagnosis, index) => (
                      <TimelineItem key={index}>
                        <TimelineOppositeContent color="textSecondary">
                          {format(new Date(diagnosis.date), 'dd MMMM yyyy', { locale: ar })}
                        </TimelineOppositeContent>
                        <TimelineSeparator>
                          <TimelineDot color="primary">
                            <HospitalIcon />
                          </TimelineDot>
                          {index < caseInfo.diagnoses.length - 1 && <TimelineConnector />}
                        </TimelineSeparator>
                        <TimelineContent>
                          <Paper elevation={3} sx={{ p: 2 }}>
                            <Typography variant="h6">{diagnosis.specialty}</Typography>
                            <Typography variant="body2" color="textSecondary">
                              الطبيب: {diagnosis.doctor.name}
                            </Typography>
                            <Typography variant="body1" sx={{ mt: 1 }}>
                              {diagnosis.diagnosis}
                            </Typography>
                            {diagnosis.severity && (
                              <Chip
                                label={`الشدة: ${diagnosis.severity}`}
                                size="small"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </Paper>
                        </TimelineContent>
                      </TimelineItem>
                    ))}
                </Timeline>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد تشخيصات مسجلة
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* خطط العلاج */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            {caseInfo.treatmentPlans.length > 0 ? (
              caseInfo.treatmentPlans.map((plan, index) => (
                <Grid item xs={12} key={index}>
                  <Card>
                    <CardHeader
                      title={plan.goal}
                      subheader={`${format(new Date(plan.startDate), 'dd/MM/yyyy', { locale: ar })} - ${plan.endDate ? format(new Date(plan.endDate), 'dd/MM/yyyy', { locale: ar }) : 'مستمر'}`}
                      action={
                        <Chip label={plan.status} color={plan.status === 'قيد التنفيذ' ? 'success' : 'default'} />
                      }
                    />
                    <CardContent>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography>الجلسات ({plan.sessions.length})</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>رقم الجلسة</TableCell>
                                  <TableCell>التاريخ</TableCell>
                                  <TableCell>النوع</TableCell>
                                  <TableCell>المعالج</TableCell>
                                  <TableCell>التقدم</TableCell>
                                  <TableCell>مكتملة</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {plan.sessions.map((session, sIndex) => (
                                  <TableRow key={sIndex}>
                                    <TableCell>{session.sessionNumber}</TableCell>
                                    <TableCell>
                                      {session.date
                                        ? format(new Date(session.date), 'dd/MM/yyyy', { locale: ar })
                                        : '-'}
                                    </TableCell>
                                    <TableCell>{session.type}</TableCell>
                                    <TableCell>{session.therapist?.name || '-'}</TableCell>
                                    <TableCell>
                                      {session.progress && <Chip label={session.progress} size="small" />}
                                    </TableCell>
                                    <TableCell>
                                      {session.completed ? (
                                        <CheckCircleIcon color="success" />
                                      ) : (
                                        <ScheduleIcon color="disabled" />
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </AccordionDetails>
                      </Accordion>
                    </CardContent>
                  </Card>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  لا توجد خطط علاج مسجلة
                </Typography>
              </Grid>
            )}
          </Grid>
        )}

        {/* الملفات الطبية */}
        {activeTab === 3 && (
          <Card>
            <CardHeader title="الملفات الطبية المرفقة" />
            <CardContent>
              {caseInfo.medicalFiles.length > 0 ? (
                <Grid container spacing={2}>
                  {caseInfo.medicalFiles.map((file, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <AttachmentIcon color="primary" />
                            <Typography variant="body2" fontWeight="bold" noWrap>
                              {file.fileName}
                            </Typography>
                          </Box>
                          <Chip label={file.fileType} size="small" sx={{ mb: 1 }} />
                          <Typography variant="caption" display="block" color="textSecondary">
                            {format(new Date(file.uploadDate), 'dd/MM/yyyy', { locale: ar })}
                          </Typography>
                          <Typography variant="caption" display="block" color="textSecondary">
                            {(file.fileSize / 1024).toFixed(2)} KB
                          </Typography>
                        </CardContent>
                        <CardContent sx={{ pt: 0 }}>
                          <Box display="flex" gap={1}>
                            <Tooltip title="عرض">
                              <IconButton size="small">
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="تحميل">
                              <IconButton size="small">
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد ملفات مرفقة
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* الملاحظات */}
        {activeTab === 4 && (
          <Card>
            <CardHeader title="الملاحظات" />
            <CardContent>
              {caseInfo.notes.length > 0 ? (
                <List>
                  {caseInfo.notes
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((note, index) => (
                      <React.Fragment key={index}>
                        <ListItem alignItems="flex-start">
                          <ListItemAvatar>
                            <Avatar>{note.author?.name?.charAt(0) || 'U'}</Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box display="flex" alignItems="center" gap={1}>
                                <Typography variant="body2" fontWeight="bold">
                                  {note.author?.name || 'مستخدم'}
                                </Typography>
                                <Chip label={note.category} size="small" />
                                <Typography variant="caption" color="textSecondary">
                                  {format(new Date(note.date), 'dd/MM/yyyy HH:mm', { locale: ar })}
                                </Typography>
                              </Box>
                            }
                            secondary={<Typography variant="body2">{note.content}</Typography>}
                          />
                        </ListItem>
                        {index < caseInfo.notes.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا توجد ملاحظات
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {/* الفريق */}
        {activeTab === 5 && (
          <Card>
            <CardHeader title="فريق العمل" />
            <CardContent>
              {caseInfo.team.length > 0 ? (
                <Grid container spacing={2}>
                  {caseInfo.team
                    .filter((member) => member.active)
                    .map((member, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box display="flex" alignItems="center" gap={2}>
                              <Avatar>{member.member?.name?.charAt(0) || 'U'}</Avatar>
                              <Box>
                                <Typography variant="body1" fontWeight="bold">
                                  {member.member?.name || 'غير محدد'}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                  {member.role}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                  منذ: {format(new Date(member.assignedDate), 'dd/MM/yyyy', { locale: ar })}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  لا يوجد فريق مسجل
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Container>
  );
};

export default CaseDetails;
