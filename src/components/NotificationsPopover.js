import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import { Notifications as NotificationsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI, withMockFallback } from '../services/api';
import { useRealTimeNotifications } from '../contexts/SocketContext';

const mockNotifications = [
  {
    id: 1,
    title: 'فاتورة #9744 متأخرة',
    message: 'متأخرة 3 أيام',
    path: '/finance',
    severity: 'error',
    time: 'منذ ساعة',
  },
  {
    id: 2,
    title: 'كاميرا البوابة 2',
    message: 'انقطاع متقطع',
    path: '/security',
    severity: 'warning',
    time: 'منذ 2 ساعة',
  },
  {
    id: 3,
    title: 'طلب إجازة جديد',
    message: 'سارة محمد - بانتظار الموافقة',
    path: '/hr',
    severity: 'info',
    time: 'منذ 3 ساعات',
  },
  {
    id: 4,
    title: 'جلسة علاج نطق',
    message: 'مريم - بعد ساعة',
    path: '/sessions',
    severity: 'info',
    time: 'منذ 4 ساعات',
  },
  {
    id: 5,
    title: 'تقرير الأمان',
    message: 'مطلوب مراجعة',
    path: '/reports',
    severity: 'warning',
    time: 'أمس',
  },
];

// هذا الملف لم يعد مستخدماً بعد توحيد مركز الإشعارات في SmartNotificationPanel. يمكن حذفه بأمان.
