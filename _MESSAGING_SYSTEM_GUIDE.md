# 💬 Messaging System User Guide

## Overview

The Messaging System provides real-time communication capabilities within the ERP system, allowing staff, admins, and users to communicate instantly and securely.

## Features

### 1. Instant Messaging (Chat)

- **Real-time Updates**: Messages appear instantly without refreshing the page.
- **Typing Indicators**: See when the other person is typing.
- **Read Receipts**: Know when your message has been seen (Double check icon).
- **Attachments**: Send files and images easily.

### 2. Conversations

- **Private Chats**: Direct 1-on-1 messaging.
- **Group Chats**: Create groups for departments or teams.
- **History**: All message history is saved and searchable.

### 3. Notifications

- **Badge Counters**: Live unread message counts on the conversation list.
- **Visual Alerts**: New messages pop to the top of the list.

## How to Use

### Accessing the Chat

1. Navigate to the **"Messaging"** or **"التواصل"** section in the main sidebar.
2. The interface is split into two panels:
   - **Left**: Your conversation list.
   - **Right**: The active chat window.

### Starting a Chat

1. Click the **"Start Chat"** or **"+"** button (if enabled for your role).
2. Select a user or group of users from the directory.
3. Start typing!

### Sending Messages

- Type in the text box at the bottom.
- Press **Enter** to send.
- Click the **Paperclip** icon to attach files.
- Click the **Emoji** icon to add expressions.

## Technical Details (For Admins)

- **Technology**: Socket.IO over WebSockets.
- **Storage**: MongoDB (`messages`, `conversations` collections).
- **Security**: All socket connections are authenticated via JWT tokens.
- **Privacy**: Conversations enforce participant-only access checks.

## Troubleshooting

- **"Not Connected" Alert**: This usually means your internet connection is unstable or the server is restarting. It should reconnect automatically.
- **Messages not sending**: Check your network connection. If persistent, contact IT support.

---

_System Version: Phase 3.0 (Messaging)_
