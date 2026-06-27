/**
 * WhatsApp Chatbot Routes — مسارات روبوت واتساب
 */
import { Route } from 'react-router-dom';
import { lazyWithRetry } from '../utils/lazyLoader';

const WhatsAppChatbotDashboard = lazyWithRetry(() =>
  import('../pages/whatsapp-chatbot/WhatsAppChatbotDashboard')
);

export default function WhatsAppChatbotRoutes() {
  return (
    <Route path="whatsapp-chatbot" element={<WhatsAppChatbotDashboard />} />
  );
}
