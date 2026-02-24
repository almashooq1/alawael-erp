import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, Typography, TextField, IconButton, Avatar, Chip, CircularProgress, Fade, Tooltip } from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  ThumbUp as LikeIcon,
  ThumbDown as DislikeIcon,
  Refresh as RefreshIcon,
  Psychology as AIIcon,
  TipsAndUpdates as TipIcon,
  QuestionAnswer as QuestionIcon,
} from '@mui/icons-material';

const ChatbotPanel = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // رسالة ترحيبية من البوت
    const welcomeMessage = {
      id: 'welcome',
      sender: 'bot',
      text: 'مرحباً! أنا المساعد الذكي للأوائل. كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date(),
      intent: 'greeting',
    };
    setMessages([welcomeMessage]);

    // اقتراحات سريعة
    setSuggestions([
      { text: 'كيف أضيف طالب جديد؟', icon: <QuestionIcon /> },
      { text: 'معلومات عن نظام التأهيل', icon: <TipIcon /> },
      { text: 'إحصائيات الأداء', icon: <AIIcon /> },
      { text: 'مواعيد الجلسات', icon: <QuestionIcon /> },
    ]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai-communications/chatbot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message: inputMessage,
          conversation_id: conversationId,
          chatbot_id: 1,
        }),
      });

      const data = await response.json();

      // محاكاة التأخير للكتابة
      setTimeout(() => {
        if (data.success) {
          const botMessage = {
            id: Date.now() + 1,
            sender: 'bot',
            text: data.response,
            timestamp: new Date(),
            intent: data.intent,
            confidence: data.confidence,
            sentiment: data.sentiment_analysis,
          };

          setMessages(prev => [...prev, botMessage]);
          setConversationId(data.conversation_id);
        } else {
          // رد افتراضي في حالة الخطأ
          const fallbackMessage = {
            id: Date.now() + 1,
            sender: 'bot',
            text: getFallbackResponse(inputMessage),
            timestamp: new Date(),
            intent: 'fallback',
          };
          setMessages(prev => [...prev, fallbackMessage]);
        }
        setIsTyping(false);
      }, 1000);
    } catch (error) {
      console.error('Error communicating with chatbot:', error);

      const errorMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: getFallbackResponse(inputMessage),
        timestamp: new Date(),
        intent: 'fallback',
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const getFallbackResponse = userInput => {
    const input = userInput.toLowerCase();

    // استجابات ذكية بناءً على الكلمات المفتاحية
    if (input.includes('طالب') || input.includes('إضافة')) {
      return 'لإضافة طالب جديد:\n1. اذهب إلى قسم "الطلاب"\n2. انقر على "إضافة طالب جديد"\n3. املأ البيانات المطلوبة\n4. اضغط "حفظ"\n\nهل تريد المزيد من المساعدة؟';
    }

    if (input.includes('تأهيل') || input.includes('جلسة')) {
      return 'نظام التأهيل يوفر:\n• تخطيط برامج تأهيلية مخصصة\n• جدولة الجلسات\n• متابعة التقدم\n• تقارير شاملة\n\nما الذي تود معرفته بالتحديد؟';
    }

    if (input.includes('إحصائيات') || input.includes('تقرير')) {
      return 'يمكنك الوصول للإحصائيات من:\n• لوحة التحكم الرئيسية\n• قسم التقارير\n• تحليلات الأداء\n\nهل تريد نوع محدد من الإحصائيات؟';
    }

    if (input.includes('موعد') || input.includes('جدول')) {
      return 'لإدارة المواعيد:\n• افتح "التقويم"\n• اختر "إضافة موعد"\n• حدد التاريخ والوقت\n• اختر المشاركين\n\nهل تحتاج مساعدة في جدولة موعد؟';
    }

    return 'شكراً على سؤالك! يمكنني مساعدتك في:\n• إدارة الطلاب\n• برامج التأهيل\n• الجدولة والمواعيد\n• التقارير والإحصائيات\n\nما الذي تحتاج مساعدة فيه؟';
  };

  const handleSuggestionClick = suggestion => {
    setInputMessage(suggestion.text);
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFeedback = (messageId, isPositive) => {
    console.log(`Feedback for message ${messageId}: ${isPositive ? 'positive' : 'negative'}`);
    // يمكن إرسال التقييم للـ Backend لتحسين الذكاء الاصطناعي
  };

  const formatTime = date => {
    return new Date(date).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* رأس البوت */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Avatar sx={{ bgcolor: 'white', color: 'primary.main' }}>
          <BotIcon />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">المساعد الذكي</Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            متصل الآن • يعمل بالذكاء الاصطناعي
          </Typography>
        </Box>
        <Tooltip title="بدء محادثة جديدة">
          <IconButton
            sx={{ color: 'white' }}
            onClick={() => {
              setMessages([
                {
                  id: 'welcome',
                  sender: 'bot',
                  text: 'مرحباً! كيف يمكنني مساعدتك اليوم؟',
                  timestamp: new Date(),
                  intent: 'greeting',
                },
              ]);
              setConversationId(null);
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* منطقة الرسائل */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          bgcolor: '#f5f5f5',
          backgroundImage: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      >
        {messages.map((message, index) => (
          <Fade in key={message.id} timeout={500}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                mb: 2,
              }}
            >
              {message.sender === 'bot' && (
                <Avatar
                  sx={{
                    mr: 1,
                    bgcolor: 'primary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  <BotIcon sx={{ fontSize: 18 }} />
                </Avatar>
              )}

              <Box sx={{ maxWidth: '70%' }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'white',
                    color: message.sender === 'user' ? 'white' : 'text.primary',
                    borderRadius: message.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {message.text}
                  </Typography>

                  {message.intent && message.sender === 'bot' && <Chip label={message.intent} size="small" sx={{ mt: 1, opacity: 0.7 }} />}

                  {message.confidence && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.7 }}>
                      ثقة: {(message.confidence * 100).toFixed(0)}%
                    </Typography>
                  )}
                </Paper>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(message.timestamp)}
                  </Typography>

                  {message.sender === 'bot' && index > 0 && (
                    <>
                      <IconButton size="small" onClick={() => handleFeedback(message.id, true)} sx={{ p: 0.5 }}>
                        <LikeIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleFeedback(message.id, false)} sx={{ p: 0.5 }}>
                        <DislikeIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          </Fade>
        ))}

        {/* مؤشر الكتابة */}
        {isTyping && (
          <Fade in>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                <BotIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Paper sx={{ p: 2, borderRadius: '16px 16px 16px 4px' }}>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <CircularProgress size={8} />
                  <CircularProgress size={8} sx={{ animationDelay: '0.2s' }} />
                  <CircularProgress size={8} sx={{ animationDelay: '0.4s' }} />
                </Box>
              </Paper>
            </Box>
          </Fade>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* الاقتراحات السريعة */}
      {messages.length === 1 && (
        <Box sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            اقتراحات سريعة:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                icon={suggestion.icon}
                label={suggestion.text}
                onClick={() => handleSuggestionClick(suggestion)}
                clickable
                variant="outlined"
                size="small"
              />
            ))}
          </Box>
        </Box>
      )}

      {/* حقل الإدخال */}
      <Box sx={{ p: 2, bgcolor: 'white', borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="اكتب رسالتك هنا..."
            variant="outlined"
            size="small"
            disabled={isTyping}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' },
              '&:disabled': { bgcolor: 'action.disabledBackground' },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default ChatbotPanel;
