/**
 * ADVANCED INTELLIGENT CHATBOT COMPONENT
 * React Component with Professional UI/UX
 * Version: 2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './AdvancedChatbot.css';

// Icons and Utils
import {
  Send,
  Plus,
  Settings,
  Copy,
  History,
  Loader,
  X,
  Paperclip,
} from 'react-feather';

const AdvancedChatbot = ({ _userId, token, onMinimize }) => {
  // State
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [_conversations, _setConversations] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [_suggestions, setSuggestions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [userLang, setUserLang] = useState('en');
  const [_sentiment, setSentiment] = useState('neutral');
  const [showRating, setShowRating] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // API Headers
  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Translations
  const translations = {
    en: {
      title: 'Smart Chatbot Assistant',
      inputPlaceholder: 'Type your message...',
      send: 'Send',
      newChat: 'New Chat',
      loading: 'Chatbot is thinking...',
      history: 'Conversation History',
      clearChat: 'Clear Chat',
      settings: 'Settings',
      rateChat: 'Rate this chat',
      excellent: 'Excellent',
      good: 'Good',
      average: 'Average',
      poor: 'Poor',
      veryPoor: 'Very Poor',
      feedback: 'Additional feedback',
      thanks: 'Thank you for your feedback!',
      error: 'An error occurred. Please try again.',
      noResponse: 'No response received. Please try again.',
    },
    ar: {
      title: 'مساعد محادثة ذكي',
      inputPlaceholder: 'اكتب رسالتك...',
      send: 'إرسال',
      newChat: 'محادثة جديدة',
      loading: 'يفكر المساعد...',
      history: 'سجل المحادثات',
      clearChat: 'مسح المحادثة',
      settings: 'الإعدادات',
      rateChat: 'قيّم هذه المحادثة',
      excellent: 'ممتاز',
      good: 'جيد',
      average: 'متوسط',
      poor: 'ضعيف',
      veryPoor: 'ضعيف جداً',
      feedback: 'تعليق إضافي',
      thanks: 'شكراً على تقييمك!',
      error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
      noResponse: 'لم يتم استقبال رد. يرجى المحاولة مرة أخرى.',
    },
  };

  const t = (key) => translations[userLang][key] || key;

  // Initialize chatbot
  useEffect(() => {
    initializeChatbot();
    loadStatistics();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeChatbot = async () => {
    try {
      const response = await axios.post(
        '/api/v2/chatbot/conversation',
        {},
        { headers: apiHeaders }
      );

      if (response.data.success) {
        setConversationId(response.data.conversationId);
        setMessages([
          {
            id: 'greeting',
            role: 'assistant',
            content: `مرحباً! 👋 أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟\n\nHello! I'm your smart assistant. How can I help you today?`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error initializing chatbot:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await axios.get('/api/v2/chatbot/statistics');
      if (response.data.success) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || !conversationId) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setLoading(true);

    // Add user message to UI
    const userMsg = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await axios.post(
        '/api/v2/chatbot/message',
        {
          message: userMessage,
          conversationId,
        },
        { headers: apiHeaders }
      );

      if (response.data.success) {
        const assistantMsg = {
          id: response.data.conversationId,
          role: 'assistant',
          content: response.data.message,
          intent: response.data.intent,
          confidence: response.data.confidence,
          suggestions: response.data.suggestions,
          actions: response.data.actions,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setSuggestions(response.data.suggestions || []);
        setSentiment(response.data.sentiment || 'neutral');

        // Show rating option after a few messages
        if (messages.length > 5) {
          setShowRating(true);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `error_${Date.now()}`,
            role: 'assistant',
            content: response.data.error || t('error'),
            isError: true,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: error.response?.data?.error || t('error'),
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleNewChat = async () => {
    try {
      const response = await axios.post(
        '/api/v2/chatbot/conversation',
        {},
        { headers: apiHeaders }
      );

      if (response.data.success) {
        setConversationId(response.data.conversationId);
        setMessages([
          {
            id: 'greeting',
            role: 'assistant',
            content: t('title'),
            timestamp: new Date(),
          },
        ]);
        setSuggestions([]);
        setShowRating(false);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleRateConversation = async () => {
    try {
      const response = await axios.post(
        '/api/v2/chatbot/rate',
        {
          conversationId,
          rating: currentRating,
          feedback: ratingFeedback,
        },
        { headers: apiHeaders }
      );

      if (response.data.success) {
        setShowRating(false);
        setCurrentRating(0);
        setRatingFeedback('');
        // Show thank you message
        setMessages((prev) => [
          ...prev,
          {
            id: `thank_you_${Date.now()}`,
            role: 'assistant',
            content: t('thanks'),
            isSystem: true,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (error) {
      console.error('Error rating conversation:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const toggleLanguage = () => {
    setUserLang(userLang === 'en' ? 'ar' : 'en');
  };

  return (
    <div className={`advanced-chatbot ${userLang === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="chatbot-header">
        <div className="header-left">
          <button
            className="icon-btn"
            onClick={() => setShowSidebar(!showSidebar)}
            title={t('history')}
          >
            <History size={20} />
          </button>
          <h1>{t('title')}</h1>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={toggleLanguage}>
            {userLang === 'en' ? 'ع' : 'EN'}
          </button>
          <button className="icon-btn" title={t('settings')}>
            <Settings size={20} />
          </button>
          <button className="icon-btn" onClick={onMinimize}>
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="chatbot-container">
        {/* Sidebar */}
        {showSidebar && (
          <div className="chatbot-sidebar">
            <button className="new-chat-btn" onClick={handleNewChat}>
              <Plus size={18} /> {t('newChat')}
            </button>

            {statistics && (
              <div className="statistics">
                <h3>📊 Statistics</h3>
                <div className="stat-item">
                  <span>Messages:</span>
                  <span>{statistics.totalMessages}</span>
                </div>
                <div className="stat-item">
                  <span>Users:</span>
                  <span>{statistics.totalUsers}</span>
                </div>
                <div className="stat-item">
                  <span>Response Time:</span>
                  <span>{statistics.averageResponseTime}ms</span>
                </div>
                <div className="stat-item">
                  <span>Success Rate:</span>
                  <span>{statistics.successRate}</span>
                </div>
                <div className="stat-item">
                  <span>Satisfaction:</span>
                  <span>⭐ {statistics.userSatisfaction}</span>
                </div>
              </div>
            )}

            <div className="conversations-list">
              <h3>Recent Chats</h3>
              {/* List conversations if available */}
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="chatbot-main">
          {/* Messages Area */}
          <div className="messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message message-${message.role} ${
                  message.isError ? 'message-error' : ''
                } ${message.isSystem ? 'message-system' : ''}`}
              >
                <div className="message-content">
                  {message.content}
                </div>

                {/* Message Actions */}
                <div className="message-actions">
                  {message.role === 'assistant' && (
                    <>
                      <button
                        className="action-btn"
                        onClick={() => copyToClipboard(message.content)}
                        title="Copy"
                      >
                        <Copy size={16} />
                      </button>
                      {message.intent && (
                        <span className="intent-badge">{message.intent}</span>
                      )}
                      {message.confidence && (
                        <span className="confidence-badge">
                          {Math.round(message.confidence * 100)}%
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="suggestions">
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="suggestion-btn"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}

                <span className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString(userLang === 'ar' ? 'ar-SA' : 'en-US')}
                </span>
              </div>
            ))}

            {loading && (
              <div className="message message-assistant message-loading">
                <div className="loading-indicator">
                  <Loader className="spinner" size={20} />
                  <span>{t('loading')}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Rating Section */}
          {showRating && (
            <div className="rating-section">
              <h4>{t('rateChat')}</h4>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star ${currentRating >= star ? 'active' : ''}`}
                    onClick={() => setCurrentRating(star)}
                  >
                    ⭐
                  </button>
                ))}
              </div>
              <textarea
                placeholder={t('feedback')}
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                rows={2}
              />
              <button
                className="btn-primary"
                onClick={handleRateConversation}
                disabled={!currentRating}
              >
                {t('send')}
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="input-area">
            <div className="input-wrapper">
              <button className="icon-btn" title="Attach file">
                <Paperclip size={20} />
              </button>
              <input
                ref={inputRef}
                type="text"
                placeholder={t('inputPlaceholder')}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                disabled={loading}
              />
              <button
                className="btn-send"
                onClick={sendMessage}
                disabled={!inputValue.trim() || loading}
              >
                <Send size={20} />
              </button>
            </div>
            <div className="input-info">
              {userLang === 'ar' ? (
                <small>السلام عليكم - يمكنك التحدث معي بالعربية والإنجليزية</small>
              ) : (
                <small>I support both English and Arabic. Type your message above.</small>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedChatbot;
