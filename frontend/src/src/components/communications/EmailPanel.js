import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Inbox as InboxIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  AttachFile as AttachIcon,
} from '@mui/icons-material';
import { useOrgBranding } from '../OrgBrandingContext';

// Mock function to send security alert email
export function sendSecurityEmailAlert({ subject, body, to = 'admin@alawael.com' }) {
  // In real app, integrate with backend email service
  // For demo, just log
  console.log('Security Email Sent:', { to, subject, body });
  return Promise.resolve({ success: true });
}
const EmailPanel = () => {
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [folder, setFolder] = useState('inbox');
  const [emailStats, setEmailStats] = useState({
    inbox: 0,
    sent: 0,
    drafts: 0,
    starred: 0,
  });

  const [composeForm, setComposeForm] = useState({
    to: '',
    subject: '',
    body: '',
    priority: 'normal',
  });

  const { branding } = useOrgBranding();
  useEffect(() => {
    loadEmails(folder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folder]);

  const loadEmails = async folderType => {
    try {
      const response = await fetch(`/api/ai-communications/emails?folder=${folderType}`);
      const data = await response.json();

      if (data.success) {
        setEmails(data.emails);
        setEmailStats(data.stats);
      } else {
        loadMockEmails(folderType);
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      loadMockEmails(folderType);
    }
  };

  const loadMockEmails = folderType => {
    const mockEmails = [
      {
        id: 1,
        from: 'hr@alawael.com',
        to: 'me@alawael.com',
        subject: 'تحديث سياسة الإجازات',
        body: 'تم تحديث سياسة الإجازات الجديدة. يرجى مراجعة المرفقات.',
        timestamp: new Date(Date.now() - 7200000),
        read: false,
        starred: false,
        priority: 'high',
        attachments: ['policy.pdf'],
      },
      {
        id: 2,
        from: 'admin@alawael.com',
        to: 'me@alawael.com',
        subject: 'اجتماع فريق التطوير',
        body: 'دعوة لحضور اجتماع فريق التطوير يوم الأحد الساعة 10 صباحاً.',
        timestamp: new Date(Date.now() - 14400000),
        read: true,
        starred: true,
        priority: 'normal',
        attachments: [],
      },
      {
        id: 3,
        from: 'support@alawael.com',
        to: 'me@alawael.com',
        subject: 'طلب دعم فني #1234',
        body: 'تم حل المشكلة المبلغ عنها في نظام التأهيل.',
        timestamp: new Date(Date.now() - 28800000),
        read: true,
        starred: false,
        priority: 'low',
        attachments: [],
      },
    ];

    setEmails(mockEmails);
    setEmailStats({
      inbox: 15,
      sent: 8,
      drafts: 2,
      starred: 3,
    });
  };

  const handleSendEmail = async () => {
    try {
      const response = await fetch('/api/ai-communications/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeForm),
      });

      const data = await response.json();
      if (data.success) {
        setComposeOpen(false);
        setComposeForm({ to: '', subject: '', body: '', priority: 'normal' });
        // إظهار رسالة نجاح
      }
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  const handleMarkAsRead = emailId => {
    // تضمين الهوية المؤسسية في تذييل الإيميل تلقائياً
    const getBrandedBody = body => {
      let footer = '';
      if (branding && (branding.name || branding.logo)) {
        footer = '\n\n---\n';
        if (branding.logo) {
          footer += `[شعار المؤسسة]\n`;
        }
        if (branding.name) {
          footer += `${branding.name}\n`;
        }
      }
      return body + footer;
    };
    setEmails(prev => prev.map(email => (email.id === emailId ? { ...email, read: true } : email)));
  };

  const handleToggleStar = emailId => {
    setEmails(prev =>
      prev.map(email => (email.id === emailId ? { ...email, starred: !email.starred } : email))
    );
  };

  const handleDeleteEmail = emailId => {
    setEmails(prev => prev.filter(email => email.id !== emailId));
    setSelectedEmail(null);
  };

  const getPriorityColor = priority => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatTimestamp = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const folders = [
    { value: 'inbox', label: 'البريد الوارد', icon: <InboxIcon />, count: emailStats.inbox },
    { value: 'sent', label: 'المرسل', icon: <SendIcon />, count: emailStats.sent },
    { value: 'drafts', label: 'المسودات', icon: <DraftsIcon />, count: emailStats.drafts },
    { value: 'starred', label: 'المميز', icon: <StarIcon />, count: emailStats.starred },
  ];

  return (
    <Box sx={{ height: '600px' }}>
      <Grid container sx={{ height: '100%' }}>
        {/* القائمة الجانبية */}
        <Grid item xs={12} md={3} sx={{ borderRight: 1, borderColor: 'divider', p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<EmailIcon />}
            onClick={() => setComposeOpen(true)}
            sx={{ mb: 2 }}
          >
            إنشاء بريد جديد
          </Button>

          <List>
            {folders.map(f => (
              <ListItem
                key={f.value}
                button
                selected={folder === f.value}
                onClick={() => setFolder(f.value)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                    '&:hover': {
                      bgcolor: 'primary.light',
                    },
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  {f.icon}
                  <Typography sx={{ ml: 2, flex: 1 }}>{f.label}</Typography>
                  {f.count > 0 && <Chip label={f.count} size="small" color="primary" />}
                </Box>
              </ListItem>
            ))}
          </List>
        </Grid>

        {/* قائمة الرسائل */}
        <Grid item xs={12} md={4} sx={{ borderRight: 1, borderColor: 'divider' }}>
          <List sx={{ overflowY: 'auto', height: '100%', p: 0 }}>
            {emails.map(email => (
              <React.Fragment key={email.id}>
                <ListItem
                  button
                  selected={selectedEmail?.id === email.id}
                  onClick={() => {
                    setSelectedEmail(email);
                    if (!email.read) handleMarkAsRead(email.id);
                  }}
                  sx={{
                    bgcolor: email.read ? 'transparent' : 'action.hover',
                    '&.Mui-selected': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: email.read ? 'normal' : 'bold', flex: 1 }}
                          noWrap
                        >
                          {email.from}
                        </Typography>
                        {email.priority !== 'normal' && (
                          <Chip
                            label={email.priority === 'high' ? 'عاجل' : 'منخفض'}
                            size="small"
                            color={getPriorityColor(email.priority)}
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: email.read ? 'normal' : 'bold' }}
                          noWrap
                        >
                          {email.subject}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {email.body.substring(0, 50)}...
                        </Typography>
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 1,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(email.timestamp)}
                      </Typography>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={e => {
                          e.stopPropagation();
                          handleToggleStar(email.id);
                        }}
                      >
                        <StarIcon fontSize="small" color={email.starred ? 'warning' : 'disabled'} />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}

            {emails.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <EmailIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary">لا توجد رسائل في هذا المجلد</Typography>
              </Box>
            )}
          </List>
        </Grid>

        {/* محتوى الرسالة */}
        <Grid item xs={12} md={5}>
          {selectedEmail ? (
            <Box sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
              {/* رأس الرسالة */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  {selectedEmail.subject}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    {selectedEmail.from.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">{selectedEmail.from}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      إلى: {selectedEmail.to}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimestamp(selectedEmail.timestamp)}
                  </Typography>
                </Box>

                {/* أزرار الإجراءات */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button size="small" startIcon={<ReplyIcon />}>
                    رد
                  </Button>
                  <Button size="small" startIcon={<ForwardIcon />}>
                    إعادة توجيه
                  </Button>
                  <Button
                    size="small"
                    startIcon={<DeleteIcon />}
                    color="error"
                    onClick={() => handleDeleteEmail(selectedEmail.id)}
                  >
                    حذف
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* محتوى الرسالة */}
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
                {selectedEmail.body}
              </Typography>

              {/* المرفقات */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    المرفقات:
                  </Typography>
                  {selectedEmail.attachments.map((attachment, index) => (
                    <Chip
                      key={index}
                      icon={<AttachIcon />}
                      label={attachment}
                      onClick={() => console.log('Download', attachment)}
                      sx={{ mr: 1 }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <EmailIcon sx={{ fontSize: 80, color: 'text.disabled' }} />
              <Typography variant="h6" color="text.secondary">
                اختر رسالة لعرضها
              </Typography>
            </Box>
          )}
        </Grid>
      </Grid>

      {/* نافذة إنشاء بريد جديد */}
      <Dialog open={composeOpen} onClose={() => setComposeOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إنشاء بريد جديد</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="إلى"
              value={composeForm.to}
              onChange={e => setComposeForm({ ...composeForm, to: e.target.value })}
            />

            <TextField
              fullWidth
              label="الموضوع"
              value={composeForm.subject}
              onChange={e => setComposeForm({ ...composeForm, subject: e.target.value })}
            />

            <FormControl fullWidth>
              <InputLabel>الأولوية</InputLabel>
              <Select
                value={composeForm.priority}
                label="الأولوية"
                onChange={e => setComposeForm({ ...composeForm, priority: e.target.value })}
              >
                <MenuItem value="low">منخفضة</MenuItem>
                <MenuItem value="normal">عادية</MenuItem>
                <MenuItem value="high">عالية</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={8}
              label="الرسالة"
              value={composeForm.body}
              onChange={e => setComposeForm({ ...composeForm, body: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComposeOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendEmail}
            disabled={!composeForm.to || !composeForm.subject}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailPanel;
