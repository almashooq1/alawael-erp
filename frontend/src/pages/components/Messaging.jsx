/**
 * Messaging.jsx
 * مكون نظام الرسائل الآمن
 */

import React, { useState, useEffect } from 'react';
import { Send, Paperclip, Search, MoreVertical, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Messaging() {
  const { token, beneficiary } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/beneficiary/messages/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.data);
        if (data.data.length > 0) {
          setSelectedConversation(data.data[0]);
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في تحميل الرسائل');
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await fetch(`/api/beneficiary/messages/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في تحميل الرسائل');
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageText.trim() || !selectedConversation) {
      return;
    }

    const recipientId = selectedConversation.participants.find(
      p => p.userId !== beneficiary._id
    )?.userId;

    try {
      const response = await fetch('/api/beneficiary/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          recipientId,
          body: messageText,
          priority: 'normal'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessageText('');
        // Add new message to list
        setMessages([...messages, data.data]);
        // Update conversation last message
        setConversations(conversations.map(conv =>
          conv._id === selectedConversation._id
            ? {
                ...conv,
                lastMessage: messageText,
                lastMessageDate: new Date()
              }
            : conv
        ));
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('فشل في إرسال الرسالة');
      console.error('Error sending message:', error);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants?.some(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  return (
    <div className="messaging-container">
      <div className="messaging-layout">
        {/* Conversations List */}
        <div className="conversations-panel">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="ابحث عن محادثة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="conversations-list">
            {filteredConversations.map(conversation => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                isSelected={selectedConversation?._id === conversation._id}
                onSelect={() => setSelectedConversation(conversation)}
              />
            ))}
          </div>
        </div>

        {/* Messages Panel */}
        <div className="messages-panel">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="messages-header">
                <h3>
                  {selectedConversation.participants
                    .find(p => p.userId !== beneficiary._id)?.name || 'محادثة'}
                </h3>
                <button className="more-options">
                  <MoreVertical size={20} />
                </button>
              </div>

              {error && (
                <div className="error-message">
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              {/* Messages List */}
              <div className="messages-list">
                {messages.map(message => (
                  <MessageItem
                    key={message._id}
                    message={message}
                    isOwn={message.senderId === beneficiary._id}
                  />
                ))}
              </div>

              {/* Message Input */}
              <form className="message-input-form" onSubmit={sendMessage}>
                <input
                  type="text"
                  placeholder="اكتب رسالتك هنا..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="message-input"
                />
                <button type="button" className="attach-btn">
                  <Paperclip size={20} />
                </button>
                <button type="submit" className="send-btn">
                  <Send size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>لا توجد محادثات متاحة</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Conversation Item Component
function ConversationItem({ conversation, isSelected, onSelect }) {
  const recipientName = conversation.participants.find(p => p.userId)?.name;
  const lastMessagePreview = conversation.lastMessage?.substring(0, 50) + 
    (conversation.lastMessage?.length > 50 ? '...' : '');

  return (
    <div
      className={`conversation-item ${isSelected ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="conversation-avatar">
        {recipientName?.charAt(0)}
      </div>
      <div className="conversation-info">
        <h4>{recipientName}</h4>
        <p>{lastMessagePreview || 'لا توجد رسائل'}</p>
      </div>
      {conversation.lastMessageDate && (
        <span className="conversation-date">
          {formatDate(new Date(conversation.lastMessageDate))}
        </span>
      )}
    </div>
  );
}

// Message Item Component
function MessageItem({ message, isOwn }) {
  return (
    <div className={`message-item ${isOwn ? 'own' : 'other'}`}>
      <div className="message-avatar">
        {message.senderName?.charAt(0)}
      </div>
      <div className="message-content">
        <div className="message-bubble">
          <p>{message.body}</p>
          {message.attachments && message.attachments.length > 0 && (
            <div className="attachments">
              {message.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="attachment-link"
                >
                  📎 {attachment.fileName}
                </a>
              ))}
            </div>
          )}
        </div>
        <span className="message-time">
          {formatTime(new Date(message.createdAt))}
        </span>
        {message.isRead && isOwn && (
          <span className="message-read-status">✓✓</span>
        )}
      </div>
    </div>
  );
}

// Helper functions
function formatTime(date) {
  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDate(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'اليوم';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'أمس';
  } else {
    return date.toLocaleDateString('ar-SA');
  }
}
