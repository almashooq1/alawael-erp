import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Avatar,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Divider,
  Badge,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  AttachFile as AttachFileIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { parentService } from '../services/parentService';

const TherapistCommunications = () => {
  const [commData, setCommData] = useState(null);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [searchText, setSearchText] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const data = await parentService.getTherapistCommunications('parent001');
      setCommData(data);
      if (data?.therapists?.length > 0) {
        selectTherapist(data.therapists[0]);
      }
    };
    fetchData();
  }, []);

  const selectTherapist = therapist => {
    setSelectedTherapist(therapist);
    setMessages(therapist.messages || []);
    setMessageText('');
  };

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const newMessage = {
        id: messages.length + 1,
        sender: 'أنت',
        senderType: 'parent',
        text: messageText,
        timestamp: new Date().toLocaleTimeString('ar-SA'),
        date: new Date().toLocaleDateString('ar-SA'),
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
    }
  };

  if (!commData) return <Typography>جاري التحميل...</Typography>;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MessageIcon sx={{ fontSize: 40, mr: 2 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
              التواصل مع المعالجين
            </Typography>
            <Typography variant="body2">التواصل المباشر والتنسيق مع فريق المعالجين</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 2 }}>
        {/* Therapists List */}
        <Box>
          <TextField
            fullWidth
            placeholder="بحث..."
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 600, overflowY: 'auto' }}>
            {commData.therapists?.map(therapist => (
              <Card
                key={therapist.id}
                onClick={() => selectTherapist(therapist)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: selectedTherapist?.id === therapist.id ? '#e3f2fd' : 'white',
                  border: selectedTherapist?.id === therapist.id ? '2px solid #4facfe' : '1px solid #eee',
                  transition: '0.3s',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                  },
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Badge badgeContent={therapist.unreadCount} color="error">
                      <Avatar sx={{ backgroundColor: '#4facfe', width: 36, height: 36 }}>{therapist.name.charAt(0)}</Avatar>
                    </Badge>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {therapist.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#999' }}>
                        {therapist.specialization}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#666',
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {therapist.lastMessage}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Chat Area */}
        {selectedTherapist && (
          <Card sx={{ height: 600, display: 'flex', flexDirection: 'column' }}>
            {/* Chat Header */}
            <CardHeader
              avatar={<Avatar sx={{ backgroundColor: '#4facfe' }}>{selectedTherapist.name.charAt(0)}</Avatar>}
              title={selectedTherapist.name}
              subheader={selectedTherapist.specialization}
              action={
                <>
                  <IconButton size="small" onClick={e => setAnchorEl(e.currentTarget)}>
                    <MoreVertIcon />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
                    <MenuItem onClick={() => setOpenDialog(true)}>
                      <PhoneIcon sx={{ mr: 1, fontSize: 18 }} />
                      جدولة مكالمة
                    </MenuItem>
                    <MenuItem>
                      <EmailIcon sx={{ mr: 1, fontSize: 18 }} />
                      إرسال بريد إلكتروني
                    </MenuItem>
                  </Menu>
                </>
              }
            />

            <Divider />

            {/* Messages */}
            <Box
              sx={{
                flex: 1,
                overflowY: 'auto',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              {messages.map((msg, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    justifyContent: msg.senderType === 'parent' ? 'flex-end' : 'flex-start',
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '70%',
                      backgroundColor: msg.senderType === 'parent' ? '#4facfe' : '#f5f5f5',
                      color: msg.senderType === 'parent' ? 'white' : 'black',
                      p: 1.5,
                      borderRadius: 2,
                    }}
                  >
                    <Typography variant="body2">{msg.text}</Typography>
                    <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                      {msg.timestamp}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Divider />

            {/* Input */}
            <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
              <IconButton size="small">
                <AttachFileIcon />
              </IconButton>
              <TextField
                fullWidth
                size="small"
                placeholder="اكتب رسالة..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <IconButton size="small" onClick={handleSendMessage} sx={{ color: '#4facfe' }}>
                <SendIcon />
              </IconButton>
            </Box>
          </Card>
        )}
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mt: 4 }}>
        <Card>
          <CardHeader title="الإجراءات السريعة" />
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Button fullWidth variant="outlined" startIcon={<PhoneIcon />} onClick={() => setOpenDialog(true)}>
                  جدولة مكالمة
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button fullWidth variant="outlined" startIcon={<MessageIcon />}>
                  إرسال استفسار
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button fullWidth variant="outlined" startIcon={<AttachFileIcon />}>
                  إرسال ملف
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button fullWidth variant="outlined" startIcon={MessageIcon}>
                  طلب استشارة
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>

      {/* Schedule Call Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>جدولة مكالمة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="التاريخ" type="date" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
          <TextField fullWidth label="الوقت" type="time" InputLabelProps={{ shrink: true }} sx={{ mb: 2 }} />
          <TextField fullWidth label="الموضوع" multiline rows={3} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}
            onClick={() => setOpenDialog(false)}
          >
            تحديد الموعد
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TherapistCommunications;
