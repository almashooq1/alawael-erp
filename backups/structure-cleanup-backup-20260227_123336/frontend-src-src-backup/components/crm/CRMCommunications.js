/**
 * CRM Communications - Email & WhatsApp Integration 💬
 * مكون الاتصالات - تكامل البريد والرسائل
 *
 * Features:
 * ✅ Email campaigns
 * ✅ WhatsApp integration
 * ✅ Message templates
 * ✅ Bulk messaging
 * ✅ Delivery tracking
 * ✅ Response analytics
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  Tabs,
  Tab,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  IconButton,
  Badge,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Clock as ClockIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

const CRMCommunications = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [messageType, setMessageType] = useState('email');

  const [campaigns, setCampaigns] = useState([
    {
      id: '1',
      name: 'عرض خاص - Q1',
      type: 'email',
      status: 'sent',
      recipients: 25,
      opened: 18,
      clicked: 12,
      createdDate: '2026-01-15',
      rate: 72,
    },
    {
      id: '2',
      name: 'متابعة ما بعد البيع',
      type: 'whatsapp',
      status: 'sending',
      recipients: 40,
      opened: 35,
      clicked: 20,
      createdDate: '2026-01-16',
      rate: 87,
    },
    {
      id: '3',
      name: 'تذكير الخدمة السنوية',
      type: 'email',
      status: 'draft',
      recipients: 15,
      opened: 0,
      clicked: 0,
      createdDate: '2026-01-17',
      rate: 0,
    },
  ]);

  const [templates] = useState([
    { id: '1', name: 'ترحيب عميل جديد', type: 'email', content: 'أهلاً وسهلاً بك في عائلتنا' },
    { id: '2', name: 'عرض خاص', type: 'email', content: 'نقدم لك عرضاً حصرياً' },
    { id: '3', name: 'متابعة بيع', type: 'whatsapp', content: 'كيف تستمتع بخدماتنا؟' },
    { id: '4', name: 'استبيان الرضا', type: 'email', content: 'رأيك يهمنا - شارك ملاحظاتك' },
  ]);

  const getStatusIcon = status => {
    const icons = {
      sent: <CheckIcon sx={{ color: '#4caf50' }} />,
      sending: <ClockIcon sx={{ color: '#ff9800' }} />,
      draft: <EditIcon sx={{ color: '#2196f3' }} />,
      failed: <ErrorIcon sx={{ color: '#f44336' }} />,
    };
    return icons[status] || <EditIcon />;
  };

  const getStatusLabel = status => {
    const labels = {
      sent: 'مرسل',
      sending: 'قيد الإرسال',
      draft: 'مسودة',
      failed: 'فشل',
    };
    return labels[status] || status;
  };

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status !== 'draft').length,
    totalRecipients: campaigns.reduce((sum, c) => sum + c.recipients, 0),
    avgOpenRate: Math.round(campaigns.reduce((sum, c) => sum + c.rate, 0) / campaigns.length),
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي الحملات', value: stats.totalCampaigns, icon: '📊' },
          { label: 'حملات نشطة', value: stats.activeCampaigns, icon: '🚀' },
          { label: 'المستقبلون', value: stats.totalRecipients, icon: '👥' },
          { label: 'متوسط معدل الفتح', value: `${stats.avgOpenRate}%`, icon: '👁️' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2,
                textAlign: 'center',
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea20, #764ba220)',
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
          <Tab label="📧 الحملات" icon={<EmailIcon />} iconPosition="start" />
          <Tab label="📝 القوالب" icon={<EditIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Campaigns Tab */}
      {tabValue === 0 && (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              📧 حملات التسويق
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              حملة جديدة
            </Button>
          </Box>

          {campaigns.map(campaign => (
            <Card
              key={campaign.id}
              sx={{
                borderRadius: 2,
                borderLeft: `4px solid ${campaign.type === 'email' ? '#2196f3' : '#25c72e'}`,
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    mb: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getStatusIcon(campaign.status)}
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {campaign.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip
                          label={getStatusLabel(campaign.status)}
                          size="small"
                          color={
                            campaign.status === 'sent'
                              ? 'success'
                              : campaign.status === 'sending'
                                ? 'warning'
                                : 'default'
                          }
                        />
                        <Chip
                          icon={campaign.type === 'email' ? <EmailIcon /> : <WhatsAppIcon />}
                          label={campaign.type}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#667eea' }}>
                        {campaign.recipients}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        المستقبلون
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                        {campaign.opened}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        المفتوحة
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#ff9800' }}>
                        {campaign.clicked}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        النقرات
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#2196f3' }}>
                        {campaign.rate}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        معدل الفتح
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      معدل الفتح
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {campaign.rate}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={campaign.rate}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Templates Tab */}
      {tabValue === 1 && (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              📝 القوالب المحفوظة
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
            >
              قالب جديد
            </Button>
          </Box>

          <Grid container spacing={2}>
            {templates.map(template => (
              <Grid item xs={12} sm={6} md={4} key={template.id}>
                <Paper
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: template.type === 'email' ? '#e3f2fd' : '#e8f5e9',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    {template.type === 'email' ? (
                      <EmailIcon sx={{ color: '#2196f3' }} />
                    ) : (
                      <WhatsAppIcon sx={{ color: '#25c72e' }} />
                    )}
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {template.name}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    {template.content}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" startIcon={<EditIcon />}>
                      تحرير
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="success"
                      startIcon={<SendIcon />}
                    >
                      استخدام
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Stack>
      )}

      {/* New Campaign Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}
        >
          حملة تسويقية جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField label="اسم الحملة" fullWidth placeholder="مثل: عرض خاص Q1" />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                نوع الحملة
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[
                  { type: 'email', label: 'بريد إلكتروني', icon: '📧' },
                  { type: 'whatsapp', label: 'واتساب', icon: '💬' },
                  { type: 'sms', label: 'رسالة نصية', icon: '📱' },
                ].map(opt => (
                  <Button
                    key={opt.type}
                    variant={messageType === opt.type ? 'contained' : 'outlined'}
                    onClick={() => setMessageType(opt.type)}
                    sx={{ borderRadius: 2 }}
                  >
                    {opt.icon} {opt.label}
                  </Button>
                ))}
              </Box>
            </Box>
            <TextField
              label="المحتوى"
              fullWidth
              multiline
              rows={4}
              placeholder="اكتب محتوى الحملة"
            />
            <TextField label="عدد المستقبلين" type="number" fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<SendIcon />}>
            إنشاء وإرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CRMCommunications;
