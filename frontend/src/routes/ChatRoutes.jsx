import React from 'react';
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const ChatDashboard = lazyWithRetry(
  () => import('../pages/chat/ChatDashboard'),
);
const ChatRoom = lazyWithRetry(
  () => import('../pages/chat/ChatRoom'),
);

export default function ChatRoutes() {
  return (
    <>
      <Route path="/chat" element={<ChatDashboard />} />
      <Route path="/chat/:id" element={<ChatRoom />} />
    </>
  );
}
