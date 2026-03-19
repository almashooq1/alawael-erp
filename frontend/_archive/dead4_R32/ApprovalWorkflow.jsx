import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  TextField,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  Alert,
  Badge,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Schedule as PendingIcon,
  Edit as EditIcon,
  ArrowForward as ForwardIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import axios from 'axios';

// مراحل الموافقة
const APPROVAL_STAGES = {
  draft: { label: 'مسودة', color: 'default', icon: <EditIcon /> },
  pending: { label: 'قيد المراجعة', color: 'warning', icon: <PendingIcon /> },
  approved: { label: 'تمت الموافقة', color: 'success', icon: <ApproveIcon /> },
  rejected: { label: 'مرفوض', color: 'error', icon: <RejectIcon /> },
  returned: { label: 'معاد', color: 'info', icon: <ForwardIcon /> },
  completed: { label: 'مكتمل', color: 'success', icon: <ApproveIcon /> },
};

// مستويات الصلاحيات
const _PERMISSION_LEVELS = {
  view: { label: 'عرض فقط', color: 'info' },
  edit: { label: 'تعديل', color: 'primary' },
  approve: { label: 'موافقة', color: 'success' },
  admin: { label: 'إدارة كاملة', color: 'secondary' },
};

const ApprovalWorkflow = ({ communicationId }) => {
  const [workflow, setWorkflow] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [approvalAction, setApprovalAction] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [_loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadWorkflow();
    loadCurrentUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communicationId]);

  const loadWorkflow = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/communications/${communicationId}/workflow`);
      setWorkflow(response.data);
      setActiveStep(response.data.currentStage);
    } catch (error) {
      console.error('Error loading workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleApprovalAction = async () => {
    try {
      const response = await axios.post(`/api/communications/${communicationId}/workflow/action`, {
        action: approvalAction,
        comments: approvalComments,
        stage: activeStep,
      });
      setWorkflow(response.data);
      setShowApprovalDialog(false);
      setApprovalComments('');
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('خطأ في معالجة الموافقة');
    }
  };

  const canApprove = (stage) => {
    if (!currentUser || !workflow) return false;
    const stageData = workflow.stages[stage];
    return stageData.approvers.some(a => a.userId === currentUser.id) &&
           stageData.status === 'pending';
  };

  const formatDate = (date) => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });
  };

  if (!workflow) return <Typography>جاري التحميل...</Typography>;

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            سير عمل الموافقات
          </Typography>

          {/* معلومات عامة */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Alert severity={workflow.status === 'completed' ? 'success' : 'info'} icon={false}>
                <Typography variant="subtitle2">الحالة الحالية</Typography>
                <Chip
                  label={APPROVAL_STAGES[workflow.status]?.label}
                  color={APPROVAL_STAGES[workflow.status]?.color}
                  icon={APPROVAL_STAGES[workflow.status]?.icon}
                  size="small"
                />
              </Alert>
            </Grid>
            <Grid item xs={12} md={6}>
              <Alert severity="info" icon={false}>
                <Typography variant="subtitle2">التقدم</Typography>
                <Typography variant="h6">
                  {workflow.currentStage + 1} من {workflow.stages.length} مراحل
                </Typography>
              </Alert>
            </Grid>
          </Grid>

          {/* مراحل الموافقة */}
          <Stepper activeStep={activeStep} orientation="vertical">
            {workflow.stages.map((stage, index) => (
              <Step key={stage.id}>
                <StepLabel
                  optional={
                    <Typography variant="caption">
                      {stage.status === 'completed' && `تمت الموافقة في ${formatDate(stage.completedAt)}`}
                      {stage.status === 'pending' && 'قيد المراجعة'}
                      {stage.status === 'rejected' && `تم الرفض في ${formatDate(stage.completedAt)}`}
                    </Typography>
                  }
                  StepIconProps={{
                    icon: stage.status === 'completed' ? <ApproveIcon /> :
                          stage.status === 'rejected' ? <RejectIcon /> :
                          <PendingIcon />
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {stage.name}
                    </Typography>
                    {stage.required && (
                      <Chip label="إلزامي" size="small" color="error" />
                    )}
                  </Box>
                </StepLabel>
                <StepContent>
                  <Box sx={{ mb: 2 }}>
                    {/* المعتمدون */}
                    <Typography variant="subtitle2" gutterBottom>
                      المعتمدون المطلوبون:
                    </Typography>
                    <List dense>
                      {stage.approvers.map((approver) => (
                        <ListItem key={approver.id}>
                          <ListItemAvatar>
                            <Badge
                              badgeContent={
                                approver.status === 'approved' ? <ApproveIcon fontSize="small" /> :
                                approver.status === 'rejected' ? <RejectIcon fontSize="small" /> :
                                null
                              }
                              color={approver.status === 'approved' ? 'success' : 'error'}
                            >
                              <Avatar src={approver.avatar}>
                                {approver.name?.charAt(0)}
                              </Avatar>
                            </Badge>
                          </ListItemAvatar>
                          <ListItemText
                            primary={approver.name}
                            secondary={
                              <>
                                <Typography variant="caption" display="block">
                                  {approver.role} - {approver.department}
                                </Typography>
                                {approver.approvedAt && (
                                  <Typography variant="caption" color="success.main">
                                    وافق في: {formatDate(approver.approvedAt)}
                                  </Typography>
                                )}
                                {approver.comments && (
                                  <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    💬 {approver.comments}
                                  </Typography>
                                )}
                              </>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>

                    {/* أزرار الإجراءات */}
                    {canApprove(index) && (
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<ThumbUpIcon />}
                          onClick={() => {
                            setApprovalAction('approve');
                            setShowApprovalDialog(true);
                          }}
                        >
                          موافقة
                        </Button>
                        <Button
                          variant="contained"
                          color="error"
                          startIcon={<ThumbDownIcon />}
                          onClick={() => {
                            setApprovalAction('reject');
                            setShowApprovalDialog(true);
                          }}
                        >
                          رفض
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<ForwardIcon />}
                          onClick={() => {
                            setApprovalAction('return');
                            setShowApprovalDialog(true);
                          }}
                        >
                          إعادة
                        </Button>
                      </Box>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* التايم لاين */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            سجل الإجراءات
          </Typography>
          <Timeline>
            {workflow.history?.map((event, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary">
                  {formatDate(event.timestamp)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={
                    event.action === 'approved' ? 'success' :
                    event.action === 'rejected' ? 'error' :
                    'primary'
                  }>
                    {event.action === 'approved' ? <ApproveIcon /> :
                     event.action === 'rejected' ? <RejectIcon /> :
                     <InfoIcon />}
                  </TimelineDot>
                  {index < workflow.history.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {event.userName}
                  </Typography>
                  <Typography variant="body2">
                    {event.action === 'approved' && 'وافق على المراسلة'}
                    {event.action === 'rejected' && 'رفض المراسلة'}
                    {event.action === 'returned' && 'أعاد المراسلة'}
                    {event.action === 'created' && 'أنشأ المراسلة'}
                  </Typography>
                  {event.comments && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      💬 {event.comments}
                    </Typography>
                  )}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </CardContent>
      </Card>

      {/* نافذة إجراء الموافقة */}
      <Dialog open={showApprovalDialog} onClose={() => setShowApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalAction === 'approve' && 'الموافقة على المراسلة'}
          {approvalAction === 'reject' && 'رفض المراسلة'}
          {approvalAction === 'return' && 'إعادة المراسلة'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="التعليقات"
            value={approvalComments}
            onChange={(e) => setApprovalComments(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="أضف تعليقاتك هنا..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApprovalDialog(false)}>إلغاء</Button>
          <Button
            onClick={handleApprovalAction}
            variant="contained"
            color={approvalAction === 'approve' ? 'success' : 'error'}
          >
            تأكيد
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalWorkflow;
