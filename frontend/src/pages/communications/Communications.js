import { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import { useSocket } from 'contexts/SocketContext';

// المكونات الفرعية
import logger from 'utils/logger';
import { gradients } from 'theme/palette';
import communicationsService from 'services/communicationsService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  Tab,
  Tabs,
  Tooltip,
  Typography
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import EmailIcon from '@mui/icons-material/Email';
import ForumIcon from '@mui/icons-material/Forum';
import { BotIcon } from 'utils/iconAliases';

function Communications() {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const showSnackbar = useSnackbar();

  // الحالات الرئيسية
  const [activeTab, setActiveTab] = useState(0);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [loading, setLoading] = useState(false);

  // إحصائيات
  const [stats, setStats] = useState({
    totalMessages: 0,
    unreadCount: 0,
    activeChats: 0,
    botResponses: 0,
    emailsSent: 0,
    avgResponseTime: 0,
  });

  useEffect(() => {
    loadCommunicationsData();

    // الاستماع للرسائل الجديدة عبر WebSocket
    if (socket && isConnected) {
      socket.on('new:message', handleNewMessage);
      socket.on('message:updated', handleMessageUpdate);

      return () => {
        socket.off('new:message');
        socket.off('message:updated');
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: stable handlers + mount fetch
  }, [socket, isConnected]);

  const loadCommunicationsData = async () => {
    setLoading(true);
    try {
      const data = await communicationsService.getAIDashboard();

      if (data?.success || data?.stats) {
        setStats(data.stats || {});
        setConversations(data.conversations || []);
        setMessages(data.recent_messages || []);
      } else {
        loadMockData();
      }
    } catch (error) {
      logger.error('Error loading communications data:', error);
      showSnackbar('حدث خطأ في تحميل بيانات الاتصالات', 'error');
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    setStats({
      totalMessages: 2847,
      unreadCount: 23,
      activeChats: 12,
      botResponses: 543,
      emailsSent: 189,
      avgResponseTime: 2.3,
    });

    setConversations([
      {
        id: 1,
        type: 'chat',
        participant: 'أحمد محمد',
        avatar: 'AM',
        lastMessage: 'شكراً على المساعدة',
        timestamp: new Date(Date.now() - 5 * 60000),
        unread: 2,
        status: 'online',
      },
      {
        id: 2,
        type: 'email',
        participant: 'قسم الموارد البشرية',
        avatar: 'HR',
        lastMessage: 'تحديث سياسة الإجازات',
        timestamp: new Date(Date.now() - 30 * 60000),
        unread: 0,
        status: 'offline',
      },
      {
        id: 3,
        type: 'bot',
        participant: 'مساعد AI الذكي',
        avatar: '🤖',
        lastMessage: 'كيف يمكنني مساعدتك؟',
        timestamp: new Date(Date.now() - 120 * 60000),
        unread: 0,
        status: 'online',
      },
    ]);
  };

  const handleNewMessage = message => {
    setMessages(prev => [message, ...prev]);
    setStats(prev => ({
      ...prev,
      totalMessages: prev.totalMessages + 1,
      unreadCount: prev.unreadCount + 1,
    }));
  };

  const handleMessageUpdate = updatedMessage => {
    setMessages(prev => prev.map(msg => (msg.id === updatedMessage.id ? updatedMessage : msg)));
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSendMessage = async (conversationId, messageText, attachments = []) => {
    try {
      const data = await communicationsService.sendAIMessage({
        conversation_id: conversationId,
        message: messageText,
        attachments,
      });

      if (data?.success) {
        handleNewMessage(data.message);
        showSnackbar('تم إرسال الرسالة بنجاح', 'success');
      }
    } catch (error) {
      logger.error('Error sending message:', error);
      showSnackbar('فشل في إرسال الرسالة', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* رأس الصفحة مع الإحصائيات */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
            >
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                نظام الاتصالات الإدارية
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Tooltip title="إشعارات جديدة">
                  <IconButton aria-label="إجراء" color="primary">
                    <Badge badgeContent={stats.unreadCount} color="error">
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/communications')}
                >
                  محادثة جديدة
                </Button>
              </Box>
            </Box>
          </Grid>

          {/* بطاقات الإحصائيات */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: gradients.primary, color: 'white' }}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats.totalMessages.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      إجمالي الرسائل
                    </Typography>
                  </Box>
                  <ChatIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: gradients.warning, color: 'white' }}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats.unreadCount}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      رسائل غير مقروءة
                    </Typography>
                  </Box>
                  <EmailIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: gradients.info, color: 'white' }}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats.activeChats}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      محادثات نشطة
                    </Typography>
                  </Box>
                  <ForumIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: gradients.success, color: 'white' }}>
              <CardContent>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats.avgResponseTime}s
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      متوسط وقت الرد
                    </Typography>
                  </Box>
                  <TimeIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* التبويبات الرئيسية */}
      <Card>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            icon={
              <Badge badgeContent={stats.unreadCount} color="error">
                <ChatIcon />
              </Badge>
            }
            label="الرسائل"
            iconPosition="start"
          />
          <Tab icon={<BotIcon />} label="المساعد الذكي" iconPosition="start" />
          <Tab icon={<EmailIcon />} label="البريد الداخلي" iconPosition="start" />
          <Tab icon={<TrendingIcon />} label="التحليلات" iconPosition="start" />
        </Tabs>

        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {activeTab === 0 && (
                <MessagingPanel
                  conversations={conversations}
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  selectedConversation={selectedConversation}
                  onSelectConversation={setSelectedConversation}
                />
              )}
              {activeTab === 1 && <ChatbotPanel />}
              {activeTab === 2 && <EmailPanel />}
              {activeTab === 3 && <AnalyticsDashboard stats={stats} />}
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default Communications;
