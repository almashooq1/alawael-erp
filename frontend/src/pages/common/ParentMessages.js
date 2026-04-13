import { useState, useEffect } from 'react';




import { parentService } from 'services/parentService';
import messagesService from 'services/messagesService';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { gradients, brandColors, neutralColors, surfaceColors } from 'theme/palette';
import { useAuth } from 'contexts/AuthContext';

const ParentMessages = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [messageData, setMessageData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({ to: '', subject: '', body: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await parentService.getParentMessages(userId);
        setMessageData(data);
        if (data?.conversations?.length > 0) {
          setSelectedConversation(data.conversations[0]);
        }
      } catch (err) {
        logger.error('Failed to load messages:', err);
        setError(err.message || 'حدث خطأ في تحميل الرسائل');
      }
    };
    fetchData();
  }, [userId]);

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      </Container>
    );
  }

  if (!messageData) return <Typography>جاري التحميل...</Typography>;

  const handleSendReply = async () => {
    if (messageText.trim() && selectedConversation) {
      try {
        await messagesService.send({
          conversationId: selectedConversation._id || selectedConversation.id,
          content: messageText,
          type: 'reply',
        });
        setMessageText('');
        showSnackbar('تم إرسال الرسالة بنجاح', 'success');
      } catch (err) {
        logger.error('Failed to send reply:', err);
        showSnackbar('خطأ في إرسال الرسالة', 'error');
      }
    }
  };

  const handleSendNewMessage = async () => {
    if (newMessage.to && newMessage.subject && newMessage.body) {
      try {
        await messagesService.send({
          to: newMessage.to,
          subject: newMessage.subject,
          content: newMessage.body,
          type: 'new',
        });
        setOpenDialog(false);
        setNewMessage({ to: '', subject: '', body: '' });
        showSnackbar('تم إرسال الرسالة بنجاح', 'success');
      } catch (err) {
        logger.error('Failed to send message:', err);
        showSnackbar('خطأ في إرسال الرسالة', 'error');
      }
    }
  };

  const getTabLabel = (count, label) => `${label} (${count})`;

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
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MessageIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              الرسائل والإشعارات
            </Typography>
            <Typography variant="body2">
              تلقي ومتابعة الرسائل المهمة من المدرسة والمعالجين
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
          }}
          onClick={() => setOpenDialog(true)}
        >
          رسالة جديدة
        </Button>
      </Box>

      {/* Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {messageData.stats?.map(stat => (
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

      {/* Tabs */}
      <Tabs value={selectedTab} onChange={(e, val) => setSelectedTab(val)} sx={{ mb: 3 }}>
        <Tab label={getTabLabel(messageData.inbox?.length, 'الواردة')} />
        <Tab label={getTabLabel(messageData.announcements?.length, 'الإعلانات')} />
        <Tab label={getTabLabel(messageData.forums?.length, 'النقاشات')} />
      </Tabs>

      {/* Tab 0: Inbox */}
      {selectedTab === 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '350px 1fr' }, gap: 2 }}>
          {/* Conversations List */}
          <Card sx={{ height: 600, overflowY: 'auto' }}>
            <CardHeader title="الرسائل" />
            <List dense>
              {messageData.inbox?.map(conv => (
                <ListItem
                  button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  sx={{
                    backgroundColor:
                      selectedConversation?.id === conv.id ? surfaceColors.softGray : 'white',
                    borderLeft:
                      selectedConversation?.id === conv.id
                        ? `3px solid ${brandColors.primaryStart}`
                        : 'none',
                    display: 'block',
                    py: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar
                      sx={{ width: 32, height: 32, backgroundColor: brandColors.primaryStart }}
                    >
                      {conv.sender.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {conv.sender}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                        {conv.date}
                      </Typography>
                    </Box>
                    {conv.unread && <Chip label="جديد" size="small" color="primary" />}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: neutralColors.textSecondary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      pl: 5,
                    }}
                  >
                    {conv.lastMessage}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Card>

          {/* Message Detail */}
          {selectedConversation && (
            <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
              {/* Header */}
              <CardHeader
                avatar={
                  <Avatar sx={{ backgroundColor: brandColors.primaryStart }}>
                    {selectedConversation.sender.charAt(0)}
                  </Avatar>
                }
                title={selectedConversation.sender}
                subheader={selectedConversation.date}
              />

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  backgroundColor: surfaceColors.background,
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Card sx={{ backgroundColor: 'white' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {selectedConversation.subject}
                      </Typography>
                      <Typography variant="body2">{selectedConversation.content}</Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: neutralColors.textMuted, display: 'block', mt: 2 }}
                      >
                        {selectedConversation.date}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              {/* Reply Input */}
              <Box
                sx={{
                  p: 2,
                  backgroundColor: 'white',
                  borderTop: `1px solid ${surfaceColors.borderSubtle}`,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="اكتب ردك..."
                  multiline
                  rows={3}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <IconButton aria-label="إرفاق ملف" size="small">
                    <AttachFileIcon />
                  </IconButton>
                  <Button
                    size="small"
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSendReply}
                    sx={{
                      background: gradients.primary,
                    }}
                  >
                    إرسال
                  </Button>
                </Box>
              </Box>
            </Card>
          )}
        </Box>
      )}

      {/* Tab 1: Announcements */}
      {selectedTab === 1 && (
        <Grid container spacing={2}>
          {messageData.announcements?.map(ann => (
            <Grid item xs={12} key={ann.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {ann.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                        من: {ann.from} - {ann.date}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton aria-label="إجراء" size="small">
                        <StarBorderIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {ann.content}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {ann.tags?.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Tab 2: Forums */}
      {selectedTab === 2 && (
        <Grid container spacing={2}>
          {messageData.forums?.map(forum => (
            <Grid item xs={12} key={forum.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Avatar
                      sx={{ width: 40, height: 40, backgroundColor: brandColors.primaryStart }}
                    >
                      {forum.author.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {forum.author}
                        </Typography>
                        <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                          {forum.date}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {forum.topic}
                      </Typography>
                      <Typography variant="body2">{forum.message}</Typography>
                      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button size="small" startIcon={<ReplyIcon />} variant="text">
                          رد
                        </Button>
                        <Typography variant="caption" sx={{ color: neutralColors.textMuted }}>
                          {forum.replies} ردود
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* New Message Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>رسالة جديدة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="إلى"
            value={newMessage.to}
            onChange={e => setNewMessage({ ...newMessage, to: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="الموضوع"
            value={newMessage.subject}
            onChange={e => setNewMessage({ ...newMessage, subject: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="الرسالة"
            multiline
            rows={4}
            value={newMessage.body}
            onChange={e => setNewMessage({ ...newMessage, body: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSendNewMessage}
            sx={{
              background: gradients.primary,
            }}
          >
            إرسال
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ParentMessages;
