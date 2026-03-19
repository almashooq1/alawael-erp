import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Message as MessageIcon,
  Reply as ReplyIcon,
  StarBorder as StarBorderIcon,
  Send as SendIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { parentService } from '../services/parentService';

const ParentMessages = () => {
  const [messageData, setMessageData] = useState(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [newMessage, setNewMessage] = useState({ to: '', subject: '', body: '' });

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getParentMessages('parent001');
      setMessageData(data);
      if (data?.conversations?.length > 0) {
        setSelectedConversation(data.conversations[0]);
      }
    };
    fetchData();
  }, []);

  if (!messageData) return <Typography>جاري التحميل...</Typography>;

  const handleSendReply = () => {
    if (messageText.trim()) {
      setMessageText('');
      alert('تم إرسال الرسالة بنجاح');
    }
  };

  const handleSendNewMessage = () => {
    if (newMessage.to && newMessage.subject && newMessage.body) {
      setOpenDialog(false);
      setNewMessage({ to: '', subject: '', body: '' });
      alert('تم إرسال الرسالة بنجاح');
    }
  };

  const getTabLabel = (count, label) => `${label} (${count})`;

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
            <Typography variant="body2">تلقي ومتابعة الرسائل المهمة من المدرسة والمعالجين</Typography>
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
                    backgroundColor: selectedConversation?.id === conv.id ? '#f0f0f0' : 'white',
                    borderLeft: selectedConversation?.id === conv.id ? '3px solid #667eea' : 'none',
                    display: 'block',
                    py: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar sx={{ width: 32, height: 32, backgroundColor: '#667eea' }}>{conv.sender.charAt(0)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {conv.sender}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        {conv.date}
                      </Typography>
                    </Box>
                    {conv.unread && <Chip label="جديد" size="small" color="primary" />}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      color: '#666',
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
                avatar={<Avatar sx={{ backgroundColor: '#667eea' }}>{selectedConversation.sender.charAt(0)}</Avatar>}
                title={selectedConversation.sender}
                subheader={selectedConversation.date}
              />

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 2,
                  backgroundColor: '#fafafa',
                }}
              >
                <Box sx={{ mb: 2 }}>
                  <Card sx={{ backgroundColor: 'white' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {selectedConversation.subject}
                      </Typography>
                      <Typography variant="body2">{selectedConversation.content}</Typography>
                      <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 2 }}>
                        {selectedConversation.date}
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              {/* Reply Input */}
              <Box sx={{ p: 2, backgroundColor: 'white', borderTop: '1px solid #eee' }}>
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
                  <IconButton size="small">
                    <AttachFileIcon />
                  </IconButton>
                  <Button
                    size="small"
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSendReply}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        من: {ann.from} - {ann.date}
                      </Typography>
                    </Box>
                    <Box>
                      <IconButton size="small">
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
                    <Avatar sx={{ width: 40, height: 40, backgroundColor: '#667eea' }}>{forum.author.charAt(0)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {forum.author}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#999' }}>
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
                        <Typography variant="caption" sx={{ color: '#999' }}>
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
